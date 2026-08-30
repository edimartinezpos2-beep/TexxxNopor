import * as WebBrowser from 'expo-web-browser';
import { Platform } from 'react-native';
import { API_BASE_URL, api } from './api';
import { UserProfile } from '../types/auth';

// Asegurar que el navegador web maneje sesiones y deep links de forma óptima
WebBrowser.maybeCompleteAuthSession();

export const GOOGLE_CLIENT_ID =
  '297210527171-d289elhgeo0raca0dki1f1bsam7ippg0.apps.googleusercontent.com';
export const FACEBOOK_APP_ID = '1075098365061413';

// URI de redirección nativo de Expo (sin expo-crypto ni expo-auth-session)
// Compatible con Expo Go, Android y iOS sin build nativo
function getMobileRedirectUri(): string {
  // Expo Go usa este formato estándar
  return 'https://auth.expo.io/@anonymous/texxxnopor-mobile';
}

export interface SocialAuthResponse {
  token: string;
  user: UserProfile;
}

export class SocialAuthService {
  /**
   * Genera un nonce aleatorio sin expo-crypto (puro JS)
   */
  private static generateNonce(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 16; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * Parsea fragmentos (#) o parámetros (?) de la URL de redirección
   */
  private static parseUrlParams(url: string): Record<string, string> {
    const params: Record<string, string> = {};
    const hashPart = url.includes('#') ? url.split('#')[1] : '';
    const queryPart = url.includes('?') ? url.split('?')[1] : '';
    const queryString = hashPart || queryPart;
    if (!queryString) return params;

    for (const pair of queryString.split('&')) {
      const [key, value] = pair.split('=');
      if (key) {
        try {
          params[decodeURIComponent(key)] = decodeURIComponent(value || '');
        } catch {
          params[key] = value || '';
        }
      }
    }
    return params;
  }

  /**
   * Abre la ventana oficial de autenticación de Google o Facebook,
   * captura el token de sesión legítimo y el perfil verificado en PostgreSQL.
   */
  static async signInWithSocial(provider: 'GOOGLE' | 'FACEBOOK'): Promise<SocialAuthResponse> {
    const providerPath = provider.toLowerCase();

    // ====================================================
    // FLUJO PARA NAVEGADOR WEB (localhost:8081)
    // ====================================================
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      return new Promise<SocialAuthResponse>((resolve, reject) => {
        const width = 540;
        const height = 680;
        const left = window.screen.width / 2 - width / 2;
        const top = window.screen.height / 2 - height / 2;

        const authUrl = `${API_BASE_URL}/api/auth/${providerPath}/start?redirect_scheme=web`;
        console.log(`🌐 [Web OAuth] Abriendo ventana emergente para ${provider}:`, authUrl);

        const popup = window.open(
          authUrl,
          `texxxnopor_oauth_${providerPath}`,
          `width=${width},height=${height},top=${top},left=${left},status=no,resizable=yes,scrollbars=yes`
        );

        if (!popup) {
          return reject(
            new Error(
              'El navegador bloqueó la ventana emergente. Por favor, habilita las ventanas emergentes e inténtalo de nuevo.'
            )
          );
        }

        let isFinished = false;

        const messageListener = (event: MessageEvent) => {
          if (!event.data || typeof event.data !== 'object') return;
          if (event.data.type === 'TEXXXNOPOR_AUTH_SUCCESS') {
            isFinished = true;
            cleanup();
            console.log(`✅ [Web OAuth] Sesión iniciada con ${provider}:`, event.data.user?.email);
            resolve({ token: event.data.token, user: event.data.user });
          } else if (event.data.type === 'TEXXXNOPOR_AUTH_ERROR') {
            isFinished = true;
            cleanup();
            reject(new Error(event.data.error || `Error al autenticar con ${provider}`));
          }
        };

        const timer = setInterval(() => {
          if (popup.closed && !isFinished) {
            cleanup();
            reject(new Error(`Ventana de ${provider} cerrada por el usuario.`));
          }
        }, 800);

        const cleanup = () => {
          clearInterval(timer);
          window.removeEventListener('message', messageListener);
        };

        window.addEventListener('message', messageListener);
      });
    }

    // ====================================================
    // FLUJO PARA CELULARES (Expo Go, Android, iOS)
    // - NO usa expo-auth-session ni expo-crypto (evita error ExpoCryptoAES)
    // - Redirige mediante auth.expo.io (compatible con Expo Go sin build nativo)
    // ====================================================
    const redirectUri = getMobileRedirectUri();
    console.log(`📱 [Mobile OAuth] Redirect URI:`, redirectUri);

    let authUrl = '';
    if (provider === 'GOOGLE') {
      authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${encodeURIComponent(GOOGLE_CLIENT_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token%20id_token` +
        `&scope=${encodeURIComponent('openid email profile')}` +
        `&nonce=${this.generateNonce()}` +
        `&prompt=select_account`;
    } else {
      authUrl =
        `https://www.facebook.com/v19.0/dialog/oauth?` +
        `client_id=${encodeURIComponent(FACEBOOK_APP_ID)}` +
        `&redirect_uri=${encodeURIComponent(redirectUri)}` +
        `&response_type=token` +
        `&scope=public_profile`;
    }

    console.log(`📱 [Mobile OAuth] Abriendo sesión para ${provider}...`);
    const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

    if (result.type !== 'success' || !result.url) {
      if (result.type === 'cancel' || result.type === 'dismiss') {
        throw new Error(`Inicio de sesión con ${provider} cancelado.`);
      }
      throw new Error(`No se pudo completar la autenticación con ${provider}.`);
    }

    const parsed = this.parseUrlParams(result.url);
    const accessToken = parsed.access_token || parsed.accessToken;
    const idToken = parsed.id_token || parsed.idToken;
    const tokenToSend = idToken || accessToken;

    if (!tokenToSend && !accessToken) {
      throw new Error(`No se recibió el token de ${provider}. Verifica la configuración en la consola.`);
    }

    console.log(`📱 [Mobile OAuth] Token recibido, verificando en backend...`);

    // Enviar tokens al backend para registrar/autenticar en PostgreSQL
    const res = await api.auth.socialLogin(
      provider,
      undefined,
      undefined,
      21,
      true,
      undefined,
      tokenToSend,
      idToken,
      accessToken
    );

    return res;
  }

  static async signInWithGoogle(): Promise<SocialAuthResponse> {
    return this.signInWithSocial('GOOGLE');
  }

  static async signInWithFacebook(): Promise<SocialAuthResponse> {
    return this.signInWithSocial('FACEBOOK');
  }
}

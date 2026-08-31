import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import {
  ShieldCheck,
  CheckCircle2,
  Mail,
  Lock,
  User,
  Calendar,
  AlertTriangle,
  Flame,
  ArrowRight,
  Sparkles,
  Shield,
  X,
  Crown,
  KeyRound,
  ChevronLeft,
  Check,
} from 'lucide-react-native';
import { UserRole, UserProfile } from '../types/auth';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { COLORS } from '../theme/colors';
import { BrandLogo } from '../components/BrandLogo';
import { SocialAuthService } from '../services/socialAuth';

interface AuthScreenProps {
  onClose?: () => void;
  initialMode?: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onClose, initialMode = 'REGISTER' }) => {
  const { signIn } = useAuth();
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>(initialMode);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [isOver18, setIsOver18] = useState(true);

  // Password Recovery Fields
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [generatedCodeDisplay, setGeneratedCodeDisplay] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isFirstUserPending, setIsFirstUserPending] = useState(false);

  useEffect(() => {
    api.auth
      .getBootstrapStatus()
      .then((status) => {
        if (!status.hasAdmin || status.totalUsers === 0) {
          setIsFirstUserPending(true);
        } else {
          setIsFirstUserPending(false);
        }
      })
      .catch(() => {
        setIsFirstUserPending(false);
      });
  }, [authMode]);

  const handleEmailAuth = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim() || !password.trim()) {
      setErrorMessage('Por favor ingresa tu correo y contraseña.');
      return;
    }

    if (authMode === 'REGISTER') {
      if (!username.trim()) {
        setErrorMessage('Por favor ingresa un nombre de usuario.');
        return;
      }

      const parsedAge = parseInt(age, 10);
      if (isNaN(parsedAge) || parsedAge < 18) {
        setErrorMessage('Acceso restringido: Debes tener al menos 18 años para registrarte.');
        return;
      }

      if (!isOver18) {
        setErrorMessage('Debes confirmar que eres mayor de 18 años para continuar.');
        return;
      }
    }

    setIsLoading(true);
    try {
      if (authMode === 'REGISTER') {
        const res = await api.auth.register(
          email.trim(),
          username.trim(),
          password,
          parseInt(age, 10) || 18,
          isOver18,
          'CONSUMER'
        );
        await signIn(res.token, res.user);

        if (res.user.role === 'ADMIN') {
          Alert.alert(
            '👑 Rol de Administrador Asignado',
            'Eres el primer usuario registrado. Tu cuenta ha sido configurada con permisos de Administrador.',
            [{ text: 'Entendido', onPress: () => onClose && onClose() }]
          );
        } else if (onClose) {
          onClose();
        }
      } else {
        const res = await api.auth.login(email.trim(), password);
        if (res && res.token) {
          await signIn(res.token, res.user);
          if (onClose) onClose();
        } else {
          setErrorMessage('Credenciales inválidas. Verifica tu correo y contraseña.');
        }
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al autenticar. Verifica tus credenciales.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Solicitar código de recuperación
  const handleRequestResetCode = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!email.trim()) {
      setErrorMessage('Por favor ingresa tu correo electrónico.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.forgotPassword(email.trim());
      if (res && res.status === 'success') {
        setCodeSent(true);
        if (res.code) {
          setGeneratedCodeDisplay(res.code);
          setResetCode(res.code);
        }
        setSuccessMessage(`Código enviado a ${email.trim()}. Ingrésalo a continuación.`);
      } else {
        setErrorMessage('No encontramos ninguna cuenta con ese correo electrónico.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al solicitar el código de recuperación.');
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Restablecer contraseña con código
  const handleResetPassword = async () => {
    setErrorMessage('');
    setSuccessMessage('');

    if (!resetCode.trim()) {
      setErrorMessage('Por favor ingresa el código de 6 dígitos recibido.');
      return;
    }

    if (!newPassword || newPassword.length < 6) {
      setErrorMessage('La nueva contraseña debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage('Las contraseñas no coinciden. Verifica e intenta nuevamente.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.resetPassword(email.trim(), resetCode.trim(), newPassword);
      if (res && res.status === 'success') {
        Alert.alert(
          '¡Contraseña Cambiada!',
          'Tu contraseña ha sido restablecida exitosamente. Ya puedes iniciar sesión.',
          [
            {
              text: 'Iniciar Sesión',
              onPress: () => {
                setAuthMode('LOGIN');
                setCodeSent(false);
                setResetCode('');
                setNewPassword('');
                setConfirmPassword('');
                setGeneratedCodeDisplay(null);
              },
            },
          ]
        );
      } else {
        setErrorMessage('Código inválido o expirado. Solicita un nuevo código.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al cambiar la contraseña.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSocialAuth = async (provider: 'GOOGLE' | 'FACEBOOK') => {
    setErrorMessage('');
    if (authMode === 'REGISTER' && (!isOver18 || (age && parseInt(age, 10) < 18))) {
      setErrorMessage('Debes confirmar que eres mayor de 18 años.');
      return;
    }

    setIsLoading(true);
    try {
      // 1. Abrir ventana oficial (Popup en Web / In-App Browser en Móvil) y autenticar contra PostgreSQL
      const authResult =
        provider === 'GOOGLE'
          ? await SocialAuthService.signInWithGoogle()
          : await SocialAuthService.signInWithFacebook();

      if (!authResult || !authResult.token || !authResult.user) {
        throw new Error(`No se pudo completar el inicio de sesión con ${provider}.`);
      }

      // 2. Establecer sesión global con datos legítimos de base de datos PostgreSQL
      await signIn(authResult.token, authResult.user);
      if (onClose) onClose();
    } catch (err: any) {
      console.warn(`[Auth] Error social login ${provider}:`, err.message);
      setErrorMessage(err.message || `Error al conectar con ${provider}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Botón de Cerrar si es Modal */}
        {onClose && (
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
        )}

        {/* Header de la marca con Logo Oficial */}
        <View style={styles.brandHeader}>
          <BrandLogo size="large" showSubtitle />
        </View>

        {/* Banner Primer Registro = Admin */}
        {isFirstUserPending && authMode === 'REGISTER' && (
          <View style={styles.adminPromoBanner}>
            <Crown size={20} color="#05D9E8" />
            <View style={{ flex: 1 }}>
              <Text style={styles.adminPromoTitle}>Primer Registro = Administrador</Text>
              <Text style={styles.adminPromoSubtitle}>
                La base de datos está lista. El primer usuario registrado obtendrá el rol de Administrador.
              </Text>
            </View>
          </View>
        )}

        {/* Selector Pestañas Iniciar Sesión / Registro */}
        {authMode !== 'FORGOT_PASSWORD' && (
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tabButton, authMode === 'REGISTER' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('REGISTER');
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              <Text style={[styles.tabText, authMode === 'REGISTER' && styles.tabTextActive]}>
                Crear Cuenta (18+)
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.tabButton, authMode === 'LOGIN' && styles.tabButtonActive]}
              onPress={() => {
                setAuthMode('LOGIN');
                setErrorMessage('');
                setSuccessMessage('');
              }}
            >
              <Text style={[styles.tabText, authMode === 'LOGIN' && styles.tabTextActive]}>
                Iniciar Sesión
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Mensaje de Error con Atajos Inteligentes */}
        {errorMessage ? (
          <View style={styles.errorBox}>
            <AlertTriangle size={16} color="#FF3B30" />
            <View style={{ flex: 1 }}>
              <Text style={styles.errorText}>{errorMessage}</Text>
              {errorMessage.toLowerCase().includes('existe') && (
                <TouchableOpacity
                  style={{ marginTop: 6, flexDirection: 'row', alignItems: 'center' }}
                  onPress={() => {
                    setAuthMode('LOGIN');
                    setErrorMessage('');
                  }}
                >
                  <Text style={{ color: COLORS.neonLime, fontWeight: 'bold', fontSize: 12 }}>
                    👉 Toca aquí para Iniciar Sesión
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ) : null}

        {/* Mensaje de Éxito */}
        {successMessage ? (
          <View style={styles.successBox}>
            <CheckCircle2 size={16} color={COLORS.neonLime} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* ==================================================== */}
        {/* VISTA 1: RECUPERAR CONTRASEÑA CON CÓDIGO DE 6 DÍGITOS */}
        {/* ==================================================== */}
        {authMode === 'FORGOT_PASSWORD' ? (
          <View style={styles.formCard}>
            <View style={styles.forgotHeaderRow}>
              <TouchableOpacity
                onPress={() => {
                  setAuthMode('LOGIN');
                  setErrorMessage('');
                  setSuccessMessage('');
                }}
                style={styles.backToLoginBtn}
              >
                <ChevronLeft size={18} color={COLORS.neonLime} />
                <Text style={styles.backToLoginText}>Volver</Text>
              </TouchableOpacity>
              <Text style={styles.forgotCardTitle}>Recuperar Contraseña</Text>
            </View>

            <Text style={styles.forgotInstruction}>
              {!codeSent
                ? 'Ingresa tu correo registrado y te enviaremos un código de verificación de 6 dígitos para crear una nueva contraseña.'
                : 'Ingresa el código de 6 dígitos y define tu nueva contraseña segura.'}
            </Text>

            {/* Paso 1: Ingreso de Correo */}
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo electrónico registrado *</Text>
              <View style={styles.inputWrapper}>
                <Mail size={16} color="#777780" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor="#55555C"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  editable={!codeSent}
                />
              </View>
            </View>

            {/* Banner con código de prueba en pantalla */}
            {generatedCodeDisplay && (
              <View style={styles.codeDisplayCard}>
                <KeyRound size={20} color={COLORS.neonLime} />
                <View style={{ flex: 1 }}>
                  <Text style={styles.codeDisplayTitle}>Código de Verificación:</Text>
                  <Text style={styles.codeDisplayNumber}>{generatedCodeDisplay}</Text>
                </View>
              </View>
            )}

            {/* Paso 2: Código y Nueva Contraseña */}
            {codeSent && (
              <>
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Código de 6 dígitos *</Text>
                  <View style={styles.inputWrapper}>
                    <KeyRound size={16} color="#777780" style={styles.inputIcon} />
                    <TextInput
                      style={[styles.input, { letterSpacing: 4, fontWeight: 'bold' }]}
                      placeholder="123456"
                      placeholderTextColor="#55555C"
                      value={resetCode}
                      onChangeText={setResetCode}
                      keyboardType="number-pad"
                      maxLength={6}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nueva Contraseña *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={16} color="#777780" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Mínimo 6 caracteres"
                      placeholderTextColor="#55555C"
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Confirmar Nueva Contraseña *</Text>
                  <View style={styles.inputWrapper}>
                    <Lock size={16} color="#777780" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Repite la nueva contraseña"
                      placeholderTextColor="#55555C"
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry
                    />
                  </View>
                </View>
              </>
            )}

            {/* Botón de acción */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={!codeSent ? handleRequestResetCode : handleResetPassword}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {!codeSent ? 'Enviar Código de 6 Dígitos' : 'Cambiar Contraseña'}
                  </Text>
                  <ArrowRight size={18} color="#000000" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>

            {codeSent && (
              <TouchableOpacity
                onPress={() => {
                  setCodeSent(false);
                  setResetCode('');
                  setGeneratedCodeDisplay(null);
                }}
                style={styles.resendCodeBtn}
              >
                <Text style={styles.resendCodeText}>¿No recibiste el código? Solicitar otro</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          /* ==================================================== */
          /* VISTA 2: INICIO DE SESIÓN O REGISTRO */
          /* ==================================================== */
          <View style={styles.formCard}>
            {authMode === 'REGISTER' && (
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Nombre de usuario *</Text>
                <View style={styles.inputWrapper}>
                  <User size={16} color="#777780" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Tu nombre de usuario o alias"
                    placeholderTextColor="#55555C"
                    value={username}
                    onChangeText={setUsername}
                    autoCapitalize="none"
                  />
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Correo electrónico *</Text>
              <View style={styles.inputWrapper}>
                <Mail size={16} color="#777780" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="ejemplo@correo.com"
                  placeholderTextColor="#55555C"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <Text style={styles.inputLabel}>Contraseña *</Text>
                {authMode === 'LOGIN' && (
                  <TouchableOpacity
                    onPress={() => {
                      setAuthMode('FORGOT_PASSWORD');
                      setErrorMessage('');
                      setSuccessMessage('');
                    }}
                  >
                    <Text style={styles.forgotPasswordLink}>¿Olvidaste tu contraseña?</Text>
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.inputWrapper}>
                <Lock size={16} color="#777780" style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  placeholder="Ingresa tu contraseña"
                  placeholderTextColor="#55555C"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
              </View>
            </View>

            {/* Campo de Edad (Solo en Registro - Obligatorio 18+) */}
            {authMode === 'REGISTER' && (
              <>
                <View style={styles.inputGroup}>
                  <View style={styles.ageLabelRow}>
                    <Text style={styles.inputLabel}>Tu Edad (Años) *</Text>
                    <View style={styles.required18Pill}>
                      <Text style={styles.required18Text}>Mínimo 18 años</Text>
                    </View>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Calendar size={16} color="#777780" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="Ej. 24"
                      placeholderTextColor="#55555C"
                      value={age}
                      onChangeText={setAge}
                      keyboardType="number-pad"
                      maxLength={2}
                    />
                  </View>
                </View>

                {/* Toggles de Verificación de Mayoría de Edad */}
                <View style={styles.verificationCard}>
                  <View style={styles.verificationRow}>
                    <ShieldCheck
                      size={22}
                      color={isOver18 ? COLORS.primary : '#888890'}
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.verificationText}>
                      Confirmo que tengo 18 años o más y acepto los Términos de Servicio de contenido
                      adulto.
                    </Text>
                    <Switch
                      value={isOver18}
                      onValueChange={setIsOver18}
                      trackColor={{ false: '#333338', true: COLORS.primary }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </View>
              </>
            )}

            {/* Botón Principal de Envío */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleEmailAuth}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <>
                  <Text style={styles.submitButtonText}>
                    {authMode === 'REGISTER' ? 'Registrar Cuenta (18+)' : 'Iniciar Sesión'}
                  </Text>
                  <ArrowRight size={18} color="#000000" style={{ marginLeft: 6 }} />
                </>
              )}
            </TouchableOpacity>
          </View>
        )}

        {/* Divisor Social */}
        {authMode !== 'FORGOT_PASSWORD' && (
          <>
            <View style={styles.dividerRow}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>o accede con tu cuenta</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Botones de Registro / Login Social (Google y Facebook) */}
            <View style={styles.socialSection}>
              <TouchableOpacity
                style={styles.googleButton}
                onPress={() => handleSocialAuth('GOOGLE')}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <View style={styles.socialIconPlaceholder}>
                  <Text style={styles.googleIconText}>G</Text>
                </View>
                <Text style={styles.googleButtonText}>Continuar con Google</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.facebookButton}
                onPress={() => handleSocialAuth('FACEBOOK')}
                disabled={isLoading}
                activeOpacity={0.85}
              >
                <View style={[styles.socialIconPlaceholder, { backgroundColor: '#1877F2' }]}>
                  <Text style={styles.facebookIconText}>f</Text>
                </View>
                <Text style={styles.facebookButtonText}>Continuar con Facebook</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        {/* Footer de Seguridad */}
        <View style={styles.securityFooter}>
          <Shield size={16} color="#777780" />
          <Text style={styles.securityText}>
            Conexión encriptada SSL/TLS · Privacidad garantizada
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  scrollContent: {
    padding: 20,
    paddingTop: Platform.OS === 'ios' ? 40 : 25,
    paddingBottom: 40,
  },
  closeButton: {
    alignSelf: 'flex-end',
    padding: 8,
    backgroundColor: '#1E1E24',
    borderRadius: 20,
    marginBottom: 10,
  },
  brandHeader: {
    alignItems: 'center',
    marginBottom: 20,
  },
  logoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  brandTitle: {
    fontSize: 26,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  ageBadge: {
    backgroundColor: '#E50914',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  ageBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  brandSubtitle: {
    color: '#8E8E93',
    fontSize: 12,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 16,
  },
  adminPromoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(5, 217, 232, 0.12)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#05D9E8',
    marginBottom: 16,
    gap: 10,
  },
  adminPromoTitle: {
    color: '#05D9E8',
    fontSize: 13,
    fontWeight: 'bold',
  },
  adminPromoSubtitle: {
    color: '#A0A0A8',
    fontSize: 11,
    lineHeight: 14,
    marginTop: 2,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#16161C',
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#24242C',
  },
  tabButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabButtonActive: {
    backgroundColor: COLORS.neonLime,
  },
  tabText: {
    color: '#8E8E93',
    fontSize: 13,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#000000',
    fontWeight: 'bold',
  },
  errorBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 59, 48, 0.15)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FF3B30',
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
  },
  successBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(206, 255, 0, 0.12)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.neonLime,
    marginBottom: 16,
    gap: 8,
  },
  successText: {
    color: COLORS.neonLime,
    fontSize: 12,
    flex: 1,
    lineHeight: 16,
    fontWeight: '600',
  },
  formCard: {
    backgroundColor: '#121216',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#22222C',
  },
  forgotHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  backToLoginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingRight: 10,
  },
  backToLoginText: {
    color: COLORS.neonLime,
    fontSize: 13,
    fontWeight: 'bold',
  },
  forgotCardTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  forgotInstruction: {
    color: '#8E8E93',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  forgotPasswordLink: {
    color: COLORS.neonLime,
    fontSize: 11,
    fontWeight: '600',
  },
  codeDisplayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(206, 255, 0, 0.1)',
    borderRadius: 10,
    padding: 12,
    borderWidth: 1,
    borderColor: COLORS.neonLime,
    marginBottom: 14,
    gap: 10,
  },
  codeDisplayTitle: {
    color: '#8E8E93',
    fontSize: 11,
  },
  codeDisplayNumber: {
    color: COLORS.neonLime,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 4,
  },
  resendCodeBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    marginTop: 6,
  },
  resendCodeText: {
    color: '#8E8E93',
    fontSize: 12,
  },
  inputGroup: {
    marginBottom: 14,
  },
  inputLabel: {
    color: '#E0E0E8',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  ageLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  required18Pill: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 4,
  },
  required18Text: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: 'bold',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1A1A20',
    borderRadius: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#2A2A34',
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    paddingVertical: 10,
  },
  verificationCard: {
    backgroundColor: '#16161C',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#2A2A34',
  },
  verificationRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  verificationText: {
    flex: 1,
    color: '#D0D0D8',
    fontSize: 11,
    lineHeight: 15,
    marginRight: 8,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.neonLime,
    paddingVertical: 13,
    borderRadius: 10,
    marginTop: 6,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: '#000000',
    fontSize: 14,
    fontWeight: 'bold',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#24242C',
  },
  dividerText: {
    color: '#666670',
    fontSize: 11,
    marginHorizontal: 10,
  },
  socialSection: {
    gap: 10,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  socialIconPlaceholder: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EA4335',
    justifyContent: 'center',
    alignItems: 'center',
  },
  googleIconText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  googleButtonText: {
    color: '#000000',
    fontSize: 13,
    fontWeight: 'bold',
  },
  facebookButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1877F2',
    paddingVertical: 12,
    borderRadius: 10,
    gap: 8,
  },
  facebookIconText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  facebookButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  securityFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 24,
    gap: 6,
  },
  securityText: {
    color: '#666670',
    fontSize: 11,
  },
});

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { Download, CheckCircle2, ShieldAlert, Globe } from 'lucide-react-native';
import { api } from '../services/api';
import { COLORS } from '../theme/colors';

// Lee la versión real desde app.json (2 niveles arriba: mobile/src/components -> mobile/app.json)
let resolvedVersion = '2.4.3';
try {
  const appJson = require('../../app.json');
  if (appJson?.expo?.version) {
    resolvedVersion = appJson.expo.version;
  }
} catch {
  resolvedVersion = '2.4.3';
}
const APP_VERSION: string = resolvedVersion;

export const ForceUpdateGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // En versión Web, la aplicación se actualiza de forma automática en el navegador (nunca mostrar ventana de force update)
  if (Platform.OS === 'web') {
    return <>{children}</>;
  }

  const [isChecking, setIsChecking] = useState(true);
  const [isOutdated, setIsOutdated] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    latestVersion: string;
    minSupportedVersion: string;
    title: string;
    message: string;
    updateUrl: string;
    webUrl?: string;
    releaseNotes?: string[];
  } | null>(null);

  useEffect(() => {
    checkAppVersion();
  }, []);

  const checkAppVersion = async () => {
    try {
      const res = await api.system.checkVersion(APP_VERSION, Platform.OS);
      if (res && res.isOutdated) {
        setIsOutdated(true);
        setUpdateInfo(res);
      }
    } catch {
      // Si el backend no responde, permitir uso normal sin bloquear
      setIsOutdated(false);
    } finally {
      setIsChecking(false);
    }
  };

  // Botón 1: Descargar el APK / última versión
  const handleDownloadUpdate = () => {
    const targetUrl =
      updateInfo?.updateUrl || 'https://github.com/edimartinezpos2-beep/TexxxNopor/releases/latest';
    Linking.openURL(targetUrl).catch(() => {
      Linking.openURL('https://texxxnopor-backend.onrender.com').catch(() => {});
    });
  };

  // Botón 2: Redireccionar a la página web principal
  const handleGoToWeb = () => {
    const webUrl = updateInfo?.webUrl || 'https://texxxnopor-backend.onrender.com';
    Linking.openURL(webUrl).catch(() => {});
  };

  const latestVer = updateInfo?.latestVersion || APP_VERSION;

  return (
    <>
      {children}

      {/* Modal de Bloqueo por Caducidad de Versión (Force Update) solo en Móvil */}
      <Modal visible={isOutdated} animationType="fade" transparent={false} onRequestClose={() => {}}>
        <View style={styles.container}>
          <StatusBar barStyle="light-content" backgroundColor="#0B0B0F" />

          <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
            {/* Ícono de Advertencia / Actualización */}
            <View style={styles.iconCircleOuter}>
              <View style={styles.iconCircleInner}>
                <ShieldAlert size={48} color="#FF3B30" />
              </View>
            </View>

            {/* Badge de Versión Caducada */}
            <View style={styles.badgeRow}>
              <View style={styles.expiredBadge}>
                <Text style={styles.expiredBadgeText}>VERSIÓN v{APP_VERSION} CADUCADA</Text>
              </View>
            </View>

            <Text style={styles.title}>
              {updateInfo?.title || 'Actualización Obligatoria Requerida'}
            </Text>

            <Text style={styles.subtitle}>
              {updateInfo?.message ||
                `Esta versión de la aplicación ha sido desactivada. Para continuar disfrutando del catálogo 4K, historias efímeras y pasarela de pagos debes actualizar a la versión ${latestVer}.`}
            </Text>

            {/* Comparativa de Versiones */}
            <View style={styles.versionCard}>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Tu versión instalada:</Text>
                <Text style={[styles.versionValue, { color: '#FF3B30' }]}>v{APP_VERSION} (Descontinuada)</Text>
              </View>
              <View style={styles.versionDivider} />
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Nueva versión oficial:</Text>
                <Text style={[styles.versionValue, { color: '#30D158' }]}>
                  v{latestVer} (Requerida)
                </Text>
              </View>
            </View>

            {/* Novedades de la Nueva Versión */}
            <Text style={styles.notesHeader}>Especificaciones de la actualización:</Text>
            <View style={styles.notesContainer}>
              {(
                updateInfo?.releaseNotes || [
                  'Historias efímeras de 24h con fotos y videos cortos en alta definición',
                  'Corrección total de fotos de perfil (se suben y muestran tus fotos reales)',
                  'Recuperación inmediata de contraseña mediante código OTP de 6 dígitos',
                  'Sesión persistente en móvil y web (no tendrás que iniciar sesión cada vez)',
                  'Streaming 4K Ultra HD optimizado sin cortes',
                  'Pasarela de pagos oficial Wompi (Bancolombia, PSE, Nequi y Tarjetas)',
                ]
              ).map((note, idx) => (
                <View key={idx} style={styles.noteItem}>
                  <CheckCircle2 size={16} color={COLORS.neonLime} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </View>

            {/* BOTÓN 1: Descargar Actualización */}
            <TouchableOpacity style={styles.updateBtn} onPress={handleDownloadUpdate} activeOpacity={0.85}>
              <Download size={20} color="#000000" />
              <Text style={styles.updateBtnText}>
                Descargar e Instalar v{latestVer}
              </Text>
            </TouchableOpacity>

            {/* BOTÓN 2: Redireccionar a la Página Web Principal */}
            <TouchableOpacity style={styles.webBtn} onPress={handleGoToWeb} activeOpacity={0.85}>
              <Globe size={18} color="#FFFFFF" />
              <Text style={styles.webBtnText}>
                Ir a la Página Web Principal
              </Text>
            </TouchableOpacity>

            <Text style={styles.securityFooterText}>
              Protegido por el sistema de seguridad y control de versiones de TexxxNopor.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B0F',
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
    alignItems: 'center',
  },
  iconCircleOuter: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: 'rgba(255, 59, 48, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconCircleInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    backgroundColor: 'rgba(255, 59, 48, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeRow: {
    marginBottom: 14,
  },
  expiredBadge: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 6,
  },
  expiredBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    color: '#A0A0B0',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  versionCard: {
    backgroundColor: '#16161E',
    borderRadius: 12,
    padding: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#2D2D3A',
    marginBottom: 22,
  },
  versionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  versionDivider: {
    height: 1,
    backgroundColor: '#262632',
    marginVertical: 10,
  },
  versionLabel: {
    color: '#8E8E9F',
    fontSize: 12,
  },
  versionValue: {
    fontSize: 13,
    fontWeight: 'bold',
  },
  notesHeader: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
    alignSelf: 'flex-start',
    marginBottom: 10,
  },
  notesContainer: {
    backgroundColor: '#16161E',
    borderRadius: 12,
    padding: 14,
    width: '100%',
    gap: 10,
    borderWidth: 1,
    borderColor: '#262632',
    marginBottom: 26,
  },
  noteItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  noteText: {
    color: '#D0D0DC',
    fontSize: 12,
    flex: 1,
  },
  updateBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: COLORS.neonLime,
    width: '100%',
    paddingVertical: 16,
    borderRadius: 14,
    marginBottom: 12,
  },
  updateBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  webBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: '#1C1C26',
    borderWidth: 1,
    borderColor: '#38384A',
    width: '100%',
    paddingVertical: 15,
    borderRadius: 14,
    marginBottom: 16,
  },
  webBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  securityFooterText: {
    color: '#666675',
    fontSize: 11,
    textAlign: 'center',
  },
});

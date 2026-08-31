import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  Platform,
  StatusBar,
  ScrollView,
} from 'react-native';
import { AlertTriangle, Download, Sparkles, CheckCircle2, ShieldAlert } from 'lucide-react-native';
import { api } from '../services/api';
import { COLORS } from '../theme/colors';

const APP_VERSION = '1.0.2'; // Versión compilada actual

export const ForceUpdateGate: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isChecking, setIsChecking] = useState(true);
  const [isOutdated, setIsOutdated] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{
    latestVersion: string;
    minSupportedVersion: string;
    title: string;
    message: string;
    updateUrl: string;
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

  const handleUpdate = () => {
    const targetUrl =
      updateInfo?.updateUrl || 'https://github.com/edimartinezpos2-beep/TexxxNopor/releases/latest';
    Linking.openURL(targetUrl).catch(() => {
      Linking.openURL('https://texxxnopor-backend.onrender.com').catch(() => {});
    });
  };

  return (
    <>
      {children}

      {/* Modal de Bloqueo por Caducidad de Versión (Force Update) */}
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
                <Text style={styles.expiredBadgeText}>VERSIÓN {APP_VERSION} CADUCADA</Text>
              </View>
            </View>

            <Text style={styles.title}>
              {updateInfo?.title || 'Actualización Obligatoria Requerida'}
            </Text>

            <Text style={styles.subtitle}>
              {updateInfo?.message ||
                `Esta versión de la aplicación ha sido desactivada. Para continuar disfrutando del catálogo 4K y pasarela de pagos debes actualizar a la versión ${
                  updateInfo?.latestVersion || '1.0.2'
                }.`}
            </Text>

            {/* Comparativa de Versiones */}
            <View style={styles.versionCard}>
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Tu versión actual:</Text>
                <Text style={[styles.versionValue, { color: '#FF3B30' }]}>v{APP_VERSION} (Descontinuada)</Text>
              </View>
              <View style={styles.versionDivider} />
              <View style={styles.versionRow}>
                <Text style={styles.versionLabel}>Nueva versión oficial:</Text>
                <Text style={[styles.versionValue, { color: '#30D158' }]}>
                  v{updateInfo?.latestVersion || '1.0.2'} (Requerida)
                </Text>
              </View>
            </View>

            {/* Novedades de la Nueva Versión */}
            <Text style={styles.notesHeader}>Novedades de la actualización:</Text>
            <View style={styles.notesContainer}>
              {(
                updateInfo?.releaseNotes || [
                  'Planes en Pesos Colombianos ($10.000 COP / mes)',
                  'Integración oficial Wompi (Bancolombia, PSE, Nequi y Tarjetas)',
                  'Streaming 4K Ultra HD optimizado sin interrupciones',
                  'Mayor seguridad y recuperación instantánea de cuentas',
                ]
              ).map((note, idx) => (
                <View key={idx} style={styles.noteItem}>
                  <CheckCircle2 size={16} color={COLORS.neonLime} />
                  <Text style={styles.noteText}>{note}</Text>
                </View>
              ))}
            </View>

            {/* Botón Principal de Actualización */}
            <TouchableOpacity style={styles.updateBtn} onPress={handleUpdate} activeOpacity={0.85}>
              <Download size={20} color="#000000" />
              <Text style={styles.updateBtnText}>
                Descargar e Instalar v{updateInfo?.latestVersion || '1.0.2'}
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
    marginBottom: 16,
  },
  updateBtnText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: 'bold',
  },
  securityFooterText: {
    color: '#666675',
    fontSize: 11,
    textAlign: 'center',
  },
});

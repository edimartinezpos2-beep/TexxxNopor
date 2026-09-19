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
  Animated,
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
import { PrivacyPolicyModal } from '../components/PrivacyPolicyModal';

interface AuthScreenProps {
  onClose?: () => void;
  initialMode?: 'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD';
}

export const AuthScreen: React.FC<AuthScreenProps> = ({ onClose, initialMode = 'REGISTER' }) => {
  const { signIn } = useAuth();
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER' | 'FORGOT_PASSWORD'>(initialMode);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [age, setAge] = useState('');
  const [birthDateText, setBirthDateText] = useState('');
  const [isOver18, setIsOver18] = useState(true);

  // Estados para Recuperación de Contraseña Cyberpunk (TexxxNopor)
  const [recoveryEmailFocused, setRecoveryEmailFocused] = useState(false);
  const [recoveryError, setRecoveryError] = useState('');
  const shakeAnim = React.useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: -7, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 7, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 4, duration: 50, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 50, useNativeDriver: true }),
    ]).start();
  };

  // Helper para calcular edad exacta desde DD/MM/AAAA
  const calculateAgeFromDate = (dateStr: string): number | null => {
    const parts = dateStr.includes('/') ? dateStr.split('/') : dateStr.split('-');
    if (parts.length !== 3) return null;
    let day = 0;
    let month = 0;
    let year = 0;
    if (dateStr.includes('/')) {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    } else {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    }
    if (!day || !year || isNaN(month) || year < 1900 || year > new Date().getFullYear()) return null;
    const bDate = new Date(year, month, day);
    if (isNaN(bDate.getTime())) return null;
    const today = new Date();
    let calculatedAge = today.getFullYear() - bDate.getFullYear();
    const m = today.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
      calculatedAge--;
    }
    return calculatedAge;
  };

  const handleBirthDateChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    let formatted = cleaned;
    if (cleaned.length > 2 && cleaned.length <= 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2)}`;
    } else if (cleaned.length > 4) {
      formatted = `${cleaned.slice(0, 2)}/${cleaned.slice(2, 4)}/${cleaned.slice(4, 8)}`;
    }
    setBirthDateText(formatted);
    if (formatted.length === 10) {
      const calcAge = calculateAgeFromDate(formatted);
      if (calcAge !== null) {
        setAge(calcAge.toString());
      }
    }
  };

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

    let calculatedAge = parseInt(age, 10);
    let isoBirthDate: string | undefined = undefined;

    if (authMode === 'REGISTER') {
      if (!username.trim()) {
        setErrorMessage('Por favor ingresa un nombre de usuario.');
        return;
      }

      if (!birthDateText.trim()) {
        setErrorMessage('Por favor ingresa tu fecha de nacimiento (DD/MM/AAAA).');
        return;
      }

      const parsedAge = calculateAgeFromDate(birthDateText.trim());
      if (parsedAge === null) {
        setErrorMessage('Fecha de nacimiento inválida. Usa el formato DD/MM/AAAA.');
        return;
      }

      if (parsedAge < 18) {
        setErrorMessage(`Acceso restringido: Tienes ${parsedAge} años. Debes tener al menos 18 años para registrarte.`);
        return;
      }

      calculatedAge = parsedAge;
      const parts = birthDateText.split('/');
      isoBirthDate = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;

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
          calculatedAge || 18,
          isOver18,
          'CONSUMER',
          isoBirthDate
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

  // Inicio rápido con cuenta anónima VIP y todas las suscripciones activas
  const handleLoginDemoVip = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const res = await api.auth.loginDemoVip();
      if (res && res.token) {
        await signIn(res.token, res.user);
        if (onClose) onClose();
      } else {
        setErrorMessage('No se pudo iniciar sesión con la cuenta VIP anónima.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Error al iniciar sesión anónima VIP.');
    } finally {
      setIsLoading(false);
    }
  };

  // 1. Solicitar código de recuperación
  const handleRequestResetCode = async () => {
    setRecoveryError('');
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = email.trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!cleanEmail || !emailRegex.test(cleanEmail)) {
      setRecoveryError('Ingresa un correo electrónico válido.');
      triggerShake();
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.auth.forgotPassword(cleanEmail);
      if (res && res.status === 'success') {
        setCodeSent(true);
        if (res.code) {
          setGeneratedCodeDisplay(res.code);
          setResetCode(res.code);
        }
        setSuccessMessage('¡Correo enviado! Revisa tu bandeja de entrada y sigue las instrucciones.');
      } else {
        setRecoveryError('No encontramos ninguna cuenta con ese correo electrónico.');
        triggerShake();
      }
    } catch (err: any) {
      setRecoveryError(err.message || 'Error al solicitar el enlace de recuperación.');
      triggerShake();
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

        {/* Header de la marca con Logo Oficial o Header Cyberpunk para Recuperar Contraseña */}
        {authMode === 'FORGOT_PASSWORD' ? (
          <View style={styles.cyberHeaderRow}>
            <View style={styles.cyberBrandBadge}>
              <Flame size={18} color="#00F2FE" />
              <Text style={styles.cyberBrandText}>TexxxNopor</Text>
            </View>
            <View style={styles.cyberDivider} />
            <Text style={styles.cyberHeaderTitle}>Recuperación de cuenta</Text>
            <View style={{ flex: 1 }} />
            <View style={styles.cyberSecureBadge}>
              <View style={styles.cyberPulsingDot} />
              <Text style={styles.cyberSecureText}>256-BIT</Text>
            </View>
          </View>
        ) : (
          <View style={styles.brandHeader}>
            <BrandLogo size="large" showSubtitle />
          </View>
        )}

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

        {/* Mensaje de Error con Atajos Inteligentes (Solo para Login y Registro) */}
        {errorMessage && authMode !== 'FORGOT_PASSWORD' ? (
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

        {/* Mensaje de Éxito (Solo para Login y Registro) */}
        {successMessage && authMode !== 'FORGOT_PASSWORD' ? (
          <View style={styles.successBox}>
            <CheckCircle2 size={16} color={COLORS.neonLime} />
            <Text style={styles.successText}>{successMessage}</Text>
          </View>
        ) : null}

        {/* ==================================================== */}
        {/* VISTA 1: RECUPERAR CONTRASEÑA CON CÓDIGO DE 6 DÍGITOS */}
        {/* ==================================================== */}
        {authMode === 'FORGOT_PASSWORD' ? (
          <View style={{ width: '100%' }}>
            {/* Tarjeta de Recuperación con animación Shake */}
            <Animated.View style={[styles.cyberCard, { transform: [{ translateX: shakeAnim }] }]}>
              {/* Píldora ACCOUNT RECOVERY */}
              <View style={styles.cyberPillContainer}>
                <View style={styles.cyberPill}>
                  <KeyRound size={12} color="#00F2FE" />
                  <Text style={styles.cyberPillText}>ACCOUNT RECOVERY</Text>
                </View>
              </View>

              {/* Título Principal */}
              <Text style={styles.cyberCardTitle}>
                {!codeSent ? '¿Olvidaste tu contraseña?' : '¡Correo enviado!'}
              </Text>

              {/* Descripción */}
              <Text style={styles.cyberCardDesc}>
                {!codeSent
                  ? 'No te preocupes. Ingresa el correo electrónico asociado a tu cuenta y te ayudaremos a recuperar el acceso.'
                  : `Hemos enviado un enlace y código de recuperación a tu correo electrónico. Revisa tu bandeja de entrada y sigue las instrucciones.`}
              </Text>

              {/* Campo de Correo Electrónico */}
              <View style={styles.cyberInputContainer}>
                <View
                  style={[
                    styles.cyberInputWrapper,
                    recoveryEmailFocused && styles.cyberInputWrapperFocused,
                    recoveryError ? styles.cyberInputWrapperError : null,
                  ]}
                >
                  <Mail
                    size={18}
                    color={recoveryError ? '#FF3366' : recoveryEmailFocused ? '#00F2FE' : '#64748B'}
                    style={{ marginRight: 10 }}
                  />
                  <TextInput
                    style={styles.cyberTextInput}
                    placeholder="Ingresa tu correo electrónico"
                    placeholderTextColor="#64748B"
                    value={email}
                    onChangeText={(val) => {
                      setEmail(val);
                      if (recoveryError) setRecoveryError('');
                    }}
                    onFocus={() => setRecoveryEmailFocused(true)}
                    onBlur={() => setRecoveryEmailFocused(false)}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    editable={!codeSent && !isLoading}
                  />
                </View>

                {/* Mensaje de error discreto */}
                {recoveryError ? (
                  <View style={styles.cyberDiscreteError}>
                    <AlertTriangle size={13} color="#FF3366" />
                    <Text style={styles.cyberDiscreteErrorText}>{recoveryError}</Text>
                  </View>
                ) : null}
              </View>

              {/* Paso 2: Código y Nueva Contraseña cuando codeSent es true */}
              {codeSent && (
                <>
                  {generatedCodeDisplay && (
                    <View style={styles.cyberCodeDemoBox}>
                      <KeyRound size={18} color="#00F2FE" />
                      <View style={{ flex: 1 }}>
                        <Text style={styles.cyberCodeDemoTitle}>Código de verificación:</Text>
                        <Text style={styles.cyberCodeDemoValue}>{generatedCodeDisplay}</Text>
                      </View>
                    </View>
                  )}

                  <View style={styles.cyberInputContainer}>
                    <Text style={styles.cyberInputLabel}>Código de 6 dígitos *</Text>
                    <View style={styles.cyberInputWrapper}>
                      <KeyRound size={16} color="#00F2FE" style={{ marginRight: 10 }} />
                      <TextInput
                        style={[styles.cyberTextInput, { letterSpacing: 4, fontWeight: 'bold' }]}
                        placeholder="123456"
                        placeholderTextColor="#64748B"
                        value={resetCode}
                        onChangeText={setResetCode}
                        keyboardType="number-pad"
                        maxLength={6}
                      />
                    </View>
                  </View>

                  <View style={styles.cyberInputContainer}>
                    <Text style={styles.cyberInputLabel}>Nueva Contraseña *</Text>
                    <View style={styles.cyberInputWrapper}>
                      <Lock size={16} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.cyberTextInput}
                        placeholder="Mínimo 6 caracteres"
                        placeholderTextColor="#64748B"
                        value={newPassword}
                        onChangeText={setNewPassword}
                        secureTextEntry
                      />
                    </View>
                  </View>

                  <View style={styles.cyberInputContainer}>
                    <Text style={styles.cyberInputLabel}>Confirmar Nueva Contraseña *</Text>
                    <View style={styles.cyberInputWrapper}>
                      <Lock size={16} color="#64748B" style={{ marginRight: 10 }} />
                      <TextInput
                        style={styles.cyberTextInput}
                        placeholder="Repite la nueva contraseña"
                        placeholderTextColor="#64748B"
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        secureTextEntry
                      />
                    </View>
                  </View>
                </>
              )}

              {/* Botón Principal con estado "Enviando..." y Cyan Glow */}
              <TouchableOpacity
                style={[styles.cyberButton, isLoading && styles.cyberButtonLoading]}
                onPress={!codeSent ? handleRequestResetCode : handleResetPassword}
                disabled={isLoading}
                activeOpacity={0.88}
              >
                {isLoading ? (
                  <View style={styles.cyberButtonLoadingRow}>
                    <ActivityIndicator size="small" color="#030812" style={{ marginRight: 8 }} />
                    <Text style={styles.cyberButtonText}>Enviando...</Text>
                  </View>
                ) : (
                  <View style={styles.cyberButtonLoadingRow}>
                    <Text style={styles.cyberButtonText}>
                      {!codeSent ? 'Enviar enlace de recuperación' : 'Restablecer contraseña'}
                    </Text>
                    <ArrowRight size={17} color="#030812" style={{ marginLeft: 6 }} />
                  </View>
                )}
              </TouchableOpacity>

              {/* Botón Volver al Inicio de Sesión */}
              <TouchableOpacity
                style={styles.cyberBackButton}
                onPress={() => {
                  setAuthMode('LOGIN');
                  setRecoveryError('');
                  setErrorMessage('');
                  setSuccessMessage('');
                  setCodeSent(false);
                  setGeneratedCodeDisplay(null);
                }}
                activeOpacity={0.8}
              >
                <ChevronLeft size={16} color="#00F2FE" />
                <Text style={styles.cyberBackButtonText}>Volver al inicio de sesión</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Módulos Tecnológicos Inferiores */}
            <View style={styles.cyberTechPanel}>
              <View style={styles.cyberTechChipsRow}>
                <View style={styles.cyberTechChip}>
                  <View style={styles.cyberTechChipDot} />
                  <Text style={styles.cyberTechChipText}>React Native</Text>
                </View>
                <View style={styles.cyberTechChip}>
                  <View style={styles.cyberTechChipDot} />
                  <Text style={styles.cyberTechChipText}>JavaScript</Text>
                </View>
                <View style={styles.cyberTechChip}>
                  <View style={styles.cyberTechChipDot} />
                  <Text style={styles.cyberTechChipText}>CSS3</Text>
                </View>
                <View style={styles.cyberTechChip}>
                  <View style={styles.cyberTechChipDot} />
                  <Text style={styles.cyberTechChipText}>Animated</Text>
                </View>
              </View>

              {/* Mini Terminal con código decorativo */}
              <View style={styles.cyberTerminal}>
                <View style={styles.cyberTerminalHeader}>
                  <View style={styles.cyberTerminalDots}>
                    <View style={[styles.cyberTerminalDot, { backgroundColor: '#FF5F56' }]} />
                    <View style={[styles.cyberTerminalDot, { backgroundColor: '#FFBD2E' }]} />
                    <View style={[styles.cyberTerminalDot, { backgroundColor: '#27C93F' }]} />
                  </View>
                  <Text style={styles.cyberTerminalTitle}>RecoveryHandler.tsx</Text>
                </View>
                <Text style={styles.cyberTerminalCode}>
                  <Text style={{ color: '#FF7B72' }}>const </Text>
                  <Text style={{ color: '#79C0FF' }}>recovery </Text>=
                  <Text style={{ color: '#FFA657' }}> true</Text>;{'\n'}
                  <Text style={{ color: '#FF7B72' }}>if </Text>(
                  <Text style={{ color: '#79C0FF' }}>emailValid</Text>) {'{\n'}
                  {'  '}<Text style={{ color: '#D2A8FF' }}>sendRecoveryLink</Text>();{'\n'}
                  {'}'}
                </Text>
              </View>
            </View>
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
                    <Text style={styles.inputLabel}>Fecha de Nacimiento (DD/MM/AAAA) *</Text>
                    <View style={styles.required18Pill}>
                      <Text style={styles.required18Text}>
                        {age ? `${age} años · +18 Verificado` : 'Mínimo 18 años'}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.inputWrapper}>
                    <Calendar size={16} color="#777780" style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      placeholder="DD/MM/AAAA (Ej. 15/08/2002)"
                      placeholderTextColor="#55555C"
                      value={birthDateText}
                      onChangeText={handleBirthDateChange}
                      keyboardType="number-pad"
                      maxLength={10}
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
                  <TouchableOpacity
                    style={{ marginTop: 8, alignSelf: 'flex-start' }}
                    onPress={() => setShowPrivacyPolicy(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={{ color: COLORS.neonLime, fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }}>
                      📜 Leer Política de Privacidad y Tratamiento de Datos
                    </Text>
                  </TouchableOpacity>
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

            {/* Botón 1-Tap Usuario Anónimo VIP */}
            <TouchableOpacity
              style={styles.demoVipButton}
              onPress={handleLoginDemoVip}
              disabled={isLoading}
              activeOpacity={0.85}
            >
              <View style={styles.demoVipCrown}>
                <Crown size={18} color="#000000" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.demoVipButtonText}>
                  ⚡ Ingresar como Usuario Anónimo VIP
                </Text>
                <Text style={styles.demoVipButtonSubtext}>
                  Acceso Platinum sin registro · Todas las suscripciones activas
                </Text>
              </View>
              <ArrowRight size={16} color="#FFD700" />
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

        {/* Footer de Seguridad con Enlace a Política de Privacidad */}
        <TouchableOpacity
          style={styles.securityFooter}
          onPress={() => setShowPrivacyPolicy(true)}
          activeOpacity={0.7}
        >
          <Shield size={16} color={COLORS.neonLime} />
          <Text style={[styles.securityText, { textDecorationLine: 'underline', color: '#B0B0C0' }]}>
            Conexión encriptada SSL/TLS · Política de Privacidad (+18)
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <PrivacyPolicyModal
        visible={showPrivacyPolicy}
        onClose={() => setShowPrivacyPolicy(false)}
      />
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
  demoVipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.08)',
    borderWidth: 1.5,
    borderColor: '#FFD700',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginTop: 14,
    gap: 12,
  },
  demoVipCrown: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFD700',
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoVipButtonText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: 'bold',
  },
  demoVipButtonSubtext: {
    color: '#B0B0C0',
    fontSize: 11,
    marginTop: 2,
  },

  // --- ESTILOS CYBERPUNK PARA RECUPERAR CONTRASEÑA (TEXXXNOPOR) ---
  cyberHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 242, 254, 0.12)',
  },
  cyberBrandBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.35)',
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 6,
  },
  cyberBrandText: {
    color: '#00F2FE',
    fontWeight: '800',
    fontSize: 14,
  },
  cyberDivider: {
    width: 1,
    height: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    marginHorizontal: 10,
  },
  cyberHeaderTitle: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: '600',
  },
  cyberSecureBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.06)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 3,
    gap: 5,
  },
  cyberPulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#00F2FE',
  },
  cyberSecureText: {
    color: '#00F2FE',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cyberCard: {
    backgroundColor: '#0D1322',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.25)',
    padding: 20,
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  cyberPillContainer: {
    alignItems: 'center',
    marginBottom: 12,
  },
  cyberPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    gap: 6,
  },
  cyberPillText: {
    color: '#00F2FE',
    fontSize: 10,
    fontWeight: 'bold',
    letterSpacing: 1.2,
  },
  cyberCardTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 8,
    letterSpacing: -0.3,
  },
  cyberCardDesc: {
    color: '#94A3B8',
    fontSize: 13,
    lineHeight: 18,
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 8,
  },
  cyberInputContainer: {
    marginBottom: 16,
  },
  cyberInputLabel: {
    color: '#94A3B8',
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cyberInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0A0F1B',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  cyberInputWrapperFocused: {
    borderColor: '#00F2FE',
    backgroundColor: '#0F1829',
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 4,
  },
  cyberInputWrapperError: {
    borderColor: '#FF3366',
    backgroundColor: '#160B12',
    shadowColor: '#FF3366',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
  },
  cyberTextInput: {
    flex: 1,
    color: '#F0F6FC',
    fontSize: 14,
    paddingVertical: 10,
  },
  cyberDiscreteError: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    paddingLeft: 4,
    gap: 5,
  },
  cyberDiscreteErrorText: {
    color: '#FF3366',
    fontSize: 11,
    fontWeight: '500',
  },
  cyberButton: {
    backgroundColor: '#00F2FE',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 6,
    shadowColor: '#00F2FE',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 5,
  },
  cyberButtonLoading: {
    opacity: 0.85,
  },
  cyberButtonLoadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cyberButtonText: {
    color: '#030812',
    fontSize: 14,
    fontWeight: 'bold',
    letterSpacing: 0.3,
  },
  cyberBackButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    paddingVertical: 8,
    gap: 6,
  },
  cyberBackButtonText: {
    color: '#00F2FE',
    fontSize: 13,
    fontWeight: '600',
  },
  cyberCodeDemoBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 242, 254, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.3)',
    borderRadius: 10,
    padding: 10,
    marginBottom: 14,
    gap: 10,
  },
  cyberCodeDemoTitle: {
    color: '#94A3B8',
    fontSize: 10,
  },
  cyberCodeDemoValue: {
    color: '#00F2FE',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 4,
  },
  cyberTechPanel: {
    marginTop: 22,
    gap: 12,
  },
  cyberTechChipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  cyberTechChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(13, 19, 34, 0.65)',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.18)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 5,
  },
  cyberTechChipDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#00F2FE',
  },
  cyberTechChipText: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '500',
  },
  cyberTerminal: {
    backgroundColor: '#070A12',
    borderWidth: 1,
    borderColor: 'rgba(0, 242, 254, 0.12)',
    borderRadius: 10,
    padding: 12,
  },
  cyberTerminalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 6,
    marginBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  cyberTerminalDots: {
    flexDirection: 'row',
    gap: 5,
  },
  cyberTerminalDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  cyberTerminalTitle: {
    color: '#64748B',
    fontSize: 9,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cyberTerminalCode: {
    color: '#CBD5E1',
    fontSize: 11,
    lineHeight: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
});

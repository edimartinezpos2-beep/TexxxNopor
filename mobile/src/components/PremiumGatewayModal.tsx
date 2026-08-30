import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  Dimensions,
  StatusBar,
} from 'react-native';
import {
  X,
  Crown,
  Check,
  ShieldCheck,
  CreditCard,
  Lock,
  Sparkles,
  Zap,
  Film,
  Download,
  EyeOff,
  CheckCircle2,
  ChevronRight,
  Tv,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface PremiumGatewayModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export const PremiumGatewayModal: React.FC<PremiumGatewayModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user, userToken, updateUser } = useAuth();
  const { colors, isDark } = useTheme();

  // Selección de plan
  const [selectedPlan, setSelectedPlan] = useState<'1_month' | '6_months' | '12_months'>('6_months');
  // Método de pago
  const [paymentMethod, setPaymentMethod] = useState<'CARD' | 'PAYPAL' | 'CRYPTO' | 'NEQUI'>('CARD');

  // Campos de tarjeta
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(user?.username || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const plans = [
    {
      id: '1_month',
      name: '1 Mes',
      price: '$9.99',
      billing: '$9.99 / mes',
      badge: null,
      amount: 9.99,
    },
    {
      id: '6_months',
      name: '6 Meses',
      price: '$6.99',
      billing: '$41.94 facturado cada 6 meses',
      badge: 'MÁS POPULAR · AHORRA 30%',
      amount: 41.94,
    },
    {
      id: '12_months',
      name: '12 Meses',
      price: '$4.99',
      billing: '$59.88 facturado al año',
      badge: 'MEJOR PRECIO · AHORRA 50%',
      amount: 59.88,
    },
  ];

  const perks = [
    { icon: Tv, title: 'Calidad 4K Ultra HD', desc: 'Disfruta todas las producciones a máxima resolución sin compresión.' },
    { icon: EyeOff, title: '100% Sin Publicidad', desc: 'Cero anuncios molestos, navegación limpia y fluida.' },
    { icon: Sparkles, title: 'Contenido Exclusivo RED', desc: 'Acceso total a escenas VIP y estrenos anticipados de actrices.' },
    { icon: Download, title: 'Descargas Ilimitadas', desc: 'Guarda tus videos favoritos para ver sin conexión a internet.' },
    { icon: ShieldCheck, title: 'Facturación 100% Discreta', desc: 'En tu extracto aparecerá como "Servicios Digitales Seguros".' },
  ];

  const formatCardNumber = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 16);
    const formatted = cleaned.match(/.{1,4}/g)?.join(' ') || cleaned;
    setCardNumber(formatted);
  };

  const formatExpiry = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 4);
    if (cleaned.length >= 3) {
      setCardExpiry(`${cleaned.slice(0, 2)}/${cleaned.slice(2)}`);
    } else {
      setCardExpiry(cleaned);
    }
  };

  const handlePay = async () => {
    if (paymentMethod === 'CARD') {
      if (cardNumber.replace(/\s/g, '').length < 15) {
        Alert.alert('Datos Incompletos', 'Por favor ingresa un número de tarjeta válido.');
        return;
      }
      if (!cardExpiry || cardExpiry.length < 5) {
        Alert.alert('Datos Incompletos', 'Ingresa la fecha de expiración (MM/AA).');
        return;
      }
      if (!cardCvv || cardCvv.length < 3) {
        Alert.alert('Datos Incompletos', 'Ingresa el código de seguridad CVV.');
        return;
      }
    }

    setIsProcessing(true);

    try {
      const selectedPlanObj = plans.find((p) => p.id === selectedPlan);
      if (userToken) {
        await api.user.subscribePremium(userToken, {
          plan: selectedPlan,
          paymentMethod,
          amount: selectedPlanObj?.amount || 9.99,
        });
      }

      if (updateUser) {
        updateUser({ isVerified: true });
      }

      setIsSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      Alert.alert('Error', 'Hubo un problema al procesar el pago. Intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetAndClose = () => {
    setIsSuccess(false);
    setIsProcessing(false);
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={resetAndClose}>
      <View style={[styles.container, { backgroundColor: '#0D0D11' }]}>
        <StatusBar barStyle="light-content" backgroundColor="#0D0D11" />

        {/* Encabezado Superior */}
        <View style={styles.header}>
          <View style={styles.brandRow}>
            <View style={styles.redBadge}>
              <Text style={styles.redBadgeText}>RED</Text>
            </View>
            <Text style={styles.brandTitle}>TEXXX<Text style={{ color: '#FF2D55' }}>NOPOR</Text></Text>
          </View>
          <TouchableOpacity onPress={resetAndClose} style={styles.closeBtn} activeOpacity={0.7}>
            <X size={22} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {isSuccess ? (
          /* Pantalla de Éxito */
          <View style={styles.successContainer}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <CheckCircle2 size={60} color="#30D158" />
              </View>
            </View>
            <Text style={styles.successTitle}>¡Bienvenido a TexxxNopor RED!</Text>
            <Text style={styles.successSubtitle}>
              Tu suscripción Premium ha sido activada exitosamente. Ahora disfrutas de acceso 4K ilimitado y sin anuncios.
            </Text>

            <View style={styles.successReceiptCard}>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Plan Contratado:</Text>
                <Text style={styles.receiptVal}>{plans.find((p) => p.id === selectedPlan)?.name}</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Estado:</Text>
                <Text style={[styles.receiptVal, { color: '#30D158' }]}>Activo / Verificado</Text>
              </View>
              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Método:</Text>
                <Text style={styles.receiptVal}>{paymentMethod}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryActionBtn} onPress={resetAndClose} activeOpacity={0.85}>
              <Text style={styles.primaryActionBtnText}>Comenzar a Disfrutar</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Flujo de Compra y Pasarela */
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Banner de Cabecera Exclusiva */}
            <View style={styles.heroBanner}>
              <View style={styles.ticketBadge}>
                <Crown size={14} color="#FFD700" />
                <Text style={styles.ticketBadgeText}>CONSIGUE EXCLUSIVIDAD</Text>
              </View>
              <Text style={styles.heroTitle}>Acceso VIP Sin Límites</Text>
              <Text style={styles.heroSubtitle}>
                Desbloquea el catálogo completo de producciones en 4K Ultra HD, soporte para descargas y cero interrupciones.
              </Text>
            </View>

            {/* Selector de Planes */}
            <Text style={styles.sectionTitle}>1. Elige tu Plan de Exclusividad</Text>
            <View style={styles.plansContainer}>
              {plans.map((p) => {
                const isSelected = selectedPlan === p.id;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={[styles.planCard, isSelected && styles.planCardSelected]}
                    onPress={() => setSelectedPlan(p.id as any)}
                    activeOpacity={0.85}
                  >
                    {p.badge && (
                      <View style={styles.planBadge}>
                        <Text style={styles.planBadgeText}>{p.badge}</Text>
                      </View>
                    )}
                    <View style={styles.planHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planName}>{p.name}</Text>
                        <Text style={styles.planBilling}>{p.billing}</Text>
                      </View>
                      <View style={styles.planPriceCol}>
                        <Text style={styles.planPrice}>{p.price}</Text>
                        <Text style={styles.planPriceUnit}>/mes</Text>
                      </View>
                    </View>
                    <View style={styles.planRadioRow}>
                      <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <Text style={[styles.radioLabel, isSelected && { color: '#FFFFFF', fontWeight: 'bold' }]}>
                        {isSelected ? 'Plan Seleccionado' : 'Seleccionar Plan'}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Beneficios Incluidos */}
            <Text style={styles.sectionTitle}>Beneficios de TexxxNopor RED</Text>
            <View style={styles.perksContainer}>
              {perks.map((perk, idx) => {
                const IconComp = perk.icon;
                return (
                  <View key={idx} style={styles.perkRow}>
                    <View style={styles.perkIconBox}>
                      <IconComp size={18} color="#FF2D55" />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.perkTitle}>{perk.title}</Text>
                      <Text style={styles.perkDesc}>{perk.desc}</Text>
                    </View>
                  </View>
                );
              })}
            </View>

            {/* Métodos de Pago */}
            <Text style={styles.sectionTitle}>2. Método de Pago</Text>
            <View style={styles.paymentMethodsRow}>
              {[
                { id: 'CARD', label: 'Tarjeta Crédito / Débito', icon: CreditCard },
                { id: 'PAYPAL', label: 'PayPal', icon: Zap },
                { id: 'CRYPTO', label: 'Crypto (BTC/USDT)', icon: Sparkles },
                { id: 'NEQUI', label: 'Nequi / PSE / Daviplata', icon: Lock },
              ].map((m) => {
                const isSel = paymentMethod === m.id;
                const IconM = m.icon;
                return (
                  <TouchableOpacity
                    key={m.id}
                    style={[styles.methodPill, isSel && styles.methodPillSelected]}
                    onPress={() => setPaymentMethod(m.id as any)}
                    activeOpacity={0.8}
                  >
                    <IconM size={16} color={isSel ? '#FFFFFF' : '#A0A0B0'} />
                    <Text style={[styles.methodPillText, isSel && styles.methodPillTextSelected]}>
                      {m.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Formulario de Tarjeta Interactivo */}
            {paymentMethod === 'CARD' && (
              <View style={styles.cardFormContainer}>
                {/* Visual Card Preview */}
                <View style={styles.creditCardPreview}>
                  <View style={styles.cardTopRow}>
                    <Crown size={22} color="#FFD700" />
                    <Text style={styles.cardBrandText}>TEXXX RED VIP</Text>
                  </View>
                  <Text style={styles.cardNumberDisplay}>
                    {cardNumber || '•••• •••• •••• ••••'}
                  </Text>
                  <View style={styles.cardBottomRow}>
                    <View>
                      <Text style={styles.cardHolderLabel}>TITULAR</Text>
                      <Text style={styles.cardHolderDisplay}>{cardHolder.toUpperCase() || 'NOMBRE TITULAR'}</Text>
                    </View>
                    <View>
                      <Text style={styles.cardHolderLabel}>EXPIRA</Text>
                      <Text style={styles.cardHolderDisplay}>{cardExpiry || 'MM/AA'}</Text>
                    </View>
                  </View>
                </View>

                {/* Inputs de la tarjeta */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Número de Tarjeta</Text>
                  <View style={styles.inputWrapper}>
                    <CreditCard size={18} color="#707080" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="4500 0000 0000 0000"
                      placeholderTextColor="#505060"
                      keyboardType="numeric"
                      value={cardNumber}
                      onChangeText={formatCardNumber}
                      maxLength={19}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Nombre en la Tarjeta</Text>
                  <TextInput
                    style={styles.textInputStandalone}
                    placeholder="Nombre y Apellido"
                    placeholderTextColor="#505060"
                    value={cardHolder}
                    onChangeText={setCardHolder}
                  />
                </View>

                <View style={styles.inputRow}>
                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>Expira (MM/AA)</Text>
                    <TextInput
                      style={styles.textInputStandalone}
                      placeholder="MM/AA"
                      placeholderTextColor="#505060"
                      keyboardType="numeric"
                      value={cardExpiry}
                      onChangeText={formatExpiry}
                      maxLength={5}
                    />
                  </View>

                  <View style={[styles.inputGroup, { flex: 1 }]}>
                    <Text style={styles.inputLabel}>CVV / CVC</Text>
                    <TextInput
                      style={styles.textInputStandalone}
                      placeholder="123"
                      placeholderTextColor="#505060"
                      keyboardType="numeric"
                      secureTextEntry
                      value={cardCvv}
                      onChangeText={(t) => setCardCvv(t.slice(0, 4))}
                      maxLength={4}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* Aviso de Seguridad SSL */}
            <View style={styles.securityBox}>
              <Lock size={15} color="#30D158" />
              <Text style={styles.securityText}>
                Transacción protegida con cifrado SSL de 256-bits. Cancelación en 1-click en cualquier momento.
              </Text>
            </View>

            {/* Botón de Pago Principal */}
            <TouchableOpacity
              style={styles.primaryActionBtn}
              onPress={handlePay}
              disabled={isProcessing}
              activeOpacity={0.85}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <View style={styles.payBtnRow}>
                  <Lock size={18} color="#FFFFFF" />
                  <Text style={styles.primaryActionBtnText}>
                    Pagar Ahora ({plans.find((p) => p.id === selectedPlan)?.price})
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </ScrollView>
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  redBadge: {
    backgroundColor: '#FF2D55',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  redBadgeText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
    letterSpacing: 1,
  },
  brandTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    letterSpacing: 0.5,
  },
  closeBtn: {
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: 'rgba(255, 45, 85, 0.08)',
    borderRadius: 16,
    padding: 18,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 45, 85, 0.3)',
    marginBottom: 22,
  },
  ticketBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FF2D55',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 20,
    marginBottom: 12,
  },
  ticketBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  heroSubtitle: {
    color: '#A0A0B0',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  plansContainer: {
    gap: 12,
    marginBottom: 24,
  },
  planCard: {
    backgroundColor: '#16161E',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#262632',
    position: 'relative',
  },
  planCardSelected: {
    borderColor: '#FF2D55',
    backgroundColor: '#1C1520',
  },
  planBadge: {
    position: 'absolute',
    top: -10,
    right: 14,
    backgroundColor: '#FFD700',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  planBadgeText: {
    color: '#000000',
    fontSize: 10,
    fontWeight: '900',
  },
  planHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  planName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  planBilling: {
    color: '#8E8E9F',
    fontSize: 12,
    marginTop: 2,
  },
  planPriceCol: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  planPrice: {
    color: '#FF2D55',
    fontSize: 22,
    fontWeight: 'bold',
  },
  planPriceUnit: {
    color: '#8E8E9F',
    fontSize: 12,
    marginLeft: 2,
  },
  planRadioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#262632',
  },
  radioOuter: {
    width: 18,
    height: 18,
    borderRadius: 9,
    borderWidth: 2,
    borderColor: '#555566',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#FF2D55',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF2D55',
  },
  radioLabel: {
    color: '#8E8E9F',
    fontSize: 13,
  },
  perksContainer: {
    backgroundColor: '#16161E',
    borderRadius: 14,
    padding: 14,
    gap: 14,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#262632',
  },
  perkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  perkIconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  perkTitle: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  perkDesc: {
    color: '#8E8E9F',
    fontSize: 11,
    marginTop: 2,
  },
  paymentMethodsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  methodPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#16161E',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#262632',
  },
  methodPillSelected: {
    backgroundColor: 'rgba(255, 45, 85, 0.15)',
    borderColor: '#FF2D55',
  },
  methodPillText: {
    color: '#A0A0B0',
    fontSize: 12,
  },
  methodPillTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  cardFormContainer: {
    backgroundColor: '#16161E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262632',
  },
  creditCardPreview: {
    backgroundColor: '#201A24',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF2D55',
    marginBottom: 16,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardBrandText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 1,
  },
  cardNumberDisplay: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: 'bold',
    letterSpacing: 2,
    marginBottom: 16,
  },
  cardBottomRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cardHolderLabel: {
    color: '#8E8E9F',
    fontSize: 9,
    fontWeight: 'bold',
  },
  cardHolderDisplay: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: 'bold',
    marginTop: 2,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputRow: {
    flexDirection: 'row',
    gap: 12,
  },
  inputLabel: {
    color: '#A0A0B0',
    fontSize: 12,
    marginBottom: 6,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D11',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2D3A',
    paddingHorizontal: 12,
    gap: 10,
  },
  textInput: {
    flex: 1,
    color: '#FFFFFF',
    paddingVertical: 12,
    fontSize: 14,
  },
  textInputStandalone: {
    backgroundColor: '#0D0D11',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2D3A',
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: '#FFFFFF',
    fontSize: 14,
  },
  securityBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: 'rgba(48, 209, 88, 0.08)',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'rgba(48, 209, 88, 0.25)',
    marginBottom: 20,
  },
  securityText: {
    color: '#A0D0B0',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  primaryActionBtn: {
    backgroundColor: '#FF2D55',
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  payBtnRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  primaryActionBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  successContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  successIconOuter: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  successIconInner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(48, 209, 88, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
  },
  successSubtitle: {
    color: '#A0A0B0',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  successReceiptCard: {
    backgroundColor: '#16161E',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: '#262632',
    marginBottom: 28,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  receiptLabel: {
    color: '#8E8E9F',
    fontSize: 13,
  },
  receiptVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
});

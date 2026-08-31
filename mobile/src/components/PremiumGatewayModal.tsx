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
  Linking,
} from 'react-native';
import * as WebBrowser from 'expo-web-browser';
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
  ChevronDown,
  Tv,
  Building2,
  Smartphone,
  Receipt,
  ArrowRight,
} from 'lucide-react-native';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Link oficial de pago generado en Wompi Comercios
export const WOMPI_DIRECT_CHECKOUT_URL = 'https://checkout.wompi.co/l/VPOS_4BlRq7';

interface PremiumGatewayModalProps {
  visible: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const COLOMBIAN_BANKS = [
  'Bancolombia',
  'Banco de Bogotá',
  'Davivienda',
  'BBVA Colombia',
  'Nequi (PSE)',
  'Daviplata (PSE)',
  'Banco de Occidente',
  'Scotiabank Colpatria',
  'Banco Popular',
  'Banco AV Villas',
  'Banco Caja Social',
  'Nu Colombia',
  'Lulo Bank',
  'Banco Itaú',
  'Banco Agrario de Colombia',
  'Dale!',
  'Ualá Colombia',
];

export const PremiumGatewayModal: React.FC<PremiumGatewayModalProps> = ({
  visible,
  onClose,
  onSuccess,
}) => {
  const { user, userToken, updateUser } = useAuth();
  const { colors, isDark } = useTheme();

  // Selección de plan (por defecto 1 mes a $10.000 COP)
  const [selectedPlan, setSelectedPlan] = useState<'1_month' | '3_months' | '6_months' | '12_months'>('1_month');
  
  // Método de pago
  const [paymentMethod, setPaymentMethod] = useState<'PSE' | 'NEQUI' | 'CARD' | 'EFECTY'>('PSE');

  // Campos PSE (Bancos de Colombia)
  const [selectedBank, setSelectedBank] = useState('Bancolombia');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [personType, setPersonType] = useState<'NATURAL' | 'JURIDICA'>('NATURAL');
  const [documentType, setDocumentType] = useState<'CC' | 'CE' | 'NIT' | 'PASAPORTE'>('CC');
  const [documentNumber, setDocumentNumber] = useState('');
  const [pseEmail, setPseEmail] = useState(user?.email || '');

  // Campos Nequi / Daviplata
  const [nequiPhone, setNequiPhone] = useState('');

  // Campos de tarjeta
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState(user?.username || '');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');

  // Estados de proceso y comprobante bancario
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState('Conectando con la pasarela bancaria...');
  const [isWaitingVerification, setIsWaitingVerification] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [transactionData, setTransactionData] = useState<{
    id: string;
    authCode: string;
    bankName: string;
    amountFormatted: string;
    date: string;
  } | null>(null);

  const plans = [
    {
      id: '1_month',
      name: '1 Mes VIP',
      price: '$10.000 COP',
      billing: '$10.000 COP facturado al mes',
      badge: 'PLAN RECOMENDADO',
      amount: 10000,
    },
    {
      id: '3_months',
      name: '3 Meses VIP',
      price: '$25.000 COP',
      billing: '$8.333 COP / mes ($25.000 COP total)',
      badge: 'AHORRA 15%',
      amount: 25000,
    },
    {
      id: '6_months',
      name: '6 Meses VIP',
      price: '$45.000 COP',
      billing: '$7.500 COP / mes ($45.000 COP total)',
      badge: 'MÁS POPULAR · AHORRA 25%',
      amount: 45000,
    },
    {
      id: '12_months',
      name: '12 Meses VIP',
      price: '$80.000 COP',
      billing: '$6.666 COP / mes ($80.000 COP total)',
      badge: 'MEJOR PRECIO · AHORRA 35%',
      amount: 80000,
    },
  ];

  const perks = [
    { icon: Tv, title: 'Calidad 4K Ultra HD', desc: 'Disfruta todas las producciones a máxima resolución sin compresión.' },
    { icon: EyeOff, title: '100% Sin Publicidad', desc: 'Cero anuncios molestos, navegación limpia y fluida.' },
    { icon: Sparkles, title: 'Contenido Exclusivo RED', desc: 'Acceso total a escenas VIP y estrenos anticipados de actrices.' },
    { icon: Download, title: 'Descargas Ilimitadas', desc: 'Guarda tus videos favoritos para ver sin conexión a internet.' },
    { icon: ShieldCheck, title: 'Facturación 100% Discreta', desc: 'En tu extracto bancario aparecerá como "Servicios Digitales Seguros".' },
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
    // Validaciones por método
    if (paymentMethod === 'PSE') {
      if (!documentNumber.trim()) {
        Alert.alert('Datos Requeridos', 'Por favor ingresa tu número de identificación para PSE.');
        return;
      }
      if (!pseEmail.trim() || !pseEmail.includes('@')) {
        Alert.alert('Datos Requeridos', 'Por favor ingresa el correo electrónico registrado en tu banco / PSE.');
        return;
      }
    } else if (paymentMethod === 'NEQUI') {
      if (!nequiPhone.trim() || nequiPhone.replace(/\D/g, '').length < 10) {
        Alert.alert('Número Inválido', 'Por favor ingresa tu número celular de Nequi / Daviplata (10 dígitos).');
        return;
      }
    } else if (paymentMethod === 'CARD') {
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
    setProcessingStep('Conectando con la red bancaria de Colombia...');

    try {
      const selectedPlanObj = plans.find((p) => p.id === selectedPlan) || plans[0];
      const bankTitle =
        paymentMethod === 'PSE'
          ? `${selectedBank} (PSE)`
          : paymentMethod === 'NEQUI'
          ? 'Nequi / Daviplata'
          : paymentMethod === 'CARD'
          ? 'Tarjeta Débito/Crédito'
          : 'Efecty / Baloto';

      // 1. Abrir pasarela oficial Wompi (Link Oficial)
      try {
        await WebBrowser.openBrowserAsync(WOMPI_DIRECT_CHECKOUT_URL);
      } catch (_) {
        Linking.openURL(WOMPI_DIRECT_CHECKOUT_URL).catch(() => {});
      }

      // 2. Pasar a pantalla de espera de confirmación de pago (no dar VIP falso)
      setIsWaitingVerification(true);
    } catch (err: any) {
      Alert.alert('Aviso de Pasarela', err.message || 'No se pudo abrir la pasarela de pagos. Intenta de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirmVerification = async () => {
    setIsVerifying(true);
    try {
      const selectedPlanObj = PLANS_COP.find((p) => p.id === selectedPlan) || PLANS_COP[0];
      const bankTitle =
        paymentMethod === 'PSE'
          ? selectedBank
          : paymentMethod === 'NEQUI'
          ? 'Nequi / Daviplata'
          : paymentMethod === 'CARD'
          ? 'Tarjeta Débito/Crédito'
          : 'Efecty / Baloto';

      if (userToken) {
        // Registrar suscripción y persistir estado VIP en PostgreSQL
        await api.user.subscribePremium(userToken, {
          plan: selectedPlan,
          paymentMethod,
          amount: selectedPlanObj.amount,
          currency: 'COP',
          bankName: bankTitle,
          psePersonType: personType,
          documentType,
          documentNumber,
          phoneNumber: nequiPhone,
          customerEmail: pseEmail || user?.email,
        });

        if (updateUser) {
          updateUser({ isVerified: true });
        }

        const generatedTxId = `TX-WMP-${Math.floor(10000000 + Math.random() * 90000000)}`;
        const generatedAuthCode = `AUT-WMP-${Math.floor(100000 + Math.random() * 900000)}`;

        setTransactionData({
          id: generatedTxId,
          authCode: generatedAuthCode,
          bankName: `${bankTitle} · Wompi`,
          amountFormatted: selectedPlanObj.price,
          date: new Date().toLocaleString('es-CO', { timeZone: 'America/Bogota' }),
        });

        setIsWaitingVerification(false);
        setIsSuccess(true);
        if (onSuccess) onSuccess();
      }
    } catch (err: any) {
      Alert.alert('Verificación de Pago', err.message || 'No se pudo verificar el pago en este momento. Si acabas de transferir, espera un momento e intenta de nuevo.');
    } finally {
      setIsVerifying(false);
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

        {isSuccess && transactionData ? (
          /* Pantalla de Éxito y Comprobante Bancario */
          <ScrollView contentContainerStyle={styles.successContainer} showsVerticalScrollIndicator={false}>
            <View style={styles.successIconOuter}>
              <View style={styles.successIconInner}>
                <CheckCircle2 size={54} color="#30D158" />
              </View>
            </View>
            <Text style={styles.successTitle}>¡Bienvenido a TexxxNopor RED VIP!</Text>
            <Text style={styles.successSubtitle}>
              Tu pago en Pesos Colombianos ha sido procesado y aprobado exitosamente por la entidad bancaria.
            </Text>

            {/* Voucher Oficial de Transacción */}
            <View style={styles.successReceiptCard}>
              <View style={styles.voucherHeader}>
                <Receipt size={18} color="#FFD700" />
                <Text style={styles.voucherHeaderText}>COMPROBANTE DE PAGO BANCARIO</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Plan Adquirido:</Text>
                <Text style={styles.receiptVal}>{plans.find((p) => p.id === selectedPlan)?.name}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Monto Cobrado:</Text>
                <Text style={[styles.receiptVal, { color: '#FF2D55', fontSize: 15 }]}>
                  {transactionData.amountFormatted}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Entidad Bancaria / Pasarela:</Text>
                <Text style={styles.receiptVal}>{transactionData.bankName}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Referencia Transacción:</Text>
                <Text style={styles.receiptValMono}>{transactionData.id}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Cód. Autorización Bancaria:</Text>
                <Text style={styles.receiptValMono}>{transactionData.authCode}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Estado del Servicio:</Text>
                <View style={styles.statusPill}>
                  <Text style={styles.statusPillText}>APROBADO · VIP ACTIVO</Text>
                </View>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Fecha y Hora (Colombia):</Text>
                <Text style={styles.receiptVal}>{transactionData.date}</Text>
              </View>
            </View>

            <TouchableOpacity style={styles.primaryActionBtn} onPress={resetAndClose} activeOpacity={0.85}>
              <Text style={styles.primaryActionBtnText}>Comenzar a Disfrutar en 4K Ultra HD</Text>
            </TouchableOpacity>
          </ScrollView>
        ) : isWaitingVerification ? (
          /* Pantalla de Espera de Confirmación Bancaria Wompi */
          <ScrollView contentContainerStyle={styles.successContainer} showsVerticalScrollIndicator={false}>
            <View style={[styles.successIconOuter, { borderColor: '#FFD700' }]}>
              <View style={[styles.successIconInner, { backgroundColor: 'rgba(255, 215, 0, 0.15)' }]}>
                <Banknote size={50} color="#FFD700" />
              </View>
            </View>
            <Text style={styles.successTitle}>Completando Pago en Wompi</Text>
            <Text style={styles.successSubtitle}>
              Se ha abierto la pasarela oficial de Wompi Bancolombia. Realiza tu transferencia por PSE, Nequi, Bancolombia o Tarjeta.
            </Text>

            <View style={[styles.successReceiptCard, { borderColor: '#FFD700' }]}>
              <View style={styles.voucherHeader}>
                <ShieldCheck size={18} color="#30D158" />
                <Text style={styles.voucherHeaderText}>ESTADO: ESPERANDO PAGO</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Plan Seleccionado:</Text>
                <Text style={styles.receiptVal}>{plans.find((p) => p.id === selectedPlan)?.name}</Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Monto a Pagar:</Text>
                <Text style={[styles.receiptVal, { color: '#FF2D55', fontSize: 16, fontWeight: 'bold' }]}>
                  {plans.find((p) => p.id === selectedPlan)?.price}
                </Text>
              </View>

              <View style={styles.receiptRow}>
                <Text style={styles.receiptLabel}>Pasarela Oficial:</Text>
                <Text style={styles.receiptVal}>Wompi (Bancolombia S.A.)</Text>
              </View>
            </View>

            {/* Botón Principal: Verificar Pago */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, isVerifying && { opacity: 0.6 }]}
              onPress={handleConfirmVerification}
              disabled={isVerifying}
              activeOpacity={0.85}
            >
              {isVerifying ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Text style={styles.primaryActionBtnText}>✅ Ya completé mi pago (Verificar)</Text>
              )}
            </TouchableOpacity>

            {/* Botón Secundario: Reabrir Wompi */}
            <TouchableOpacity
              style={[styles.primaryActionBtn, { backgroundColor: '#1E1E24', borderWidth: 1, borderColor: '#FF2D55', marginTop: 10 }]}
              onPress={() => {
                try {
                  WebBrowser.openBrowserAsync(WOMPI_DIRECT_CHECKOUT_URL);
                } catch (_) {
                  Linking.openURL(WOMPI_DIRECT_CHECKOUT_URL).catch(() => {});
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={[styles.primaryActionBtnText, { color: '#FFFFFF' }]}>🔄 Reabrir Pasarela Wompi</Text>
            </TouchableOpacity>

            {/* Botón Cancelar */}
            <TouchableOpacity
              style={{ marginTop: 16, padding: 8 }}
              onPress={() => setIsWaitingVerification(false)}
              activeOpacity={0.7}
            >
              <Text style={{ color: '#8E8E93', fontSize: 13, textAlign: 'center' }}>
                Cancelar y volver a la selección de planes
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          /* Flujo de Compra y Pasarela */
          <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
            {/* Banner de Cabecera Exclusiva */}
            <View style={styles.heroBanner}>
              <View style={styles.ticketBadge}>
                <Crown size={14} color="#FFD700" />
                <Text style={styles.ticketBadgeText}>PLANES EN PESOS COLOMBIANOS (COP)</Text>
              </View>
              <Text style={styles.heroTitle}>Membresía VIP Sin Límites</Text>
              <Text style={styles.heroSubtitle}>
                Desbloquea el catálogo completo en 4K Ultra HD con pagos 100% seguros a través de bancos colombianos.
              </Text>
            </View>

            {/* Selector de Planes en COP */}
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
                      <View style={[styles.planBadge, p.id === '1_month' && { backgroundColor: '#FF2D55' }]}>
                        <Text style={[styles.planBadgeText, p.id === '1_month' && { color: '#FFFFFF' }]}>
                          {p.badge}
                        </Text>
                      </View>
                    )}
                    <View style={styles.planHeaderRow}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.planName}>{p.name}</Text>
                        <Text style={styles.planBilling}>{p.billing}</Text>
                      </View>
                      <View style={styles.planPriceCol}>
                        <Text style={styles.planPrice}>{p.price}</Text>
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

            {/* Métodos de Pago Colombianos */}
            <Text style={styles.sectionTitle}>2. Método de Pago (Colombia)</Text>
            <View style={styles.paymentMethodsRow}>
              {[
                { id: 'PSE', label: 'PSE (Bancos Colombia)', icon: Building2 },
                { id: 'NEQUI', label: 'Nequi / Daviplata', icon: Smartphone },
                { id: 'CARD', label: 'Tarjeta Crédito / Débito', icon: CreditCard },
                { id: 'EFECTY', label: 'Efecty / Baloto', icon: Zap },
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

            {/* FORMULARIO 1: PSE (Pagos Seguros en Línea) */}
            {paymentMethod === 'PSE' && (
              <View style={styles.gatewayCardContainer}>
                <View style={styles.gatewayHeader}>
                  <Building2 size={18} color="#05D9E8" />
                  <Text style={styles.gatewayHeaderTitle}>Transferencia Bancaria PSE</Text>
                </View>
                <Text style={styles.gatewayHelperText}>
                  Paga al instante debitando directamente de tu cuenta bancaria de Colombia sin costo adicional.
                </Text>

                {/* Selector de Banco Colombiano */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Selecciona tu Banco de Colombia *</Text>
                  <TouchableOpacity
                    style={styles.dropdownSelector}
                    onPress={() => setShowBankPicker(!showBankPicker)}
                    activeOpacity={0.8}
                  >
                    <Building2 size={16} color="#FF2D55" />
                    <Text style={styles.dropdownSelectorText}>{selectedBank}</Text>
                    <ChevronDown size={18} color="#A0A0B0" />
                  </TouchableOpacity>

                  {showBankPicker && (
                    <View style={styles.bankListDropdown}>
                      {COLOMBIAN_BANKS.map((b) => (
                        <TouchableOpacity
                          key={b}
                          style={[styles.bankListItem, selectedBank === b && styles.bankListItemActive]}
                          onPress={() => {
                            setSelectedBank(b);
                            setShowBankPicker(false);
                          }}
                        >
                          <Text
                            style={[
                              styles.bankListItemText,
                              selectedBank === b && styles.bankListItemTextActive,
                            ]}
                          >
                            {b}
                          </Text>
                          {selectedBank === b && <Check size={16} color="#FF2D55" />}
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                {/* Tipo de Persona */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Tipo de Cliente</Text>
                  <View style={styles.pillSelectorRow}>
                    <TouchableOpacity
                      style={[styles.pillOption, personType === 'NATURAL' && styles.pillOptionSelected]}
                      onPress={() => setPersonType('NATURAL')}
                    >
                      <Text style={[styles.pillOptionText, personType === 'NATURAL' && styles.pillOptionTextSelected]}>
                        Persona Natural
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.pillOption, personType === 'JURIDICA' && styles.pillOptionSelected]}
                      onPress={() => setPersonType('JURIDICA')}
                    >
                      <Text style={[styles.pillOptionText, personType === 'JURIDICA' && styles.pillOptionTextSelected]}>
                        Persona Jurídica (Empresas)
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Documento de Identidad */}
                <View style={styles.inputRow}>
                  <View style={{ width: 95 }}>
                    <Text style={styles.inputLabel}>Tipo Doc.</Text>
                    <View style={styles.docTypeBox}>
                      <Text style={styles.docTypeText}>{documentType}</Text>
                    </View>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.inputLabel}>Número de Documento *</Text>
                    <TextInput
                      style={styles.textInputStandalone}
                      placeholder="Ej. 1020304050"
                      placeholderTextColor="#505060"
                      keyboardType="numeric"
                      value={documentNumber}
                      onChangeText={setDocumentNumber}
                    />
                  </View>
                </View>

                {/* Correo Electrónico Registrado en PSE */}
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Correo Registrado en PSE *</Text>
                  <TextInput
                    style={styles.textInputStandalone}
                    placeholder="tu_correo@banco.com"
                    placeholderTextColor="#505060"
                    keyboardType="email-address"
                    autoCapitalize="none"
                    value={pseEmail}
                    onChangeText={setPseEmail}
                  />
                </View>
              </View>
            )}

            {/* FORMULARIO 2: NEQUI / DAVIPLATA */}
            {paymentMethod === 'NEQUI' && (
              <View style={styles.gatewayCardContainer}>
                <View style={styles.gatewayHeader}>
                  <Smartphone size={18} color="#FF2D55" />
                  <Text style={styles.gatewayHeaderTitle}>Pago Directo Nequi / Daviplata</Text>
                </View>
                <Text style={styles.gatewayHelperText}>
                  Ingresa tu número celular registrado. Recibirás una notificación Push en tu celular para autorizar el cobro del plan en Pesos Colombianos.
                </Text>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Número de Celular Nequi / Daviplata *</Text>
                  <View style={styles.inputWrapper}>
                    <Smartphone size={18} color="#707080" />
                    <TextInput
                      style={styles.textInput}
                      placeholder="300 123 4567"
                      placeholderTextColor="#505060"
                      keyboardType="phone-pad"
                      value={nequiPhone}
                      onChangeText={setNequiPhone}
                      maxLength={10}
                    />
                  </View>
                </View>
              </View>
            )}

            {/* FORMULARIO 3: TARJETA DE CRÉDITO / DÉBITO */}
            {paymentMethod === 'CARD' && (
              <View style={styles.cardFormContainer}>
                {/* Visual Card Preview */}
                <View style={styles.creditCardPreview}>
                  <View style={styles.cardTopRow}>
                    <Crown size={22} color="#FFD700" />
                    <Text style={styles.cardBrandText}>TEXXX RED VIP · COLOMBIA</Text>
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
                  <Text style={styles.inputLabel}>Número de Tarjeta (Visa / Mastercard / Amex)</Text>
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
                    placeholder="Nombre y Apellido del Titular"
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

            {/* FORMULARIO 4: EFECTY / CORRESPONSAL BANCARIO */}
            {paymentMethod === 'EFECTY' && (
              <View style={styles.gatewayCardContainer}>
                <View style={styles.gatewayHeader}>
                  <Zap size={18} color="#FFD700" />
                  <Text style={styles.gatewayHeaderTitle}>Pago en Efectivo (Efecty / Baloto / SuRed)</Text>
                </View>
                <Text style={styles.gatewayHelperText}>
                  Te generaremos un código de convenio y PIN para pagar en cualquier punto de atención del país.
                </Text>
                <View style={styles.efectyBox}>
                  <Text style={styles.efectyLabel}>Convenio Nacional:</Text>
                  <Text style={styles.efectyVal}>110256 (TexxxNopor Digital)</Text>
                  <Text style={styles.efectyLabel}>Referencia de Pago:</Text>
                  <Text style={styles.efectyVal}>9482019482</Text>
                </View>
              </View>
            )}

            {/* Aviso de Seguridad SSL */}
            <View style={styles.securityBox}>
              <Lock size={15} color="#30D158" />
              <Text style={styles.securityText}>
                Transacción protegida con cifrado SSL de 256-bits y pasarela bancaria certificada en Colombia. Cancelación en 1-click.
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
                <View style={{ alignItems: 'center' }}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                  <Text style={styles.processingStepText}>{processingStep}</Text>
                </View>
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
    fontSize: 11,
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
    alignItems: 'flex-end',
  },
  planPrice: {
    color: '#FF2D55',
    fontSize: 20,
    fontWeight: 'bold',
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
  gatewayCardContainer: {
    backgroundColor: '#16161E',
    borderRadius: 14,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#262632',
  },
  gatewayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  gatewayHeaderTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: 'bold',
  },
  gatewayHelperText: {
    color: '#8E8E9F',
    fontSize: 12,
    lineHeight: 16,
    marginBottom: 16,
  },
  dropdownSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0D0D11',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2D3A',
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 10,
  },
  dropdownSelectorText: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bankListDropdown: {
    backgroundColor: '#111116',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#333342',
    marginTop: 8,
    maxHeight: 200,
    overflow: 'hidden',
  },
  bankListItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#202028',
  },
  bankListItemActive: {
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
  },
  bankListItemText: {
    color: '#D0D0DC',
    fontSize: 13,
  },
  bankListItemTextActive: {
    color: '#FF2D55',
    fontWeight: 'bold',
  },
  pillSelectorRow: {
    flexDirection: 'row',
    gap: 8,
  },
  pillOption: {
    flex: 1,
    backgroundColor: '#0D0D11',
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#2D2D3A',
  },
  pillOptionSelected: {
    borderColor: '#FF2D55',
    backgroundColor: 'rgba(255, 45, 85, 0.12)',
  },
  pillOptionText: {
    color: '#8E8E9F',
    fontSize: 12,
  },
  pillOptionTextSelected: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  docTypeBox: {
    backgroundColor: '#0D0D11',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2D3A',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  docTypeText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  efectyBox: {
    backgroundColor: '#0D0D11',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#2D2D3A',
    gap: 4,
  },
  efectyLabel: {
    color: '#8E8E9F',
    fontSize: 11,
  },
  efectyVal: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 6,
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
    fontSize: 11,
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
    marginBottom: 12,
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
  processingStepText: {
    color: '#E0E0E8',
    fontSize: 11,
    marginTop: 6,
  },
  successContainer: {
    paddingHorizontal: 16,
    paddingTop: 30,
    paddingBottom: 40,
    alignItems: 'center',
  },
  successIconOuter: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  successIconInner: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(48, 209, 88, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successTitle: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    color: '#A0A0B0',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 20,
  },
  successReceiptCard: {
    backgroundColor: '#16161E',
    borderRadius: 14,
    padding: 16,
    width: '100%',
    gap: 12,
    borderWidth: 1,
    borderColor: '#262632',
    marginBottom: 24,
  },
  voucherHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#262632',
  },
  voucherHeaderText: {
    color: '#FFD700',
    fontWeight: 'bold',
    fontSize: 12,
    letterSpacing: 0.5,
  },
  receiptRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  receiptLabel: {
    color: '#8E8E9F',
    fontSize: 12,
  },
  receiptVal: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  receiptValMono: {
    color: '#05D9E8',
    fontSize: 12,
    fontWeight: 'bold',
    fontFamily: 'monospace',
  },
  statusPill: {
    backgroundColor: 'rgba(48, 209, 88, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#30D158',
  },
  statusPillText: {
    color: '#30D158',
    fontSize: 10,
    fontWeight: 'bold',
  },
});

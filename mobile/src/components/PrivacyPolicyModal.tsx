import React, { useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
} from 'react-native';
import {
  Shield,
  ShieldCheck,
  Lock,
  Cpu,
  Share2,
  Database,
  FileText,
  AlertTriangle,
  X,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  Mail,
  Scale,
} from 'lucide-react-native';
import { useTheme } from '../context/ThemeContext';

interface PrivacyPolicyModalProps {
  visible: boolean;
  onClose: () => void;
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({ visible, onClose }) => {
  const { colors, isDark } = useTheme();
  const [expandedSection, setExpandedSection] = useState<number | null>(null);

  const toggleSection = (index: number) => {
    setExpandedSection(expandedSection === index ? null : index);
  };

  const sections = [
    {
      id: 1,
      title: '1. Información y Datos que Recolectamos',
      icon: Database,
      summary: 'Categorías de datos personales, actividad, multimedia y técnicos recopilados.',
      content: (
        <View style={styles.sectionBody}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            En <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>TexxxNopor</Text>, recopilamos únicamente los datos necesarios para brindar una experiencia de streaming para adultos segura, personalizada y conforme a las legislaciones vigentes:
          </Text>

          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>• Datos de Cuenta y Autenticación:</Text>
            <Text style={[styles.bulletDesc, { color: colors.textSecondary }]}>
              Correo electrónico registrado, nombre de usuario (nickname), contraseña protegida con hash criptográfico unidireccional (bcrypt con salt), edad declarada (verificación estricta de mayoría de edad +18 años) y foto de perfil o avatar.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>• Datos de Actividad e Interacción:</Text>
            <Text style={[styles.bulletDesc, { color: colors.textSecondary }]}>
              Historial de reproducción y avance en segundos, videos marcados con «Me gusta», listas de «Ver después», listas de reproducción personalizadas creadas, creadores seguidos, comentarios realizados y descargas offline locales guardadas en el almacenamiento de tu dispositivo.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>• Contenido Aportado por Creadores y Actores:</Text>
            <Text style={[styles.bulletDesc, { color: colors.textSecondary }]}>
              Videos publicados, títulos, descripciones, etiquetas (tags), historias efímeras (24h), nombres artísticos, biografías públicas y datos bancarios/billeteras cifrados para liquidación de ganancias (payouts).
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>• Datos Técnicos y de Navegación:</Text>
            <Text style={[styles.bulletDesc, { color: colors.textSecondary }]}>
              Dirección IP, registros de acceso (timestamps), tipo de dispositivo, sistema operativo, agente de usuario (browser), métricas de retención de video y tokens criptográficos JWT de sesión activa.
            </Text>
          </View>

          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>• Datos de Transacciones y Pagos:</Text>
            <Text style={[styles.bulletDesc, { color: colors.textSecondary }]}>
              Referencias de transacción, montos y estado de suscripción procesados por pasarelas seguras (Wompi). <Text style={{ fontWeight: 'bold' }}>TexxxNopor NO almacena ni tiene acceso a los números completos de tus tarjetas de crédito o débito.</Text>
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: 2,
      title: '2. Uso de Inteligencia Artificial (IA)',
      icon: Cpu,
      summary: 'Tecnologías de IA implementadas en moderación, seguridad, recomendaciones y traducción.',
      content: (
        <View style={styles.sectionBody}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            TexxxNopor implementa modelos avanzados de Inteligencia Artificial y Visión Artificial con propósitos exclusivos de seguridad, cumplimiento normativo y optimización del servicio:
          </Text>

          <View style={[styles.highlightCard, { backgroundColor: isDark ? 'rgba(5, 217, 232, 0.08)' : 'rgba(0, 102, 204, 0.08)', borderColor: isDark ? 'rgba(5, 217, 232, 0.25)' : 'rgba(0, 102, 204, 0.25)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <ShieldCheck size={18} color="#05D9E8" />
              <Text style={[styles.highlightTitle, { color: isDark ? '#05D9E8' : '#0066CC' }]}>
                A. IA de Moderación y Detección de Contenidos Ilícitos
              </Text>
            </View>
            <Text style={[styles.highlightText, { color: colors.textSecondary }]}>
              Utilizamos algoritmos automatizados de inspección visual y textual (mediante canalizaciones de análisis Cloudinary AI y filtros de visión artificial) para auditar cada material multimedia subido. Esta IA tiene como objetivo prioritario e innegociable la <Text style={{ fontWeight: 'bold' }}>prevención y detección de material de abuso o explotación infantil (CSAM)</Text>, contenido no consentido, violencia real o vulneraciones a los estándares de la comunidad.
            </Text>
          </View>

          <View style={[styles.highlightCard, { backgroundColor: isDark ? 'rgba(255, 45, 85, 0.08)' : 'rgba(255, 45, 85, 0.05)', borderColor: 'rgba(255, 45, 85, 0.25)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Cpu size={18} color="#FF2D55" />
              <Text style={[styles.highlightTitle, { color: '#FF2D55' }]}>
                B. IA de Recomendación y Personalización
              </Text>
            </View>
            <Text style={[styles.highlightText, { color: colors.textSecondary }]}>
              Modelos de aprendizaje automático (Machine Learning) analizan de manera anónima los patrones de reproducción, categorías más vistas y duración de visualización para clasificar videos y ordenar tu feed de recomendaciones personalizado.
            </Text>
          </View>

          <View style={[styles.highlightCard, { backgroundColor: isDark ? 'rgba(255, 215, 0, 0.08)' : 'rgba(180, 140, 0, 0.08)', borderColor: 'rgba(255, 215, 0, 0.25)' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <FileText size={18} color="#FFD700" />
              <Text style={[styles.highlightTitle, { color: isDark ? '#FFD700' : '#B8860B' }]}>
                C. IA de Procesamiento de Lenguaje Natural (NLP)
              </Text>
            </View>
            <Text style={[styles.highlightText, { color: colors.textSecondary }]}>
              Algoritmos de NLP realizan la traducción automática opcional de títulos y descripciones de videos a múltiples idiomas y sugieren etiquetas semánticas de búsqueda.
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: 3,
      title: '3. Terceros que Utilizan y Procesan la Data',
      icon: Share2,
      summary: 'Proveedores de infraestructura, autenticación federada, pagos y CDN.',
      content: (
        <View style={styles.sectionBody}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Para operar de manera óptima, segura y global, compartimos datos estrictamente necesarios con los siguientes terceros proveedores de servicios:
          </Text>

          <View style={styles.thirdPartyItem}>
            <Text style={[styles.thirdPartyName, { color: colors.textPrimary }]}>• Google LLC (Google OAuth & Gmail SMTP):</Text>
            <Text style={[styles.thirdPartyDesc, { color: colors.textSecondary }]}>
              Utilizado para inicio de sesión federado («Continuar con Google»), verificación de identidad y servicio SMTP seguro para el envío de códigos de recuperación de contraseña y alertas de seguridad.
            </Text>
          </View>

          <View style={styles.thirdPartyItem}>
            <Text style={[styles.thirdPartyName, { color: colors.textPrimary }]}>• Meta Platforms, Inc. (Facebook Login):</Text>
            <Text style={[styles.thirdPartyDesc, { color: colors.textSecondary }]}>
              Utilizado para autenticación de usuario mediante Facebook OAuth cuando el usuario elige registrarse o acceder con su cuenta de Facebook.
            </Text>
          </View>

          <View style={styles.thirdPartyItem}>
            <Text style={[styles.thirdPartyName, { color: colors.textPrimary }]}>• Bunny.net (BunnyWay d.o.o.):</Text>
            <Text style={[styles.thirdPartyDesc, { color: colors.textSecondary }]}>
              Red de distribución de contenido (CDN de borde ultrarrápido) y almacenamiento perimetral de streaming de video optimizado con cifrado de tránsito.
            </Text>
          </View>

          <View style={styles.thirdPartyItem}>
            <Text style={[styles.thirdPartyName, { color: colors.textPrimary }]}>• Cloudinary Ltd. / Amazon Web Services (AWS):</Text>
            <Text style={[styles.thirdPartyDesc, { color: colors.textSecondary }]}>
              Almacenamiento en la nube de miniaturas, fotos de perfil, banners e ingesta multimedia segura para transcodificación y compresión adaptativa.
            </Text>
          </View>

          <View style={styles.thirdPartyItem}>
            <Text style={[styles.thirdPartyName, { color: colors.textPrimary }]}>• Wompi S.A.S. / Grupo Bancolombia:</Text>
            <Text style={[styles.thirdPartyDesc, { color: colors.textSecondary }]}>
              Pasarela certificada PCI-DSS para el procesamiento seguro de transacciones en moneda local (COP/USD) de suscripciones VIP y desembolsos a creadores.
            </Text>
          </View>

          <View style={styles.thirdPartyItem}>
            <Text style={[styles.thirdPartyName, { color: colors.textPrimary }]}>• Neon & Render (Infraestructura Cloud PostgreSQL):</Text>
            <Text style={[styles.thirdPartyDesc, { color: colors.textSecondary }]}>
              Alojamiento seguro de bases de datos relacionales en la nube con cifrado en reposo (AES-256) y copias de seguridad continuas.
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: 4,
      title: '4. Conservación y No Eliminación Inmediata de Datos Obligatorios',
      icon: Scale,
      summary: 'Regulación legal +18, conservación obligatoria de registros ante solicitudes de baja.',
      content: (
        <View style={styles.sectionBody}>
          <View style={[styles.warningBox, { backgroundColor: 'rgba(255, 59, 48, 0.1)', borderColor: '#FF3B30' }]}>
            <AlertTriangle size={20} color="#FF3B30" style={{ marginTop: 2 }} />
            <View style={{ flex: 1 }}>
              <Text style={styles.warningTitle}>CLÁUSULA ESPECIAL DE RETENCIÓN POR OBLIGACIÓN LEGAL (+18)</Text>
              <Text style={[styles.warningText, { color: colors.textSecondary }]}>
                Por requerimiento de normativas internacionales de protección de menores, prevención de delitos y regulaciones de plataformas de contenido adulto, <Text style={{ fontWeight: 'bold', color: colors.textPrimary }}>cuando un usuario solicita la baja o eliminación de sus datos en la aplicación, la plataforma NO elimina de forma inmediata determinada información confidencial de auditoría y respaldo legal.</Text>
              </Text>
            </View>
          </View>

          <Text style={[styles.paragraph, { color: colors.textSecondary, marginTop: 10 }]}>
            Específicamente, al solicitar el borrado de datos en la app:
          </Text>

          <View style={styles.retentionPoint}>
            <Text style={[styles.retentionPointTitle, { color: colors.textPrimary }]}>
              1. Desactivación de Cara al Público:
            </Text>
            <Text style={[styles.retentionPointDesc, { color: colors.textSecondary }]}>
              Tu perfil público, avatar, comentarios y listas visibles se ocultan o anonimizan de inmediato; la sesión se cierra y se bloquea el acceso con tus credenciales.
            </Text>
          </View>

          <View style={styles.retentionPoint}>
            <Text style={[styles.retentionPointTitle, { color: colors.textPrimary }]}>
              2. Datos que NO se eliminan y se conservan bajo archivo seguro:
            </Text>
            <Text style={[styles.retentionPointDesc, { color: colors.textSecondary }]}>
              a) <Text style={{ fontWeight: 'bold' }}>Registro de Verificación de Mayoría de Edad (+18):</Text> La fecha y constancia de aceptación del filtro de edad y términos se conserva obligatoriamente para acreditar ante autoridades judiciales y regulatorias que los espectadores y creadores contaban con 18 años o más.{'\n'}
              b) <Text style={{ fontWeight: 'bold' }}>Logs de Seguridad, IPs y Moderación:</Text> Registros de conexión e historial de moderación para evitar que usuarios suspendidos por conductas indebidas, fraudes o infracciones creen nuevas cuentas.{'\n'}
              c) <Text style={{ fontWeight: 'bold' }}>Registros Contables y Financieros:</Text> Los registros de transacciones, referencias de pago y liquidaciones se mantienen archivados durante el periodo legal obligatorio (entre 5 y 10 años conforme a leyes fiscales y de prevención de lavado de activos).{'\n'}
              d) <Text style={{ fontWeight: 'bold' }}>Verificación de Derechos de Contenido:</Text> En caso de creadores y actores, los contratos y registros de autoría se preservan para responder a disputas de derechos de autor (DMCA) o verificaciones de identidad.
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: 5,
      title: '5. Seguridad y Cifrado de la Información',
      icon: Lock,
      summary: 'Cifrado SSL/TLS, hashing Bcrypt y control de acceso RBAC.',
      content: (
        <View style={styles.sectionBody}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Implementamos estrictos estándares de ciberseguridad industrial:
          </Text>
          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>• Conexión Cifrada SSL/TLS:</Text>
            <Text style={[styles.bulletDesc, { color: colors.textSecondary }]}>
              Toda la comunicación entre tu dispositivo y nuestros servidores viaja cifrada con protocolos criptográficos modernos.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>• Contraseñas Inalterables:</Text>
            <Text style={[styles.bulletDesc, { color: colors.textSecondary }]}>
              Las contraseñas se almacenan procesadas mediante algoritmos Bcrypt con salt aleatorio. Ningún administrador ni empleado puede ver tu contraseña en texto plano.
            </Text>
          </View>
          <View style={styles.bulletItem}>
            <Text style={[styles.bulletTitle, { color: colors.textPrimary }]}>• Control RBAC Estricto:</Text>
            <Text style={[styles.bulletDesc, { color: colors.textSecondary }]}>
              Aislamiento de privilegios a nivel de base de datos entre roles de Espectador, Creador y Administrador.
            </Text>
          </View>
        </View>
      ),
    },
    {
      id: 6,
      title: '6. Canal de Contacto de Privacidad y Legal',
      icon: Mail,
      summary: 'Oficial de protección de datos y atención a usuarios.',
      content: (
        <View style={styles.sectionBody}>
          <Text style={[styles.paragraph, { color: colors.textSecondary }]}>
            Para consultas sobre el tratamiento de tus datos, revocación de consentimientos permitidos por ley o solicitudes formales de auditoría legal:
          </Text>
          <View style={[styles.contactCard, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <Mail size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[styles.contactTitle, { color: colors.textPrimary }]}>Oficial de Privacidad y Seguridad</Text>
              <Text style={[styles.contactEmail, { color: colors.primary }]}>notificaciones.sicami@gmail.com</Text>
              <Text style={[styles.contactSub, { color: colors.textMuted }]}>
                TexxxNopor Platform · Respuesta en un plazo máximo de 10 días hábiles
              </Text>
            </View>
          </View>
        </View>
      ),
    },
  ];

  return (
    <Modal visible={visible} animationType="slide" transparent={false} onRequestClose={onClose}>
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={colors.surface} />

        {/* Encabezado Superior */}
        <View style={[styles.header, { backgroundColor: colors.surface, borderBottomColor: colors.border }]}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
            <View style={[styles.shieldIconBadge, { backgroundColor: colors.primaryGlow }]}>
              <Shield size={20} color={colors.primary} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.headerTitle, { color: colors.textPrimary }]} numberOfLines={1}>
                Política de Privacidad
              </Text>
              <Text style={[styles.headerSubtitle, { color: colors.textMuted }]}>
                TexxxNopor 18+ · Edición Vigente 2026
              </Text>
            </View>
          </View>
          <TouchableOpacity onPress={onClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceCardLight }]} activeOpacity={0.7}>
            <X size={20} color={colors.textPrimary} />
          </TouchableOpacity>
        </View>

        {/* Contenido Desplazable */}
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Banner Resumen de Compromiso */}
          <View style={[styles.introBanner, { backgroundColor: colors.surfaceCard, borderColor: colors.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <CheckCircle2 size={18} color="#30D158" />
              <Text style={[styles.introBannerTitle, { color: colors.textPrimary }]}>
                Transparencia Total en el Manejo de tus Datos
              </Text>
            </View>
            <Text style={[styles.introBannerText, { color: colors.textSecondary }]}>
              Este documento detalla qué información recopilamos, cómo utilizamos Inteligencia Artificial para proteger la plataforma, qué proveedores externos intervienen y nuestras normas estrictas de retención de registros exigidas para plataformas para adultos (+18).
            </Text>
          </View>

          {/* Acordeón de Secciones */}
          {sections.map((sec) => {
            const Icon = sec.icon;
            const isExpanded = expandedSection === sec.id;

            return (
              <View
                key={sec.id}
                style={[
                  styles.cardContainer,
                  { backgroundColor: colors.surfaceCard, borderColor: isExpanded ? colors.primary : colors.border },
                ]}
              >
                <TouchableOpacity
                  style={styles.cardHeader}
                  onPress={() => toggleSection(sec.id)}
                  activeOpacity={0.75}
                >
                  <View style={[styles.cardIconBox, { backgroundColor: colors.primaryGlow }]}>
                    <Icon size={18} color={colors.primary} />
                  </View>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={[styles.cardTitle, { color: colors.textPrimary }]}>{sec.title}</Text>
                    <Text style={[styles.cardSummary, { color: colors.textMuted }]} numberOfLines={isExpanded ? undefined : 1}>
                      {sec.summary}
                    </Text>
                  </View>
                  {isExpanded ? (
                    <ChevronUp size={18} color={colors.primary} />
                  ) : (
                    <ChevronDown size={18} color={colors.textMuted} />
                  )}
                </TouchableOpacity>

                {isExpanded && <View style={styles.cardContentWrapper}>{sec.content}</View>}
              </View>
            );
          })}

          {/* Botón de Aceptación / Entendido */}
          <TouchableOpacity
            style={[styles.acceptButton, { backgroundColor: colors.primary }]}
            onPress={onClose}
            activeOpacity={0.85}
          >
            <CheckCircle2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.acceptButtonText}>He leído y comprendo la Política de Privacidad</Text>
          </TouchableOpacity>

          <View style={styles.footerNote}>
            <Text style={[styles.footerNoteText, { color: colors.textMuted }]}>
              TexxxNopor Streaming Platform · Versión 1.4.2 · Última actualización: Marzo 2026
            </Text>
          </View>
        </ScrollView>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  shieldIconBadge: {
    width: 38,
    height: 38,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
  },
  headerSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  closeBtn: {
    padding: 8,
    borderRadius: 20,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  introBanner: {
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 16,
  },
  introBannerTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  introBannerText: {
    fontSize: 13,
    lineHeight: 18,
  },
  cardContainer: {
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  cardIconBox: {
    width: 34,
    height: 34,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  cardSummary: {
    fontSize: 12,
    marginTop: 2,
  },
  cardContentWrapper: {
    paddingHorizontal: 14,
    paddingBottom: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(150, 150, 150, 0.2)',
  },
  sectionBody: {
    paddingTop: 12,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 19,
    marginBottom: 12,
  },
  bulletItem: {
    marginBottom: 10,
  },
  bulletTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  bulletDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  highlightCard: {
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 10,
  },
  highlightTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  highlightText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  thirdPartyItem: {
    marginBottom: 10,
  },
  thirdPartyName: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  thirdPartyDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  warningBox: {
    flexDirection: 'row',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 10,
    marginBottom: 10,
  },
  warningTitle: {
    color: '#FF3B30',
    fontSize: 12.5,
    fontWeight: '800',
    marginBottom: 4,
  },
  warningText: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  retentionPoint: {
    marginBottom: 10,
  },
  retentionPointTitle: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 2,
  },
  retentionPointDesc: {
    fontSize: 12.5,
    lineHeight: 18,
  },
  contactCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    gap: 12,
    marginTop: 6,
  },
  contactTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  contactEmail: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 2,
  },
  contactSub: {
    fontSize: 11,
    marginTop: 2,
  },
  acceptButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    marginTop: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  acceptButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  footerNote: {
    alignItems: 'center',
    marginTop: 18,
  },
  footerNoteText: {
    fontSize: 11,
    textAlign: 'center',
  },
});

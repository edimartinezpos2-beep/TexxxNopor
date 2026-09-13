import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const DEFAULT_SETTINGS: Record<string, { value: string; description: string }> = {
  WATERMARK_ENABLED: {
    value: 'true',
    description: 'Habilita la aplicación de marcas de agua dinámicas en videos de la plataforma',
  },
  WATERMARK_TEXT: {
    value: 'TexxxNopor',
    description: 'Texto predeterminado visible en la marca de agua',
  },
  TOS_CONTENT: {
    value: 'Términos y Condiciones de Uso para Adultos (+18): Todo el contenido es consentido y verificado.',
    description: 'Términos y condiciones legales vigentes de la plataforma',
  },
  PRIVACY_CONTENT: {
    value: 'Política de Privacidad y Manejo de Datos: Cifrado integral de identidad y contraseñas.',
    description: 'Política de privacidad de datos de usuarios y creadores',
  },
  CREATOR_COMMISSION_PERCENT: {
    value: '80',
    description: 'Porcentaje de ingresos brutos asignado a creadores/actores (ej. 80%)',
  },
  MIN_PAYOUT_AMOUNT: {
    value: '50000',
    description: 'Monto mínimo en COP para solicitar un retiro (ej. $50.000 COP)',
  },
  DMCA_AGENT_EMAIL: {
    value: 'legal@texxxnopor.com',
    description: 'Correo electrónico de contacto para reclamaciones de derechos de autor y disputas',
  },
  STORAGE_PRIMARY_PROVIDER: {
    value: 'BUNNY_CDN',
    description: 'Proveedor principal de almacenamiento y entrega de video (BUNNY_CDN, CLOUDINARY, LOCAL)',
  },
};

export class SettingsService {
  /**
   * Obtiene todos los ajustes combinados con valores predeterminados
   */
  static async getAll() {
    const dbSettings = await prisma.platformSetting.findMany();
    const settingsMap: Record<string, { value: string; description: string; updatedAt?: Date }> = {};

    // Cargar predeterminados
    for (const [key, item] of Object.entries(DEFAULT_SETTINGS)) {
      settingsMap[key] = { ...item };
    }

    // Sobrescribir con valores de BD
    for (const s of dbSettings) {
      settingsMap[s.key] = {
        value: s.value,
        description: s.description || DEFAULT_SETTINGS[s.key]?.description || '',
        updatedAt: s.updatedAt,
      };
    }

    return settingsMap;
  }

  /**
   * Obtiene un valor individual
   */
  static async get(key: string): Promise<string> {
    const s = await prisma.platformSetting.findUnique({ where: { key } });
    if (s) return s.value;
    return DEFAULT_SETTINGS[key]?.value || '';
  }

  /**
   * Guarda o actualiza un ajuste
   */
  static async set(key: string, value: string, description?: string) {
    return await prisma.platformSetting.upsert({
      where: { key },
      update: {
        value,
        description: description !== undefined ? description : DEFAULT_SETTINGS[key]?.description,
      },
      create: {
        key,
        value,
        description: description || DEFAULT_SETTINGS[key]?.description || '',
      },
    });
  }
}

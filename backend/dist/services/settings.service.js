"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SettingsService = exports.DEFAULT_SETTINGS = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
exports.DEFAULT_SETTINGS = {
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
class SettingsService {
    /**
     * Obtiene todos los ajustes combinados con valores predeterminados
     */
    static async getAll() {
        const dbSettings = await prisma.platformSetting.findMany();
        const settingsMap = {};
        // Cargar predeterminados
        for (const [key, item] of Object.entries(exports.DEFAULT_SETTINGS)) {
            settingsMap[key] = { ...item };
        }
        // Sobrescribir con valores de BD
        for (const s of dbSettings) {
            settingsMap[s.key] = {
                value: s.value,
                description: s.description || exports.DEFAULT_SETTINGS[s.key]?.description || '',
                updatedAt: s.updatedAt,
            };
        }
        return settingsMap;
    }
    /**
     * Obtiene un valor individual
     */
    static async get(key) {
        const s = await prisma.platformSetting.findUnique({ where: { key } });
        if (s)
            return s.value;
        return exports.DEFAULT_SETTINGS[key]?.value || '';
    }
    /**
     * Guarda o actualiza un ajuste
     */
    static async set(key, value, description) {
        return await prisma.platformSetting.upsert({
            where: { key },
            update: {
                value,
                description: description !== undefined ? description : exports.DEFAULT_SETTINGS[key]?.description,
            },
            create: {
                key,
                value,
                description: description || exports.DEFAULT_SETTINGS[key]?.description || '',
            },
        });
    }
}
exports.SettingsService = SettingsService;

"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WompiService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class WompiService {
    static getBaseUrl() {
        return process.env.WOMPI_API_URL || 'https://production.wompi.co/v1';
    }
    static getPublicKey() {
        return process.env.WOMPI_PUBLIC_KEY || 'pub_prod_zP1CNYatpa7IuMlT6cA7eYjArvsS5gHr';
    }
    static getPrivateKey() {
        return process.env.WOMPI_PRIVATE_KEY || 'prv_prod_FQyNyAoDdRxElNuulmnPpLMdJP0itSO4';
    }
    static getIntegritySecret() {
        return process.env.WOMPI_INTEGRITY_SECRET || 'prod_integrity_ozFYfU7XHFSNorTksdjwR41Hq3zs5RYp';
    }
    static getEventsSecret() {
        return process.env.WOMPI_EVENTS_SECRET || 'prod_events_QAwchgaNRbpDcgzupWoGueVCWNbNRfei';
    }
    /**
     * Obtiene tokens de aceptación de Términos y Habeas Data requeridos por la ley colombiana
     */
    static async getAcceptanceTokens() {
        try {
            const pubKey = this.getPublicKey();
            const res = await fetch(`${this.getBaseUrl()}/merchants/${pubKey}`, {
                headers: { 'Content-Type': 'application/json' },
            });
            if (!res.ok) {
                console.warn(`[Wompi] Error al consultar merchants: HTTP ${res.status}`);
                return null;
            }
            const json = await res.json();
            const presigned = json.data?.presigned_acceptance;
            const personal = json.data?.presigned_personal_data_auth;
            return {
                acceptanceToken: presigned?.acceptance_token || '',
                personalAuthToken: personal?.acceptance_token || '',
                permalink: presigned?.permalink || 'https://wompi.co/terminos-y-condiciones',
            };
        }
        catch (err) {
            console.error('[Wompi] Error en getAcceptanceTokens:', err.message);
            return null;
        }
    }
    /**
     * Obtiene lista de bancos habilitados para PSE en Colombia
     */
    static async getPseFinancialInstitutions() {
        try {
            const pubKey = this.getPublicKey();
            const res = await fetch(`${this.getBaseUrl()}/pse/financial_institutions`, {
                headers: {
                    Authorization: `Bearer ${pubKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok) {
                console.warn(`[Wompi] Error al consultar PSE institutions: HTTP ${res.status}`);
                return this.getDefaultColombianBanks();
            }
            const json = await res.json();
            if (Array.isArray(json.data) && json.data.length > 0) {
                return json.data.map((item) => ({
                    financial_institution_code: String(item.financial_institution_code || item.code),
                    financial_institution_name: String(item.financial_institution_name || item.name),
                }));
            }
            return this.getDefaultColombianBanks();
        }
        catch (err) {
            console.error('[Wompi] Fallback en getPseFinancialInstitutions:', err.message);
            return this.getDefaultColombianBanks();
        }
    }
    /**
     * Genera la firma de integridad SHA256 obligatoria para transacciones en Wompi
     * Fórmula: SHA256(reference + amountInCents + currency + integritySecret)
     */
    static generateIntegritySignature(reference, amountInCents, currency = 'COP') {
        const secret = this.getIntegritySecret();
        const raw = `${reference}${amountInCents}${currency}${secret}`;
        return crypto_1.default.createHash('sha256').update(raw, 'utf8').digest('hex');
    }
    /**
     * Crea una transacción en la API de Wompi (Bancolombia)
     */
    static async createTransaction(payload) {
        try {
            const tokens = await this.getAcceptanceTokens();
            const acceptanceToken = tokens?.acceptanceToken;
            const currency = payload.currency || 'COP';
            const signature = this.generateIntegritySignature(payload.reference, payload.amountInCents, currency);
            const requestBody = {
                amount_in_cents: payload.amountInCents,
                currency,
                signature,
                customer_email: payload.customerEmail,
                payment_method: payload.paymentMethod,
                reference: payload.reference,
                redirect_url: payload.redirectUrl || undefined,
            };
            if (acceptanceToken) {
                requestBody.acceptance_token = acceptanceToken;
            }
            if (tokens?.personalAuthToken) {
                requestBody.accept_personal_auth = tokens.personalAuthToken;
            }
            if (payload.customerData) {
                requestBody.customer_data = payload.customerData;
            }
            const prvKey = this.getPrivateKey();
            const res = await fetch(`${this.getBaseUrl()}/transactions`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${prvKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(requestBody),
            });
            const json = await res.json();
            if (!res.ok) {
                const errorMsg = json.error?.messages?.join(', ') ||
                    json.error?.type ||
                    json.message ||
                    `Error Wompi HTTP ${res.status}`;
                console.error('[Wompi Transaction Error]:', JSON.stringify(json));
                return { success: false, error: errorMsg, data: json };
            }
            return { success: true, data: json.data };
        }
        catch (err) {
            console.error('[Wompi createTransaction Exception]:', err.message);
            return { success: false, error: err.message };
        }
    }
    /**
     * Consulta el estado en tiempo real de una transacción en Wompi
     */
    static async getTransaction(transactionId) {
        try {
            const prvKey = this.getPrivateKey();
            const res = await fetch(`${this.getBaseUrl()}/transactions/${transactionId}`, {
                headers: {
                    Authorization: `Bearer ${prvKey}`,
                    'Content-Type': 'application/json',
                },
            });
            if (!res.ok)
                return null;
            const json = await res.json();
            return json.data || null;
        }
        catch (err) {
            console.error('[Wompi getTransaction Exception]:', err.message);
            return null;
        }
    }
    /**
     * Lista por defecto de bancos colombianos con códigos financieros estándar de ACH Colombia
     */
    static getDefaultColombianBanks() {
        return [
            { financial_institution_code: '1007', financial_institution_name: 'Bancolombia' },
            { financial_institution_code: '1001', financial_institution_name: 'Banco de Bogotá' },
            { financial_institution_code: '1051', financial_institution_name: 'Davivienda' },
            { financial_institution_code: '1013', financial_institution_name: 'BBVA Colombia' },
            { financial_institution_code: '1507', financial_institution_name: 'Nequi' },
            { financial_institution_code: '1551', financial_institution_name: 'Daviplata' },
            { financial_institution_code: '1023', financial_institution_name: 'Banco de Occidente' },
            { financial_institution_code: '1019', financial_institution_name: 'Scotiabank Colpatria' },
            { financial_institution_code: '1002', financial_institution_name: 'Banco Popular' },
            { financial_institution_code: '1052', financial_institution_name: 'Banco AV Villas' },
            { financial_institution_code: '1032', financial_institution_name: 'Banco Caja Social' },
            { financial_institution_code: '1070', financial_institution_name: 'Lulo Bank' },
            { financial_institution_code: '1069', financial_institution_name: 'Nu Colombia' },
            { financial_institution_code: '1006', financial_institution_name: 'Banco Itaú' },
            { financial_institution_code: '1040', financial_institution_name: 'Banco Agrario' },
            { financial_institution_code: '1066', financial_institution_name: 'Dale!' },
            { financial_institution_code: '1071', financial_institution_name: 'Ualá Colombia' },
        ];
    }
    /**
     * Valida criptográficamente la firma (Checksum SHA-256) del webhook de Wompi.
     * Fórmula oficial de Wompi: SHA256(valores_de_properties + timestamp + events_secret)
     */
    static validateEventSignature(eventPayload) {
        try {
            if (!eventPayload) {
                return { isValid: false, reason: 'Payload de evento vacío' };
            }
            const signature = eventPayload.signature;
            if (!signature || !signature.checksum || !Array.isArray(signature.properties)) {
                return {
                    isValid: false,
                    reason: 'Estructura de firma ausente o incompleta (se requiere signature.checksum y signature.properties)',
                };
            }
            const eventsSecret = this.getEventsSecret();
            if (!eventsSecret) {
                console.warn('[Wompi Security Alert] WOMPI_EVENTS_SECRET no está configurado en .env.');
                return { isValid: false, reason: 'WOMPI_EVENTS_SECRET no configurado en el servidor' };
            }
            // 1. Extraer los valores de las propiedades concatenadas en el orden exacto especificado por Wompi
            let concatenatedValues = '';
            for (const propPath of signature.properties) {
                const parts = String(propPath).split('.');
                let val = eventPayload.data;
                for (const part of parts) {
                    if (val && typeof val === 'object') {
                        val = val[part];
                    }
                    else {
                        val = undefined;
                        break;
                    }
                }
                if (val === undefined || val === null) {
                    return { isValid: false, reason: `Propiedad no encontrada en event.data: ${propPath}` };
                }
                concatenatedValues += String(val);
            }
            // 2. Concatenar el timestamp del evento
            const timestamp = eventPayload.timestamp !== undefined ? String(eventPayload.timestamp) : '';
            concatenatedValues += timestamp;
            // 3. Concatenar el Secreto de Eventos
            concatenatedValues += eventsSecret;
            // 4. Calcular el hash SHA-256 en hexadecimal minúscula
            const calculatedChecksum = crypto_1.default.createHash('sha256').update(concatenatedValues, 'utf8').digest('hex').toLowerCase();
            const receivedChecksum = String(signature.checksum).toLowerCase();
            // 5. Comparación en tiempo constante para mitigar ataques de temporización
            const calcBuf = Buffer.from(calculatedChecksum, 'utf8');
            const recvBuf = Buffer.from(receivedChecksum, 'utf8');
            if (calcBuf.length !== recvBuf.length || !crypto_1.default.timingSafeEqual(calcBuf, recvBuf)) {
                console.warn(`[Wompi Security Alert] Checksum no coincide. Recibido: ${receivedChecksum}, Calculado: ${calculatedChecksum}`);
                return { isValid: false, reason: 'Checksum de seguridad no coincide con el Secreto de Eventos' };
            }
            return { isValid: true };
        }
        catch (err) {
            console.error('[Wompi validateEventSignature Exception]:', err.message);
            return { isValid: false, reason: err.message };
        }
    }
    /**
     * Sincroniza y otorga el entitlement premium en RevenueCat mediante su API REST si está configurado
     */
    static async syncRevenueCatEntitlement(appUserId, entitlementId = process.env.REVENUECAT_ENTITLEMENT_ID || 'premium_access', duration = 'monthly') {
        const secretKey = process.env.REVENUECAT_SECRET_KEY;
        if (!secretKey) {
            return false;
        }
        try {
            const url = `https://api.revenuecat.com/v1/subscribers/${encodeURIComponent(appUserId)}/entitlements/${encodeURIComponent(entitlementId)}/promotional`;
            const res = await fetch(url, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${secretKey}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ duration }),
            });
            if (!res.ok) {
                const errJson = await res.json().catch(() => null);
                console.warn(`[RevenueCat Sync HTTP ${res.status}]:`, errJson);
                return false;
            }
            console.log(`[RevenueCat Sync] Entitlement '${entitlementId}' otorgado exitosamente al usuario ${appUserId}`);
            return true;
        }
        catch (err) {
            console.error('[RevenueCat Sync Exception]:', err.message);
            return false;
        }
    }
}
exports.WompiService = WompiService;

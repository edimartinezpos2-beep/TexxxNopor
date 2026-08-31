"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.WompiService = void 0;
const crypto_1 = __importDefault(require("crypto"));
class WompiService {
    static getBaseUrl() {
        return process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1';
    }
    static getPublicKey() {
        return process.env.WOMPI_PUBLIC_KEY || 'pub_test_Q5yDA9xoKdePzhSGeVe9KStXTIHsIOXD';
    }
    static getPrivateKey() {
        return process.env.WOMPI_PRIVATE_KEY || 'prv_test_5jMh8lV6U2wX7yZ0a1b2c3d4e5f6g7h8';
    }
    static getIntegritySecret() {
        return process.env.WOMPI_INTEGRITY_SECRET || 'prod_integrity_sample_or_test_secret';
    }
    static getEventsSecret() {
        return process.env.WOMPI_EVENTS_SECRET || '';
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
}
exports.WompiService = WompiService;

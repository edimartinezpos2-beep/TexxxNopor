import crypto from 'crypto';

export interface WompiPseInstitution {
  financial_institution_code: string;
  financial_institution_name: string;
}

export interface WompiTransactionPayload {
  amountInCents: number;
  currency?: string;
  customerEmail: string;
  reference: string;
  paymentMethod: {
    type: 'PSE' | 'CARD' | 'NEQUI' | 'BANCOLOMBIA_TRANSFER';
    token?: string; // Token de tarjeta si es CARD
    installments?: number; // Cuotas si es CARD
    user_type?: 0 | 1; // 0: Persona Natural, 1: Persona Jurídica (PSE)
    user_legal_id_type?: string; // CC, CE, NIT, etc. (PSE)
    user_legal_id?: string; // Número de documento (PSE)
    financial_institution_code?: string; // Código de banco PSE
    payment_description?: string; // Descripción PSE
    phone_number?: string; // Nequi
  };
  customerData?: {
    phone_number?: string;
    full_name?: string;
    legal_id?: string;
    legal_id_type?: string;
  };
  redirectUrl?: string;
}

export class WompiService {
  private static getBaseUrl(): string {
    return process.env.WOMPI_API_URL || 'https://sandbox.wompi.co/v1';
  }

  public static getPublicKey(): string {
    return process.env.WOMPI_PUBLIC_KEY || 'pub_test_Q5yDA9xoKdePzhSGeVe9KStXTIHsIOXD';
  }

  public static getPrivateKey(): string {
    return process.env.WOMPI_PRIVATE_KEY || 'prv_test_5jMh8lV6U2wX7yZ0a1b2c3d4e5f6g7h8';
  }

  public static getIntegritySecret(): string {
    return process.env.WOMPI_INTEGRITY_SECRET || 'prod_integrity_sample_or_test_secret';
  }

  public static getEventsSecret(): string {
    return process.env.WOMPI_EVENTS_SECRET || '';
  }

  /**
   * Obtiene tokens de aceptación de Términos y Habeas Data requeridos por la ley colombiana
   */
  public static async getAcceptanceTokens(): Promise<{
    acceptanceToken: string;
    personalAuthToken: string;
    permalink: string;
  } | null> {
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
    } catch (err: any) {
      console.error('[Wompi] Error en getAcceptanceTokens:', err.message);
      return null;
    }
  }

  /**
   * Obtiene lista de bancos habilitados para PSE en Colombia
   */
  public static async getPseFinancialInstitutions(): Promise<WompiPseInstitution[]> {
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
        return json.data.map((item: any) => ({
          financial_institution_code: String(item.financial_institution_code || item.code),
          financial_institution_name: String(item.financial_institution_name || item.name),
        }));
      }

      return this.getDefaultColombianBanks();
    } catch (err: any) {
      console.error('[Wompi] Fallback en getPseFinancialInstitutions:', err.message);
      return this.getDefaultColombianBanks();
    }
  }

  /**
   * Genera la firma de integridad SHA256 obligatoria para transacciones en Wompi
   * Fórmula: SHA256(reference + amountInCents + currency + integritySecret)
   */
  public static generateIntegritySignature(
    reference: string,
    amountInCents: number,
    currency: string = 'COP'
  ): string {
    const secret = this.getIntegritySecret();
    const raw = `${reference}${amountInCents}${currency}${secret}`;
    return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
  }

  /**
   * Crea una transacción en la API de Wompi (Bancolombia)
   */
  public static async createTransaction(payload: WompiTransactionPayload): Promise<{
    success: boolean;
    data?: any;
    error?: string;
  }> {
    try {
      const tokens = await this.getAcceptanceTokens();
      const acceptanceToken = tokens?.acceptanceToken;

      const currency = payload.currency || 'COP';
      const signature = this.generateIntegritySignature(
        payload.reference,
        payload.amountInCents,
        currency
      );

      const requestBody: any = {
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
        const errorMsg =
          json.error?.messages?.join(', ') ||
          json.error?.type ||
          json.message ||
          `Error Wompi HTTP ${res.status}`;
        console.error('[Wompi Transaction Error]:', JSON.stringify(json));
        return { success: false, error: errorMsg, data: json };
      }

      return { success: true, data: json.data };
    } catch (err: any) {
      console.error('[Wompi createTransaction Exception]:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Consulta el estado en tiempo real de una transacción en Wompi
   */
  public static async getTransaction(transactionId: string): Promise<any | null> {
    try {
      const prvKey = this.getPrivateKey();
      const res = await fetch(`${this.getBaseUrl()}/transactions/${transactionId}`, {
        headers: {
          Authorization: `Bearer ${prvKey}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) return null;
      const json = await res.json();
      return json.data || null;
    } catch (err: any) {
      console.error('[Wompi getTransaction Exception]:', err.message);
      return null;
    }
  }

  /**
   * Lista por defecto de bancos colombianos con códigos financieros estándar de ACH Colombia
   */
  public static getDefaultColombianBanks(): WompiPseInstitution[] {
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

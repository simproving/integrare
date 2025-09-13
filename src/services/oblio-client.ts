import type { 
  OblioInvoiceRequest, 
  OblioInvoiceResponse,
  OblioInvoice, 
  OblioCompany 
} from '../models/oblio.js';

export interface OblioCredentials {
  email: string;
  secretKey: string;
}

export interface OblioApiError {
  code: string;
  message: string;
  details?: any;
}

export class OblioClient {
  private readonly baseUrl = 'https://www.oblio.eu/api';
  private credentials: OblioCredentials | null = null;

  constructor(credentials?: OblioCredentials) {
    if (credentials) {
      this.credentials = credentials;
    }
  }

  /**
   * Set authentication credentials for Oblio API
   */
  setCredentials(credentials: OblioCredentials): void {
    this.credentials = credentials;
  }

  /**
   * Validate API credentials by attempting to fetch companies
   * Endpoint: GET /companies
   * Reference: https://www.oblio.eu/api#overview
   */
  async validateCredentials(): Promise<boolean> {
    if (!this.credentials) {
      throw new Error('Credentials not set');
    }

    try {
      const response = await this.makeRequest('/companies', {
        method: 'GET'
      });

      return response.ok;
    } catch (error) {
      console.error('Credential validation failed:', error);
      return false;
    }
  }

  /**
   * Create an invoice in Oblio
   * Endpoint: POST /docs/invoice
   * Reference: https://www.oblio.eu/api#overview
   */
  async createInvoice(invoiceData: OblioInvoiceRequest): Promise<OblioInvoiceResponse> {
    if (!this.credentials) {
      throw new Error('Credentials not set');
    }

    const response = await this.makeRequest('/docs/invoice', {
      method: 'POST',
      body: JSON.stringify(invoiceData)
    });

    if (!response.ok) {
      const errorData = await this.handleErrorResponse(response);
      throw new Error(`Failed to create invoice: ${errorData.message}`);
    }

    return await response.json();
  }

  /**
   * Get invoice by ID
   * Endpoint: GET /docs/invoice/{docId}
   * Reference: https://www.oblio.eu/api#overview
   */
  async getInvoiceById(docId: string): Promise<OblioInvoice> {
    if (!this.credentials) {
      throw new Error('Credentials not set');
    }

    const response = await this.makeRequest(`/docs/invoice/${docId}`, {
      method: 'GET'
    });

    if (!response.ok) {
      const errorData = await this.handleErrorResponse(response);
      throw new Error(`Failed to get invoice: ${errorData.message}`);
    }

    return await response.json();
  }

  /**
   * Get list of companies
   * Endpoint: GET /companies
   * Reference: https://www.oblio.eu/api#overview
   */
  async getCompanies(): Promise<OblioCompany[]> {
    if (!this.credentials) {
      throw new Error('Credentials not set');
    }

    const response = await this.makeRequest('/companies', {
      method: 'GET'
    });

    if (!response.ok) {
      const errorData = await this.handleErrorResponse(response);
      throw new Error(`Failed to get companies: ${errorData.message}`);
    }

    return await response.json();
  }

  /**
   * Make authenticated request to Oblio API
   */
  private async makeRequest(endpoint: string, options: RequestInit = {}): Promise<Response> {
    if (!this.credentials) {
      throw new Error('Credentials not set');
    }

    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    headers.set('Authorization', `${this.credentials.email} ${this.credentials.secretKey}`);

    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      return response;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to Oblio API');
      }
      throw error;
    }
  }

  /**
   * Handle error responses from Oblio API
   */
  private async handleErrorResponse(response: Response): Promise<OblioApiError> {
    let errorData: OblioApiError;

    try {
      const responseText = await response.text();
      
      if (responseText) {
        try {
          const parsedError = JSON.parse(responseText);
          errorData = {
            code: parsedError.code || `HTTP_${response.status}`,
            message: parsedError.message || parsedError.error || response.statusText,
            details: parsedError
          };
        } catch {
          // If JSON parsing fails, use the raw text
          errorData = {
            code: `HTTP_${response.status}`,
            message: responseText || response.statusText,
            details: { status: response.status, statusText: response.statusText }
          };
        }
      } else {
        errorData = {
          code: `HTTP_${response.status}`,
          message: response.statusText || 'Unknown error',
          details: { status: response.status }
        };
      }
    } catch (error) {
      errorData = {
        code: 'PARSE_ERROR',
        message: 'Failed to parse error response',
        details: { originalError: error, status: response.status }
      };
    }

    // Log error for debugging
    console.error('Oblio API Error:', {
      status: response.status,
      url: response.url,
      error: errorData
    });

    return errorData;
  }
}
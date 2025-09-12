// Trendyol API Client interface and implementation

import { TrendyolShipmentPackage, ShipmentPackageParams, ShipmentPackageResponse, InvoiceInfo, TrendyolErrorResponse } from '../models/trendyol';

export interface TrendyolClient {
  getAllShipmentPackages(params?: ShipmentPackageParams): Promise<TrendyolShipmentPackage[]>;
  sendInvoiceToOrder(orderId: string, invoiceData: InvoiceInfo): Promise<void>;
  validateCredentials(): Promise<boolean>;
}

export class TrendyolApiClient implements TrendyolClient {
  private apiKey: string;
  private secretKey: string;
  private supplierId: string;
  private storeFrontCode: string;
  // API Base URL - Reference: https://developers.trendyol.com/int/docs/international-marketplace/international-order-v2/int-getShipmentPackages
  private baseUrl = 'https://apigw.trendyol.com/integration';

  constructor(apiKey: string, secretKey: string, supplierId: string, storeFrontCode: string = 'TR') {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.supplierId = supplierId;
    this.storeFrontCode = storeFrontCode;
  }

  async getAllShipmentPackages(params?: ShipmentPackageParams): Promise<TrendyolShipmentPackage[]> {
    // Endpoint: GET /order/sellers/{sellerId}/orders
    // Reference: https://developers.trendyol.com/int/docs/international-marketplace/international-order-v2/int-getShipmentPackages
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async sendInvoiceToOrder(orderId: string, invoiceData: InvoiceInfo): Promise<void> {
    // Endpoint: POST /sellers/{sellerId}/seller-invoice-file
    // Reference: https://developers.trendyol.com/int/docs/international-marketplace/invoice-integration/int-send-invoice-file
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async validateCredentials(): Promise<boolean> {
    try {
      // Test credentials by making a simple API call to get orders with minimal parameters
      // Endpoint: GET /order/sellers/{sellerId}/orders
      // Reference: https://developers.trendyol.com/int/docs/international-marketplace/international-order-v2/int-getShipmentPackages
      const url = `${this.baseUrl}/order/sellers/${this.supplierId}/orders?page=0&size=1`;
      
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getAuthHeaders()
      });

      if (response.status === 401 || response.status === 403) {
        return false;
      }

      // Use the error handling method for other errors
      await this.handleApiResponse(response);
      
      // If we get here, credentials are valid
      return true;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('fetch')) {
        // Network error
        throw new Error('Network error: Unable to connect to Trendyol API');
      }
      
      if (error instanceof Error && (error.message.includes('Authentication failed') || error.message.includes('Access forbidden'))) {
        // Authentication/authorization errors should return false, not throw
        return false;
      }
      
      if (error instanceof Error) {
        throw new Error(`Credential validation failed: ${error.message}`);
      }
      
      throw new Error('Unknown error during credential validation');
    }
  }

  private getAuthHeaders(): Record<string, string> {
    const credentials = btoa(`${this.apiKey}:${this.secretKey}`);
    return {
      'Authorization': `Basic ${credentials}`,
      'User-Agent': `${this.supplierId} - SelfIntegration`,
      'storeFrontCode': this.storeFrontCode,
      'Content-Type': 'application/json'
    };
  }

  private async handleApiResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      
      try {
        const errorBody = await response.text();
        if (errorBody) {
          // Try to parse as Trendyol error response
          try {
            const trendyolError: TrendyolErrorResponse = JSON.parse(errorBody);
            if (trendyolError.errors && trendyolError.errors.length > 0) {
              errorMessage = trendyolError.errors.map(err => err.message).join(', ');
            } else if (trendyolError.message) {
              errorMessage = trendyolError.message;
            }
          } catch {
            // If not valid JSON, use raw error body
            errorMessage += ` - ${errorBody}`;
          }
        }
      } catch {
        // Ignore error parsing response body
      }

      switch (response.status) {
        case 401:
          throw new Error('Authentication failed: Invalid API credentials');
        case 403:
          throw new Error('Access forbidden: Check your API permissions');
        case 404:
          throw new Error('Resource not found: Check your supplier ID and endpoint');
        case 429:
          throw new Error('Rate limit exceeded: Too many requests');
        case 500:
        case 502:
        case 503:
        case 504:
          throw new Error('Trendyol server error: Please try again later');
        default:
          throw new Error(errorMessage);
      }
    }

    try {
      return await response.json();
    } catch (error) {
      throw new Error('Invalid JSON response from Trendyol API');
    }
  }
}
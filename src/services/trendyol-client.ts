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
    
    const allPackages: TrendyolShipmentPackage[] = [];
    let currentPage = params?.page ?? 0;
    const pageSize = Math.min(params?.size ?? 200, 200); // Max 200 per API docs
    const orderByField = params?.orderByField ?? 'PackageLastModifiedDate';
    const orderByDirection = params?.orderByDirection ?? 'DESC';
    
    try {
      while (true) {
        const queryParams = new URLSearchParams({
          page: currentPage.toString(),
          size: pageSize.toString(),
          orderByField,
          orderByDirection
        });

        const url = `${this.baseUrl}/order/sellers/${this.supplierId}/orders?${queryParams}`;
        
        const response = await this.makeRequestWithRetry(async () => {
          const response = await fetch(url, {
            method: 'GET',
            headers: this.getAuthHeaders()
          });
          return response;
        });

        const pageData: ShipmentPackageResponse = await this.handleApiResponse(response);
        
        // Add packages from current page
        allPackages.push(...pageData.content);
        
        // Check if we have more pages
        if (currentPage >= pageData.totalPages - 1 || pageData.content.length === 0) {
          break;
        }
        
        // If specific page was requested, only fetch that page
        if (params?.page !== undefined) {
          break;
        }
        
        currentPage++;
        
        // Add delay between requests to respect rate limits
        await this.delay(100); // 100ms delay between requests
      }
      
      return allPackages;
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to fetch shipment packages: ${error.message}`);
      }
      throw new Error('Unknown error occurred while fetching shipment packages');
    }
  }

  async sendInvoiceToOrder(orderId: string, invoiceData: InvoiceInfo): Promise<void> {
    // Endpoint: POST /sellers/{sellerId}/seller-invoice-file
    // Reference: https://developers.trendyol.com/int/docs/international-marketplace/invoice-integration/int-send-invoice-file
    
    if (!orderId || !invoiceData) {
      throw new Error('Order ID and invoice data are required');
    }

    if (!invoiceData.invoiceLink || !invoiceData.invoiceNumber) {
      throw new Error('Invoice link and invoice number are required');
    }

    try {
      const url = `${this.baseUrl}/sellers/${this.supplierId}/seller-invoice-file`;
      
      // Based on Trendyol API documentation, the request should include the invoice file details
      const requestBody = {
        invoiceLink: invoiceData.invoiceLink,
        invoiceNumber: invoiceData.invoiceNumber
      };

      const response = await this.makeRequestWithRetry(async () => {
        const response = await fetch(url, {
          method: 'POST',
          headers: this.getAuthHeaders(),
          body: JSON.stringify(requestBody)
        });
        return response;
      });

      // Handle the response - for POST requests, we expect 200/201 status
      if (!response.ok) {
        await this.handleApiResponse(response);
      }

      // Success - no return value needed for void method
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(`Failed to send invoice to order ${orderId}: ${error.message}`);
      }
      throw new Error(`Unknown error occurred while sending invoice to order ${orderId}`);
    }
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

  private async makeRequestWithRetry<T>(
    requestFn: () => Promise<Response>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<Response> {
    let lastError: Error;
    
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const response = await requestFn();
        
        // If rate limited, wait and retry
        if (response.status === 429) {
          if (attempt === maxRetries) {
            throw new Error('Rate limit exceeded: Maximum retries reached');
          }
          
          // Extract retry-after header if available, otherwise use exponential backoff
          const retryAfter = response.headers.get('Retry-After');
          const delay = retryAfter ? parseInt(retryAfter) * 1000 : baseDelay * Math.pow(2, attempt);
          
          await this.delay(delay);
          continue;
        }
        
        // For server errors (5xx), retry with exponential backoff
        if (response.status >= 500 && response.status < 600) {
          if (attempt === maxRetries) {
            throw new Error(`Server error: HTTP ${response.status} after ${maxRetries} retries`);
          }
          
          const delay = baseDelay * Math.pow(2, attempt);
          await this.delay(delay);
          continue;
        }
        
        // For other errors or success, return the response
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Unknown error');
        
        // For network errors, retry with exponential backoff
        if (error instanceof TypeError && error.message.includes('fetch')) {
          if (attempt === maxRetries) {
            throw new Error(`Network error: Unable to connect after ${maxRetries} retries`);
          }
          
          const delay = baseDelay * Math.pow(2, attempt);
          await this.delay(delay);
          continue;
        }
        
        // For other errors, don't retry
        throw lastError;
      }
    }
    
    throw lastError!;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
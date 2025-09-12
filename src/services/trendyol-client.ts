// Trendyol API Client interface and implementation

import { TrendyolShipmentPackage, ShipmentPackageParams, ShipmentPackageResponse, InvoiceInfo } from '../models/trendyol';

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
  private baseUrl = 'https://api.trendyol.com/sapigw';

  constructor(apiKey: string, secretKey: string, supplierId: string, storeFrontCode: string = 'TR') {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
    this.supplierId = supplierId;
    this.storeFrontCode = storeFrontCode;
  }

  async getAllShipmentPackages(params?: ShipmentPackageParams): Promise<TrendyolShipmentPackage[]> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async sendInvoiceToOrder(orderId: string, invoiceData: InvoiceInfo): Promise<void> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async validateCredentials(): Promise<boolean> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
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
}
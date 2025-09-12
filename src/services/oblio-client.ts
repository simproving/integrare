// Oblio API Client interface and implementation

import { OblioInvoiceRequest, OblioInvoice, OblioCompany } from '../models/oblio';

export interface OblioClient {
  createInvoice(invoiceData: OblioInvoiceRequest): Promise<OblioInvoice>;
  validateCredentials(): Promise<boolean>;
  getInvoiceById(docId: string): Promise<OblioInvoice>;
  getCompanies(): Promise<OblioCompany[]>;
}

export class OblioApiClient implements OblioClient {
  private email: string;
  private secretKey: string;
  private baseUrl = 'https://www.oblio.eu/api';

  constructor(email: string, secretKey: string) {
    this.email = email;
    this.secretKey = secretKey;
  }

  async createInvoice(invoiceData: OblioInvoiceRequest): Promise<OblioInvoice> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async validateCredentials(): Promise<boolean> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async getInvoiceById(docId: string): Promise<OblioInvoice> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async getCompanies(): Promise<OblioCompany[]> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  private getAuthHeaders(): Record<string, string> {
    return {
      'Authorization': `${this.email} ${this.secretKey}`,
      'Content-Type': 'application/json'
    };
  }
}
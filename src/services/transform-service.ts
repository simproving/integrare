// Data transformation service interface

import { TrendyolShipmentPackage } from '../models/trendyol';
import { OblioInvoiceRequest } from '../models/oblio';
import { ValidationResult } from '../models/common';

export interface TransformService {
  trendyolOrderToOblioInvoice(order: TrendyolShipmentPackage): OblioInvoiceRequest;
  validateTransformedData(invoice: OblioInvoiceRequest): ValidationResult;
}

export class DataTransformService implements TransformService {
  constructor(private defaultCif: string, private defaultWorkStation: number) {}

  trendyolOrderToOblioInvoice(order: TrendyolShipmentPackage): OblioInvoiceRequest {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  validateTransformedData(invoice: OblioInvoiceRequest): ValidationResult {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }
}
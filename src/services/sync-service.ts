// Sync service interface for orchestrating the workflow

import { TrendyolShipmentPackage } from '../models/trendyol';
import { SyncResult } from '../models/common';

export interface SyncService {
  fetchAllShipmentPackages(): Promise<TrendyolShipmentPackage[]>;
  filterPackagesWithoutInvoices(packages: TrendyolShipmentPackage[]): TrendyolShipmentPackage[];
  processSelectedPackages(packageIds: string[]): Promise<SyncResult>;
  retryFailedInvoice(packageId: string): Promise<void>;
  checkInvoiceStatus(shipmentPackage: TrendyolShipmentPackage): boolean;
}

export class InvoiceSyncService implements SyncService {
  constructor(
    private trendyolClient: import('./trendyol-client').TrendyolClient,
    private oblioClient: import('./oblio-client').OblioClient,
    private storageService: import('./storage-service').StorageService
  ) {}

  async fetchAllShipmentPackages(): Promise<TrendyolShipmentPackage[]> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  filterPackagesWithoutInvoices(packages: TrendyolShipmentPackage[]): TrendyolShipmentPackage[] {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async processSelectedPackages(packageIds: string[]): Promise<SyncResult> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async retryFailedInvoice(packageId: string): Promise<void> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  checkInvoiceStatus(shipmentPackage: TrendyolShipmentPackage): boolean {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }
}
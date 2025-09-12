// Display orders fetched from Trendyol with selection

import { TrendyolShipmentPackage } from '../models/trendyol';

export class OrdersList {
  private container: HTMLElement;
  private packages: TrendyolShipmentPackage[] = [];
  private selectedPackageIds: Set<string> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  render(packages: TrendyolShipmentPackage[]): void {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  getSelectedPackageIds(): string[] {
    return Array.from(this.selectedPackageIds);
  }

  selectAll(): void {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  deselectAll(): void {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  private createTableRow(shipmentPackage: TrendyolShipmentPackage): HTMLTableRowElement {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  private setupEventListeners(): void {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  private onPackageSelectionChange(packageId: string, selected: boolean): void {
    if (selected) {
      this.selectedPackageIds.add(packageId);
    } else {
      this.selectedPackageIds.delete(packageId);
    }
  }
}
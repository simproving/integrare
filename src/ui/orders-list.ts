// Display orders fetched from Trendyol with selection

import { TrendyolShipmentPackage } from '../models/trendyol';

export class OrdersList {
  private container: HTMLElement;
  private packages: TrendyolShipmentPackage[] = [];
  private selectedPackageIds: Set<string> = new Set();

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * Render the list of packages in a table format with selection checkboxes
   */
  render(packages: TrendyolShipmentPackage[]): void {
    this.packages = packages;
    this.selectedPackageIds.clear();

    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) {
      console.error('Orders table body not found');
      return;
    }

    // Clear existing rows
    tableBody.innerHTML = '';

    // Add rows for each package
    packages.forEach(pkg => {
      const row = this.createTableRow(pkg);
      tableBody.appendChild(row);
    });

    // Setup event listeners for the new rows
    this.setupEventListeners();

    // Update select all checkbox state
    this.updateSelectAllCheckbox();

    // Dispatch selection changed event
    this.dispatchSelectionChanged();
  }

  /**
   * Get array of selected package IDs
   */
  getSelectedPackageIds(): string[] {
    return Array.from(this.selectedPackageIds);
  }

  /**
   * Select all packages in the current list
   */
  selectAll(): void {
    this.packages.forEach(pkg => {
      this.selectedPackageIds.add(pkg.id.toString());
    });

    // Update all checkboxes
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"][data-package-id]') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.checked = true;
    });

    // Update select all checkbox
    this.updateSelectAllCheckbox();

    // Dispatch selection changed event
    this.dispatchSelectionChanged();
  }

  /**
   * Deselect all packages
   */
  deselectAll(): void {
    this.selectedPackageIds.clear();

    // Update all checkboxes
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"][data-package-id]') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.checked = false;
    });

    // Update select all checkbox
    this.updateSelectAllCheckbox();

    // Dispatch selection changed event
    this.dispatchSelectionChanged();
  }

  /**
   * Create a table row for a shipment package
   */
  private createTableRow(shipmentPackage: TrendyolShipmentPackage): HTMLTableRowElement {
    const row = document.createElement('tr');
    row.className = 'order-row';
    row.dataset.packageId = shipmentPackage.id.toString();

    // Format dates
    const orderDate = new Date(shipmentPackage.orderDate).toLocaleDateString();
    
    // Format customer name from customerInfo
    const customerName = shipmentPackage.customerInfo 
      ? `${shipmentPackage.customerInfo.firstName} ${shipmentPackage.customerInfo.lastName}`.trim()
      : 'N/A';
    
    // Calculate total amount from lines and get currency from first line
    const totalAmount = shipmentPackage.lines?.length > 0 
      ? shipmentPackage.lines.reduce((sum, line) => sum + line.amount, 0)
      : 0;
    const currencyCode = shipmentPackage.lines?.[0]?.currencyCode || 'TRY';
    const formattedAmount = `${totalAmount.toFixed(2)} ${currencyCode}`;

    // Get customer email from customerInfo
    const customerEmail = shipmentPackage.customerInfo?.email || 'N/A';

    // Create row HTML
    row.innerHTML = `
      <td class="checkbox-cell">
        <input type="checkbox" data-package-id="${shipmentPackage.id}" class="package-checkbox">
      </td>
      <td class="order-id-cell">
        <div class="order-id">${shipmentPackage.orderId}</div>
        <div class="order-id-small">Package: ${shipmentPackage.packageNumber}</div>
      </td>
      <td class="package-number-cell">${shipmentPackage.packageNumber}</td>
      <td class="order-date-cell">${orderDate}</td>
      <td class="customer-cell">
        <div class="customer-name">${customerName}</div>
        <div class="customer-email">${customerEmail}</div>
      </td>
      <td class="amount-cell">${formattedAmount}</td>
      <td class="status-cell">
        <span class="status-badge status-${shipmentPackage.status.toLowerCase().replace(/\s+/g, '-')}">${shipmentPackage.status}</span>
      </td>
    `;

    return row;
  }

  /**
   * Setup event listeners for checkboxes and select all functionality
   */
  private setupEventListeners(): void {
    // Individual package checkboxes
    const checkboxes = this.container.querySelectorAll('input[type="checkbox"][data-package-id]') as NodeListOf<HTMLInputElement>;
    checkboxes.forEach(checkbox => {
      checkbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        const packageId = target.dataset.packageId;
        if (packageId) {
          this.onPackageSelectionChange(packageId, target.checked);
        }
      });
    });

    // Select all checkbox
    const selectAllCheckbox = document.getElementById('select-all-checkbox') as HTMLInputElement;
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (event) => {
        const target = event.target as HTMLInputElement;
        if (target.checked) {
          this.selectAll();
        } else {
          this.deselectAll();
        }
      });
    }
  }

  /**
   * Handle individual package selection change
   */
  private onPackageSelectionChange(packageId: string, selected: boolean): void {
    if (selected) {
      this.selectedPackageIds.add(packageId);
    } else {
      this.selectedPackageIds.delete(packageId);
    }

    // Update select all checkbox state
    this.updateSelectAllCheckbox();

    // Dispatch selection changed event
    this.dispatchSelectionChanged();
  }

  /**
   * Update the select all checkbox state based on current selections
   */
  private updateSelectAllCheckbox(): void {
    const selectAllCheckbox = document.getElementById('select-all-checkbox') as HTMLInputElement;
    if (!selectAllCheckbox) {
      return;
    }

    const totalPackages = this.packages.length;
    const selectedCount = this.selectedPackageIds.size;

    if (selectedCount === 0) {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = false;
    } else if (selectedCount === totalPackages) {
      selectAllCheckbox.checked = true;
      selectAllCheckbox.indeterminate = false;
    } else {
      selectAllCheckbox.checked = false;
      selectAllCheckbox.indeterminate = true;
    }
  }

  /**
   * Dispatch a custom event when selection changes
   */
  private dispatchSelectionChanged(): void {
    const event = new CustomEvent('selectionChanged', {
      detail: {
        selectedCount: this.selectedPackageIds.size,
        totalCount: this.packages.length,
        selectedIds: Array.from(this.selectedPackageIds)
      }
    });
    this.container.dispatchEvent(event);
  }
}
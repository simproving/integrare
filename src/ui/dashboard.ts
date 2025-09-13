// Main dashboard interface showing sync status and controls

import { TrendyolShipmentPackage } from '../models/trendyol';
import { SyncResult } from '../models/common';
import { OrdersList } from './orders-list';

export class Dashboard {
  private container: HTMLElement;
  private ordersTable: OrdersList;
  private syncService: import('../services/sync-service').SyncService;
  private currentPackages: TrendyolShipmentPackage[] = [];
  private filteredPackages: TrendyolShipmentPackage[] = [];
  private isLoading: boolean = false;

  constructor(container: HTMLElement, syncService: import('../services/sync-service').SyncService) {
    this.container = container;
    this.syncService = syncService;
    
    // Initialize orders table
    const ordersContainer = document.getElementById('orders-container');
    if (!ordersContainer) {
      throw new Error('Orders container not found in DOM');
    }
    this.ordersTable = new OrdersList(ordersContainer);
  }

  render(): void {
    this.setupEventListeners();
    this.updateUI();
  }

  /**
   * Fetch all shipment packages from Trendyol API with progress indication
   * Endpoint: GET /order/sellers/{sellerId}/orders
   * Reference: https://developers.trendyol.com/int/docs/international-marketplace/international-order-v2/int-getShipmentPackages
   */
  async fetchShipmentPackages(): Promise<void> {
    if (this.isLoading) {
      return; // Prevent multiple simultaneous fetch operations
    }

    try {
      this.isLoading = true;
      this.showLoading('Fetching shipment packages from Trendyol...');
      this.updateFetchButton(true);
      this.updateSyncStatusText('Fetching packages...');

      // Fetch all packages from Trendyol
      this.currentPackages = await this.syncService.fetchAllShipmentPackages();
      
      // Filter packages that don't have invoice links
      this.showLoading('Filtering packages without invoices...');
      this.filteredPackages = this.syncService.filterPackagesWithoutInvoices(this.currentPackages);

      // Update sync status display
      this.updateSyncStatus({
        syncId: `fetch-${Date.now()}`,
        totalOrders: this.currentPackages.length,
        successCount: this.filteredPackages.length,
        failureCount: 0,
        errors: []
      });

      // Render the filtered packages in the orders table
      this.ordersTable.render(this.filteredPackages);
      
      // Update UI state
      this.updateUI();
      this.updateSyncStatusText(`Found ${this.filteredPackages.length} packages needing invoices out of ${this.currentPackages.length} total packages`);

      // Show success message
      this.showMessage(`Successfully fetched ${this.currentPackages.length} packages. ${this.filteredPackages.length} packages need invoices.`, 'success');

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to fetch shipment packages:', error);
      
      this.updateSyncStatusText('Error fetching packages');
      this.showMessage(`Failed to fetch packages: ${errorMessage}`, 'error');
      
      // Reset packages on error
      this.currentPackages = [];
      this.filteredPackages = [];
      this.updateUI();
    } finally {
      this.isLoading = false;
      this.hideLoading();
      this.updateFetchButton(false);
    }
  }

  /**
   * Process selected packages by creating invoices in Oblio and sending links to Trendyol
   * Shows real-time progress for each package processing
   */
  async processSelectedPackages(): Promise<void> {
    if (this.isLoading) {
      return; // Prevent multiple simultaneous operations
    }

    const selectedIds = this.ordersTable.getSelectedPackageIds();
    if (selectedIds.length === 0) {
      this.showMessage('Please select at least one package to process.', 'warning');
      return;
    }

    try {
      this.isLoading = true;
      this.updateProcessButton(true);
      this.updateSyncStatusText(`Processing ${selectedIds.length} packages...`);

      // Show the real-time progress interface
      this.showInvoiceCreationProgress(selectedIds);

      // Process the selected packages with real-time progress updates
      const result = await this.processPackagesWithProgress(selectedIds);

      // Update sync status with final results
      this.updateSyncStatus(result);

      // Update sync status text
      if (result.failureCount === 0) {
        this.updateSyncStatusText(`Successfully processed ${result.successCount} packages`);
        this.showMessage(`Successfully created invoices for ${result.successCount} packages.`, 'success');
      } else {
        this.updateSyncStatusText(`Processed ${result.successCount} packages, ${result.failureCount} failed`);
        this.showMessage(`Processed ${result.successCount} packages successfully, ${result.failureCount} failed. Check results below.`, 'warning');
      }

      // Refresh the packages list to reflect processed packages
      if (result.successCount > 0) {
        this.filteredPackages = this.syncService.filterPackagesWithoutInvoices(this.currentPackages);
        this.ordersTable.render(this.filteredPackages);
        this.updateUI();
      }

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      console.error('Failed to process selected packages:', error);
      
      this.updateSyncStatusText('Error processing packages');
      this.showMessage(`Failed to process packages: ${errorMessage}`, 'error');
      this.hideInvoiceCreationProgress();
    } finally {
      this.isLoading = false;
      this.updateProcessButton(false);
    }
  }

  /**
   * Update sync status display with counts and progress
   */
  updateSyncStatus(result: SyncResult): void {
    const syncCounts = document.getElementById('sync-counts');
    const totalCount = document.getElementById('total-count');
    const successCount = document.getElementById('success-count');
    const failedCount = document.getElementById('failed-count');

    if (syncCounts && totalCount && successCount && failedCount) {
      // Show the counts container
      syncCounts.classList.remove('hidden');
      
      // Update count values
      totalCount.textContent = result.totalOrders.toString();
      successCount.textContent = result.successCount.toString();
      failedCount.textContent = result.failureCount.toString();

      // Add visual indicators for success/failure
      successCount.className = result.successCount > 0 ? 'count-success' : '';
      failedCount.className = result.failureCount > 0 ? 'count-error' : '';
    }
  }

  /**
   * Show loading overlay with progress message
   */
  showLoading(message: string): void {
    const loadingOverlay = document.getElementById('loading-overlay');
    const loadingMessage = document.getElementById('loading-message');

    if (loadingOverlay && loadingMessage) {
      loadingMessage.textContent = message;
      loadingOverlay.classList.remove('hidden');
    }
  }

  /**
   * Hide loading overlay
   */
  hideLoading(): void {
    const loadingOverlay = document.getElementById('loading-overlay');
    if (loadingOverlay) {
      loadingOverlay.classList.add('hidden');
    }
  }

  /**
   * Update sync status text display
   */
  private updateSyncStatusText(text: string): void {
    const syncStatusText = document.getElementById('sync-status-text');
    if (syncStatusText) {
      syncStatusText.textContent = text;
    }
  }

  /**
   * Update fetch button state and text
   */
  private updateFetchButton(isLoading: boolean): void {
    const fetchButton = document.getElementById('fetch-packages-btn') as HTMLButtonElement;
    if (fetchButton) {
      fetchButton.disabled = isLoading;
      fetchButton.textContent = isLoading ? 'Fetching...' : 'Fetch All Shipment Packages';
    }
  }

  /**
   * Update process button state and text
   */
  private updateProcessButton(isLoading: boolean): void {
    const processButton = document.getElementById('process-selected-btn') as HTMLButtonElement;
    if (processButton) {
      processButton.disabled = isLoading || this.filteredPackages.length === 0;
      processButton.textContent = isLoading ? 'Processing...' : 'Create Invoices for Selected';
    }
  }

  /**
   * Update UI state based on current data
   */
  private updateUI(): void {
    const hasPackages = this.filteredPackages.length > 0;
    const hasSelection = this.ordersTable.getSelectedPackageIds().length > 0;

    // Update button states
    const processButton = document.getElementById('process-selected-btn') as HTMLButtonElement;
    const selectAllButton = document.getElementById('select-all-btn') as HTMLButtonElement;
    const deselectAllButton = document.getElementById('deselect-all-btn') as HTMLButtonElement;

    if (processButton) {
      processButton.disabled = !hasSelection || this.isLoading;
    }

    if (selectAllButton) {
      selectAllButton.disabled = !hasPackages || this.isLoading;
    }

    if (deselectAllButton) {
      deselectAllButton.disabled = !hasPackages || this.isLoading;
    }

    // Show/hide orders table or no data message
    const ordersTableContainer = document.getElementById('orders-table-container');
    const noOrdersMessage = document.getElementById('no-orders-message');

    if (ordersTableContainer && noOrdersMessage) {
      if (hasPackages) {
        ordersTableContainer.classList.remove('hidden');
        noOrdersMessage.classList.add('hidden');
      } else {
        ordersTableContainer.classList.add('hidden');
        noOrdersMessage.classList.remove('hidden');
      }
    }
  }

  /**
   * Show real-time invoice creation progress interface
   */
  private showInvoiceCreationProgress(packageIds: string[]): void {
    const resultsSection = document.getElementById('processing-results');
    const resultsContainer = document.getElementById('results-container');

    if (!resultsSection || !resultsContainer) {
      return;
    }

    // Clear previous results
    resultsContainer.innerHTML = '';

    // Show results section
    resultsSection.classList.remove('hidden');

    // Create progress header
    const progressHeader = document.createElement('div');
    progressHeader.className = 'progress-header';
    progressHeader.innerHTML = `
      <h3>Creating Invoices</h3>
      <div class="overall-progress">
        <div class="progress-bar">
          <div id="overall-progress-fill" class="progress-fill" style="width: 0%"></div>
        </div>
        <span id="overall-progress-text">0 / ${packageIds.length} packages processed</span>
      </div>
    `;
    resultsContainer.appendChild(progressHeader);

    // Create progress list for individual packages
    const progressList = document.createElement('div');
    progressList.className = 'progress-list';
    progressList.id = 'progress-list';

    // Get package details from current filtered packages
    packageIds.forEach(packageId => {
      const pkg = this.filteredPackages.find(p => p.id.toString() === packageId);
      const orderNumber = pkg?.orderNumber || packageId;
      
      const progressItem = document.createElement('div');
      progressItem.className = 'progress-item';
      progressItem.id = `progress-item-${packageId}`;
      progressItem.innerHTML = `
        <div class="progress-item-header">
          <span class="package-info">
            <strong>Package ${packageId}</strong>
            <small>Order: ${orderNumber}</small>
          </span>
          <span id="status-${packageId}" class="progress-status status-pending">Pending</span>
        </div>
        <div class="progress-steps">
          <div id="step-validate-${packageId}" class="progress-step">
            <span class="step-icon">⏳</span>
            <span class="step-text">Validating package data</span>
          </div>
          <div id="step-transform-${packageId}" class="progress-step">
            <span class="step-icon">⏳</span>
            <span class="step-text">Transforming to Oblio format</span>
          </div>
          <div id="step-create-${packageId}" class="progress-step">
            <span class="step-icon">⏳</span>
            <span class="step-text">Creating invoice in Oblio</span>
          </div>
          <div id="step-send-${packageId}" class="progress-step">
            <span class="step-icon">⏳</span>
            <span class="step-text">Sending link to Trendyol</span>
          </div>
        </div>
        <div id="error-${packageId}" class="progress-error hidden"></div>
      `;
      progressList.appendChild(progressItem);
    });

    resultsContainer.appendChild(progressList);
  }

  /**
   * Hide the invoice creation progress interface
   */
  private hideInvoiceCreationProgress(): void {
    const resultsSection = document.getElementById('processing-results');
    if (resultsSection) {
      resultsSection.classList.add('hidden');
    }
  }

  /**
   * Update progress for a specific package and step
   */
  private updatePackageProgress(packageId: string, step: string, status: 'pending' | 'processing' | 'success' | 'error', message?: string): void {
    const stepElement = document.getElementById(`step-${step}-${packageId}`);
    const statusElement = document.getElementById(`status-${packageId}`);
    
    if (stepElement) {
      const iconElement = stepElement.querySelector('.step-icon');
      const textElement = stepElement.querySelector('.step-text');
      
      if (iconElement && textElement) {
        switch (status) {
          case 'processing':
            iconElement.textContent = '⏳';
            stepElement.className = 'progress-step processing';
            if (message) textElement.textContent = message;
            break;
          case 'success':
            iconElement.textContent = '✅';
            stepElement.className = 'progress-step success';
            break;
          case 'error':
            iconElement.textContent = '❌';
            stepElement.className = 'progress-step error';
            if (message) textElement.textContent = message;
            break;
          default:
            iconElement.textContent = '⏳';
            stepElement.className = 'progress-step';
        }
      }
    }

    // Update overall package status
    if (statusElement) {
      switch (status) {
        case 'processing':
          statusElement.className = 'progress-status status-processing';
          statusElement.textContent = 'Processing';
          break;
        case 'success':
          statusElement.className = 'progress-status status-success';
          statusElement.textContent = 'Completed';
          break;
        case 'error':
          statusElement.className = 'progress-status status-error';
          statusElement.textContent = 'Failed';
          break;
      }
    }

    // Show error message if provided
    if (status === 'error' && message) {
      const errorElement = document.getElementById(`error-${packageId}`);
      if (errorElement) {
        errorElement.textContent = message;
        errorElement.classList.remove('hidden');
      }
    }
  }

  /**
   * Update overall progress bar
   */
  private updateOverallProgress(completed: number, total: number): void {
    const progressFill = document.getElementById('overall-progress-fill');
    const progressText = document.getElementById('overall-progress-text');
    
    if (progressFill) {
      const percentage = (completed / total) * 100;
      progressFill.style.width = `${percentage}%`;
    }
    
    if (progressText) {
      progressText.textContent = `${completed} / ${total} packages processed`;
    }
  }

  /**
   * Process packages with real-time progress updates
   */
  private async processPackagesWithProgress(packageIds: string[]): Promise<SyncResult> {
    const errors: import('../models/common').SyncError[] = [];
    let successCount = 0;
    let failureCount = 0;
    let completedCount = 0;

    // Get current packages from the filtered list
    const packagesToProcess = this.filteredPackages.filter(pkg => 
      packageIds.includes(pkg.id.toString())
    );

    if (packagesToProcess.length === 0) {
      throw new Error('No matching packages found for the provided IDs');
    }

    // We'll use the sync service to process packages, which handles the transformation internally

    // Process each package individually with progress updates
    for (const pkg of packagesToProcess) {
      const packageId = pkg.id.toString();
      
      try {
        // Update status to processing
        this.updatePackageProgress(packageId, 'validate', 'processing', 'Starting package processing...');

        // Process single package using sync service
        const singlePackageResult = await this.syncService.processSelectedPackages([packageId]);
        
        if (singlePackageResult.successCount > 0) {
          // Success - update all steps to success
          this.updatePackageProgress(packageId, 'validate', 'success');
          this.updatePackageProgress(packageId, 'transform', 'success');
          this.updatePackageProgress(packageId, 'create', 'success');
          this.updatePackageProgress(packageId, 'send', 'success');
          successCount++;
        } else {
          // Failed - show error
          const error = singlePackageResult.errors[0];
          const errorMessage = error?.message || 'Unknown error occurred';
          
          ['validate', 'transform', 'create', 'send'].forEach(step => {
            this.updatePackageProgress(packageId, step, 'error', errorMessage);
          });
          
          failureCount++;
          errors.push(...singlePackageResult.errors);
        }

      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Update all steps to error
        ['validate', 'transform', 'create', 'send'].forEach(step => {
          this.updatePackageProgress(packageId, step, 'error', errorMessage);
        });
        
        failureCount++;
        errors.push({
          orderId: packageId,
          errorCode: error instanceof Error && error.name ? error.name : 'PROCESSING_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString()
        });
      }

      // Update overall progress
      completedCount++;
      this.updateOverallProgress(completedCount, packagesToProcess.length);

      // Small delay to make progress visible
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    return {
      syncId: `sync-${Date.now()}`,
      totalOrders: packagesToProcess.length,
      successCount,
      failureCount,
      errors
    };
  }

  /**
   * Show processing results in the results section (legacy method for compatibility)
   */
  private showProcessingResults(result: SyncResult): void {
    // This method is now handled by the real-time progress interface
    // Keep for compatibility but the new progress interface shows results in real-time
  }

  /**
   * Show user message (success, error, warning)
   */
  private showMessage(message: string, type: 'success' | 'error' | 'warning' | 'info' = 'info'): void {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) {
      return;
    }

    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message message-${type}`;
    messageElement.innerHTML = `
      <span class="message-text">${message}</span>
      <button class="message-close" onclick="this.parentElement.remove()">×</button>
    `;

    // Add to container
    messageContainer.appendChild(messageElement);

    // Auto-remove after 5 seconds for success/info messages
    if (type === 'success' || type === 'info') {
      setTimeout(() => {
        if (messageElement.parentElement) {
          messageElement.remove();
        }
      }, 5000);
    }
  }

  /**
   * Setup event listeners for dashboard controls
   */
  private setupEventListeners(): void {
    // Fetch packages button
    const fetchButton = document.getElementById('fetch-packages-btn');
    if (fetchButton) {
      fetchButton.addEventListener('click', () => this.fetchShipmentPackages());
    }

    // Process selected button
    const processButton = document.getElementById('process-selected-btn');
    if (processButton) {
      processButton.addEventListener('click', () => this.processSelectedPackages());
    }

    // Select all button
    const selectAllButton = document.getElementById('select-all-btn');
    if (selectAllButton) {
      selectAllButton.addEventListener('click', () => {
        this.ordersTable.selectAll();
        this.updateUI();
      });
    }

    // Deselect all button
    const deselectAllButton = document.getElementById('deselect-all-btn');
    if (deselectAllButton) {
      deselectAllButton.addEventListener('click', () => {
        this.ordersTable.deselectAll();
        this.updateUI();
      });
    }

    // Listen for selection changes from orders table
    this.container.addEventListener('selectionChanged', () => {
      this.updateUI();
    });
  }
}
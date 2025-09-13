// Sync service interface for orchestrating the workflow

import { TrendyolShipmentPackage } from '../models/trendyol';
import { SyncResult } from '../models/common';

export interface SyncService {
  fetchAllShipmentPackages(): Promise<TrendyolShipmentPackage[]>;
  filterPackagesWithoutInvoices(packages: TrendyolShipmentPackage[]): TrendyolShipmentPackage[];
  processSelectedPackages(packageIds: string[]): Promise<SyncResult>;
  retryFailedInvoice(packageId: string): Promise<void>;
  checkInvoiceStatus(shipmentPackage: TrendyolShipmentPackage): boolean;
  checkInvoiceLinkStatus(shipmentPackage: TrendyolShipmentPackage): boolean;
}

export class InvoiceSyncService implements SyncService {
  constructor(
    private trendyolClient: import('./trendyol-client').TrendyolClient,
    private oblioClient: import('./oblio-client').OblioClient,
    private storageService: import('./storage-service').StorageService
  ) {}

  /**
   * Fetch all shipment packages from Trendyol API regardless of status
   * Uses pagination to get all available packages
   */
  async fetchAllShipmentPackages(): Promise<TrendyolShipmentPackage[]> {
    try {
      this.storageService.addLogEntry({
        id: `fetch-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: 'Starting to fetch all shipment packages from Trendyol'
      });

      // Fetch all packages using the Trendyol client's pagination
      const packages = await this.trendyolClient.getAllShipmentPackages({
        orderByField: 'PackageLastModifiedDate',
        orderByDirection: 'DESC'
      });

      this.storageService.addLogEntry({
        id: `fetch-complete-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Successfully fetched ${packages.length} shipment packages from Trendyol`
      });

      // Update session storage with fetched packages
      this.storageService.updateSessionPackages(packages);

      return packages;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.storageService.addLogEntry({
        id: `fetch-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to fetch shipment packages: ${errorMessage}`,
        details: { error: errorMessage }
      });

      throw new Error(`Failed to fetch shipment packages: ${errorMessage}`);
    }
  }

  /**
   * Filter packages that don't have invoice links and exclude "Awaiting" status packages
   * Uses local storage tracking to determine which packages already have invoices
   */
  filterPackagesWithoutInvoices(packages: TrendyolShipmentPackage[]): TrendyolShipmentPackage[] {
    try {
      this.storageService.addLogEntry({
        id: `filter-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Starting to filter ${packages.length} packages for those without invoice links`
      });

      const filteredPackages = packages.filter(pkg => {
        // Filter out packages with "Awaiting" status (stock transactions only)
        if (pkg.status === 'Awaiting') {
          return false;
        }

        // Check if package already has an invoice link using local storage tracking
        return !this.checkInvoiceLinkStatus(pkg);
      });

      this.storageService.addLogEntry({
        id: `filter-complete-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Filtered to ${filteredPackages.length} packages without invoice links (excluded ${packages.length - filteredPackages.length} packages)`
      });

      return filteredPackages;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      
      this.storageService.addLogEntry({
        id: `filter-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Failed to filter packages: ${errorMessage}`,
        details: { error: errorMessage }
      });

      throw new Error(`Failed to filter packages: ${errorMessage}`);
    }
  }

  /**
   * Check if a shipment package already has an invoice link using local storage tracking
   * Returns true if the package has an invoice link, false otherwise
   */
  checkInvoiceLinkStatus(shipmentPackage: TrendyolShipmentPackage): boolean {
    try {
      // Check if we have a processed invoice record for this package
      const processedInvoice = this.storageService.getProcessedInvoice(shipmentPackage.id.toString());
      
      if (processedInvoice) {
        // If we have a record and it's completed, then it has an invoice link
        return processedInvoice.status === 'completed';
      }

      // No record found, so no invoice link exists
      return false;
    } catch (error) {
      // If there's an error checking the status, assume no invoice link exists
      // This is safer than assuming it exists and potentially missing invoices
      this.storageService.addLogEntry({
        id: `check-status-error-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'warn',
        message: `Error checking invoice status for package ${shipmentPackage.id}, assuming no invoice link exists`,
        details: { 
          packageId: shipmentPackage.id,
          error: error instanceof Error ? error.message : 'Unknown error'
        }
      });

      return false;
    }
  }

  /**
   * Check invoice status method (alias for checkInvoiceLinkStatus for interface compatibility)
   */
  checkInvoiceStatus(shipmentPackage: TrendyolShipmentPackage): boolean {
    return this.checkInvoiceLinkStatus(shipmentPackage);
  }

  /**
   * Process selected packages by creating invoices in Oblio and sending links to Trendyol
   * Orchestrates the complete workflow: transformation, Oblio creation, and Trendyol update
   */
  async processSelectedPackages(packageIds: string[]): Promise<SyncResult> {
    const syncId = `sync-${Date.now()}`;
    const errors: import('../models/common').SyncError[] = [];
    let successCount = 0;
    let failureCount = 0;

    this.storageService.addLogEntry({
      id: `process-start-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Starting to process ${packageIds.length} selected packages`,
      details: { syncId, packageIds }
    });

    // Get current session packages to find the ones we need to process
    const sessionData = this.storageService.getSessionData();
    if (!sessionData || !sessionData.currentShipmentPackages) {
      throw new Error('No shipment packages found in session. Please fetch packages first.');
    }

    // Filter packages to only those selected
    const packagesToProcess = sessionData.currentShipmentPackages.filter(pkg => 
      packageIds.includes(pkg.id.toString())
    );

    if (packagesToProcess.length === 0) {
      throw new Error('No matching packages found for the provided IDs');
    }

    // Get configuration for transformation
    const config = await this.storageService.getEncryptedConfig();
    if (!config || !config.oblio) {
      throw new Error('Oblio configuration not found. Please configure API credentials first.');
    }

    // Initialize transform service with configuration
    const transformService = new (await import('./transform-service')).TransformService({
      cif: config.oblio.cif,
      workStation: config.oblio.workStation,
      seriesName: 'FACT', // Default series name
      language: 'RO', // Default language
      defaultVatPercentage: 19, // Default Romanian VAT
      defaultMeasuringUnit: 'buc' // Default measuring unit
    });

    // Process each package individually
    for (const pkg of packagesToProcess) {
      const packageId = pkg.id.toString();
      
      try {
        this.storageService.addLogEntry({
          id: `process-package-${packageId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Processing package ${packageId} (Order: ${pkg.orderNumber})`
        });

        // Mark as pending in storage
        this.storageService.addProcessedInvoice({
          trendyolOrderId: packageId,
          status: 'pending',
          processedAt: new Date().toISOString()
        });

        // Step 1: Validate Trendyol package data
        const packageValidation = transformService.validateTrendyolPackage(pkg);
        if (!packageValidation.isValid) {
          throw new Error(`Package validation failed: ${packageValidation.errors.join(', ')}`);
        }

        // Step 2: Transform Trendyol package to Oblio invoice format
        const oblioInvoiceRequest = transformService.trendyolPackageToOblioInvoice(pkg);

        // Step 3: Validate transformed data
        const invoiceValidation = transformService.validateTransformedData(oblioInvoiceRequest);
        if (!invoiceValidation.isValid) {
          throw new Error(`Invoice validation failed: ${invoiceValidation.errors.join(', ')}`);
        }

        // Step 4: Create invoice in Oblio
        this.storageService.addLogEntry({
          id: `create-invoice-${packageId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Creating invoice in Oblio for package ${packageId}`
        });

        const oblioInvoice = await this.oblioClient.createInvoice(oblioInvoiceRequest);
        
        if (!oblioInvoice.link) {
          throw new Error('Oblio invoice created but no link returned');
        }

        this.storageService.addLogEntry({
          id: `invoice-created-${packageId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Invoice created in Oblio for package ${packageId}`,
          details: { 
            oblioInvoiceId: oblioInvoice.data.seriesName + oblioInvoice.data.number,
            invoiceLink: oblioInvoice.data.link 
          }
        });

        // Step 5: Send invoice link to Trendyol
        this.storageService.addLogEntry({
          id: `send-link-${packageId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Sending invoice link to Trendyol for package ${packageId}`
        });

        await this.trendyolClient.sendInvoiceLinkToOrder(pkg.id, oblioInvoice.data.link);

        // Step 6: Update processed invoice status to completed
        this.storageService.updateProcessedInvoice(packageId, {
          oblioInvoiceId: oblioInvoice.data.seriesName + oblioInvoice.data.number,
          status: 'completed',
          processedAt: new Date().toISOString()
        });

        successCount++;

        this.storageService.addLogEntry({
          id: `process-success-${packageId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'info',
          message: `Successfully processed package ${packageId}`,
          details: { 
            oblioInvoiceId: oblioInvoice.data.seriesName + oblioInvoice.data.number,
            invoiceLink: oblioInvoice.data.link 
          }
        });

      } catch (error) {
        failureCount++;
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        
        // Update processed invoice status to failed
        this.storageService.updateProcessedInvoice(packageId, {
          status: 'failed',
          errorMessage,
          processedAt: new Date().toISOString()
        });

        // Add to sync errors
        errors.push({
          orderId: packageId,
          errorCode: error instanceof Error && error.name ? error.name : 'PROCESSING_ERROR',
          message: errorMessage,
          timestamp: new Date().toISOString()
        });

        this.storageService.addLogEntry({
          id: `process-error-${packageId}-${Date.now()}`,
          timestamp: new Date().toISOString(),
          level: 'error',
          message: `Failed to process package ${packageId}: ${errorMessage}`,
          details: { 
            packageId,
            error: errorMessage,
            orderNumber: pkg.orderNumber
          }
        });
      }
    }

    const result: SyncResult = {
      syncId,
      totalOrders: packagesToProcess.length,
      successCount,
      failureCount,
      errors
    };

    this.storageService.addLogEntry({
      id: `process-complete-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: successCount === packagesToProcess.length ? 'info' : 'warn',
      message: `Processing complete: ${successCount} successful, ${failureCount} failed out of ${packagesToProcess.length} packages`,
      details: result
    });

    return result;
  }

  /**
   * Retry a failed invoice creation with exponential backoff
   * Implements retry logic with configurable maximum attempts and backoff strategy
   */
  async retryFailedInvoice(packageId: string): Promise<void> {
    const retryConfig: import('../models/common').RetryConfig = {
      maxRetries: this.storageService.getAutoRetryCount(),
      backoffStrategy: 'exponential',
      retryableErrors: [
        'NETWORK_ERROR',
        'RATE_LIMIT', 
        'SERVER_ERROR',
        'TIMEOUT_ERROR',
        'TEMPORARY_ERROR'
      ]
    };

    this.storageService.addLogEntry({
      id: `retry-start-${packageId}-${Date.now()}`,
      timestamp: new Date().toISOString(),
      level: 'info',
      message: `Starting retry for failed invoice ${packageId}`
    });

    // Get the processed invoice record
    const processedInvoice = this.storageService.getProcessedInvoice(packageId);
    if (!processedInvoice) {
      throw new Error(`No processed invoice record found for package ${packageId}`);
    }

    if (processedInvoice.status !== 'failed') {
      throw new Error(`Cannot retry invoice ${packageId} - current status is ${processedInvoice.status}`);
    }

    // Check if we've exceeded max retries
    const currentRetryCount = processedInvoice.retryCount || 0;
    if (currentRetryCount >= retryConfig.maxRetries) {
      throw new Error(`Maximum retry attempts (${retryConfig.maxRetries}) exceeded for package ${packageId}`);
    }

    // Check if we need to wait for backoff period
    if (processedInvoice.nextRetryAt) {
      const nextRetryTime = new Date(processedInvoice.nextRetryAt);
      const now = new Date();
      if (now < nextRetryTime) {
        const waitTime = Math.ceil((nextRetryTime.getTime() - now.getTime()) / 1000);
        throw new Error(`Must wait ${waitTime} seconds before retrying package ${packageId}`);
      }
    }

    // Check if the error is retryable
    const errorCode = this.extractErrorCode(processedInvoice.errorMessage || '');
    if (!retryConfig.retryableErrors.includes(errorCode)) {
      throw new Error(`Error for package ${packageId} is not retryable: ${errorCode}`);
    }

    // Get the original package data
    const sessionData = this.storageService.getSessionData();
    if (!sessionData || !sessionData.currentShipmentPackages) {
      throw new Error('No shipment packages found in session. Please fetch packages first.');
    }

    const packageToRetry = sessionData.currentShipmentPackages.find(pkg => 
      pkg.id.toString() === packageId
    );

    if (!packageToRetry) {
      throw new Error(`Package ${packageId} not found in current session data`);
    }

    // Update retry tracking
    const newRetryCount = currentRetryCount + 1;
    const backoffDelay = this.calculateBackoffDelay(newRetryCount);
    const nextRetryAt = new Date(Date.now() + backoffDelay * 1000).toISOString();

    this.storageService.updateProcessedInvoice(packageId, {
      status: 'pending',
      retryCount: newRetryCount,
      lastRetryAt: new Date().toISOString(),
      nextRetryAt: nextRetryAt,
      errorMessage: undefined // Clear previous error message
    });

    try {
      // Get configuration for transformation
      const config = await this.storageService.getEncryptedConfig();
      if (!config || !config.oblio) {
        throw new Error('Oblio configuration not found. Please configure API credentials first.');
      }

      // Initialize transform service with configuration
      const transformService = new (await import('./transform-service')).TransformService({
        cif: config.oblio.cif,
        workStation: config.oblio.workStation,
        seriesName: 'FACT', // Default series name
        language: 'RO', // Default language
        defaultVatPercentage: 19, // Default Romanian VAT
        defaultMeasuringUnit: 'buc' // Default measuring unit
      });

      this.storageService.addLogEntry({
        id: `retry-attempt-${packageId}-${newRetryCount}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Retry attempt ${newRetryCount}/${retryConfig.maxRetries} for package ${packageId}`
      });

      // Step 1: Validate Trendyol package data
      const packageValidation = transformService.validateTrendyolPackage(packageToRetry);
      if (!packageValidation.isValid) {
        throw new Error(`Package validation failed: ${packageValidation.errors.join(', ')}`);
      }

      // Step 2: Transform Trendyol package to Oblio invoice format
      const oblioInvoiceRequest = transformService.trendyolPackageToOblioInvoice(packageToRetry);

      // Step 3: Validate transformed data
      const invoiceValidation = transformService.validateTransformedData(oblioInvoiceRequest);
      if (!invoiceValidation.isValid) {
        throw new Error(`Invoice validation failed: ${invoiceValidation.errors.join(', ')}`);
      }

      // Step 4: Create invoice in Oblio
      this.storageService.addLogEntry({
        id: `retry-create-invoice-${packageId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Creating invoice in Oblio for package ${packageId} (retry ${newRetryCount})`
      });

      const oblioInvoice = await this.oblioClient.createInvoice(oblioInvoiceRequest);
      
      if (!oblioInvoice.data?.link) {
        throw new Error('Oblio invoice created but no link returned');
      }

      this.storageService.addLogEntry({
        id: `retry-invoice-created-${packageId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Invoice created in Oblio for package ${packageId} on retry ${newRetryCount}`,
        details: { 
          oblioInvoiceId: oblioInvoice.data.seriesName + oblioInvoice.data.number,
          invoiceLink: oblioInvoice.data.link 
        }
      });

      // Step 5: Send invoice link to Trendyol
      this.storageService.addLogEntry({
        id: `retry-send-link-${packageId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Sending invoice link to Trendyol for package ${packageId} (retry ${newRetryCount})`
      });

      await this.trendyolClient.sendInvoiceLinkToOrder(packageToRetry.id, oblioInvoice.data.link);

      // Step 6: Update processed invoice status to completed
      this.storageService.updateProcessedInvoice(packageId, {
        oblioInvoiceId: oblioInvoice.data.seriesName + oblioInvoice.data.number,
        status: 'completed',
        processedAt: new Date().toISOString(),
        nextRetryAt: undefined // Clear retry scheduling
      });

      this.storageService.addLogEntry({
        id: `retry-success-${packageId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'info',
        message: `Successfully processed package ${packageId} on retry attempt ${newRetryCount}`,
        details: { 
          oblioInvoiceId: oblioInvoice.data.seriesName + oblioInvoice.data.number,
          invoiceLink: oblioInvoice.data.link,
          retryCount: newRetryCount
        }
      });

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      const errorCode = this.extractErrorCode(errorMessage);
      
      // Update processed invoice with failure information
      this.storageService.updateProcessedInvoice(packageId, {
        status: 'failed',
        errorMessage,
        processedAt: new Date().toISOString()
      });

      this.storageService.addLogEntry({
        id: `retry-failed-${packageId}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        level: 'error',
        message: `Retry attempt ${newRetryCount} failed for package ${packageId}: ${errorMessage}`,
        details: { 
          packageId,
          error: errorMessage,
          errorCode,
          retryCount: newRetryCount,
          maxRetries: retryConfig.maxRetries,
          isRetryable: retryConfig.retryableErrors.includes(errorCode)
        }
      });

      // Re-throw the error to let the caller handle it
      throw error;
    }
  }

  /**
   * Calculate exponential backoff delay in seconds
   * Formula: min(baseDelay * (2 ^ (attempt - 1)), maxDelay)
   */
  private calculateBackoffDelay(attempt: number): number {
    const baseDelay = 2; // 2 seconds base delay
    const maxDelay = 300; // 5 minutes maximum delay
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    return delay;
  }

  /**
   * Extract error code from error message for retry logic
   * Maps common error patterns to retryable error codes
   */
  private extractErrorCode(errorMessage: string): string {
    const message = errorMessage.toLowerCase();
    
    // Network-related errors
    if (message.includes('network') || message.includes('connection') || message.includes('fetch')) {
      return 'NETWORK_ERROR';
    }
    
    // Rate limiting errors
    if (message.includes('rate limit') || message.includes('too many requests') || message.includes('429')) {
      return 'RATE_LIMIT';
    }
    
    // Server errors
    if (message.includes('server error') || message.includes('500') || message.includes('502') || message.includes('503')) {
      return 'SERVER_ERROR';
    }
    
    // Timeout errors
    if (message.includes('timeout') || message.includes('timed out')) {
      return 'TIMEOUT_ERROR';
    }
    
    // Temporary errors
    if (message.includes('temporary') || message.includes('unavailable')) {
      return 'TEMPORARY_ERROR';
    }
    
    // Non-retryable errors (validation, authentication, etc.)
    return 'NON_RETRYABLE_ERROR';
  }
}
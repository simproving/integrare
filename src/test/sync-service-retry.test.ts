// Unit tests for sync service retry functionality

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { InvoiceSyncService } from '../services/sync-service';
import { TrendyolShipmentPackage } from '../models/trendyol';
import { ProcessedInvoice, RetryConfig } from '../models/common';

// Mock implementations
const mockTrendyolClient = {
  getAllShipmentPackages: vi.fn(),
  sendInvoiceLinkToOrder: vi.fn(),
  validateCredentials: vi.fn()
};

const mockOblioClient = {
  createInvoice: vi.fn(),
  validateCredentials: vi.fn(),
  getInvoiceById: vi.fn(),
  getCompanies: vi.fn()
};

const mockStorageService = {
  addLogEntry: vi.fn(),
  updateSessionPackages: vi.fn(),
  getSessionData: vi.fn(),
  getEncryptedConfig: vi.fn(),
  addProcessedInvoice: vi.fn(),
  updateProcessedInvoice: vi.fn(),
  getProcessedInvoice: vi.fn(),
  getAutoRetryCount: vi.fn()
};

// Mock transform service
const mockTransformService = {
  validateTrendyolPackage: vi.fn(),
  trendyolPackageToOblioInvoice: vi.fn(),
  validateTransformedData: vi.fn()
};

// Mock the transform service module
vi.mock('../services/transform-service', () => ({
  TransformService: vi.fn().mockImplementation(() => mockTransformService)
}));

describe('InvoiceSyncService - Retry Functionality', () => {
  let syncService: InvoiceSyncService;
  let mockPackage: TrendyolShipmentPackage;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Create sync service instance
    syncService = new InvoiceSyncService(
      mockTrendyolClient as any,
      mockOblioClient as any,
      mockStorageService as any
    );

    // Mock package data
    mockPackage = {
      id: 12345,
      orderNumber: 'TY-ORDER-001',
      orderDate: Date.now(),
      originShipmentDate: Date.now(),
      lastModifiedDate: Date.now(),
      shipmentPackageStatus: 'Created',
      status: 'Created',
      deliveryType: 'Standard',
      agreedDeliveryDate: Date.now(),
      estimatedDeliveryStartDate: Date.now(),
      estimatedDeliveryEndDate: Date.now(),
      grossAmount: 100,
      totalPrice: 100,
      totalDiscount: 0,
      totalTyDiscount: 0,
      taxNumber: null,
      currencyCode: 'TRY',
      invoiceAddress: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        company: '',
        address1: 'Test Address',
        address2: '',
        city: 'Istanbul',
        cityCode: 34,
        district: 'Kadikoy',
        districtId: 1,
        postalCode: '34000',
        countryCode: 'TR',
        neighborhoodId: 1,
        neighborhood: 'Test',
        phone: 5551234567,
        fullAddress: 'Test Address, Kadikoy, Istanbul',
        fullName: 'John Doe'
      },
      shipmentAddress: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        company: '',
        address1: 'Test Address',
        address2: '',
        city: 'Istanbul',
        cityCode: 34,
        district: 'Kadikoy',
        districtId: 1,
        postalCode: '34000',
        countryCode: 'TR',
        neighborhoodId: 1,
        neighborhood: 'Test',
        phone: 5551234567,
        fullAddress: 'Test Address, Kadikoy, Istanbul',
        fullName: 'John Doe'
      },
      customerFirstName: 'John',
      customerLastName: 'Doe',
      customerEmail: 'john.doe@example.com',
      customerId: 1,
      identityNumber: '12345678901',
      packageHistories: [],
      cargoTrackingNumber: 123456789,
      cargoTrackingLink: 'https://example.com/track/123456789',
      cargoSenderNumber: 'SENDER123',
      cargoProviderName: 'Test Cargo',
      lines: [{
        id: 1,
        quantity: 1,
        salesCampaignId: 0,
        productSize: 'M',
        merchantSku: 'TEST-SKU-001',
        productName: 'Test Product',
        productCode: 12345,
        productOrigin: 'TR',
        merchantId: 1,
        amount: 100,
        price: 100,
        discount: 0,
        tyDiscount: 0,
        discountDetails: [],
        currencyCode: 'TRY',
        productColor: 'Blue',
        sku: 'TEST-SKU-001',
        barcode: 'TEST-BARCODE-001',
        vatBaseAmount: 19,
        orderLineItemStatusName: 'Created',
        productCategoryId: 1,
        commission: 10
      }],
      warehouseId: 1,
      createdBy: 'order-creation'
    };

    // Default mock implementations
    mockStorageService.getAutoRetryCount.mockReturnValue(3);
    mockStorageService.getEncryptedConfig.mockResolvedValue({
      oblio: {
        cif: 'RO12345678',
        workStation: 1
      }
    });
    mockStorageService.getSessionData.mockReturnValue({
      currentShipmentPackages: [mockPackage],
      processedInvoices: [],
      syncLogs: [],
      lastFetchTime: new Date().toISOString(),
      selectedPackageIds: []
    });

    // Mock transform service methods
    mockTransformService.validateTrendyolPackage.mockReturnValue({
      isValid: true,
      errors: []
    });
    mockTransformService.validateTransformedData.mockReturnValue({
      isValid: true,
      errors: []
    });
    mockTransformService.trendyolPackageToOblioInvoice.mockReturnValue({
      cif: 'RO12345678',
      client: { name: 'Test Client', cif: 'RO12345678' },
      issueDate: '2024-01-01',
      dueDate: '2024-01-31',
      currency: 'RON',
      language: 'RO',
      workStation: 1,
      seriesName: 'FACT',
      useStock: 0,
      products: []
    });

    // Mock successful Oblio response
    mockOblioClient.createInvoice.mockResolvedValue({
      status: 200,
      statusMessage: 'Success',
      data: {
        seriesName: 'FACT',
        number: '001',
        link: 'https://oblio.eu/invoice/test-link'
      }
    });

    // Mock successful Trendyol response
    mockTrendyolClient.sendInvoiceLinkToOrder.mockResolvedValue(undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('retryFailedInvoice', () => {
    it('should throw error if no processed invoice record exists', async () => {
      mockStorageService.getProcessedInvoice.mockReturnValue(null);

      await expect(syncService.retryFailedInvoice('12345')).rejects.toThrow(
        'No processed invoice record found for package 12345'
      );
    });

    it('should throw error if invoice status is not failed', async () => {
      const processedInvoice: ProcessedInvoice = {
        trendyolOrderId: '12345',
        status: 'completed',
        processedAt: new Date().toISOString()
      };
      mockStorageService.getProcessedInvoice.mockReturnValue(processedInvoice);

      await expect(syncService.retryFailedInvoice('12345')).rejects.toThrow(
        'Cannot retry invoice 12345 - current status is completed'
      );
    });

    it('should throw error if maximum retry attempts exceeded', async () => {
      const processedInvoice: ProcessedInvoice = {
        trendyolOrderId: '12345',
        status: 'failed',
        processedAt: new Date().toISOString(),
        retryCount: 3,
        errorMessage: 'Network error'
      };
      mockStorageService.getProcessedInvoice.mockReturnValue(processedInvoice);

      await expect(syncService.retryFailedInvoice('12345')).rejects.toThrow(
        'Maximum retry attempts (3) exceeded for package 12345'
      );
    });

    it('should throw error if backoff period has not elapsed', async () => {
      const futureTime = new Date(Date.now() + 60000).toISOString(); // 1 minute in future
      const processedInvoice: ProcessedInvoice = {
        trendyolOrderId: '12345',
        status: 'failed',
        processedAt: new Date().toISOString(),
        retryCount: 1,
        nextRetryAt: futureTime,
        errorMessage: 'Network error'
      };
      mockStorageService.getProcessedInvoice.mockReturnValue(processedInvoice);

      await expect(syncService.retryFailedInvoice('12345')).rejects.toThrow(
        /Must wait \d+ seconds before retrying package 12345/
      );
    });

    it('should throw error if error is not retryable', async () => {
      const processedInvoice: ProcessedInvoice = {
        trendyolOrderId: '12345',
        status: 'failed',
        processedAt: new Date().toISOString(),
        retryCount: 1,
        errorMessage: 'Invalid credentials'
      };
      mockStorageService.getProcessedInvoice.mockReturnValue(processedInvoice);

      await expect(syncService.retryFailedInvoice('12345')).rejects.toThrow(
        'Error for package 12345 is not retryable: NON_RETRYABLE_ERROR'
      );
    });

    it('should successfully retry a failed invoice with network error', async () => {
      const processedInvoice: ProcessedInvoice = {
        trendyolOrderId: '12345',
        status: 'failed',
        processedAt: new Date().toISOString(),
        retryCount: 1,
        errorMessage: 'Network connection failed'
      };
      mockStorageService.getProcessedInvoice.mockReturnValue(processedInvoice);

      await syncService.retryFailedInvoice('12345');

      // Verify that the invoice was updated to pending during retry
      expect(mockStorageService.updateProcessedInvoice).toHaveBeenCalledWith('12345', {
        status: 'pending',
        retryCount: 2,
        lastRetryAt: expect.any(String),
        nextRetryAt: expect.any(String),
        errorMessage: undefined
      });

      // Verify that Oblio invoice was created
      expect(mockOblioClient.createInvoice).toHaveBeenCalled();

      // Verify that invoice link was sent to Trendyol
      expect(mockTrendyolClient.sendInvoiceLinkToOrder).toHaveBeenCalledWith(
        12345,
        'https://oblio.eu/invoice/test-link'
      );

      // Verify that the invoice was marked as completed
      expect(mockStorageService.updateProcessedInvoice).toHaveBeenCalledWith('12345', {
        oblioInvoiceId: 'FACT001',
        status: 'completed',
        processedAt: expect.any(String),
        nextRetryAt: undefined
      });
    });



    it('should throw error if package not found in session data', async () => {
      const processedInvoice: ProcessedInvoice = {
        trendyolOrderId: '99999',
        status: 'failed',
        processedAt: new Date().toISOString(),
        retryCount: 1,
        errorMessage: 'Network error'
      };
      mockStorageService.getProcessedInvoice.mockReturnValue(processedInvoice);

      await expect(syncService.retryFailedInvoice('99999')).rejects.toThrow(
        'Package 99999 not found in current session data'
      );
    });

    it('should throw error if no session data exists', async () => {
      const processedInvoice: ProcessedInvoice = {
        trendyolOrderId: '12345',
        status: 'failed',
        processedAt: new Date().toISOString(),
        retryCount: 1,
        errorMessage: 'Network error'
      };
      mockStorageService.getProcessedInvoice.mockReturnValue(processedInvoice);
      mockStorageService.getSessionData.mockReturnValue(null);

      await expect(syncService.retryFailedInvoice('12345')).rejects.toThrow(
        'No shipment packages found in session. Please fetch packages first.'
      );
    });
  });

  describe('calculateBackoffDelay', () => {
    it('should calculate exponential backoff correctly', () => {
      // Access private method through type assertion
      const service = syncService as any;
      
      expect(service.calculateBackoffDelay(1)).toBe(2); // 2 * 2^0 = 2
      expect(service.calculateBackoffDelay(2)).toBe(4); // 2 * 2^1 = 4
      expect(service.calculateBackoffDelay(3)).toBe(8); // 2 * 2^2 = 8
      expect(service.calculateBackoffDelay(4)).toBe(16); // 2 * 2^3 = 16
      expect(service.calculateBackoffDelay(10)).toBe(300); // Should cap at 300 seconds
    });
  });

  describe('extractErrorCode', () => {
    it('should correctly identify network errors', () => {
      const service = syncService as any;
      
      expect(service.extractErrorCode('Network connection failed')).toBe('NETWORK_ERROR');
      expect(service.extractErrorCode('Fetch request timeout')).toBe('NETWORK_ERROR');
      expect(service.extractErrorCode('Connection refused')).toBe('NETWORK_ERROR');
    });

    it('should correctly identify rate limit errors', () => {
      const service = syncService as any;
      
      expect(service.extractErrorCode('Rate limit exceeded')).toBe('RATE_LIMIT');
      expect(service.extractErrorCode('Too many requests')).toBe('RATE_LIMIT');
      expect(service.extractErrorCode('HTTP 429 error')).toBe('RATE_LIMIT');
    });

    it('should correctly identify server errors', () => {
      const service = syncService as any;
      
      expect(service.extractErrorCode('Server error 500')).toBe('SERVER_ERROR');
      expect(service.extractErrorCode('HTTP 502 Bad Gateway')).toBe('SERVER_ERROR');
      expect(service.extractErrorCode('Service unavailable 503')).toBe('SERVER_ERROR');
    });

    it('should correctly identify timeout errors', () => {
      const service = syncService as any;
      
      expect(service.extractErrorCode('Request timeout')).toBe('TIMEOUT_ERROR');
      expect(service.extractErrorCode('Operation timed out')).toBe('TIMEOUT_ERROR');
    });

    it('should correctly identify temporary errors', () => {
      const service = syncService as any;
      
      expect(service.extractErrorCode('Temporary service unavailable')).toBe('TEMPORARY_ERROR');
      expect(service.extractErrorCode('Service temporarily unavailable')).toBe('TEMPORARY_ERROR');
    });

    it('should return non-retryable for unknown errors', () => {
      const service = syncService as any;
      
      expect(service.extractErrorCode('Invalid credentials')).toBe('NON_RETRYABLE_ERROR');
      expect(service.extractErrorCode('Validation failed')).toBe('NON_RETRYABLE_ERROR');
      expect(service.extractErrorCode('Unknown error')).toBe('NON_RETRYABLE_ERROR');
    });
  });

  describe('retry configuration', () => {
    it('should use auto retry count from storage service', async () => {
      mockStorageService.getAutoRetryCount.mockReturnValue(5);
      
      const processedInvoice: ProcessedInvoice = {
        trendyolOrderId: '12345',
        status: 'failed',
        processedAt: new Date().toISOString(),
        retryCount: 5,
        errorMessage: 'Network error'
      };
      mockStorageService.getProcessedInvoice.mockReturnValue(processedInvoice);

      await expect(syncService.retryFailedInvoice('12345')).rejects.toThrow(
        'Maximum retry attempts (5) exceeded for package 12345'
      );
    });

    it('should handle retryable error types correctly', async () => {
      const retryableErrors = [
        'Network connection failed',
        'Rate limit exceeded', 
        'Server error 500',
        'Request timeout',
        'Temporary service unavailable'
      ];

      for (const errorMessage of retryableErrors) {
        const processedInvoice: ProcessedInvoice = {
          trendyolOrderId: '12345',
          status: 'failed',
          processedAt: new Date().toISOString(),
          retryCount: 1,
          errorMessage
        };
        mockStorageService.getProcessedInvoice.mockReturnValue(processedInvoice);

        // Should not throw "not retryable" error
        try {
          await syncService.retryFailedInvoice('12345');
        } catch (error) {
          expect((error as Error).message).not.toContain('not retryable');
        }
      }
    });
  });
});
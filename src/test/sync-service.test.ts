// Tests for sync service package fetching and filtering functionality

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { InvoiceSyncService } from '../services/sync-service';
import { TrendyolShipmentPackage } from '../models/trendyol';
import { ProcessedInvoice } from '../models/common';

// Mock the dependencies
const mockTrendyolClient = {
  getAllShipmentPackages: vi.fn(),
  sendInvoiceToOrder: vi.fn(),
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
  getProcessedInvoice: vi.fn(),
  encryptAndStore: vi.fn(),
  decryptAndRetrieve: vi.fn(),
  clearSensitiveData: vi.fn(),
  exportConfig: vi.fn(),
  importConfig: vi.fn(),
  saveEncryptedConfig: vi.fn(),
  getEncryptedConfig: vi.fn(),
  saveAppSettings: vi.fn(),
  getAppSettings: vi.fn(),
  saveSessionData: vi.fn(),
  getSessionData: vi.fn(),
  clearSessionData: vi.fn(),
  addProcessedInvoice: vi.fn(),
  updateProcessedInvoice: vi.fn(),
  clearLogEntries: vi.fn(),
  updateSelectedPackages: vi.fn(),
  getSelectedPackages: vi.fn(),
  updateUIPreferences: vi.fn(),
  getUIPreferences: vi.fn(),
  updateTheme: vi.fn(),
  getTheme: vi.fn(),
  updateAutoRetryCount: vi.fn(),
  getAutoRetryCount: vi.fn(),
  exportFullConfiguration: vi.fn(),
  importFullConfiguration: vi.fn(),
  validateConfigurationFormat: vi.fn(),
  getLogEntries: vi.fn()
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

describe('InvoiceSyncService - Package Fetching and Filtering', () => {
  let syncService: InvoiceSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    syncService = new InvoiceSyncService(
      mockTrendyolClient as any,
      mockOblioClient as any,
      mockStorageService as any
    );

    // Set up default transform service mocks
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
  });

  describe('fetchAllShipmentPackages', () => {
    it('should fetch all packages and update session storage', async () => {
      const mockPackages: TrendyolShipmentPackage[] = [
        {
          id: 1,
          packageNumber: 'PKG001',
          orderId: 'ORD001',
          orderDate: '2024-01-01',
          status: 'Created',
          deliveryType: 'Standard',
          agreedDeliveryDate: '2024-01-05',
          estimatedDeliveryStartDate: '2024-01-04',
          estimatedDeliveryEndDate: '2024-01-06',
          totalDiscount: 0,
          totalTyDiscount: 0,
          taxNumber: '12345',
          invoiceAddress: {} as any,
          deliveryAddress: {} as any,
          orderLines: [],
          packageHistories: [],
          shipmentAddress: {} as any,
          customerInfo: {} as any,
          cargoTrackingNumber: 'TRACK001',
          cargoTrackingLink: 'http://track.com/TRACK001',
          cargoSenderNumber: 'SENDER001',
          cargoProviderName: 'Cargo Co',
          lines: []
        }
      ];

      mockTrendyolClient.getAllShipmentPackages.mockResolvedValue(mockPackages);

      const result = await syncService.fetchAllShipmentPackages();

      expect(result).toEqual(mockPackages);
      expect(mockTrendyolClient.getAllShipmentPackages).toHaveBeenCalledWith({
        orderByField: 'PackageLastModifiedDate',
        orderByDirection: 'DESC'
      });
      expect(mockStorageService.updateSessionPackages).toHaveBeenCalledWith(mockPackages);
      expect(mockStorageService.addLogEntry).toHaveBeenCalledTimes(2); // Start and complete logs
    });

    it('should handle errors and log them', async () => {
      const error = new Error('API Error');
      mockTrendyolClient.getAllShipmentPackages.mockRejectedValue(error);

      await expect(syncService.fetchAllShipmentPackages()).rejects.toThrow('Failed to fetch shipment packages: API Error');
      
      expect(mockStorageService.addLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'error',
          message: 'Failed to fetch shipment packages: API Error'
        })
      );
    });
  });

  describe('filterPackagesWithoutInvoices', () => {
    const createMockPackage = (id: number, status: string): TrendyolShipmentPackage => ({
      id,
      packageNumber: `PKG${id.toString().padStart(3, '0')}`,
      orderId: `ORD${id.toString().padStart(3, '0')}`,
      orderDate: '2024-01-01',
      status,
      deliveryType: 'Standard',
      agreedDeliveryDate: '2024-01-05',
      estimatedDeliveryStartDate: '2024-01-04',
      estimatedDeliveryEndDate: '2024-01-06',
      totalDiscount: 0,
      totalTyDiscount: 0,
      taxNumber: '12345',
      invoiceAddress: {} as any,
      deliveryAddress: {} as any,
      orderLines: [],
      packageHistories: [],
      shipmentAddress: {} as any,
      customerInfo: {} as any,
      cargoTrackingNumber: `TRACK${id.toString().padStart(3, '0')}`,
      cargoTrackingLink: `http://track.com/TRACK${id.toString().padStart(3, '0')}`,
      cargoSenderNumber: `SENDER${id.toString().padStart(3, '0')}`,
      cargoProviderName: 'Cargo Co',
      lines: []
    });

    it('should filter out packages with "Awaiting" status', () => {
      const packages = [
        createMockPackage(1, 'Created'),
        createMockPackage(2, 'Awaiting'),
        createMockPackage(3, 'Shipped')
      ];

      mockStorageService.getProcessedInvoice.mockReturnValue(null);

      const result = syncService.filterPackagesWithoutInvoices(packages);

      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toEqual([1, 3]);
      expect(mockStorageService.addLogEntry).toHaveBeenCalledTimes(2); // Start and complete logs
    });

    it('should filter out packages that already have invoice links', () => {
      const packages = [
        createMockPackage(1, 'Created'),
        createMockPackage(2, 'Shipped'),
        createMockPackage(3, 'Delivered')
      ];

      // Mock that package 2 already has a completed invoice
      mockStorageService.getProcessedInvoice.mockImplementation((orderId: string) => {
        if (orderId === '2') {
          return {
            trendyolOrderId: '2',
            status: 'completed',
            processedAt: '2024-01-01T00:00:00Z'
          } as ProcessedInvoice;
        }
        return null;
      });

      const result = syncService.filterPackagesWithoutInvoices(packages);

      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toEqual([1, 3]);
    });

    it('should include packages with failed invoice status', () => {
      const packages = [
        createMockPackage(1, 'Created'),
        createMockPackage(2, 'Shipped')
      ];

      // Mock that package 2 has a failed invoice (should be included for retry)
      mockStorageService.getProcessedInvoice.mockImplementation((orderId: string) => {
        if (orderId === '2') {
          return {
            trendyolOrderId: '2',
            status: 'failed',
            processedAt: '2024-01-01T00:00:00Z',
            errorMessage: 'Previous attempt failed'
          } as ProcessedInvoice;
        }
        return null;
      });

      const result = syncService.filterPackagesWithoutInvoices(packages);

      expect(result).toHaveLength(2);
      expect(result.map(p => p.id)).toEqual([1, 2]);
    });
  });

  describe('checkInvoiceLinkStatus', () => {
    const mockPackage = {
      id: 123,
      status: 'Created'
    } as TrendyolShipmentPackage;

    it('should return true for packages with completed invoice status', () => {
      mockStorageService.getProcessedInvoice.mockReturnValue({
        trendyolOrderId: '123',
        status: 'completed',
        processedAt: '2024-01-01T00:00:00Z'
      } as ProcessedInvoice);

      const result = syncService.checkInvoiceLinkStatus(mockPackage);

      expect(result).toBe(true);
      expect(mockStorageService.getProcessedInvoice).toHaveBeenCalledWith('123');
    });

    it('should return false for packages with failed invoice status', () => {
      mockStorageService.getProcessedInvoice.mockReturnValue({
        trendyolOrderId: '123',
        status: 'failed',
        processedAt: '2024-01-01T00:00:00Z'
      } as ProcessedInvoice);

      const result = syncService.checkInvoiceLinkStatus(mockPackage);

      expect(result).toBe(false);
    });

    it('should return false for packages with no processed invoice record', () => {
      mockStorageService.getProcessedInvoice.mockReturnValue(null);

      const result = syncService.checkInvoiceLinkStatus(mockPackage);

      expect(result).toBe(false);
    });

    it('should handle errors gracefully and return false', () => {
      mockStorageService.getProcessedInvoice.mockImplementation(() => {
        throw new Error('Storage error');
      });

      const result = syncService.checkInvoiceLinkStatus(mockPackage);

      expect(result).toBe(false);
      expect(mockStorageService.addLogEntry).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'warn',
          message: expect.stringContaining('Error checking invoice status')
        })
      );
    });
  });

  describe('checkInvoiceStatus', () => {
    it('should be an alias for checkInvoiceLinkStatus', () => {
      const mockPackage = {
        id: 123,
        status: 'Created'
      } as TrendyolShipmentPackage;

      mockStorageService.getProcessedInvoice.mockReturnValue({
        trendyolOrderId: '123',
        status: 'completed',
        processedAt: '2024-01-01T00:00:00Z'
      } as ProcessedInvoice);

      const result1 = syncService.checkInvoiceStatus(mockPackage);
      const result2 = syncService.checkInvoiceLinkStatus(mockPackage);

      expect(result1).toBe(result2);
      expect(result1).toBe(true);
    });
  });
});
describe(
'InvoiceSyncService - Invoice Processing Workflow', () => {
  let syncService: InvoiceSyncService;

  beforeEach(() => {
    vi.clearAllMocks();
    syncService = new InvoiceSyncService(
      mockTrendyolClient as any,
      mockOblioClient as any,
      mockStorageService as any
    );
  });

  const createMockPackageForProcessing = (id: number): TrendyolShipmentPackage => ({
    id,
    packageNumber: `PKG${id.toString().padStart(3, '0')}`,
    orderId: `ORD${id.toString().padStart(3, '0')}`,
    orderNumber: `ORDER${id.toString().padStart(3, '0')}`,
    orderDate: Date.now(),
    status: 'Created',
    deliveryType: 'Standard',
    agreedDeliveryDate: Date.now() + 86400000,
    estimatedDeliveryStartDate: Date.now() + 86400000,
    estimatedDeliveryEndDate: Date.now() + 172800000,
    grossAmount: 100,
    totalPrice: 100,
    totalDiscount: 0,
    totalTyDiscount: 0,
    taxNumber: '12345678',
    currencyCode: 'RON',
    invoiceAddress: {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      company: 'Test Company',
      address1: 'Test Address 1',
      address2: 'Test Address 2',
      city: 'Bucharest',
      cityCode: 1,
      district: 'Sector 1',
      districtId: 1,
      postalCode: '123456',
      countryCode: 'RO',
      neighborhoodId: 1,
      neighborhood: 'Test Neighborhood',
      phone: 1234567890,
      fullAddress: 'Test Address 1, Test Address 2, Test Neighborhood, Sector 1, Bucharest',
      fullName: 'John Doe'
    },
    shipmentAddress: {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      company: 'Test Company',
      address1: 'Test Address 1',
      address2: 'Test Address 2',
      city: 'Bucharest',
      cityCode: 1,
      district: 'Sector 1',
      districtId: 1,
      postalCode: '123456',
      countryCode: 'RO',
      neighborhoodId: 1,
      neighborhood: 'Test Neighborhood',
      phone: 1234567890,
      fullAddress: 'Test Address 1, Test Address 2, Test Neighborhood, Sector 1, Bucharest',
      fullName: 'John Doe'
    },
    customerFirstName: 'John',
    customerLastName: 'Doe',
    customerEmail: 'john.doe@example.com',
    customerId: 1,
    identityNumber: '1234567890123',
    packageHistories: [],
    cargoTrackingNumber: 123456789,
    cargoTrackingLink: 'http://track.com/123456789',
    cargoSenderNumber: 'SENDER001',
    cargoProviderName: 'Cargo Co',
    lines: [
      {
        id: 1,
        quantity: 2,
        salesCampaignId: 1,
        productSize: 'M',
        merchantSku: 'SKU001',
        productName: 'Test Product',
        productCode: 1001,
        productOrigin: 'Turkey',
        merchantId: 1,
        amount: 100,
        price: 50,
        discount: 0,
        tyDiscount: 0,
        discountDetails: [],
        currencyCode: 'RON',
        productColor: 'Blue',
        sku: 'SKU001',
        barcode: 'BAR001',
        vatBaseAmount: 84.03,
        orderLineItemStatusName: 'Created',
        productCategoryId: 1,
        commission: 5
      }
    ],
    warehouseId: 1,
    createdBy: 'order-creation',
    lastModifiedDate: Date.now(),
    originShipmentDate: Date.now()
  });

  describe('processSelectedPackages', () => {
    it('should successfully process selected packages', async () => {
      const packageIds = ['1', '2'];
      const mockPackages = [
        createMockPackageForProcessing(1),
        createMockPackageForProcessing(2)
      ];

      // Mock session data with packages
      mockStorageService.getSessionData.mockReturnValue({
        currentShipmentPackages: mockPackages,
        processedInvoices: [],
        syncLogs: [],
        lastFetchTime: new Date().toISOString(),
        selectedPackageIds: packageIds
      });

      // Mock encrypted config
      mockStorageService.getEncryptedConfig.mockResolvedValue({
        oblio: {
          email: 'test@example.com',
          secretKey: 'secret123',
          cif: '12345678',
          workStation: 1
        },
        trendyol: {
          apiKey: 'api123',
          secretKey: 'secret123',
          supplierId: 'supplier123',
          storeFrontCode: 'TR'
        }
      });

      // Mock Oblio invoice creation
      const mockOblioInvoice = {
        status: 200,
        statusMessage: 'Success',
        data: {
          seriesName: 'FACT',
          number: '001',
          link: 'https://oblio.eu/invoice/123'
        }
      };
      mockOblioClient.createInvoice.mockResolvedValue(mockOblioInvoice);

      // Mock Trendyol invoice link sending
      mockTrendyolClient.sendInvoiceLinkToOrder.mockResolvedValue(undefined);

      const result = await syncService.processSelectedPackages(packageIds);

      expect(result.syncId).toBeDefined();
      expect(result.totalOrders).toBe(2);
      expect(result.successCount).toBe(2);
      expect(result.failureCount).toBe(0);
      expect(result.errors).toHaveLength(0);

      // Verify Oblio invoice creation was called for each package
      expect(mockOblioClient.createInvoice).toHaveBeenCalledTimes(2);

      // Verify Trendyol invoice link sending was called for each package
      expect(mockTrendyolClient.sendInvoiceLinkToOrder).toHaveBeenCalledTimes(2);
      expect(mockTrendyolClient.sendInvoiceLinkToOrder).toHaveBeenCalledWith(1, mockOblioInvoice.data.link);
      expect(mockTrendyolClient.sendInvoiceLinkToOrder).toHaveBeenCalledWith(2, mockOblioInvoice.data.link);

      // Verify processed invoices were tracked
      expect(mockStorageService.addProcessedInvoice).toHaveBeenCalledTimes(2); // 2 for pending
      expect(mockStorageService.updateProcessedInvoice).toHaveBeenCalledTimes(2); // 2 for completed
    });

    it('should handle errors during invoice creation', async () => {
      const packageIds = ['1'];
      const mockPackages = [createMockPackageForProcessing(1)];

      mockStorageService.getSessionData.mockReturnValue({
        currentShipmentPackages: mockPackages,
        processedInvoices: [],
        syncLogs: [],
        lastFetchTime: new Date().toISOString(),
        selectedPackageIds: packageIds
      });

      mockStorageService.getEncryptedConfig.mockResolvedValue({
        oblio: {
          email: 'test@example.com',
          secretKey: 'secret123',
          cif: '12345678',
          workStation: 1
        },
        trendyol: {
          apiKey: 'api123',
          secretKey: 'secret123',
          supplierId: 'supplier123',
          storeFrontCode: 'TR'
        }
      });

      // Mock Oblio invoice creation failure
      mockOblioClient.createInvoice.mockRejectedValue(new Error('Oblio API Error'));

      const result = await syncService.processSelectedPackages(packageIds);

      expect(result.totalOrders).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Oblio API Error');

      // Verify processed invoice was marked as failed
      expect(mockStorageService.updateProcessedInvoice).toHaveBeenCalledWith('1', {
        status: 'failed',
        errorMessage: 'Oblio API Error',
        processedAt: expect.any(String)
      });
    });

    it('should handle errors during Trendyol invoice link sending', async () => {
      const packageIds = ['1'];
      const mockPackages = [createMockPackageForProcessing(1)];

      mockStorageService.getSessionData.mockReturnValue({
        currentShipmentPackages: mockPackages,
        processedInvoices: [],
        syncLogs: [],
        lastFetchTime: new Date().toISOString(),
        selectedPackageIds: packageIds
      });

      mockStorageService.getEncryptedConfig.mockResolvedValue({
        oblio: {
          email: 'test@example.com',
          secretKey: 'secret123',
          cif: '12345678',
          workStation: 1
        },
        trendyol: {
          apiKey: 'api123',
          secretKey: 'secret123',
          supplierId: 'supplier123',
          storeFrontCode: 'TR'
        }
      });

      // Mock successful Oblio invoice creation
      const mockOblioInvoice = {
        status: 200,
        statusMessage: 'Success',
        data: {
          seriesName: 'FACT',
          number: '001',
          link: 'https://oblio.eu/invoice/123'
        }
      };
      mockOblioClient.createInvoice.mockResolvedValue(mockOblioInvoice);

      // Mock Trendyol invoice link sending failure
      mockTrendyolClient.sendInvoiceLinkToOrder.mockRejectedValue(new Error('Trendyol API Error'));

      const result = await syncService.processSelectedPackages(packageIds);

      expect(result.totalOrders).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Trendyol API Error');

      // Verify Oblio invoice was created but process failed at Trendyol step
      expect(mockOblioClient.createInvoice).toHaveBeenCalledTimes(1);
      expect(mockTrendyolClient.sendInvoiceLinkToOrder).toHaveBeenCalledTimes(1);
    });

    it('should throw error when no session packages are found', async () => {
      mockStorageService.getSessionData.mockReturnValue(null);

      await expect(syncService.processSelectedPackages(['1'])).rejects.toThrow(
        'No shipment packages found in session. Please fetch packages first.'
      );
    });

    it('should throw error when no matching packages are found', async () => {
      const mockPackages = [createMockPackageForProcessing(1)];

      mockStorageService.getSessionData.mockReturnValue({
        currentShipmentPackages: mockPackages,
        processedInvoices: [],
        syncLogs: [],
        lastFetchTime: new Date().toISOString(),
        selectedPackageIds: []
      });

      await expect(syncService.processSelectedPackages(['999'])).rejects.toThrow(
        'No matching packages found for the provided IDs'
      );
    });

    it('should throw error when Oblio configuration is missing', async () => {
      const packageIds = ['1'];
      const mockPackages = [createMockPackageForProcessing(1)];

      mockStorageService.getSessionData.mockReturnValue({
        currentShipmentPackages: mockPackages,
        processedInvoices: [],
        syncLogs: [],
        lastFetchTime: new Date().toISOString(),
        selectedPackageIds: packageIds
      });

      mockStorageService.getEncryptedConfig.mockResolvedValue(null);

      await expect(syncService.processSelectedPackages(packageIds)).rejects.toThrow(
        'Oblio configuration not found. Please configure API credentials first.'
      );
    });

    it('should handle validation errors for Trendyol package data', async () => {
      const packageIds = ['1'];
      const invalidPackage = createMockPackageForProcessing(1);
      // Make the package invalid by removing required fields
      invalidPackage.lines = []; // No product lines

      mockStorageService.getSessionData.mockReturnValue({
        currentShipmentPackages: [invalidPackage],
        processedInvoices: [],
        syncLogs: [],
        lastFetchTime: new Date().toISOString(),
        selectedPackageIds: packageIds
      });

      mockStorageService.getEncryptedConfig.mockResolvedValue({
        oblio: {
          email: 'test@example.com',
          secretKey: 'secret123',
          cif: '12345678',
          workStation: 1
        },
        trendyol: {
          apiKey: 'api123',
          secretKey: 'secret123',
          supplierId: 'supplier123',
          storeFrontCode: 'TR'
        }
      });

      const result = await syncService.processSelectedPackages(packageIds);

      expect(result.totalOrders).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toContain('Package validation failed');
    });

    it('should handle missing invoice link in Oblio response', async () => {
      const packageIds = ['1'];
      const mockPackages = [createMockPackageForProcessing(1)];

      mockStorageService.getSessionData.mockReturnValue({
        currentShipmentPackages: mockPackages,
        processedInvoices: [],
        syncLogs: [],
        lastFetchTime: new Date().toISOString(),
        selectedPackageIds: packageIds
      });

      mockStorageService.getEncryptedConfig.mockResolvedValue({
        oblio: {
          email: 'test@example.com',
          secretKey: 'secret123',
          cif: '12345678',
          workStation: 1
        },
        trendyol: {
          apiKey: 'api123',
          secretKey: 'secret123',
          supplierId: 'supplier123',
          storeFrontCode: 'TR'
        }
      });

      // Mock Oblio invoice creation without link
      const mockOblioInvoice = {
        status: 200,
        statusMessage: 'Success',
        data: {
          seriesName: 'FACT',
          number: '001',
          link: '' // Empty link
        }
      };
      mockOblioClient.createInvoice.mockResolvedValue(mockOblioInvoice);

      const result = await syncService.processSelectedPackages(packageIds);

      expect(result.totalOrders).toBe(1);
      expect(result.successCount).toBe(0);
      expect(result.failureCount).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].message).toBe('Oblio invoice created but no link returned');
    });
  });
});
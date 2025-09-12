import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrendyolApiClient } from '../services/trendyol-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TrendyolApiClient', () => {
  let client: TrendyolApiClient;

  beforeEach(() => {
    client = new TrendyolApiClient('test-api-key', 'test-secret', 'test-supplier-id', 'TR');
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should create client with correct parameters', () => {
      expect(client).toBeInstanceOf(TrendyolApiClient);
    });
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 })
      });

      const result = await client.validateCredentials();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://apigw.trendyol.com/integration/order/sellers/test-supplier-id/orders?page=0&size=1',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Basic dGVzdC1hcGkta2V5OnRlc3Qtc2VjcmV0',
            'User-Agent': 'test-supplier-id - SelfIntegration',
            'storeFrontCode': 'TR',
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should return false for 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await client.validateCredentials();
      expect(result).toBe(false);
    });

    it('should return false for 403 forbidden', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      const result = await client.validateCredentials();
      expect(result).toBe(false);
    });

    it('should throw error for network issues', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

      await expect(client.validateCredentials()).rejects.toThrow('Network error: Unable to connect to Trendyol API');
    });

    it('should throw error for server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error details'
      });

      await expect(client.validateCredentials()).rejects.toThrow('Credential validation failed: Trendyol server error: Please try again later');
    });
  });

  describe('getAllShipmentPackages', () => {
    const mockPackage = {
      id: 1,
      packageNumber: 'PKG001',
      orderId: 'ORDER001',
      orderDate: '2024-01-01T00:00:00Z',
      status: 'Shipped',
      deliveryType: 'Standard',
      agreedDeliveryDate: '2024-01-05T00:00:00Z',
      estimatedDeliveryStartDate: '2024-01-04T00:00:00Z',
      estimatedDeliveryEndDate: '2024-01-06T00:00:00Z',
      totalDiscount: 10.0,
      totalTyDiscount: 5.0,
      taxNumber: '1234567890',
      invoiceAddress: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Test Company',
        address1: 'Test Address',
        address2: '',
        city: 'Istanbul',
        cityCode: 34,
        district: 'Kadikoy',
        districtId: 1,
        postalCode: '34000',
        countryCode: 'TR',
        neighborhoodId: 1,
        neighborhood: 'Test Neighborhood'
      },
      deliveryAddress: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Test Company',
        address1: 'Test Address',
        address2: '',
        city: 'Istanbul',
        cityCode: 34,
        district: 'Kadikoy',
        districtId: 1,
        postalCode: '34000',
        countryCode: 'TR',
        neighborhoodId: 1,
        neighborhood: 'Test Neighborhood'
      },
      orderLines: [],
      packageHistories: [],
      shipmentAddress: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Test Company',
        address1: 'Test Address',
        address2: '',
        city: 'Istanbul',
        cityCode: 34,
        district: 'Kadikoy',
        districtId: 1,
        postalCode: '34000',
        countryCode: 'TR',
        neighborhoodId: 1,
        neighborhood: 'Test Neighborhood'
      },
      customerInfo: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john@example.com',
        gsm: '+905551234567'
      },
      cargoTrackingNumber: 'TRACK001',
      cargoTrackingLink: 'https://tracking.example.com/TRACK001',
      cargoSenderNumber: 'SENDER001',
      cargoProviderName: 'Test Cargo',
      lines: []
    };

    it('should fetch single page when page parameter is specified', async () => {
      const mockResponse = {
        content: [mockPackage],
        page: 0,
        size: 200,
        totalElements: 1,
        totalPages: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await client.getAllShipmentPackages({ page: 0, size: 200 });

      expect(result).toEqual([mockPackage]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://apigw.trendyol.com/integration/order/sellers/test-supplier-id/orders?page=0&size=200&orderByField=PackageLastModifiedDate&orderByDirection=DESC',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Basic dGVzdC1hcGkta2V5OnRlc3Qtc2VjcmV0',
            'User-Agent': 'test-supplier-id - SelfIntegration',
            'storeFrontCode': 'TR',
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should fetch all pages when no page parameter is specified', async () => {
      const mockPage1 = {
        content: [{ ...mockPackage, id: 1 }],
        page: 0,
        size: 1,
        totalElements: 2,
        totalPages: 2
      };

      const mockPage2 = {
        content: [{ ...mockPackage, id: 2 }],
        page: 1,
        size: 1,
        totalElements: 2,
        totalPages: 2
      };

      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockPage1
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => mockPage2
        });

      const result = await client.getAllShipmentPackages({ size: 1 });

      expect(result).toHaveLength(2);
      expect(result[0]?.id).toBe(1);
      expect(result[1]?.id).toBe(2);
      expect(mockFetch).toHaveBeenCalledTimes(2);
    });

    it('should use default parameters when none provided', async () => {
      const mockResponse = {
        content: [mockPackage],
        page: 0,
        size: 200,
        totalElements: 1,
        totalPages: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      await client.getAllShipmentPackages();

      expect(mockFetch).toHaveBeenCalledWith(
        'https://apigw.trendyol.com/integration/order/sellers/test-supplier-id/orders?page=0&size=200&orderByField=PackageLastModifiedDate&orderByDirection=DESC',
        expect.any(Object)
      );
    });

    it('should respect custom ordering parameters', async () => {
      const mockResponse = {
        content: [mockPackage],
        page: 0,
        size: 100,
        totalElements: 1,
        totalPages: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      await client.getAllShipmentPackages({
        size: 100,
        orderByField: 'CreatedDate',
        orderByDirection: 'ASC'
      });

      expect(mockFetch).toHaveBeenCalledWith(
        'https://apigw.trendyol.com/integration/order/sellers/test-supplier-id/orders?page=0&size=100&orderByField=CreatedDate&orderByDirection=ASC',
        expect.any(Object)
      );
    });

    it('should limit page size to maximum of 200', async () => {
      const mockResponse = {
        content: [mockPackage],
        page: 0,
        size: 200,
        totalElements: 1,
        totalPages: 1
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      await client.getAllShipmentPackages({ size: 500 });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('size=200'),
        expect.any(Object)
      );
    });

    it('should handle rate limiting with retry', async () => {
      // First call returns 429, second call succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Map([['Retry-After', '1']])
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            content: [mockPackage],
            page: 0,
            size: 200,
            totalElements: 1,
            totalPages: 1
          })
        });

      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });

      const result = await client.getAllShipmentPackages();

      expect(result).toEqual([mockPackage]);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.restoreAllMocks();
    });

    it('should handle server errors with retry', async () => {
      // First call returns 500, second call succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server error'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            content: [mockPackage],
            page: 0,
            size: 200,
            totalElements: 1,
            totalPages: 1
          })
        });

      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });

      const result = await client.getAllShipmentPackages();

      expect(result).toEqual([mockPackage]);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.restoreAllMocks();
    });

    it('should fail after maximum retries for rate limiting', async () => {
      // All calls return 429
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map()
      });

      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });

      await expect(client.getAllShipmentPackages()).rejects.toThrow('Failed to fetch shipment packages: Rate limit exceeded: Maximum retries reached');

      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries

      vi.restoreAllMocks();
    });

    it('should handle network errors with retry', async () => {
      // First call fails with network error, second call succeeds
      mockFetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({
            content: [mockPackage],
            page: 0,
            size: 200,
            totalElements: 1,
            totalPages: 1
          })
        });

      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });

      const result = await client.getAllShipmentPackages();

      expect(result).toEqual([mockPackage]);
      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.restoreAllMocks();
    });

    it('should fail after maximum retries for network errors', async () => {
      // All calls fail with network error
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });

      await expect(client.getAllShipmentPackages()).rejects.toThrow('Failed to fetch shipment packages: Network error: Unable to connect after 3 retries');

      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries

      vi.restoreAllMocks();
    });

    it('should handle empty response pages', async () => {
      const mockResponse = {
        content: [],
        page: 0,
        size: 200,
        totalElements: 0,
        totalPages: 0
      };

      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => mockResponse
      });

      const result = await client.getAllShipmentPackages();

      expect(result).toEqual([]);
      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it('should handle authentication errors without retry', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Authentication failed'
      });

      await expect(client.getAllShipmentPackages()).rejects.toThrow('Failed to fetch shipment packages: Authentication failed: Invalid API credentials');

      expect(mockFetch).toHaveBeenCalledTimes(1); // No retries for auth errors
    });
  });

  describe('sendInvoiceToOrder', () => {
    const mockInvoiceData = {
      invoiceLink: 'https://example.com/invoice.pdf',
      invoiceNumber: 'INV-2024-001'
    };

    it('should successfully send invoice to order', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({})
      });

      await client.sendInvoiceToOrder('ORDER123', mockInvoiceData);

      expect(mockFetch).toHaveBeenCalledWith(
        'https://apigw.trendyol.com/integration/sellers/test-supplier-id/seller-invoice-file',
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic dGVzdC1hcGkta2V5OnRlc3Qtc2VjcmV0',
            'User-Agent': 'test-supplier-id - SelfIntegration',
            'storeFrontCode': 'TR',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            invoiceLink: 'https://example.com/invoice.pdf',
            invoiceNumber: 'INV-2024-001'
          })
        }
      );
    });

    it('should throw error when orderId is missing', async () => {
      await expect(client.sendInvoiceToOrder('', mockInvoiceData)).rejects.toThrow('Order ID and invoice data are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when invoiceData is missing', async () => {
      await expect(client.sendInvoiceToOrder('ORDER123', null as any)).rejects.toThrow('Order ID and invoice data are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when invoiceLink is missing', async () => {
      const invalidInvoiceData = {
        invoiceLink: '',
        invoiceNumber: 'INV-2024-001'
      };

      await expect(client.sendInvoiceToOrder('ORDER123', invalidInvoiceData)).rejects.toThrow('Invoice link and invoice number are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should throw error when invoiceNumber is missing', async () => {
      const invalidInvoiceData = {
        invoiceLink: 'https://example.com/invoice.pdf',
        invoiceNumber: ''
      };

      await expect(client.sendInvoiceToOrder('ORDER123', invalidInvoiceData)).rejects.toThrow('Invoice link and invoice number are required');
      expect(mockFetch).not.toHaveBeenCalled();
    });

    it('should handle API errors with proper error messages', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 400,
        statusText: 'Bad Request',
        text: async () => JSON.stringify({
          errors: [
            { code: 'INVALID_INVOICE', message: 'Invoice link is not accessible' }
          ]
        })
      });

      await expect(client.sendInvoiceToOrder('ORDER123', mockInvoiceData)).rejects.toThrow('Failed to send invoice to order ORDER123: Invoice link is not accessible');
    });

    it('should handle authentication errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Authentication failed'
      });

      await expect(client.sendInvoiceToOrder('ORDER123', mockInvoiceData)).rejects.toThrow('Failed to send invoice to order ORDER123: Authentication failed: Invalid API credentials');
    });

    it('should handle rate limiting with retry', async () => {
      // First call returns 429, second call succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 429,
          statusText: 'Too Many Requests',
          headers: new Map([['Retry-After', '1']])
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({})
        });

      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });

      await client.sendInvoiceToOrder('ORDER123', mockInvoiceData);

      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.restoreAllMocks();
    });

    it('should handle server errors with retry', async () => {
      // First call returns 500, second call succeeds
      mockFetch
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          statusText: 'Internal Server Error',
          text: async () => 'Server error'
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({})
        });

      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });

      await client.sendInvoiceToOrder('ORDER123', mockInvoiceData);

      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.restoreAllMocks();
    });

    it('should fail after maximum retries for rate limiting', async () => {
      // All calls return 429
      mockFetch.mockResolvedValue({
        ok: false,
        status: 429,
        statusText: 'Too Many Requests',
        headers: new Map()
      });

      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });

      await expect(client.sendInvoiceToOrder('ORDER123', mockInvoiceData)).rejects.toThrow('Failed to send invoice to order ORDER123: Rate limit exceeded: Maximum retries reached');

      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries

      vi.restoreAllMocks();
    });

    it('should handle network errors with retry', async () => {
      // First call fails with network error, second call succeeds
      mockFetch
        .mockRejectedValueOnce(new TypeError('fetch failed'))
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({})
        });

      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });

      await client.sendInvoiceToOrder('ORDER123', mockInvoiceData);

      expect(mockFetch).toHaveBeenCalledTimes(2);

      vi.restoreAllMocks();
    });

    it('should fail after maximum retries for network errors', async () => {
      // All calls fail with network error
      mockFetch.mockRejectedValue(new TypeError('fetch failed'));

      // Mock setTimeout to avoid actual delays in tests
      vi.spyOn(global, 'setTimeout').mockImplementation((fn: any) => {
        fn();
        return 1 as any;
      });

      await expect(client.sendInvoiceToOrder('ORDER123', mockInvoiceData)).rejects.toThrow('Failed to send invoice to order ORDER123: Network error: Unable to connect after 3 retries');

      expect(mockFetch).toHaveBeenCalledTimes(4); // Initial + 3 retries

      vi.restoreAllMocks();
    });
  });
});
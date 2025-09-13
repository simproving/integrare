import { describe, it, expect, beforeEach } from 'vitest';
import { TransformService } from '../services/transform-service.js';
import type { TrendyolShipmentPackage } from '../models/trendyol.js';
import type { TransformConfig } from '../services/transform-service.js';

describe('TransformService', () => {
  let transformService: TransformService;
  let mockConfig: TransformConfig;
  let mockTrendyolPackage: TrendyolShipmentPackage;

  beforeEach(() => {
    mockConfig = {
      cif: 'RO12345678',
      workStation: 1,
      seriesName: 'FACT',
      language: 'RO',
      defaultVatPercentage: 19,
      defaultMeasuringUnit: 'buc',
    };

    transformService = new TransformService(mockConfig);

    mockTrendyolPackage = {
      id: 123456,
      packageNumber: 'PKG-001',
      orderId: 'ORD-001',
      orderDate: '2024-01-15',
      status: 'Created',
      deliveryType: 'Standard',
      agreedDeliveryDate: '2024-01-20',
      estimatedDeliveryStartDate: '2024-01-18',
      estimatedDeliveryEndDate: '2024-01-22',
      totalDiscount: 10.0,
      totalTyDiscount: 0.0,
      taxNumber: 'RO87654321',
      invoiceAddress: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Test Company SRL',
        address1: 'Strada Principala 123',
        address2: 'Bloc A, Ap. 5',
        city: 'Bucharest',
        cityCode: 34,
        district: 'Sector 1',
        districtId: 1,
        postalCode: '010101',
        countryCode: 'RO',
        neighborhoodId: 1,
        neighborhood: 'Centru',
      },
      deliveryAddress: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Test Company SRL',
        address1: 'Strada Principala 123',
        address2: 'Bloc A, Ap. 5',
        city: 'Bucharest',
        cityCode: 34,
        district: 'Sector 1',
        districtId: 1,
        postalCode: '010101',
        countryCode: 'RO',
        neighborhoodId: 1,
        neighborhood: 'Centru',
      },
      orderLines: [],
      packageHistories: [],
      shipmentAddress: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        company: 'Test Company SRL',
        address1: 'Strada Principala 123',
        address2: 'Bloc A, Ap. 5',
        city: 'Bucharest',
        cityCode: 34,
        district: 'Sector 1',
        districtId: 1,
        postalCode: '010101',
        countryCode: 'RO',
        neighborhoodId: 1,
        neighborhood: 'Centru',
      },
      customerInfo: {
        id: 1,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        gsm: '+40712345678',
      },
      cargoTrackingNumber: 'TRACK123',
      cargoTrackingLink: 'https://tracking.example.com/TRACK123',
      cargoSenderNumber: 'SENDER123',
      cargoProviderName: 'Test Cargo',
      lines: [
        {
          id: 1,
          quantity: 2,
          salesCampaignId: 0,
          productSize: 'M',
          merchantSku: 'SKU-001',
          productName: 'Test Product',
          productCode: 12345,
          merchantId: 1,
          amount: 100.0,
          discount: 5.0,
          tyDiscount: 0.0,
          discountDetails: [],
          currencyCode: 'RON',
          productColor: 'Red',
          sku: 'SKU-001',
          vatBaseAmount: 84.03,
          barcode: '1234567890123',
          orderLineItemStatusName: 'Created',
        },
        {
          id: 2,
          quantity: 1,
          salesCampaignId: 0,
          productSize: 'L',
          merchantSku: 'SKU-002',
          productName: 'Another Product',
          productCode: 12346,
          merchantId: 1,
          amount: 50.0,
          discount: 0.0,
          tyDiscount: 0.0,
          discountDetails: [],
          currencyCode: 'RON',
          productColor: 'Blue',
          sku: 'SKU-002',
          vatBaseAmount: 42.02,
          barcode: '1234567890124',
          orderLineItemStatusName: 'Created',
        },
      ],
    };
  });

  describe('trendyolPackageToOblioInvoice', () => {
    it('should transform Trendyol package to Oblio invoice request', () => {
      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      expect(result.cif).toBe(mockConfig.cif);
      expect(result.workStation).toBe(mockConfig.workStation);
      expect(result.seriesName).toBe(mockConfig.seriesName);
      expect(result.language).toBe(mockConfig.language);
      expect(result.currency).toBe('RON');
      expect(result.useStock).toBe(0);
      expect(result.internalNote).toContain('ORD-001');
      expect(result.internalNote).toContain('PKG-001');
      expect(result.noticeNumber).toBe('PKG-001');
    });

    it('should set issue date to today and due date to 30 days from now', () => {
      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      const today = new Date().toISOString().split('T')[0];
      const expectedDueDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      expect(result.issueDate).toBe(today);
      expect(result.dueDate).toBe(expectedDueDate);
    });

    it('should map customer information correctly', () => {
      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      expect(result.client.cif).toBe('RO87654321');
      expect(result.client.name).toBe('Test Company SRL');
      expect(result.client.address).toContain('Strada Principala 123');
      expect(result.client.city).toBe('Bucharest');
      expect(result.client.country).toBe('Romania');
      expect(result.client.email).toBe('john.doe@example.com');
      expect(result.client.phone).toBe('+40712345678');
      expect(result.client.contact).toBe('John Doe');
      expect(result.client.vatPayer).toBe(true);
    });

    it('should handle customer without company name', () => {
      mockTrendyolPackage.invoiceAddress.company = '';

      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      expect(result.client.name).toBe('John Doe');
    });

    it('should handle customer without tax number', () => {
      mockTrendyolPackage.taxNumber = '';

      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      expect(result.client.cif).toBe('');
      expect(result.client.vatPayer).toBe(false);
    });

    it('should transform package lines to products correctly', () => {
      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      expect(result.products).toHaveLength(2);

      const firstProduct = result.products[0]!;
      expect(firstProduct.name).toBe('Test Product');
      expect(firstProduct.code).toBe('SKU-001');
      expect(firstProduct.description).toContain('Size: M');
      expect(firstProduct.description).toContain('Color: Red');
      expect(firstProduct.description).toContain('SKU: SKU-001');
      expect(firstProduct.price).toBe(50.0); // 100 / 2 quantity
      expect(firstProduct.quantity).toBe(2);
      expect(firstProduct.currency).toBe('RON');
      expect(firstProduct.measuringUnit).toBe('buc');
      expect(firstProduct.vatIncluded).toBe(true);
      expect(firstProduct.productType).toBe('produs');
    });

    it('should calculate VAT percentage from vatBaseAmount', () => {
      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      const firstProduct = result.products[0]!;
      // VAT = (100 - 84.03) / 84.03 * 100 = 19%
      expect(firstProduct.vatPercentage).toBeCloseTo(19, 0);
    });

    it('should use default VAT percentage when calculation not possible', () => {
      mockTrendyolPackage.lines[0]!.vatBaseAmount = 0;

      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      expect(result.products[0]!.vatPercentage).toBe(19);
    });

    it('should handle empty package lines', () => {
      mockTrendyolPackage.lines = [];

      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      expect(result.products).toHaveLength(0);
      expect(result.currency).toBe('RON'); // Default currency
    });
  });

  describe('validateTransformedData', () => {
    it('should validate correct invoice data', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      const result = transformService.validateTransformedData(invoice);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.cif = '';
      invoice.client.name = '';
      invoice.issueDate = '';
      invoice.dueDate = '';
      invoice.currency = '';
      invoice.language = '';
      invoice.seriesName = '';
      invoice.products = [];

      const result = transformService.validateTransformedData(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CIF is required');
      expect(result.errors).toContain('Client name is required');
      expect(result.errors).toContain('Issue date is required');
      expect(result.errors).toContain('Due date is required');
      expect(result.errors).toContain('Currency is required');
      expect(result.errors).toContain('Language is required');
      expect(result.errors).toContain('Series name is required');
      expect(result.errors).toContain('At least one product is required');
    });

    it('should validate product fields', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.products[0]!.name = '';
      invoice.products[0]!.price = 0;
      invoice.products[0]!.quantity = -1;

      const result = transformService.validateTransformedData(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product 1: Name is required');
      expect(result.errors).toContain('Product 1: Price must be greater than 0');
      expect(result.errors).toContain('Product 1: Quantity must be greater than 0');
    });

    it('should validate date logic', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.issueDate = '2024-01-20';
      invoice.dueDate = '2024-01-15'; // Due date before issue date

      const result = transformService.validateTransformedData(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Due date must be after issue date');
    });

    it('should validate date formats', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.issueDate = 'invalid-date';
      invoice.dueDate = '2024/01/20'; // Wrong format

      const result = transformService.validateTransformedData(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Issue date must be in YYYY-MM-DD format');
      expect(result.errors).toContain('Due date must be in YYYY-MM-DD format');
    });

    it('should validate work station range', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.workStation = 0;

      const result = transformService.validateTransformedData(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Work station must be between 1 and 999');
    });

    it('should provide warnings for format issues', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.cif = 'INVALID_CIF';
      invoice.currency = 'INVALID';
      invoice.client.email = 'invalid-email';

      const result = transformService.validateTransformedData(invoice);

      expect(result.warnings).toContain('CIF format may be invalid (expected RO followed by 2-10 digits)');
      expect(result.warnings).toContain('Currency should be a 3-letter ISO code (e.g., RON, EUR, USD)');
      expect(result.warnings).toContain('Client email format appears invalid');
    });

    it('should validate VAT percentage range', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.products[0]!.vatPercentage = 150; // Invalid VAT percentage

      const result = transformService.validateTransformedData(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product 1: VAT percentage must be between 0 and 100');
    });

    it('should warn about high values', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.products[0]!.price = 150000; // Very high price
      invoice.products[0]!.quantity = 15000; // Very high quantity

      const result = transformService.validateTransformedData(invoice);

      expect(result.warnings).toContain('Product 1: Price is very high (150000), please verify');
      expect(result.warnings).toContain('Product 1: Quantity is very high (15000), please verify');
    });

    it('should warn about missing recommended fields', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.client.address = '';
      invoice.client.city = '';

      const result = transformService.validateTransformedData(invoice);

      expect(result.warnings).toContain('Client address is recommended for proper invoicing');
      expect(result.warnings).toContain('Client city is recommended for proper invoicing');
    });
  });

  describe('validateTransformedDataDetailed', () => {
    it('should provide structured error information', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.cif = '';
      invoice.client.name = '';
      invoice.issueDate = 'invalid-date';

      const result = transformService.validateTransformedDataDetailed(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors).toHaveLength(3);

      const cifError = result.errors.find(e => e.field === 'cif');
      expect(cifError).toBeDefined();
      expect(cifError?.code).toBe('REQUIRED_FIELD');
      expect(cifError?.message).toBe('CIF is required');

      const nameError = result.errors.find(e => e.field === 'client.name');
      expect(nameError).toBeDefined();
      expect(nameError?.code).toBe('REQUIRED_FIELD');

      const dateError = result.errors.find(e => e.field === 'issueDate');
      expect(dateError).toBeDefined();
      expect(dateError?.code).toBe('INVALID_FORMAT');
    });
  });

  describe('validateTrendyolPackage', () => {
    it('should validate correct Trendyol package', () => {
      const result = transformService.validateTrendyolPackage(mockTrendyolPackage);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required fields in Trendyol package', () => {
      const invalidPackage = { ...mockTrendyolPackage };
      invalidPackage.id = 0;
      invalidPackage.orderId = '';
      invalidPackage.lines = [];

      const result = transformService.validateTrendyolPackage(invalidPackage);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Package ID is required');
      expect(result.errors).toContain('Order ID is required');
      expect(result.errors).toContain('Package must contain at least one product line');
    });

    it('should validate customer information', () => {
      const invalidPackage = { ...mockTrendyolPackage };
      invalidPackage.invoiceAddress = {
        ...mockTrendyolPackage.invoiceAddress,
        firstName: '',
        lastName: '',
        company: '',
      };

      const result = transformService.validateTrendyolPackage(invalidPackage);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Customer name or company name is required');
    });

    it('should validate product lines', () => {
      const invalidPackage = { ...mockTrendyolPackage };
      invalidPackage.lines = [
        {
          ...mockTrendyolPackage.lines[0]!,
          productName: '',
          amount: 0,
          quantity: -1,
        },
      ];

      const result = transformService.validateTrendyolPackage(invalidPackage);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Line 1: Product name is required');
      expect(result.errors).toContain('Line 1: Amount must be greater than 0');
      expect(result.errors).toContain('Line 1: Quantity must be greater than 0');
    });
  });

  describe('validateConfig', () => {
    it('should validate correct configuration', () => {
      const result = transformService.validateConfig(mockConfig);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect missing required configuration fields', () => {
      const invalidConfig = {
        ...mockConfig,
        cif: '',
        seriesName: '',
        language: '',
        workStation: 0,
        defaultVatPercentage: -5,
      };

      const result = transformService.validateConfig(invalidConfig);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CIF is required in configuration');
      expect(result.errors).toContain('Series name is required in configuration');
      expect(result.errors).toContain('Language is required in configuration');
      expect(result.errors).toContain('Work station must be a positive number');
      expect(result.errors).toContain('Default VAT percentage must be between 0 and 100');
    });
  });

  describe('validateOblioCompatibility', () => {
    it('should validate Oblio-compatible invoice', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      const result = transformService.validateOblioCompatibility(invoice);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect field length violations for Oblio', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.cif = 'A'.repeat(25); // Too long
      invoice.client.name = 'B'.repeat(250); // Too long
      invoice.seriesName = 'C'.repeat(15); // Too long

      const result = transformService.validateOblioCompatibility(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('CIF is too long for Oblio (max 20 characters)');
      expect(result.errors).toContain('Client name is too long for Oblio (max 200 characters)');
      expect(result.errors).toContain('Series name is too long for Oblio (max 10 characters)');
    });

    it('should warn about unsupported currencies and languages', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.currency = 'XYZ'; // Unsupported currency
      invoice.language = 'ZZ'; // Unsupported language

      const result = transformService.validateOblioCompatibility(invoice);

      expect(result.warnings).toContain('Currency XYZ may not be supported by Oblio');
      expect(result.warnings).toContain('Language ZZ may not be supported by Oblio');
    });

    it('should validate product field lengths for Oblio', () => {
      const invoice = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);
      invoice.products[0]!.name = 'A'.repeat(250); // Too long
      invoice.products[0]!.code = 'B'.repeat(60); // Too long
      invoice.products[0]!.description = 'C'.repeat(1100); // Too long

      const result = transformService.validateOblioCompatibility(invoice);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Product 1: Name is too long for Oblio (max 200 characters)');
      expect(result.errors).toContain('Product 1: Code is too long for Oblio (max 50 characters)');
      expect(result.errors).toContain('Product 1: Description is too long for Oblio (max 1000 characters)');
    });
  });

  describe('configuration management', () => {
    it('should update configuration', () => {
      const newConfig = { defaultVatPercentage: 24 };
      transformService.updateConfig(newConfig);

      const config = transformService.getConfig();
      expect(config.defaultVatPercentage).toBe(24);
      expect(config.cif).toBe(mockConfig.cif); // Other values should remain
    });

    it('should return current configuration', () => {
      const config = transformService.getConfig();
      expect(config).toEqual(mockConfig);
    });
  });

  describe('country code mapping', () => {
    it('should map known country codes', () => {
      mockTrendyolPackage.invoiceAddress.countryCode = 'TR';

      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      expect(result.client.country).toBe('Turkey');
    });

    it('should return original code for unknown countries', () => {
      mockTrendyolPackage.invoiceAddress.countryCode = 'XX';

      const result = transformService.trendyolPackageToOblioInvoice(mockTrendyolPackage);

      expect(result.client.country).toBe('XX');
    });
  });
});
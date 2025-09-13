import type { TrendyolShipmentPackage, PackageLine } from '../models/trendyol.js';
import type { OblioInvoiceRequest, OblioClient, OblioProduct } from '../models/oblio.js';

export interface TransformConfig {
  cif: string;
  workStation: number;
  seriesName: string;
  language: string;
  defaultVatPercentage: number;
  defaultMeasuringUnit: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings?: string[];
}

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface DetailedValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

export class TransformService {
  private config: TransformConfig;

  constructor(config: TransformConfig) {
    this.config = config;
  }

  /**
   * Transform Trendyol shipment package to Oblio invoice request
   * Maps customer information, addresses, and order lines to Oblio format
   */
  public trendyolPackageToOblioInvoice(
    trendyolPackage: TrendyolShipmentPackage
  ): OblioInvoiceRequest {
    const client = this.mapCustomerToOblioClient(trendyolPackage);
    const products = this.mapPackageLinesToOblioProducts(trendyolPackage.lines);

    // Generate dates - issue date is today, due date is 30 days from now
    const issueDate: string = new Date().toISOString().split('T')[0]!;
    const dueDate: string = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split('T')[0]!

    // Extract currency with guaranteed string return
    const currency: string = this.extractCurrency(trendyolPackage.lines);

    return {
      cif: this.config.cif,
      client,
      issueDate,
      dueDate,
      currency,
      language: this.config.language,
      workStation: this.config.workStation,
      seriesName: this.config.seriesName,
      useStock: 0, // Don't use stock management
      products,
      internalNote: `Trendyol Order: ${trendyolPackage.orderId}, Package: ${trendyolPackage.packageNumber}`,
      noticeNumber: trendyolPackage.packageNumber,
    };
  }

  /**
   * Map Trendyol customer and address information to Oblio client format
   */
  private mapCustomerToOblioClient(trendyolPackage: TrendyolShipmentPackage): OblioClient {
    const { invoiceAddress, customerInfo } = trendyolPackage;

    // Combine first name and last name for full name
    const fullName = `${invoiceAddress.firstName} ${invoiceAddress.lastName}`.trim();

    // Build full address string
    const addressParts = [
      invoiceAddress.address1,
      invoiceAddress.address2,
      invoiceAddress.neighborhood,
      invoiceAddress.district,
    ].filter(Boolean);

    const fullAddress = addressParts.join(', ');

    return {
      cif: trendyolPackage.taxNumber || '', // Use tax number as CIF if available
      name: invoiceAddress.company || fullName,
      address: fullAddress,
      city: invoiceAddress.city,
      country: this.mapCountryCode(invoiceAddress.countryCode),
      email: customerInfo?.email,
      phone: customerInfo?.gsm,
      contact: fullName,
      vatPayer: Boolean(trendyolPackage.taxNumber), // Assume VAT payer if tax number exists
    };
  }

  /**
   * Transform Trendyol package lines to Oblio products
   */
  private mapPackageLinesToOblioProducts(lines: PackageLine[]): OblioProduct[] {
    return lines.map((line) => this.mapPackageLineToOblioProduct(line));
  }

  /**
   * Transform a single Trendyol package line to Oblio product
   */
  private mapPackageLineToOblioProduct(line: PackageLine): OblioProduct {
    // Calculate unit price (amount is total, so divide by quantity)
    const unitPrice = line.quantity > 0 ? line.amount / line.quantity : line.amount;

    // Build product description with size and color if available
    const descriptionParts = [
      line.productSize && `Size: ${line.productSize}`,
      line.productColor && `Color: ${line.productColor}`,
      line.merchantSku && `SKU: ${line.merchantSku}`,
    ].filter(Boolean);

    const description: string | undefined = descriptionParts.length > 0
      ? descriptionParts.join(', ')
      : undefined;

    const product: OblioProduct = {
      name: line.productName,
      price: unitPrice,
      quantity: line.quantity,
      measuringUnit: this.config.defaultMeasuringUnit,
      vatPercentage: this.calculateVatPercentage(line),
      vatIncluded: true, // Trendyol prices typically include VAT
      productType: 'produs', // Standard product type for Oblio
    };

    // Add optional fields only if they have values
    if (line.sku || line.barcode || line.merchantSku) {
      product.code = line.sku || line.barcode || line.merchantSku;
    }

    if (description) {
      product.description = description;
    }

    if (line.currencyCode) {
      product.currency = line.currencyCode;
    }

    return product;
  }

  /**
   * Calculate VAT percentage from Trendyol line data
   */
  private calculateVatPercentage(line: PackageLine): number {
    // If vatBaseAmount is available, calculate VAT percentage
    if (line.vatBaseAmount && line.vatBaseAmount > 0 && line.amount > 0) {
      const vatAmount = line.amount - line.vatBaseAmount;
      const vatPercentage = (vatAmount / line.vatBaseAmount) * 100;
      return Math.round(vatPercentage * 100) / 100; // Round to 2 decimal places
    }

    // Default VAT percentage if calculation not possible
    return this.config.defaultVatPercentage;
  }

  /**
   * Extract currency from package lines (should be consistent across all lines)
   */
  private extractCurrency(lines: PackageLine[]): string {
    // Always return a string, defaulting to RON
    if (!lines || lines.length === 0) {
      return 'RON';
    }

    const firstLine = lines[0];
    if (!firstLine) {
      return 'RON';
    }

    const currency = firstLine.currencyCode;
    if (!currency || typeof currency !== 'string' || currency.trim() === '') {
      return 'RON';
    }

    return currency;
  }

  /**
   * Map Trendyol country codes to full country names for Oblio
   */
  private mapCountryCode(countryCode: string): string {
    const countryMap: Record<string, string> = {
      'TR': 'Turkey',
      'RO': 'Romania',
      'BG': 'Bulgaria',
      'HU': 'Hungary',
      'CZ': 'Czech Republic',
      'SK': 'Slovakia',
      'PL': 'Poland',
      'HR': 'Croatia',
      'SI': 'Slovenia',
      'RS': 'Serbia',
      'BA': 'Bosnia and Herzegovina',
      'MK': 'North Macedonia',
      'AL': 'Albania',
      'ME': 'Montenegro',
      'XK': 'Kosovo',
    };

    return countryMap[countryCode] || countryCode;
  }

  /**
   * Validate transformed Oblio invoice data with comprehensive checks
   */
  public validateTransformedData(invoice: OblioInvoiceRequest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields validation
    this.validateRequiredFields(invoice, errors);
    
    // Format validation
    this.validateFormats(invoice, errors, warnings);
    
    // Business logic validation
    this.validateBusinessRules(invoice, errors, warnings);
    
    // Product validation
    this.validateProducts(invoice.products, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Detailed validation with structured error information
   */
  public validateTransformedDataDetailed(invoice: OblioInvoiceRequest): DetailedValidationResult {
    const errors: ValidationError[] = [];
    const warnings: ValidationError[] = [];

    // Required fields validation
    this.validateRequiredFieldsDetailed(invoice, errors);
    
    // Format validation
    this.validateFormatsDetailed(invoice, errors, warnings);
    
    // Business logic validation
    this.validateBusinessRulesDetailed(invoice, errors, warnings);
    
    // Product validation
    this.validateProductsDetailed(invoice.products, errors, warnings);

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate required fields
   */
  private validateRequiredFields(invoice: OblioInvoiceRequest, errors: string[]): void {
    if (!invoice.cif || invoice.cif.trim() === '') {
      errors.push('CIF is required');
    }

    if (!invoice.client.name || invoice.client.name.trim() === '') {
      errors.push('Client name is required');
    }

    if (!invoice.issueDate || invoice.issueDate.trim() === '') {
      errors.push('Issue date is required');
    }

    if (!invoice.dueDate || invoice.dueDate.trim() === '') {
      errors.push('Due date is required');
    }

    if (!invoice.currency || invoice.currency.trim() === '') {
      errors.push('Currency is required');
    }

    if (!invoice.language || invoice.language.trim() === '') {
      errors.push('Language is required');
    }

    if (!invoice.seriesName || invoice.seriesName.trim() === '') {
      errors.push('Series name is required');
    }

    if (invoice.workStation === undefined || invoice.workStation === null) {
      errors.push('Work station is required');
    }

    if (!invoice.products || invoice.products.length === 0) {
      errors.push('At least one product is required');
    }
  }

  /**
   * Validate field formats
   */
  private validateFormats(invoice: OblioInvoiceRequest, errors: string[], warnings: string[]): void {
    // Date format validation (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (invoice.issueDate && !dateRegex.test(invoice.issueDate)) {
      errors.push('Issue date must be in YYYY-MM-DD format');
    }

    if (invoice.dueDate && !dateRegex.test(invoice.dueDate)) {
      errors.push('Due date must be in YYYY-MM-DD format');
    }

    // CIF format validation (basic Romanian CIF format)
    if (invoice.cif && invoice.cif.length > 0) {
      const cifRegex = /^(RO)?[0-9]{2,10}$/i;
      if (!cifRegex.test(invoice.cif)) {
        warnings.push('CIF format may be invalid (expected RO followed by 2-10 digits)');
      }
    }

    // Currency code validation (3-letter ISO code)
    if (invoice.currency && invoice.currency.length !== 3) {
      warnings.push('Currency should be a 3-letter ISO code (e.g., RON, EUR, USD)');
    }

    // Work station validation
    if (invoice.workStation !== undefined && (invoice.workStation < 1 || invoice.workStation > 999)) {
      errors.push('Work station must be between 1 and 999');
    }

    // Email format validation if provided
    if (invoice.client.email && invoice.client.email.trim() !== '') {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(invoice.client.email)) {
        warnings.push('Client email format appears invalid');
      }
    }
  }

  /**
   * Validate business rules
   */
  private validateBusinessRules(invoice: OblioInvoiceRequest, errors: string[], warnings: string[]): void {
    // Date logic validation
    if (invoice.issueDate && invoice.dueDate) {
      const issueDate = new Date(invoice.issueDate);
      const dueDate = new Date(invoice.dueDate);

      if (isNaN(issueDate.getTime())) {
        errors.push('Issue date is not a valid date');
      }

      if (isNaN(dueDate.getTime())) {
        errors.push('Due date is not a valid date');
      }

      if (!isNaN(issueDate.getTime()) && !isNaN(dueDate.getTime())) {
        if (dueDate < issueDate) {
          errors.push('Due date must be after issue date');
        }

        // Warn if due date is more than 1 year in the future
        const oneYearFromIssue = new Date(issueDate);
        oneYearFromIssue.setFullYear(oneYearFromIssue.getFullYear() + 1);
        if (dueDate > oneYearFromIssue) {
          warnings.push('Due date is more than 1 year from issue date');
        }
      }
    }

    // Client validation
    if (!invoice.client.address || invoice.client.address.trim() === '') {
      warnings.push('Client address is recommended for proper invoicing');
    }

    if (!invoice.client.city || invoice.client.city.trim() === '') {
      warnings.push('Client city is recommended for proper invoicing');
    }

    // Total value validation
    if (invoice.products && invoice.products.length > 0) {
      const totalValue = invoice.products.reduce((sum, product) => {
        return sum + (product.price * product.quantity);
      }, 0);

      if (totalValue <= 0) {
        errors.push('Total invoice value must be greater than 0');
      }

      if (totalValue > 1000000) {
        warnings.push('Invoice total is very high, please verify amounts');
      }
    }
  }

  /**
   * Validate products array
   */
  private validateProducts(products: OblioProduct[], errors: string[], warnings: string[]): void {
    if (!products || products.length === 0) {
      return; // Already handled in required fields
    }

    products.forEach((product, index) => {
      const productNum = index + 1;

      // Required product fields
      if (!product.name || product.name.trim() === '') {
        errors.push(`Product ${productNum}: Name is required`);
      }

      if (product.price === undefined || product.price === null || product.price <= 0) {
        errors.push(`Product ${productNum}: Price must be greater than 0`);
      }

      if (product.quantity === undefined || product.quantity === null || product.quantity <= 0) {
        errors.push(`Product ${productNum}: Quantity must be greater than 0`);
      }

      // Product format validation
      if (product.name && product.name.length > 200) {
        warnings.push(`Product ${productNum}: Name is very long (${product.name.length} characters)`);
      }

      if (product.description && product.description.length > 500) {
        warnings.push(`Product ${productNum}: Description is very long (${product.description.length} characters)`);
      }

      // VAT validation
      if (product.vatPercentage !== undefined) {
        if (product.vatPercentage < 0 || product.vatPercentage > 100) {
          errors.push(`Product ${productNum}: VAT percentage must be between 0 and 100`);
        }
      }

      // Price validation
      if (product.price !== undefined && product.price > 100000) {
        warnings.push(`Product ${productNum}: Price is very high (${product.price}), please verify`);
      }

      // Quantity validation
      if (product.quantity !== undefined && product.quantity > 10000) {
        warnings.push(`Product ${productNum}: Quantity is very high (${product.quantity}), please verify`);
      }
    });
  }

  /**
   * Detailed validation methods for structured error reporting
   */
  private validateRequiredFieldsDetailed(invoice: OblioInvoiceRequest, errors: ValidationError[]): void {
    if (!invoice.cif || invoice.cif.trim() === '') {
      errors.push({ field: 'cif', message: 'CIF is required', code: 'REQUIRED_FIELD' });
    }

    if (!invoice.client.name || invoice.client.name.trim() === '') {
      errors.push({ field: 'client.name', message: 'Client name is required', code: 'REQUIRED_FIELD' });
    }

    if (!invoice.issueDate || invoice.issueDate.trim() === '') {
      errors.push({ field: 'issueDate', message: 'Issue date is required', code: 'REQUIRED_FIELD' });
    }

    if (!invoice.dueDate || invoice.dueDate.trim() === '') {
      errors.push({ field: 'dueDate', message: 'Due date is required', code: 'REQUIRED_FIELD' });
    }

    if (!invoice.currency || invoice.currency.trim() === '') {
      errors.push({ field: 'currency', message: 'Currency is required', code: 'REQUIRED_FIELD' });
    }

    if (!invoice.products || invoice.products.length === 0) {
      errors.push({ field: 'products', message: 'At least one product is required', code: 'REQUIRED_FIELD' });
    }
  }

  private validateFormatsDetailed(invoice: OblioInvoiceRequest, errors: ValidationError[], warnings: ValidationError[]): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    
    if (invoice.issueDate && !dateRegex.test(invoice.issueDate)) {
      errors.push({ field: 'issueDate', message: 'Issue date must be in YYYY-MM-DD format', code: 'INVALID_FORMAT' });
    }

    if (invoice.dueDate && !dateRegex.test(invoice.dueDate)) {
      errors.push({ field: 'dueDate', message: 'Due date must be in YYYY-MM-DD format', code: 'INVALID_FORMAT' });
    }

    if (invoice.cif && invoice.cif.length > 0) {
      const cifRegex = /^(RO)?[0-9]{2,10}$/i;
      if (!cifRegex.test(invoice.cif)) {
        warnings.push({ field: 'cif', message: 'CIF format may be invalid', code: 'FORMAT_WARNING' });
      }
    }
  }

  private validateBusinessRulesDetailed(invoice: OblioInvoiceRequest, errors: ValidationError[], warnings: ValidationError[]): void {
    if (invoice.issueDate && invoice.dueDate) {
      const issueDate = new Date(invoice.issueDate);
      const dueDate = new Date(invoice.dueDate);

      if (!isNaN(issueDate.getTime()) && !isNaN(dueDate.getTime()) && dueDate < issueDate) {
        errors.push({ field: 'dueDate', message: 'Due date must be after issue date', code: 'BUSINESS_RULE' });
      }
    }
  }

  private validateProductsDetailed(products: OblioProduct[], errors: ValidationError[], warnings: ValidationError[]): void {
    if (!products || products.length === 0) {
      return;
    }

    products.forEach((product, index) => {
      const fieldPrefix = `products[${index}]`;

      if (!product.name || product.name.trim() === '') {
        errors.push({ field: `${fieldPrefix}.name`, message: 'Product name is required', code: 'REQUIRED_FIELD' });
      }

      if (product.price === undefined || product.price === null || product.price <= 0) {
        errors.push({ field: `${fieldPrefix}.price`, message: 'Product price must be greater than 0', code: 'INVALID_VALUE' });
      }

      if (product.quantity === undefined || product.quantity === null || product.quantity <= 0) {
        errors.push({ field: `${fieldPrefix}.quantity`, message: 'Product quantity must be greater than 0', code: 'INVALID_VALUE' });
      }
    });
  }

  /**
   * Update transformation configuration
   */
  public updateConfig(newConfig: Partial<TransformConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  /**
   * Get current transformation configuration
   */
  public getConfig(): TransformConfig {
    return { ...this.config };
  }

  /**
   * Validate Trendyol package data before transformation
   */
  public validateTrendyolPackage(trendyolPackage: TrendyolShipmentPackage): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Required fields for transformation
    if (!trendyolPackage.id) {
      errors.push('Package ID is required');
    }

    if (!trendyolPackage.orderId) {
      errors.push('Order ID is required');
    }

    if (!trendyolPackage.invoiceAddress) {
      errors.push('Invoice address is required');
    } else {
      if (!trendyolPackage.invoiceAddress.firstName && !trendyolPackage.invoiceAddress.lastName && !trendyolPackage.invoiceAddress.company) {
        errors.push('Customer name or company name is required');
      }

      if (!trendyolPackage.invoiceAddress.city) {
        warnings.push('Customer city is missing');
      }

      if (!trendyolPackage.invoiceAddress.countryCode) {
        warnings.push('Country code is missing');
      }
    }

    if (!trendyolPackage.lines || trendyolPackage.lines.length === 0) {
      errors.push('Package must contain at least one product line');
    } else {
      trendyolPackage.lines.forEach((line, index) => {
        if (!line.productName) {
          errors.push(`Line ${index + 1}: Product name is required`);
        }

        if (!line.amount || line.amount <= 0) {
          errors.push(`Line ${index + 1}: Amount must be greater than 0`);
        }

        if (!line.quantity || line.quantity <= 0) {
          errors.push(`Line ${index + 1}: Quantity must be greater than 0`);
        }

        if (!line.currencyCode) {
          warnings.push(`Line ${index + 1}: Currency code is missing`);
        }
      });
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate transformation configuration
   */
  public validateConfig(config: TransformConfig): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!config.cif || config.cif.trim() === '') {
      errors.push('CIF is required in configuration');
    }

    if (!config.seriesName || config.seriesName.trim() === '') {
      errors.push('Series name is required in configuration');
    }

    if (!config.language || config.language.trim() === '') {
      errors.push('Language is required in configuration');
    }

    if (config.workStation === undefined || config.workStation === null || config.workStation < 1) {
      errors.push('Work station must be a positive number');
    }

    if (config.defaultVatPercentage === undefined || config.defaultVatPercentage === null) {
      errors.push('Default VAT percentage is required');
    } else if (config.defaultVatPercentage < 0 || config.defaultVatPercentage > 100) {
      errors.push('Default VAT percentage must be between 0 and 100');
    }

    if (!config.defaultMeasuringUnit || config.defaultMeasuringUnit.trim() === '') {
      warnings.push('Default measuring unit is recommended');
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate that transformed data is compatible with Oblio API requirements
   */
  public validateOblioCompatibility(invoice: OblioInvoiceRequest): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Oblio-specific validations
    if (invoice.cif && invoice.cif.length > 20) {
      errors.push('CIF is too long for Oblio (max 20 characters)');
    }

    if (invoice.client.name && invoice.client.name.length > 200) {
      errors.push('Client name is too long for Oblio (max 200 characters)');
    }

    if (invoice.seriesName && invoice.seriesName.length > 10) {
      errors.push('Series name is too long for Oblio (max 10 characters)');
    }

    // Check for supported currencies
    const supportedCurrencies = ['RON', 'EUR', 'USD', 'GBP'];
    if (invoice.currency && !supportedCurrencies.includes(invoice.currency.toUpperCase())) {
      warnings.push(`Currency ${invoice.currency} may not be supported by Oblio`);
    }

    // Check for supported languages
    const supportedLanguages = ['RO', 'EN', 'DE', 'FR', 'IT', 'ES'];
    if (invoice.language && !supportedLanguages.includes(invoice.language.toUpperCase())) {
      warnings.push(`Language ${invoice.language} may not be supported by Oblio`);
    }

    // Product validations for Oblio
    invoice.products?.forEach((product, index) => {
      if (product.name && product.name.length > 200) {
        errors.push(`Product ${index + 1}: Name is too long for Oblio (max 200 characters)`);
      }

      if (product.code && product.code.length > 50) {
        errors.push(`Product ${index + 1}: Code is too long for Oblio (max 50 characters)`);
      }

      if (product.description && product.description.length > 1000) {
        errors.push(`Product ${index + 1}: Description is too long for Oblio (max 1000 characters)`);
      }

      if (product.measuringUnit && product.measuringUnit.length > 20) {
        errors.push(`Product ${index + 1}: Measuring unit is too long for Oblio (max 20 characters)`);
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
}
// Trendyol API Models based on API documentation

export interface TrendyolShipmentPackage {
  id: number;
  packageNumber: string;
  orderId: string;
  orderDate: string;
  status: string;
  deliveryType: string;
  agreedDeliveryDate: string;
  estimatedDeliveryStartDate: string;
  estimatedDeliveryEndDate: string;
  totalDiscount: number;
  totalTyDiscount: number;
  taxNumber: string;
  invoiceAddress: InvoiceAddress;
  deliveryAddress: DeliveryAddress;
  orderLines: OrderLine[];
  packageHistories: PackageHistory[];
  shipmentAddress: ShipmentAddress;
  customerInfo: CustomerInfo;
  cargoTrackingNumber: string;
  cargoTrackingLink: string;
  cargoSenderNumber: string;
  cargoProviderName: string;
  lines: PackageLine[];
}

export interface InvoiceAddress {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  cityCode: number;
  district: string;
  districtId: number;
  postalCode: string;
  countryCode: string;
  neighborhoodId: number;
  neighborhood: string;
}

export interface DeliveryAddress {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  cityCode: number;
  district: string;
  districtId: number;
  postalCode: string;
  countryCode: string;
  neighborhoodId: number;
  neighborhood: string;
}

export interface OrderLine {
  quantity: number;
  salesCampaignId: number;
  productSize: string;
  merchantSku: string;
  productName: string;
  productCode: number;
  merchantId: number;
  amount: number;
  discount: number;
  tyDiscount: number;
  discountDetails: DiscountDetail[];
  currencyCode: string;
  productColor: string;
  id: number;
  sku: string;
  vatBaseAmount: number;
  barcode: string;
  orderLineItemStatusName: string;
}

export interface PackageLine {
  quantity: number;
  salesCampaignId: number;
  productSize: string;
  merchantSku: string;
  productName: string;
  productCode: number;
  merchantId: number;
  amount: number;
  discount: number;
  tyDiscount: number;
  discountDetails: DiscountDetail[];
  currencyCode: string;
  productColor: string;
  id: number;
  sku: string;
  vatBaseAmount: number;
  barcode: string;
  orderLineItemStatusName: string;
}

export interface DiscountDetail {
  lineItemPrice: number;
  lineItemDiscount: number;
  lineItemTyDiscount: number;
}

export interface PackageHistory {
  createdDate: string;
  status: string;
}

export interface ShipmentAddress {
  id: number;
  firstName: string;
  lastName: string;
  company: string;
  address1: string;
  address2: string;
  city: string;
  cityCode: number;
  district: string;
  districtId: number;
  postalCode: string;
  countryCode: string;
  neighborhoodId: number;
  neighborhood: string;
}

export interface CustomerInfo {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  gsm: string;
}

// API Request/Response interfaces
export interface ShipmentPackageParams {
  page?: number;
  size?: number;
  orderByField?: 'PackageLastModifiedDate' | 'CreatedDate';
  orderByDirection?: 'ASC' | 'DESC';
}

export interface ShipmentPackageResponse {
  content: TrendyolShipmentPackage[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface InvoiceInfo {
  invoiceLink: string;
  invoiceNumber: string;
}

export interface TrendyolInvoiceLinkRequest {
  invoiceLink: string;
  shipmentPackageId: number;
}

// Trendyol API Error types
export interface TrendyolApiError {
  code: string;
  message: string;
  field?: string;
}

export interface TrendyolErrorResponse {
  errors?: TrendyolApiError[];
  message?: string;
  status?: number;
}
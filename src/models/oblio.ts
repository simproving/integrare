// Oblio API Models based on API documentation

export interface OblioInvoiceRequest {
  cif: string;
  client: OblioClient;
  issueDate: string;
  dueDate: string;
  currency: string;
  language: string;
  workStation: number;
  seriesName: string;
  useStock: number;
  products: OblioProduct[];
  issuerName?: string;
  issuerId?: string;
  noticeNumber?: string;
  internalNote?: string;
  deputyName?: string;
  deputyIdentityCard?: string;
  deputyAuto?: string;
  selesAgent?: string;
  mentions?: string;
  value?: number;
  collect?: OblioCollect;
}

export interface OblioClient {
  cif: string;
  name: string;
  rc?: string;
  code?: string;
  address?: string;
  state?: string;
  city?: string;
  country?: string;
  iban?: string;
  bank?: string;
  email?: string;
  phone?: string;
  contact?: string;
  vatPayer?: boolean;
}

export interface OblioProduct {
  name: string;
  code?: string;
  description?: string;
  price: number;
  measuringUnit?: string;
  currency?: string;
  vatName?: string;
  vatPercentage?: number;
  vatIncluded?: boolean;
  quantity: number;
  productType?: string;
}

export interface OblioCollect {
  type: string;
  maturity: string;
  value: number;
}

export interface OblioInvoiceResponse {
  status: number;
  statusMessage: string;
  data: {
    seriesName: string;
    number: string;
    link: string; // Direct URL to the invoice PDF - this is what we send to Trendyol
  };
}

export interface OblioInvoice {
  docId: string;
  number: string;
  date: string;
  dueDate: string;
  client: OblioClient;
  products: OblioProduct[];
  total: number;
  currency: string;
  status: string;
}

export interface OblioCompany {
  cif: string;
  name: string;
  vatPayer: boolean;
  anaf: boolean;
  vatOnCollection: boolean;
  country: string;
}

export interface OblioWorkStation {
  workStation: number;
  name: string;
}
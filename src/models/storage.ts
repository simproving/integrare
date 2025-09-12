// Storage models for configuration and session data

export interface EncryptedConfig {
  trendyol: {
    apiKey: string; // Encrypted
    secretKey: string; // Encrypted
    supplierId: string;
    storeFrontCode: string; // "TR", "INT", etc.
  };
  oblio: {
    email: string;
    secretKey: string; // Encrypted
    cif: string; // Company CIF for invoice creation
    workStation: number; // Default work station
  };
}

export interface AppSettings {
  autoRetryCount: number;
  theme: 'light' | 'dark';
  lastConfigUpdate: string;
  uiPreferences: {
    tablePageSize: number;
    defaultView: string;
  };
}

export interface SessionData {
  currentShipmentPackages: import('./trendyol').TrendyolShipmentPackage[];
  processedInvoices: import('./common').ProcessedInvoice[];
  syncLogs: import('./common').LogEntry[];
  lastFetchTime: string;
  selectedPackageIds: string[];
}
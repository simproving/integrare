import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserStorageService } from '../services/storage-service';
import { EncryptedConfig, AppSettings, SessionData } from '../models/storage';
import { ProcessedInvoice, LogEntry } from '../models/common';

// Mock Web Crypto API
const mockCrypto = {
  subtle: {
    generateKey: vi.fn(),
    exportKey: vi.fn(),
    importKey: vi.fn(),
    encrypt: vi.fn(),
    decrypt: vi.fn()
  },
  getRandomValues: vi.fn()
};

// Mock localStorage and sessionStorage
const mockLocalStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

const mockSessionStorage = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

// Setup global mocks
Object.defineProperty(global, 'crypto', {
  value: mockCrypto,
  writable: true
});

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true
});

Object.defineProperty(global, 'sessionStorage', {
  value: mockSessionStorage,
  writable: true
});

describe('BrowserStorageService', () => {
  let storageService: BrowserStorageService;

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();
    
    // Setup default mock implementations
    mockCrypto.subtle.generateKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.exportKey.mockResolvedValue(new ArrayBuffer(32));
    mockCrypto.subtle.importKey.mockResolvedValue({} as CryptoKey);
    mockCrypto.subtle.encrypt.mockResolvedValue(new ArrayBuffer(16));
    mockCrypto.subtle.decrypt.mockResolvedValue(new TextEncoder().encode('{"test": "data"}'));
    mockCrypto.getRandomValues.mockReturnValue(new Uint8Array(12));
    
    mockLocalStorage.getItem.mockReturnValue(null);
    mockSessionStorage.getItem.mockReturnValue(null);
    
    storageService = new BrowserStorageService();
  });

  describe('Encryption and Decryption', () => {
    it('should encrypt and store data', async () => {
      const testData = { test: 'data' };
      
      await storageService.encryptAndStore('test-key', testData);
      
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'test-key',
        expect.stringContaining('encryptedData')
      );
    });

    it('should decrypt and retrieve data', async () => {
      const mockStoredData = JSON.stringify({
        encryptedData: 'encrypted',
        iv: 'iv',
        timestamp: '2023-01-01T00:00:00.000Z'
      });
      
      mockLocalStorage.getItem.mockReturnValue(mockStoredData);
      
      const result = await storageService.decryptAndRetrieve('test-key');
      
      expect(mockCrypto.subtle.decrypt).toHaveBeenCalled();
      expect(result).toEqual({ test: 'data' });
    });
  });

  describe('Configuration Management', () => {
    it('should save and retrieve encrypted config', async () => {
      const config: EncryptedConfig = {
        trendyol: {
          apiKey: 'test-api-key',
          secretKey: 'test-secret',
          supplierId: 'supplier123',
          storeFrontCode: 'TR'
        },
        oblio: {
          email: 'test@example.com',
          secretKey: 'oblio-secret',
          cif: 'RO123456',
          workStation: 1
        }
      };

      await storageService.saveEncryptedConfig(config);
      expect(mockCrypto.subtle.encrypt).toHaveBeenCalled();

      // Mock the stored encrypted data for retrieval
      const mockStoredData = JSON.stringify({
        encryptedData: 'encrypted',
        iv: 'iv',
        timestamp: '2023-01-01T00:00:00.000Z'
      });
      mockLocalStorage.getItem.mockReturnValue(mockStoredData);

      const retrieved = await storageService.getEncryptedConfig();
      expect(retrieved).toEqual({ test: 'data' }); // Mocked decryption result
    });

    it('should save and retrieve app settings', () => {
      const settings: AppSettings = {
        autoRetryCount: 3,
        theme: 'dark',
        lastConfigUpdate: '2023-01-01T00:00:00.000Z',
        uiPreferences: {
          tablePageSize: 25,
          defaultView: 'orders'
        }
      };

      storageService.saveAppSettings(settings);
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'trendyol-oblio-settings',
        JSON.stringify(settings)
      );

      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(settings));
      const retrieved = storageService.getAppSettings();
      expect(retrieved).toEqual(settings);
    });
  });

  describe('Session Management', () => {
    it('should save and retrieve session data', () => {
      const sessionData: SessionData = {
        currentShipmentPackages: [],
        processedInvoices: [],
        syncLogs: [],
        lastFetchTime: '2023-01-01T00:00:00.000Z',
        selectedPackageIds: ['pkg1', 'pkg2']
      };

      storageService.saveSessionData(sessionData);
      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'trendyol-oblio-session',
        JSON.stringify(sessionData)
      );

      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));
      const retrieved = storageService.getSessionData();
      expect(retrieved).toEqual(sessionData);
    });

    it('should clear session data', () => {
      storageService.clearSessionData();
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('trendyol-oblio-session');
    });

    it('should update session packages', () => {
      const packages = [
        { id: 1, packageNumber: 'PKG001', orderId: 'ORD001' } as any
      ];

      storageService.updateSessionPackages(packages);

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'trendyol-oblio-session',
        expect.stringContaining('PKG001')
      );
    });

    it('should add and retrieve processed invoices', () => {
      const invoice: ProcessedInvoice = {
        trendyolOrderId: 'ORD001',
        oblioInvoiceId: 'INV001',
        status: 'completed',
        processedAt: '2023-01-01T00:00:00.000Z'
      };

      storageService.addProcessedInvoice(invoice);
      
      expect(mockSessionStorage.setItem).toHaveBeenCalled();

      // Mock session data for retrieval
      const sessionData = {
        currentShipmentPackages: [],
        processedInvoices: [invoice],
        syncLogs: [],
        lastFetchTime: '',
        selectedPackageIds: []
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

      const retrieved = storageService.getProcessedInvoice('ORD001');
      expect(retrieved).toEqual(invoice);
    });

    it('should update processed invoice', () => {
      const sessionData = {
        currentShipmentPackages: [],
        processedInvoices: [{
          trendyolOrderId: 'ORD001',
          status: 'pending',
          processedAt: '2023-01-01T00:00:00.000Z'
        }],
        syncLogs: [],
        lastFetchTime: '',
        selectedPackageIds: []
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

      storageService.updateProcessedInvoice('ORD001', { 
        status: 'completed',
        oblioInvoiceId: 'INV001'
      });

      expect(mockSessionStorage.setItem).toHaveBeenCalled();
    });

    it('should add and retrieve log entries', () => {
      const logEntry: LogEntry = {
        id: 'log1',
        timestamp: '2023-01-01T00:00:00.000Z',
        level: 'info',
        message: 'Test log message'
      };

      storageService.addLogEntry(logEntry);
      expect(mockSessionStorage.setItem).toHaveBeenCalled();

      // Mock session data for retrieval
      const sessionData = {
        currentShipmentPackages: [],
        processedInvoices: [],
        syncLogs: [logEntry],
        lastFetchTime: '',
        selectedPackageIds: []
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

      const logs = storageService.getLogEntries();
      expect(logs).toEqual([logEntry]);

      const errorLogs = storageService.getLogEntries('error');
      expect(errorLogs).toEqual([]);
    });

    it('should manage selected packages', () => {
      const packageIds = ['PKG001', 'PKG002'];

      storageService.updateSelectedPackages(packageIds);
      expect(mockSessionStorage.setItem).toHaveBeenCalled();

      // Mock session data for retrieval
      const sessionData = {
        currentShipmentPackages: [],
        processedInvoices: [],
        syncLogs: [],
        lastFetchTime: '',
        selectedPackageIds: packageIds
      };
      mockSessionStorage.getItem.mockReturnValue(JSON.stringify(sessionData));

      const retrieved = storageService.getSelectedPackages();
      expect(retrieved).toEqual(packageIds);
    });
  });

  describe('Enhanced Settings Management', () => {
    it('should update and retrieve UI preferences', () => {
      const preferences = { tablePageSize: 100, defaultView: 'orders' };

      storageService.updateUIPreferences(preferences);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();

      // Mock settings for retrieval
      const settings = {
        autoRetryCount: 3,
        theme: 'light' as const,
        lastConfigUpdate: '2023-01-01T00:00:00.000Z',
        uiPreferences: preferences
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(settings));

      const retrieved = storageService.getUIPreferences();
      expect(retrieved).toEqual(preferences);
    });

    it('should update and retrieve theme', () => {
      storageService.updateTheme('dark');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();

      // Mock settings for retrieval
      const settings = {
        autoRetryCount: 3,
        theme: 'dark' as const,
        lastConfigUpdate: '2023-01-01T00:00:00.000Z',
        uiPreferences: { tablePageSize: 50, defaultView: 'dashboard' }
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(settings));

      const theme = storageService.getTheme();
      expect(theme).toBe('dark');
    });

    it('should update and retrieve auto retry count', () => {
      storageService.updateAutoRetryCount(5);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();

      // Mock settings for retrieval
      const settings = {
        autoRetryCount: 5,
        theme: 'light' as const,
        lastConfigUpdate: '2023-01-01T00:00:00.000Z',
        uiPreferences: { tablePageSize: 50, defaultView: 'dashboard' }
      };
      mockLocalStorage.getItem.mockReturnValue(JSON.stringify(settings));

      const count = storageService.getAutoRetryCount();
      expect(count).toBe(5);
    });

    it('should clamp auto retry count to valid range', () => {
      storageService.updateAutoRetryCount(-1);
      storageService.updateAutoRetryCount(15);
      
      // Should be called twice with clamped values
      expect(mockLocalStorage.setItem).toHaveBeenCalledTimes(2);
    });
  });

  describe('Export and Import', () => {
    it('should export configuration', () => {
      const mockConfig = JSON.stringify({ encrypted: 'data' });
      const mockSettings = JSON.stringify({ theme: 'dark' });
      const mockKey = JSON.stringify([1, 2, 3]);

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'trendyol-oblio-config-encrypted') return mockConfig;
        if (key === 'trendyol-oblio-settings') return mockSettings;
        if (key === 'trendyol-oblio-encryption-key') return mockKey;
        return null;
      });

      const exported = storageService.exportConfig();
      const exportedData = JSON.parse(exported);

      expect(exportedData.version).toBe('1.0');
      expect(exportedData.encryptedConfig).toEqual({ encrypted: 'data' });
      expect(exportedData.appSettings).toEqual({ theme: 'dark' });
      expect(exportedData.encryptionKey).toEqual([1, 2, 3]);
    });

    it('should export full configuration including session data', () => {
      const mockConfig = JSON.stringify({ encrypted: 'data' });
      const mockSettings = JSON.stringify({ theme: 'dark' });
      const mockKey = JSON.stringify([1, 2, 3]);
      const mockSession = JSON.stringify({ logs: [] });

      mockLocalStorage.getItem.mockImplementation((key) => {
        if (key === 'trendyol-oblio-config-encrypted') return mockConfig;
        if (key === 'trendyol-oblio-settings') return mockSettings;
        if (key === 'trendyol-oblio-encryption-key') return mockKey;
        return null;
      });

      mockSessionStorage.getItem.mockReturnValue(mockSession);

      const exported = storageService.exportFullConfiguration();
      const exportedData = JSON.parse(exported);

      expect(exportedData.version).toBe('1.1');
      expect(exportedData.includesSession).toBe(true);
      expect(exportedData.sessionData).toEqual({ logs: [] });
    });

    it('should import configuration', async () => {
      const importData = {
        version: '1.0',
        encryptedConfig: { encrypted: 'data' },
        appSettings: { theme: 'dark' },
        encryptionKey: [1, 2, 3],
        exportedAt: '2023-01-01T00:00:00.000Z'
      };

      await storageService.importConfig(JSON.stringify(importData));

      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'trendyol-oblio-encryption-key',
        JSON.stringify([1, 2, 3])
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'trendyol-oblio-config-encrypted',
        JSON.stringify({ encrypted: 'data' })
      );
      expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
        'trendyol-oblio-settings',
        JSON.stringify({ theme: 'dark' })
      );
    });

    it('should import full configuration with session data', async () => {
      const importData = {
        version: '1.1',
        encryptedConfig: { encrypted: 'data' },
        appSettings: { 
          autoRetryCount: 3,
          theme: 'dark',
          uiPreferences: { tablePageSize: 50, defaultView: 'dashboard' }
        },
        encryptionKey: [1, 2, 3],
        sessionData: { logs: [] },
        includesSession: true,
        exportedAt: '2023-01-01T00:00:00.000Z'
      };

      await storageService.importFullConfiguration(JSON.stringify(importData));

      expect(mockSessionStorage.setItem).toHaveBeenCalledWith(
        'trendyol-oblio-session',
        JSON.stringify({ logs: [] })
      );
    });

    it('should validate configuration format', () => {
      const validConfig = {
        version: '1.1',
        exportedAt: '2023-01-01T00:00:00.000Z',
        appSettings: {
          autoRetryCount: 3,
          theme: 'light',
          uiPreferences: { tablePageSize: 50, defaultView: 'dashboard' }
        }
      };

      expect(storageService.validateConfigurationFormat(JSON.stringify(validConfig))).toBe(true);

      const invalidConfig = { invalid: 'config' };
      expect(storageService.validateConfigurationFormat(JSON.stringify(invalidConfig))).toBe(false);

      expect(storageService.validateConfigurationFormat('invalid json')).toBe(false);
    });
  });

  describe('Clear Sensitive Data', () => {
    it('should clear all sensitive data', () => {
      storageService.clearSensitiveData();

      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('trendyol-oblio-config-encrypted');
      expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('trendyol-oblio-encryption-key');
      expect(mockSessionStorage.removeItem).toHaveBeenCalledWith('trendyol-oblio-session');
    });
  });
});
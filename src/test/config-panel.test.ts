// Tests for configuration panel functionality

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { ConfigurationPanel } from '../ui/config-panel';
import { BrowserStorageService } from '../services/storage-service';
import { EncryptedConfig } from '../models/storage';

// Mock the API clients
vi.mock('../services/trendyol-client', () => ({
  TrendyolApiClient: vi.fn().mockImplementation(() => ({
    validateCredentials: vi.fn().mockResolvedValue(true)
  }))
}));

vi.mock('../services/oblio-client', () => ({
  OblioClient: vi.fn().mockImplementation(() => ({
    validateCredentials: vi.fn().mockResolvedValue(true)
  }))
}));

// Mock DOM elements
const mockElements = {
  'trendyol-config-form': document.createElement('form'),
  'oblio-config-form': document.createElement('form'),
  'config-validation-result': document.createElement('div'),
  'trendyol-api-key': document.createElement('input'),
  'trendyol-secret-key': document.createElement('input'),
  'trendyol-supplier-id': document.createElement('input'),
  'trendyol-storefront-code': document.createElement('select'),
  'oblio-email': document.createElement('input'),
  'oblio-secret-key': document.createElement('input'),
  'oblio-cif': document.createElement('input'),
  'oblio-work-station': document.createElement('input'),
  'save-config-btn': document.createElement('button'),
  'validate-trendyol-btn': document.createElement('button'),
  'validate-oblio-btn': document.createElement('button'),
  'export-config-btn': document.createElement('button'),
  'import-config-btn': document.createElement('button'),
  'import-config-input': document.createElement('input'),
  'message-container': document.createElement('div')
};

// Mock URL API
Object.defineProperty(global, 'URL', {
  value: {
    createObjectURL: vi.fn(() => 'blob:mock-url'),
    revokeObjectURL: vi.fn()
  }
});

// Mock File API
class MockFile {
  constructor(public content: string, public name: string, public options: any) {}
  
  async text(): Promise<string> {
    return this.content;
  }
}

// Replace File constructor in global scope
Object.defineProperty(global, 'File', {
  value: MockFile
});

describe('ConfigurationPanel', () => {
  let configPanel: ConfigurationPanel;
  let storageService: BrowserStorageService;

  beforeEach(() => {
    // Setup DOM mocks
    vi.spyOn(document, 'getElementById').mockImplementation((id: string) => {
      return mockElements[id as keyof typeof mockElements] || null;
    });

    // Reset all element values
    Object.values(mockElements).forEach(element => {
      if (element instanceof HTMLInputElement || element instanceof HTMLSelectElement) {
        element.value = '';
      }
    });

    // Setup form elements
    const trendyolForm = mockElements['trendyol-config-form'] as HTMLFormElement;
    const oblioForm = mockElements['oblio-config-form'] as HTMLFormElement;
    
    // Add form inputs to forms
    trendyolForm.appendChild(mockElements['trendyol-api-key']);
    trendyolForm.appendChild(mockElements['trendyol-secret-key']);
    trendyolForm.appendChild(mockElements['trendyol-supplier-id']);
    trendyolForm.appendChild(mockElements['trendyol-storefront-code']);
    
    oblioForm.appendChild(mockElements['oblio-email']);
    oblioForm.appendChild(mockElements['oblio-secret-key']);
    oblioForm.appendChild(mockElements['oblio-cif']);
    oblioForm.appendChild(mockElements['oblio-work-station']);

    // Set input names for FormData
    (mockElements['trendyol-api-key'] as HTMLInputElement).name = 'apiKey';
    (mockElements['trendyol-secret-key'] as HTMLInputElement).name = 'secretKey';
    (mockElements['trendyol-supplier-id'] as HTMLInputElement).name = 'supplierId';
    (mockElements['trendyol-storefront-code'] as HTMLSelectElement).name = 'storeFrontCode';
    (mockElements['oblio-email'] as HTMLInputElement).name = 'email';
    (mockElements['oblio-secret-key'] as HTMLInputElement).name = 'secretKey';
    (mockElements['oblio-cif'] as HTMLInputElement).name = 'cif';
    (mockElements['oblio-work-station'] as HTMLInputElement).name = 'workStation';

    // Mock querySelectorAll for forms
    const trendyolForm = mockElements['trendyol-config-form'] as HTMLFormElement;
    const oblioForm = mockElements['oblio-config-form'] as HTMLFormElement;
    
    trendyolForm.querySelectorAll = vi.fn((selector: string) => {
      if (selector === 'input, select') {
        return [
          mockElements['trendyol-api-key'],
          mockElements['trendyol-secret-key'],
          mockElements['trendyol-supplier-id'],
          mockElements['trendyol-storefront-code']
        ] as any;
      }
      return [] as any;
    });
    
    oblioForm.querySelectorAll = vi.fn((selector: string) => {
      if (selector === 'input, select') {
        return [
          mockElements['oblio-email'],
          mockElements['oblio-secret-key'],
          mockElements['oblio-cif'],
          mockElements['oblio-work-station']
        ] as any;
      }
      return [] as any;
    });

    // Mock FormData to work with our mock elements
    global.FormData = class MockFormData {
      private data: Map<string, string> = new Map();
      
      constructor(form?: HTMLFormElement) {
        if (form) {
          // Extract values from form elements
          const inputs = form.querySelectorAll('input, select');
          inputs.forEach((input: any) => {
            if (input.name && input.value !== undefined) {
              this.data.set(input.name, input.value);
            }
          });
        }
      }
      
      get(name: string): string | null {
        return this.data.get(name) || null;
      }
      
      set(name: string, value: string): void {
        this.data.set(name, value);
      }
    } as any;

    storageService = new BrowserStorageService();
    configPanel = new ConfigurationPanel(storageService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Configuration Loading', () => {
    it('should load configuration from storage service', async () => {
      const mockConfig: EncryptedConfig = {
        trendyol: {
          apiKey: 'test-api-key',
          secretKey: 'test-secret-key',
          supplierId: 'test-supplier-id',
          storeFrontCode: 'TR'
        },
        oblio: {
          email: 'test@example.com',
          secretKey: 'test-oblio-secret',
          cif: 'RO12345678',
          workStation: 1
        }
      };

      vi.spyOn(storageService, 'getEncryptedConfig').mockResolvedValue(mockConfig);

      await configPanel.loadConfiguration();

      expect((mockElements['trendyol-api-key'] as HTMLInputElement).value).toBe('test-api-key');
      expect((mockElements['trendyol-secret-key'] as HTMLInputElement).value).toBe('test-secret-key');
      expect((mockElements['trendyol-supplier-id'] as HTMLInputElement).value).toBe('test-supplier-id');
      expect((mockElements['trendyol-storefront-code'] as HTMLSelectElement).value).toBe('TR');
      expect((mockElements['oblio-email'] as HTMLInputElement).value).toBe('test@example.com');
      expect((mockElements['oblio-secret-key'] as HTMLInputElement).value).toBe('test-oblio-secret');
      expect((mockElements['oblio-cif'] as HTMLInputElement).value).toBe('RO12345678');
      expect((mockElements['oblio-work-station'] as HTMLInputElement).value).toBe('1');
    });

    it('should handle missing configuration gracefully', async () => {
      vi.spyOn(storageService, 'getEncryptedConfig').mockResolvedValue(null);

      await configPanel.loadConfiguration();

      // Should not throw and should set empty values
      expect((mockElements['trendyol-api-key'] as HTMLInputElement).value).toBe('');
      expect((mockElements['oblio-email'] as HTMLInputElement).value).toBe('');
    });
  });

  describe('Configuration Saving', () => {
    it('should save configuration to storage service', async () => {
      // Set form values
      (mockElements['trendyol-api-key'] as HTMLInputElement).value = 'new-api-key';
      (mockElements['trendyol-secret-key'] as HTMLInputElement).value = 'new-secret-key';
      (mockElements['trendyol-supplier-id'] as HTMLInputElement).value = 'new-supplier-id';
      (mockElements['trendyol-storefront-code'] as HTMLSelectElement).value = 'INT';
      (mockElements['oblio-email'] as HTMLInputElement).value = 'new@example.com';
      (mockElements['oblio-secret-key'] as HTMLInputElement).value = 'new-oblio-secret';
      (mockElements['oblio-cif'] as HTMLInputElement).value = 'RO87654321';
      (mockElements['oblio-work-station'] as HTMLInputElement).value = '2';

      const saveConfigSpy = vi.spyOn(storageService, 'saveEncryptedConfig').mockResolvedValue();

      await configPanel.saveConfiguration();

      expect(saveConfigSpy).toHaveBeenCalledWith({
        trendyol: {
          apiKey: 'new-api-key',
          secretKey: 'new-secret-key',
          supplierId: 'new-supplier-id',
          storeFrontCode: 'INT'
        },
        oblio: {
          email: 'new@example.com',
          secretKey: 'new-oblio-secret',
          cif: 'RO87654321',
          workStation: 2
        }
      });
    });

    it('should validate required fields before saving', async () => {
      // Leave required fields empty
      (mockElements['trendyol-api-key'] as HTMLInputElement).value = '';
      (mockElements['trendyol-secret-key'] as HTMLInputElement).value = 'secret';
      (mockElements['trendyol-supplier-id'] as HTMLInputElement).value = 'supplier';

      const saveConfigSpy = vi.spyOn(storageService, 'saveEncryptedConfig');

      await configPanel.saveConfiguration();

      // Should not call save if validation fails
      expect(saveConfigSpy).not.toHaveBeenCalled();
    });
  });

  describe('Credential Validation', () => {
    it('should validate Trendyol credentials', async () => {
      // Set form values
      (mockElements['trendyol-api-key'] as HTMLInputElement).value = 'test-api-key';
      (mockElements['trendyol-secret-key'] as HTMLInputElement).value = 'test-secret-key';
      (mockElements['trendyol-supplier-id'] as HTMLInputElement).value = 'test-supplier-id';
      (mockElements['trendyol-storefront-code'] as HTMLSelectElement).value = 'TR';

      await configPanel.validateTrendyolCredentials();

      // Should show success message (mocked to return true)
      expect(mockElements['config-validation-result'].textContent).toContain('valid');
    });

    it('should validate Oblio credentials', async () => {
      // Set form values
      (mockElements['oblio-email'] as HTMLInputElement).value = 'test@example.com';
      (mockElements['oblio-secret-key'] as HTMLInputElement).value = 'test-secret';
      (mockElements['oblio-cif'] as HTMLInputElement).value = 'RO12345678';

      await configPanel.validateOblioCredentials();

      // Should show success message (mocked to return true)
      expect(mockElements['config-validation-result'].textContent).toContain('valid');
    });

    it('should handle validation errors gracefully', async () => {
      // Leave required fields empty
      (mockElements['trendyol-api-key'] as HTMLInputElement).value = '';

      await configPanel.validateTrendyolCredentials();

      // Should show error message for missing credentials
      expect(mockElements['config-validation-result'].textContent).toContain('Please fill in all');
    });
  });

  describe('Configuration Export/Import', () => {
    it('should export configuration using storage service', async () => {
      const mockConfigString = JSON.stringify({
        version: '1.1',
        exportedAt: '2023-01-01T00:00:00.000Z',
        encryptedConfig: { /* mock data */ },
        appSettings: { /* mock data */ }
      });

      vi.spyOn(storageService, 'exportFullConfiguration').mockReturnValue(mockConfigString);
      
      const mockLink = document.createElement('a');
      vi.spyOn(document, 'createElement').mockReturnValue(mockLink);
      vi.spyOn(document.body, 'appendChild').mockImplementation(() => mockLink);
      vi.spyOn(document.body, 'removeChild').mockImplementation(() => mockLink);
      vi.spyOn(mockLink, 'click').mockImplementation(() => {});

      await configPanel.exportConfiguration();

      expect(storageService.exportFullConfiguration).toHaveBeenCalled();
      expect(mockLink.click).toHaveBeenCalled();
    });

    it('should import configuration using storage service', async () => {
      const mockConfigString = JSON.stringify({
        version: '1.1',
        exportedAt: '2023-01-01T00:00:00.000Z',
        encryptedConfig: {
          trendyol: { apiKey: 'imported-key', secretKey: 'imported-secret', supplierId: 'imported-id', storeFrontCode: 'TR' },
          oblio: { email: 'imported@example.com', secretKey: 'imported-oblio-secret', cif: 'RO11111111', workStation: 1 }
        }
      });

      const mockFile = new MockFile(mockConfigString, 'config.json', { type: 'application/json' }) as any;
      
      vi.spyOn(storageService, 'validateConfigurationFormat').mockReturnValue(true);
      vi.spyOn(storageService, 'importFullConfiguration').mockResolvedValue();
      vi.spyOn(storageService, 'getEncryptedConfig').mockResolvedValue({
        trendyol: { apiKey: 'imported-key', secretKey: 'imported-secret', supplierId: 'imported-id', storeFrontCode: 'TR' },
        oblio: { email: 'imported@example.com', secretKey: 'imported-oblio-secret', cif: 'RO11111111', workStation: 1 }
      });

      await configPanel.importConfiguration(mockFile);

      expect(storageService.validateConfigurationFormat).toHaveBeenCalledWith(mockConfigString);
      expect(storageService.importFullConfiguration).toHaveBeenCalledWith(mockConfigString);
    });

    it('should reject invalid configuration files', async () => {
      const invalidConfigString = 'invalid json';
      const mockFile = new MockFile(invalidConfigString, 'config.json', { type: 'application/json' }) as any;
      
      vi.spyOn(storageService, 'validateConfigurationFormat').mockReturnValue(false);

      await configPanel.importConfiguration(mockFile);

      expect(storageService.validateConfigurationFormat).toHaveBeenCalledWith(invalidConfigString);
      // Should show error message without calling import
      expect(vi.spyOn(storageService, 'importFullConfiguration')).not.toHaveBeenCalled();
    });
  });

  describe('Configuration Status', () => {
    it('should check if configuration is complete', async () => {
      const completeConfig: EncryptedConfig = {
        trendyol: {
          apiKey: 'test-api-key',
          secretKey: 'test-secret-key',
          supplierId: 'test-supplier-id',
          storeFrontCode: 'TR'
        },
        oblio: {
          email: 'test@example.com',
          secretKey: 'test-oblio-secret',
          cif: 'RO12345678',
          workStation: 1
        }
      };

      vi.spyOn(storageService, 'getEncryptedConfig').mockResolvedValue(completeConfig);

      const isComplete = await configPanel.isConfigurationComplete();

      expect(isComplete).toBe(true);
    });

    it('should return false for incomplete configuration', async () => {
      const incompleteConfig: EncryptedConfig = {
        trendyol: {
          apiKey: 'test-api-key',
          secretKey: '', // Missing secret key
          supplierId: 'test-supplier-id',
          storeFrontCode: 'TR'
        },
        oblio: {
          email: 'test@example.com',
          secretKey: 'test-oblio-secret',
          cif: 'RO12345678',
          workStation: 1
        }
      };

      vi.spyOn(storageService, 'getEncryptedConfig').mockResolvedValue(incompleteConfig);

      const isComplete = await configPanel.isConfigurationComplete();

      expect(isComplete).toBe(false);
    });

    it('should get configuration status', async () => {
      const mockConfig: EncryptedConfig = {
        trendyol: {
          apiKey: 'test-api-key',
          secretKey: 'test-secret-key',
          supplierId: 'test-supplier-id',
          storeFrontCode: 'TR'
        },
        oblio: {
          email: 'test@example.com',
          secretKey: 'test-oblio-secret',
          cif: 'RO12345678',
          workStation: 1
        }
      };

      const mockSettings = {
        autoRetryCount: 3,
        theme: 'light' as const,
        lastConfigUpdate: '2023-01-01T00:00:00.000Z',
        uiPreferences: {
          tablePageSize: 50,
          defaultView: 'dashboard'
        }
      };

      vi.spyOn(storageService, 'getEncryptedConfig').mockResolvedValue(mockConfig);
      vi.spyOn(storageService, 'getAppSettings').mockReturnValue(mockSettings);

      const status = await configPanel.getConfigurationStatus();

      expect(status.isComplete).toBe(true);
      expect(status.trendyolConfigured).toBe(true);
      expect(status.oblioConfigured).toBe(true);
      expect(status.lastUpdate).toBe('2023-01-01T00:00:00.000Z');
    });
  });

  describe('Configuration Clearing', () => {
    it('should clear all configuration data', async () => {
      vi.spyOn(storageService, 'clearSensitiveData').mockImplementation(() => {});
      
      // Mock form reset
      const trendyolForm = mockElements['trendyol-config-form'] as HTMLFormElement;
      const oblioForm = mockElements['oblio-config-form'] as HTMLFormElement;
      vi.spyOn(trendyolForm, 'reset').mockImplementation(() => {});
      vi.spyOn(oblioForm, 'reset').mockImplementation(() => {});

      await configPanel.clearConfiguration();

      expect(storageService.clearSensitiveData).toHaveBeenCalled();
      expect(trendyolForm.reset).toHaveBeenCalled();
      expect(oblioForm.reset).toHaveBeenCalled();
    });
  });
});
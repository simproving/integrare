// Storage service interface for encrypted credential management

import { EncryptedConfig, AppSettings, SessionData } from '../models/storage';

export interface StorageService {
  encryptAndStore(key: string, data: any): Promise<void>;
  decryptAndRetrieve(key: string): Promise<any>;
  clearSensitiveData(): void;
  exportConfig(): string;
  importConfig(configString: string): Promise<void>;

  // Specific methods for different storage types
  saveEncryptedConfig(config: EncryptedConfig): Promise<void>;
  getEncryptedConfig(): Promise<EncryptedConfig | null>;
  saveAppSettings(settings: AppSettings): void;
  getAppSettings(): AppSettings | null;
  saveSessionData(data: SessionData): void;
  getSessionData(): SessionData | null;
  clearSessionData(): void;

  // Enhanced session management methods
  updateSessionPackages(packages: import('../models/trendyol').TrendyolShipmentPackage[]): void;
  addProcessedInvoice(invoice: import('../models/common').ProcessedInvoice): void;
  updateProcessedInvoice(orderId: string, updates: Partial<import('../models/common').ProcessedInvoice>): void;
  getProcessedInvoice(orderId: string): import('../models/common').ProcessedInvoice | null;
  addLogEntry(entry: import('../models/common').LogEntry): void;
  getLogEntries(level?: 'info' | 'warn' | 'error'): import('../models/common').LogEntry[];
  clearLogEntries(): void;
  updateSelectedPackages(packageIds: string[]): void;
  getSelectedPackages(): string[];

  // Enhanced settings management methods
  updateUIPreferences(preferences: Partial<AppSettings['uiPreferences']>): void;
  getUIPreferences(): AppSettings['uiPreferences'];
  updateTheme(theme: 'light' | 'dark'): void;
  getTheme(): 'light' | 'dark';
  updateAutoRetryCount(count: number): void;
  getAutoRetryCount(): number;

  // Configuration backup methods
  exportFullConfiguration(): string;
  importFullConfiguration(configString: string): Promise<void>;
  validateConfigurationFormat(configString: string): boolean;
}

export class BrowserStorageService implements StorageService {
  private readonly ENCRYPTED_CONFIG_KEY = 'trendyol-oblio-config-encrypted';
  private readonly APP_SETTINGS_KEY = 'trendyol-oblio-settings';
  private readonly SESSION_DATA_KEY = 'trendyol-oblio-session';
  private readonly ENCRYPTION_KEY_NAME = 'trendyol-oblio-encryption-key';

  private encryptionKey: CryptoKey | null = null;

  /**
   * Generate or retrieve the encryption key for data encryption
   */
  private async getEncryptionKey(): Promise<CryptoKey> {
    if (this.encryptionKey) {
      return this.encryptionKey;
    }

    // Try to retrieve existing key from localStorage
    const storedKey = localStorage.getItem(this.ENCRYPTION_KEY_NAME);
    if (storedKey) {
      try {
        const keyData = JSON.parse(storedKey);
        this.encryptionKey = await crypto.subtle.importKey(
          'raw',
          new Uint8Array(keyData),
          { name: 'AES-GCM' },
          false,
          ['encrypt', 'decrypt']
        );
        return this.encryptionKey;
      } catch (error) {
        console.warn('Failed to import stored encryption key, generating new one');
      }
    }

    // Generate new key if none exists or import failed
    this.encryptionKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt']
    );

    // Store the key for future use
    const exportedKey = await crypto.subtle.exportKey('raw', this.encryptionKey);
    localStorage.setItem(this.ENCRYPTION_KEY_NAME, JSON.stringify(Array.from(new Uint8Array(exportedKey))));

    return this.encryptionKey;
  }

  /**
   * Encrypt data using AES-GCM
   */
  private async encryptData(data: string): Promise<{ encryptedData: string; iv: string }> {
    const key = await this.getEncryptionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
    const encodedData = new TextEncoder().encode(data);

    const encryptedBuffer = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encodedData
    );

    return {
      encryptedData: Array.from(new Uint8Array(encryptedBuffer)).map(b => b.toString(16).padStart(2, '0')).join(''),
      iv: Array.from(iv).map(b => b.toString(16).padStart(2, '0')).join('')
    };
  }

  /**
   * Decrypt data using AES-GCM
   */
  private async decryptData(encryptedData: string, iv: string): Promise<string> {
    const key = await this.getEncryptionKey();
    const ivArray = new Uint8Array(iv.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));
    const encryptedArray = new Uint8Array(encryptedData.match(/.{2}/g)!.map(byte => parseInt(byte, 16)));

    const decryptedBuffer = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: ivArray },
      key,
      encryptedArray
    );

    return new TextDecoder().decode(decryptedBuffer);
  }

  async encryptAndStore(key: string, data: any): Promise<void> {
    try {
      const jsonData = JSON.stringify(data);
      const { encryptedData, iv } = await this.encryptData(jsonData);

      const storageData = {
        encryptedData,
        iv,
        timestamp: new Date().toISOString()
      };

      localStorage.setItem(key, JSON.stringify(storageData));
    } catch (error) {
      throw new Error(`Failed to encrypt and store data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async decryptAndRetrieve(key: string): Promise<any> {
    try {
      const storedData = localStorage.getItem(key);
      if (!storedData) {
        return null;
      }

      const { encryptedData, iv } = JSON.parse(storedData);
      const decryptedJson = await this.decryptData(encryptedData, iv);
      return JSON.parse(decryptedJson);
    } catch (error) {
      throw new Error(`Failed to decrypt and retrieve data: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  clearSensitiveData(): void {
    // Remove encrypted configuration
    localStorage.removeItem(this.ENCRYPTED_CONFIG_KEY);
    // Remove encryption key
    localStorage.removeItem(this.ENCRYPTION_KEY_NAME);
    // Clear session data
    this.clearSessionData();
    // Reset in-memory key
    this.encryptionKey = null;
  }

  exportConfig(): string {
    try {
      const encryptedConfig = localStorage.getItem(this.ENCRYPTED_CONFIG_KEY);
      const appSettings = localStorage.getItem(this.APP_SETTINGS_KEY);
      const encryptionKey = localStorage.getItem(this.ENCRYPTION_KEY_NAME);

      const exportData = {
        encryptedConfig: encryptedConfig ? JSON.parse(encryptedConfig) : null,
        appSettings: appSettings ? JSON.parse(appSettings) : null,
        encryptionKey: encryptionKey ? JSON.parse(encryptionKey) : null,
        exportedAt: new Date().toISOString(),
        version: '1.0'
      };

      return JSON.stringify(exportData);
    } catch (error) {
      throw new Error(`Failed to export configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async importConfig(configString: string): Promise<void> {
    try {
      const importData = JSON.parse(configString);

      if (!importData.version || importData.version !== '1.0') {
        throw new Error('Unsupported configuration version');
      }

      // Import encryption key first
      if (importData.encryptionKey) {
        localStorage.setItem(this.ENCRYPTION_KEY_NAME, JSON.stringify(importData.encryptionKey));
        this.encryptionKey = null; // Reset to force re-import
      }

      // Import encrypted configuration
      if (importData.encryptedConfig) {
        localStorage.setItem(this.ENCRYPTED_CONFIG_KEY, JSON.stringify(importData.encryptedConfig));
      }

      // Import app settings
      if (importData.appSettings) {
        localStorage.setItem(this.APP_SETTINGS_KEY, JSON.stringify(importData.appSettings));
      }
    } catch (error) {
      throw new Error(`Failed to import configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async saveEncryptedConfig(config: EncryptedConfig): Promise<void> {
    await this.encryptAndStore(this.ENCRYPTED_CONFIG_KEY, config);
  }

  async getEncryptedConfig(): Promise<EncryptedConfig | null> {
    return await this.decryptAndRetrieve(this.ENCRYPTED_CONFIG_KEY);
  }

  saveAppSettings(settings: AppSettings): void {
    localStorage.setItem(this.APP_SETTINGS_KEY, JSON.stringify(settings));
  }

  getAppSettings(): AppSettings | null {
    const stored = localStorage.getItem(this.APP_SETTINGS_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  saveSessionData(data: SessionData): void {
    sessionStorage.setItem(this.SESSION_DATA_KEY, JSON.stringify(data));
  }

  getSessionData(): SessionData | null {
    const stored = sessionStorage.getItem(this.SESSION_DATA_KEY);
    return stored ? JSON.parse(stored) : null;
  }

  clearSessionData(): void {
    sessionStorage.removeItem(this.SESSION_DATA_KEY);
  }

  // Enhanced session management methods
  updateSessionPackages(packages: import('../models/trendyol').TrendyolShipmentPackage[]): void {
    const sessionData = this.getSessionData() || this.getDefaultSessionData();
    sessionData.currentShipmentPackages = packages;
    sessionData.lastFetchTime = new Date().toISOString();
    this.saveSessionData(sessionData);
  }

  addProcessedInvoice(invoice: import('../models/common').ProcessedInvoice): void {
    const sessionData = this.getSessionData() || this.getDefaultSessionData();
    const existingIndex = sessionData.processedInvoices.findIndex(
      inv => inv.trendyolOrderId === invoice.trendyolOrderId
    );

    if (existingIndex >= 0) {
      sessionData.processedInvoices[existingIndex] = invoice;
    } else {
      sessionData.processedInvoices.push(invoice);
    }

    this.saveSessionData(sessionData);
  }

  updateProcessedInvoice(orderId: string, updates: Partial<import('../models/common').ProcessedInvoice>): void {
    const sessionData = this.getSessionData() || this.getDefaultSessionData();
    const invoiceIndex = sessionData.processedInvoices.findIndex(
      inv => inv.trendyolOrderId === orderId
    );

    if (invoiceIndex >= 0) {
      const existingInvoice = sessionData.processedInvoices[invoiceIndex];
      if (!existingInvoice) {
        return; // Exit early if invoice doesn't exist
      }

      // Only update properties that are actually provided in the updates object
      const updatedInvoice: import('../models/common').ProcessedInvoice = {
        trendyolOrderId: existingInvoice.trendyolOrderId, // Always preserve required field
        processedAt: updates.processedAt !== undefined ? updates.processedAt : existingInvoice.processedAt,
        status: updates.status !== undefined ? updates.status : existingInvoice.status
      };

      // Only include optional properties if they have actual values
      const oblioInvoiceId = updates.oblioInvoiceId !== undefined ? updates.oblioInvoiceId : existingInvoice.oblioInvoiceId;
      if (oblioInvoiceId !== undefined) {
        updatedInvoice.oblioInvoiceId = oblioInvoiceId;
      }

      const errorMessage = updates.errorMessage !== undefined ? updates.errorMessage : existingInvoice.errorMessage;
      if (errorMessage !== undefined) {
        updatedInvoice.errorMessage = errorMessage;
      }

      const retryCount = updates.retryCount !== undefined ? updates.retryCount : existingInvoice.retryCount;
      if (retryCount !== undefined) {
        updatedInvoice.retryCount = retryCount;
      }

      const lastRetryAt = updates.lastRetryAt !== undefined ? updates.lastRetryAt : existingInvoice.lastRetryAt;
      if (lastRetryAt !== undefined) {
        updatedInvoice.lastRetryAt = lastRetryAt;
      }

      const nextRetryAt = updates.nextRetryAt !== undefined ? updates.nextRetryAt : existingInvoice.nextRetryAt;
      if (nextRetryAt !== undefined) {
        updatedInvoice.nextRetryAt = nextRetryAt;
      }

      sessionData.processedInvoices[invoiceIndex] = updatedInvoice;
      this.saveSessionData(sessionData);
    }
  }

  getProcessedInvoice(orderId: string): import('../models/common').ProcessedInvoice | null {
    const sessionData = this.getSessionData();
    if (!sessionData) return null;

    return sessionData.processedInvoices.find(
      inv => inv.trendyolOrderId === orderId
    ) || null;
  }

  addLogEntry(entry: import('../models/common').LogEntry): void {
    const sessionData = this.getSessionData() || this.getDefaultSessionData();
    sessionData.syncLogs.push(entry);

    // Keep only the last 1000 log entries to prevent memory issues
    if (sessionData.syncLogs.length > 1000) {
      sessionData.syncLogs = sessionData.syncLogs.slice(-1000);
    }

    this.saveSessionData(sessionData);
  }

  getLogEntries(level?: 'info' | 'warn' | 'error'): import('../models/common').LogEntry[] {
    const sessionData = this.getSessionData();
    if (!sessionData) return [];

    if (level) {
      return sessionData.syncLogs.filter(log => log.level === level);
    }

    return [...sessionData.syncLogs];
  }

  clearLogEntries(): void {
    const sessionData = this.getSessionData() || this.getDefaultSessionData();
    sessionData.syncLogs = [];
    this.saveSessionData(sessionData);
  }

  updateSelectedPackages(packageIds: string[]): void {
    const sessionData = this.getSessionData() || this.getDefaultSessionData();
    sessionData.selectedPackageIds = [...packageIds];
    this.saveSessionData(sessionData);
  }

  getSelectedPackages(): string[] {
    const sessionData = this.getSessionData();
    return sessionData ? [...sessionData.selectedPackageIds] : [];
  }

  // Enhanced settings management methods
  updateUIPreferences(preferences: Partial<AppSettings['uiPreferences']>): void {
    const settings = this.getAppSettings() || this.getDefaultAppSettings();
    settings.uiPreferences = { ...settings.uiPreferences, ...preferences };
    settings.lastConfigUpdate = new Date().toISOString();
    this.saveAppSettings(settings);
  }

  getUIPreferences(): AppSettings['uiPreferences'] {
    const settings = this.getAppSettings();
    return settings ? settings.uiPreferences : this.getDefaultAppSettings().uiPreferences;
  }

  updateTheme(theme: 'light' | 'dark'): void {
    const settings = this.getAppSettings() || this.getDefaultAppSettings();
    settings.theme = theme;
    settings.lastConfigUpdate = new Date().toISOString();
    this.saveAppSettings(settings);
  }

  getTheme(): 'light' | 'dark' {
    const settings = this.getAppSettings();
    return settings ? settings.theme : this.getDefaultAppSettings().theme;
  }

  updateAutoRetryCount(count: number): void {
    const settings = this.getAppSettings() || this.getDefaultAppSettings();
    settings.autoRetryCount = Math.max(0, Math.min(10, count)); // Clamp between 0 and 10
    settings.lastConfigUpdate = new Date().toISOString();
    this.saveAppSettings(settings);
  }

  getAutoRetryCount(): number {
    const settings = this.getAppSettings();
    return settings ? settings.autoRetryCount : this.getDefaultAppSettings().autoRetryCount;
  }

  // Configuration backup methods
  exportFullConfiguration(): string {
    try {
      const encryptedConfig = localStorage.getItem(this.ENCRYPTED_CONFIG_KEY);
      const appSettings = localStorage.getItem(this.APP_SETTINGS_KEY);
      const encryptionKey = localStorage.getItem(this.ENCRYPTION_KEY_NAME);
      const sessionData = sessionStorage.getItem(this.SESSION_DATA_KEY);

      const exportData = {
        encryptedConfig: encryptedConfig ? JSON.parse(encryptedConfig) : null,
        appSettings: appSettings ? JSON.parse(appSettings) : null,
        encryptionKey: encryptionKey ? JSON.parse(encryptionKey) : null,
        sessionData: sessionData ? JSON.parse(sessionData) : null,
        exportedAt: new Date().toISOString(),
        version: '1.1',
        includesSession: true
      };

      return JSON.stringify(exportData, null, 2);
    } catch (error) {
      throw new Error(`Failed to export full configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async importFullConfiguration(configString: string): Promise<void> {
    try {
      const importData = JSON.parse(configString);

      if (!this.validateConfigurationFormat(configString)) {
        throw new Error('Invalid configuration format');
      }

      // Import encryption key first
      if (importData.encryptionKey) {
        localStorage.setItem(this.ENCRYPTION_KEY_NAME, JSON.stringify(importData.encryptionKey));
        this.encryptionKey = null; // Reset to force re-import
      }

      // Import encrypted configuration
      if (importData.encryptedConfig) {
        localStorage.setItem(this.ENCRYPTED_CONFIG_KEY, JSON.stringify(importData.encryptedConfig));
      }

      // Import app settings
      if (importData.appSettings) {
        localStorage.setItem(this.APP_SETTINGS_KEY, JSON.stringify(importData.appSettings));
      }

      // Import session data if included and user wants it
      if (importData.includesSession && importData.sessionData) {
        sessionStorage.setItem(this.SESSION_DATA_KEY, JSON.stringify(importData.sessionData));
      }
    } catch (error) {
      throw new Error(`Failed to import full configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  validateConfigurationFormat(configString: string): boolean {
    try {
      const config = JSON.parse(configString);

      // Check required fields
      if (!config.version || !config.exportedAt) {
        return false;
      }

      // Check version compatibility
      const supportedVersions = ['1.0', '1.1'];
      if (!supportedVersions.includes(config.version)) {
        return false;
      }

      // Validate structure if data exists
      if (config.appSettings) {
        const settings = config.appSettings;
        if (typeof settings.autoRetryCount !== 'number' ||
          !['light', 'dark'].includes(settings.theme) ||
          !settings.uiPreferences) {
          return false;
        }
      }

      return true;
    } catch {
      return false;
    }
  }

  // Helper methods for default values
  private getDefaultSessionData(): SessionData {
    return {
      currentShipmentPackages: [],
      processedInvoices: [],
      syncLogs: [],
      lastFetchTime: '',
      selectedPackageIds: []
    };
  }

  private getDefaultAppSettings(): AppSettings {
    return {
      autoRetryCount: 3,
      theme: 'light',
      lastConfigUpdate: new Date().toISOString(),
      uiPreferences: {
        tablePageSize: 50,
        defaultView: 'dashboard'
      }
    };
  }
}
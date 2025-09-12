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
}
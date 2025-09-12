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

  async encryptAndStore(key: string, data: any): Promise<void> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async decryptAndRetrieve(key: string): Promise<any> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  clearSensitiveData(): void {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  exportConfig(): string {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async importConfig(configString: string): Promise<void> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async saveEncryptedConfig(config: EncryptedConfig): Promise<void> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
  }

  async getEncryptedConfig(): Promise<EncryptedConfig | null> {
    // Implementation will be added in later tasks
    throw new Error('Not implemented yet');
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
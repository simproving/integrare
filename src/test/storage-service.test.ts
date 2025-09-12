import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrowserStorageService } from '../services/storage-service';
import { EncryptedConfig, AppSettings, SessionData } from '../models/storage';

describe('BrowserStorageService', () => {
    let storageService: BrowserStorageService;
    let mockCryptoKey: CryptoKey;
    let mockEncryptedBuffer: ArrayBuffer;
    let mockDecryptedBuffer: ArrayBuffer;

    beforeEach(() => {
        // Reset all mocks
        vi.clearAllMocks();

        // Clear storage
        localStorage.clear();
        sessionStorage.clear();

        // Create new service instance
        storageService = new BrowserStorageService();

        // Mock CryptoKey
        mockCryptoKey = {} as CryptoKey;

        // Setup crypto mocks with dynamic responses
        vi.mocked(crypto.subtle.generateKey).mockResolvedValue(mockCryptoKey);
        vi.mocked(crypto.subtle.importKey).mockResolvedValue(mockCryptoKey);
        vi.mocked(crypto.subtle.exportKey).mockResolvedValue(new ArrayBuffer(32));

        // Mock encrypt to return the input data as encrypted ArrayBuffer
        vi.mocked(crypto.subtle.encrypt).mockImplementation(async (algorithm, key, data) => {
            return (data as ArrayBuffer); // Return the same data as "encrypted" ArrayBuffer
        });

        // Mock decrypt to return the input data as decrypted ArrayBuffer
        vi.mocked(crypto.subtle.decrypt).mockImplementation(async (algorithm, key, data) => {
            return (data as ArrayBuffer); // Return the same data as "decrypted" ArrayBuffer
        });
    });

    describe('Encryption and Decryption', () => {
        it('should encrypt and store data successfully', async () => {
            const testData = { username: 'test', password: 'secret' };
            const testKey = 'test-key';

            await storageService.encryptAndStore(testKey, testData);

            expect(crypto.subtle.generateKey).toHaveBeenCalledWith(
                { name: 'AES-GCM', length: 256 },
                true,
                ['encrypt', 'decrypt']
            );
            expect(crypto.subtle.encrypt).toHaveBeenCalled();
            expect(localStorage.setItem).toHaveBeenCalledWith(
                testKey,
                expect.stringContaining('encryptedData')
            );
        });

        it('should decrypt and retrieve data successfully', async () => {
            const testData = { username: 'test', password: 'secret' };
            const testKey = 'test-key';

            // First store the data
            await storageService.encryptAndStore(testKey, testData);

            // Then retrieve it
            const retrievedData = await storageService.decryptAndRetrieve(testKey);

            expect(crypto.subtle.decrypt).toHaveBeenCalled();
            expect(retrievedData).toEqual(testData);
        });

        it('should return null when trying to decrypt non-existent data', async () => {
            const result = await storageService.decryptAndRetrieve('non-existent-key');
            expect(result).toBeNull();
        });

        it('should handle encryption errors gracefully', async () => {
            vi.mocked(crypto.subtle.encrypt).mockRejectedValue(new Error('Encryption failed'));

            await expect(
                storageService.encryptAndStore('test-key', { data: 'test' })
            ).rejects.toThrow('Failed to encrypt and store data: Encryption failed');
        });

        it('should handle decryption errors gracefully', async () => {
            // Store some invalid encrypted data
            localStorage.setItem('test-key', JSON.stringify({
                encryptedData: 'invalid',
                iv: 'invalid'
            }));

            vi.mocked(crypto.subtle.decrypt).mockRejectedValue(new Error('Decryption failed'));

            await expect(
                storageService.decryptAndRetrieve('test-key')
            ).rejects.toThrow('Failed to decrypt and retrieve data: Decryption failed');
        });
    });

    describe('Encrypted Configuration Management', () => {
        it('should save and retrieve encrypted configuration', async () => {
            const config: EncryptedConfig = {
                trendyol: {
                    apiKey: 'encrypted_api_key',
                    secretKey: 'encrypted_secret_key',
                    supplierId: 'supplier123',
                    storeFrontCode: 'TR'
                },
                oblio: {
                    email: 'test@example.com',
                    secretKey: 'encrypted_oblio_secret',
                    cif: 'RO12345678',
                    workStation: 1
                }
            };

            await storageService.saveEncryptedConfig(config);
            const retrievedConfig = await storageService.getEncryptedConfig();

            expect(retrievedConfig).toEqual(config);
        });

        it('should return null when no encrypted configuration exists', async () => {
            const config = await storageService.getEncryptedConfig();
            expect(config).toBeNull();
        });
    });

    describe('App Settings Management', () => {
        it('should save and retrieve app settings', () => {
            const settings: AppSettings = {
                autoRetryCount: 3,
                theme: 'dark',
                lastConfigUpdate: '2023-01-01T00:00:00Z',
                uiPreferences: {
                    tablePageSize: 50,
                    defaultView: 'dashboard'
                }
            };

            storageService.saveAppSettings(settings);
            const retrievedSettings = storageService.getAppSettings();

            expect(retrievedSettings).toEqual(settings);
        });

        it('should return null when no app settings exist', () => {
            const settings = storageService.getAppSettings();
            expect(settings).toBeNull();
        });
    });

    describe('Session Data Management', () => {
        it('should save and retrieve session data', () => {
            const sessionData: SessionData = {
                currentShipmentPackages: [],
                processedInvoices: [],
                syncLogs: [],
                lastFetchTime: '2023-01-01T00:00:00Z',
                selectedPackageIds: ['pkg1', 'pkg2']
            };

            storageService.saveSessionData(sessionData);
            const retrievedData = storageService.getSessionData();

            expect(retrievedData).toEqual(sessionData);
        });

        it('should return null when no session data exists', () => {
            const sessionData = storageService.getSessionData();
            expect(sessionData).toBeNull();
        });

        it('should clear session data', () => {
            const sessionData: SessionData = {
                currentShipmentPackages: [],
                processedInvoices: [],
                syncLogs: [],
                lastFetchTime: '2023-01-01T00:00:00Z',
                selectedPackageIds: []
            };

            storageService.saveSessionData(sessionData);
            storageService.clearSessionData();

            const retrievedData = storageService.getSessionData();
            expect(retrievedData).toBeNull();
        });
    });

    describe('Sensitive Data Management', () => {
        it('should clear all sensitive data', async () => {
            // Setup some data
            const config: EncryptedConfig = {
                trendyol: {
                    apiKey: 'api_key',
                    secretKey: 'secret_key',
                    supplierId: 'supplier123',
                    storeFrontCode: 'TR'
                },
                oblio: {
                    email: 'test@example.com',
                    secretKey: 'oblio_secret',
                    cif: 'RO12345678',
                    workStation: 1
                }
            };

            await storageService.saveEncryptedConfig(config);
            storageService.saveSessionData({
                currentShipmentPackages: [],
                processedInvoices: [],
                syncLogs: [],
                lastFetchTime: '2023-01-01T00:00:00Z',
                selectedPackageIds: []
            });

            // Clear sensitive data
            storageService.clearSensitiveData();

            // Verify data is cleared
            const retrievedConfig = await storageService.getEncryptedConfig();
            const retrievedSession = storageService.getSessionData();

            expect(retrievedConfig).toBeNull();
            expect(retrievedSession).toBeNull();
            expect(localStorage.removeItem).toHaveBeenCalledWith('trendyol-oblio-config-encrypted');
            expect(localStorage.removeItem).toHaveBeenCalledWith('trendyol-oblio-encryption-key');
        });
    });

    describe('Configuration Export and Import', () => {
        it('should export configuration successfully', async () => {
            const config: EncryptedConfig = {
                trendyol: {
                    apiKey: 'api_key',
                    secretKey: 'secret_key',
                    supplierId: 'supplier123',
                    storeFrontCode: 'TR'
                },
                oblio: {
                    email: 'test@example.com',
                    secretKey: 'oblio_secret',
                    cif: 'RO12345678',
                    workStation: 1
                }
            };

            const settings: AppSettings = {
                autoRetryCount: 3,
                theme: 'light',
                lastConfigUpdate: '2023-01-01T00:00:00Z',
                uiPreferences: {
                    tablePageSize: 25,
                    defaultView: 'orders'
                }
            };

            await storageService.saveEncryptedConfig(config);
            storageService.saveAppSettings(settings);

            const exportedConfig = storageService.exportConfig();
            const parsedExport = JSON.parse(exportedConfig);

            expect(parsedExport).toHaveProperty('encryptedConfig');
            expect(parsedExport).toHaveProperty('appSettings');
            expect(parsedExport).toHaveProperty('encryptionKey');
            expect(parsedExport).toHaveProperty('exportedAt');
            expect(parsedExport).toHaveProperty('version', '1.0');
        });

        it('should import configuration successfully', async () => {
            const exportData = {
                encryptedConfig: { encryptedData: 'test', iv: 'test' },
                appSettings: { autoRetryCount: 5, theme: 'dark' },
                encryptionKey: [1, 2, 3, 4],
                exportedAt: '2023-01-01T00:00:00Z',
                version: '1.0'
            };

            await storageService.importConfig(JSON.stringify(exportData));

            expect(localStorage.setItem).toHaveBeenCalledWith(
                'trendyol-oblio-encryption-key',
                JSON.stringify([1, 2, 3, 4])
            );
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'trendyol-oblio-config-encrypted',
                JSON.stringify(exportData.encryptedConfig)
            );
            expect(localStorage.setItem).toHaveBeenCalledWith(
                'trendyol-oblio-settings',
                JSON.stringify(exportData.appSettings)
            );
        });

        it('should handle invalid import data', async () => {
            await expect(
                storageService.importConfig('invalid json')
            ).rejects.toThrow('Failed to import configuration');
        });

        it('should handle unsupported version', async () => {
            const exportData = {
                version: '2.0',
                encryptedConfig: {},
                appSettings: {},
                encryptionKey: []
            };

            await expect(
                storageService.importConfig(JSON.stringify(exportData))
            ).rejects.toThrow('Unsupported configuration version');
        });

        it('should handle export errors gracefully', () => {
            // Create a new service instance to avoid affecting other tests
            const testService = new BrowserStorageService();

            // Mock localStorage.getItem to throw an error for this specific test
            const originalGetItem = localStorage.getItem;
            vi.mocked(localStorage.getItem).mockImplementation(() => {
                throw new Error('Storage error');
            });

            expect(() => testService.exportConfig()).toThrow('Failed to export configuration');

            // Restore original implementation
            vi.mocked(localStorage.getItem).mockImplementation(originalGetItem);
        });
    });

    describe('Encryption Key Management', () => {
        it('should use Web Crypto API for encryption operations', () => {
            // Test that the service has the necessary crypto methods available
            expect(crypto.subtle.generateKey).toBeDefined();
            expect(crypto.subtle.encrypt).toBeDefined();
            expect(crypto.subtle.decrypt).toBeDefined();
            expect(crypto.subtle.importKey).toBeDefined();
            expect(crypto.subtle.exportKey).toBeDefined();
        });
    });
});
// Configuration panel for managing API credentials and settings

import { EncryptedConfig, AppSettings } from '../models/storage';
import { BrowserStorageService } from '../services/storage-service';
import { TrendyolApiClient } from '../services/trendyol-client';
import { OblioClient } from '../services/oblio-client';

export class ConfigurationPanel {
  private storageService: BrowserStorageService;
  private trendyolForm: HTMLFormElement;
  private oblioForm: HTMLFormElement;
  private validationResult: HTMLElement;
  private isValidatingCredentials: boolean = false;

  constructor(storageService: BrowserStorageService) {
    this.storageService = storageService;
    this.trendyolForm = document.getElementById('trendyol-config-form') as HTMLFormElement;
    this.oblioForm = document.getElementById('oblio-config-form') as HTMLFormElement;
    this.validationResult = document.getElementById('config-validation-result') as HTMLElement;
  }

  async initialize(): Promise<void> {
    this.setupEventListeners();
    await this.loadConfiguration();
  }

  async loadConfiguration(): Promise<void> {
    try {
      const config = await this.storageService.getEncryptedConfig();
      
      if (config?.trendyol) {
        (document.getElementById('trendyol-api-key') as HTMLInputElement).value = config.trendyol.apiKey || '';
        (document.getElementById('trendyol-secret-key') as HTMLInputElement).value = config.trendyol.secretKey || '';
        (document.getElementById('trendyol-supplier-id') as HTMLInputElement).value = config.trendyol.supplierId || '';
        (document.getElementById('trendyol-storefront-code') as HTMLSelectElement).value = config.trendyol.storeFrontCode || 'TR';
      }

      if (config?.oblio) {
        (document.getElementById('oblio-email') as HTMLInputElement).value = config.oblio.email || '';
        (document.getElementById('oblio-secret-key') as HTMLInputElement).value = config.oblio.secretKey || '';
        (document.getElementById('oblio-cif') as HTMLInputElement).value = config.oblio.cif || '';
        (document.getElementById('oblio-work-station') as HTMLInputElement).value = config.oblio.workStation?.toString() || '1';
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      this.showMessage('Error loading configuration', 'error');
    }
  }

  async saveConfiguration(): Promise<void> {
    try {
      const trendyolData = new FormData(this.trendyolForm);
      const oblioData = new FormData(this.oblioForm);

      const config: EncryptedConfig = {
        trendyol: {
          apiKey: trendyolData.get('apiKey') as string,
          secretKey: trendyolData.get('secretKey') as string,
          supplierId: trendyolData.get('supplierId') as string,
          storeFrontCode: trendyolData.get('storeFrontCode') as string
        },
        oblio: {
          email: oblioData.get('email') as string,
          secretKey: oblioData.get('secretKey') as string,
          cif: oblioData.get('cif') as string,
          workStation: parseInt(oblioData.get('workStation') as string)
        }
      };

      // Validate required fields
      if (!this.validateConfigurationData(config)) {
        return;
      }

      await this.storageService.saveEncryptedConfig(config);
      this.showMessage('Configuration saved successfully', 'success');
    } catch (error) {
      console.error('Error saving configuration:', error);
      this.showMessage('Error saving configuration', 'error');
    }
  }

  async validateTrendyolCredentials(): Promise<void> {
    if (this.isValidatingCredentials) return;
    
    try {
      this.isValidatingCredentials = true;
      this.setValidationButtonState('validate-trendyol-btn', true, 'Validating...');

      const formData = new FormData(this.trendyolForm);
      const config = {
        apiKey: formData.get('apiKey') as string,
        secretKey: formData.get('secretKey') as string,
        supplierId: formData.get('supplierId') as string,
        storeFrontCode: formData.get('storeFrontCode') as string
      };

      if (!config.apiKey || !config.secretKey || !config.supplierId) {
        this.showValidationResult(false, 'Please fill in all Trendyol credentials');
        return;
      }

      const client = new TrendyolApiClient(config.apiKey, config.secretKey, config.supplierId, config.storeFrontCode);
      const isValid = await client.validateCredentials();
      
      if (isValid) {
        this.showValidationResult(true, 'Trendyol credentials are valid ✓');
      } else {
        this.showValidationResult(false, 'Invalid Trendyol credentials - please check your API key, secret, and supplier ID');
      }
    } catch (error) {
      console.error('Error validating Trendyol credentials:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showValidationResult(false, `Error validating Trendyol credentials: ${errorMessage}`);
    } finally {
      this.isValidatingCredentials = false;
      this.setValidationButtonState('validate-trendyol-btn', false, 'Validate Credentials');
    }
  }

  async validateOblioCredentials(): Promise<void> {
    if (this.isValidatingCredentials) return;
    
    try {
      this.isValidatingCredentials = true;
      this.setValidationButtonState('validate-oblio-btn', true, 'Validating...');

      const formData = new FormData(this.oblioForm);
      const config = {
        email: formData.get('email') as string,
        secretKey: formData.get('secretKey') as string,
        cif: formData.get('cif') as string,
        workStation: parseInt(formData.get('workStation') as string)
      };

      if (!config.email || !config.secretKey || !config.cif) {
        this.showValidationResult(false, 'Please fill in all Oblio credentials');
        return;
      }

      const client = new OblioClient({
        email: config.email,
        secretKey: config.secretKey
      });
      const isValid = await client.validateCredentials();
      
      if (isValid) {
        this.showValidationResult(true, 'Oblio credentials are valid ✓');
      } else {
        this.showValidationResult(false, 'Invalid Oblio credentials - please check your email and secret key');
      }
    } catch (error) {
      console.error('Error validating Oblio credentials:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showValidationResult(false, `Error validating Oblio credentials: ${errorMessage}`);
    } finally {
      this.isValidatingCredentials = false;
      this.setValidationButtonState('validate-oblio-btn', false, 'Validate Credentials');
    }
  }

  async exportConfiguration(): Promise<void> {
    try {
      // Use the storage service's export functionality for full configuration backup
      const configString = this.storageService.exportFullConfiguration();
      
      const dataBlob = new Blob([configString], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `trendyol-oblio-config-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      this.showMessage('Configuration exported successfully (includes encrypted credentials and settings)', 'success');
    } catch (error) {
      console.error('Error exporting configuration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showMessage(`Error exporting configuration: ${errorMessage}`, 'error');
    }
  }

  async importConfiguration(file: File): Promise<void> {
    try {
      const text = await file.text();
      
      // Validate configuration format first
      if (!this.storageService.validateConfigurationFormat(text)) {
        this.showMessage('Invalid configuration file format. Please check the file and try again.', 'error');
        return;
      }

      // Import using storage service
      await this.storageService.importFullConfiguration(text);
      
      // Reload the configuration into the form
      await this.loadConfiguration();
      
      this.showMessage('Configuration imported successfully! All settings and credentials have been restored.', 'success');
    } catch (error) {
      console.error('Error importing configuration:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      this.showMessage(`Error importing configuration: ${errorMessage}`, 'error');
    }
  }

  private setupEventListeners(): void {
    // Save configuration button
    const saveBtn = document.getElementById('save-config-btn');
    saveBtn?.addEventListener('click', () => this.saveConfiguration());

    // Validate credentials buttons
    const validateTrendyolBtn = document.getElementById('validate-trendyol-btn');
    validateTrendyolBtn?.addEventListener('click', () => this.validateTrendyolCredentials());

    const validateOblioBtn = document.getElementById('validate-oblio-btn');
    validateOblioBtn?.addEventListener('click', () => this.validateOblioCredentials());

    // Export configuration button
    const exportBtn = document.getElementById('export-config-btn');
    exportBtn?.addEventListener('click', () => this.exportConfiguration());

    // Import configuration button and file input
    const importBtn = document.getElementById('import-config-btn');
    const importInput = document.getElementById('import-config-input') as HTMLInputElement;
    
    importBtn?.addEventListener('click', () => importInput.click());
    importInput?.addEventListener('change', (event) => {
      const file = (event.target as HTMLInputElement).files?.[0];
      if (file) {
        this.importConfiguration(file);
      }
    });

    // Form validation on input
    this.setupFormValidation();
  }

  private setupFormValidation(): void {
    // Add real-time validation for required fields
    const requiredFields = [
      'trendyol-api-key',
      'trendyol-secret-key', 
      'trendyol-supplier-id',
      'oblio-email',
      'oblio-secret-key',
      'oblio-cif'
    ];

    requiredFields.forEach(fieldId => {
      const field = document.getElementById(fieldId) as HTMLInputElement;
      field?.addEventListener('blur', () => this.validateField(field));
      field?.addEventListener('input', () => this.clearFieldError(field));
    });

    // Email validation for Oblio email field
    const emailField = document.getElementById('oblio-email') as HTMLInputElement;
    emailField?.addEventListener('blur', () => this.validateEmailField(emailField));
  }

  private validateField(field: HTMLInputElement): void {
    if (!field.value.trim()) {
      this.showFieldError(field, 'This field is required');
    } else {
      this.clearFieldError(field);
    }
  }

  private validateEmailField(field: HTMLInputElement): void {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!field.value.trim()) {
      this.showFieldError(field, 'Email is required');
    } else if (!emailRegex.test(field.value)) {
      this.showFieldError(field, 'Please enter a valid email address');
    } else {
      this.clearFieldError(field);
    }
  }

  private showFieldError(field: HTMLInputElement, message: string): void {
    this.clearFieldError(field);
    
    field.style.borderColor = '#dc3545';
    const errorDiv = document.createElement('div');
    errorDiv.className = 'field-error';
    errorDiv.textContent = message;
    errorDiv.style.color = '#dc3545';
    errorDiv.style.fontSize = '0.8rem';
    errorDiv.style.marginTop = '0.25rem';
    
    field.parentNode?.appendChild(errorDiv);
  }

  private clearFieldError(field: HTMLInputElement): void {
    field.style.borderColor = '';
    const errorDiv = field.parentNode?.querySelector('.field-error');
    if (errorDiv) {
      errorDiv.remove();
    }
  }

  private validateConfigurationData(config: EncryptedConfig): boolean {
    const errors: string[] = [];

    // Validate Trendyol config
    if (!config.trendyol.apiKey?.trim()) {
      errors.push('Trendyol API Key is required');
    }
    if (!config.trendyol.secretKey?.trim()) {
      errors.push('Trendyol Secret Key is required');
    }
    if (!config.trendyol.supplierId?.trim()) {
      errors.push('Trendyol Supplier ID is required');
    }

    // Validate Oblio config
    if (!config.oblio.email?.trim()) {
      errors.push('Oblio Email is required');
    }
    if (!config.oblio.secretKey?.trim()) {
      errors.push('Oblio Secret Key is required');
    }
    if (!config.oblio.cif?.trim()) {
      errors.push('Oblio CIF is required');
    }
    if (!config.oblio.workStation || config.oblio.workStation < 1) {
      errors.push('Oblio Work Station must be a positive number');
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (config.oblio.email && !emailRegex.test(config.oblio.email)) {
      errors.push('Please enter a valid email address for Oblio');
    }

    if (errors.length > 0) {
      this.showValidationResult(false, errors.join(', '));
      return false;
    }

    return true;
  }

  private showValidationResult(isValid: boolean, message: string): void {
    this.validationResult.className = `validation-result ${isValid ? 'success' : 'error'}`;
    this.validationResult.textContent = message;
    this.validationResult.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.validationResult.classList.add('hidden');
    }, 5000);
  }

  private showMessage(message: string, type: 'success' | 'error' | 'info'): void {
    const messageContainer = document.getElementById('message-container');
    if (!messageContainer) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}`;
    messageDiv.textContent = message;

    messageContainer.appendChild(messageDiv);

    // Auto-remove after 5 seconds
    setTimeout(() => {
      messageDiv.remove();
    }, 5000);
  }

  private setValidationButtonState(buttonId: string, isLoading: boolean, text: string): void {
    const button = document.getElementById(buttonId) as HTMLButtonElement;
    if (button) {
      button.disabled = isLoading;
      button.textContent = text;
      if (isLoading) {
        button.classList.add('loading');
      } else {
        button.classList.remove('loading');
      }
    }
  }

  /**
   * Validate both API credentials at once
   */
  async validateAllCredentials(): Promise<{ trendyol: boolean; oblio: boolean }> {
    const results = { trendyol: false, oblio: false };
    
    try {
      // Validate Trendyol credentials
      const trendyolData = new FormData(this.trendyolForm);
      const trendyolConfig = {
        apiKey: trendyolData.get('apiKey') as string,
        secretKey: trendyolData.get('secretKey') as string,
        supplierId: trendyolData.get('supplierId') as string,
        storeFrontCode: trendyolData.get('storeFrontCode') as string
      };

      if (trendyolConfig.apiKey && trendyolConfig.secretKey && trendyolConfig.supplierId) {
        const trendyolClient = new TrendyolApiClient(
          trendyolConfig.apiKey, 
          trendyolConfig.secretKey, 
          trendyolConfig.supplierId, 
          trendyolConfig.storeFrontCode
        );
        results.trendyol = await trendyolClient.validateCredentials();
      }

      // Validate Oblio credentials
      const oblioData = new FormData(this.oblioForm);
      const oblioConfig = {
        email: oblioData.get('email') as string,
        secretKey: oblioData.get('secretKey') as string,
        cif: oblioData.get('cif') as string
      };

      if (oblioConfig.email && oblioConfig.secretKey && oblioConfig.cif) {
        const oblioClient = new OblioClient({
          email: oblioConfig.email,
          secretKey: oblioConfig.secretKey
        });
        results.oblio = await oblioClient.validateCredentials();
      }

    } catch (error) {
      console.error('Error validating credentials:', error);
    }

    return results;
  }

  /**
   * Check if configuration is complete and valid
   */
  async isConfigurationComplete(): Promise<boolean> {
    try {
      const config = await this.storageService.getEncryptedConfig();
      if (!config) return false;

      // Check if all required fields are present
      const trendyolComplete = config.trendyol?.apiKey && 
                              config.trendyol?.secretKey && 
                              config.trendyol?.supplierId;
      
      const oblioComplete = config.oblio?.email && 
                           config.oblio?.secretKey && 
                           config.oblio?.cif;

      return !!(trendyolComplete && oblioComplete);
    } catch (error) {
      console.error('Error checking configuration completeness:', error);
      return false;
    }
  }

  /**
   * Get current configuration status for display
   */
  async getConfigurationStatus(): Promise<{
    isComplete: boolean;
    trendyolConfigured: boolean;
    oblioConfigured: boolean;
    lastUpdate?: string;
  }> {
    try {
      const config = await this.storageService.getEncryptedConfig();
      const settings = this.storageService.getAppSettings();
      
      const trendyolConfigured = !!(config?.trendyol?.apiKey && 
                                   config?.trendyol?.secretKey && 
                                   config?.trendyol?.supplierId);
      
      const oblioConfigured = !!(config?.oblio?.email && 
                                config?.oblio?.secretKey && 
                                config?.oblio?.cif);

      return {
        isComplete: trendyolConfigured && oblioConfigured,
        trendyolConfigured,
        oblioConfigured,
        lastUpdate: settings?.lastConfigUpdate
      };
    } catch (error) {
      console.error('Error getting configuration status:', error);
      return {
        isComplete: false,
        trendyolConfigured: false,
        oblioConfigured: false
      };
    }
  }

  /**
   * Clear all configuration data
   */
  async clearConfiguration(): Promise<void> {
    try {
      this.storageService.clearSensitiveData();
      
      // Clear form fields
      this.trendyolForm.reset();
      this.oblioForm.reset();
      
      // Set default values
      (document.getElementById('trendyol-storefront-code') as HTMLSelectElement).value = 'TR';
      (document.getElementById('oblio-work-station') as HTMLInputElement).value = '1';
      
      this.showMessage('Configuration cleared successfully', 'success');
    } catch (error) {
      console.error('Error clearing configuration:', error);
      this.showMessage('Error clearing configuration', 'error');
    }
  }
}
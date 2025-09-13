// Main application controller and DOM manipulation

import { ConfigurationPanel } from './config-panel';
import { Dashboard } from './dashboard';
import { BrowserStorageService } from '../services/storage-service';
import { InvoiceSyncService } from '../services/sync-service';
import { TrendyolApiClient } from '../services/trendyol-client';
import { OblioClient } from '../services/oblio-client';

export class App {
  private dashboard!: Dashboard;
  private configPanel!: ConfigurationPanel;
  private storageService: BrowserStorageService;
  private syncService!: InvoiceSyncService;
  private currentView: 'dashboard' | 'config' = 'dashboard';

  constructor() {
    this.storageService = new BrowserStorageService();
  }

  async init(): Promise<void> {
    try {
      // Initialize services and components
      await this.initializeComponents();
      this.setupEventListeners();
      this.showDashboard();
      console.log('Application initialized successfully');
    } catch (error) {
      console.error('Failed to initialize application:', error);
      throw error;
    }
  }

  private async initializeComponents(): Promise<void> {
    // Initialize API clients (they will be configured when credentials are available)
    const trendyolClient = new TrendyolApiClient('', '', '', 'TR'); // Will be configured later
    const oblioClient = new OblioClient();

    // Initialize sync service
    this.syncService = new InvoiceSyncService(trendyolClient, oblioClient, this.storageService);

    // Initialize configuration panel
    this.configPanel = new ConfigurationPanel(this.storageService);
    await this.configPanel.initialize();

    // Initialize dashboard
    const dashboardSection = document.getElementById('dashboard-section');
    if (!dashboardSection) {
      throw new Error('Dashboard section not found in DOM');
    }
    this.dashboard = new Dashboard(dashboardSection, this.syncService);
    this.dashboard.render();
  }

  showDashboard(): void {
    // Show dashboard section and hide config section
    const dashboardSection = document.getElementById('dashboard-section');
    const configSection = document.getElementById('config-section');
    const dashboardBtn = document.getElementById('nav-dashboard');
    const configBtn = document.getElementById('nav-config');

    if (dashboardSection && configSection && dashboardBtn && configBtn) {
      dashboardSection.classList.add('active');
      configSection.classList.remove('active');
      dashboardBtn.classList.add('active');
      configBtn.classList.remove('active');
      this.currentView = 'dashboard';
    }
  }

  showConfiguration(): void {
    // Show config section and hide dashboard section
    const dashboardSection = document.getElementById('dashboard-section');
    const configSection = document.getElementById('config-section');
    const dashboardBtn = document.getElementById('nav-dashboard');
    const configBtn = document.getElementById('nav-config');

    if (dashboardSection && configSection && dashboardBtn && configBtn) {
      dashboardSection.classList.remove('active');
      configSection.classList.add('active');
      dashboardBtn.classList.remove('active');
      configBtn.classList.add('active');
      this.currentView = 'config';
    }
  }

  private setupEventListeners(): void {
    // Setup navigation event listeners
    const dashboardBtn = document.getElementById('nav-dashboard');
    const configBtn = document.getElementById('nav-config');

    if (dashboardBtn) {
      dashboardBtn.addEventListener('click', () => this.showDashboard());
    }

    if (configBtn) {
      configBtn.addEventListener('click', () => this.showConfiguration());
    }
  }

  private renderNavigation(): void {
    // Navigation is already rendered in HTML, this method is for future dynamic rendering
    console.log('Navigation rendered');
  }
}
// Dashboard component tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { Dashboard } from '../ui/dashboard';
import { SyncService } from '../services/sync-service';
import { TrendyolShipmentPackage } from '../models/trendyol';
import { SyncResult } from '../models/common';

// Mock DOM elements
const mockElements: { [key: string]: HTMLElement } = {};

// Mock document methods
const mockDocument = {
    getElementById: vi.fn((id: string) => mockElements[id] || null),
    createElement: vi.fn((tagName: string) => {
        const element = {
            tagName: tagName.toUpperCase(),
            className: '',
            classList: {
                add: vi.fn(),
                remove: vi.fn(),
                contains: vi.fn(),
                toggle: vi.fn()
            },
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            appendChild: vi.fn(),
            removeChild: vi.fn(),
            innerHTML: '',
            textContent: '',
            style: {},
            dataset: {},
            dispatchEvent: vi.fn(),
            querySelectorAll: vi.fn(() => []),
            querySelector: vi.fn(() => null)
        };
        return element;
    })
};

// Mock sync service
const mockSyncService: SyncService = {
    fetchAllShipmentPackages: vi.fn(),
    filterPackagesWithoutInvoices: vi.fn(),
    processSelectedPackages: vi.fn(),
    retryFailedInvoice: vi.fn(),
    checkInvoiceStatus: vi.fn(),
    checkInvoiceLinkStatus: vi.fn()
};

// Mock orders list
vi.mock('../ui/orders-list', () => ({
    OrdersList: vi.fn().mockImplementation(() => ({
        render: vi.fn(),
        getSelectedPackageIds: vi.fn(() => []),
        selectAll: vi.fn(),
        deselectAll: vi.fn()
    }))
}));

describe('Dashboard', () => {
    let dashboard: Dashboard;
    let container: HTMLElement;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Setup mock DOM elements
        mockElements['orders-container'] = mockDocument.createElement('div') as HTMLElement;
        mockElements['loading-overlay'] = mockDocument.createElement('div') as HTMLElement;
        mockElements['loading-message'] = mockDocument.createElement('p') as HTMLElement;
        mockElements['sync-status-text'] = mockDocument.createElement('span') as HTMLElement;
        mockElements['sync-counts'] = mockDocument.createElement('div') as HTMLElement;
        mockElements['total-count'] = mockDocument.createElement('span') as HTMLElement;
        mockElements['success-count'] = mockDocument.createElement('span') as HTMLElement;
        mockElements['failed-count'] = mockDocument.createElement('span') as HTMLElement;
        mockElements['fetch-packages-btn'] = mockDocument.createElement('button') as HTMLButtonElement;
        mockElements['process-selected-btn'] = mockDocument.createElement('button') as HTMLButtonElement;
        mockElements['select-all-btn'] = mockDocument.createElement('button') as HTMLButtonElement;
        mockElements['deselect-all-btn'] = mockDocument.createElement('button') as HTMLButtonElement;
        mockElements['orders-table-container'] = mockDocument.createElement('div') as HTMLElement;
        mockElements['no-orders-message'] = mockDocument.createElement('div') as HTMLElement;
        mockElements['processing-results'] = mockDocument.createElement('div') as HTMLElement;
        mockElements['results-container'] = mockDocument.createElement('div') as HTMLElement;
        mockElements['message-container'] = mockDocument.createElement('div') as HTMLElement;

        // Mock global document
        global.document = mockDocument as any;

        // Create container and dashboard
        container = mockDocument.createElement('div') as HTMLElement;
        dashboard = new Dashboard(container, mockSyncService);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('initialization', () => {
        it('should create dashboard with sync service', () => {
            expect(dashboard).toBeDefined();
        });

        it('should throw error if orders container not found', () => {
            mockElements['orders-container'] = null as any;

            expect(() => {
                new Dashboard(container, mockSyncService);
            }).toThrow('Orders container not found in DOM');
        });
    });

    describe('fetchShipmentPackages', () => {
        it('should fetch packages and update UI', async () => {
            const mockPackages: TrendyolShipmentPackage[] = [
                {
                    id: 1,
                    orderNumber: 'ORDER-001',
                    orderDate: Date.now(),
                    status: 'Created',
                    customerFirstName: 'John',
                    customerLastName: 'Doe',
                    customerEmail: 'john@example.com',
                    totalPrice: 100,
                    currencyCode: 'USD'
                } as TrendyolShipmentPackage
            ];

            const filteredPackages = [mockPackages[0]];

            mockSyncService.fetchAllShipmentPackages = vi.fn().mockResolvedValue(mockPackages);
            mockSyncService.filterPackagesWithoutInvoices = vi.fn().mockReturnValue(filteredPackages);

            await dashboard.fetchShipmentPackages();

            expect(mockSyncService.fetchAllShipmentPackages).toHaveBeenCalled();
            expect(mockSyncService.filterPackagesWithoutInvoices).toHaveBeenCalledWith(mockPackages);
        });

        it('should handle fetch errors gracefully', async () => {
            const error = new Error('Network error');
            mockSyncService.fetchAllShipmentPackages = vi.fn().mockRejectedValue(error);

            await dashboard.fetchShipmentPackages();

            expect(mockSyncService.fetchAllShipmentPackages).toHaveBeenCalled();
            // Should not throw and should handle error gracefully
        });

        it('should prevent multiple simultaneous fetch operations', async () => {
            mockSyncService.fetchAllShipmentPackages = vi.fn().mockImplementation(() =>
                new Promise(resolve => setTimeout(resolve, 100))
            );

            // Start two fetch operations
            const promise1 = dashboard.fetchShipmentPackages();
            const promise2 = dashboard.fetchShipmentPackages();

            await Promise.all([promise1, promise2]);

            // Should only call the service once
            expect(mockSyncService.fetchAllShipmentPackages).toHaveBeenCalledTimes(1);
        });
    });

    describe('processSelectedPackages', () => {
        it('should process selected packages successfully', async () => {
            const mockResult: SyncResult = {
                syncId: 'sync-123',
                totalOrders: 2,
                successCount: 2,
                failureCount: 0,
                errors: []
            };

            // Mock orders list to return selected IDs
            const mockOrdersList = {
                render: vi.fn(),
                getSelectedPackageIds: vi.fn(() => ['1', '2']),
                selectAll: vi.fn(),
                deselectAll: vi.fn()
            };

            (dashboard as any).ordersTable = mockOrdersList;
            mockSyncService.processSelectedPackages = vi.fn().mockResolvedValue(mockResult);

            await dashboard.processSelectedPackages();

            expect(mockSyncService.processSelectedPackages).toHaveBeenCalledWith(['1', '2']);
        });

        it('should show warning when no packages selected', async () => {
            // Mock orders list to return no selected IDs
            const mockOrdersList = {
                render: vi.fn(),
                getSelectedPackageIds: vi.fn(() => []),
                selectAll: vi.fn(),
                deselectAll: vi.fn()
            };

            (dashboard as any).ordersTable = mockOrdersList;

            await dashboard.processSelectedPackages();

            expect(mockSyncService.processSelectedPackages).not.toHaveBeenCalled();
        });

        it('should handle processing errors gracefully', async () => {
            const error = new Error('Processing failed');

            const mockOrdersList = {
                render: vi.fn(),
                getSelectedPackageIds: vi.fn(() => ['1']),
                selectAll: vi.fn(),
                deselectAll: vi.fn()
            };

            (dashboard as any).ordersTable = mockOrdersList;
            mockSyncService.processSelectedPackages = vi.fn().mockRejectedValue(error);

            await dashboard.processSelectedPackages();

            expect(mockSyncService.processSelectedPackages).toHaveBeenCalled();
            // Should not throw and should handle error gracefully
        });
    });

    describe('updateSyncStatus', () => {
        it('should update sync status display with counts', () => {
            const result: SyncResult = {
                syncId: 'sync-123',
                totalOrders: 10,
                successCount: 8,
                failureCount: 2,
                errors: []
            };

            dashboard.updateSyncStatus(result);

            expect(mockElements['total-count'].textContent).toBe('10');
            expect(mockElements['success-count'].textContent).toBe('8');
            expect(mockElements['failed-count'].textContent).toBe('2');
        });

        it('should handle missing DOM elements gracefully', () => {
            mockElements['sync-counts'] = null as any;

            const result: SyncResult = {
                syncId: 'sync-123',
                totalOrders: 5,
                successCount: 5,
                failureCount: 0,
                errors: []
            };

            expect(() => {
                dashboard.updateSyncStatus(result);
            }).not.toThrow();
        });
    });

    describe('loading states', () => {
        it('should show and hide loading overlay', () => {
            dashboard.showLoading('Test message');
            expect(mockElements['loading-message'].textContent).toBe('Test message');
            expect(mockElements['loading-overlay'].classList.remove).toHaveBeenCalledWith('hidden');

            dashboard.hideLoading();
            expect(mockElements['loading-overlay'].classList.add).toHaveBeenCalledWith('hidden');
        });

        it('should handle missing loading elements gracefully', () => {
            mockElements['loading-overlay'] = null as any;
            mockElements['loading-message'] = null as any;

            expect(() => {
                dashboard.showLoading('Test');
                dashboard.hideLoading();
            }).not.toThrow();
        });
    });
});
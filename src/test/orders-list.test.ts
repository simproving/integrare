// OrdersList component tests

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OrdersList } from '../ui/orders-list';
import { TrendyolShipmentPackage } from '../models/trendyol';

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

describe('OrdersList', () => {
    let ordersList: OrdersList;
    let container: HTMLElement;
    let tableBody: HTMLElement;

    beforeEach(() => {
        // Reset mocks
        vi.clearAllMocks();

        // Setup mock DOM elements
        tableBody = mockDocument.createElement('tbody') as HTMLElement;
        mockElements['orders-table-body'] = tableBody;
        mockElements['select-all-checkbox'] = mockDocument.createElement('input') as HTMLInputElement;

        // Mock global document
        global.document = mockDocument as any;

        // Create container and orders list
        container = mockDocument.createElement('div') as HTMLElement;
        container.querySelectorAll = vi.fn(() => []);
        container.addEventListener = vi.fn();
        container.dispatchEvent = vi.fn();

        ordersList = new OrdersList(container);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('initialization', () => {
        it('should create orders list with container', () => {
            expect(ordersList).toBeDefined();
        });
    });

    describe('render', () => {
        it('should render packages in table format', () => {
            const mockPackages: TrendyolShipmentPackage[] = [
                {
                    id: 1,
                    packageNumber: 'PKG-001',
                    orderId: 'ORDER-001',
                    orderDate: '2024-01-15',
                    status: 'Created',
                    deliveryType: 'Standard',
                    agreedDeliveryDate: '2024-01-20',
                    estimatedDeliveryStartDate: '2024-01-18',
                    estimatedDeliveryEndDate: '2024-01-20',
                    totalDiscount: 0,
                    totalTyDiscount: 0,
                    taxNumber: '12345678901',
                    invoiceAddress: {
                        id: 1,
                        firstName: 'John',
                        lastName: 'Doe',
                        company: '',
                        address1: '123 Main St',
                        address2: '',
                        city: 'Istanbul',
                        cityCode: 34,
                        district: 'Kadikoy',
                        districtId: 1,
                        postalCode: '34710',
                        countryCode: 'TR',
                        neighborhoodId: 1,
                        neighborhood: 'Center'
                    },
                    deliveryAddress: {
                        id: 1,
                        firstName: 'John',
                        lastName: 'Doe',
                        company: '',
                        address1: '123 Main St',
                        address2: '',
                        city: 'Istanbul',
                        cityCode: 34,
                        district: 'Kadikoy',
                        districtId: 1,
                        postalCode: '34710',
                        countryCode: 'TR',
                        neighborhoodId: 1,
                        neighborhood: 'Center'
                    },
                    orderLines: [],
                    packageHistories: [],
                    shipmentAddress: {
                        id: 1,
                        firstName: 'John',
                        lastName: 'Doe',
                        company: '',
                        address1: '123 Main St',
                        address2: '',
                        city: 'Istanbul',
                        cityCode: 34,
                        district: 'Kadikoy',
                        districtId: 1,
                        postalCode: '34710',
                        countryCode: 'TR',
                        neighborhoodId: 1,
                        neighborhood: 'Center'
                    },
                    customerInfo: {
                        id: 1,
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john.doe@example.com',
                        gsm: '+905551234567'
                    },
                    cargoTrackingNumber: 'TRACK123',
                    cargoTrackingLink: 'https://track.example.com/TRACK123',
                    cargoSenderNumber: 'SENDER123',
                    cargoProviderName: 'Cargo Provider',
                    lines: [
                        {
                            quantity: 1,
                            salesCampaignId: 0,
                            productSize: 'M',
                            merchantSku: 'SKU-001',
                            productName: 'Test Product',
                            productCode: 12345,
                            merchantId: 1,
                            amount: 100,
                            discount: 0,
                            tyDiscount: 0,
                            discountDetails: [],
                            currencyCode: 'TRY',
                            productColor: 'Blue',
                            id: 1,
                            sku: 'SKU-001',
                            vatBaseAmount: 18,
                            barcode: '1234567890123',
                            orderLineItemStatusName: 'Created'
                        }
                    ]
                }
            ];

            ordersList.render(mockPackages);

            // Verify table body innerHTML was set
            expect(tableBody.innerHTML).toBe('');
            expect(mockDocument.createElement).toHaveBeenCalledWith('tr');
        });

        it('should clear existing rows before rendering new ones', () => {
            tableBody.innerHTML = '<tr><td>Existing row</td></tr>';

            ordersList.render([]);

            expect(tableBody.innerHTML).toBe('');
        });
    });

    describe('selection functionality', () => {
        it('should return empty array when no packages selected', () => {
            const selectedIds = ordersList.getSelectedPackageIds();
            expect(selectedIds).toEqual([]);
        });

        it('should select all packages', () => {
            const mockPackages: TrendyolShipmentPackage[] = [
                {
                    id: 1,
                    packageNumber: 'PKG-001',
                    orderId: 'ORDER-001',
                    orderDate: '2024-01-15',
                    status: 'Created',
                    deliveryType: 'Standard',
                    agreedDeliveryDate: '2024-01-20',
                    estimatedDeliveryStartDate: '2024-01-18',
                    estimatedDeliveryEndDate: '2024-01-20',
                    totalDiscount: 0,
                    totalTyDiscount: 0,
                    taxNumber: '12345678901',
                    invoiceAddress: {
                        id: 1,
                        firstName: 'John',
                        lastName: 'Doe',
                        company: '',
                        address1: '123 Main St',
                        address2: '',
                        city: 'Istanbul',
                        cityCode: 34,
                        district: 'Kadikoy',
                        districtId: 1,
                        postalCode: '34710',
                        countryCode: 'TR',
                        neighborhoodId: 1,
                        neighborhood: 'Center'
                    },
                    deliveryAddress: {
                        id: 1,
                        firstName: 'John',
                        lastName: 'Doe',
                        company: '',
                        address1: '123 Main St',
                        address2: '',
                        city: 'Istanbul',
                        cityCode: 34,
                        district: 'Kadikoy',
                        districtId: 1,
                        postalCode: '34710',
                        countryCode: 'TR',
                        neighborhoodId: 1,
                        neighborhood: 'Center'
                    },
                    orderLines: [],
                    packageHistories: [],
                    shipmentAddress: {
                        id: 1,
                        firstName: 'John',
                        lastName: 'Doe',
                        company: '',
                        address1: '123 Main St',
                        address2: '',
                        city: 'Istanbul',
                        cityCode: 34,
                        district: 'Kadikoy',
                        districtId: 1,
                        postalCode: '34710',
                        countryCode: 'TR',
                        neighborhoodId: 1,
                        neighborhood: 'Center'
                    },
                    customerInfo: {
                        id: 1,
                        firstName: 'John',
                        lastName: 'Doe',
                        email: 'john.doe@example.com',
                        gsm: '+905551234567'
                    },
                    cargoTrackingNumber: 'TRACK123',
                    cargoTrackingLink: 'https://track.example.com/TRACK123',
                    cargoSenderNumber: 'SENDER123',
                    cargoProviderName: 'Cargo Provider',
                    lines: [
                        {
                            quantity: 1,
                            salesCampaignId: 0,
                            productSize: 'M',
                            merchantSku: 'SKU-001',
                            productName: 'Test Product',
                            productCode: 12345,
                            merchantId: 1,
                            amount: 100,
                            discount: 0,
                            tyDiscount: 0,
                            discountDetails: [],
                            currencyCode: 'TRY',
                            productColor: 'Blue',
                            id: 1,
                            sku: 'SKU-001',
                            vatBaseAmount: 18,
                            barcode: '1234567890123',
                            orderLineItemStatusName: 'Created'
                        }
                    ]
                }
            ];

            // First render the packages
            ordersList.render(mockPackages);

            // Mock checkboxes for selectAll
            const mockCheckboxes = [
                { checked: false, dataset: { packageId: '1' } }
            ];
            container.querySelectorAll = vi.fn(() => mockCheckboxes as any);

            ordersList.selectAll();

            const selectedIds = ordersList.getSelectedPackageIds();
            expect(selectedIds).toEqual(['1']);
        });

        it('should deselect all packages', () => {
            // Mock checkboxes for deselectAll
            const mockCheckboxes = [
                { checked: true, dataset: { packageId: '1' } }
            ];
            container.querySelectorAll = vi.fn(() => mockCheckboxes as any);

            ordersList.deselectAll();

            const selectedIds = ordersList.getSelectedPackageIds();
            expect(selectedIds).toEqual([]);
        });
    });
});
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OblioClient } from '../services/oblio-client.js';
import type { OblioInvoiceRequest, OblioInvoice, OblioCompany } from '../models/oblio.js';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('OblioClient', () => {
    let client: OblioClient;
    const mockCredentials = {
        email: 'test@example.com',
        secretKey: 'test-secret-key'
    };

    beforeEach(() => {
        client = new OblioClient();
        mockFetch.mockClear();
    });

    describe('constructor and credentials', () => {
        it('should create client without credentials', () => {
            const newClient = new OblioClient();
            expect(newClient).toBeInstanceOf(OblioClient);
        });

        it('should create client with credentials', () => {
            const newClient = new OblioClient(mockCredentials);
            expect(newClient).toBeInstanceOf(OblioClient);
        });

        it('should set credentials after creation', () => {
            client.setCredentials(mockCredentials);
            expect(() => client.setCredentials(mockCredentials)).not.toThrow();
        });
    });

    describe('validateCredentials', () => {
        it('should throw error when credentials not set', async () => {
            await expect(client.validateCredentials()).rejects.toThrow('Credentials not set');
        });

        it('should return true for valid credentials', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ([])
            });

            const result = await client.validateCredentials();

            expect(result).toBe(true);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://www.oblio.eu/api/companies',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.any(Headers)
                })
            );
        });

        it('should return false for invalid credentials', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 401,
                statusText: 'Unauthorized'
            });

            const result = await client.validateCredentials();

            expect(result).toBe(false);
        });

        it('should return false on network error', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockRejectedValueOnce(new TypeError('Network error'));

            const result = await client.validateCredentials();

            expect(result).toBe(false);
        });
    });

    describe('createInvoice', () => {
        const mockInvoiceRequest: OblioInvoiceRequest = {
            cif: '12345678',
            client: {
                cif: '87654321',
                name: 'Test Client'
            },
            issueDate: '2024-01-01',
            dueDate: '2024-01-31',
            currency: 'RON',
            language: 'RO',
            workStation: 1,
            seriesName: 'TEST',
            useStock: 0,
            products: [{
                name: 'Test Product',
                price: 100,
                quantity: 1
            }]
        };

        const mockInvoiceResponse: OblioInvoice = {
            docId: 'inv-123',
            number: 'TEST-001',
            date: '2024-01-01',
            dueDate: '2024-01-31',
            client: mockInvoiceRequest.client,
            products: mockInvoiceRequest.products,
            total: 100,
            currency: 'RON',
            status: 'created'
        };

        it('should throw error when credentials not set', async () => {
            await expect(client.createInvoice(mockInvoiceRequest))
                .rejects.toThrow('Credentials not set');
        });

        it('should create invoice successfully', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockInvoiceResponse
            });

            const result = await client.createInvoice(mockInvoiceRequest);

            expect(result).toEqual(mockInvoiceResponse);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://www.oblio.eu/api/docs/invoice',
                expect.objectContaining({
                    method: 'POST',
                    body: JSON.stringify(mockInvoiceRequest),
                    headers: expect.any(Headers)
                })
            );
        });

        it('should throw error on API failure', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: async () => JSON.stringify({
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid invoice data'
                })
            });

            await expect(client.createInvoice(mockInvoiceRequest))
                .rejects.toThrow('Failed to create invoice: Invalid invoice data');
        });
    });

    describe('getInvoiceById', () => {
        const mockInvoice: OblioInvoice = {
            docId: 'inv-123',
            number: 'TEST-001',
            date: '2024-01-01',
            dueDate: '2024-01-31',
            client: { cif: '87654321', name: 'Test Client' },
            products: [{ name: 'Test Product', price: 100, quantity: 1 }],
            total: 100,
            currency: 'RON',
            status: 'created'
        };

        it('should throw error when credentials not set', async () => {
            await expect(client.getInvoiceById('inv-123'))
                .rejects.toThrow('Credentials not set');
        });

        it('should get invoice successfully', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockInvoice
            });

            const result = await client.getInvoiceById('inv-123');

            expect(result).toEqual(mockInvoice);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://www.oblio.eu/api/docs/invoice/inv-123',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.any(Headers)
                })
            );
        });

        it('should throw error when invoice not found', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: async () => JSON.stringify({
                    code: 'NOT_FOUND',
                    message: 'Invoice not found'
                })
            });

            await expect(client.getInvoiceById('inv-123'))
                .rejects.toThrow('Failed to get invoice: Invoice not found');
        });
    });

    describe('getCompanies', () => {
        const mockCompanies: OblioCompany[] = [
            {
                cif: '12345678',
                name: 'Test Company',
                vatPayer: true,
                anaf: true,
                vatOnCollection: false,
                country: 'RO'
            }
        ];

        it('should throw error when credentials not set', async () => {
            await expect(client.getCompanies())
                .rejects.toThrow('Credentials not set');
        });

        it('should get companies successfully', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockCompanies
            });

            const result = await client.getCompanies();

            expect(result).toEqual(mockCompanies);
            expect(mockFetch).toHaveBeenCalledWith(
                'https://www.oblio.eu/api/companies',
                expect.objectContaining({
                    method: 'GET',
                    headers: expect.any(Headers)
                })
            );
        });
    });

    describe('error handling', () => {
        it('should handle network errors', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockRejectedValueOnce(new TypeError('Failed to fetch'));

            await expect(client.createInvoice({} as OblioInvoiceRequest))
                .rejects.toThrow('Network error: Unable to connect to Oblio API');
        });

        it('should handle non-JSON error responses', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: async () => 'Server Error'
            });

            await expect(client.createInvoice({} as OblioInvoiceRequest))
                .rejects.toThrow('Failed to create invoice: Server Error');
        });

        it('should handle empty error responses', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockResolvedValueOnce({
                ok: false,
                status: 500,
                statusText: 'Internal Server Error',
                text: async () => ''
            });

            await expect(client.createInvoice({} as OblioInvoiceRequest))
                .rejects.toThrow('Failed to create invoice: Internal Server Error');
        });
    });

    describe('authentication headers', () => {
        it('should include correct authentication headers', async () => {
            client.setCredentials(mockCredentials);

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => ([])
            });

            await client.getCompanies();

            expect(mockFetch.mock.calls).toBeDefined();
            expect(mockFetch.mock.calls.length).toBeGreaterThan(0);

            const [, options] = mockFetch.mock.calls[0] as [string, RequestInit];
            const headers = options.headers as Headers;

            expect(headers.get('Authorization')).toBe('test@example.com test-secret-key');
            expect(headers.get('Content-Type')).toBe('application/json');
        });
    });
});
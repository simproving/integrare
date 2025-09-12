import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TrendyolApiClient } from '../services/trendyol-client';

// Mock fetch globally
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TrendyolApiClient', () => {
  let client: TrendyolApiClient;

  beforeEach(() => {
    client = new TrendyolApiClient('test-api-key', 'test-secret', 'test-supplier-id', 'TR');
    mockFetch.mockClear();
  });

  describe('constructor', () => {
    it('should create client with correct parameters', () => {
      expect(client).toBeInstanceOf(TrendyolApiClient);
    });
  });

  describe('validateCredentials', () => {
    it('should return true for valid credentials', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({ content: [], page: 0, size: 1, totalElements: 0, totalPages: 0 })
      });

      const result = await client.validateCredentials();
      expect(result).toBe(true);
      expect(mockFetch).toHaveBeenCalledWith(
        'https://apigw.trendyol.com/integration/order/sellers/test-supplier-id/orders?page=0&size=1',
        {
          method: 'GET',
          headers: {
            'Authorization': 'Basic dGVzdC1hcGkta2V5OnRlc3Qtc2VjcmV0',
            'User-Agent': 'test-supplier-id - SelfIntegration',
            'storeFrontCode': 'TR',
            'Content-Type': 'application/json'
          }
        }
      );
    });

    it('should return false for 401 unauthorized', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized'
      });

      const result = await client.validateCredentials();
      expect(result).toBe(false);
    });

    it('should return false for 403 forbidden', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 403,
        statusText: 'Forbidden'
      });

      const result = await client.validateCredentials();
      expect(result).toBe(false);
    });

    it('should throw error for network issues', async () => {
      mockFetch.mockRejectedValueOnce(new TypeError('fetch failed'));

      await expect(client.validateCredentials()).rejects.toThrow('Network error: Unable to connect to Trendyol API');
    });

    it('should throw error for server errors', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: async () => 'Server error details'
      });

      await expect(client.validateCredentials()).rejects.toThrow('Credential validation failed: Trendyol server error: Please try again later');
    });
  });
});
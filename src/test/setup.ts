// Test setup file for vitest
import { vi } from 'vitest';

// Mock Web Crypto API for testing environment
Object.defineProperty(globalThis, 'crypto', {
  value: {
    subtle: {
      generateKey: vi.fn(),
      importKey: vi.fn(),
      exportKey: vi.fn(),
      encrypt: vi.fn(),
      decrypt: vi.fn(),
    },
    getRandomValues: vi.fn((arr: Uint8Array) => {
      // Fill with predictable values for testing
      for (let i = 0; i < arr.length; i++) {
        arr[i] = i % 256;
      }
      return arr;
    }),
  },
});

// Mock localStorage and sessionStorage
const createStorageMock = () => {
  let store: Record<string, string> = {};
  
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
    get length() {
      return Object.keys(store).length;
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  };
};

Object.defineProperty(globalThis, 'localStorage', {
  value: createStorageMock(),
});

Object.defineProperty(globalThis, 'sessionStorage', {
  value: createStorageMock(),
});

// Mock TextEncoder and TextDecoder
Object.defineProperty(globalThis, 'TextEncoder', {
  value: class TextEncoder {
    encode(input: string): Uint8Array {
      // Simple string to Uint8Array conversion without Buffer
      const encoder = new Array(input.length);
      for (let i = 0; i < input.length; i++) {
        encoder[i] = input.charCodeAt(i);
      }
      return new Uint8Array(encoder);
    }
  },
});

Object.defineProperty(globalThis, 'TextDecoder', {
  value: class TextDecoder {
    decode(input: Uint8Array): string {
      // Simple Uint8Array to string conversion without Buffer
      return String.fromCharCode(...Array.from(input));
    }
  },
});
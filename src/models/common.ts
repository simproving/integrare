// Common interfaces and types used across the application

export interface SyncResult {
  syncId: string;
  totalOrders: number;
  successCount: number;
  failureCount: number;
  errors: SyncError[];
}

export interface SyncError {
  orderId: string;
  errorCode: string;
  message: string;
  timestamp: string;
}

export interface ProcessedInvoice {
  trendyolOrderId: string;
  oblioInvoiceId?: string;
  status: 'pending' | 'completed' | 'failed';
  errorMessage?: string;
  processedAt: string;
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error';
  message: string;
  details?: any;
}

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

export interface ErrorResponse {
  error: {
    code: string;
    message: string;
    details?: any;
    timestamp: string;
    requestId: string;
  };
}

export interface RetryConfig {
  maxRetries: number;
  backoffStrategy: 'exponential';
  retryableErrors: string[];
}
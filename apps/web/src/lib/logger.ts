/**
 * Environment-aware Logger Utility
 *
 * Provides safe logging that prevents sensitive data leakage in production.
 * Usage: Replace all console.log() calls with logger.debug() or appropriate method.
 */

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';

export const logger = {
  /**
   * Debug logs - Only shown in development
   * Use for detailed debugging information, data dumps, etc.
   */
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug('[DEBUG]', ...args);
    }
  },

  /**
   * General logs - Only shown in development
   * Use for general information during development
   */
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log('[LOG]', ...args);
    }
  },

  /**
   * Info logs - Always shown
   * Use for important application events that should be logged in production
   * Examples: user login, important state changes, etc.
   */
  info: (...args: unknown[]) => {
    console.info('[INFO]', ...args);
  },

  /**
   * Warning logs - Always shown
   * Use for potential issues that don't break functionality
   */
  warn: (...args: unknown[]) => {
    console.warn('[WARN]', ...args);
  },

  /**
   * Error logs - Always shown (but sanitized in production)
   * Use for errors and exceptions
   * In production, only logs safe error information
   */
  error: (message: string, error?: Error | unknown) => {
    if (isDevelopment) {
      // Development: Log everything for debugging
      console.error('[ERROR]', message, error);
    } else {
      // Production: Log only safe information
      const safeError = error instanceof Error ? {
        name: error.name,
        message: error.message,
        // Explicitly exclude stack traces in production
      } : { type: typeof error };

      console.error('[ERROR]', message, safeError);
    }
  },

  /**
   * Security-related logs - Always shown
   * Use for authentication failures, authorization issues, suspicious activity
   */
  security: (message: string, details?: Record<string, unknown>) => {
    // In production, ensure no sensitive data is included in details
    const safeDetails = isProduction && details
      ? Object.keys(details).reduce((acc, key) => {
          // Filter out potentially sensitive keys
          if (!['password', 'token', 'secret', 'key', 'hash'].some(sensitive =>
            key.toLowerCase().includes(sensitive)
          )) {
            acc[key] = details[key];
          }
          return acc;
        }, {} as Record<string, unknown>)
      : details;

    console.warn('[SECURITY]', message, safeDetails || '');
  },

  /**
   * Audit logs - Always shown
   * Use for tracking important user actions, data changes, etc.
   * Example: user created, password changed, role modified
   */
  audit: (action: string, userId?: number, details?: Record<string, unknown>) => {
    console.info('[AUDIT]', {
      action,
      userId,
      timestamp: new Date().toISOString(),
      ...details
    });
  }
};

// Type export for usage in other files
export type Logger = typeof logger;

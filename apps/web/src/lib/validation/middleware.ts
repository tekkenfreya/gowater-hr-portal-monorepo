/**
 * Validation Middleware
 *
 * Utility functions for validating request data in API routes.
 * Provides consistent error handling and response formatting.
 */

import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema, ZodError } from 'zod';
import { logger } from '@/lib/logger';

// ================================================================
// VALIDATION RESULT TYPES
// ================================================================

export interface ValidationSuccess<T> {
  success: true;
  data: T;
}

export interface ValidationError {
  success: false;
  error: string;
  details?: Record<string, string[]>;
  status: number;
}

export type ValidationResult<T> = ValidationSuccess<T> | ValidationError;

// ================================================================
// VALIDATION FUNCTIONS
// ================================================================

/**
 * Validate request body against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns Validation result with typed data or error
 *
 * @example
 * const result = validateBody(loginSchema, await request.json());
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: result.status });
 * }
 * const { username, password } = result.data;
 */
const FIELD_LABELS: Record<string, string> = {
  type: 'Category',
  pipeline: 'Pipeline',
  industry: 'Industry',
  date_of_interaction: 'Date of Interaction',
  lead_type: 'Lead Type',
  company_name: 'Company Name',
  number_of_beneficiary: 'Number of Beneficiary',
  location: 'Location',
  lead_source: 'Lead Source',
  event_name: 'Event Name',
  event_type: 'Event Type',
  venue: 'Venue',
  event_start_date: 'Event Start Date',
  event_end_date: 'Event End Date',
  event_time: 'Event Time',
  event_lead: 'Event Lead',
  number_of_attendees: 'Number of Attendees',
  event_report: 'Event Report',
  supplier_name: 'Supplier Name',
  supplier_location: 'Supplier Location',
  supplier_product: 'Supplier Product',
  price: 'Price',
  unit_type: 'Unit Type',
  contact_person: 'Contact Person',
  mobile_number: 'Mobile Number',
  email_address: 'Email Address',
  product: 'Product',
  status: 'Status',
  remarks: 'Remarks',
  disposition: 'Disposition',
  assigned_to: 'Assigned To',
};

function labelFor(path: PropertyKey[]): string {
  const key = path.map(String).join('.');
  return FIELD_LABELS[key] || key;
}

export function validateBody<T>(
  schema: ZodSchema<T>,
  data: unknown
): ValidationResult<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  const details: Record<string, string[]> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!details[path]) details[path] = [];
    details[path].push(issue.message);
  });

  const firstError = result.error.issues[0];
  const errorMessage = firstError
    ? `${labelFor(firstError.path)}: ${firstError.message}`
    : 'Validation failed';

  return { success: false, error: errorMessage, details, status: 400 };
}

/**
 * Validate query parameters against a Zod schema
 *
 * @param schema - Zod schema to validate against
 * @param searchParams - URL search params from request
 * @returns Validation result with typed data or error
 *
 * @example
 * const { searchParams } = new URL(request.url);
 * const result = validateQuery(paginationSchema, searchParams);
 * if (!result.success) {
 *   return NextResponse.json({ error: result.error }, { status: result.status });
 * }
 * const { page, limit } = result.data;
 */
export function validateQuery<T>(
  schema: ZodSchema<T>,
  searchParams: URLSearchParams
): ValidationResult<T> {
  // Convert URLSearchParams to plain object
  const params: Record<string, string> = {};
  searchParams.forEach((value, key) => {
    params[key] = value;
  });

  const result = schema.safeParse(params);

  if (result.success) {
    return {
      success: true,
      data: result.data,
    };
  }

  // Validation failed - format errors
  const details: Record<string, string[]> = {};
  result.error.issues.forEach((issue) => {
    const path = issue.path.join('.');
    if (!details[path]) {
      details[path] = [];
    }
    details[path].push(issue.message);
  });

  const firstError = result.error.issues[0];
  const errorMessage = firstError
    ? `${firstError.path.join('.')}: ${firstError.message}`
    : 'Invalid query parameters';

  return {
    success: false,
    error: errorMessage,
    details,
    status: 400,
  };
}

/**
 * Create a standardized error response from validation result
 *
 * @param result - Validation error result
 * @returns NextResponse with error details
 *
 * @example
 * const result = validateBody(loginSchema, body);
 * if (!result.success) {
 *   return createErrorResponse(result);
 * }
 */
export function createErrorResponse(result: ValidationError): NextResponse {
  return NextResponse.json(
    {
      error: result.error,
      details: result.details,
    },
    { status: result.status }
  );
}

/**
 * Helper function to validate request body and return error response if invalid
 * Returns null if validation succeeds, allowing the caller to continue
 *
 * @param schema - Zod schema to validate against
 * @param data - Data to validate
 * @returns NextResponse with error or null if valid
 *
 * @example
 * const body = await request.json();
 * const validationError = await validateOrError(loginSchema, body);
 * if (validationError) return validationError;
 * // Body is valid, continue with typed data
 * const { username, password } = body as LoginInput;
 */
export function validateOrError<T>(
  schema: ZodSchema<T>,
  data: unknown
): NextResponse | null {
  const result = validateBody(schema, data);
  if (!result.success) {
    return createErrorResponse(result);
  }
  return null;
}

// ================================================================
// SAFE PARSE UTILITIES
// ================================================================

/**
 * Safely parse request body with validation
 * Returns both the parsed body and validation result
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Tuple of [body, validationResult]
 *
 * @example
 * const [body, validation] = await safeParseBody(request, loginSchema);
 * if (!validation.success) {
 *   return createErrorResponse(validation);
 * }
 * // Use validation.data with full type safety
 * const { username, password } = validation.data;
 */
export async function safeParseBody<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): Promise<[unknown, ValidationResult<T>]> {
  try {
    const body = await request.json();
    const validation = validateBody(schema, body);
    return [body, validation];
  } catch (error) {
    logger.error('Failed to parse request body', error);
    return [
      null,
      {
        success: false,
        error: 'Invalid JSON in request body',
        status: 400,
      },
    ];
  }
}

/**
 * Safely parse query parameters with validation
 *
 * @param request - Next.js request object
 * @param schema - Zod schema to validate against
 * @returns Validation result
 *
 * @example
 * const validation = safeParseQuery(request, paginationSchema);
 * if (!validation.success) {
 *   return createErrorResponse(validation);
 * }
 * const { page, limit } = validation.data;
 */
export function safeParseQuery<T>(
  request: NextRequest,
  schema: ZodSchema<T>
): ValidationResult<T> {
  const { searchParams } = new URL(request.url);
  return validateQuery(schema, searchParams);
}

// ================================================================
// VALIDATION DECORATORS (Optional Advanced Usage)
// ================================================================

/**
 * Format Zod error for logging/debugging
 *
 * @param error - ZodError instance
 * @returns Formatted error string
 */
export function formatZodError(error: ZodError): string {
  return error.issues
    .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
    .join(', ');
}

/**
 * Check if a value is a validation error
 *
 * @param result - Validation result to check
 * @returns True if result is an error
 */
export function isValidationError<T>(
  result: ValidationResult<T>
): result is ValidationError {
  return !result.success;
}

/**
 * Extract validated data from result (throws if error)
 * Useful for situations where you know validation succeeded
 *
 * @param result - Validation result
 * @returns Validated data
 * @throws Error if validation failed
 */
export function unwrapValidation<T>(result: ValidationResult<T>): T {
  if (!result.success) {
    throw new Error(`Validation failed: ${result.error}`);
  }
  return result.data;
}

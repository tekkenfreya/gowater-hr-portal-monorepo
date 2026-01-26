/**
 * Zod Validation Schemas
 *
 * This file contains all validation schemas for API endpoints.
 * Schemas enforce type safety and data validation at runtime.
 */

import { z } from 'zod';

// ================================================================
// AUTHENTICATION SCHEMAS
// ================================================================

export const loginSchema = z.object({
  username: z.string()
    .min(1, 'Username is required')
    .max(255, 'Username must be less than 255 characters')
    .trim(),
  password: z.string()
    .min(1, 'Password is required')
    .max(255, 'Password must be less than 255 characters'),
  // Note: Password complexity is NOT validated here - only during registration/password change
});

export const registerSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(255, 'Password must be less than 255 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  name: z.string()
    .min(1, 'Name is required')
    .max(255, 'Name must be less than 255 characters')
    .trim(),
  employee_name: z.string()
    .max(255, 'Employee name must be less than 255 characters')
    .optional(),
  role: z.enum(['admin', 'employee', 'manager', 'intern']).default('employee'),
  department: z.string()
    .max(255, 'Department must be less than 255 characters')
    .optional(),
});

export const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'New password must be at least 8 characters')
    .max(255, 'New password must be less than 255 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

// ================================================================
// LEAD SCHEMAS
// ================================================================

// Shared enums
export const leadCategorySchema = z.enum(['lead', 'event', 'supplier']);
export const productTypeSchema = z.enum(['both', 'vending', 'dispenser']);
export const leadStatusSchema = z.enum([
  'not-started',
  'contacted',
  'quoted',
  'negotiating',
  'closed-deal',
  'rejected'
]);

// Phone number validation (flexible for international formats)
const phoneNumberSchema = z.string()
  .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number must be less than 20 characters')
  .optional();

// Email validation
const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email must be less than 255 characters')
  .toLowerCase()
  .optional();

// Base lead schema (shared fields)
const baseLeadSchema = z.object({
  contact_person: z.string().max(255).optional(),
  mobile_number: phoneNumberSchema,
  email_address: emailSchema,
  product: productTypeSchema.optional(),
  status: leadStatusSchema.optional(),
  remarks: z.string().max(1000).optional(),
  disposition: z.string().max(500).optional(),
  assigned_to: z.string().max(255).optional(),
});

// Lead-specific schema
const leadSpecificSchema = z.object({
  category: z.literal('lead'),
  date_of_interaction: z.string().max(255).optional(),
  lead_type: z.string().max(50).optional(),
  company_name: z.string().max(255).optional(),
  number_of_beneficiary: z.string().max(50).optional(),
  location: z.string().max(255).optional(),
  lead_source: z.string().max(255).optional(),
}).refine((data) => {
  // Company name is required only when lead_type is 'company'
  if (data.lead_type === 'company' && (!data.company_name || data.company_name.trim() === '')) {
    return false;
  }
  return true;
}, {
  message: 'Company name is required for company/organization leads',
  path: ['company_name'],
});

// Event-specific schema
const eventSpecificSchema = z.object({
  category: z.literal('event'),
  event_name: z.string()
    .min(1, 'Event name is required for events')
    .max(255, 'Event name must be less than 255 characters')
    .trim(),
  event_type: z.string().max(255).optional(),
  venue: z.string().max(255).optional(),
  event_date: z.string().optional(), // DEPRECATED - kept for backward compatibility
  event_start_date: z.string().max(255).optional(),
  event_end_date: z.string().max(255).optional(),
  event_time: z.string().max(50).optional(),
  event_lead: z.string().max(255).optional(),
  number_of_attendees: z.string().max(50).optional(),
  event_report: z.string().max(500).optional(), // File path
});

// Supplier-specific schema
const supplierSpecificSchema = z.object({
  category: z.literal('supplier'),
  supplier_name: z.string()
    .min(1, 'Supplier name is required for suppliers')
    .max(255, 'Supplier name must be less than 255 characters')
    .trim(),
  supplier_location: z.string().max(255).optional(),
  supplier_product: z.string().max(255).optional(),
  price: z.string().max(50).optional(),
  unit_type: z.string().max(50).optional(),
});

// Discriminated union for lead creation
export const createLeadSchema = z.discriminatedUnion('category', [
  leadSpecificSchema.merge(baseLeadSchema),
  eventSpecificSchema.merge(baseLeadSchema),
  supplierSpecificSchema.merge(baseLeadSchema),
]);

// Update lead schema (all fields optional except ID)
export const updateLeadSchema = z.object({
  id: z.string().min(1, 'Lead ID is required'),
  category: leadCategorySchema.optional(),

  // Lead fields
  date_of_interaction: z.string().max(255).optional(),
  lead_type: z.string().max(50).optional(),
  company_name: z.string().max(255).optional(),
  number_of_beneficiary: z.string().max(50).optional(),
  location: z.string().max(255).optional(),
  lead_source: z.string().max(255).optional(),

  // Event fields
  event_name: z.string().max(255).optional(),
  event_type: z.string().max(255).optional(),
  venue: z.string().max(255).optional(),
  event_date: z.string().optional(), // DEPRECATED
  event_start_date: z.string().max(255).optional(),
  event_end_date: z.string().max(255).optional(),
  event_time: z.string().max(50).optional(),
  event_lead: z.string().max(255).optional(),
  number_of_attendees: z.string().max(50).optional(),
  event_report: z.string().max(500).optional(),

  // Supplier fields
  supplier_name: z.string().max(255).optional(),
  supplier_location: z.string().max(255).optional(),
  supplier_product: z.string().max(255).optional(),
  price: z.string().max(50).optional(),
  unit_type: z.string().max(50).optional(),

  // Shared fields
  contact_person: z.string().max(255).optional(),
  mobile_number: phoneNumberSchema,
  email_address: emailSchema,
  product: productTypeSchema.optional(),
  status: leadStatusSchema.optional(),
  remarks: z.string().max(1000).optional(),
  disposition: z.string().max(500).optional(),
  assigned_to: z.string().max(255).optional(),
});

// ================================================================
// LEAD ACTIVITY SCHEMAS
// ================================================================

export const activityTypeSchema = z.enum([
  'call',
  'email',
  'meeting',
  'site-visit',
  'follow-up',
  'remark',
  'other',
  'active-supplier',
  'recording',
  'checking'
]);

export const createActivitySchema = z.object({
  activity_type: activityTypeSchema,
  activity_description: z.string()
    .min(1, 'Activity description is required')
    .max(1000, 'Description must be less than 1000 characters')
    .trim(),
  start_date: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  end_date: z.string().datetime().optional().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()),
  status_update: leadStatusSchema.optional(),
});

// ================================================================
// ATTENDANCE SCHEMAS
// ================================================================

export const checkInSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export const checkOutSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional(),
});

export const attendanceUpdateSchema = z.object({
  id: z.number().int().positive(),
  check_in_time: z.string().datetime().optional(),
  check_out_time: z.string().datetime().optional(),
  break_start_time: z.string().datetime().optional(),
  break_end_time: z.string().datetime().optional(),
  status: z.enum(['present', 'absent', 'late', 'on_duty']).optional(),
  notes: z.string().max(500).optional(),
});

// ================================================================
// LEAVE REQUEST SCHEMAS
// ================================================================

export const createLeaveRequestSchema = z.object({
  start_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
  end_date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  leave_type: z.enum(['vacation', 'sick', 'absent', 'offset']),
  reason: z.string()
    .min(1, 'Reason is required')
    .max(500, 'Reason must be less than 500 characters')
    .trim(),
}).refine((data) => {
  // Ensure end_date is not before start_date
  return new Date(data.end_date) >= new Date(data.start_date);
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

export const updateLeaveRequestSchema = z.object({
  id: z.number().int().positive(),
  status: z.enum(['pending', 'approved', 'rejected']),
});

// ================================================================
// TASK SCHEMAS
// ================================================================

export const createTaskSchema = z.object({
  user_id: z.number().int().positive(),
  title: z.string()
    .min(1, 'Title is required')
    .max(255, 'Title must be less than 255 characters')
    .trim(),
  description: z.string().max(1000).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must be in YYYY-MM-DD format').optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).default('medium'),
});

export const updateTaskSchema = z.object({
  id: z.number().int().positive(),
  title: z.string().max(255).optional(),
  description: z.string().max(1000).optional(),
  due_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional(),
  status: z.enum(['pending', 'in_progress', 'completed', 'cancel', 'archived']).optional(),
});

// ================================================================
// FILE SCHEMAS
// ================================================================

export const uploadFileSchema = z.object({
  name: z.string().min(1, 'File name is required').max(255),
  size: z.number().int().positive().max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  mime_type: z.string().min(1, 'MIME type is required'),
  category: z.enum(['documents', 'images', 'videos', 'presentations', 'spreadsheets', 'archives']),
});

// ================================================================
// QUERY PARAMETER SCHEMAS
// ================================================================

export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const dateRangeSchema = z.object({
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
}).refine((data) => {
  return new Date(data.end_date) >= new Date(data.start_date);
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

// ================================================================
// TYPE EXPORTS
// ================================================================

// Export inferred types for use in TypeScript
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type CreateActivityInput = z.infer<typeof createActivitySchema>;
export type CheckInInput = z.infer<typeof checkInSchema>;
export type CheckOutInput = z.infer<typeof checkOutSchema>;
export type CreateLeaveRequestInput = z.infer<typeof createLeaveRequestSchema>;
export type UpdateLeaveRequestInput = z.infer<typeof updateLeaveRequestSchema>;
export type CreateTaskInput = z.infer<typeof createTaskSchema>;
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;
export type UploadFileInput = z.infer<typeof uploadFileSchema>;
export type PaginationInput = z.infer<typeof paginationSchema>;
export type DateRangeInput = z.infer<typeof dateRangeSchema>;

import { z } from 'zod';

export const createUnitSchema = z.object({
  serialNumber: z.string().min(1, 'Serial number is required').max(100),
  unitType: z.enum(['vending_machine', 'dispenser']),
  modelName: z.string().min(1, 'Model name is required'),
  destination: z.string().optional(),
  notes: z.string().optional(),
});

export const updateUnitSchema = z.object({
  destination: z.string().optional(),
  status: z.enum(['registered', 'dispatched', 'verified', 'decommissioned']).optional(),
  notes: z.string().optional(),
  modelName: z.string().min(1).optional(),
});

export const serviceRequestSchema = z.object({
  customerName: z.string().min(1, 'Name is required'),
  contactNumber: z.string().min(1, 'Contact number is required'),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  issueDescription: z.string().min(1, 'Issue description is required'),
});

export type CreateUnitInput = z.infer<typeof createUnitSchema>;
export type UpdateUnitInput = z.infer<typeof updateUnitSchema>;
export type ServiceRequestInput = z.infer<typeof serviceRequestSchema>;

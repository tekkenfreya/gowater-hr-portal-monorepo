/**
 * Validation Schema Tests
 *
 * Tests for Zod validation schemas to ensure proper data validation.
 */

import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  registerSchema,
  createLeadSchema,
  updateLeadSchema,
  createActivitySchema,
  createLeaveRequestSchema,
  paginationSchema,
} from '../schemas';

describe('Authentication Schemas', () => {
  describe('loginSchema', () => {
    it('should validate correct login data', () => {
      const validData = {
        username: 'testuser@example.com',
        password: 'Test123!@#',
      };

      const result = loginSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty username', () => {
      const invalidData = {
        username: '',
        password: 'Test123!@#',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject short password', () => {
      const invalidData = {
        username: 'testuser',
        password: 'short',
      };

      const result = loginSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should trim whitespace from username', () => {
      const data = {
        username: '  testuser  ',
        password: 'Test123!@#',
      };

      const result = loginSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.username).toBe('testuser');
      }
    });
  });

  describe('registerSchema', () => {
    it('should validate correct registration data', () => {
      const validData = {
        email: 'test@example.com',
        password: 'Test123!@#',
        name: 'Test User',
        role: 'employee' as const,
      };

      const result = registerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidData = {
        email: 'invalid-email',
        password: 'Test123!@#',
        name: 'Test User',
      };

      const result = registerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should enforce password complexity', () => {
      const testCases = [
        { password: 'alllowercase123', shouldFail: true, reason: 'no uppercase' },
        { password: 'ALLUPPERCASE123', shouldFail: true, reason: 'no lowercase' },
        { password: 'NoNumbers!', shouldFail: true, reason: 'no numbers' },
        { password: 'Valid123', shouldFail: false, reason: 'valid' },
      ];

      testCases.forEach(({ password, shouldFail }) => {
        const data = {
          email: 'test@example.com',
          password,
          name: 'Test User',
        };

        const result = registerSchema.safeParse(data);
        if (shouldFail) {
          expect(result.success).toBe(false);
        } else {
          expect(result.success).toBe(true);
        }
      });
    });

    it('should convert email to lowercase', () => {
      const data = {
        email: 'Test@EXAMPLE.COM',
        password: 'Test123!@#',
        name: 'Test User',
      };

      const result = registerSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });
  });
});

describe('Lead Schemas', () => {
  describe('createLeadSchema - Category: Lead', () => {
    it('should validate lead with required fields', () => {
      const validData = {
        category: 'lead' as const,
        company_name: 'Acme Corp',
        contact_person: 'John Doe',
        mobile_number: '09171234567',
        product: 'both' as const,
      };

      const result = createLeadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject lead without company_name', () => {
      const invalidData = {
        category: 'lead' as const,
        contact_person: 'John Doe',
      };

      const result = createLeadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate email format if provided', () => {
      const invalidData = {
        category: 'lead' as const,
        company_name: 'Acme Corp',
        email_address: 'invalid-email',
      };

      const result = createLeadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should validate phone number format', () => {
      const validPhones = ['09171234567', '+63 917 123 4567', '(02) 1234-5678'];
      const invalidPhones = ['abc', '123', 'phone'];

      validPhones.forEach((phone) => {
        const data = {
          category: 'lead' as const,
          company_name: 'Acme Corp',
          mobile_number: phone,
        };
        const result = createLeadSchema.safeParse(data);
        expect(result.success).toBe(true);
      });

      invalidPhones.forEach((phone) => {
        const data = {
          category: 'lead' as const,
          company_name: 'Acme Corp',
          mobile_number: phone,
        };
        const result = createLeadSchema.safeParse(data);
        expect(result.success).toBe(false);
      });
    });
  });

  describe('createLeadSchema - Category: Event', () => {
    it('should validate event with required fields', () => {
      const validData = {
        category: 'event' as const,
        event_name: 'Annual Conference 2025',
        venue: 'Manila Hotel',
        event_date: '2025-12-01',
      };

      const result = createLeadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject event without event_name', () => {
      const invalidData = {
        category: 'event' as const,
        venue: 'Manila Hotel',
      };

      const result = createLeadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createLeadSchema - Category: Supplier', () => {
    it('should validate supplier with required fields', () => {
      const validData = {
        category: 'supplier' as const,
        supplier_name: 'Water Supplier Inc',
        supplier_location: 'Quezon City',
        price: '50.00',
      };

      const result = createLeadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject supplier without supplier_name', () => {
      const invalidData = {
        category: 'supplier' as const,
        supplier_location: 'Quezon City',
      };

      const result = createLeadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('updateLeadSchema', () => {
    it('should validate update with ID', () => {
      const validData = {
        id: 'lead-123',
        company_name: 'Updated Corp',
        status: 'contacted' as const,
      };

      const result = updateLeadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject update without ID', () => {
      const invalidData = {
        company_name: 'Updated Corp',
      };

      const result = updateLeadSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should allow partial updates', () => {
      const validData = {
        id: 'lead-123',
        remarks: 'Updated remarks only',
      };

      const result = updateLeadSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });
});

describe('Activity Schema', () => {
  it('should validate activity with required fields', () => {
    const validData = {
      activity_type: 'call' as const,
      activity_description: 'Called to discuss pricing',
      start_date: '2025-01-15',
    };

    const result = createActivitySchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject activity without description', () => {
    const invalidData = {
      activity_type: 'call' as const,
    };

    const result = createActivitySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should enforce max description length', () => {
    const longDescription = 'a'.repeat(1001);
    const invalidData = {
      activity_type: 'call' as const,
      activity_description: longDescription,
    };

    const result = createActivitySchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });
});

describe('Leave Request Schema', () => {
  it('should validate leave request with valid dates', () => {
    const validData = {
      start_date: '2025-02-01',
      end_date: '2025-02-05',
      leave_type: 'annual' as const,
      reason: 'Family vacation',
    };

    const result = createLeaveRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });

  it('should reject end_date before start_date', () => {
    const invalidData = {
      start_date: '2025-02-05',
      end_date: '2025-02-01',
      leave_type: 'annual' as const,
      reason: 'Vacation',
    };

    const result = createLeaveRequestSchema.safeParse(invalidData);
    expect(result.success).toBe(false);
  });

  it('should allow same-day leave', () => {
    const validData = {
      start_date: '2025-02-01',
      end_date: '2025-02-01',
      leave_type: 'sick' as const,
      reason: 'Medical appointment',
    };

    const result = createLeaveRequestSchema.safeParse(validData);
    expect(result.success).toBe(true);
  });
});

describe('Pagination Schema', () => {
  it('should apply default values', () => {
    const data = {};

    const result = paginationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(20);
    }
  });

  it('should coerce string numbers to integers', () => {
    const data = {
      page: '5',
      limit: '50',
    };

    const result = paginationSchema.safeParse(data);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(5);
      expect(result.data.limit).toBe(50);
      expect(typeof result.data.page).toBe('number');
    }
  });

  it('should enforce max limit of 100', () => {
    const data = {
      page: 1,
      limit: 150,
    };

    const result = paginationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });

  it('should reject negative values', () => {
    const data = {
      page: -1,
      limit: 20,
    };

    const result = paginationSchema.safeParse(data);
    expect(result.success).toBe(false);
  });
});

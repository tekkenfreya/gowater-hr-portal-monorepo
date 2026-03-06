import { supabaseAdmin } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';

/**
 * Creates the dispatched_units and service_requests tables.
 * Safe to run multiple times (uses IF NOT EXISTS).
 */
export async function runUnitsMigration(): Promise<void> {
  logger.info('Running units migration...');

  const { error: unitsError } = await supabaseAdmin.rpc('execute_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS dispatched_units (
        id SERIAL PRIMARY KEY,
        serial_number VARCHAR(100) NOT NULL UNIQUE,
        unit_type TEXT NOT NULL CHECK (unit_type IN ('vending_machine', 'dispenser')),
        model_name TEXT NOT NULL,
        destination TEXT,
        status TEXT NOT NULL DEFAULT 'registered' CHECK (status IN ('registered', 'dispatched', 'verified', 'decommissioned')),
        dispatched_at TIMESTAMPTZ,
        verified_at TIMESTAMPTZ,
        verified_by_name TEXT,
        notes TEXT,
        created_by INTEGER NOT NULL REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_dispatched_units_serial ON dispatched_units(serial_number);
      CREATE INDEX IF NOT EXISTS idx_dispatched_units_status ON dispatched_units(status);
    `,
    params: [],
  });

  if (unitsError) {
    logger.error('Failed to create dispatched_units table', unitsError);
    throw new Error(`dispatched_units migration failed: ${unitsError.message}`);
  }

  logger.info('dispatched_units table created successfully');

  const { error: serviceError } = await supabaseAdmin.rpc('execute_sql', {
    query: `
      CREATE TABLE IF NOT EXISTS service_requests (
        id SERIAL PRIMARY KEY,
        unit_id INTEGER NOT NULL REFERENCES dispatched_units(id),
        customer_name TEXT NOT NULL,
        contact_number TEXT NOT NULL,
        email TEXT,
        issue_description TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved')),
        resolved_at TIMESTAMPTZ,
        resolved_by INTEGER REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT now(),
        updated_at TIMESTAMPTZ DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS idx_service_requests_unit ON service_requests(unit_id);
      CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
    `,
    params: [],
  });

  if (serviceError) {
    logger.error('Failed to create service_requests table', serviceError);
    throw new Error(`service_requests migration failed: ${serviceError.message}`);
  }

  logger.info('service_requests table created successfully');

  const { error: permissionsError } = await supabaseAdmin.rpc('execute_sql', {
    query: `
      INSERT INTO permissions (permission_key, display_name, description, category)
      VALUES
        ('can_manage_units', 'Manage Dispatched Units', 'Create, edit, dispatch, import, and print unit labels', 'units'),
        ('can_view_service_requests', 'View Service Requests', 'View and manage customer service requests', 'units')
      ON CONFLICT (permission_key) DO NOTHING;
    `,
    params: [],
  });

  if (permissionsError) {
    logger.error('Failed to insert unit permissions', permissionsError);
    throw new Error(`unit permissions migration failed: ${permissionsError.message}`);
  }

  logger.info('Unit permissions inserted successfully');
  logger.info('Units migration completed');
}

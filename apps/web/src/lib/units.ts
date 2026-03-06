import { supabaseAdmin } from '@/lib/supabase-server';
import { logger } from '@/lib/logger';
import type {
  DispatchedUnit,
  ServiceRequest,
  CreateUnitInput,
  BulkImportRow,
  VerifyResult,
} from '@/types/units';

// ============ ROW MAPPERS ============

interface UnitRow {
  id: number;
  serial_number: string;
  unit_type: 'vending_machine' | 'dispenser';
  model_name: string;
  destination: string | null;
  status: 'registered' | 'dispatched' | 'verified' | 'decommissioned';
  dispatched_at: string | null;
  verified_at: string | null;
  verified_by_name: string | null;
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
}

interface ServiceRequestRow {
  id: number;
  unit_id: number;
  customer_name: string;
  contact_number: string;
  email: string | null;
  issue_description: string;
  status: 'pending' | 'in_progress' | 'resolved';
  resolved_at: string | null;
  resolved_by: number | null;
  created_at: string;
  updated_at: string;
  dispatched_units?: UnitRow;
}

function mapUnitRow(row: UnitRow): DispatchedUnit {
  return {
    id: row.id,
    serialNumber: row.serial_number,
    unitType: row.unit_type,
    modelName: row.model_name,
    destination: row.destination,
    status: row.status,
    dispatchedAt: row.dispatched_at,
    verifiedAt: row.verified_at,
    verifiedByName: row.verified_by_name,
    notes: row.notes,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapServiceRequestRow(row: ServiceRequestRow): ServiceRequest {
  return {
    id: row.id,
    unitId: row.unit_id,
    customerName: row.customer_name,
    contactNumber: row.contact_number,
    email: row.email,
    issueDescription: row.issue_description,
    status: row.status,
    resolvedAt: row.resolved_at,
    resolvedBy: row.resolved_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    unit: row.dispatched_units ? mapUnitRow(row.dispatched_units) : undefined,
  };
}

// ============ SERVICE CLASS ============

interface UnitFilters {
  status?: string;
  unitType?: string;
  search?: string;
  page?: number;
  limit?: number;
}

interface ServiceRequestFilters {
  status?: string;
  unitId?: number;
  page?: number;
  limit?: number;
}

interface CreateServiceRequestInput {
  customerName: string;
  contactNumber: string;
  email?: string;
  issueDescription: string;
}

interface UpdateServiceRequestInput {
  status?: string;
  resolvedBy?: number;
}

type UnitStatus = 'registered' | 'dispatched' | 'verified' | 'decommissioned';

const ALLOWED_TRANSITIONS: Record<UnitStatus, UnitStatus[]> = {
  registered: ['dispatched', 'decommissioned'],
  dispatched: ['verified', 'decommissioned'],
  verified: ['decommissioned'],
  decommissioned: [],
};

class UnitsService {
  // ============ UNITS CRUD ============

  async getAllUnits(filters?: UnitFilters): Promise<{ units: DispatchedUnit[]; total: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('dispatched_units')
      .select('*', { count: 'exact' });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.unitType) {
      query = query.eq('unit_type', filters.unitType);
    }

    if (filters?.search) {
      const sanitized = filters.search.replace(/[%_,.*()]/g, '');
      if (sanitized) {
        query = query.or(
          `serial_number.ilike.%${sanitized}%,destination.ilike.%${sanitized}%`
        );
      }
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch units', error);
      return { units: [], total: 0 };
    }

    const rows = (data ?? []) as UnitRow[];
    return {
      units: rows.map(mapUnitRow),
      total: count ?? 0,
    };
  }

  async getUnitById(id: number): Promise<DispatchedUnit | null> {
    const { data, error } = await supabaseAdmin
      .from('dispatched_units')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      logger.error('Failed to fetch unit by id', error);
      return null;
    }

    return data ? mapUnitRow(data as UnitRow) : null;
  }

  async getUnitBySerial(serial: string): Promise<DispatchedUnit | null> {
    const { data, error } = await supabaseAdmin
      .from('dispatched_units')
      .select('*')
      .eq('serial_number', serial)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        return null;
      }
      logger.error('Failed to fetch unit by serial', error);
      return null;
    }

    return data ? mapUnitRow(data as UnitRow) : null;
  }

  async createUnit(
    input: CreateUnitInput,
    createdBy: number
  ): Promise<{ success: boolean; unit?: DispatchedUnit; error?: string }> {
    const { data, error } = await supabaseAdmin
      .from('dispatched_units')
      .insert({
        serial_number: input.serialNumber,
        unit_type: input.unitType,
        model_name: input.modelName,
        destination: input.destination ?? null,
        notes: input.notes ?? null,
        status: 'registered',
        created_by: createdBy,
      })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Serial number already exists' };
      }
      logger.error('Failed to create unit', error);
      return { success: false, error: 'Failed to create unit' };
    }

    return { success: true, unit: mapUnitRow(data as UnitRow) };
  }

  async bulkCreateUnits(
    rows: BulkImportRow[],
    createdBy: number
  ): Promise<{ created: number; errors: { row: number; error: string }[] }> {
    const errors: { row: number; error: string }[] = [];
    const validRecords: Record<string, unknown>[] = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row.serial_number || !row.serial_number.trim()) {
        errors.push({ row: i + 1, error: 'Missing serial number' });
        continue;
      }

      if (!row.unit_type || !['vending_machine', 'dispenser'].includes(row.unit_type)) {
        errors.push({ row: i + 1, error: 'Invalid unit type (must be vending_machine or dispenser)' });
        continue;
      }

      if (!row.model_name || !row.model_name.trim()) {
        errors.push({ row: i + 1, error: 'Missing model name' });
        continue;
      }

      validRecords.push({
        serial_number: row.serial_number.trim(),
        unit_type: row.unit_type,
        model_name: row.model_name.trim(),
        destination: row.destination?.trim() || null,
        notes: row.notes?.trim() || null,
        status: 'registered',
        created_by: createdBy,
      });
    }

    if (validRecords.length === 0) {
      return { created: 0, errors };
    }

    let created = 0;
    for (let i = 0; i < validRecords.length; i++) {
      const { error } = await supabaseAdmin
        .from('dispatched_units')
        .insert(validRecords[i]);

      if (error) {
        if (error.code === '23505') {
          errors.push({ row: i + 1, error: 'Serial number already exists' });
        } else {
          errors.push({ row: i + 1, error: error.message });
        }
      } else {
        created++;
      }
    }

    return { created, errors };
  }

  async updateUnit(
    id: number,
    updates: Partial<{ destination: string; status: string; notes: string; modelName: string }>
  ): Promise<{ success: boolean; unit?: DispatchedUnit; error?: string }> {
    if (updates.status !== undefined) {
      const current = await this.getUnitById(id);
      if (!current) {
        return { success: false, error: 'Unit not found' };
      }

      const allowed = ALLOWED_TRANSITIONS[current.status];
      if (!allowed.includes(updates.status as UnitStatus)) {
        return {
          success: false,
          error: `Cannot change status from "${current.status}" to "${updates.status}"`,
        };
      }
    }

    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.destination !== undefined) {
      updateData.destination = updates.destination;
    }

    if (updates.notes !== undefined) {
      updateData.notes = updates.notes;
    }

    if (updates.modelName !== undefined) {
      updateData.model_name = updates.modelName;
    }

    if (updates.status !== undefined) {
      updateData.status = updates.status;

      if (updates.status === 'dispatched') {
        updateData.dispatched_at = new Date().toISOString();
      }

      if (updates.status === 'verified') {
        updateData.verified_at = new Date().toISOString();
      }
    }

    const { data, error } = await supabaseAdmin
      .from('dispatched_units')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      logger.error('Failed to update unit', error);
      return { success: false, error: 'Failed to update unit' };
    }

    return { success: true, unit: mapUnitRow(data as UnitRow) };
  }

  async deleteUnit(id: number): Promise<{ success: boolean; error?: string }> {
    const unit = await this.getUnitById(id);
    if (!unit) {
      return { success: false, error: 'Unit not found' };
    }

    if (unit.status !== 'registered') {
      return { success: false, error: 'Only registered units can be deleted' };
    }

    const { count } = await supabaseAdmin
      .from('service_requests')
      .select('id', { count: 'exact', head: true })
      .eq('unit_id', id);

    if (count && count > 0) {
      return { success: false, error: 'Cannot delete: unit has service requests' };
    }

    const { error } = await supabaseAdmin
      .from('dispatched_units')
      .delete()
      .eq('id', id);

    if (error) {
      logger.error('Failed to delete unit', error);
      return { success: false, error: 'Failed to delete unit' };
    }

    return { success: true };
  }

  // ============ SERVICE REQUESTS ============

  async getServiceRequests(
    filters?: ServiceRequestFilters
  ): Promise<{ requests: ServiceRequest[]; total: number }> {
    const page = filters?.page ?? 1;
    const limit = filters?.limit ?? 20;
    const offset = (page - 1) * limit;

    let query = supabaseAdmin
      .from('service_requests')
      .select('*, dispatched_units(*)', {
        count: 'exact',
      });

    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    if (filters?.unitId) {
      query = query.eq('unit_id', filters.unitId);
    }

    query = query
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) {
      logger.error('Failed to fetch service requests', error);
      return { requests: [], total: 0 };
    }

    const rows = (data ?? []) as ServiceRequestRow[];
    return {
      requests: rows.map(mapServiceRequestRow),
      total: count ?? 0,
    };
  }

  async createServiceRequest(
    unitId: number,
    input: CreateServiceRequestInput
  ): Promise<{ success: boolean; requestId?: number; error?: string }> {
    const { data, error } = await supabaseAdmin
      .from('service_requests')
      .insert({
        unit_id: unitId,
        customer_name: input.customerName,
        contact_number: input.contactNumber,
        email: input.email ?? null,
        issue_description: input.issueDescription,
        status: 'pending',
      })
      .select('id')
      .single();

    if (error) {
      logger.error('Failed to create service request', error);
      return { success: false, error: 'Failed to create service request' };
    }

    return { success: true, requestId: data.id };
  }

  async updateServiceRequest(
    id: number,
    updates: UpdateServiceRequestInput
  ): Promise<{ success: boolean; error?: string }> {
    const updateData: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    };

    if (updates.status !== undefined) {
      updateData.status = updates.status;

      if (updates.status === 'resolved') {
        updateData.resolved_at = new Date().toISOString();
        if (updates.resolvedBy !== undefined) {
          updateData.resolved_by = updates.resolvedBy;
        }
      }
    }

    const { error } = await supabaseAdmin
      .from('service_requests')
      .update(updateData)
      .eq('id', id);

    if (error) {
      logger.error('Failed to update service request', error);
      return { success: false, error: 'Failed to update service request' };
    }

    return { success: true };
  }

  // ============ VERIFICATION ============

  async verifyUnit(serial: string, customerName?: string): Promise<VerifyResult> {
    const { data, error } = await supabaseAdmin
      .from('dispatched_units')
      .select('*')
      .eq('serial_number', serial)
      .single();

    if (error || !data) {
      return {
        found: false,
        message: 'Unit not found. Please check the serial number and try again.',
      };
    }

    const row = data as UnitRow;

    if (row.status === 'decommissioned') {
      return {
        found: true,
        status: row.status,
        unitType: row.unit_type,
        modelName: row.model_name,
        message: 'This unit has been decommissioned and is no longer active.',
      };
    }

    if (row.status === 'dispatched') {
      const updateData: Record<string, unknown> = {
        status: 'verified',
        verified_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      if (customerName) {
        updateData.verified_by_name = customerName;
      }

      const { error: updateError } = await supabaseAdmin
        .from('dispatched_units')
        .update(updateData)
        .eq('id', row.id);

      if (updateError) {
        logger.error('Failed to update unit verification status', updateError);
      }

      return {
        found: true,
        status: 'verified',
        unitType: row.unit_type,
        modelName: row.model_name,
        dispatchedAt: row.dispatched_at ?? undefined,
        message: 'Unit verified successfully. This is an authentic GoWater unit.',
      };
    }

    return {
      found: true,
      status: row.status,
      unitType: row.unit_type,
      modelName: row.model_name,
      dispatchedAt: row.dispatched_at ?? undefined,
      message: row.status === 'verified'
        ? 'This unit has already been verified as authentic.'
        : 'Unit found. Current status: ' + row.status,
    };
  }
}

// ============ SINGLETON ============

let unitsServiceInstance: UnitsService | null = null;

export function getUnitsService(): UnitsService {
  if (!unitsServiceInstance) {
    unitsServiceInstance = new UnitsService();
  }
  return unitsServiceInstance;
}

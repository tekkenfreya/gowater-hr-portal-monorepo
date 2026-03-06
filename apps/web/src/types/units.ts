export interface DispatchedUnit {
  id: number;
  serialNumber: string;
  unitType: 'vending_machine' | 'dispenser';
  modelName: string;
  destination: string | null;
  status: 'registered' | 'dispatched' | 'verified' | 'decommissioned';
  dispatchedAt: string | null;
  verifiedAt: string | null;
  verifiedByName: string | null;
  notes: string | null;
  createdBy: number;
  createdAt: string;
  updatedAt: string;
}

export interface ServiceRequest {
  id: number;
  unitId: number;
  customerName: string;
  contactNumber: string;
  email: string | null;
  issueDescription: string;
  status: 'pending' | 'in_progress' | 'resolved';
  resolvedAt: string | null;
  resolvedBy: number | null;
  createdAt: string;
  updatedAt: string;
  unit?: DispatchedUnit;
}

export interface CreateUnitInput {
  serialNumber: string;
  unitType: 'vending_machine' | 'dispenser';
  modelName: string;
  destination?: string;
  notes?: string;
}

export interface BulkImportRow {
  serial_number: string;
  unit_type: string;
  model_name: string;
  destination?: string;
  notes?: string;
}

export interface VerifyResult {
  found: boolean;
  status?: string;
  unitType?: string;
  modelName?: string;
  dispatchedAt?: string;
  message: string;
}

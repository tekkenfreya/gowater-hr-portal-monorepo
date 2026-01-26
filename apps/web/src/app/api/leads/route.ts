import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getLeadService } from '@/lib/leads';
import { logger } from '@/lib/logger';
import { LeadFormData, LeadCategory } from '@/types/leads';
import { createLeadSchema, updateLeadSchema } from '@/lib/validation/schemas';
import { safeParseBody, createErrorResponse } from '@/lib/validation/middleware';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category') as LeadCategory | null;

    const leadService = getLeadService();
    const leads = category
      ? await leadService.getLeadsByCategory(category)
      : await leadService.getAllLeads();

    return NextResponse.json({ leads, message: 'Leads fetched successfully' });
  } catch (error) {
    logger.error('Error fetching leads', error);
    return NextResponse.json(
      { error: 'Failed to fetch leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const employeeName = decoded.name || decoded.email || 'Unknown';

    // Validate request body with Zod schema (handles category-specific validation)
    const [, validation] = await safeParseBody(request, createLeadSchema);
    if (!validation.success) {
      return createErrorResponse(validation);
    }

    const leadData: LeadFormData = validation.data as LeadFormData;

    const leadService = getLeadService();
    const lead = await leadService.createLead(employeeName, leadData);

    return NextResponse.json({ lead, message: 'Lead created successfully' }, { status: 201 });
  } catch (error) {
    logger.error('Error creating lead', error);
    return NextResponse.json(
      { error: 'Failed to create lead' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    // Validate request body with Zod schema
    const [, validation] = await safeParseBody(request, updateLeadSchema);
    if (!validation.success) {
      return createErrorResponse(validation);
    }

    const { id, ...updates } = validation.data;

    const leadService = getLeadService();
    await leadService.updateLead(id, updates);

    return NextResponse.json({ message: 'Lead updated successfully' });
  } catch (error) {
    logger.error('Error updating lead', error);
    return NextResponse.json(
      { error: 'Failed to update lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Lead ID is required' },
        { status: 400 }
      );
    }

    const leadService = getLeadService();
    await leadService.deleteLead(id);

    return NextResponse.json({ message: 'Lead deleted successfully' });
  } catch (error) {
    logger.error('Error deleting lead', error);
    return NextResponse.json(
      { error: 'Failed to delete lead' },
      { status: 500 }
    );
  }
}

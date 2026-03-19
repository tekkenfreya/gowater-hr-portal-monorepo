import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getColdLeadService } from '@/lib/coldLeads';
import { logger } from '@/lib/logger';
import { LeadFormData, LeadCategory, ColdCategory } from '@/types/leads';
import { createLeadSchema, updateLeadSchema, leadCategorySchema } from '@/lib/validation/schemas';
import { safeParseBody, createErrorResponse } from '@/lib/validation/middleware';
import type { JWTPayload } from '@/lib/authHelper';

const VALID_CATEGORIES: LeadCategory[] = ['lead', 'event', 'supplier'];
const VALID_COLD_CATEGORIES: ColdCategory[] = ['restaurants', 'lgu', 'hotel', 'microfinance', 'foundation'];

function getTokenFromRequest(request: NextRequest): string | null {
  let token = request.cookies.get('auth-token')?.value;

  if (!token) {
    const authHeader = request.headers.get('Authorization');
    if (authHeader?.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
  }

  return token || null;
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const { searchParams } = new URL(request.url);
    const categoryParam = searchParams.get('category');
    const coldCategoryParam = searchParams.get('cold_category') || undefined;

    if (coldCategoryParam && !VALID_COLD_CATEGORIES.includes(coldCategoryParam as ColdCategory)) {
      return NextResponse.json(
        { error: `Invalid cold_category. Must be one of: ${VALID_COLD_CATEGORIES.join(', ')}` },
        { status: 400 }
      );
    }

    let category: LeadCategory | null = null;
    if (categoryParam) {
      const parsed = leadCategorySchema.safeParse(categoryParam);
      if (!parsed.success) {
        return NextResponse.json(
          { error: `Invalid category. Must be one of: ${VALID_CATEGORIES.join(', ')}` },
          { status: 400 }
        );
      }
      category = parsed.data;
    }

    const coldLeadService = getColdLeadService();
    const leads = category
      ? await coldLeadService.getLeadsByCategory(category, coldCategoryParam)
      : await coldLeadService.getAllLeads(coldCategoryParam);

    return NextResponse.json({ leads, message: 'Cold leads fetched successfully' });
  } catch (error) {
    logger.error('Error fetching cold leads', error);
    return NextResponse.json(
      { error: 'Failed to fetch cold leads' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const employeeName = decoded.name || decoded.email || 'Unknown';

    const [, validation] = await safeParseBody(request, createLeadSchema);
    if (!validation.success) {
      return createErrorResponse(validation);
    }

    const leadData: LeadFormData = validation.data as LeadFormData;

    const coldLeadService = getColdLeadService();
    const lead = await coldLeadService.createLead(employeeName, leadData);

    return NextResponse.json({ lead, message: 'Cold lead created successfully' }, { status: 201 });
  } catch (error) {
    logger.error('Error creating cold lead', error);
    return NextResponse.json(
      { error: 'Failed to create cold lead' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const [, validation] = await safeParseBody(request, updateLeadSchema);
    if (!validation.success) {
      return createErrorResponse(validation);
    }

    const { id, ...updates } = validation.data;

    const coldLeadService = getColdLeadService();
    await coldLeadService.updateLead(id, updates);

    return NextResponse.json({ message: 'Cold lead updated successfully' });
  } catch (error) {
    logger.error('Error updating cold lead', error);
    return NextResponse.json(
      { error: 'Failed to update cold lead' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Cold lead ID is required' },
        { status: 400 }
      );
    }

    const coldLeadService = getColdLeadService();
    await coldLeadService.deleteLead(id);

    return NextResponse.json({ message: 'Cold lead deleted successfully' });
  } catch (error) {
    logger.error('Error deleting cold lead', error);
    return NextResponse.json(
      { error: 'Failed to delete cold lead' },
      { status: 500 }
    );
  }
}

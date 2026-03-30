import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getHotLeadService } from '@/lib/hotLeads';
import { logger } from '@/lib/logger';
import { LeadFormData, LeadCategory, HotCategory } from '@/types/leads';
import { createLeadSchema, updateLeadSchema, leadCategorySchema } from '@/lib/validation/schemas';
import { safeParseBody, createErrorResponse } from '@/lib/validation/middleware';
import type { JWTPayload } from '@/lib/authHelper';

const VALID_CATEGORIES: LeadCategory[] = ['lead', 'event', 'supplier'];
const VALID_HOT_CATEGORIES: HotCategory[] = ['restaurants', 'lgu', 'hotel', 'microfinance', 'foundation'];

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
    const hotCategoryParam = searchParams.get('hot_category') || undefined;

    if (hotCategoryParam && !VALID_HOT_CATEGORIES.includes(hotCategoryParam as HotCategory)) {
      return NextResponse.json(
        { error: `Invalid hot_category. Must be one of: ${VALID_HOT_CATEGORIES.join(', ')}` },
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

    const hotLeadService = getHotLeadService();
    const leads = category
      ? await hotLeadService.getLeadsByCategory(category, hotCategoryParam)
      : await hotLeadService.getAllLeads(hotCategoryParam);

    return NextResponse.json({ leads, message: 'Hot leads fetched successfully' });
  } catch (error) {
    logger.error('Error fetching hot leads', error);
    return NextResponse.json(
      { error: 'Failed to fetch hot leads' },
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

    const hotLeadService = getHotLeadService();
    const lead = await hotLeadService.createLead(employeeName, leadData);

    return NextResponse.json({ lead, message: 'Hot lead created successfully' }, { status: 201 });
  } catch (error) {
    logger.error('Error creating hot lead', error);
    return NextResponse.json(
      { error: 'Failed to create hot lead' },
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

    const hotLeadService = getHotLeadService();
    await hotLeadService.updateLead(id, updates);

    return NextResponse.json({ message: 'Hot lead updated successfully' });
  } catch (error) {
    logger.error('Error updating hot lead', error);
    return NextResponse.json(
      { error: 'Failed to update hot lead' },
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
        { error: 'Hot lead ID is required' },
        { status: 400 }
      );
    }

    const hotLeadService = getHotLeadService();
    await hotLeadService.deleteLead(id);

    return NextResponse.json({ message: 'Hot lead deleted successfully' });
  } catch (error) {
    logger.error('Error deleting hot lead', error);
    return NextResponse.json(
      { error: 'Failed to delete hot lead' },
      { status: 500 }
    );
  }
}

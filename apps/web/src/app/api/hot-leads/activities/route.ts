import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getHotLeadService } from '@/lib/hotLeads';
import { logger } from '@/lib/logger';
import { ActivityFormData } from '@/types/leads';
import { createActivitySchema } from '@/lib/validation/schemas';
import { safeParseBody, createErrorResponse } from '@/lib/validation/middleware';
import type { JWTPayload } from '@/lib/authHelper';
import { z } from 'zod';

const logActivitySchema = z.object({
  leadId: z.string().min(1, 'Lead ID is required'),
}).merge(createActivitySchema);

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

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const employeeName = decoded.name || decoded.email || 'Unknown';

    const [, validation] = await safeParseBody(request, logActivitySchema);
    if (!validation.success) {
      return createErrorResponse(validation);
    }

    const { leadId, ...activityData } = validation.data;

    const hotLeadService = getHotLeadService();
    const activity = await hotLeadService.logActivity(leadId, employeeName, activityData as ActivityFormData);

    return NextResponse.json(
      { activity, message: 'Activity logged successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error logging hot lead activity', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    const hotLeadService = getHotLeadService();

    if (leadId) {
      const activities = await hotLeadService.getActivitiesForLead(leadId);
      return NextResponse.json({ activities, message: 'Activities fetched successfully' });
    } else {
      const activities = await hotLeadService.getAllActivities();
      return NextResponse.json({ activities, message: 'All activities fetched successfully' });
    }
  } catch (error) {
    logger.error('Error fetching hot lead activities', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
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
    const activityId = searchParams.get('id');

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const hotLeadService = getHotLeadService();
    await hotLeadService.deleteActivity(activityId);

    return NextResponse.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    logger.error('Error deleting hot lead activity', error);
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}

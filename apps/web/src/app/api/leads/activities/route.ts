import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getLeadService } from '@/lib/leads';
import { logger } from '@/lib/logger';
import { ActivityFormData } from '@/types/leads';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
  name: string;
}

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const employeeName = decoded.name || decoded.email || 'Unknown';

    const body = await request.json();
    const { leadId, ...activityData } = body;

    // Validation
    if (!leadId || !activityData.activity_type || !activityData.activity_description) {
      return NextResponse.json(
        { error: 'Missing required fields: leadId, activity_type, activity_description' },
        { status: 400 }
      );
    }

    const leadService = getLeadService();
    const activity = await leadService.logActivity(leadId, employeeName, activityData as ActivityFormData);

    return NextResponse.json(
      { activity, message: 'Activity logged successfully' },
      { status: 201 }
    );
  } catch (error) {
    logger.error('Error logging activity', error);
    return NextResponse.json(
      { error: 'Failed to log activity' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const { searchParams } = new URL(request.url);
    const leadId = searchParams.get('leadId');

    const leadService = getLeadService();

    if (leadId) {
      const activities = await leadService.getActivitiesForLead(leadId);
      return NextResponse.json({ activities, message: 'Activities fetched successfully' });
    } else {
      const activities = await leadService.getAllActivities();
      return NextResponse.json({ activities, message: 'All activities fetched successfully' });
    }
  } catch (error) {
    logger.error('Error fetching activities', error);
    return NextResponse.json(
      { error: 'Failed to fetch activities' },
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
    const activityId = searchParams.get('id');

    if (!activityId) {
      return NextResponse.json(
        { error: 'Activity ID is required' },
        { status: 400 }
      );
    }

    const leadService = getLeadService();
    await leadService.deleteActivity(activityId);

    return NextResponse.json({ message: 'Activity deleted successfully' });
  } catch (error) {
    logger.error('Error deleting activity', error);
    return NextResponse.json(
      { error: 'Failed to delete activity' },
      { status: 500 }
    );
  }
}

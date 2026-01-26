import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import { getDb } from '@/lib/supabase';
import { logger } from '@/lib/logger';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

interface DbAnnouncement {
  id: number;
  title: string;
  content: string;
  priority: string;
  created_by: number;
  created_at: string;
  updated_at: string;
  expires_at: string | null;
  is_active: boolean;
  target_audience: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userRole = decoded.role;

    // Get all active announcements
    const database = getDb();
    const allAnnouncements = await database.all('announcements', { is_active: true });

    const now = new Date().toISOString();

    // Filter announcements based on expiration and target audience
    const announcements = (allAnnouncements || []).filter((announcement: DbAnnouncement) => {
      // Check if announcement has expired
      if (announcement.expires_at && announcement.expires_at < now) {
        return false;
      }

      // Check target audience
      const targetAudience = announcement.target_audience || 'all';
      if (targetAudience === 'all') {
        return true;
      }

      // Filter by role
      if (targetAudience === 'managers' && (userRole === 'admin' || userRole === 'manager')) {
        return true;
      }

      if (targetAudience === 'employees' && userRole === 'employee') {
        return true;
      }

      return false;
    });

    // Sort by priority and created_at (urgent first, then by newest)
    const sortedAnnouncements = announcements.sort((a: DbAnnouncement, b: DbAnnouncement) => {
      const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 2;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 2;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });

    return NextResponse.json({
      announcements: sortedAnnouncements,
      message: 'Announcements retrieved successfully'
    });

  } catch (error) {
    logger.error('Get announcements API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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
    const userId = decoded.userId;
    const userRole = decoded.role;

    // Only admin can create announcements
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can create announcements' }, { status: 403 });
    }

    const body = await request.json();
    const { title, content, priority, expires_at, target_audience } = body;

    // Validate required fields
    if (!title?.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 });
    }

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Content is required' }, { status: 400 });
    }

    // Create new announcement
    const database = getDb();
    const announcementData = {
      title: title.trim(),
      content: content.trim(),
      priority: priority || 'normal',
      created_by: userId,
      expires_at: expires_at || null,
      is_active: true,
      target_audience: target_audience || 'all'
    };

    const announcement = await database.insert('announcements', announcementData);

    return NextResponse.json({
      announcement,
      message: 'Announcement created successfully'
    });

  } catch (error) {
    logger.error('Create announcement API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userRole = decoded.role;

    // Only admin can update announcements
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can update announcements' }, { status: 403 });
    }

    const body = await request.json();
    const { id, title, content, priority, expires_at, is_active, target_audience } = body;

    if (!id) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    // Verify announcement exists
    const database = getDb();
    const existingAnnouncement = await database.get<DbAnnouncement>('announcements', { id });
    if (!existingAnnouncement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Update announcement
    const updateData: Record<string, unknown> = {
      title: title?.trim() || existingAnnouncement.title,
      content: content?.trim() || existingAnnouncement.content,
      priority: priority || existingAnnouncement.priority,
      expires_at: expires_at !== undefined ? expires_at : existingAnnouncement.expires_at,
      is_active: is_active !== undefined ? is_active : existingAnnouncement.is_active,
      target_audience: target_audience || existingAnnouncement.target_audience
    };

    const updatedAnnouncement = await database.update('announcements', updateData, { id });

    return NextResponse.json({
      announcement: updatedAnnouncement,
      message: 'Announcement updated successfully'
    });

  } catch (error) {
    logger.error('Update announcement API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
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

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;
    const userRole = decoded.role;

    // Only admin can delete announcements
    if (userRole !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Only admins can delete announcements' }, { status: 403 });
    }

    const url = new URL(request.url);
    const announcementId = url.searchParams.get('id');

    if (!announcementId) {
      return NextResponse.json({ error: 'Announcement ID is required' }, { status: 400 });
    }

    // Verify announcement exists
    const database = getDb();
    const existingAnnouncement = await database.get<DbAnnouncement>('announcements', { id: announcementId });
    if (!existingAnnouncement) {
      return NextResponse.json({ error: 'Announcement not found' }, { status: 404 });
    }

    // Delete announcement
    await database.delete('announcements', { id: announcementId });

    return NextResponse.json({
      message: 'Announcement deleted successfully'
    });

  } catch (error) {
    logger.error('Delete announcement API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

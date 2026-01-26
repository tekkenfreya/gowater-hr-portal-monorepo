import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { getDb } from '@/lib/supabase';
import { createClient } from '@supabase/supabase-js';
import { logger } from '@/lib/logger';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function verifyAuth(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value;
  if (!token) return null;

  const authService = getAuthService();
  return await authService.verifyToken(token);
}

/**
 * GET /api/backgrounds
 * Get all active custom backgrounds
 */
export async function GET(request: NextRequest) {
  try {
    const db = getDb();
    const backgrounds = await db.all(
      'custom_backgrounds',
      { is_active: true },
      'sort_order ASC, uploaded_at DESC'
    );

    return NextResponse.json({ backgrounds });
  } catch (error) {
    logger.error('Get backgrounds API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/backgrounds
 * Upload a new background image
 */
export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const name = formData.get('name') as string || file.name;

    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: 'Invalid file type. Only JPEG, PNG, and WebP images are allowed' },
        { status: 400 }
      );
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: 'File too large. Maximum size is 5MB' },
        { status: 400 }
      );
    }

    // Generate unique filename
    const timestamp = Date.now();
    const ext = file.name.split('.').pop();
    const filename = `background-${timestamp}.${ext}`;
    const filePath = `backgrounds/${filename}`;

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      logger.error('Supabase upload error', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload file' },
        { status: 500 }
      );
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from('files')
      .getPublicUrl(filePath);

    // Save to database
    const db = getDb();
    const result = await db.insert('custom_backgrounds', {
      name,
      file_path: filePath,
      public_url: publicUrl,
      uploaded_by: user.id,
      is_active: true,
      sort_order: 0
    });

    logger.info(`Custom background uploaded by user ${user.id}`, { name, filePath });

    return NextResponse.json({
      message: 'Background uploaded successfully',
      success: true,
      background: {
        id: result.id,
        name,
        public_url: publicUrl
      }
    });
  } catch (error) {
    logger.error('Upload background API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/backgrounds?id=xxx
 * Delete a custom background (admin only)
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user || user.role !== 'admin') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { error: 'Background ID required' },
        { status: 400 }
      );
    }

    const db = getDb();

    // Get background info
    const background = await db.get('custom_backgrounds', { id });
    if (!background) {
      return NextResponse.json(
        { error: 'Background not found' },
        { status: 404 }
      );
    }

    // Delete from storage
    const { error: deleteError } = await supabase.storage
      .from('files')
      .remove([background.file_path]);

    if (deleteError) {
      logger.error('Failed to delete file from storage', deleteError);
    }

    // Delete from database
    await db.delete('custom_backgrounds', { id });

    logger.info(`Custom background deleted by user ${user.id}`, { id });

    return NextResponse.json({
      message: 'Background deleted successfully',
      success: true
    });
  } catch (error) {
    logger.error('Delete background API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

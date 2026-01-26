import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';
import FileService from '@/lib/files';
import { logger } from '@/lib/logger';

interface JWTPayload {
  userId: number;
  email: string;
  role: string;
}

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('auth-token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify token is valid
    jwt.verify(token, process.env.JWT_SECRET!) as JWTPayload;

    const { searchParams } = new URL(request.url);
    const filePath = searchParams.get('path');

    if (!filePath) {
      return NextResponse.json({ error: 'File path required' }, { status: 400 });
    }

    const downloadUrl = await FileService.getFileDownloadUrl(filePath);

    if (!downloadUrl) {
      return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
    }

    return NextResponse.json({
      downloadUrl,
      message: 'Download URL generated successfully'
    });

  } catch (error) {
    logger.error('File download API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
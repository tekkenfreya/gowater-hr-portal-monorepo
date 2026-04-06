import { NextRequest, NextResponse } from 'next/server';
import { getAuthService } from '@/lib/auth';
import { uploadToCloudinary } from '@/lib/cloudinary';
import { logger } from '@/lib/logger';

async function verifyAuth(request: NextRequest) {
  // Check for cookie-based auth
  const token = request.cookies.get('auth-token')?.value;
  if (token) {
    const authService = getAuthService();
    return await authService.verifyToken(token);
  }

  // Check for Bearer token auth (mobile app)
  const authHeader = request.headers.get('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    const bearerToken = authHeader.substring(7);
    const authService = getAuthService();
    return await authService.verifyToken(bearerToken);
  }

  return null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await verifyAuth(request);
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const photo = formData.get('photo') as File | null;
    const latitude = formData.get('latitude') as string | null;
    const longitude = formData.get('longitude') as string | null;
    const address = formData.get('address') as string | null;
    const timestamp = formData.get('timestamp') as string | null;
    const photoType = formData.get('photoType') as string | null;
    const employeeName = formData.get('employeeName') as string | null;
    const checkInTime = formData.get('checkInTime') as string | null;
    const totalHoursStr = formData.get('totalHours') as string | null;
    const breakDurationStr = formData.get('breakDuration') as string | null;
    const workLocation = formData.get('workLocation') as string | null;
    const breakPhase = formData.get('breakPhase') as string | null;

    if (!photo) {
      return NextResponse.json(
        { error: 'No photo provided' },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Format timestamp for watermark (Philippines timezone UTC+8)
    const formatPhilippinesTime = (date: Date) => {
      const phDate = new Date(date.getTime() + (8 * 60 * 60 * 1000));
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = monthNames[phDate.getUTCMonth()];
      const day = phDate.getUTCDate();
      const year = phDate.getUTCFullYear();
      let hours = phDate.getUTCHours();
      const minutes = phDate.getUTCMinutes().toString().padStart(2, '0');
      const ampm = hours >= 12 ? 'PM' : 'AM';
      hours = hours % 12 || 12;
      return `${month} ${day}, ${year}, ${hours.toString().padStart(2, '0')}:${minutes} ${ampm}`;
    };
    const watermarkTimestamp = timestamp
      ? formatPhilippinesTime(new Date(timestamp))
      : formatPhilippinesTime(new Date());

    // Prepare location text
    let locationText = '';
    if (address) {
      locationText = address;
    } else if (latitude && longitude) {
      locationText = `${parseFloat(latitude).toFixed(6)}, ${parseFloat(longitude).toFixed(6)}`;
    }

    // Skip server-side watermark if client sent skipWatermark flag (iOS sends pre-watermarked images)
    const skipWatermark = formData.get('skipWatermark') as string | null;
    const hasWatermarkData = !skipWatermark && (timestamp || latitude || longitude || address || employeeName || photoType);

    const result = await uploadToCloudinary(buffer, {
      folder: `gowater/checkin-photos/${user.id}`,
      publicId: `${photoType || 'checkin'}_${Date.now()}`,
      watermark: hasWatermarkData ? {
        locationText,
        timestamp: watermarkTimestamp,
        employeeName: employeeName || undefined,
        checkInTime: checkInTime || undefined,
        totalHours: totalHoursStr ? parseFloat(totalHoursStr) : undefined,
        breakDuration: breakDurationStr ? parseInt(breakDurationStr) : undefined,
        workLocation: workLocation || undefined,
        breakPhase: breakPhase as 'start' | 'end' | undefined,
      } : undefined,
      photoType: photoType || 'checkin'
    });

    if (!result.success) {
      logger.error('Photo upload failed', { userId: user.id, error: result.error });
      return NextResponse.json(
        { error: result.error || 'Failed to upload photo' },
        { status: 500 }
      );
    }

    logger.info('Check-in photo uploaded', {
      userId: user.id,
      photoUrl: result.url,
      location: locationText
    });

    return NextResponse.json({
      success: true,
      url: result.url,
      publicId: result.publicId
    });
  } catch (error) {
    logger.error('Upload photo API error', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

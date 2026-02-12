import { v2 as cloudinary, UploadApiOptions, UploadApiResponse } from 'cloudinary';
import { logger } from './logger';

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export interface CloudinaryUploadResult {
  success: boolean;
  url?: string;
  publicId?: string;
  error?: string;
}

export interface WatermarkOptions {
  logoPath?: string;
  locationText?: string;
  timestamp?: string;
  employeeName?: string;
  checkInTime?: string;
  totalHours?: number;
  breakDuration?: number;
  workLocation?: string;
  breakPhase?: 'start' | 'end';
}

/**
 * Encode text for Cloudinary raw URL transformations.
 * Must encode characters that conflict with Cloudinary URL syntax.
 */
function encodeCloudinaryText(text: string): string {
  return text
    .replace(/%/g, '%25')
    .replace(/ /g, '%20')
    .replace(/,/g, '%2C')
    .replace(/\//g, '%2F')
    .replace(/:/g, '%3A')
    .replace(/\|/g, '%7C')
    .replace(/#/g, '%23');
}

/**
 * Build Cloudinary transformation URL segments for watermark overlays.
 * Returns an array of raw transformation strings to be joined with '/'.
 */
function buildWatermarkTransformations(
  watermark: WatermarkOptions,
  photoType: string
): string[] {
  const segments: string[] = [];

  // Philippines time (UTC+8) - manual offset for reliability across all server environments
  const now = new Date();
  const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
  const phHours = phNow.getUTCHours().toString().padStart(2, '0');
  const phMinutes = phNow.getUTCMinutes().toString().padStart(2, '0');
  const timeOnly = `${phHours}:${phMinutes}`;

  // Format date in Philippines time: "Feb 12, 2026"
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const dateFormatted = `${monthNames[phNow.getUTCMonth()]} ${phNow.getUTCDate()}, ${phNow.getUTCFullYear()}`;

  // Determine label text and color based on photo type
  let labelName: string;
  let labelColorHex: string;
  switch (photoType) {
    case 'break':
      labelName = watermark.breakPhase === 'end' ? 'End Break' : 'Start Break';
      labelColorHex = 'f59e0b';
      break;
    case 'checkout':
      labelName = 'Log Out';
      labelColorHex = 'ef4444';
      break;
    default:
      labelName = 'Log In';
      labelColorHex = '22c55e';
      break;
  }

  // Build info lines vertically stacked below the label:
  //   Log In:      Date
  //   Start Break: Date
  //   End Break:   Date, Break Duration
  //   Log Out:     Date, Total Work Hours, Break Duration
  const infoLines: string[] = [];
  infoLines.push(dateFormatted);

  if (photoType === 'checkout') {
    const totalHrs = watermark.totalHours || 0;
    const workHours = Math.floor(totalHrs);
    const workMins = Math.round((totalHrs - workHours) * 60);
    const workText = workHours > 0 ? `${workHours}h ${workMins}m` : `${workMins}m`;
    infoLines.push(`Total Work: ${workText}`);
  }

  if (photoType === 'checkout' || (photoType === 'break' && watermark.breakPhase === 'end')) {
    const breakSecs = watermark.breakDuration || 0;
    const breakHrs = Math.floor(breakSecs / 3600);
    const breakMins = Math.floor((breakSecs % 3600) / 60);
    const breakText = breakHrs > 0 ? `${breakHrs}h ${breakMins}m` : `${breakMins}m`;
    infoLines.push(`Break: ${breakText}`);
  }

  // Layout constants
  const lineHeight = 50;
  const labelHeight = 70;
  const baseY = 30;

  // --- Layer 1: Big colored label (e.g. "Log In  15:06") ---
  const labelText = encodeCloudinaryText(`  ${labelName}  ${timeOnly}  `);
  const labelY = baseY + (infoLines.length * lineHeight) + labelHeight;
  segments.push(`l_text:Arial_52_bold:${labelText},co_white,b_rgb:${labelColorHex}`);
  segments.push(`fl_layer_apply,g_south_west,x_20,y_${labelY}`);

  // --- Layers 2+: Info lines stacked below label ---
  for (let i = 0; i < infoLines.length; i++) {
    const lineY = baseY + ((infoLines.length - 1 - i) * lineHeight) + 40;
    const lineText = encodeCloudinaryText(infoLines[i]);
    segments.push(`l_text:Arial_38_bold:${lineText},co_white`);
    segments.push(`fl_layer_apply,g_south_west,x_25,y_${lineY}`);
  }

  // --- GoWater branding (bottom-right) ---
  segments.push(`l_text:Arial_36_bold:${encodeCloudinaryText('GoWater')},co_white`);
  segments.push(`fl_layer_apply,g_south_east,x_25,y_${baseY + 40}`);

  return segments;
}

/**
 * Upload an image to Cloudinary with optional watermark
 */
export async function uploadToCloudinary(
  imageData: Buffer | string,
  options?: {
    folder?: string;
    publicId?: string;
    watermark?: WatermarkOptions;
    photoType?: string;
  }
): Promise<CloudinaryUploadResult> {
  try {
    // Check if Cloudinary is configured
    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
      logger.warn('Cloudinary not configured - skipping upload');
      return { success: false, error: 'Cloudinary is not configured' };
    }

    const folder = options?.folder || 'gowater/checkin-photos';
    const publicId = options?.publicId || `checkin_${Date.now()}`;

    // Upload the raw image first (no transformations during upload)
    const uploadOptions: UploadApiOptions = {
      folder,
      public_id: publicId,
      resource_type: 'image',
    };

    let result: UploadApiResponse;

    if (Buffer.isBuffer(imageData)) {
      result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, uploadResult) => {
            if (error) reject(error);
            else if (uploadResult) resolve(uploadResult);
            else reject(new Error('No result from Cloudinary'));
          }
        );
        uploadStream.end(imageData);
      });
    } else {
      result = await cloudinary.uploader.upload(imageData, uploadOptions);
    }

    // Build watermarked URL using on-the-fly transformations
    let finalUrl = result.secure_url;

    if (options?.watermark && (options.watermark.locationText || options.watermark.timestamp)) {
      const photoType = options.photoType || 'checkin';
      const transformationSegments = buildWatermarkTransformations(options.watermark, photoType);

      // Build the transformation URL: insert transformation segments into the Cloudinary URL
      // Cloudinary URL format: https://res.cloudinary.com/cloud/image/upload/[transformations]/v123/folder/file.jpg
      const transformationStr = transformationSegments.join('/');
      finalUrl = result.secure_url.replace('/upload/', `/upload/${transformationStr}/`);
    }

    logger.info('Cloudinary upload successful', {
      publicId: result.public_id,
      url: finalUrl
    });

    return {
      success: true,
      url: finalUrl,
      publicId: result.public_id
    };
  } catch (error) {
    logger.error('Cloudinary upload error', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload to Cloudinary'
    };
  }
}

/**
 * Delete an image from Cloudinary
 */
export async function deleteFromCloudinary(publicId: string): Promise<boolean> {
  try {
    await cloudinary.uploader.destroy(publicId);
    return true;
  } catch (error) {
    logger.error('Cloudinary delete error', error);
    return false;
  }
}

export default cloudinary;

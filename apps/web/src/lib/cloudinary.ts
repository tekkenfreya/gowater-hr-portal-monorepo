import { v2 as cloudinary, TransformationOptions, UploadApiOptions, UploadApiResponse } from 'cloudinary';
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

    // Build transformation array for watermark
    const transformations: TransformationOptions[] = [];

    // Add Timemark-style watermark overlays
    if (options?.watermark?.locationText || options?.watermark?.timestamp) {
      const photoType = options?.photoType || 'checkin';
      const watermark = options.watermark;

      // Philippines time (UTC+8) - manual offset for reliability across all server environments
      const now = new Date();
      const phNow = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const phHours = phNow.getUTCHours().toString().padStart(2, '0');
      const phMinutes = phNow.getUTCMinutes().toString().padStart(2, '0');
      const timeOnly = `${phHours}:${phMinutes}`;

      // Format date in Philippines time: "Feb 12, 2026"
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateFormatted = `${monthNames[phNow.getUTCMonth()]} ${phNow.getUTCDate()}, ${phNow.getUTCFullYear()}`;

      // Cloudinary text encoding helper: encode special chars for raw_transformation
      const encodeText = (text: string) =>
        text.replace(/%/g, '%25').replace(/ /g, '%20').replace(/,/g, '%2C').replace(/\//g, '%2F').replace(/:/g, '%3A').replace(/\|/g, '%7C').replace(/#/g, '%23');

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

      // Build info lines that go below the label (vertically stacked)
      // Each type has different info:
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

      // Calculate total height needed for vertical stack
      // Label: ~60px, each info line: ~45px, spacing: 15px between
      const lineHeight = 50;
      const labelHeight = 70;
      const totalStackHeight = labelHeight + (infoLines.length * lineHeight) + 30;
      const baseY = 30;

      // --- Layer 1: Big colored label (e.g. "Log In  15:06") ---
      const labelText = encodeText(`  ${labelName}  ${timeOnly}  `);
      transformations.push({
        raw_transformation: `l_text:Arial_52_bold:${labelText},co_white,b_rgb:${labelColorHex}/fl_layer_apply,g_south_west,x_20,y_${baseY + (infoLines.length * lineHeight) + labelHeight}`,
      });

      // --- Layers 2+: Info lines stacked below label ---
      for (let i = 0; i < infoLines.length; i++) {
        const lineY = baseY + ((infoLines.length - 1 - i) * lineHeight) + 40;
        const lineText = encodeText(infoLines[i]);
        transformations.push({
          raw_transformation: `l_text:Arial_38_bold:${lineText},co_white/fl_layer_apply,g_south_west,x_25,y_${lineY}`,
        });
      }

      // --- GoWater branding (bottom-right) ---
      transformations.push({
        raw_transformation: `l_text:Arial_36_bold:${encodeText('GoWater')},co_white/fl_layer_apply,g_south_east,x_25,y_${baseY + 40}`,
      });
    }

    // Prepare upload options
    const uploadOptions: UploadApiOptions = {
      folder,
      public_id: publicId,
      resource_type: 'image',
      transformation: transformations.length > 0 ? transformations : undefined,
    };

    let result;

    if (Buffer.isBuffer(imageData)) {
      // Upload from buffer
      result = await new Promise<UploadApiResponse>((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
          uploadOptions,
          (error, result) => {
            if (error) reject(error);
            else if (result) resolve(result);
            else reject(new Error('No result from Cloudinary'));
          }
        );
        uploadStream.end(imageData);
      });
    } else {
      // Upload from base64 or URL
      result = await cloudinary.uploader.upload(imageData, uploadOptions);
    }

    logger.info('Cloudinary upload successful', {
      publicId: result.public_id,
      url: result.secure_url
    });

    return {
      success: true,
      url: result.secure_url,
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

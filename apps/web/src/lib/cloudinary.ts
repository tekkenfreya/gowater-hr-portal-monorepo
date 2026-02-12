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

      // Format date in Philippines time: "Wed, Feb 11, 2026"
      const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const dateText = `${dayNames[phNow.getUTCDay()]}%2C ${monthNames[phNow.getUTCMonth()]} ${phNow.getUTCDate()}%2C ${phNow.getUTCFullYear()}`;

      // Determine label text and color based on photo type
      let labelName: string;
      let labelColorHex: string; // without #, for Cloudinary rgb: format
      switch (photoType) {
        case 'break':
          labelName = 'Break';
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

      // Determine base Y offset (stats bar shifts everything up)
      const hasStats = (photoType === 'break' || photoType === 'checkout') &&
        watermark.checkInTime && watermark.totalHours !== undefined;
      const baseY = hasStats ? 70 : 20;

      // Cloudinary text encoding helper: encode special chars for text overlay
      const encodeText = (text: string) =>
        text.replace(/%/g, '%25').replace(/ /g, '%20').replace(/,/g, '%2C').replace(/\//g, '%2F').replace(/:/g, '%3A').replace(/\|/g, '%7C').replace(/#/g, '%23');

      // --- Layer 1: Type label with COLORED BACKGROUND ---
      // Use raw_transformation because SDK's `background` property applies to
      // the base image, not the text overlay. raw_transformation gives us direct
      // control over the Cloudinary URL where b_rgb: is part of the overlay layer.
      const labelText = encodeText(`  ${labelName}  ${timeOnly}  `);
      transformations.push({
        raw_transformation: `l_text:Arial_36_bold:${labelText},co_white,b_rgb:${labelColorHex}/fl_layer_apply,g_south_west,x_20,y_${baseY + 130}`,
      });

      // --- Layer 2: Date ---
      transformations.push({
        overlay: {
          font_family: 'Arial',
          font_size: 24,
          font_weight: 'bold',
          text: dateText,
        },
        color: '#FFFFFFDD',
        gravity: 'south_west',
        x: 20,
        y: baseY + 90,
        effect: 'shadow:40',
      } as TransformationOptions);

      // --- Layer 3: Address ---
      if (watermark.locationText) {
        const addressText = watermark.locationText.length > 50
          ? watermark.locationText.substring(0, 50) + '...'
          : watermark.locationText;

        transformations.push({
          overlay: {
            font_family: 'Arial',
            font_size: 20,
            text: encodeText(addressText),
          },
          color: '#FFFFFFCC',
          gravity: 'south_west',
          x: 20,
          y: baseY + 58,
          effect: 'shadow:40',
        } as TransformationOptions);
      }

      // --- Layer 4: GoWater branding (bottom-right) ---
      transformations.push({
        overlay: {
          font_family: 'Arial',
          font_size: 28,
          font_weight: 'bold',
          text: 'GoWater',
        },
        color: '#FFFFFFDD',
        gravity: 'south_east',
        x: 20,
        y: baseY + 58,
        effect: 'shadow:40',
      } as TransformationOptions);

      // --- Layer 5: Stats bar (break + checkout only) ---
      if (hasStats) {
        const checkInTimeStr = watermark.checkInTime || '';
        let checkInFormatted = '';
        try {
          const ciDate = new Date(checkInTimeStr);
          if (!isNaN(ciDate.getTime())) {
            // Convert check-in time to Philippines timezone (UTC+8)
            const ciPh = new Date(ciDate.getTime() + (8 * 60 * 60 * 1000));
            checkInFormatted = `${ciPh.getUTCHours().toString().padStart(2, '0')}:${ciPh.getUTCMinutes().toString().padStart(2, '0')}`;
          } else {
            checkInFormatted = checkInTimeStr;
          }
        } catch {
          checkInFormatted = checkInTimeStr;
        }

        const totalHrs = watermark.totalHours || 0;
        const workHours = Math.floor(totalHrs);
        const workMins = Math.round((totalHrs - workHours) * 60);
        const workText = workHours > 0 ? `${workHours}h${workMins}m` : `${workMins}m`;

        const breakSecs = watermark.breakDuration || 0;
        const breakHrs = Math.floor(breakSecs / 3600);
        const breakMins = Math.floor((breakSecs % 3600) / 60);
        const breakText = breakHrs > 0 ? `${breakHrs}h${breakMins}m` : `${breakMins}m`;

        // Stats bar also uses raw_transformation for the dark background
        const statsBarText = encodeText(`  On duty ${checkInFormatted}-${timeOnly}  |  Work ${workText}  |  Break ${breakText}  `);
        transformations.push({
          raw_transformation: `l_text:Arial_20_bold:${statsBarText},co_white,b_rgb:000000/fl_layer_apply,g_south,y_10`,
        });
      }
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

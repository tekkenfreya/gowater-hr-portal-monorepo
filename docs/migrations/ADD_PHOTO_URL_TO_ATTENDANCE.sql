-- Migration: Add photo_url columns to attendance table
-- Purpose: Store check-in and check-out photos uploaded to Cloudinary
-- Date: 2026-01-28

-- Add photo_url column for check-in photos
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Add checkout_photo_url column for check-out photos
ALTER TABLE attendance ADD COLUMN IF NOT EXISTS checkout_photo_url TEXT;

-- Add index for faster queries on photo_url (optional, for filtering records with photos)
CREATE INDEX IF NOT EXISTS idx_attendance_photo_url ON attendance (photo_url) WHERE photo_url IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_attendance_checkout_photo_url ON attendance (checkout_photo_url) WHERE checkout_photo_url IS NOT NULL;

-- Comments for documentation
COMMENT ON COLUMN attendance.photo_url IS 'URL of check-in photo stored in Cloudinary, includes watermark with location and timestamp';
COMMENT ON COLUMN attendance.checkout_photo_url IS 'URL of check-out photo stored in Cloudinary, includes watermark with location and timestamp';

-- Migration: Update reports table to support base64 images
-- Date: 2025-01-24
-- Description: Add images_base64 column to store report images as base64 strings

-- Add the images_base64 column if it doesn't exist (stores array of base64 image strings)
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS images_base64 jsonb NULL;

-- Add comment to describe the column
COMMENT ON COLUMN public.reports.images_base64 IS 'Array of base64-encoded images for the report';

-- Optional: If you have an old image_urls column, you can remove it or keep it for backward compatibility
-- To keep both columns for now, no action needed
-- To remove the old column (only do this if you're sure it's not being used):
-- ALTER TABLE public.reports DROP COLUMN IF EXISTS image_urls;


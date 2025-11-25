-- Migration: Update collectors table for base64 image storage
-- This removes the need for storage buckets and simplifies image handling

-- Option 1: Rename existing column
ALTER TABLE public.collectors 
  RENAME COLUMN profile_image TO profile_image_base64;

-- Option 2: If you want to add a new column instead (keep both):
-- ALTER TABLE public.collectors 
--   ADD COLUMN IF NOT EXISTS profile_image_base64 text;

-- Add comment to explain the column
COMMENT ON COLUMN public.collectors.profile_image_base64 IS 'Base64 encoded profile image data URL (e.g., data:image/jpeg;base64,...)';

-- Updated table definition for reference:
/*
CREATE TABLE IF NOT EXISTS public.collectors (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  collector_id character varying(50) NULL DEFAULT (
    'COL'::text || (
      EXTRACT(
        epoch
        FROM
          now()
      )
    )::text
  ),
  "firstName" character varying(255) NOT NULL,
  "lastName" character varying(255) NULL,
  contact character varying(20) NULL,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  password text NULL,
  driver text NULL,
  crew json NULL,
  status text NULL,
  profile_image_base64 text NULL,
  CONSTRAINT collectors_pkey PRIMARY KEY (id),
  CONSTRAINT collectors_collector_id_key UNIQUE (collector_id)
) TABLESPACE pg_default;

CREATE INDEX IF NOT EXISTS idx_collectors_name 
  ON public.collectors 
  USING btree ("firstName", "lastName") 
  TABLESPACE pg_default;
*/


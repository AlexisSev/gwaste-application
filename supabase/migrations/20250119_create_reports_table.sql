-- Create reports table
CREATE TABLE IF NOT EXISTS public.reports (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  resident_id uuid NULL,
  report_type character varying(100) NULL,
  description text NULL,
  location text NULL,
  status character varying(50) NULL DEFAULT 'pending'::character varying,
  created_at timestamp with time zone NULL DEFAULT now(),
  updated_at timestamp with time zone NULL DEFAULT now(),
  CONSTRAINT reports_pkey PRIMARY KEY (id),
  CONSTRAINT reports_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES residents (id)
) TABLESPACE pg_default;

-- Create index on resident_id for faster queries
CREATE INDEX IF NOT EXISTS idx_reports_resident ON public.reports USING btree (resident_id) TABLESPACE pg_default;

-- Enable Row Level Security (RLS) on reports table
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Create RLS policy: Users can only view their own reports
CREATE POLICY "Users can view their own reports"
ON public.reports FOR SELECT
USING (resident_id = auth.uid());

-- Create RLS policy: Users can insert their own reports
CREATE POLICY "Users can insert their own reports"
ON public.reports FOR INSERT
WITH CHECK (resident_id = auth.uid());

-- Create RLS policy: Users can update their own reports
CREATE POLICY "Users can update their own reports"
ON public.reports FOR UPDATE
USING (resident_id = auth.uid());

-- Create RLS policy: Users can delete their own reports
CREATE POLICY "Users can delete their own reports"
ON public.reports FOR DELETE
USING (resident_id = auth.uid());

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reports TO authenticated;

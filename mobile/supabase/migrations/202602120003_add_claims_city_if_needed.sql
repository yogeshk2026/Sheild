-- Optional migration: run this only if your product requirements need
-- a dedicated `city` column on `public.claims`.
--
-- NOTE: After running this migration, refresh Supabase schema metadata:
-- Dashboard -> Database -> Tables -> claims -> refresh

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'claims'
  ) AND NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'claims'
      AND column_name = 'city'
  ) THEN
    ALTER TABLE public.claims
      ADD COLUMN city text;
  END IF;
END $$;

-- Ensure claims.user_id is compatible with auth.users(id)
-- and enforce per-user access via RLS.

-- 1) Ensure `user_id` column type is uuid (matches auth.users.id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'claims'
      AND column_name = 'user_id'
      AND data_type <> 'uuid'
  ) THEN
    ALTER TABLE public.claims
      ALTER COLUMN user_id TYPE uuid
      USING user_id::uuid;
  END IF;
END $$;

-- 2) Ensure FK points to auth.users(id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE table_schema = 'public'
      AND table_name = 'claims'
      AND constraint_name = 'claims_user_id_fkey'
  ) THEN
    ALTER TABLE public.claims
      DROP CONSTRAINT claims_user_id_fkey;
  END IF;

  ALTER TABLE public.claims
    ADD CONSTRAINT claims_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;
END $$;

-- 3) Enable RLS and add policies for owner-only access
ALTER TABLE public.claims ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'claims'
      AND policyname = 'Users can insert own claims'
  ) THEN
    CREATE POLICY "Users can insert own claims"
      ON public.claims
      FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'claims'
      AND policyname = 'Users can view own claims'
  ) THEN
    CREATE POLICY "Users can view own claims"
      ON public.claims
      FOR SELECT
      USING (auth.uid() = user_id);
  END IF;
END $$;

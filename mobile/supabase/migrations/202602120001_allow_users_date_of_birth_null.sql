DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'date_of_birth'
  ) THEN
    ALTER TABLE public.users
      ALTER COLUMN date_of_birth DROP NOT NULL;
  END IF;
END $$;

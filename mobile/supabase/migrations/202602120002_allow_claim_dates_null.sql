DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'claims'
      AND column_name = 'issue_date'
  ) THEN
    ALTER TABLE public.claims
      ALTER COLUMN issue_date DROP NOT NULL;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'claims'
      AND column_name = 'payment_due_by'
  ) THEN
    ALTER TABLE public.claims
      ALTER COLUMN payment_due_by DROP NOT NULL;
  END IF;
END $$;

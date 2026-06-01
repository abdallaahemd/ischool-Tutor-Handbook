
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Enable read for all') THEN
    CREATE POLICY "Enable read for all" ON public.categories FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Enable insert for authenticated') THEN
    CREATE POLICY "Enable insert for authenticated" ON public.categories FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Enable update for authenticated') THEN
    CREATE POLICY "Enable update for authenticated" ON public.categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='categories' AND policyname='Enable delete for authenticated') THEN
    CREATE POLICY "Enable delete for authenticated" ON public.categories FOR DELETE TO authenticated USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='Enable read for all') THEN
    CREATE POLICY "Enable read for all" ON public.cards FOR SELECT TO anon, authenticated USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='Enable insert for authenticated') THEN
    CREATE POLICY "Enable insert for authenticated" ON public.cards FOR INSERT TO authenticated WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='Enable update for authenticated') THEN
    CREATE POLICY "Enable update for authenticated" ON public.cards FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cards' AND policyname='Enable delete for authenticated') THEN
    CREATE POLICY "Enable delete for authenticated" ON public.cards FOR DELETE TO authenticated USING (true);
  END IF;
END $$;

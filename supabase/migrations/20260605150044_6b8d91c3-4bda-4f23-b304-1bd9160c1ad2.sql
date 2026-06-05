
-- cards: drop over-permissive write policies
DROP POLICY IF EXISTS "Anon can insert cards" ON public.cards;
DROP POLICY IF EXISTS "Anon can update cards" ON public.cards;
DROP POLICY IF EXISTS "Anon can delete cards" ON public.cards;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.cards;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.cards;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON public.cards;

-- categories: drop over-permissive write policies
DROP POLICY IF EXISTS "Anon can insert categories" ON public.categories;
DROP POLICY IF EXISTS "Anon can update categories" ON public.categories;
DROP POLICY IF EXISTS "Anon can delete categories" ON public.categories;
DROP POLICY IF EXISTS "Enable insert for authenticated" ON public.categories;
DROP POLICY IF EXISTS "Enable update for authenticated" ON public.categories;
DROP POLICY IF EXISTS "Enable delete for authenticated" ON public.categories;

-- materials: drop over-permissive write policies
DROP POLICY IF EXISTS "Anon can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Anon can update materials" ON public.materials;
DROP POLICY IF EXISTS "Anon can delete materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated can insert materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated can update materials" ON public.materials;
DROP POLICY IF EXISTS "Authenticated can delete materials" ON public.materials;

-- storage: drop public write policies on materials bucket
DROP POLICY IF EXISTS "Anyone can upload to materials bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can update materials bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can delete from materials bucket" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read materials bucket" ON storage.objects;

-- sync_logs: restrict reads to admins only
DROP POLICY IF EXISTS "anyone can read sync_logs" ON public.sync_logs;
CREATE POLICY "Admins can read sync_logs"
  ON public.sync_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Lock down SECURITY DEFINER RPCs so anon cannot execute them
REVOKE EXECUTE ON FUNCTION public.sync_tutors_from_sheet(jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.sync_tutors_from_sheet(jsonb) TO service_role;

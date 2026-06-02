
-- Cards: allow anon writes (admin uses custom session, not Supabase auth)
CREATE POLICY "Anon can insert cards" ON public.cards FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update cards" ON public.cards FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete cards" ON public.cards FOR DELETE TO anon USING (true);

-- Categories
CREATE POLICY "Anon can insert categories" ON public.categories FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update categories" ON public.categories FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete categories" ON public.categories FOR DELETE TO anon USING (true);

-- Materials
CREATE POLICY "Anon can insert materials" ON public.materials FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon can update materials" ON public.materials FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "Anon can delete materials" ON public.materials FOR DELETE TO anon USING (true);
CREATE POLICY "Authenticated can insert materials" ON public.materials FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated can update materials" ON public.materials FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Authenticated can delete materials" ON public.materials FOR DELETE TO authenticated USING (true);

-- Storage bucket policies for materials uploads
CREATE POLICY "Anyone can read materials bucket" ON storage.objects FOR SELECT USING (bucket_id = 'materials');
CREATE POLICY "Anyone can upload to materials bucket" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'materials');
CREATE POLICY "Anyone can update materials bucket" ON storage.objects FOR UPDATE USING (bucket_id = 'materials');
CREATE POLICY "Anyone can delete from materials bucket" ON storage.objects FOR DELETE USING (bucket_id = 'materials');

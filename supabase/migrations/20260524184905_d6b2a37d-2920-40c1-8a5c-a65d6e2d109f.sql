
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- Categories
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  icon text NOT NULL DEFAULT 'Folder',
  description text NOT NULL DEFAULT '',
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Categories are public readable" ON public.categories FOR SELECT USING (true);
CREATE POLICY "Admins manage categories" ON public.categories FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Cards
CREATE TABLE public.cards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES public.categories(id) ON DELETE CASCADE NOT NULL,
  header text NOT NULL,
  body text NOT NULL DEFAULT '',
  icon_style text NOT NULL DEFAULT 'link',
  icon text NOT NULL DEFAULT 'Link2',
  view_link text,
  open_link text NOT NULL,
  "order" integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.cards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Cards are public readable" ON public.cards FOR SELECT USING (true);
CREATE POLICY "Admins manage cards" ON public.cards FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Materials
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  category_id uuid REFERENCES public.categories(id) ON DELETE SET NULL,
  type text NOT NULL DEFAULT 'link',
  url text,
  storage_path text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Materials public readable" ON public.materials FOR SELECT USING (true);
CREATE POLICY "Admins manage materials" ON public.materials FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Storage bucket
INSERT INTO storage.buckets (id, name, public) VALUES ('materials', 'materials', false);

CREATE POLICY "Admins read materials storage" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins insert materials storage" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update materials storage" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete materials storage" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'materials' AND public.has_role(auth.uid(), 'admin'));

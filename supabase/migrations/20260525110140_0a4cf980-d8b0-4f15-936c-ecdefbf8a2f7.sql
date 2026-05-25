
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

ALTER TABLE public.admins ADD COLUMN IF NOT EXISTS password_hash text;
UPDATE public.admins
SET password_hash = extensions.crypt(password, extensions.gen_salt('bf'))
WHERE password_hash IS NULL;
ALTER TABLE public.admins ALTER COLUMN password_hash SET NOT NULL;
ALTER TABLE public.admins DROP COLUMN password;

DROP POLICY IF EXISTS "Allow public read for login" ON public.admins;

CREATE OR REPLACE FUNCTION public.verify_admin_login(_email text, _password text)
RETURNS TABLE (id uuid, email text, name text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.email, a.name
  FROM public.admins a
  WHERE a.email = _email
    AND a.password_hash = extensions.crypt(_password, a.password_hash);
END;
$$;

REVOKE ALL ON FUNCTION public.verify_admin_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_admin_login(text, text) TO anon, authenticated;

CREATE POLICY "Admins insert roles" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update roles" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete roles" ON public.user_roles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

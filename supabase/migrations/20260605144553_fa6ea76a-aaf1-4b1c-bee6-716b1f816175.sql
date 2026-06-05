
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- tutors
CREATE TABLE public.tutors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.tutors TO service_role;
ALTER TABLE public.tutors ENABLE ROW LEVEL SECURITY;
-- No public policies: tutors table is only accessed via SECURITY DEFINER functions / service role.

-- sync_logs
CREATE TABLE public.sync_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sync_time timestamptz NOT NULL DEFAULT now(),
  status text NOT NULL,
  records_processed integer NOT NULL DEFAULT 0,
  error_message text
);
GRANT SELECT ON public.sync_logs TO anon, authenticated;
GRANT ALL ON public.sync_logs TO service_role;
ALTER TABLE public.sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "anyone can read sync_logs" ON public.sync_logs FOR SELECT TO anon, authenticated USING (true);

-- verify tutor login (SECURITY DEFINER bypasses RLS)
CREATE OR REPLACE FUNCTION public.verify_tutor_login(_email text, _password text)
RETURNS TABLE(id uuid, email text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.email
  FROM public.tutors t
  WHERE lower(t.email) = lower(_email)
    AND t.password_hash = extensions.crypt(_password, t.password_hash);
END;
$$;
GRANT EXECUTE ON FUNCTION public.verify_tutor_login(text, text) TO anon, authenticated;

-- bulk sync of tutors from the sheet. Accepts a JSON array of {email,password}.
-- Hashes passwords, upserts new/changed rows, deletes tutors not in the sheet.
CREATE OR REPLACE FUNCTION public.sync_tutors_from_sheet(_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  r jsonb;
  v_email text;
  v_password text;
  v_existing_hash text;
  v_count integer := 0;
  v_emails text[] := ARRAY[]::text[];
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(_rows)
  LOOP
    v_email := lower(trim(r->>'email'));
    v_password := r->>'password';
    IF v_email IS NULL OR v_email = '' OR v_password IS NULL OR v_password = '' THEN
      CONTINUE;
    END IF;
    v_emails := array_append(v_emails, v_email);

    SELECT password_hash INTO v_existing_hash FROM public.tutors WHERE email = v_email;
    IF v_existing_hash IS NULL THEN
      INSERT INTO public.tutors(email, password_hash)
      VALUES (v_email, extensions.crypt(v_password, extensions.gen_salt('bf')));
    ELSIF v_existing_hash <> extensions.crypt(v_password, v_existing_hash) THEN
      UPDATE public.tutors
      SET password_hash = extensions.crypt(v_password, extensions.gen_salt('bf')),
          updated_at = now()
      WHERE email = v_email;
    END IF;
    v_count := v_count + 1;
  END LOOP;

  DELETE FROM public.tutors WHERE NOT (email = ANY(v_emails));
  RETURN v_count;
END;
$$;
GRANT EXECUTE ON FUNCTION public.sync_tutors_from_sheet(jsonb) TO service_role;

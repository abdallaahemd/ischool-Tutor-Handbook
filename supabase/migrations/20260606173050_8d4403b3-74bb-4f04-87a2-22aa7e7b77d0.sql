
DROP FUNCTION IF EXISTS public.verify_tutor_login(text, text);
DROP FUNCTION IF EXISTS public.sync_tutors_from_sheet(jsonb);

TRUNCATE TABLE public.tutors;
ALTER TABLE public.tutors DROP CONSTRAINT IF EXISTS tutors_email_key;
ALTER TABLE public.tutors RENAME COLUMN email TO tutor_id;
ALTER TABLE public.tutors ADD COLUMN IF NOT EXISTS name text NOT NULL DEFAULT '';
CREATE UNIQUE INDEX IF NOT EXISTS tutors_tutor_id_key ON public.tutors(tutor_id);

CREATE OR REPLACE FUNCTION public.verify_tutor_login(_tutor_id text, _password text)
RETURNS TABLE(id uuid, tutor_id text, name text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
BEGIN
  RETURN QUERY
  SELECT t.id, t.tutor_id, t.name
  FROM public.tutors t
  WHERE upper(t.tutor_id) = upper(_tutor_id)
    AND t.password_hash = extensions.crypt(_password, t.password_hash);
END;
$$;
REVOKE ALL ON FUNCTION public.verify_tutor_login(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.verify_tutor_login(text, text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.sync_tutors_from_sheet(_rows jsonb)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, extensions
AS $$
DECLARE
  r jsonb;
  v_tid text; v_password text; v_name text;
  v_existing_hash text; v_existing_name text;
  v_added int := 0; v_updated int := 0; v_deleted int := 0; v_processed int := 0;
  v_ids text[] := ARRAY[]::text[];
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    v_tid := upper(trim(coalesce(r->>'tutor_id', '')));
    v_password := coalesce(r->>'password', '');
    v_name := trim(coalesce(r->>'name', ''));
    IF v_tid = '' OR v_password = '' THEN CONTINUE; END IF;
    v_ids := array_append(v_ids, v_tid);
    v_processed := v_processed + 1;

    SELECT password_hash, name INTO v_existing_hash, v_existing_name
    FROM public.tutors WHERE tutor_id = v_tid;

    IF v_existing_hash IS NULL THEN
      INSERT INTO public.tutors(tutor_id, password_hash, name)
      VALUES (v_tid, extensions.crypt(v_password, extensions.gen_salt('bf')), v_name);
      v_added := v_added + 1;
    ELSIF v_existing_hash <> extensions.crypt(v_password, v_existing_hash)
       OR coalesce(v_existing_name, '') <> v_name THEN
      UPDATE public.tutors
      SET password_hash = CASE
            WHEN password_hash <> extensions.crypt(v_password, password_hash)
            THEN extensions.crypt(v_password, extensions.gen_salt('bf'))
            ELSE password_hash END,
          name = v_name,
          updated_at = now()
      WHERE tutor_id = v_tid;
      v_updated := v_updated + 1;
    END IF;
  END LOOP;

  WITH del AS (
    DELETE FROM public.tutors WHERE NOT (tutor_id = ANY(v_ids)) RETURNING 1
  )
  SELECT count(*) INTO v_deleted FROM del;

  RETURN jsonb_build_object('processed', v_processed, 'added', v_added,
                            'updated', v_updated, 'deleted', v_deleted);
END;
$$;
REVOKE ALL ON FUNCTION public.sync_tutors_from_sheet(jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.sync_tutors_from_sheet(jsonb) TO service_role;

CREATE TABLE IF NOT EXISTS public.tutor_import_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_at timestamptz NOT NULL DEFAULT now(),
  imported_by text,
  filename text,
  total_records int NOT NULL DEFAULT 0,
  added_count int NOT NULL DEFAULT 0,
  updated_count int NOT NULL DEFAULT 0,
  deleted_count int NOT NULL DEFAULT 0,
  failed_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success'
);
GRANT SELECT ON public.tutor_import_logs TO authenticated;
GRANT ALL ON public.tutor_import_logs TO service_role;
ALTER TABLE public.tutor_import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read tutor_import_logs"
ON public.tutor_import_logs FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

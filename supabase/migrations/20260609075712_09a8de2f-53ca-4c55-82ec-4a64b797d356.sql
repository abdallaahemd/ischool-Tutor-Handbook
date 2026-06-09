
-- 1) Reset admins
DELETE FROM public.admins;
INSERT INTO public.admins (email, password_hash, name)
VALUES ('education@ischool.com',
        extensions.crypt('P@ssword_1234', extensions.gen_salt('bf')),
        'iSchool Admin');

-- 2) Update sync_tutors_from_sheet default password
CREATE OR REPLACE FUNCTION public.sync_tutors_from_sheet(_rows jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  r jsonb;
  v_tid text; v_name text;
  v_existing_id uuid; v_existing_name text;
  v_added int := 0; v_updated int := 0; v_deleted int := 0; v_processed int := 0;
  v_ids text[] := ARRAY[]::text[];
  v_default_pw constant text := 'TutorPassword';
BEGIN
  FOR r IN SELECT * FROM jsonb_array_elements(_rows) LOOP
    v_tid := upper(trim(coalesce(r->>'tutor_id', '')));
    v_name := trim(coalesce(r->>'name', ''));
    IF v_tid = '' THEN CONTINUE; END IF;
    v_ids := array_append(v_ids, v_tid);
    v_processed := v_processed + 1;

    SELECT id, name INTO v_existing_id, v_existing_name
    FROM public.tutors WHERE tutor_id = v_tid;

    IF v_existing_id IS NULL THEN
      INSERT INTO public.tutors(tutor_id, password_hash, name, must_change_password)
      VALUES (v_tid, extensions.crypt(v_default_pw, extensions.gen_salt('bf')), v_name, true);
      v_added := v_added + 1;
    ELSIF coalesce(v_existing_name, '') <> v_name THEN
      UPDATE public.tutors
      SET name = v_name, updated_at = now()
      WHERE id = v_existing_id;
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
$function$;

-- 3) Update change_tutor_password to reject defaults
CREATE OR REPLACE FUNCTION public.change_tutor_password(_tutor_id text, _current_password text, _new_password text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_hash text;
  v_id uuid;
BEGIN
  IF length(coalesce(_new_password, '')) < 8 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Password must be at least 8 characters.');
  END IF;
  IF _new_password IN ('TutorPassword', 'P@ssword_1234') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'You cannot use the default password.');
  END IF;

  SELECT id, password_hash INTO v_id, v_hash
  FROM public.tutors WHERE upper(tutor_id) = upper(_tutor_id);

  IF v_id IS NULL OR v_hash IS NULL OR v_hash <> extensions.crypt(_current_password, v_hash) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Current credentials are invalid.');
  END IF;

  IF v_hash = extensions.crypt(_new_password, v_hash) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'New password cannot match your current password.');
  END IF;

  UPDATE public.tutors
  SET password_hash = extensions.crypt(_new_password, extensions.gen_salt('bf')),
      must_change_password = false,
      updated_at = now()
  WHERE id = v_id;

  RETURN jsonb_build_object('ok', true);
END;
$function$;

-- 4) Extend verify_tutor_login to accept the admin account via tutor login
CREATE OR REPLACE FUNCTION public.verify_tutor_login(_tutor_id text, _password text)
 RETURNS TABLE(id uuid, tutor_id text, name text, must_change_password boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  -- Regular tutor lookup
  RETURN QUERY
  SELECT t.id, t.tutor_id, t.name, t.must_change_password
  FROM public.tutors t
  WHERE upper(t.tutor_id) = upper(_tutor_id)
    AND t.password_hash = extensions.crypt(_password, t.password_hash);

  IF FOUND THEN
    RETURN;
  END IF;

  -- Admin fallback: allow admin to use tutor login with their email/password
  RETURN QUERY
  SELECT a.id, ('ADMIN:' || a.email)::text AS tutor_id, a.name, false AS must_change_password
  FROM public.admins a
  WHERE lower(a.email) = lower(_tutor_id)
    AND a.password_hash = extensions.crypt(_password, a.password_hash);
END;
$function$;

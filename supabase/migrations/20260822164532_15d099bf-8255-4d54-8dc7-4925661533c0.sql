-- Improved normalization: lowercase, strip punctuation, collapse whitespace
CREATE OR REPLACE FUNCTION public.faq_normalize(_text text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path TO 'public'
AS $$
  SELECT btrim(regexp_replace(regexp_replace(lower(coalesce(_text,'')), '[^a-z0-9 ]+', ' ', 'g'), '\s+', ' ', 'g'))
$$;

-- Backfill stored normalized variants with the improved logic
UPDATE public.faq_question_variants
SET normalized_variant = public.faq_normalize(variant)
WHERE normalized_variant IS DISTINCT FROM public.faq_normalize(variant);

-- Exact duplicate + similar check in one call
CREATE OR REPLACE FUNCTION public.faq_check_duplicate(_question text, _limit integer DEFAULT 5)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $$
DECLARE
  nq text := public.faq_normalize(_question);
  v_exact jsonb;
  v_similar jsonb;
BEGIN
  IF nq = '' THEN
    RETURN jsonb_build_object('exact', NULL, 'similar', '[]'::jsonb);
  END IF;

  SELECT to_jsonb(x) INTO v_exact
  FROM (
    SELECT t.id AS topic_id, t.title, t.main_question, t.status, t.category_id,
           'main_question'::text AS matched_on, NULL::text AS matched_variant
    FROM public.faq_knowledge_topics t
    WHERE public.faq_normalize(t.main_question) = nq
    LIMIT 1
  ) x;

  IF v_exact IS NULL THEN
    SELECT to_jsonb(x) INTO v_exact
    FROM (
      SELECT t.id AS topic_id, t.title, t.main_question, t.status, t.category_id,
             'variant'::text AS matched_on, v.variant AS matched_variant
      FROM public.faq_question_variants v
      JOIN public.faq_knowledge_topics t ON t.id = v.topic_id
      WHERE v.normalized_variant = nq
      LIMIT 1
    ) x;
  END IF;

  SELECT COALESCE(jsonb_agg(to_jsonb(s)), '[]'::jsonb) INTO v_similar
  FROM (
    SELECT t.id AS topic_id, t.title, t.main_question, t.status, t.category_id,
           v.variant AS matched_variant,
           GREATEST(
             similarity(public.faq_normalize(t.main_question), nq),
             similarity(public.faq_normalize(t.title), nq),
             COALESCE(similarity(v.normalized_variant, nq), 0)
           )::real AS score
    FROM public.faq_knowledge_topics t
    LEFT JOIN LATERAL (
      SELECT vv.variant, vv.normalized_variant
      FROM public.faq_question_variants vv
      WHERE vv.topic_id = t.id
      ORDER BY similarity(vv.normalized_variant, nq) DESC
      LIMIT 1
    ) v ON true
    WHERE t.status <> 'archived'
      AND GREATEST(
            similarity(public.faq_normalize(t.main_question), nq),
            similarity(public.faq_normalize(t.title), nq),
            COALESCE(similarity(v.normalized_variant, nq), 0)
          ) > 0.3
    ORDER BY score DESC
    LIMIT COALESCE(_limit, 5)
  ) s;

  RETURN jsonb_build_object('exact', v_exact, 'similar', v_similar);
END;
$$;

REVOKE ALL ON FUNCTION public.faq_check_duplicate(text, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.faq_check_duplicate(text, integer) TO authenticated, service_role;
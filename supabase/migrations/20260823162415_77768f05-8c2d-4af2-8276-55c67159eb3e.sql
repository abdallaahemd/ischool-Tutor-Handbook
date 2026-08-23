DROP FUNCTION IF EXISTS public.faq_search(text, integer);

CREATE OR REPLACE FUNCTION public.faq_search(_query text, _limit integer DEFAULT 5)
 RETURNS TABLE(topic_id uuid, title text, main_question text, answer text, status text, priority text, category_id uuid, category_name text, matched_variant text, match_type text, score real)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
  WITH q AS (SELECT public.faq_normalize(_query) AS nq, _query AS raw),
  scored AS (
    SELECT
      t.id AS topic_id, t.title, t.main_question, t.answer, t.status, t.priority,
      t.category_id, c.name AS category_name,
      v.variant AS matched_variant,
      -- component scores
      CASE WHEN public.faq_normalize(t.main_question) = (SELECT nq FROM q) THEN 1.0
           WHEN COALESCE(v.normalized_variant,'') = (SELECT nq FROM q) THEN 0.97
           WHEN public.faq_normalize(t.title) = (SELECT nq FROM q) THEN 0.94
           ELSE 0 END AS exact_score,
      similarity(public.faq_normalize(t.main_question), (SELECT nq FROM q)) * 0.90 AS canonical_score,
      COALESCE(similarity(v.normalized_variant, (SELECT nq FROM q)), 0) * 0.85 AS variant_score,
      GREATEST(
        similarity(public.faq_normalize(t.title), (SELECT nq FROM q)) * 0.70,
        CASE WHEN to_tsvector('english', t.title || ' ' || t.main_question || ' ' || t.answer)
                  @@ plainto_tsquery('english', (SELECT raw FROM q)) THEN 0.55 ELSE 0 END,
        CASE WHEN c.name IS NOT NULL
                  AND similarity(public.faq_normalize(c.name), (SELECT nq FROM q)) > 0.35
             THEN 0.40 ELSE 0 END
      ) AS keyword_score
    FROM public.faq_knowledge_topics t
    LEFT JOIN public.faq_categories c ON c.id = t.category_id
    LEFT JOIN LATERAL (
      SELECT vv.variant, vv.normalized_variant
      FROM public.faq_question_variants vv
      WHERE vv.topic_id = t.id
      ORDER BY similarity(vv.normalized_variant, (SELECT nq FROM q)) DESC
      LIMIT 1
    ) v ON true
    WHERE t.status = 'verified'
  )
  SELECT topic_id, title, main_question, answer, status, priority, category_id, category_name,
         matched_variant,
         CASE
           WHEN exact_score > 0 THEN 'exact'
           WHEN canonical_score >= GREATEST(variant_score, keyword_score) THEN 'canonical'
           WHEN variant_score >= keyword_score THEN 'variant'
           ELSE 'keyword'
         END AS match_type,
         GREATEST(exact_score, canonical_score, variant_score, keyword_score)::real AS score
  FROM scored
  WHERE GREATEST(exact_score, canonical_score, variant_score, keyword_score) > 0.2
  ORDER BY score DESC, title ASC
  LIMIT COALESCE(_limit, 5);
$function$;

CREATE OR REPLACE FUNCTION public.faq_admin_stats()
 RETURNS jsonb
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT jsonb_build_object(
    'categories', (SELECT count(*) FROM public.faq_categories),
    'topics', (SELECT count(*) FROM public.faq_knowledge_topics),
    'verified', (SELECT count(*) FROM public.faq_knowledge_topics WHERE status = 'verified'),
    'draft', (SELECT count(*) FROM public.faq_knowledge_topics WHERE status = 'draft'),
    'needs_review', (SELECT count(*) FROM public.faq_knowledge_topics WHERE status = 'needs_review'),
    'archived', (SELECT count(*) FROM public.faq_knowledge_topics WHERE status = 'archived'),
    'variants', (SELECT count(*) FROM public.faq_question_variants),
    'sources', (SELECT count(*) FROM public.faq_knowledge_sources),
    'recent', COALESCE((
      SELECT jsonb_agg(r) FROM (
        SELECT t.id, t.title, t.status, t.updated_at, c.name AS category_name
        FROM public.faq_knowledge_topics t
        LEFT JOIN public.faq_categories c ON c.id = t.category_id
        ORDER BY t.updated_at DESC LIMIT 8
      ) r), '[]'::jsonb)
  );
$function$;
-- Roles helper
CREATE OR REPLACE FUNCTION public.faq_has_role(_user_id uuid, _roles text[])
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.faq_profiles p WHERE p.id = _user_id AND p.role = ANY(_roles))
$$;

-- Extensions for fuzzy matching
CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA extensions;

-- Normalization helper
CREATE OR REPLACE FUNCTION public.faq_normalize(_text text)
RETURNS text LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT btrim(regexp_replace(lower(coalesce(_text,'')), '[^a-z0-9 ]+', ' ', 'g'))
$$;

-- GRANTS
GRANT SELECT ON public.faq_categories TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faq_categories TO authenticated;
GRANT ALL ON public.faq_categories TO service_role;

GRANT SELECT ON public.faq_knowledge_topics TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faq_knowledge_topics TO authenticated;
GRANT ALL ON public.faq_knowledge_topics TO service_role;

GRANT SELECT ON public.faq_question_variants TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faq_question_variants TO authenticated;
GRANT ALL ON public.faq_question_variants TO service_role;

GRANT SELECT ON public.faq_knowledge_sources TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faq_knowledge_sources TO authenticated;
GRANT ALL ON public.faq_knowledge_sources TO service_role;

GRANT SELECT ON public.faq_profiles TO authenticated;
GRANT INSERT, UPDATE ON public.faq_profiles TO authenticated;
GRANT ALL ON public.faq_profiles TO service_role;

GRANT SELECT ON public.faq_audit_logs TO authenticated;
GRANT ALL ON public.faq_audit_logs TO service_role;

-- POLICIES
CREATE POLICY "FAQ categories are readable" ON public.faq_categories FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "FAQ editors manage categories" ON public.faq_categories FOR ALL TO authenticated
  USING (public.faq_has_role(auth.uid(), ARRAY['admin','editor']))
  WITH CHECK (public.faq_has_role(auth.uid(), ARRAY['admin','editor']));

CREATE POLICY "Verified FAQ topics are readable" ON public.faq_knowledge_topics FOR SELECT TO anon USING (status = 'verified');
CREATE POLICY "Signed in read topics" ON public.faq_knowledge_topics FOR SELECT TO authenticated
  USING (status = 'verified' OR public.faq_has_role(auth.uid(), ARRAY['admin','editor']));
CREATE POLICY "FAQ editors manage topics" ON public.faq_knowledge_topics FOR ALL TO authenticated
  USING (public.faq_has_role(auth.uid(), ARRAY['admin','editor']))
  WITH CHECK (public.faq_has_role(auth.uid(), ARRAY['admin','editor']));

CREATE POLICY "Variants of verified topics readable" ON public.faq_question_variants FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM public.faq_knowledge_topics t WHERE t.id = topic_id AND t.status = 'verified'));
CREATE POLICY "Signed in read variants" ON public.faq_question_variants FOR SELECT TO authenticated USING (true);
CREATE POLICY "FAQ editors manage variants" ON public.faq_question_variants FOR ALL TO authenticated
  USING (public.faq_has_role(auth.uid(), ARRAY['admin','editor']))
  WITH CHECK (public.faq_has_role(auth.uid(), ARRAY['admin','editor']));

CREATE POLICY "Signed in read sources" ON public.faq_knowledge_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY "FAQ editors manage sources" ON public.faq_knowledge_sources FOR ALL TO authenticated
  USING (public.faq_has_role(auth.uid(), ARRAY['admin','editor']))
  WITH CHECK (public.faq_has_role(auth.uid(), ARRAY['admin','editor']));

CREATE POLICY "Users read own faq profile" ON public.faq_profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.faq_has_role(auth.uid(), ARRAY['admin']));
CREATE POLICY "Users update own faq profile name" ON public.faq_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "FAQ admins manage profiles" ON public.faq_profiles FOR ALL TO authenticated
  USING (public.faq_has_role(auth.uid(), ARRAY['admin']))
  WITH CHECK (public.faq_has_role(auth.uid(), ARRAY['admin']));

CREATE POLICY "FAQ admins read audit logs" ON public.faq_audit_logs FOR SELECT TO authenticated
  USING (public.faq_has_role(auth.uid(), ARRAY['admin','editor']));

-- Constraints & indexes
ALTER TABLE public.faq_knowledge_topics DROP CONSTRAINT IF EXISTS faq_topics_status_check;
ALTER TABLE public.faq_knowledge_topics ADD CONSTRAINT faq_topics_status_check CHECK (status IN ('draft','verified','needs_review','archived'));
ALTER TABLE public.faq_knowledge_topics DROP CONSTRAINT IF EXISTS faq_topics_priority_check;
ALTER TABLE public.faq_knowledge_topics ADD CONSTRAINT faq_topics_priority_check CHECK (priority IN ('normal','important','critical'));
ALTER TABLE public.faq_profiles DROP CONSTRAINT IF EXISTS faq_profiles_role_check;
ALTER TABLE public.faq_profiles ADD CONSTRAINT faq_profiles_role_check CHECK (role IN ('admin','editor','viewer'));

CREATE INDEX IF NOT EXISTS faq_topics_category_idx ON public.faq_knowledge_topics(category_id);
CREATE INDEX IF NOT EXISTS faq_topics_status_idx ON public.faq_knowledge_topics(status);
CREATE INDEX IF NOT EXISTS faq_topics_question_trgm ON public.faq_knowledge_topics USING gin (main_question extensions.gin_trgm_ops);
CREATE INDEX IF NOT EXISTS faq_topics_fts ON public.faq_knowledge_topics USING gin (to_tsvector('english', title || ' ' || main_question || ' ' || answer));
CREATE INDEX IF NOT EXISTS faq_variants_topic_idx ON public.faq_question_variants(topic_id);
CREATE INDEX IF NOT EXISTS faq_variants_trgm ON public.faq_question_variants USING gin (normalized_variant extensions.gin_trgm_ops);
CREATE UNIQUE INDEX IF NOT EXISTS faq_variants_unique ON public.faq_question_variants(topic_id, normalized_variant);
CREATE INDEX IF NOT EXISTS faq_sources_topic_idx ON public.faq_knowledge_sources(topic_id);
CREATE INDEX IF NOT EXISTS faq_audit_created_idx ON public.faq_audit_logs(created_at DESC);

-- Keep normalized_variant in sync
CREATE OR REPLACE FUNCTION public.faq_variants_normalize_trg()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.normalized_variant := public.faq_normalize(NEW.variant);
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS faq_variants_normalize ON public.faq_question_variants;
CREATE TRIGGER faq_variants_normalize BEFORE INSERT OR UPDATE ON public.faq_question_variants
FOR EACH ROW EXECUTE FUNCTION public.faq_variants_normalize_trg();

-- Audit trigger
CREATE OR REPLACE FUNCTION public.faq_audit_trg()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.faq_audit_logs(user_id, action, table_name, record_id, old_data, new_data)
  VALUES (
    auth.uid(),
    lower(TG_OP),
    TG_TABLE_NAME,
    COALESCE((to_jsonb(NEW)->>'id')::uuid, (to_jsonb(OLD)->>'id')::uuid),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;
DROP TRIGGER IF EXISTS faq_audit_topics ON public.faq_knowledge_topics;
CREATE TRIGGER faq_audit_topics AFTER INSERT OR UPDATE OR DELETE ON public.faq_knowledge_topics
FOR EACH ROW EXECUTE FUNCTION public.faq_audit_trg();
DROP TRIGGER IF EXISTS faq_audit_variants ON public.faq_question_variants;
CREATE TRIGGER faq_audit_variants AFTER INSERT OR UPDATE OR DELETE ON public.faq_question_variants
FOR EACH ROW EXECUTE FUNCTION public.faq_audit_trg();
DROP TRIGGER IF EXISTS faq_audit_categories ON public.faq_categories;
CREATE TRIGGER faq_audit_categories AFTER INSERT OR UPDATE OR DELETE ON public.faq_categories
FOR EACH ROW EXECUTE FUNCTION public.faq_audit_trg();
DROP TRIGGER IF EXISTS faq_audit_sources ON public.faq_knowledge_sources;
CREATE TRIGGER faq_audit_sources AFTER INSERT OR UPDATE OR DELETE ON public.faq_knowledge_sources
FOR EACH ROW EXECUTE FUNCTION public.faq_audit_trg();

-- Public search over verified knowledge (ranked across topics + variants)
CREATE OR REPLACE FUNCTION public.faq_search(_query text, _limit int DEFAULT 5)
RETURNS TABLE(
  topic_id uuid, title text, main_question text, answer text, status text,
  priority text, category_id uuid, category_name text, matched_variant text, score real
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH q AS (SELECT public.faq_normalize(_query) AS nq)
  SELECT t.id, t.title, t.main_question, t.answer, t.status, t.priority,
         t.category_id, c.name,
         v.variant,
         GREATEST(
           similarity(public.faq_normalize(t.main_question), (SELECT nq FROM q)),
           similarity(public.faq_normalize(t.title), (SELECT nq FROM q)),
           COALESCE(MAX(similarity(v.normalized_variant, (SELECT nq FROM q))), 0),
           CASE WHEN to_tsvector('english', t.title || ' ' || t.main_question || ' ' || t.answer)
                     @@ plainto_tsquery('english', _query) THEN 0.45 ELSE 0 END
         )::real AS score
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
  GROUP BY t.id, c.name, v.variant, v.normalized_variant
  HAVING GREATEST(
           similarity(public.faq_normalize(t.main_question), (SELECT nq FROM q)),
           similarity(public.faq_normalize(t.title), (SELECT nq FROM q)),
           COALESCE(MAX(similarity(v.normalized_variant, (SELECT nq FROM q))), 0),
           CASE WHEN to_tsvector('english', t.title || ' ' || t.main_question || ' ' || t.answer)
                     @@ plainto_tsquery('english', _query) THEN 0.45 ELSE 0 END
         ) > 0.2
  ORDER BY score DESC
  LIMIT COALESCE(_limit, 5);
$$;
GRANT EXECUTE ON FUNCTION public.faq_search(text, int) TO anon, authenticated, service_role;

-- Duplicate detection for editors (all statuses)
CREATE OR REPLACE FUNCTION public.faq_find_similar(_question text, _limit int DEFAULT 5)
RETURNS TABLE(topic_id uuid, title text, main_question text, status text, matched_variant text, score real)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, extensions AS $$
  WITH q AS (SELECT public.faq_normalize(_question) AS nq)
  SELECT t.id, t.title, t.main_question, t.status, v.variant,
         GREATEST(
           similarity(public.faq_normalize(t.main_question), (SELECT nq FROM q)),
           similarity(public.faq_normalize(t.title), (SELECT nq FROM q)),
           COALESCE(similarity(v.normalized_variant, (SELECT nq FROM q)), 0)
         )::real AS score
  FROM public.faq_knowledge_topics t
  LEFT JOIN LATERAL (
    SELECT vv.variant, vv.normalized_variant FROM public.faq_question_variants vv
    WHERE vv.topic_id = t.id
    ORDER BY similarity(vv.normalized_variant, (SELECT nq FROM q)) DESC LIMIT 1
  ) v ON true
  WHERE t.status <> 'archived'
  ORDER BY score DESC
  LIMIT COALESCE(_limit, 5);
$$;
GRANT EXECUTE ON FUNCTION public.faq_find_similar(text, int) TO authenticated, service_role;

-- Starter categories only (no invented policy answers)
INSERT INTO public.faq_categories (name, description) VALUES
  ('Sessions & Attendance', 'Joining sessions, absences, waiting time and attendance marking'),
  ('Technical Issues', 'Platform, connection and device problems'),
  ('Scheduling & Availability', 'Shifts, availability, cancellations and reschedules'),
  ('Teaching & Curriculum', 'Lesson delivery, materials and classroom practice'),
  ('Payments & Compensation', 'Payment cycles, deductions and reporting'),
  ('Policies & Conduct', 'Company rules, conduct and escalation paths'),
  ('Accounts & Access', 'Logins, credentials and tool access')
ON CONFLICT (name) DO NOTHING;
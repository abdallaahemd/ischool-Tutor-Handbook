REVOKE ALL ON FUNCTION public.faq_has_role(uuid, text[]) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.faq_audit_trg() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.faq_variants_normalize_trg() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.faq_find_similar(text, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.faq_find_similar(text, int) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.faq_search(text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.faq_search(text, int) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.faq_update_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
begin
    new.updated_at = now();
    return new;
end;
$$;
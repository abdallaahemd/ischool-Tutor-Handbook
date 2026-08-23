REVOKE EXECUTE ON FUNCTION public.faq_admin_stats() FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.faq_admin_stats() TO service_role;
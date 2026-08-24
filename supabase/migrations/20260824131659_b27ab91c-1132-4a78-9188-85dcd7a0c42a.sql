DELETE FROM public.faq_categories c
WHERE NOT EXISTS (SELECT 1 FROM public.faq_knowledge_topics t WHERE t.category_id = c.id);

INSERT INTO public.faq_categories (name, description)
SELECT v.name, v.description
FROM (VALUES
  ('Session Attendance', 'Student absence, late arrival, waiting time, student joining and leaving.'),
  ('Session Management', 'Session timing, extra time, compensation, session flow.'),
  ('Technical Issues', 'Microphone, camera, internet, Zoom, screen sharing, technical interruptions.'),
  ('Feedback & Reflection', 'Student feedback, star ratings, reflection, internal feedback.'),
  ('Student Tasks', 'Incomplete tasks, difficult tasks, student support.'),
  ('Student Communication', 'Community communication, sharing materials, communication boundaries.'),
  ('Projects & Portfolio', 'Project submission, screenshots, project links, portfolio.'),
  ('Presentations', 'Regular presentations, session 12 presentations, Canva, Teacher Guide.'),
  ('Schedule & Availability', 'Add Slot Request, Remove Slot Request, assigned sessions, availability.'),
  ('Software & Development Tools', 'Godot, Unity, Replit, CodeHS, other approved tools.'),
  ('Tutor Access & Materials', 'Grades, modules, student versions, slides, tutor guides.'),
  ('Support & Escalation', 'Moderation, mentor, team leader, community, escalation.'),
  ('HR & Excuse', 'Excuse leave and HR-related matters.')
) AS v(name, description)
WHERE NOT EXISTS (SELECT 1 FROM public.faq_categories c WHERE lower(c.name) = lower(v.name));
DO $seed$
BEGIN
IF (SELECT count(*) FROM public.faq_knowledge_topics) > 0 THEN
  RAISE NOTICE 'Topics already present, skipping seed';
  RETURN;
END IF;

-- helper to insert a topic + variants
CREATE TEMP TABLE _seed(cat text, title text, q text, a text, st text, pr text, variants text[]);

INSERT INTO _seed VALUES
('Session Attendance','Student Did Not Join The Session','What should I do if a student does not join the session?',
$a$Wait for 25 minutes from the scheduled session start time.
If the student does not join, use Parent Ping twice:
- First Parent Ping after 10 minutes.
- Second Parent Ping after 20 minutes.
If the student still has not joined after 25 minutes:
- Contact Moderation.
- Close the meeting.
- Mark the student as Student Absent.

Important rule: Only mark Student Absent if the student did not join the session at any point. If the student joined the session even for a short period and then disconnected, do NOT mark them as Student Absent. Remain in the session until the scheduled end time because the student may be trying to resolve a technical issue and may return.

If the student joined more than 30 minutes late, use the appropriate feedback template explaining that it is difficult to provide accurate feedback because the student entered the session more than 30 minutes late.

Additional rule: Parent Ping can also be used when the student is already in the session but there is a situation where the parent's presence is needed.$a$,
'verified','critical',ARRAY['My student did not join.','The student is absent.','How long should I wait?','When should I leave the session?','Should I mark Student Absent?','The student joined and disconnected.','My student joined for two minutes and left.','When should I Ping Parent?','My student didn''t attend.','The student didn''t enter Zoom.','Should I leave after 25 minutes?','What should I do if my student is absent?']),

('Session Attendance','Student Joined Late','What should I do if a student joins the session late?',
$a$Continue the session normally.
When appropriate, the student may be compensated with additional time after the scheduled session.
The maximum additional time should normally be 10 minutes.
Any additional time provided should be documented in the internal feedback.$a$,
'verified','normal',ARRAY['My student came late.','The student joined 15 minutes late.','Do I compensate late students?','How much extra time for a late student?']),

('Session Management','Session Continues After Official Time','Can a session continue after its scheduled end time?',
$a$Yes.
When appropriate, the session may continue beyond the scheduled time to compensate the student.
The additional time should normally not exceed 10 minutes.
Document the additional time in the internal feedback.$a$,
'verified','normal',ARRAY['Can I extend the session?','Am I allowed to stay after the session ends?','How long can I extend a session?']),

('Technical Issues','Technical Issue During A Live Session','What should I do if a technical issue affects the live session?',
$a$If a technical issue occurs during the live session, contact Moderation.
Try to resolve the issue and continue the session when possible.
The student should be compensated for lost session time when appropriate.
If the issue caused a significant loss of time and the appropriate compensation is unclear, consult the Mentor.
If compensation is provided, clearly communicate the arrangement to the student.
Document relevant issues that affected the session flow in the Reflection.$a$,
'verified','important',ARRAY['Zoom crashed during my session.','I had a technical problem in the session.','Who do I contact for a live session issue?','My internet went down mid session.']),

('Feedback & Reflection','How To Write Feedback','How should I write student feedback?',
$a$Feedback should be written formally in English.
Do not rely excessively on generic templates.
A recommended approach is the sandwich feedback method:
1. Mention something positive.
2. Explain what needs improvement.
3. End with another positive or encouraging statement.
If the student's star rating is reduced, clearly explain the reason.$a$,
'verified','normal',ARRAY['How do I write good feedback?','What language should feedback be in?','Can I use feedback templates?','Why did I lose stars in feedback?']),

('Feedback & Reflection','Student Absent And Feedback','What should I write in Feedback and Reflection when a student is absent?',
$a$If the student did not join the session at any point, mark the student as Student Absent and follow the appropriate absence procedure.
Do not mark Student Absent if the student joined the session at any point.
If the student joined and then disconnected, remain in the session until the scheduled end time.
If the student joined more than 30 minutes late, use the appropriate feedback template stating that it is difficult to provide accurate feedback because the student entered the session more than 30 minutes late.$a$,
'verified','critical',ARRAY['Feedback for an absent student.','What do I write if nobody joined?','The student joined after 30 minutes, what feedback?','Reflection for student absence.']),

('Feedback & Reflection','Session Reflection','What should I include in the session Reflection?',
$a$Reflection should be completed after every session.
Document any issue that affected the session flow.
Include:
- What happened.
- How it affected the session.
- What actions the Tutor took to resolve the issue.
- Any relevant additional information such as extra time or interruptions.$a$,
'verified','normal',ARRAY['What goes in the reflection?','Do I have to write a reflection every session?','How detailed should the reflection be?']),

('Student Tasks','Student Did Not Complete The Task','What should I do if a student did not complete the assigned task?',
$a$First, try to understand why the student did not complete the task.
Possible reasons may include being busy, traveling, being unwell, or other personal circumstances.
If the student simply did not have enough time, ask them to complete the task and let them know that it will be checked during the next session.
If the student found the task difficult:
- Help them with the first one or two steps so they understand how to start.
- Encourage them to continue independently.
- If they face difficulties later, they may contact the Tutor through the Community for help.$a$,
'verified','normal',ARRAY['The student did not do the homework.','Task not completed.','My student didn''t finish the task.','What if the task was too hard for the student?']),

('Student Tasks','Student Missed The Previous Session','What should I do if a student missed the previous session?',
$a$Ideally, the student should watch the previous session's recap video before attending the next session.
If the student did not watch the recap and does not understand the previous content:
- Provide a brief explanation of the essential concepts needed for the current session.
- If necessary, quickly explain important information from the previous session.
- Ask the student to watch the recap for the previous session and the current session.
The student should come to the next session prepared with questions about anything they did not understand.$a$,
'verified','normal',ARRAY['The student missed last session.','Student skipped a session, what now?','Do I repeat the previous session?','Recap video for a missed session.']),

('Session Management','Starting From The Middle Of A Module','What should I do if I start teaching a student from the middle of a module and the previous project is unavailable?',
$a$Prepare the appropriate Student Version and send it to the student.
Then continue the current session normally.$a$,
'verified','normal',ARRAY['The previous project is missing.','I started with a new student mid module.','No project file from the last session.']),

('Technical Issues','Student Technical Problems','What should I do if the student''s microphone, camera, or internet is not working?',
$a$Use the available communication methods to help troubleshoot the issue.
You may:
- Communicate with the student through the chat.
- Ask the student to try another device when appropriate.
- Ask the student to seek assistance from a parent or guardian.
- Use Parent Ping when the parent's presence is needed.
If the issue is a live session technical issue, contact Moderation.$a$,
'verified','normal',ARRAY['The student has no microphone.','Student camera not working.','The student cannot hear me.','Student internet is weak.']),

('Technical Issues','Student Cannot Hear Shared Video','What should I do if the student cannot hear the video''s sound during screen sharing?',
$a$Enable Share Sound from the Zoom screen sharing settings.$a$,
'verified','normal',ARRAY['No sound while sharing a video.','Student can''t hear the video sound.','How do I share audio in Zoom?']),

('Tutor Access & Materials','Sending A Student Version','How can I send a Student Version to the student?',
$a$You can prepare the Student Version as a ZIP file and send it through the Zoom chat.
Alternatively, upload it to an approved shared location such as Google Drive and send the link to the student through the chat.$a$,
'verified','normal',ARRAY['How do I send project files to a student?','Sending a ZIP through Zoom.','How to share the student version?']),

('Student Communication','Student Not Found On Community','What should I do if I cannot find the student on the Community?',
$a$Contact your Mentor or Team Leader for assistance.$a$,
'verified','normal',ARRAY['I can''t find my student on Community.','Student missing from Community.']),

('Student Communication','Communicating With Students After The Session','Can I communicate with a student after the session?',
$a$Yes.
Tutors can communicate with students through the Community throughout the week.
Tutors may also share helpful materials with students.
However, all communication and materials must remain within the scope of iSchool.
Do not communicate or share content outside the approved work context.$a$,
'verified','important',ARRAY['Can I message my student during the week?','Am I allowed to contact students outside sessions?','Can I share extra materials with students?']),

('Presentations','Regular End-Of-Session Presentation','What should the student do in the regular presentation at the end of the session?',
$a$The student should explain:
- What they learned during the session.
- Which part of the session they found most enjoyable or interesting.$a$,
'verified','normal',ARRAY['What is the end of session presentation?','What should the student present at the end?']),

('Presentations','Session 12 Presentation','What is required for the Session 12 presentation?',
$a$During Session 11, students learn how to create a presentation using Canva.
For Session 12, the student should prepare a short presentation summarizing the topics learned during the 11 sessions of the semester.
The presentation should focus on the student's learning journey during that semester, not their entire history.
The student presents it to the Tutor while a parent is present so the parent can see the student's progress.
Canva is the recommended tool because students learn it during Session 11.
If a student prepares the presentation using another presentation tool, it can still be accepted. However, do not proactively tell students that any alternative tool is equally recommended.
If the student did not prepare a presentation, use the pickup presentation available in the Teacher Guide.$a$,
'verified','important',ARRAY['Session 12 presentation requirements.','What if the student has no presentation for session 12?','Can the student use PowerPoint instead of Canva?','Should the parent attend session 12?']),

('Tutor Access & Materials','Tutor Guide And Slides Conflict','What should I follow if the Tutor Guide and Slides contain different information?',
$a$The Slides are the primary source and should be followed.
The content team may update the materials over time to reduce differences between the Tutor Guide and Slides.$a$,
'verified','normal',ARRAY['Guide and slides do not match.','Which is correct, the guide or the slides?']),

('Tutor Access & Materials','Grade Or Module Access','What should I do if I need access to a Grade or Module that is not available to me?',
$a$Contact your Mentor or Team Leader for assistance.$a$,
'verified','normal',ARRAY['I can''t access a module.','How do I get access to another grade?','Missing grade materials.']),

('Schedule & Availability','Change Schedule Or Availability','How can I remove a slot from my availability?',
$a$Submit a Remove Slot Request through the Dashboard.
Submitting the request is generally sufficient.
However, also inform your Mentor so they are aware of the change.$a$,
'verified','normal',ARRAY['How do I remove a slot?','I want to change my availability.','Remove slot request.']),

('Schedule & Availability','Assigned Session At An Unavailable Time','What should I do if I am assigned a session at a time when I am not available?',
$a$An assigned session generally means that the Tutor previously indicated availability for that time.
If the Tutor cannot attend the session, they should follow the applicable check-out procedure according to the organization's rules.
Failure to handle the situation properly may result in an Action Plan and may lead to disciplinary action.$a$,
'verified','important',ARRAY['I got a session when I am busy.','I can''t attend an assigned session.','What happens if I miss an assigned session?']),

('HR & Excuse','Excuse Leave','What is Excuse Leave and when can I use it?',
$a$Excuse Leave is intended for short and urgent matters that may cause a Tutor to start late or temporarily step away from work.
It is available starting from the Tutor's first working day.
Each Tutor is entitled to one free excuse per month without deduction or penalty.
The excuse must be submitted at least 10 minutes before the scheduled session.
Tutors should also be ready to join their session 10 minutes before the scheduled start time.$a$,
'verified','important',ARRAY['How do excuses work?','Can I take an excuse today?','How many excuses per month?','When must I submit an excuse?']),

('Schedule & Availability','Add More Available Slots','How can I add more available session slots?',
$a$Submit an Add Slot Request through the Dashboard.$a$,
'verified','normal',ARRAY['How do I add slots?','I want more sessions.','Add slot request.']),

('Software & Development Tools','Approved Software Versions','Which software versions should I use?',
$a$Godot: Use Godot 3.5 Stable.
Unity: Use the approved Unity 2022 version through Unity Hub or the Unity Editor Archive.
Software versions may change over time, so always confirm the current approved version in this topic.$a$,
'verified','important',ARRAY['Which Godot version?','Which Unity version should I install?','Approved software versions.']),

('Software & Development Tools','Replit Problem','What should I do if there is a problem with Replit?',
$a$First, try to help the student troubleshoot the issue.
When appropriate, use Request Control to help resolve the problem.
If the problem cannot be resolved, CodeHS Sandbox can be used as an alternative.
Do not assume that Tutor and Student can freely use different platforms unless the situation and teaching requirements allow it.$a$,
'verified','normal',ARRAY['Replit is not working.','Replit alternative.','Student can''t run code on Replit.']),

('Projects & Portfolio','Adding A Project To The Portfolio','What is the correct way to submit a project to the Portfolio?',
$a$The student should:
1. Take a screenshot of the code or project they worked on.
2. Prepare the project link when one is available.
3. Submit both the screenshot and the project link when applicable.$a$,
'verified','normal',ARRAY['How do we add a project to the portfolio?','Portfolio submission steps.','What do students upload to the portfolio?']),

('Projects & Portfolio','Add Project Button Not Visible','What should I do if the Add Project option is not visible?',
$a$Try zooming out in the browser.
The hidden interface elements may then become visible.$a$,
'verified','normal',ARRAY['I can''t see the Add Project button.','Add project missing.']),

('Projects & Portfolio','Project Submission On Different Platforms','Does the project submission process change depending on the platform, such as CodeHS or FlutterFlow?',
$a$No.
The general submission process remains the same.
The student should provide:
- A screenshot of the code or project.
- A project link when one is available.$a$,
'verified','normal',ARRAY['Is portfolio submission different for CodeHS?','FlutterFlow project submission.']),

('Support & Escalation','Who Should I Contact?','Who should I contact for different types of issues?',
$a$Moderation: contact Moderation for issues related to the live session and session operations.
HR: contact HR for matters related to salary, contracts, insurance, or other HR-related topics.
Team Leader: contact the Team Leader when the Mentor is unavailable or when team-level assistance is needed.
Community: use the Community for general work-related questions and discussions.
Mentor: contact the Mentor when guidance or assistance is needed regarding tutoring, students, sessions, or work procedures.$a$,
'verified','important',ARRAY['Who do I contact about my salary?','Who handles session issues?','When do I contact my Team Leader?','Who should I ask for help?']),

('Support & Escalation','Immediate Escalation For Inappropriate Student Behavior','Are there situations where I should escalate immediately?',
$a$Yes.
If you believe that a student's behavior has crossed an unacceptable level, contact your Mentor and Team Leader immediately so they can help assess the situation and determine the appropriate action.$a$,
'verified','critical',ARRAY['The student was disrespectful.','Inappropriate student behavior.','When should I escalate immediately?','Student said something unacceptable.']);

WITH ins AS (
  INSERT INTO public.faq_knowledge_topics
    (category_id, title, main_question, answer, status, priority, last_verified_at)
  SELECT c.id, s.title, s.q, s.a, s.st, s.pr, now()
  FROM _seed s JOIN public.faq_categories c ON c.name = s.cat
  RETURNING id, main_question
)
INSERT INTO public.faq_question_variants (topic_id, variant, normalized_variant)
SELECT ins.id, v, public.faq_normalize(v)
FROM ins JOIN _seed s ON s.q = ins.main_question, unnest(s.variants) AS v;

DROP TABLE _seed;
END
$seed$;
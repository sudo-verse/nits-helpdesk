-- ============================================================================
-- NITS HelpDesk — seed data
--
-- This is real reference data the application reads at runtime, not UI mocks:
-- departments and hostels populate the report form's dropdowns, the dashboard
-- chips and the search filters.
--
-- Hostel names follow the numbering used in the Stitch designs ("Hostel 9",
-- "Hostel 7") plus the one named hall they reference. Replace these with the
-- institute's actual hall names via the admin panel before going live.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Departments — the 13 from the spec, each with its Material Symbol.
-- Icon names must exist in scripts/icon-names.txt or they render as a blank box.
-- ----------------------------------------------------------------------------
insert into public.departments (name, slug, description, icon, color_token) values
  ('Hostel',            'hostel',            'Rooms, furniture, mess and warden matters',        'apartment',        'primary'),
  ('Electrical',        'electrical',        'Lighting, fans, wiring and power outages',         'bolt',             'tertiary'),
  ('Water Supply',      'water-supply',      'Taps, plumbing, drinking water and drainage',      'water_drop',       'secondary'),
  ('Internet/WiFi',     'internet-wifi',     'Campus network, WiFi access points and LAN',       'wifi',             'secondary'),
  ('Library',           'library',           'Books, reading rooms, journals and study spaces',  'local_library',    'primary'),
  ('Academic Section',  'academic-section',  'Registration, transcripts and course records',     'school',           'primary'),
  ('Examination Cell',  'examination-cell',  'Exam schedules, results and re-evaluation',        'history_edu',      'tertiary'),
  ('Medical Centre',    'medical-centre',    'Health centre, ambulance and medical emergencies', 'medical_services', 'error'),
  ('Sports Complex',    'sports-complex',    'Grounds, gymnasium and sports equipment',          'sports_soccer',    'success'),
  ('Placement Cell',    'placement-cell',    'Internships, placements and company drives',       'work',             'primary'),
  ('Security',          'security',          'Campus security, lost property and access',        'security',         'error'),
  ('Transport',         'transport',         'Buses, shuttles and vehicle requests',             'directions_bus',   'tertiary'),
  ('Others',            'others',            'Anything that does not fit another department',    'category',         'primary')
on conflict (slug) do update
  set name        = excluded.name,
      description = excluded.description,
      icon        = excluded.icon,
      color_token = excluded.color_token;

-- ----------------------------------------------------------------------------
-- Hostels
-- ----------------------------------------------------------------------------
insert into public.hostels (name, slug) values
  ('Hostel 1',   'hostel-1'),
  ('Hostel 2',   'hostel-2'),
  ('Hostel 3',   'hostel-3'),
  ('Hostel 4',   'hostel-4'),
  ('Hostel 5',   'hostel-5'),
  ('Hostel 6',   'hostel-6'),
  ('Hostel 7',   'hostel-7'),
  ('Hostel 8',   'hostel-8'),
  ('Hostel 9',   'hostel-9'),
  ('Hostel 10',  'hostel-10'),
  ('Hostel 11',  'hostel-11'),
  ('Hostel 12',  'hostel-12'),
  ('Aryabhatta', 'aryabhatta'),
  ('Day Scholar', 'day-scholar')
on conflict (slug) do nothing;

-- ----------------------------------------------------------------------------
-- FAQ
-- ----------------------------------------------------------------------------
insert into public.faq (question, answer, category, display_order, is_published) values
  (
    'Who can sign in to NITS HelpDesk?',
    'Only NIT Silchar institute accounts. Your email must end in @nits.ac.in or @students.nits.ac.in — personal addresses such as Gmail are rejected at sign-in.',
    'Account', 1, true
  ),
  (
    'How long does a complaint take to resolve?',
    'It depends on the department and priority. High-priority issues such as power or water failures are typically picked up the same day. You can follow the exact stage of your complaint on its timeline at any time.',
    'Complaints', 2, true
  ),
  (
    'What does each status mean?',
    'Submitted — received and waiting for triage. Assigned — a staff member now owns it. Under Review — they are inspecting the issue. In Progress — a fix is under way. Resolved — the work is done. Closed — the complaint is finished and you can rate it.',
    'Complaints', 3, true
  ),
  (
    'Can I report something anonymously?',
    'Yes. Turn on "Submit Anonymously" in the report form and your name is hidden from the staff handling it. You will still receive all updates, and you can still track the complaint from your own list.',
    'Privacy', 4, true
  ),
  (
    'What files can I attach?',
    'JPG, PNG and PDF files up to 10 MB each. Photographs of the problem help staff diagnose an issue far faster than a description alone.',
    'Complaints', 5, true
  ),
  (
    'Can I edit a complaint after submitting it?',
    'You can edit it while it is still in the Submitted stage. Once a staff member has been assigned, add a comment instead so the change is recorded on the thread.',
    'Complaints', 6, true
  ),
  (
    'How do I rate the resolution?',
    'Once a complaint is Closed, open it and leave a rating from 1 to 5 stars with optional feedback. This is what departments are measured on, so it genuinely matters.',
    'Feedback', 7, true
  ),
  (
    'I raised a complaint for the wrong department. What now?',
    'No action needed on your side. Admins re-route complaints during triage, and you will get a notification when it moves.',
    'Complaints', 8, true
  )
on conflict do nothing;

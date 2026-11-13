-- Optional sample data for the FIRST patient account (run once, after you have
-- registered a patient; running it again adds duplicates).
INSERT INTO medicines (name, dose, times, days, notes, patient_id)
SELECT v.name, v.dose, v.times, v.days, v.notes, p.id
FROM (SELECT id FROM users WHERE role = 'patient' ORDER BY id LIMIT 1) p,
(VALUES
  ('Vitamin D',   '1 tablet',  '{08:00}'::text[],       '{0,1,2,3,4,5,6}'::smallint[], 'With breakfast'),
  ('Antibiotic',  '1 capsule', '{08:00,20:00}'::text[], '{0,1,2,3,4,5,6}'::smallint[], 'Finish the full course'),
  ('Pain relief', '2 tablets', '{13:00}'::text[],       '{1,3,5}'::smallint[],         '')
) AS v(name, dose, times, days, notes);

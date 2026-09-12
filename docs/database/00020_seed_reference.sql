-- 00020_seed_reference.sql
-- Platform reference data: system moment types, Pakistani cities, plans,
-- and predicted lunar dates.
--
-- All money is bigint PAISA. PKR 2,500 = 250000.

BEGIN;

-- ==========================================================================
-- Cities. tier 1 = the three metros we launch in; delivery outside them is
-- genuinely unreliable, so the first customers are constrained to tier 1.
-- ==========================================================================
INSERT INTO moments.cities (name, name_ur, province, is_serviceable, tier) VALUES
  ('Karachi',    'کراچی',    'Sindh',       true,  1),
  ('Lahore',     'لاہور',    'Punjab',      true,  1),
  ('Islamabad',  'اسلام آباد','ICT',        true,  1),
  ('Rawalpindi', 'راولپنڈی', 'Punjab',      true,  2),
  ('Faisalabad', 'فیصل آباد','Punjab',      true,  2),
  ('Multan',     'ملتان',    'Punjab',      true,  2),
  ('Peshawar',   'پشاور',    'KPK',         true,  2),
  ('Hyderabad',  'حیدرآباد', 'Sindh',       true,  2),
  ('Sialkot',    'سیالکوٹ',  'Punjab',      true,  3),
  ('Gujranwala', 'گوجرانوالہ','Punjab',     true,  3),
  ('Quetta',     'کوئٹہ',    'Balochistan', false, 3)
ON CONFLICT (country_code, province, name) DO NOTHING;

-- ==========================================================================
-- System moment types. org_id IS NULL.
--
-- Two product-shaped rules are baked into the defaults:
--   * new_baby defaults to PRIVATE. Announcing someone's baby company-wide
--     before they are ready is recoverable only by apology; the employee opts
--     in at the verify step.
--   * farewell announces at 16:00, not 09:00 -- end of the last day.
-- ==========================================================================
INSERT INTO moments.moment_types (
  org_id, key, label, label_ur, category, date_source, source_field, source_observance,
  is_recurring_annual, supports_milestones, default_budget_paisa,
  default_verify_offset_days, default_select_offset_days, default_approval_offset_days,
  default_announce_local_time, default_announce_publicly,
  default_gift_categories, is_system, sort_order
) VALUES
  (NULL,'birthday','Birthday','سالگرہ','personal','employee_date_field','date_of_birth',NULL,
   true,false,250000, 7,4,2,'09:00',true,
   ARRAY['cake','flowers','card']::moments.product_category[],true,10),

  (NULL,'work_anniversary','Work Anniversary','سالِ ملازمت','work','employee_date_field','hire_date',NULL,
   true,true,350000, 7,4,2,'09:00',true,
   ARRAY['hamper','plant','card','voucher']::moments.product_category[],true,20),

  -- new_hire is compressed AND guarded: the detector only fires it for a hire_date
  -- within the last 3 days. Without that guard, importing 340 employees on day one
  -- fires 340 new-hire celebrations and 340 gift orders.
  (NULL,'new_hire','New Hire Welcome','خوش آمدید','work','employee_date_field','hire_date',NULL,
   false,false,400000, 3,2,2,'09:30',true,
   ARRAY['hamper','apparel','book','card']::moments.product_category[],true,30),

  (NULL,'promotion','Promotion','ترقی','work','employee_event',NULL,NULL,
   false,false,500000, 2,2,1,'09:00',true,
   ARRAY['hamper','voucher','card']::moments.product_category[],true,40),

  -- Higher value, longer lead: marriage orders at T-7, not T-2.
  (NULL,'marriage','Marriage','شادی','personal','employee_event',NULL,NULL,
   false,false,750000, 14,10,7,'09:00',true,
   ARRAY['hamper','voucher','flowers']::moments.product_category[],true,50),

  (NULL,'new_baby','New Baby','نئے مہمان','personal','employee_event',NULL,NULL,
   false,false,500000, 3,2,2,'10:00',false,
   ARRAY['hamper','toy','flowers','card']::moments.product_category[],true,60),

  (NULL,'farewell','Farewell','الوداع','work','employee_event',NULL,NULL,
   false,false,400000, 5,4,3,'16:00',true,
   ARRAY['hamper','card','plant']::moments.product_category[],true,70),

  (NULL,'eid_ul_fitr','Eid ul Fitr','عید الفطر','religious','observance_calendar',NULL,'eid_ul_fitr',
   true,false,0, 10,7,7,'09:00',true,
   ARRAY['hamper','chocolate','voucher']::moments.product_category[],true,80),

  (NULL,'eid_ul_adha','Eid ul Adha','عید الاضحیٰ','religious','observance_calendar',NULL,'eid_ul_adha',
   true,false,0, 10,7,7,'09:00',true,
   ARRAY['hamper','chocolate','voucher']::moments.product_category[],true,90),

  (NULL,'ramadan','Ramadan Kareem','رمضان کریم','religious','observance_calendar',NULL,'ramadan_start',
   true,false,0, 10,7,7,'09:00',true,
   ARRAY['hamper','chocolate']::moments.product_category[],true,100),

  (NULL,'employee_of_the_month','Employee of the Month','ملازمِ ماہ','company','manual',NULL,NULL,
   false,false,0, 3,2,1,'09:00',true,
   ARRAY['voucher','card']::moments.product_category[],true,110)
ON CONFLICT (org_id, key) DO NOTHING;

-- ==========================================================================
-- Plans. Subscription + margin on every fulfilled gift.
-- ==========================================================================
INSERT INTO moments.plans (code, name, base_price_paisa, included_employees,
                           per_employee_paisa, gift_margin_bps, min_margin_paisa) VALUES
  ('starter','Starter',  1500000,  50, 3000,  2000, 25000),
  ('growth', 'Growth',   3500000, 150, 2500,  1800, 25000),
  ('scale',  'Scale',    7500000, 400, 2000,  1500, 25000)
ON CONFLICT (code) DO NOTHING;

-- ==========================================================================
-- Lunar observances: PREDICTED astronomical estimates.
--
-- These are NOT authoritative. The detector materialises events from them so HR
-- can see Eid on the calendar and budget for it, flagged is_provisional, and it
-- must NOT schedule purchase or announcement tasks earlier than
-- gregorian_date - 10 days. Ops confirms the real date after the Ruet-e-Hilal
-- Committee announcement, typically 1-2 days out, and confirm_observance()
-- shifts every dependent event.
-- ==========================================================================
INSERT INTO moments.observance_dates
  (country_code, observance, hijri_year, gregorian_date, end_date, status, source) VALUES
  ('PK','ramadan_start',1447,'2026-02-18','2026-03-19','predicted','astronomical estimate'),
  ('PK','eid_ul_fitr',  1447,'2026-03-20',NULL,        'predicted','astronomical estimate'),
  ('PK','eid_ul_adha',  1447,'2026-05-27',NULL,        'predicted','astronomical estimate'),
  ('PK','ramadan_start',1448,'2027-02-08','2027-03-09','predicted','astronomical estimate'),
  ('PK','eid_ul_fitr',  1448,'2027-03-10',NULL,        'predicted','astronomical estimate'),
  ('PK','eid_ul_adha',  1448,'2027-05-17',NULL,        'predicted','astronomical estimate'),
  ('PK','ramadan_start',1449,'2028-01-28','2028-02-26','predicted','astronomical estimate'),
  ('PK','eid_ul_fitr',  1449,'2028-02-27',NULL,        'predicted','astronomical estimate'),
  ('PK','eid_ul_adha',  1449,'2028-05-05',NULL,        'predicted','astronomical estimate')
ON CONFLICT (country_code, observance, hijri_year) DO NOTHING;

COMMIT;

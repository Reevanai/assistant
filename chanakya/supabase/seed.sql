-- CHANAKYA · Reference seed (safe for every environment)
-- Contains ONLY reference data: jurisdictions, a sector taxonomy, and a catalogue of candidate
-- official sources. It contains NO documents, entities or relationships.
--
-- Jurisdiction codes follow ISO 3166-2:IN as amended in 2023 (IN-CG, IN-OD, IN-UK, IN-TS).
-- Re-verify against the current ISO register before relying on them for external exchange.

insert into public.jurisdictions (code, name, kind, parent_code) values
  ('IN', 'India', 'country', null)
on conflict (code) do nothing;

insert into public.jurisdictions (code, name, kind, parent_code) values
  ('IN-AP', 'Andhra Pradesh', 'state', 'IN'),
  ('IN-AR', 'Arunachal Pradesh', 'state', 'IN'),
  ('IN-AS', 'Assam', 'state', 'IN'),
  ('IN-BR', 'Bihar', 'state', 'IN'),
  ('IN-CG', 'Chhattisgarh', 'state', 'IN'),
  ('IN-GA', 'Goa', 'state', 'IN'),
  ('IN-GJ', 'Gujarat', 'state', 'IN'),
  ('IN-HR', 'Haryana', 'state', 'IN'),
  ('IN-HP', 'Himachal Pradesh', 'state', 'IN'),
  ('IN-JH', 'Jharkhand', 'state', 'IN'),
  ('IN-KA', 'Karnataka', 'state', 'IN'),
  ('IN-KL', 'Kerala', 'state', 'IN'),
  ('IN-MP', 'Madhya Pradesh', 'state', 'IN'),
  ('IN-MH', 'Maharashtra', 'state', 'IN'),
  ('IN-MN', 'Manipur', 'state', 'IN'),
  ('IN-ML', 'Meghalaya', 'state', 'IN'),
  ('IN-MZ', 'Mizoram', 'state', 'IN'),
  ('IN-NL', 'Nagaland', 'state', 'IN'),
  ('IN-OD', 'Odisha', 'state', 'IN'),
  ('IN-PB', 'Punjab', 'state', 'IN'),
  ('IN-RJ', 'Rajasthan', 'state', 'IN'),
  ('IN-SK', 'Sikkim', 'state', 'IN'),
  ('IN-TN', 'Tamil Nadu', 'state', 'IN'),
  ('IN-TS', 'Telangana', 'state', 'IN'),
  ('IN-TR', 'Tripura', 'state', 'IN'),
  ('IN-UP', 'Uttar Pradesh', 'state', 'IN'),
  ('IN-UK', 'Uttarakhand', 'state', 'IN'),
  ('IN-WB', 'West Bengal', 'state', 'IN'),
  ('IN-AN', 'Andaman and Nicobar Islands', 'union_territory', 'IN'),
  ('IN-CH', 'Chandigarh', 'union_territory', 'IN'),
  ('IN-DH', 'Dadra and Nagar Haveli and Daman and Diu', 'union_territory', 'IN'),
  ('IN-DL', 'Delhi', 'union_territory', 'IN'),
  ('IN-JK', 'Jammu and Kashmir', 'union_territory', 'IN'),
  ('IN-LA', 'Ladakh', 'union_territory', 'IN'),
  ('IN-LD', 'Lakshadweep', 'union_territory', 'IN'),
  ('IN-PY', 'Puducherry', 'union_territory', 'IN')
on conflict (code) do nothing;

insert into public.sectors (slug, label) values
  ('infrastructure', 'Infrastructure'),
  ('energy', 'Energy'),
  ('renewable_energy', 'Renewable energy'),
  ('power_distribution', 'Power transmission & distribution'),
  ('real_estate', 'Real estate'),
  ('urban_development', 'Urban development'),
  ('transport', 'Transport & logistics'),
  ('water', 'Water & sanitation'),
  ('environment', 'Environment & climate'),
  ('mining', 'Mining & minerals'),
  ('telecommunications', 'Telecommunications'),
  ('it_electronics', 'IT & electronics'),
  ('industry', 'Industry & manufacturing'),
  ('agriculture', 'Agriculture'),
  ('finance', 'Finance & taxation'),
  ('health', 'Health'),
  ('education', 'Education'),
  ('land', 'Land & revenue'),
  ('labour', 'Labour & employment'),
  ('governance', 'Governance & administration')
on conflict (slug) do nothing;

-- Candidate sources. All start INACTIVE with licence status UNREVIEWED: a person must record
-- the reuse terms (license_status + license_reviewed_at) before a connector may run.
insert into public.sources (slug, name, publisher, base_url, kind, jurisdiction_code, license_status, license_notes) values
  ('egazette-india', 'e-Gazette of India', 'Department of Publication / Ministry of Housing and Urban Affairs',
   'https://egazette.gov.in', 'gazette', 'IN', 'unreviewed', 'Terms of reuse not yet reviewed.'),
  ('karnataka-gazette', 'Karnataka Gazette (eRajyapatra)', 'Government of Karnataka',
   'https://erajyapatra.karnataka.gov.in', 'gazette', 'IN-KA', 'unreviewed', 'Terms of reuse not yet reviewed.'),
  ('sansad-lok-sabha', 'Lok Sabha records', 'Lok Sabha Secretariat',
   'https://sansad.in/ls', 'legislature', 'IN', 'unreviewed', 'Terms of reuse not yet reviewed.'),
  ('sansad-rajya-sabha', 'Rajya Sabha records', 'Rajya Sabha Secretariat',
   'https://sansad.in/rs', 'legislature', 'IN', 'unreviewed', 'Terms of reuse not yet reviewed.'),
  ('prs-legislative', 'PRS Legislative Research', 'PRS Legislative Research',
   'https://prsindia.org', 'research_org', 'IN', 'unreviewed', 'Independent research organisation; terms of reuse not yet reviewed.'),
  ('data-gov-in', 'Open Government Data Platform India', 'National Informatics Centre',
   'https://data.gov.in', 'open_data_portal', 'IN', 'unreviewed',
   'Datasets are commonly published under the Government Open Data License – India; confirm per dataset.'),
  ('eci', 'Election Commission of India', 'Election Commission of India',
   'https://eci.gov.in', 'election_body', 'IN', 'unreviewed', 'Terms of reuse not yet reviewed.')
on conflict (slug) do nothing;

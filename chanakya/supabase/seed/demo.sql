-- ════════════════════════════════════════════════════════════════════════════
-- CHANAKYA · DEMO DATASET — SYNTHETIC, NOT REAL INTELLIGENCE
-- ════════════════════════════════════════════════════════════════════════════
-- Purpose: exercise the UI and RLS locally before real connectors exist (Milestone 2).
-- Every row is flagged is_demo = true and rendered with a DEMO badge.
-- Titles are prefixed "[DEMO]", issuing bodies are fictional, and URLs use the reserved
-- `.invalid` TLD so they can never resolve to a real document.
-- NEVER load this file into a production database.

insert into public.sources (id, slug, name, publisher, base_url, kind, jurisdiction_code,
                            license_status, license_notes, is_active, is_demo)
values ('00000000-0000-4000-8000-00000000d001', 'demo-synthetic', '[DEMO] Synthetic source',
        'CHANAKYA demo generator', 'https://demo.chanakya.invalid', 'other', 'IN-KA',
        'open_license', 'Synthetic records generated for development. Not a real publisher.', true, true)
on conflict (slug) do nothing;

insert into public.ingestion_runs (source_id, status, started_at, finished_at, items_discovered,
                                   items_new, items_changed, items_failed, worker_version, is_demo)
values ('00000000-0000-4000-8000-00000000d001', 'succeeded', now() - interval '2 hours',
        now() - interval '2 hours' + interval '93 seconds', 6, 6, 0, 0, 'demo-seed', true);

insert into public.documents (id, source_id, external_id, title, doc_type, jurisdiction_level,
                              state_code, issuing_body, published_on, source_url, extraction_status,
                              verification_status, sectors, license_note, is_demo, first_retrieved_at)
values
  ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000d001', 'DEMO-KA-0001',
   '[DEMO] Draft guidelines for rooftop solar net-metering in urban local bodies', 'policy', 'state',
   'IN-KA', 'Demo Energy Department (fictional)', current_date - 3,
   'https://demo.chanakya.invalid/docs/DEMO-KA-0001', 'extracted', 'unverified',
   array['energy', 'renewable_energy'], 'Synthetic demo record.', true, now() - interval '3 days'),
  ('00000000-0000-4000-8000-00000000a002', '00000000-0000-4000-8000-00000000d001', 'DEMO-KA-0002',
   '[DEMO] Notification amending building bye-law setback requirements', 'gazette_notification', 'state',
   'IN-KA', 'Demo Urban Development Department (fictional)', current_date - 6,
   'https://demo.chanakya.invalid/docs/DEMO-KA-0002', 'extracted', 'unverified',
   array['real_estate', 'urban_development'], 'Synthetic demo record.', true, now() - interval '6 days'),
  ('00000000-0000-4000-8000-00000000a003', '00000000-0000-4000-8000-00000000d001', 'DEMO-KA-0003',
   '[DEMO] Order on land-use conversion timelines for industrial parks', 'order', 'state',
   'IN-KA', 'Demo Revenue Department (fictional)', current_date - 11,
   'https://demo.chanakya.invalid/docs/DEMO-KA-0003', 'ocr_extracted', 'unverified',
   array['land', 'industry', 'infrastructure'], 'Synthetic demo record.', true, now() - interval '11 days'),
  ('00000000-0000-4000-8000-00000000a004', '00000000-0000-4000-8000-00000000d001', 'DEMO-IN-0004',
   '[DEMO] Circular on transmission-charge waiver for inter-state renewable projects', 'circular', 'central',
   null, 'Demo Central Power Ministry (fictional)', current_date - 14,
   'https://demo.chanakya.invalid/docs/DEMO-IN-0004', 'extracted', 'unverified',
   array['energy', 'renewable_energy', 'power_distribution'], 'Synthetic demo record.', true, now() - interval '14 days'),
  ('00000000-0000-4000-8000-00000000a005', '00000000-0000-4000-8000-00000000d001', 'DEMO-KA-0005',
   '[DEMO] Tender notice for metro feeder road widening (synthetic)', 'tender', 'state',
   'IN-KA', 'Demo Public Works Department (fictional)', current_date - 21,
   'https://demo.chanakya.invalid/docs/DEMO-KA-0005', 'needs_review', 'unverified',
   array['infrastructure', 'transport'], 'Synthetic demo record.', true, now() - interval '21 days'),
  ('00000000-0000-4000-8000-00000000a006', '00000000-0000-4000-8000-00000000d001', 'DEMO-IN-0006',
   '[DEMO] Parliamentary question on telecom tower right-of-way approvals', 'parliamentary_question', 'central',
   null, 'Demo Parliament Secretariat (fictional)', current_date - 40,
   'https://demo.chanakya.invalid/docs/DEMO-IN-0006', 'extracted', 'unverified',
   array['telecommunications'], 'Synthetic demo record.', true, now() - interval '40 days')
on conflict do nothing;

insert into public.document_versions (id, document_id, version_no, content_sha256, mime_type,
                                      byte_size, retrieved_at, extraction_status, text_content, page_count)
select ('00000000-0000-4000-8000-0000000b' || right(d.id::text, 4))::uuid, d.id, 1,
       encode(sha256(convert_to(d.external_id, 'UTF8')), 'hex'), 'application/pdf', 0,
       d.first_retrieved_at, d.extraction_status,
       'SYNTHETIC DEMO TEXT. This placeholder stands in for extracted document text.', 1
from public.documents d where d.is_demo
on conflict do nothing;

update public.documents d set current_version_id = v.id
from public.document_versions v
where v.document_id = d.id and d.is_demo and d.current_version_id is null;

insert into public.entities (id, entity_type, canonical_name, description, state_code, is_demo)
values
  ('00000000-0000-4000-8000-00000000e001', 'department', '[DEMO] Energy Department (fictional)',
   'Synthetic department used for demo data.', 'IN-KA', true),
  ('00000000-0000-4000-8000-00000000e002', 'department', '[DEMO] Urban Development Department (fictional)',
   'Synthetic department used for demo data.', 'IN-KA', true)
on conflict do nothing;

insert into public.document_entities (document_id, entity_id, link_type)
values ('00000000-0000-4000-8000-00000000a001', '00000000-0000-4000-8000-00000000e001', 'issued_by'),
       ('00000000-0000-4000-8000-00000000a002', '00000000-0000-4000-8000-00000000e002', 'issued_by')
on conflict do nothing;

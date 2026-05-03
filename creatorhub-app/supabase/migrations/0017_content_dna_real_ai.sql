-- Real AI integration for Content DNA — adds the new job kind so the
-- existing /api/cron/run-jobs worker can process analyses async (Apify
-- → OpenAI Whisper → Claude). The stub fallback path keeps working when
-- ANTHROPIC_API_KEY / OPENAI_API_KEY / APIFY_API_TOKEN are unset.

alter type job_kind_t add value if not exists 'content_dna_analyze';

insert into schema_migrations (version) values (17) on conflict do nothing;

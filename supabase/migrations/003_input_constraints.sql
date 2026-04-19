-- Server-side enforcement of input size limits.
-- These mirror the client-side maxLength values so oversized payloads are
-- rejected even if the UI validation is bypassed (e.g. direct API calls).

alter table comments
  add constraint comments_content_nonempty check (char_length(trim(content)) > 0),
  add constraint comments_content_maxlen   check (char_length(content) <= 2000);

alter table closed_dates
  add constraint closed_dates_reason_maxlen check (reason is null or char_length(reason) <= 200);

alter table profiles
  add constraint profiles_full_name_nonempty check (char_length(trim(full_name)) > 0),
  add constraint profiles_full_name_maxlen   check (char_length(full_name) <= 100);

-- Ticket 30: Allow sender to edit own messages
-- 1) Add updated_at column (nullable, NULL = never edited)
alter table public.messages
  add column if not exists updated_at timestamptz;

-- 2) RLS policy: sender can update own message content
create policy "Sender can update own messages"
  on public.messages for update
  to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

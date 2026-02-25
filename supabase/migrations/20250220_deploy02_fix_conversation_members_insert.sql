drop policy if exists "Users can insert own membership" on public.conversation_members;

create policy "Users can insert own membership"
on public.conversation_members
for insert
to authenticated
with check (
  user_id = auth.uid()
  and exists (
    select 1
    from public.conversation_members cm
    where cm.conversation_id = conversation_members.conversation_id
      and cm.user_id = auth.uid()
  )
);
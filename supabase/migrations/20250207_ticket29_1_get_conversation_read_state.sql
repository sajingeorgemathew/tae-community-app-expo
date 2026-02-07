-- Ticket 29.1: RPC to fetch the other member's last_read_at for a conversation
-- Used by the sender to render blue ✓✓ (read receipts)

create or replace function public.get_conversation_read_state(conv_id uuid)
returns table (other_last_read_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  caller_id uuid := auth.uid();
begin
  -- Validate caller is authenticated
  if caller_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Validate caller is a member of this conversation
  if not exists (
    select 1 from conversation_members
    where conversation_id = conv_id
      and user_id = caller_id
  ) then
    raise exception 'Not a member of this conversation';
  end if;

  -- Return the other member's last_read_at (epoch if no read record exists)
  return query
    select coalesce(cr.last_read_at, '1970-01-01T00:00:00Z'::timestamptz) as other_last_read_at
    from conversation_members cm
    left join conversation_reads cr
      on cr.conversation_id = cm.conversation_id
      and cr.user_id = cm.user_id
    where cm.conversation_id = conv_id
      and cm.user_id <> caller_id
    limit 1;
end;
$$;

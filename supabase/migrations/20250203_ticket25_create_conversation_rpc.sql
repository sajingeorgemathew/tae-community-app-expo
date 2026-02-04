-- Ticket 25: Create Conversation 1:1 RPC
-- SECURITY DEFINER function to create/reuse 1:1 conversations
-- without loosening RLS on conversation_members

-- =========================
-- 1) DROP EXISTING FUNCTION (safe)
-- =========================
drop function if exists public.create_conversation_1to1(uuid);

-- =========================
-- 2) CREATE RPC FUNCTION
-- =========================
create or replace function public.create_conversation_1to1(other_user_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
  v_existing_conv_id uuid;
  v_new_conv_id uuid;
begin
  -- 1) Require authentication
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required';
  end if;

  -- 2) Prevent self-chat
  if other_user_id = v_caller_id then
    raise exception 'Cannot start a conversation with yourself';
  end if;

  -- 3) Validate other user exists in profiles
  if not exists (select 1 from public.profiles where id = other_user_id) then
    raise exception 'User not found';
  end if;

  -- 4) Check for existing 1:1 conversation between these two users
  select cm1.conversation_id into v_existing_conv_id
  from public.conversation_members cm1
  join public.conversation_members cm2
    on cm1.conversation_id = cm2.conversation_id
  where cm1.user_id = v_caller_id
    and cm2.user_id = other_user_id
  -- Ensure it's exactly 2 members (1:1 conversation)
    and (
      select count(*)
      from public.conversation_members cm3
      where cm3.conversation_id = cm1.conversation_id
    ) = 2
  limit 1;

  if v_existing_conv_id is not null then
    return v_existing_conv_id;
  end if;

  -- 5) Create new conversation
  insert into public.conversations default values
  returning id into v_new_conv_id;

  -- 6) Insert both membership rows (SECURITY DEFINER bypasses RLS)
  insert into public.conversation_members (conversation_id, user_id)
  values
    (v_new_conv_id, v_caller_id),
    (v_new_conv_id, other_user_id);

  return v_new_conv_id;
end;
$$;

-- Grant execute to authenticated users
grant execute on function public.create_conversation_1to1(uuid) to authenticated;

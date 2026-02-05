-- Ticket 27.2: Update get_my_conversations to return preview for attachment-only messages
-- When last message has no text content but has attachments, return a fallback preview string

drop function if exists public.get_my_conversations();

create or replace function public.get_my_conversations()
returns table (
  conversation_id uuid,
  other_user_id uuid,
  other_user_name text,
  last_message_content text,
  last_message_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_caller_id uuid;
begin
  v_caller_id := auth.uid();
  if v_caller_id is null then
    raise exception 'Authentication required';
  end if;

  return query
  select
    c.id as conversation_id,
    other_member.user_id as other_user_id,
    coalesce(p.full_name, 'Unknown') as other_user_name,
    -- Generate preview: use content if present, else attachment preview if exists
    case
      when last_msg.content is not null then last_msg.content
      when last_msg.id is not null then
        coalesce(
          (
            select
              case att.type
                when 'image' then '📷 Photo'
                when 'video' then '🎥 Video'
                else '📎 Attachment'
              end
            from public.message_attachments att
            where att.message_id = last_msg.id
            limit 1
          ),
          '📎 Attachment'
        )
      else null
    end as last_message_content,
    last_msg.created_at as last_message_at
  from public.conversations c
  -- Get caller's membership
  join public.conversation_members my_member
    on my_member.conversation_id = c.id
    and my_member.user_id = v_caller_id
  -- Get other member (assumes 1:1 conversations)
  join public.conversation_members other_member
    on other_member.conversation_id = c.id
    and other_member.user_id != v_caller_id
  -- Get other member's profile
  left join public.profiles p
    on p.id = other_member.user_id
  -- Get last message (lateral join for efficiency)
  left join lateral (
    select m.id, m.content, m.created_at
    from public.messages m
    where m.conversation_id = c.id
    order by m.created_at desc
    limit 1
  ) last_msg on true
  order by coalesce(last_msg.created_at, c.created_at) desc;
end;
$$;

grant execute on function public.get_my_conversations() to authenticated;

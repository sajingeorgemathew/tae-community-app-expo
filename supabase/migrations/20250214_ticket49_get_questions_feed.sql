-- Ticket 49: Q&A list reply previews — read-only RPC for questions feed

create or replace function public.get_questions_feed(limit_count int default 30)
returns table (
  id                       uuid,
  title                    text,
  body                     text,
  created_at               timestamptz,
  author_id                uuid,
  author_name              text,
  author_avatar_path       text,
  answer_count             bigint,
  latest_answer_at         timestamptz,
  latest_replier_id        uuid,
  latest_replier_name      text,
  latest_replier_avatar_path text,
  latest_replier_role      text
)
language sql stable
as $$
  select
    q.id,
    q.title,
    q.body,
    q.created_at,
    q.author_id,
    ap.full_name        as author_name,
    ap.avatar_path      as author_avatar_path,
    coalesce(stats.answer_count, 0) as answer_count,
    stats.latest_answer_at,
    lr.author_id        as latest_replier_id,
    rp.full_name        as latest_replier_name,
    rp.avatar_path      as latest_replier_avatar_path,
    rp.role             as latest_replier_role
  from public.questions q
  -- author profile
  join public.profiles ap on ap.id = q.author_id
  -- answer stats per question
  left join lateral (
    select
      count(*)           as answer_count,
      max(a.created_at)  as latest_answer_at
    from public.answers a
    where a.question_id = q.id
  ) stats on true
  -- latest answer row (for replier details)
  left join lateral (
    select a2.author_id
    from public.answers a2
    where a2.question_id = q.id
    order by a2.created_at desc
    limit 1
  ) lr on true
  -- latest replier profile
  left join public.profiles rp on rp.id = lr.author_id
  order by q.created_at desc
  limit limit_count;
$$;

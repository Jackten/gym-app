-- Pelayo Wellness atomic booking creation
-- Creates a one-off booking or recurring booking series in a single transaction.

create or replace function public.create_booking_series(
  p_sessions jsonb,
  p_equipment_categories text[] default '{}',
  p_equipment_items text[] default '{}',
  p_note text default null,
  p_recurrence jsonb default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  recurring_group_id uuid;
  inserted_count integer;
  recurrence_frequency text;
  recurrence_weekdays smallint[];
  recurrence_end_date date;
  recurrence_skip_dates date[];
begin
  if auth.uid() is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_sessions) <> 'array' or jsonb_array_length(p_sessions) = 0 then
    raise exception 'At least one session is required.'
      using errcode = '22023';
  end if;

  recurrence_frequency := nullif(coalesce(p_recurrence ->> 'frequency', ''), '');
  recurrence_end_date := nullif(coalesce(p_recurrence ->> 'endDate', ''), '')::date;

  if jsonb_typeof(p_recurrence -> 'weekdays') = 'array' then
    select coalesce(array_agg(value::smallint), '{}')
      into recurrence_weekdays
    from jsonb_array_elements_text(p_recurrence -> 'weekdays');
  else
    recurrence_weekdays := '{}';
  end if;

  if jsonb_typeof(p_recurrence -> 'skipDates') = 'array' then
    select coalesce(array_agg(value::date), '{}')
      into recurrence_skip_dates
    from jsonb_array_elements_text(p_recurrence -> 'skipDates');
  else
    recurrence_skip_dates := '{}';
  end if;

  if recurrence_frequency is not null and recurrence_frequency <> 'none' then
    insert into public.recurring_groups (
      user_id,
      pattern,
      frequency,
      weekdays,
      end_date,
      skip_dates
    )
    values (
      auth.uid(),
      'time-series',
      recurrence_frequency,
      recurrence_weekdays,
      recurrence_end_date,
      recurrence_skip_dates
    )
    returning id into recurring_group_id;
  end if;

  with requested_sessions as (
    select
      slot_date,
      start_time,
      duration_minutes
    from jsonb_to_recordset(p_sessions) as x(
      slot_date date,
      start_time time,
      duration_minutes integer
    )
  )
  insert into public.bookings (
    user_id,
    slot_date,
    start_time,
    end_time,
    duration_minutes,
    status,
    equipment_categories,
    equipment_items,
    notes,
    recurring_group_id
  )
  select
    auth.uid(),
    requested_sessions.slot_date,
    requested_sessions.start_time,
    (requested_sessions.start_time + make_interval(mins => requested_sessions.duration_minutes))::time,
    requested_sessions.duration_minutes,
    'confirmed',
    coalesce(p_equipment_categories, '{}'),
    coalesce(p_equipment_items, '{}'),
    nullif(p_note, ''),
    recurring_group_id
  from requested_sessions;

  get diagnostics inserted_count = row_count;

  if inserted_count = 0 then
    raise exception 'No bookings were created.'
      using errcode = 'P0002';
  end if;

  return inserted_count;
end;
$$;

grant execute on function public.create_booking_series(jsonb, text[], text[], text, jsonb) to authenticated;

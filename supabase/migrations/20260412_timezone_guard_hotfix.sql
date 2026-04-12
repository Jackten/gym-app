-- Pelayo Wellness booking time guard timezone fix
-- Aligns "future booking" checks with the studio's business timezone instead
-- of the database server timezone.
-- This file intentionally sorts after launch hardening so existing projects and
-- fresh applies converge on the same function definitions.

create or replace function public.enforce_booking_time_window()
returns trigger
language plpgsql
as $$
declare
  business_now timestamp := timezone('America/New_York', now());
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  if new.end_time <= new.start_time then
    raise exception 'Bookings cannot cross midnight.'
      using errcode = '23514';
  end if;

  if new.slot_date < business_now::date
    or (new.slot_date = business_now::date and new.start_time <= business_now::time) then
    raise exception 'Bookings must stay in the future.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_enforce_time_window on public.bookings;
create trigger bookings_enforce_time_window
  before insert or update of slot_date, start_time, end_time, status
  on public.bookings
  for each row execute function public.enforce_booking_time_window();

create or replace function public.reschedule_booking_time(
  p_booking_id uuid,
  p_new_time time,
  p_scope text default 'one'
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  target_booking public.bookings%rowtype;
  updated_count integer;
  invalid_past_count integer;
  invalid_cross_midnight_count integer;
  business_now timestamp := timezone('America/New_York', now());
begin
  if p_scope not in ('one', 'all') then
    raise exception 'Unsupported edit scope.'
      using errcode = '22023';
  end if;

  select *
    into target_booking
  from public.bookings
  where id = p_booking_id
    and user_id = auth.uid()
    and status = 'confirmed';

  if not found then
    raise exception 'Booking not found.'
      using errcode = 'P0002';
  end if;

  with candidate_updates as (
    select
      b.id,
      b.slot_date,
      p_new_time as new_start_time,
      (p_new_time + make_interval(mins => b.duration_minutes))::time as new_end_time
    from public.bookings b
    where b.user_id = auth.uid()
      and b.status = 'confirmed'
      and (
        (p_scope = 'all'
          and target_booking.recurring_group_id is not null
          and b.recurring_group_id = target_booking.recurring_group_id
          and (
            b.slot_date > business_now::date
            or (b.slot_date = business_now::date and b.start_time > business_now::time)
          ))
        or ((p_scope <> 'all' or target_booking.recurring_group_id is null) and b.id = target_booking.id)
      )
  )
  select
    count(*) filter (
      where slot_date < business_now::date
        or (slot_date = business_now::date and new_start_time <= business_now::time)
    ),
    count(*) filter (where new_end_time <= new_start_time)
    into invalid_past_count, invalid_cross_midnight_count
  from candidate_updates;

  if invalid_past_count > 0 then
    raise exception 'Bookings must stay in the future.'
      using errcode = '23514';
  end if;

  if invalid_cross_midnight_count > 0 then
    raise exception 'Bookings cannot cross midnight.'
      using errcode = '23514';
  end if;

  with candidate_updates as (
    select
      b.id,
      p_new_time as new_start_time,
      (p_new_time + make_interval(mins => b.duration_minutes))::time as new_end_time
    from public.bookings b
    where b.user_id = auth.uid()
      and b.status = 'confirmed'
      and (
        (p_scope = 'all'
          and target_booking.recurring_group_id is not null
          and b.recurring_group_id = target_booking.recurring_group_id
          and (
            b.slot_date > business_now::date
            or (b.slot_date = business_now::date and b.start_time > business_now::time)
          ))
        or ((p_scope <> 'all' or target_booking.recurring_group_id is null) and b.id = target_booking.id)
      )
  )
  update public.bookings b
  set
    start_time = c.new_start_time,
    end_time = c.new_end_time
  from candidate_updates c
  where b.id = c.id;

  get diagnostics updated_count = row_count;

  if updated_count = 0 then
    raise exception 'No matching bookings were updated.'
      using errcode = 'P0002';
  end if;

  return updated_count;
end;
$$;

grant execute on function public.reschedule_booking_time(uuid, time, text) to authenticated;

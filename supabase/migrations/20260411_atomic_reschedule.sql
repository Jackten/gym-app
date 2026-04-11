-- Pelayo Wellness recurring reschedule hardening
-- Adds atomic booking-time rescheduling and prevents same-user overlap.

create or replace function public.enforce_booking_capacity()
returns trigger
language plpgsql
as $$
declare
  overlap_count integer;
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  perform pg_advisory_xact_lock(hashtext('booking-day:' || new.slot_date::text));

  if exists (
    select 1
    from public.bookings b
    where b.status = 'confirmed'
      and b.user_id = new.user_id
      and b.slot_date = new.slot_date
      and b.start_time < new.end_time
      and new.start_time < b.end_time
      and b.id <> new.id
  ) then
    raise exception 'You already have a booking that overlaps this time.'
      using errcode = '23514';
  end if;

  select count(*)
    into overlap_count
  from public.bookings b
  where b.status = 'confirmed'
    and b.slot_date = new.slot_date
    and b.start_time < new.end_time
    and new.start_time < b.end_time
    and b.id <> new.id;

  if overlap_count >= 5 then
    raise exception 'Selected slot is full. Please choose a different time.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

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
            b.slot_date > current_date
            or (b.slot_date = current_date and b.end_time > localtime)
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

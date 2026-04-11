-- Pelayo Wellness booking consistency hardening
-- Makes bookings the source of truth for equipment reservations and adds
-- server-side conflict checks for capacity and equipment overlap.

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

drop trigger if exists bookings_enforce_capacity on public.bookings;
create trigger bookings_enforce_capacity
  before insert or update of slot_date, start_time, end_time, status
  on public.bookings
  for each row execute function public.enforce_booking_capacity();

create or replace function public.enforce_equipment_reservation_conflict()
returns trigger
language plpgsql
as $$
begin
  if new.status <> 'confirmed' then
    return new;
  end if;

  perform pg_advisory_xact_lock(
    hashtext('equipment-day:' || new.slot_date::text || ':' || new.equipment_id)
  );

  if exists (
    select 1
    from public.equipment_reservations er
    where er.equipment_id = new.equipment_id
      and er.status = 'confirmed'
      and er.slot_date = new.slot_date
      and er.start_time < new.end_time
      and new.start_time < er.end_time
      and er.id <> new.id
  ) then
    raise exception 'Selected equipment is already reserved for that time.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function public.sync_equipment_reservations_from_booking()
returns trigger
language plpgsql
as $$
begin
  delete from public.equipment_reservations
  where booking_id = new.id;

  if new.status = 'confirmed' and coalesce(array_length(new.equipment_items, 1), 0) > 0 then
    insert into public.equipment_reservations (
      equipment_id,
      booking_id,
      slot_date,
      start_time,
      end_time,
      status
    )
    select
      item,
      new.id,
      new.slot_date,
      new.start_time,
      new.end_time,
      'confirmed'
    from unnest(new.equipment_items) as item;
  end if;

  return new;
end;
$$;

drop trigger if exists bookings_sync_equipment_reservations on public.bookings;
create trigger bookings_sync_equipment_reservations
  after insert or update of slot_date, start_time, end_time, status, equipment_items
  on public.bookings
  for each row execute function public.sync_equipment_reservations_from_booking();

-- Backfill existing reservations into a clean, booking-driven shape.
delete from public.equipment_reservations;

insert into public.equipment_reservations (
  equipment_id,
  booking_id,
  slot_date,
  start_time,
  end_time,
  status
)
select
  item,
  b.id,
  b.slot_date,
  b.start_time,
  b.end_time,
  'confirmed'
from public.bookings b
cross join lateral unnest(b.equipment_items) as item
where b.status = 'confirmed'
  and coalesce(array_length(b.equipment_items, 1), 0) > 0;

drop trigger if exists equipment_reservations_enforce_conflict on public.equipment_reservations;
create trigger equipment_reservations_enforce_conflict
  before insert or update of equipment_id, slot_date, start_time, end_time, status
  on public.equipment_reservations
  for each row execute function public.enforce_equipment_reservation_conflict();

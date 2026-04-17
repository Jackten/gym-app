import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, ArrowRight, Clock3 } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import { formatDateTime } from '../lib/helpers';
import { Button, Card, CardBody, CardEyebrow, CardTitle, Eyebrow } from '../components/ui';

// HubPage — member landing after sign-in.
// Next-booking hero with brass top-border accent; member primer below.
// Tokens per web/docs/brand.md.

export default function HubPage() {
  const { currentUser, upcomingBookings } = useApp();
  const navigate = useNavigate();

  if (!currentUser) return null;

  const nextBooking = upcomingBookings.length > 0
    ? upcomingBookings[upcomingBookings.length - 1]
    : null;

  const firstName = (currentUser.name || '').split(' ')[0] || currentUser.name;

  return (
    <div className="pb-8 animate-fade-up">
      {/* Greeting */}
      <section className="mb-10 md:mb-12">
        <Eyebrow className="mb-3">Member home</Eyebrow>
        <h2 className="font-display font-light text-h1 md:text-[2.5rem] leading-tight tracking-tight text-ivory">
          Welcome back, {firstName}.
        </h2>
        <p className="mt-3 max-w-xl text-body text-oat">
          Reserve the floor when it suits you. Sessions run thirty minutes.
        </p>
      </section>

      {/* Next booking hero card */}
      {nextBooking ? (
        <Card feature padding="lg" className="mb-8">
          <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <CardEyebrow>Your next session</CardEyebrow>
              <div className="mt-3 font-display font-light text-[clamp(1.75rem,4vw,2.25rem)] leading-tight tracking-tight text-ivory">
                {formatDateTime(nextBooking.startISO)}
              </div>
              <div className="mt-3 flex items-center gap-2 text-body-sm text-oat">
                <Clock3 size={14} strokeWidth={1.5} className="text-brass" />
                <span>{nextBooking.durationMinutes} minutes on the floor</span>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button variant="secondary" onClick={() => navigate('/bookings')}>
                View all bookings
              </Button>
              <Button onClick={() => navigate('/session')}>
                Book another
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <Card padding="lg" className="mb-8">
          <CardEyebrow>No upcoming sessions</CardEyebrow>
          <CardTitle className="mt-2">Reserve the room.</CardTitle>
          <CardBody className="mt-3">
            <p>Pick a thirty-minute window and the floor is yours.</p>
          </CardBody>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button onClick={() => navigate('/session')}>
              Book a session
            </Button>
            <Button variant="tertiary" onClick={() => navigate('/calendar')}>
              View calendar
              <ArrowRight size={16} strokeWidth={1.5} className="ml-1" />
            </Button>
          </div>
        </Card>
      )}

      {/* Quick actions */}
      <section className="grid gap-4 md:grid-cols-2">
        <button
          onClick={() => navigate('/calendar')}
          className="group text-left rounded-lg border border-ash bg-espresso/60 p-6 transition-colors duration-180 hover:border-brass/50 hover:bg-clay/70"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-md border border-ash p-2.5 text-brass group-hover:border-brass/60">
              <Calendar size={20} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-eyebrow uppercase tracking-[0.12em] text-brass">Calendar</div>
              <div className="mt-1 font-display text-h3 text-ivory">Browse availability</div>
              <p className="mt-1 text-body-sm text-oat">See open slots across the week.</p>
            </div>
          </div>
        </button>

        <button
          onClick={() => navigate('/session')}
          className="group text-left rounded-lg border border-ash bg-espresso/60 p-6 transition-colors duration-180 hover:border-brass/50 hover:bg-clay/70"
        >
          <div className="flex items-start gap-4">
            <div className="shrink-0 rounded-md border border-ash p-2.5 text-brass group-hover:border-brass/60">
              <ArrowRight size={20} strokeWidth={1.5} />
            </div>
            <div>
              <div className="text-eyebrow uppercase tracking-[0.12em] text-brass">Reserve</div>
              <div className="mt-1 font-display text-h3 text-ivory">Book a session</div>
              <p className="mt-1 text-body-sm text-oat">Solo, with a partner, or alongside a trainer.</p>
            </div>
          </div>
        </button>
      </section>
    </div>
  );
}

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Clock3, MapPin } from 'lucide-react';
import { useApp } from '../contexts/AppContext';
import {
  Button,
  Card,
  CardEyebrow,
  CardTitle,
  CardBody,
  Eyebrow,
  Wordmark,
} from '../components/ui';

// Pelayo Wellness — landing page.
// Editorial hero → philosophy → offerings → membership → studio.
// Tokens per web/docs/brand.md.

const IMG = import.meta.env.BASE_URL + 'img/editorial/';

export default function LandingPage() {
  const { currentUser } = useApp();
  const navigate = useNavigate();

  useEffect(() => {
    if (currentUser) {
      navigate('/home', { replace: true });
    }
  }, [currentUser, navigate]);

  return (
    <div className="min-h-screen bg-onyx text-ivory font-sans antialiased">
      {/* ──────────────────── HERO ──────────────────── */}
      <section className="relative h-[100svh] min-h-[640px] w-full overflow-hidden">
        <img
          src={`${IMG}hero-rope-pull.jpg`}
          alt=""
          aria-hidden="true"
          loading="eager"
          decoding="async"
          className="absolute inset-0 h-full w-full object-cover animate-slow-zoom"
        />
        {/* Layered gradient: floor shadow + vignette + top brand shade */}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-b from-onyx/80 via-onyx/30 to-onyx"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_30%,rgba(11,11,13,0.6)_100%)]"
        />

        {/* Top bar */}
        <header className="relative z-10 flex items-center justify-between px-6 md:px-12 lg:px-20 pt-6 md:pt-8">
          <Wordmark className="h-5 md:h-6 text-ivory" />
          <nav className="flex items-center gap-2">
            <Button
              variant="tertiary"
              size="sm"
              onClick={() => navigate('/signin')}
            >
              Sign in
            </Button>
          </nav>
        </header>

        {/* Hero copy */}
        <div className="relative z-10 flex h-[calc(100%-5rem)] flex-col justify-end px-6 md:px-12 lg:px-20 pb-16 md:pb-24">
          <div className="max-w-3xl animate-fade-up">
            <Eyebrow className="mb-4">Private gym</Eyebrow>
            <h1 className="font-display font-light text-[clamp(2.5rem,7vw,4.75rem)] leading-[1.04] tracking-[-0.015em] text-ivory">
              Private gym.
              <br />
              Booked by the session.
            </h1>
            <p className="mt-6 max-w-xl text-body-lg text-oat">
              A small, private floor. Book a thirty-minute session for
              yourself, bring a partner, or reserve alongside one of our
              trainers. Never more than a handful of people in the room.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Button size="lg" onClick={() => navigate('/register')}>
                Book a session
              </Button>
              <Button
                size="lg"
                variant="secondary"
                onClick={() => navigate('/signin')}
              >
                Sign in
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* ──────────────────── PHILOSOPHY ──────────────────── */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-32">
        <div className="mx-auto grid max-w-[1280px] gap-12 md:grid-cols-[1fr_1fr] md:gap-20 items-center">
          <div>
            <Eyebrow className="mb-4">Philosophy</Eyebrow>
            <h2 className="font-display font-light text-h1 md:text-display/[1.1] text-ivory leading-tight tracking-tight">
              Train with
              <br />
              intention.
            </h2>
            <div className="mt-8 max-w-prose space-y-5 text-body-lg text-oat">
              <p>
                Pelayo is a private gym. The floor is small, and reservations
                are capped — you might share it with two or three others, but
                never a crowd, never a queue for the rack.
              </p>
              <p>
                Book a session for yourself, bring a partner, or book alongside
                one of our trainers. The room is yours for the time you
                reserve.
              </p>
            </div>
          </div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg">
            <img
              src={`${IMG}detail-grip.jpg`}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-onyx/60 via-transparent to-transparent"
            />
          </div>
        </div>
      </section>

      {/* ──────────────────── OFFERINGS ──────────────────── */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-32 border-t border-ash bg-espresso/40">
        <div className="mx-auto max-w-[1280px]">
          <div className="max-w-xl mb-12 md:mb-16">
            <Eyebrow className="mb-4">How it works</Eyebrow>
            <h2 className="font-display font-light text-h1 md:text-[2.75rem] text-ivory leading-tight tracking-tight">
              Three ways to book.
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            <Card feature padding="lg">
              <CardEyebrow>Solo</CardEyebrow>
              <CardTitle className="mt-2">Open booking</CardTitle>
              <CardBody className="mt-4">
                <p>
                  Reserve a thirty-minute session for yourself. A couple of
                  others may be on the floor — no more than that.
                </p>
              </CardBody>
            </Card>
            <Card feature padding="lg">
              <CardEyebrow>Partner</CardEyebrow>
              <CardTitle className="mt-2">Bring someone</CardTitle>
              <CardBody className="mt-4">
                <p>
                  Book with a partner and share the floor. Same session,
                  same space, your own plan.
                </p>
              </CardBody>
            </Card>
            <Card feature padding="lg">
              <CardEyebrow>With a trainer</CardEyebrow>
              <CardTitle className="mt-2">Guided session</CardTitle>
              <CardBody className="mt-4">
                <p>
                  Book alongside one of our trainers. Programming, form, and
                  focus for the session you&apos;re in.
                </p>
              </CardBody>
            </Card>
          </div>
        </div>
      </section>

      {/* ──────────────────── STUDIO ──────────────────── */}
      <section className="px-6 md:px-12 lg:px-20 py-24 md:py-32 border-t border-ash bg-espresso/40">
        <div className="mx-auto max-w-[1280px] grid gap-12 md:grid-cols-[1fr_1fr] md:gap-20 items-center">
          <div>
            <Eyebrow className="mb-4">The studio</Eyebrow>
            <h2 className="font-display font-light text-h1 md:text-[2.75rem] text-ivory leading-tight tracking-tight">
              A single room,
              <br />
              open any time.
            </h2>
            <p className="mt-6 max-w-prose text-body-lg text-oat">
              Warm woods, directional light, and equipment chosen for
              longevity. Open twenty-four hours a day — book a session
              whenever it suits you.
            </p>
            <dl className="mt-10 grid grid-cols-2 gap-y-6 gap-x-8 max-w-md">
              <div>
                <dt className="flex items-center gap-2 text-eyebrow uppercase tracking-[0.12em] text-brass">
                  <MapPin size={14} strokeWidth={1.5} />
                  Location
                </dt>
                <dd className="mt-2 text-body text-ivory">
                  Members only
                  <br />
                  Address shared on booking
                </dd>
              </div>
              <div>
                <dt className="flex items-center gap-2 text-eyebrow uppercase tracking-[0.12em] text-brass">
                  <Clock3 size={14} strokeWidth={1.5} />
                  Hours
                </dt>
                <dd className="mt-2 text-body text-ivory">
                  Open 24/7
                  <br />
                  Book any time
                </dd>
              </div>
            </dl>
          </div>
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg">
            <img
              src={`${IMG}studio-interior.jpg`}
              alt=""
              aria-hidden="true"
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-gradient-to-t from-onyx/50 via-transparent to-transparent"
            />
          </div>
        </div>
      </section>

      {/* ──────────────────── CTA FOOTER ──────────────────── */}
      <section className="px-6 md:px-12 lg:px-20 py-20 md:py-28 border-t border-ash">
        <div className="mx-auto max-w-[1280px] flex flex-col md:flex-row md:items-end md:justify-between gap-8">
          <div>
            <Eyebrow className="mb-4">Begin</Eyebrow>
            <h2 className="font-display font-light text-h1 md:text-[3rem] text-ivory leading-tight tracking-tight">
              Train. Recover.
              <br />
              Return.
            </h2>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button size="lg" onClick={() => navigate('/register')}>
              Book a session
            </Button>
            <Button
              size="lg"
              variant="tertiary"
              onClick={() => navigate('/signin')}
            >
              Sign in
            </Button>
          </div>
        </div>
      </section>

      {/* ──────────────────── FOOT ──────────────────── */}
      <footer className="px-6 md:px-12 lg:px-20 py-10 border-t border-ash">
        <div className="mx-auto max-w-[1280px] flex flex-col md:flex-row md:items-center md:justify-between gap-4 text-body-sm text-stone">
          <div className="flex items-center gap-3">
            <Wordmark className="h-5 md:h-6 text-ivory" />
            <span>© {new Date().getFullYear()} Pelayo Wellness</span>
          </div>
          <div className="flex gap-6">
            <span>Private gym · thirty-minute sessions</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

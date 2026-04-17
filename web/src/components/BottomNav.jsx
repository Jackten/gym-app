import React from 'react';
import { NavLink } from 'react-router-dom';
import { Dumbbell, Calendar, ClipboardList, User } from 'lucide-react';

const NAV_ITEMS = [
  { to: '/home', label: 'Home', Icon: Dumbbell },
  { to: '/calendar', label: 'Calendar', Icon: Calendar },
  { to: '/bookings', label: 'Bookings', Icon: ClipboardList },
  { to: '/account', label: 'Account', Icon: User },
];

export default function BottomNav() {
  return (
    <nav className="bottom-nav">
      {NAV_ITEMS.map(({ to, label, Icon }) => (
        <NavLink
          key={to}
          to={to}
          className={({ isActive }) =>
            `bottom-nav-item${isActive ? ' active' : ''}`
          }
        >
          <span className="bottom-nav-icon" aria-hidden="true">
            <Icon size={22} strokeWidth={1.5} />
          </span>
          <span className="bottom-nav-label">{label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

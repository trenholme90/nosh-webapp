import { useRef, useState, type KeyboardEvent } from 'react';
import { NavLink, useLocation } from 'react-router';

const LINKS = [
  { to: '/recipes', label: 'Recipes' },
  { to: '/plan', label: 'Your week' },
  { to: '/shopping-list', label: 'Shopping list' },
];

/**
 * The main links. On a small phone they fold behind a "Menu" button, which opens
 * them in a panel under the header; from 40rem they sit in the header as usual.
 * The button says "Menu" as well as showing the icon, since not everyone knows
 * what three lines mean.
 */
export function MainNav() {
  const { pathname } = useLocation();
  // Remember which page the menu was opened on: going anywhere else closes it,
  // whether by a link in the menu, the logo, or the back button.
  const [openOn, setOpenOn] = useState<string>();
  const open = openOn === pathname;
  const button = useRef<HTMLButtonElement>(null);

  function closeOnEscape(event: KeyboardEvent) {
    if (event.key !== 'Escape' || !open) return;
    setOpenOn(undefined);
    button.current?.focus();
  }

  return (
    <nav aria-label="Main" className="app__nav" onKeyDown={closeOnEscape}>
      <button
        ref={button}
        type="button"
        className="app__menu-button"
        aria-expanded={open}
        aria-controls="main-nav-links"
        onClick={() => setOpenOn(open ? undefined : pathname)}
      >
        <svg aria-hidden="true" viewBox="0 0 24 24" width="24" height="24">
          <path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" strokeWidth="2.5" />
        </svg>
        Menu
      </button>
      <ul id="main-nav-links" className={`app__nav-links${open ? ' app__nav-links--open' : ''}`}>
        {LINKS.map(({ to, label }) => (
          <li key={to}>
            <NavLink to={to} className="app__nav-link" onClick={() => setOpenOn(undefined)}>
              {label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}

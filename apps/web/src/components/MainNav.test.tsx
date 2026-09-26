import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { describe, expect, it } from 'vitest';
import { MainNav } from './MainNav.tsx';

/*
 * Whether the button or the links show at a given width is CSS, which jsdom does
 * not apply; the E2E suite checks that on a phone-sized screen. These cover the
 * menu's behaviour.
 */

const renderNav = () =>
  render(
    <MemoryRouter initialEntries={['/recipes']}>
      <MainNav />
      <Routes>
        <Route path="*" element={null} />
      </Routes>
    </MemoryRouter>,
  );

const menuButton = () => screen.getByRole('button', { name: 'Menu' });

describe('MainNav', () => {
  it('opens and closes the menu, saying which it is', () => {
    renderNav();
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveAttribute('aria-controls', 'main-nav-links');

    fireEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'true');

    fireEvent.click(menuButton());
    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes once you pick somewhere to go', () => {
    renderNav();
    fireEvent.click(menuButton());

    fireEvent.click(screen.getByRole('link', { name: 'Shopping list' }));

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(screen.getByRole('link', { name: 'Shopping list' })).toHaveAttribute(
      'aria-current',
      'page',
    );
  });

  it('closes when you pick the page you are already on', () => {
    renderNav();
    fireEvent.click(menuButton());

    fireEvent.click(screen.getByRole('link', { name: 'Recipes' }));

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('closes on Escape and puts focus back on the button', () => {
    renderNav();
    fireEvent.click(menuButton());
    const link = screen.getByRole('link', { name: 'Your week' });
    link.focus();

    fireEvent.keyDown(link, { key: 'Escape' });

    expect(menuButton()).toHaveAttribute('aria-expanded', 'false');
    expect(menuButton()).toHaveFocus();
  });
});

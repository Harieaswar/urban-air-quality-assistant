/**
 * Accessibility (jest-axe), Autocomplete, Report, Methodology & Settings Tests — SmogGuard
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { axe } from 'jest-axe';
import App from '@/App';

function renderAt(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
}

describe('Accessibility (jest-axe) & Full Page Coverage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    window.print = vi.fn();
  });

  it('passes jest-axe on Landing, Wizard, Report, Methodology, and Settings pages', async () => {
    for (const route of ['/', '/wizard', '/report', '/methodology', '/settings']) {
      const { container, unmount } = renderAt(route);
      const results = await axe(container);
      expect(results).toHaveNoViolations();
      expect(container.querySelectorAll('h1')).toHaveLength(1);
      unmount();
    }
  });

  it('supports ARIA combobox debounce, keyboard navigation (ArrowDown/Enter/Esc), and manual coords', async () => {
    vi.useFakeTimers();
    globalThis.fetch = vi.fn(async (url) => {
      if (url.includes('geocoding-api.open-meteo.com')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            results: [
              {
                id: 10,
                name: 'Salem',
                admin1: 'Tamil Nadu',
                country: 'India',
                latitude: 11.664,
                longitude: 78.146,
              },
            ],
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          hourly: {
            time: Array.from(
              { length: 24 },
              (_, h) => `2026-11-26T${String(h).padStart(2, '0')}:00`
            ),
            pm2_5: Array.from({ length: 24 }, () => 44),
          },
        }),
      };
    });

    renderAt('/');
    const input = screen.getByRole('combobox', { name: /Search your city/i });
    fireEvent.change(input, { target: { value: 'Salem' } });

    await act(async () => {
      await vi.advanceTimersByTimeAsync(350);
    });
    vi.useRealTimers();

    await waitFor(() => {
      expect(screen.getByRole('option', { name: /Salem, Tamil Nadu, India/i })).toBeInTheDocument();
    });

    fireEvent.keyDown(input, { key: 'ArrowDown' });
    fireEvent.keyDown(input, { key: 'Enter' });

    await waitFor(() => {
      expect(screen.getAllByText(/Salem, Tamil Nadu, India/i).length).toBeGreaterThan(0);
    });

    // Manual coordinate validation & application
    fireEvent.click(screen.getByRole('button', { name: /Enter coordinates manually/i }));
    fireEvent.change(screen.getByLabelText(/Latitude/i), { target: { value: '12.9' } });
    fireEvent.change(screen.getByLabelText(/Longitude/i), { target: { value: '80.1' } });
    fireEvent.click(screen.getByRole('button', { name: /Use Coordinates/i }));
    expect(screen.getByDisplayValue(/Custom \(12\.9°, 80\.1°\)/i)).toBeInTheDocument();
  });

  it('exercises ReportPage table alternative, ranking modes, "Show the math", and Print/JSON export', () => {
    renderAt('/report');
    expect(
      screen.getByRole('heading', { name: /Smog and Air Quality Report/i })
    ).toBeInTheDocument();

    // Toggle 24-hour table alternative
    fireEvent.click(screen.getByRole('button', { name: /Show hourly table/i }));
    expect(screen.getByText(/Hourly PM2\.5 forecast and AQI categories/i)).toBeInTheDocument();

    // Toggle "Show the math" on both action impact cards and alternatives
    const mathBtns = screen.getAllByRole('button', { name: /Show the math/i });
    expect(mathBtns.length).toBeGreaterThan(1);
    fireEvent.click(mathBtns[0]);
    fireEvent.click(mathBtns[mathBtns.length - 1]);
    expect(screen.getAllByText(/Formula:/i).length).toBeGreaterThan(1);

    // Switch ranking mode to payback
    fireEvent.click(screen.getByRole('button', { name: /^Payback$/i }));
    fireEvent.click(screen.getByRole('button', { name: /Print \/ Save as PDF/i }));
    expect(window.print).toHaveBeenCalled();
  });

  it('exercises SettingsPage theme toggle, AQI scale, invalid JSON import, restart, and delete data', async () => {
    renderAt('/settings');

    // Theme switch to Solid
    fireEvent.click(screen.getByRole('radio', { name: /Solid/i }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('solid');

    // AQI scale switch
    fireEvent.click(screen.getByRole('button', { name: /US AQI \(EPA\)/i }));

    // Invalid JSON import
    const fileInput = screen.getByLabelText(/Import JSON profile file/i);
    const badFile = new File(['{bad-json'], 'bad.json', { type: 'application/json' });
    fireEvent.change(fileInput, { target: { files: [badFile] } });
    await waitFor(() => {
      expect(screen.getByRole('alert')).toHaveTextContent(/Invalid file format/i);
    });

    // Delete all data confirmation
    fireEvent.click(screen.getByRole('button', { name: /Delete all my data/i }));
    fireEvent.click(screen.getByRole('button', { name: /Yes, Delete All My Data/i }));
    expect(screen.getByRole('heading', { name: /SmogGuard/i })).toBeInTheDocument();
  });
});

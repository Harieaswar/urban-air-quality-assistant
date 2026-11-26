/**
 * Wizard, Landing, Calibration, Severe-Smog Demo & Report Component Tests — SmogGuard
 */
import React from 'react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '@/App';

function renderAt(route = '/') {
  return render(
    <MemoryRouter initialEntries={[route]}>
      <App />
    </MemoryRouter>
  );
}

describe('SmogGuard UI Flows', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
    window.print = vi.fn();
  });

  it('renders Landing Page with AQI hero, 24h PM2.5 bars, advisory chips, calibration, and sample demo', () => {
    renderAt('/');
    expect(screen.getByText(/SmogGuard — Household Air Protection/i)).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /24-Hour PM2\.5 Forecast/i })).toBeInTheDocument();
    expect(screen.getByText(/Tailor for family member/i)).toBeInTheDocument();

    // Toggle "Pregnancy" chip and verify tailored advisory updates
    const pregChip = screen.getByRole('button', { name: /Pregnancy/i });
    fireEvent.click(pregChip);
    expect(pregChip).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/not medical advice/i)).toBeInTheDocument();

    // Open "Calibrate with monitor" and apply 180 ug/m3
    fireEvent.click(screen.getByRole('button', { name: /Calibrate with monitor/i }));
    const calInput = screen.getByLabelText(/Your monitor reading right now/i);
    fireEvent.change(calInput, { target: { value: '180' } });
    fireEvent.click(screen.getByRole('button', { name: /Apply Calibration/i }));
    expect(screen.getByText(/180 µg\/m³/i)).toBeInTheDocument();

    // Trigger sample severe-smog demo
    fireEvent.click(screen.getByRole('button', { name: /Sample severe-smog demo/i }));
    expect(screen.getAllByText(/Sample Severe-Smog Demo/i).length).toBeGreaterThan(0);
  });

  it('supports 4-step wizard navigation, "Other" validation, "Not sure", invalid numbers, Back/Edit, and Restart', async () => {
    renderAt('/wizard');

    // Step 1: Location
    expect(screen.getByRole('heading', { name: /1\. Location & Home Setup/i })).toBeInTheDocument();

    // Select "Other" for Home Type without filling text -> triggers plain-language validation error
    const homeGroup = screen.getByRole('radiogroup', { name: /Home type/i });
    const otherRadio = Array.from(homeGroup.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Other')
    );
    fireEvent.click(otherRadio);
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    expect(
      screen.getAllByText(/Please specify your "Other" answer for Home type/i).length
    ).toBeGreaterThan(0);

    // Select "Not sure" -> validation passes
    const notSureRadio = Array.from(homeGroup.querySelectorAll('button')).find((b) =>
      b.textContent.includes('Not sure')
    );
    fireEvent.click(notSureRadio);
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));

    // Step 2: Family
    expect(screen.getByRole('heading', { name: /2\. Family & Priorities/i })).toBeInTheDocument();
    const sizeInput = screen.getByLabelText(/Household size/i);
    fireEvent.change(sizeInput, { target: { value: '99' } });
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    expect(screen.getAllByText(/Household size must be between 1 and 25/i).length).toBeGreaterThan(
      0
    );

    // Fix household size & go Next -> Step 3
    fireEvent.change(sizeInput, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    expect(
      screen.getByRole('heading', { name: /3\. Rooms, Kitchen & Indoor Sources/i })
    ).toBeInTheDocument();

    // Back preserves Step 2 value (3)
    fireEvent.click(screen.getByRole('button', { name: /Back/i }));
    expect(screen.getByLabelText(/Household size/i)).toHaveValue(3);

    // Advance through Step 3 and Step 4 to generate Report
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    fireEvent.click(screen.getByRole('button', { name: /Next Step/i }));
    expect(
      screen.getByRole('heading', { name: /4\. Daily Routine, Energy & Commute/i })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Generate Smog & Air Quality Report/i }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: /Smog and Air Quality Report/i })
      ).toBeInTheDocument();
    });

    // Verify all 10 report sections exist
    expect(screen.getByText(/1\. Executive Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/2\. 24-Hour Forecast/i)).toBeInTheDocument();
    expect(screen.getByText(/3\. Health Advisory for Your Household/i)).toBeInTheDocument();
    expect(screen.getByText(/4\. Top Indoor & Outdoor Pollution Sources/i)).toBeInTheDocument();
    expect(screen.getByText(/5\. Prioritized Preventive Measures/i)).toBeInTheDocument();
    expect(screen.getByText(/6\. Room-by-Room Plan & Clean Room Sizing/i)).toBeInTheDocument();
    expect(screen.getByText(/7\. Low-Emission Daily Routine/i)).toBeInTheDocument();
    expect(screen.getByText(/8\. Direct Action Impact Cards/i)).toBeInTheDocument();
    expect(screen.getByText(/9\. Sustainable Alternatives & Payback/i)).toBeInTheDocument();
    expect(screen.getByText(/10\. Assumptions, Data Sources & Limitations/i)).toBeInTheDocument();
    expect(screen.getByText(/Designated Clean Room/i)).toBeInTheDocument();
  });

  it('supports Restart confirmation in Wizard', () => {
    renderAt('/wizard');
    fireEvent.click(screen.getByRole('button', { name: /Restart Wizard/i }));
    expect(screen.getByRole('alertdialog', { name: /Confirm restart/i })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Yes, Restart/i }));
    expect(screen.getByRole('heading', { name: /1\. Location & Home Setup/i })).toBeInTheDocument();
  });

  it('renders tailored report advisories for each family member profile', () => {
    localStorage.setItem(
      'smogguard_state_v2',
      JSON.stringify({
        family: {
          householdSize: 4,
          sensitiveGroups: ['children', 'older_adults', 'breathing_heart', 'pregnancy'],
          goals: ['cleaner_air'],
          budget: 'medium',
          effort: 'medium',
        },
      })
    );
    renderAt('/report');
    expect(screen.getByText(/Children & infants/i)).toBeInTheDocument();
    expect(screen.getByText(/Older adults \(65\+\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Breathing or heart conditions/i)).toBeInTheDocument();
    expect(screen.getByText(/Pregnancy/i)).toBeInTheDocument();
  });
});

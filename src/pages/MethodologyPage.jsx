/**
 * @fileoverview Methodology and Data Sources page listing emission factors, formulas, evidence, and limits.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { DataSourcesList, GlassCard } from '@/components';
import { EVIDENCE_LEVELS } from '@/constants';
import assumptionsData from '@/data/assumptions.json';
import evidenceData from '@/data/evidence.json';
import factorsData from '@/data/factors.json';

function EmissionFactorsTableSection() {
  return (
    <section className="page-section">
      <h2>Emission Factors Registry</h2>
      <GlassCard>
        <div style={{ overflowX: 'auto' }}>
          <table className="factor-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Value</th>
                <th>Unit</th>
                <th>Range</th>
                <th>Source</th>
                <th>Year</th>
              </tr>
            </thead>
            <tbody>
              {factorsData.map((f) => (
                <tr key={f.id}>
                  <td>{f.id.replace(/_/g, ' ')}</td>
                  <td>
                    <strong>{f.value}</strong>
                  </td>
                  <td>{f.unit}</td>
                  <td>
                    {f.low}–{f.high}
                  </td>
                  <td>{f.source}</td>
                  <td>{f.year}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </section>
  );
}

function CalculationFormulasSection() {
  return (
    <section className="page-section">
      <h2>Calculation Formulas</h2>
      <GlassCard>
        <h3>AQI & WHO Ratio</h3>
        <p>
          PM2.5 (µg/m³) converted via piecewise-linear breakpoints for CPCB India NAQI or US EPA
          AQI; WHO ratio = PM2.5 ÷ 15 µg/m³ (WHO 2021 24-hour guideline).
        </p>
        <h3 style={{ marginTop: 'var(--space-lg)' }}>Room Purifier CADR Sizing</h3>
        <p>
          Recommended CADR (m³/h) = Room Area (m²) × Ceiling Height (m) × 5 ACH (±15–20% range).
        </p>
        <h3 style={{ marginTop: 'var(--space-lg)' }}>
          Transport, Electricity, Cooking, Diet & Waste
        </h3>
        <p>
          All household carbon estimates multiply user-reported or conservative &ldquo;Not
          sure&rdquo; inputs by TERI, CEA v18, IPCC 2006, Vetter et al., and CPCB factors with
          low–high bounds.
        </p>
      </GlassCard>
    </section>
  );
}

function EvidenceDatabaseSection() {
  return (
    <section className="page-section">
      <h2>Evidence Database</h2>
      {evidenceData.map((ev) => {
        const info = EVIDENCE_LEVELS[ev.evidence_level] || {};
        return (
          <GlassCard
            key={ev.id}
            className="animate-fade-in"
            style={{ marginBottom: 'var(--space-md)' }}
          >
            <h3>{ev.claim}</h3>
            <p>
              <span className={`badge badge--${info.color || 'gray'}`}>
                {info.label || ev.evidence_level}
              </span>{' '}
              <strong>Verdict:</strong> {ev.verdict.replace(/_/g, ' ')}
            </p>
            <p style={{ marginTop: 'var(--space-sm)' }}>{ev.summary}</p>
            {ev.sources && (
              <ul style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
                {ev.sources.map((s, i) => (
                  <li key={i}>
                    {s.title} ({s.year})
                  </li>
                ))}
              </ul>
            )}
          </GlassCard>
        );
      })}
    </section>
  );
}

function LimitationsAndNavSection() {
  return (
    <>
      <section className="page-section">
        <h2>Limitations</h2>
        <GlassCard>
          <ul className="sources-list">
            {assumptionsData.limitations.map((l, i) => (
              <li key={i}>{l}</li>
            ))}
          </ul>
        </GlassCard>
      </section>
      <div
        style={{
          textAlign: 'center',
          marginTop: 'var(--space-xl)',
          display: 'flex',
          gap: 'var(--space-md)',
          justifyContent: 'center',
        }}
      >
        <Link to="/" className="btn btn--secondary">
          ← Back to Home
        </Link>
        <Link to="/report" className="btn btn--primary">
          View Report →
        </Link>
      </div>
    </>
  );
}

/**
 * Render Methodology & Data Sources page documenting datasets, formulas, evidence ratings, and limits.
 * @returns {JSX.Element} Methodology page.
 */
export default function MethodologyPage() {
  return (
    <div className="page-container">
      <h1 className="page-title">📐 Methodology & Data Sources</h1>
      <p style={{ marginBottom: 'var(--space-lg)' }}>
        Every calculation in SmogGuard uses published emission factors, transparent formulas, and
        direct keyless public air-quality feeds (Open-Meteo CAMS). No numbers are invented.
      </p>
      <section className="page-section">
        <h2>Public Air Quality, Advisory & Factor Sources</h2>
        <GlassCard>
          <DataSourcesList />
        </GlassCard>
      </section>
      <EmissionFactorsTableSection />
      <CalculationFormulasSection />
      <EvidenceDatabaseSection />
      <LimitationsAndNavSection />
    </div>
  );
}

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { getHealthAdvisory } from '@/calculators/advisory';
import { FAMILY_PROFILES } from '@/data/constants';

/**
 * Health Advisory Card — SmogGuard
 * Uses MoHFW/NCDC category guidance from advisories.json.
 * Includes interactive "Tailor for family member" chips and "not medical advice" note.
 */
export default function HealthAdvisoryCard({
  pm25,
  aqiScale,
  selectedFamilyIds = [],
  onToggleFamilyMember,
  showChips = true,
}) {
  const cleanIds = selectedFamilyIds.filter((id) =>
    FAMILY_PROFILES.some((fp) => fp.id === id)
  );
  const advisory = getHealthAdvisory(pm25, cleanIds, aqiScale);

  return (
    <GlassCard className="advisory-card">
      <div className="advisory-header">
        <div>
          <span className="hero-eyebrow">🩺 MoHFW / NCDC Health Advisory</span>
          <h3>
            <span aria-hidden="true">{advisory.icon}</span> {advisory.categoryLabel} Air Quality ({advisory.aqi})
          </h3>
        </div>
      </div>

      <p className="advisory-general">{advisory.generalAdvice}</p>

      {showChips && onToggleFamilyMember && (
        <div className="tailor-section">
          <p className="field-label">Tailor for family member</p>
          <div className="chip-group" role="group" aria-label="Tailor for family member">
            {FAMILY_PROFILES.map((fp) => {
              const active = cleanIds.includes(fp.id);
              return (
                <button
                  key={fp.id}
                  type="button"
                  className={`choice-chip ${active ? 'selected' : ''}`}
                  aria-pressed={active}
                  onClick={() => onToggleFamilyMember(fp.id)}
                >
                  <span aria-hidden="true">{fp.icon}</span>
                  <span>{fp.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {advisory.tailoredNotes.length > 0 && (
        <div className="tailored-list">
          {advisory.tailoredNotes.map((note) => (
            <div key={note.id} className="tailored-item">
              <div className="tailored-item-title">
                <span aria-hidden="true">{note.icon}</span>
                <strong>{note.label}</strong>
              </div>
              <p>{note.advice}</p>
              <p className="tailored-rationale">{note.rationale}</p>
            </div>
          ))}
        </div>
      )}

      <p className="medical-disclaimer" role="note">
        ⚠️ {advisory.disclaimer}
      </p>
      <p className="source-footnote">Source: {advisory.source} ({advisory.year})</p>
    </GlassCard>
  );
}

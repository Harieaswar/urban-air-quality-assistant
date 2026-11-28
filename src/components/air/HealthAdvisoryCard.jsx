/**
 * @fileoverview MoHFW/NCDC Health Advisory Card with interactive family-tailoring chips.
 */

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import TailoredNotesList from '@/components/air/TailoredNotesList';
import { getHealthAdvisory } from '@/calculators/advisory';
import { FAMILY_PROFILES } from '@/constants';

function FamilyTailoringChips({ cleanIds, onToggleFamilyMember }) {
  return (
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
  );
}

/**
 * Render MoHFW/NCDC air quality health guidance and sensitive-group tailoring chips.
 * @param {Object} props - PM2.5 reading, AQI scale, selected family profiles, and chip toggle handler.
 * @returns {JSX.Element} Health advisory card.
 */
export default function HealthAdvisoryCard({
  pm25,
  aqiScale,
  selectedFamilyIds = [],
  onToggleFamilyMember,
  showChips = true,
}) {
  const cleanIds = selectedFamilyIds.filter((id) => FAMILY_PROFILES.some((fp) => fp.id === id));
  const advisory = getHealthAdvisory(pm25, cleanIds, aqiScale);

  return (
    <GlassCard className="advisory-card">
      <div className="advisory-header">
        <div>
          <span className="hero-eyebrow">🩺 MoHFW / NCDC Health Advisory</span>
          <h3>
            <span aria-hidden="true">{advisory.icon}</span> {advisory.categoryLabel} Air Quality (
            {advisory.aqi})
          </h3>
        </div>
      </div>
      <p className="advisory-general">{advisory.generalAdvice}</p>
      {showChips && onToggleFamilyMember && (
        <FamilyTailoringChips cleanIds={cleanIds} onToggleFamilyMember={onToggleFamilyMember} />
      )}
      <TailoredNotesList notes={advisory.tailoredNotes} />
      <p className="medical-disclaimer" role="note">
        ⚠️ {advisory.disclaimer}
      </p>
      <p className="source-footnote">
        Source: {advisory.source} ({advisory.year})
      </p>
    </GlassCard>
  );
}

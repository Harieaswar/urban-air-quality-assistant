/**
 * @fileoverview Report Sections 5–7: Prioritized IAQ & Preventive Measures, Clean-Room Plan, and Low-Emission Daily Routine.
 */

import React from 'react';
import GlassCard from '@/components/ui/GlassCard';
import { EvidenceBadge, EffortBadge, CostBadge } from '@/components/ui/Badge';
import { formatINR } from '@/utils/format';

/**
 * Render Report Sections 5 through 7.
 * @param {Object} props - Prioritized measures, room plan, daily routine, and selection handlers.
 * @returns {JSX.Element} Report sections 5–7.
 */
export default function ReportActionSections({
  prioritizedMeasures,
  selectedActionIds,
  roomPlan,
  hourlyRoutine,
  onToggleAction,
  onEditStep,
}) {
  return (
    <>
      <section className="page-section report-section" aria-labelledby="sec-measures">
        <h2 id="sec-measures">
          5. Prioritized Preventive Measures & Indoor Air Quality (IAQ) Hacks
        </h2>
        <div className="measures-tiers-grid">
          {prioritizedMeasures.map((tier) => (
            <GlassCard key={tier.tierId} className="tier-card">
              <h3>
                <span aria-hidden="true">{tier.icon}</span> {tier.label}
              </h3>
              {tier.items.length === 0 ? (
                <p className="field-help">
                  No additional actions needed in this tier for your home.
                </p>
              ) : (
                <div className="tier-items">
                  {tier.items.map((item) => {
                    const isSelected = selectedActionIds.includes(item.id);
                    return (
                      <div key={item.id} className="tier-item">
                        <div className="tier-item-header">
                          <strong>{item.title}</strong>
                          <button
                            type="button"
                            className={`action-toggle no-print ${isSelected ? 'selected' : ''}`}
                            aria-pressed={isSelected}
                            onClick={() => onToggleAction(item.id)}
                          >
                            {isSelected ? 'Selected ✓' : 'Select'}
                          </button>
                        </div>
                        <p>
                          <strong>Why it works:</strong> {item.whyItWorks}
                        </p>
                        <p>
                          <strong>Expected effect:</strong> {item.effectRange}
                        </p>
                        <div className="action-card-badges">
                          <CostBadge tier={item.costTier} />
                          <EffortBadge level={item.effort} />
                          <EvidenceBadge level={item.evidence} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="page-section report-section" aria-labelledby="sec-rooms">
        <div className="section-heading-row">
          <h2 id="sec-rooms">6. Room-by-Room Plan & Clean Room Sizing</h2>
          <button type="button" className="btn btn--ghost no-print" onClick={() => onEditStep(3)}>
            Edit Rooms
          </button>
        </div>
        <div className="rooms-plan-grid">
          {roomPlan.map((room) => (
            <GlassCard
              key={room.id}
              className={`room-plan-card ${room.isCleanRoom ? 'clean-room-highlight' : ''}`}
            >
              <div className="room-plan-top">
                <h3>{room.name}</h3>
                {room.isCleanRoom && (
                  <span className="badge badge--green">🛡️ Designated Clean Room</span>
                )}
              </div>
              <p className="room-plan-reason">{room.cleanRoomReason}</p>
              <div className="room-sizing-stats">
                <div>
                  <span>Volume:</span> <strong>{room.sizing.roomVolume} m³</strong> (
                  {room.sizing.areaSqM} m² × {room.sizing.ceilingHeightM} m)
                </div>
                <div>
                  <span>Target HEPA CADR (≥{room.sizing.achievedACH} ACH):</span>{' '}
                  <strong>
                    {room.sizing.cadrRange.min}–{room.sizing.cadrRange.max} m³/h
                  </strong>
                </div>
                <div>
                  <span>Est. Running Cost:</span>{' '}
                  <strong>~{formatINR(room.sizing.runningCostPerMonth)}/month</strong> (
                  {room.sizing.annualEmissions} kg CO₂e/yr grid)
                </div>
              </div>
            </GlassCard>
          ))}
        </div>
      </section>

      <section className="page-section report-section" aria-labelledby="sec-routine">
        <div className="section-heading-row">
          <h2 id="sec-routine">7. Low-Emission Daily Routine (Hour-by-Hour for Today)</h2>
          <button type="button" className="btn btn--ghost no-print" onClick={() => onEditStep(4)}>
            Edit Routine
          </button>
        </div>
        <GlassCard>
          <div className="routine-timeline">
            {hourlyRoutine.map((slot, idx) => (
              <div key={idx} className="routine-row">
                <div className="routine-time">
                  <span aria-hidden="true">{slot.icon}</span>
                  <strong>{slot.timeRange}</strong>
                  <span className="routine-slot-name">{slot.slot}</span>
                </div>
                <div className="routine-body">
                  <p>
                    <strong>{slot.action}</strong>
                  </p>
                  <p className="field-help">{slot.reason}</p>
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </section>
    </>
  );
}

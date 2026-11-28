/**
 * @fileoverview Wizard Step 2 — Household size, sensitive family members, goals, budget, and effort.
 */

import React from 'react';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import NumericUnknownField from '@/components/wizard/NumericUnknownField';
import { CONSERVATIVE_UNKNOWNS } from '@/constants';
import { sanitizeInput } from '@/utils/sanitize';

/**
 * Render Step 2 (Family & Priorities) wizard controls.
 * @param {Object} props - Family state, dispatch, errors, and heading ref.
 * @returns {JSX.Element} Step 2 fields.
 */
export default function StepFamily({ family, errors, dispatch, headingRef }) {
  return (
    <div className="wizard-step-body">
      <h2 ref={headingRef} tabIndex={-1}>
        2. Family & Priorities
      </h2>

      <NumericUnknownField
        id="household-size-input"
        label="Household size (people living here)"
        value={family.householdSize}
        defaultVal={CONSERVATIVE_UNKNOWNS.householdSize}
        min={1}
        max={25}
        error={errors.householdSize}
        onChange={(val) => dispatch({ type: 'UPDATE_FAMILY', payload: { householdSize: val } })}
      />

      <ChoiceGroup
        id="sensitiveGroups"
        label="Family members needing tailored protection"
        multi
        options={[
          { value: 'children', label: 'Children & infants', icon: '👶' },
          { value: 'older_adults', label: 'Older adults (65+)', icon: '👴' },
          { value: 'breathing_heart', label: 'Breathing or heart conditions', icon: '🫁' },
          { value: 'pregnancy', label: 'Pregnancy', icon: '🤰' },
          { value: 'none', label: 'No sensitive group members', icon: '✓' },
        ]}
        value={family.sensitiveGroups}
        otherValue={family.sensitiveGroupsOther}
        onChange={(val) => dispatch({ type: 'UPDATE_FAMILY', payload: { sensitiveGroups: val } })}
        onOtherChange={(txt) =>
          dispatch({
            type: 'UPDATE_FAMILY',
            payload: { sensitiveGroupsOther: sanitizeInput(txt, 100) },
          })
        }
        conservativeHint="Applies protective child/sensitive-group thresholds."
        error={errors.sensitiveGroups}
      />

      <ChoiceGroup
        id="goals"
        label="Primary goals"
        multi
        options={[
          { value: 'cleaner_air', label: 'Cleaner indoor air', icon: '🫁' },
          { value: 'cut_emissions', label: 'Cut CO₂e emissions', icon: '🌍' },
          { value: 'save_money', label: 'Save money on bills', icon: '💰' },
        ]}
        value={family.goals}
        otherValue={family.goalsOther}
        onChange={(val) => dispatch({ type: 'UPDATE_FAMILY', payload: { goals: val } })}
        onOtherChange={(txt) =>
          dispatch({ type: 'UPDATE_FAMILY', payload: { goalsOther: sanitizeInput(txt, 80) } })
        }
        conservativeHint="Prioritizes cleaner air and emissions reductions."
        error={errors.goals}
      />

      <ChoiceGroup
        id="budget"
        label="Budget comfort for upgrades"
        options={[
          { value: 'low', label: 'Free / under ₹500', icon: '₹' },
          { value: 'medium', label: 'Up to ₹5,000', icon: '₹₹' },
          { value: 'high', label: 'Open to ₹5,000+ investments', icon: '₹₹₹' },
        ]}
        value={family.budget}
        otherValue={family.budgetOther}
        onChange={(val) => dispatch({ type: 'UPDATE_FAMILY', payload: { budget: val } })}
        onOtherChange={(txt) =>
          dispatch({ type: 'UPDATE_FAMILY', payload: { budgetOther: sanitizeInput(txt, 80) } })
        }
        conservativeHint="Shows free, today, and low-cost actions first."
        error={errors.budget}
      />

      <ChoiceGroup
        id="effort"
        label="Effort level your household can sustain"
        options={[
          { value: 'low', label: 'Low effort (quick habits)', icon: '⚡' },
          { value: 'medium', label: 'Moderate effort', icon: '⚡⚡' },
          { value: 'high', label: 'High effort (all actions)', icon: '⚡⚡⚡' },
        ]}
        value={family.effort}
        otherValue={family.effortOther}
        onChange={(val) => dispatch({ type: 'UPDATE_FAMILY', payload: { effort: val } })}
        onOtherChange={(txt) =>
          dispatch({ type: 'UPDATE_FAMILY', payload: { effortOther: sanitizeInput(txt, 80) } })
        }
        conservativeHint="Includes low & medium effort options."
        error={errors.effort}
      />
    </div>
  );
}

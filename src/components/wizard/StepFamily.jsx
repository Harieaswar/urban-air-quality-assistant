/**
 * @fileoverview Wizard Step 2 — Household size, sensitive family members, goals, budget, and effort.
 */

import React from 'react';
import ChoiceGroup from '@/components/wizard/ChoiceGroup';
import NumericUnknownField from '@/components/wizard/NumericUnknownField';
import { BOUNDS, CONSERVATIVE_UNKNOWNS } from '@/constants';
import { sanitizeInput } from '@/utils/sanitize';

const SENSITIVE_GROUP_OPTIONS = [
  { value: 'children', label: 'Children & infants', icon: '👶' },
  { value: 'older_adults', label: 'Older adults (65+)', icon: '👴' },
  { value: 'breathing_heart', label: 'Breathing or heart conditions', icon: '🫁' },
  { value: 'pregnancy', label: 'Pregnancy', icon: '🤰' },
  { value: 'none', label: 'No sensitive group members', icon: '✓' },
];

const GOAL_OPTIONS = [
  { value: 'cleaner_air', label: 'Cleaner indoor air', icon: '🫁' },
  { value: 'cut_emissions', label: 'Cut CO₂e emissions', icon: '🌍' },
  { value: 'save_money', label: 'Save money on bills', icon: '💰' },
];

const BUDGET_OPTIONS = [
  { value: 'low', label: 'Free / under ₹500', icon: '₹' },
  { value: 'medium', label: 'Up to ₹5,000', icon: '₹₹' },
  { value: 'high', label: 'Open to ₹5,000+ investments', icon: '₹₹₹' },
];

const EFFORT_OPTIONS = [
  { value: 'low', label: 'Low effort (quick habits)', icon: '⚡' },
  { value: 'medium', label: 'Moderate effort', icon: '⚡⚡' },
  { value: 'high', label: 'High effort (all actions)', icon: '⚡⚡⚡' },
];

function GoalsAndBudgetChoices({ family, errors, update }) {
  const cleanOther = (txt) => sanitizeInput(txt, BOUNDS.SHORT_TEXT_MAX_LEN);
  return (
    <>
      <ChoiceGroup
        id="goals"
        label="Primary goals"
        multi
        options={GOAL_OPTIONS}
        value={family.goals}
        otherValue={family.goalsOther}
        onChange={(val) => update({ goals: val })}
        onOtherChange={(txt) => update({ goalsOther: cleanOther(txt) })}
        conservativeHint="Prioritizes cleaner air and emissions reductions."
        error={errors.goals}
      />
      <ChoiceGroup
        id="budget"
        label="Budget comfort for upgrades"
        options={BUDGET_OPTIONS}
        value={family.budget}
        otherValue={family.budgetOther}
        onChange={(val) => update({ budget: val })}
        onOtherChange={(txt) => update({ budgetOther: cleanOther(txt) })}
        conservativeHint="Shows free, today, and low-cost actions first."
        error={errors.budget}
      />
    </>
  );
}

function EffortChoice({ family, errors, update }) {
  return (
    <ChoiceGroup
      id="effort"
      label="Effort level your household can sustain"
      options={EFFORT_OPTIONS}
      value={family.effort}
      otherValue={family.effortOther}
      onChange={(val) => update({ effort: val })}
      onOtherChange={(txt) =>
        update({ effortOther: sanitizeInput(txt, BOUNDS.SHORT_TEXT_MAX_LEN) })
      }
      conservativeHint="Includes low & medium effort options."
      error={errors.effort}
    />
  );
}

/**
 * Render Step 2 (Family & Priorities) wizard controls.
 * @param {Object} props - Family state, dispatch, errors, and heading ref.
 * @returns {JSX.Element} Step 2 fields.
 */
export default function StepFamily({ family, errors, dispatch, headingRef }) {
  const update = (payload) => dispatch({ type: 'UPDATE_FAMILY', payload });

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
        min={BOUNDS.MIN_HOUSEHOLD_SIZE}
        max={BOUNDS.MAX_HOUSEHOLD_SIZE}
        error={errors.householdSize}
        onChange={(val) => update({ householdSize: val })}
      />
      <ChoiceGroup
        id="sensitiveGroups"
        label="Family members needing tailored protection"
        multi
        options={SENSITIVE_GROUP_OPTIONS}
        value={family.sensitiveGroups}
        otherValue={family.sensitiveGroupsOther}
        onChange={(val) => update({ sensitiveGroups: val })}
        onOtherChange={(txt) =>
          update({ sensitiveGroupsOther: sanitizeInput(txt, BOUNDS.HOUSEHOLD_MAX_LEN) })
        }
        conservativeHint="Applies protective child/sensitive-group thresholds."
        error={errors.sensitiveGroups}
      />
      <GoalsAndBudgetChoices family={family} errors={errors} update={update} />
      <EffortChoice family={family} errors={errors} update={update} />
    </div>
  );
}

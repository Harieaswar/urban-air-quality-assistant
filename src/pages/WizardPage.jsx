/**
 * @fileoverview Guided 4-Step Wizard orchestrator with accessible step-heading focus management.
 */

import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '@/state/AppContext';
import GlassCard from '@/components/ui/GlassCard';
import StepLocation from '@/components/wizard/StepLocation';
import StepFamily from '@/components/wizard/StepFamily';
import StepRooms from '@/components/wizard/StepRooms';
import StepRoutine from '@/components/wizard/StepRoutine';
import { validateWizardStep } from '@/components/wizard/wizardValidation';

const STEPS = [
  { id: 1, label: '1. Location' },
  { id: 2, label: '2. Family' },
  { id: 3, label: '3. Rooms' },
  { id: 4, label: '4. Routine' },
];

/**
 * Render the 4-Step SmogGuard Wizard (`Location` -> `Family` -> `Rooms` -> `Routine`).
 * Moves focus to the active step heading whenever the step changes.
 * @returns {JSX.Element} Wizard page.
 */
export default function WizardPage() {
  const navigate = useNavigate();
  const { state, dispatch, loadLocationAir } = useAppStore();
  const step = state.wizardStep || 1;
  const [errors, setErrors] = useState({});
  const [confirmRestart, setConfirmRestart] = useState(false);

  const stepHeadingRef = useRef(null);
  const errorSummaryRef = useRef(null);
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [step]);

  const handleNext = () => {
    const errs = validateWizardStep(step, state);
    setErrors(errs);
    if (Object.keys(errs).length > 0) {
      errorSummaryRef.current?.focus();
      return;
    }
    if (step < 4) {
      dispatch({ type: 'SET_STEP', step: step + 1 });
      setErrors({});
    } else {
      dispatch({ type: 'COMPLETE_WIZARD' });
      navigate('/report');
    }
  };

  const handleBack = () => {
    setErrors({});
    if (step > 1) dispatch({ type: 'SET_STEP', step: step - 1 });
    else navigate('/');
  };

  const errorList = Object.values(errors);

  return (
    <div className="page-container wizard-page">
      <div className="wizard-header">
        <div>
          <h1 className="page-title">Household Smog & Emissions Setup</h1>
          <p className="wizard-subtitle">
            Guided choices — every field includes &ldquo;Other&rdquo; and &ldquo;Not sure&rdquo; so
            you never get stuck.
          </p>
        </div>

        <div className="wizard-top-actions">
          {!confirmRestart ? (
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setConfirmRestart(true)}
            >
              🔄 Restart Wizard
            </button>
          ) : (
            <div className="confirm-inline" role="alertdialog" aria-label="Confirm restart">
              <span>Reset all wizard answers?</span>
              <button
                type="button"
                className="btn btn--primary"
                onClick={() => {
                  dispatch({ type: 'RESTART' });
                  setConfirmRestart(false);
                  setErrors({});
                }}
              >
                Yes, Restart
              </button>
              <button
                type="button"
                className="btn btn--ghost"
                onClick={() => setConfirmRestart(false)}
              >
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>

      <nav className="wizard-stepper" aria-label="Wizard steps">
        {STEPS.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`stepper-btn ${step === s.id ? 'active' : step > s.id ? 'completed' : ''}`}
            aria-current={step === s.id ? 'step' : undefined}
            onClick={() => {
              setErrors({});
              dispatch({ type: 'SET_STEP', step: s.id });
            }}
          >
            {s.label}
          </button>
        ))}
      </nav>

      {errorList.length > 0 && (
        <div
          ref={errorSummaryRef}
          tabIndex={-1}
          className="validation-summary"
          role="alert"
          aria-live="assertive"
        >
          <strong>Please review before continuing:</strong>
          <ul>
            {errorList.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      )}

      <GlassCard className="wizard-card">
        {step === 1 && (
          <StepLocation
            location={state.location}
            errors={errors}
            dispatch={dispatch}
            loadLocationAir={loadLocationAir}
            headingRef={stepHeadingRef}
          />
        )}
        {step === 2 && (
          <StepFamily
            family={state.family}
            errors={errors}
            dispatch={dispatch}
            headingRef={stepHeadingRef}
          />
        )}
        {step === 3 && (
          <StepRooms
            rooms={state.rooms}
            errors={errors}
            dispatch={dispatch}
            headingRef={stepHeadingRef}
          />
        )}
        {step === 4 && (
          <StepRoutine
            routine={state.routine}
            errors={errors}
            dispatch={dispatch}
            headingRef={stepHeadingRef}
          />
        )}

        <div className="wizard-nav-footer">
          <button type="button" className="btn btn--secondary" onClick={handleBack}>
            ← {step === 1 ? 'Back to Home' : 'Back'}
          </button>
          <button type="button" className="btn btn--primary" onClick={handleNext}>
            {step < 4 ? 'Next Step →' : 'Generate Smog & Air Quality Report →'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

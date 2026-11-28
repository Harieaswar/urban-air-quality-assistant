/**
 * @fileoverview Guided 4-Step Wizard orchestrator with accessible step-heading focus management.
 */

import React from 'react';
import { useAppStore } from '@/state';
import { useWizardController } from '@/hooks';
import { BOUNDS } from '@/constants';
import { GlassCard, StepLocation, StepFamily, StepRooms, StepRoutine } from '@/components';

const STEPS = [
  { id: BOUNDS.STEP_LOCATION, label: '1. Location' },
  { id: BOUNDS.STEP_FAMILY, label: '2. Family' },
  { id: BOUNDS.STEP_ROOMS, label: '3. Rooms' },
  { id: BOUNDS.STEP_ROUTINE, label: '4. Routine' },
];

function getStepperStatusClass(activeStep, targetStep) {
  if (activeStep === targetStep) return 'active';
  if (activeStep > targetStep) return 'completed';
  return '';
}

function WizardTopHeader({ confirmRestart, setConfirmRestart, onConfirmRestart }) {
  return (
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
          <button type="button" className="btn btn--ghost" onClick={() => setConfirmRestart(true)}>
            🔄 Restart Wizard
          </button>
        ) : (
          <div className="confirm-inline" role="alertdialog" aria-label="Confirm restart">
            <span>Reset all wizard answers?</span>
            <button type="button" className="btn btn--primary" onClick={onConfirmRestart}>
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
  );
}

function WizardStepperNav({ step, onSelectStep }) {
  return (
    <nav className="wizard-stepper" aria-label="Wizard steps">
      {STEPS.map((s) => (
        <button
          key={s.id}
          type="button"
          className={`stepper-btn ${getStepperStatusClass(step, s.id)}`}
          aria-current={step === s.id ? 'step' : undefined}
          onClick={() => onSelectStep(s.id)}
        >
          {s.label}
        </button>
      ))}
    </nav>
  );
}

function ValidationSummaryBanner({ errorList, summaryRef }) {
  if (errorList.length === 0) return null;
  return (
    <div
      ref={summaryRef}
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
  );
}

const STEP_RENDERERS = {
  [BOUNDS.STEP_LOCATION]: ({ state, errors, dispatch, loadLocationAir, stepHeadingRef }) => (
    <StepLocation
      location={state.location}
      errors={errors}
      dispatch={dispatch}
      loadLocationAir={loadLocationAir}
      headingRef={stepHeadingRef}
    />
  ),
  [BOUNDS.STEP_FAMILY]: ({ state, errors, dispatch, stepHeadingRef }) => (
    <StepFamily
      family={state.family}
      errors={errors}
      dispatch={dispatch}
      headingRef={stepHeadingRef}
    />
  ),
  [BOUNDS.STEP_ROOMS]: ({ state, errors, dispatch, stepHeadingRef }) => (
    <StepRooms
      rooms={state.rooms}
      errors={errors}
      dispatch={dispatch}
      headingRef={stepHeadingRef}
    />
  ),
  [BOUNDS.STEP_ROUTINE]: ({ state, errors, dispatch, stepHeadingRef }) => (
    <StepRoutine
      routine={state.routine}
      errors={errors}
      dispatch={dispatch}
      headingRef={stepHeadingRef}
    />
  ),
};

function WizardStepContent({ step, ...rest }) {
  const renderStep = STEP_RENDERERS[step] || STEP_RENDERERS[BOUNDS.STEP_ROUTINE];
  return renderStep(rest);
}

/**
 * Render the 4-Step SmogGuard Wizard (`Location` -> `Family` -> `Rooms` -> `Routine`).
 * Moves focus to the active step heading whenever the step changes.
 * @returns {JSX.Element} Wizard page.
 */
export default function WizardPage() {
  const { state, dispatch, loadLocationAir } = useAppStore();
  const ctrl = useWizardController(state, dispatch);

  return (
    <div className="page-container wizard-page">
      <WizardTopHeader
        confirmRestart={ctrl.confirmRestart}
        setConfirmRestart={ctrl.setConfirmRestart}
        onConfirmRestart={ctrl.confirmAndRestart}
      />
      <WizardStepperNav step={ctrl.step} onSelectStep={ctrl.goToStep} />
      <ValidationSummaryBanner
        errorList={Object.values(ctrl.errors)}
        summaryRef={ctrl.errorSummaryRef}
      />
      <GlassCard className="wizard-card">
        <WizardStepContent
          step={ctrl.step}
          state={state}
          errors={ctrl.errors}
          dispatch={dispatch}
          loadLocationAir={loadLocationAir}
          stepHeadingRef={ctrl.stepHeadingRef}
        />
        <div className="wizard-nav-footer">
          <button type="button" className="btn btn--secondary" onClick={ctrl.handleBack}>
            ← {ctrl.step === BOUNDS.STEP_LOCATION ? 'Back to Home' : 'Back'}
          </button>
          <button type="button" className="btn btn--primary" onClick={ctrl.handleNext}>
            {ctrl.step < BOUNDS.MAX_STEPS ? 'Next Step →' : 'Generate Smog & Air Quality Report →'}
          </button>
        </div>
      </GlassCard>
    </div>
  );
}

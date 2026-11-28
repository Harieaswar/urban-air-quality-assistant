/**
 * @fileoverview Custom hook managing 4-step wizard navigation, focus movement, and validation.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateWizardStep } from '@/components/wizard/wizardValidation';
import { BOUNDS } from '@/constants';

function useStepFocusOnChange(step, headingRef) {
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [step, headingRef]);
}

function buildWizardActions({ step, state, dispatch, navigate, errorSummaryRef, ui }) {
  const goToStep = (targetStep) => {
    ui.setErrors({});
    dispatch({ type: 'SET_STEP', step: targetStep });
  };
  const handleNext = () => {
    const validationErrors = validateWizardStep(step, state);
    ui.setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return errorSummaryRef.current?.focus();
    if (step < BOUNDS.MAX_STEPS) return goToStep(step + 1);
    dispatch({ type: 'COMPLETE_WIZARD' });
    return navigate('/report');
  };
  const handleBack = () => {
    ui.setErrors({});
    if (step > BOUNDS.MIN_STEPS) dispatch({ type: 'SET_STEP', step: step - 1 });
    else navigate('/');
  };
  const confirmAndRestart = () => {
    dispatch({ type: 'RESTART' });
    ui.setConfirmRestart(false);
    ui.setErrors({});
  };
  return { goToStep, handleNext, handleBack, confirmAndRestart };
}

/**
 * Control wizard step transitions, validation error summary, restart confirmation, and heading focus.
 * @param {Object} state - Application state.
 * @param {function(Object): void} dispatch - Store dispatch callback.
 * @returns {Object} Wizard controls and refs.
 */
export function useWizardController(state, dispatch) {
  const navigate = useNavigate();
  const step = state.wizardStep || 1;
  const [errors, setErrors] = useState({});
  const [confirmRestart, setConfirmRestart] = useState(false);
  const stepHeadingRef = useRef(null);
  const errorSummaryRef = useRef(null);

  useStepFocusOnChange(step, stepHeadingRef);

  const actions = buildWizardActions({
    step,
    state,
    dispatch,
    navigate,
    errorSummaryRef,
    ui: { setErrors, setConfirmRestart },
  });

  return {
    step,
    errors,
    confirmRestart,
    setConfirmRestart,
    stepHeadingRef,
    errorSummaryRef,
    ...actions,
  };
}

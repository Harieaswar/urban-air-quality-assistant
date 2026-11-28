/**
 * @fileoverview Custom hook managing 4-step wizard navigation, focus movement, and validation.
 */

import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { validateWizardStep } from '@/components/wizard/wizardValidation';
import { BOUNDS } from '@/constants';

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
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    stepHeadingRef.current?.focus();
  }, [step]);

  const goToStep = (targetStep) => {
    setErrors({});
    dispatch({ type: 'SET_STEP', step: targetStep });
  };

  const handleNext = () => {
    const validationErrors = validateWizardStep(step, state);
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) {
      errorSummaryRef.current?.focus();
      return;
    }
    if (step < BOUNDS.MAX_STEPS) {
      goToStep(step + 1);
    } else {
      dispatch({ type: 'COMPLETE_WIZARD' });
      navigate('/report');
    }
  };

  const handleBack = () => {
    setErrors({});
    if (step > BOUNDS.MIN_STEPS) dispatch({ type: 'SET_STEP', step: step - 1 });
    else navigate('/');
  };

  const confirmAndRestart = () => {
    dispatch({ type: 'RESTART' });
    setConfirmRestart(false);
    setErrors({});
  };

  return {
    step,
    errors,
    confirmRestart,
    setConfirmRestart,
    stepHeadingRef,
    errorSummaryRef,
    goToStep,
    handleNext,
    handleBack,
    confirmAndRestart,
  };
}

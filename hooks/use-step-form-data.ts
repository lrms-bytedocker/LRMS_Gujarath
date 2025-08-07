import { useCallback, useRef } from "react";
import { useLandRecord } from "@/contexts/land-record-context";
import { LocalFormData } from "@/contexts/land-record-context";

export function useStepFormData(step: number) {
  const { formData, setFormData, setHasUnsavedChanges, hasUnsavedChanges } = useLandRecord();
  
  // Store original data when step is first loaded
  const originalDataRef = useRef<Partial<LocalFormData[number]> | null>(null);
  const currentDataRef = useRef<Partial<LocalFormData[number]> | null>(null);
  const isInitializedRef = useRef(false);

  const getStepData = useCallback(() => {
    const stepData = formData[step] || {};
    
    // Initialize original data reference on first access
    if (!isInitializedRef.current) {
      originalDataRef.current = JSON.parse(JSON.stringify(stepData));
      currentDataRef.current = JSON.parse(JSON.stringify(stepData));
      isInitializedRef.current = true;
    }
    
    return stepData;
  }, [formData, step]);

  const updateStepData = useCallback(
    (updates: Partial<LocalFormData[number]>) => {
      // Get current step data
      const currentStepData = formData[step] || {};
      const newStepData = {
        ...currentStepData,
        ...updates,
      };

      // Update form data
      setFormData((prev) => ({
        ...prev,
        [step]: newStepData,
      }));

      // Update current data ref
      currentDataRef.current = newStepData;

      // Compare with original data to determine if there are unsaved changes
      const hasActualChanges = originalDataRef.current ? 
        JSON.stringify(originalDataRef.current) !== JSON.stringify(newStepData) : 
        Object.keys(newStepData).length > 0;

      setHasUnsavedChanges(step, hasActualChanges);
    },
    [step, formData, setFormData, setHasUnsavedChanges]
  );

  const resetStepData = useCallback(() => {
    setFormData((prev) => {
      const newData = { ...prev };
      delete newData[step];
      return newData;
    });
    setHasUnsavedChanges(step, false);
    
    // Reset refs
    originalDataRef.current = null;
    isInitializedRef.current = false;
  }, [step, setFormData, setHasUnsavedChanges]);

  // Method to save current state as original (call this after successful save)
  const markAsSaved = useCallback(() => {
    const currentStepData = formData[step] || {};
    originalDataRef.current = JSON.parse(JSON.stringify(currentStepData));
    setHasUnsavedChanges(step, false);
  }, [step, formData, setHasUnsavedChanges]);

  // Method to revert to original data
  const revertToOriginal = useCallback(() => {
    if (originalDataRef.current) {
      setFormData((prev) => ({
        ...prev,
        [step]: originalDataRef.current!,
      }));
      setHasUnsavedChanges(step, false);
    }
  }, [step, setFormData, setHasUnsavedChanges]);

  return { 
    getStepData, 
    updateStepData, 
    resetStepData, 
    markAsSaved,
    revertToOriginal,
    hasUnsavedChanges: hasUnsavedChanges[step] || false
  };
}

export type StepFormDataUpdater = ReturnType<typeof useStepFormData>["updateStepData"];
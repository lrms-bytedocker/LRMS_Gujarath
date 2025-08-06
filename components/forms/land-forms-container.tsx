"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { CheckCircle, Circle, Save, Loader2 } from "lucide-react";

// Import your actual forms from LRMS_Forms-main
import LandBasicInfoComponent from "./land-basic-info";
import YearSlabs from "./year-slabs";
import Panipatrak from "./panipatrak";
import NondhAdd from "./nondh-add";
import NondhDetails from "./nondh-details";
import OutputViews from "./output-views";
import { useLandRecord } from "@/contexts/land-record-context";
import { LandRecordService } from "@/lib/supabase-enhanced";
import { useToast } from "@/hooks/use-toast";

interface FormStep {
  id: number;
  title: string;
  description: string;
}

export function LandFormsContainer() {
  const {
    currentStep,
    setCurrentStep,
    landBasicInfo,
    yearSlabs,
    nondhs,
    nondhDetails,
  } = useLandRecord();

  const { toast } = useToast();
  const [activeStep, setActiveStep] = useState(currentStep);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [isSaving, setIsSaving] = useState(false);

  const steps: FormStep[] = [
    {
      id: 1,
      title: "Land Basic Info",
      description: "District, Taluka, Village & Area details",
    },
    { id: 2, title: "Year Slabs", description: "Add year-wise land slabs" },
    {
      id: 3,
      title: "Panipatrak",
      description: "Add farmer details for each slab",
    },
    {
      id: 4,
      title: "Nondh Add",
      description: "Add Nondh numbers and affected S.no",
    },
    {
      id: 5,
      title: "Nondh Details",
      description: "Complete Nondh information",
    },
    {
      id: 6,
      title: "Output",
      description: "View results and generate reports",
    },
  ];

 const handleStepChange = async (newStep: number) => {
  if (activeStep === 3 && hasUnsavedChanges) {
    // Show confirmation dialog
    const shouldProceed = confirm("You have unsaved changes. Save before proceeding?");
    if (shouldProceed) {
      await handleSaveProgress();
    }
  }
  setActiveStep(newStep);
  setCurrentStep(newStep);
};

  const handleNext = async () => {
  const currentIndex = steps.findIndex((step) => step.id === activeStep);
  if (currentIndex < steps.length - 1) {
    await handleStepChange(steps[currentIndex + 1].id);
  }
};

const handlePrevious = async () => {
  const currentIndex = steps.findIndex((step) => step.id === activeStep);
  if (currentIndex > 0) {
    await handleStepChange(steps[currentIndex - 1].id);
  }
};

  // Simple save function
  const handleSaveProgress = async () => {
    if (!landBasicInfo) {
      toast({
        title: "Please fill basic information first",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      const landRecordData = {
        district: landBasicInfo.district,
        taluka: landBasicInfo.taluka,
        village: landBasicInfo.village,
        area_value: landBasicInfo.area.value,
        area_unit: landBasicInfo.area.unit,
        s_no_type: landBasicInfo.sNoType,
        s_no: landBasicInfo.sNo,
        is_promulgation: landBasicInfo.isPromulgation,
        block_no: landBasicInfo.blockNo,
        re_survey_no: landBasicInfo.reSurveyNo,
        integrated_712: landBasicInfo.integrated712,
        current_step: activeStep,
        status: "draft",
      };

      const { data, error } = await LandRecordService.saveLandRecord(
        landRecordData
      );

      if (error) {
        toast({ title: "Error saving data", variant: "destructive" });
        console.error(error);
      } else {
        toast({ title: "Progress saved successfully!" });
        // Store the ID for future updates
        localStorage.setItem("currentLandRecordId", data.id);
      }
    } catch (error) {
      toast({ title: "Error saving data", variant: "destructive" });
      console.error(error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSubmitAll = async () => {
    setIsSaving(true);
    try {
      // First save current progress
      await handleSaveProgress();

      toast({ title: "All forms submitted successfully!", variant: "default" });
    } catch (error) {
      toast({ title: "Error submitting forms", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const isLastStep = activeStep === steps[steps.length - 1].id;
  const isFirstStep = activeStep === steps[0].id;
  const progress = (activeStep / steps.length) * 100;

  const renderStep = () => {
    switch (activeStep) {
      case 1:
        return <LandBasicInfoComponent />;
      case 2:
        return <YearSlabs />;
      case 3:
        return <Panipatrak />;
      case 4:
        return <NondhAdd />;
      case 5:
        return <NondhDetails />;
      case 6:
        return <OutputViews />;
      default:
        return <LandBasicInfoComponent />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Land Record Management System (LRMS)
          </CardTitle>
          <div className="mt-4">
            <Progress value={progress} className="w-full" />
            <p className="text-sm text-muted-foreground text-center mt-2">
              Step {activeStep} of {steps.length}
            </p>
          </div>
        </CardHeader>
      </Card>

      {/* Step Navigation */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-2 justify-center">
            {steps.map((step) => (
              <Button
                key={step.id}
                variant={activeStep === step.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setActiveStep(step.id);
                  setCurrentStep(step.id);
                }}
                className="flex items-center gap-2"
              >
                {activeStep > step.id ? (
                  <CheckCircle className="w-4 h-4" />
                ) : (
                  <Circle className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{step.title}</span>
                <span className="sm:hidden">{step.id}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Current Step Content */}
      <div className="mb-6">{renderStep()}</div>

      {/* Navigation Buttons */}
      <div className="flex justify-between pt-6 border-t">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={isFirstStep}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {/* <Button
            variant="outline"
            onClick={handleSaveProgress}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving ? "Saving..." : "Save Progress"}
          </Button> */}

          {isLastStep ? (
            <Button
              onClick={handleSubmitAll}
              disabled={isSaving}
              className="gap-2"
            >
              <CheckCircle className="h-4 w-4" />
              {isSaving ? "Submitting..." : "Submit All Forms"}
            </Button>
          ) : (
            <Button onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}

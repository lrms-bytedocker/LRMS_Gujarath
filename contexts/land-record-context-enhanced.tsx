"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import {
  LandRecordService,
  type LandRecordData,
} from "@/lib/supabase-enhanced";
import { useToast } from "@/hooks/use-toast";

export interface AreaInput {
  value: number;
  unit: "acre" | "guntha" | "sq_m";
}

export interface LandBasicInfo {
  district: string;
  taluka: string;
  village: string;
  area: AreaInput;
  sNoType: "s_no" | "block_no" | "re_survey_no";
  sNo: string;
  isPromulgation: boolean;
  blockNo?: string;
  reSurveyNo?: string;
  integrated712?: string;
}

export interface SlabEntry {
  sNo: string;
  area: AreaInput;
  integrated712?: string;
}

export interface YearSlab {
  id: string;
  startYear: number;
  endYear: number;
  sNo: string;
  integrated712?: string;
  paiky: boolean;
  paikyCount: number;
  paikyEntries: SlabEntry[];
  ekatrikaran: boolean;
  ekatrikaranCount: number;
  ekatrikaranEntries: SlabEntry[];
}

export interface Farmer {
  id: string;
  name: string;
  area: AreaInput;
}

export interface Panipatrak {
  slabId: string;
  sNo: string;
  year: number;
  farmers: Farmer[];
}

export interface Nondh {
  id: string;
  number: number;
  sNoType: "s_no" | "block_no" | "re_survey_no";
  affectedSNos: string[];
  nondhDoc?: string;
}

export interface NondhDetail {
  id: string;
  nondhId: string;
  sNo: string;
  type: string;
  subType?: string;
  vigat?: string;
  status: "Valid" | "Invalid" | "Nullified";
  showInOutput: boolean;
  hasDocuments: boolean;
  docUpload?: string;
  ownerRelations: any[];
}

interface LandRecordContextType {
  // Navigation
  currentStep: number;
  setCurrentStep: (step: number) => void;
  canProceedToStep: (step: number) => boolean;

  // Data
  landRecordId: string | null;
  landBasicInfo: LandBasicInfo | null;
  setLandBasicInfo: (info: LandBasicInfo) => void;
  yearSlabs: YearSlab[];
  setYearSlabs: (slabs: YearSlab[]) => void;
  panipatraks: Panipatrak[];
  setPanipatraks: (panipatraks: Panipatrak[]) => void;
  nondhs: Nondh[];
  setNondhs: (nondhs: Nondh[]) => void;
  nondhDetails: NondhDetail[];
  setNondhDetails: (details: NondhDetail[]) => void;

  // Supabase operations
  saveCurrentStep: () => Promise<boolean>;
  loadLandRecord: (id: string) => Promise<boolean>;
  submitAllForms: () => Promise<boolean>;

  // Status
  isLoading: boolean;
  isSaving: boolean;
}

const LandRecordContext = createContext<LandRecordContextType | undefined>(
  undefined
);

export function LandRecordProvider({ children }: { children: ReactNode }) {
  const { toast } = useToast();

  const [currentStep, setCurrentStep] = useState(1);
  const [landRecordId, setLandRecordId] = useState<string | null>(null);
  const [landBasicInfo, setLandBasicInfo] = useState<LandBasicInfo | null>(
    null
  );
  const [yearSlabs, setYearSlabs] = useState<YearSlab[]>([]);
  const [panipatraks, setPanipatraks] = useState<Panipatrak[]>([]);
  const [nondhs, setNondhs] = useState<Nondh[]>([]);
  const [nondhDetails, setNondhDetails] = useState<NondhDetail[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const canProceedToStep = (step: number) => {
    if (step <= currentStep) return true;
    if (step === currentStep + 1) {
      // Basic validation logic
      switch (currentStep) {
        case 1:
          return landBasicInfo !== null;
        case 2:
          return yearSlabs.length > 0;
        case 3:
          return panipatraks.length > 0;
        case 4:
          return nondhs.length > 0;
        case 5:
          return nondhDetails.length > 0;
        default:
          return true;
      }
    }
    return false;
  };

  // Convert context data to database format
  const prepareDataForSave = (): LandRecordData | null => {
    if (!landBasicInfo) return null;

    return {
      id: landRecordId || undefined,
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
      current_step: currentStep,
      status: "draft",
    };
  };

  // Save current step data to Supabase
  const saveCurrentStep = async (): Promise<boolean> => {
    if (!landBasicInfo) {
      toast({ title: "No data to save", variant: "destructive" });
      return false;
    }

    setIsSaving(true);
    try {
      const landRecordData = prepareDataForSave();
      if (!landRecordData) {
        toast({ title: "Invalid data format", variant: "destructive" });
        return false;
      }

      // Save basic land record
      const { data: savedRecord, error: landError } =
        await LandRecordService.saveLandRecord(landRecordData);

      if (landError) {
        console.error("Save error:", landError);
        toast({ title: "Error saving land record", variant: "destructive" });
        return false;
      }

      if (savedRecord && !landRecordId) {
        setLandRecordId(savedRecord.id);
      }

      const recordId = landRecordId || savedRecord?.id;
      if (!recordId) {
        toast({ title: "No record ID available", variant: "destructive" });
        return false;
      }

      // Save step-specific data
      if (currentStep >= 2 && yearSlabs.length > 0) {
        const { error: slabsError } = await LandRecordService.saveYearSlabs(
          recordId,
          yearSlabs
        );
        if (slabsError) {
          console.error("Year slabs save error:", slabsError);
        }
      }

      if (currentStep >= 4 && nondhs.length > 0) {
        const { error: nondhsError } = await LandRecordService.saveNondhs(
          recordId,
          nondhs
        );
        if (nondhsError) {
          console.error("Nondhs save error:", nondhsError);
        }
      }

      toast({ title: `Step ${currentStep} saved successfully` });
      return true;
    } catch (error) {
      console.error("Save error:", error);
      toast({ title: "Error saving data", variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Load land record from Supabase
  const loadLandRecord = async (id: string): Promise<boolean> => {
    setIsLoading(true);
    try {
      const { data, error } = await LandRecordService.getCompleteRecord(id);

      if (error) {
        console.error("Load error:", error);
        toast({ title: "Error loading land record", variant: "destructive" });
        return false;
      }

      if (data && data.landRecord) {
        const record = data.landRecord;

        // Convert database format back to context format
        setLandBasicInfo({
          district: record.district,
          taluka: record.taluka,
          village: record.village,
          area: { value: record.area_value, unit: record.area_unit },
          sNoType: record.s_no_type,
          sNo: record.s_no,
          isPromulgation: record.is_promulgation,
          blockNo: record.block_no,
          reSurveyNo: record.re_survey_no,
          integrated712: record.integrated_712,
        });

        setLandRecordId(record.id);
        setCurrentStep(record.current_step || 1);

        // Load related data
        if (data.yearSlabs) {
          // Convert year slabs format if needed
          setYearSlabs(data.yearSlabs);
        }

        if (data.nondhs) {
          // Convert nondhs format if needed
          setNondhs(data.nondhs);
        }

        toast({ title: "Land record loaded successfully" });
        return true;
      }

      return false;
    } catch (error) {
      console.error("Load error:", error);
      toast({ title: "Error loading data", variant: "destructive" });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Submit all forms (mark as completed)
  const submitAllForms = async (): Promise<boolean> => {
    if (!landRecordId || !landBasicInfo) {
      toast({ title: "No data to submit", variant: "destructive" });
      return false;
    }

    setIsSaving(true);
    try {
      const landRecordData = {
        ...prepareDataForSave()!,
        id: landRecordId,
        status: "submitted",
        current_step: 6,
      };

      const { error } = await LandRecordService.saveLandRecord(landRecordData);

      if (error) {
        console.error("Submit error:", error);
        toast({ title: "Error submitting forms", variant: "destructive" });
        return false;
      }

      toast({ title: "All forms submitted successfully!", variant: "default" });
      return true;
    } catch (error) {
      console.error("Submit error:", error);
      toast({ title: "Error submitting data", variant: "destructive" });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  // Auto-save on step change
  useEffect(() => {
    if (landBasicInfo && landRecordId) {
      saveCurrentStep();
    }
  }, [currentStep]);

  const value = {
    currentStep,
    setCurrentStep,
    canProceedToStep,
    landRecordId,
    landBasicInfo,
    setLandBasicInfo,
    yearSlabs,
    setYearSlabs,
    panipatraks,
    setPanipatraks,
    nondhs,
    setNondhs,
    nondhDetails,
    setNondhDetails,
    saveCurrentStep,
    loadLandRecord,
    submitAllForms,
    isLoading,
    isSaving,
  };

  return (
    <LandRecordContext.Provider value={value}>
      {children}
    </LandRecordContext.Provider>
  );
}

export function useLandRecord() {
  const context = useContext(LandRecordContext);
  if (context === undefined) {
    throw new Error("useLandRecord must be used within a LandRecordProvider");
  }
  return context;
}

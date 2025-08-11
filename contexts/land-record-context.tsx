"use client"
import { useEffect } from "react"
import { LandRecordService } from "@/lib/supabase"
import { createContext, useContext, useState, useCallback, type ReactNode } from "react"

export interface AreaInput {
  value: number
  unit: "acre" | "guntha" | "sq_m"
}

export interface LandBasicInfo {
  district: string
  taluka: string
  village: string
  area: AreaInput
  sNoType: "s_no" | "block_no" | "re_survey_no"
  sNo: string
  isPromulgation: boolean
  blockNo: string
  reSurveyNo: string
  integrated712: string
  integrated712FileName: string
}

export interface SlabEntry {
  sNo: string
  sNoType: "s_no" | "block_no" | "re_survey_no"
  area: { value: number; unit: "acre" | "guntha" | "sq_m" }
  integrated712?: string
}

export interface YearSlab {
  id: string
  startYear: number
  endYear: number
  sNo: string
  sNoType: "s_no" | "block_no" | "re_survey_no"
  area: { value: number; unit: "acre" | "guntha" | "sq_m" }
  integrated712?: string
  paiky: boolean
  paikyCount: number
  paikyEntries: SlabEntry[]
  ekatrikaran: boolean
  ekatrikaranCount: number
  ekatrikaranEntries: SlabEntry[]
}

export interface Farmer {
  id: string
  name: string
  area: AreaInput
}

export interface Panipatrak {
  slabId: string
  sNo: string
  year: number
  farmers: Farmer[]
}

export interface Nondh {
  id: string
  number: string
  sNoType: "s_no" | "block_no" | "re_survey_no"
  affectedSNos: string[]
  nondhDoc?: string
  nondhDocFileName?: string
}

export interface NondhDetail {
  id: string
  nondhId: string
  sNo: string
  type: string
  reason?: string
  vigat?: string
  status: "valid" | "invalid" | "nullified"
  invalidReason?: string
  oldOwner?: string
  showInOutput: boolean
  hasDocuments: boolean
  docUpload?: string
  date?: string
  hukamStatus?: "valid" | "invalid" | "nullified";
  hukamInvalidReason?: string;
  affectedNondhNo?: string;
  ownerRelations: Array<{
    id: string
    ownerName: string
    sNo: string
    area: { value: number; unit: AreaUnit };
    tenure: string
    hukamType?: string
    hukamDate?: string
    restrainingOrder?: 'yes' | 'no'
    isValid: boolean
  }>
  dbId?: string
}

export interface LocalFormData {
  [key: number]: {
    landBasicInfo?: LandBasicInfo
    yearSlabs?: YearSlab[]
    panipatraks?: Panipatrak[]
    nondhs?: Nondh[]
    nondhDetails?: NondhDetail[]
  }
}

interface LandRecordContextType {
  currentStep: number
  mode: 'add' | 'view' | 'edit'
  recordId?: string
  setCurrentStep: (step: number) => void
  canProceedToStep: (step: number) => boolean
  landBasicInfo: LandBasicInfo | null
  setLandBasicInfo: (info: LandBasicInfo) => void
  yearSlabs: YearSlab[]
  setYearSlabs: (slabs: YearSlab[]) => void
  panipatraks: Panipatrak[]
  setPanipatraks: (panipatraks: Panipatrak[]) => void
  nondhs: Nondh[]
  setNondhs: (nondhs: Nondh[]) => void
  nondhDetails: NondhDetail[]
  setNondhDetails: (details: NondhDetail[]) => void
  hasUnsavedChanges: Record<number, boolean>
  setHasUnsavedChanges: (step: number, value: boolean) => void
  resetUnsavedChanges: () => void
  formData: LocalFormData
  setFormData: (data: LocalFormData | ((prev: LocalFormData) => LocalFormData)) => void
  updateFormData: (step: number, data: Partial<LocalFormData[number]>) => void
}

const LandRecordContext = createContext<LandRecordContextType | undefined>(undefined)

export function LandRecordProvider({ 
  children,
  mode = 'add',
  recordId
}: { 
  children: ReactNode;
  mode?: 'add' | 'view' | 'edit';
  recordId?: string;
}) {
  const [isLoading, setIsLoading] = useState(mode !== 'add');
  
  // Add useEffect to load data if in view/edit mode
  useEffect(() => {
    if (mode !== 'add' && recordId) {
      const loadData = async () => {
        setIsLoading(true);
        try {
          const { data, error } = await LandRecordService.getCompleteRecord(recordId);
          if (error) throw error;
          // Set the form data with the loaded data
          // You'll need to transform the data to match your form structure
        } catch (error) {
          console.error('Error loading record:', error);
        } finally {
          setIsLoading(false);
        }
      };
      loadData();
    }
  }, [mode, recordId]);
  const [currentStep, setCurrentStep] = useState(1)
  const [landBasicInfo, setLandBasicInfo] = useState<LandBasicInfo | null>(null)
  const [yearSlabs, setYearSlabs] = useState<YearSlab[]>([])
  const [panipatraks, setPanipatraks] = useState<Panipatrak[]>([])
  const [nondhs, setNondhs] = useState<Nondh[]>([])
  const [nondhDetails, setNondhDetails] = useState<NondhDetail[]>([])
  const [formData, setFormDataState] = useState<LocalFormData>({})
  const [hasUnsavedChanges, setRawHasUnsavedChanges] = useState<Record<number, boolean>>({
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false
  })

  const setHasUnsavedChanges = useCallback((step: number, value: boolean) => {
    setRawHasUnsavedChanges(prev => {
      // Only update if the value has actually changed
      if (prev[step] !== value) {
        return {
          ...prev,
          [step]: value
        }
      }
      return prev
    })
  }, [])

  const setFormData = useCallback((
    data: LocalFormData | ((prev: LocalFormData) => LocalFormData)
  ) => {
    if (typeof data === 'function') {
      setFormDataState(data)
    } else {
      setFormDataState(data)
    }
  }, [])

  const updateFormData = useCallback((step: number, data: Partial<LocalFormData[number]>) => {
  setFormDataState(prev => {
    const prevStepData = prev[step] || {};
    const newStepData = {
      ...prevStepData,
      ...data
    };
    
    // Only proceed if there are actual changes
    const hasChanged = Object.keys(data).some(key => {
      return JSON.stringify(prevStepData[key]) !== JSON.stringify(data[key]);
    });
    
    if (hasChanged) {
      setHasUnsavedChanges(step, true);
    }
    
    return {
      ...prev,
      [step]: newStepData
    };
  });
}, [setHasUnsavedChanges]);

  const resetUnsavedChanges = useCallback(() => {
    setRawHasUnsavedChanges({
      1: false,
      2: false,
      3: false,
      4: false,
      5: false,
      6: false
    })
  }, [])

  const canProceedToStep = useCallback((step: number) => {
    if (step <= currentStep) return true
    if (step === 2 && formData[1]?.landBasicInfo) return true
    if (step === 3 && formData[2]?.yearSlabs?.length) return true
    if (step === 4 && formData[3]?.panipatraks?.length) return true
    if (step === 5 && formData[4]?.nondhs?.length) return true
    if (step === 6 && formData[5]?.nondhDetails?.length) return true
    return false
  }, [currentStep, formData])

  return (
    <LandRecordContext.Provider
      value={{
        currentStep,
        mode,
        recordId,
        setCurrentStep,
        canProceedToStep,
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
        formData,
        setFormData,
        updateFormData,
        hasUnsavedChanges,
        setHasUnsavedChanges,
        resetUnsavedChanges
      }}
    >
      {children}
    </LandRecordContext.Provider>
  )
}

export function useLandRecord() {
  const context = useContext(LandRecordContext)
  if (context === undefined) {
    throw new Error("useLandRecord must be used within a LandRecordProvider")
  }
  return context
}
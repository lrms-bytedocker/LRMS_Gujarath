"use client"

import { createContext, useContext, useState, type ReactNode } from "react"

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
  blockNo?: string
  reSurveyNo?: string
  integrated712?: string
}

export interface SlabEntry {
  sNo: string;
sNoType: "s_no" | "block_no" | "re_survey_no";
area: { value: number; unit: "acre" | "guntha" | "sq_m" };
integrated712?: string;

}

export interface YearSlab {
  id: string;
  startYear: number;
  endYear: number;
  sNo: string;
  sNoType: "s_no" | "block_no" | "re_survey_no";
  area: { value: number; unit: "acre" | "guntha" | "sq_m" };
  integrated712?: string;
  paiky: boolean;
  paikyCount: number;
  paikyEntries: SlabEntry[];
  ekatrikaran: boolean;
  ekatrikaranCount: number;
  ekatrikaranEntries: SlabEntry[];
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
  number: number
  sNoType: "s_no" | "block_no" | "re_survey_no"
  affectedSNos: string[]
  nondhDoc?: string
}

export interface NondhDetail {
  id: string
  nondhId: string
  sNo: string
  type: string
  subType?: string
  vigat?: string
  status: "Pramanik" | "Radd" | "na_manjoor" // Updated status values
  raddReason?: string // New field for Radd status
  oldOwner?: string // New field for Varsai type
  showInOutput: boolean
  hasDocuments: boolean
  docUpload?: string
  ownerRelations: Array<{
    id: string
    ownerName: string
    sNo: string
    area: {
      value: number
      unit: 'guntha' | 'sq_m'
    }
    tenure: string
    hukamType?: string // For Hukam type
    hukamDate?: string // Moved from main interface to ownerRelations
    restrainingOrder?: 'yes' | 'no' // For Hukam type
    isValid: boolean // New field for validity tracking
  }>
  dbId?: string // For existing records
}

interface LandRecordContextType {
  currentStep: number
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
}

const LandRecordContext = createContext<LandRecordContextType | undefined>(undefined)

export function LandRecordProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1)
  const [landBasicInfo, setLandBasicInfo] = useState<LandBasicInfo | null>(null)
  const [yearSlabs, setYearSlabs] = useState<YearSlab[]>([])
  const [panipatraks, setPanipatraks] = useState<Panipatrak[]>([])
  const [nondhs, setNondhs] = useState<Nondh[]>([])
  const [nondhDetails, setNondhDetails] = useState<NondhDetail[]>([])

  const canProceedToStep = (step: number) => {
    if (step <= currentStep) return true
    if (step === 2 && landBasicInfo) return true
    if (step === 3 && yearSlabs.length > 0) return true
    if (step === 4 && panipatraks.length > 0) return true
    if (step === 5 && nondhs.length > 0) return true
    if (step === 6 && nondhDetails.length > 0) return true
    return false
  }

  return (
    <LandRecordContext.Provider
      value={{
        currentStep,
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

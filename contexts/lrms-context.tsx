"use client"

import type React from "react"
import { createContext, useContext, useReducer, type ReactNode } from "react"

// Types
export interface Land {
  id: string
  district: string
  taluka: string
  village: string
  surveyNumber: string
  surveyNumberType: "Survey Number" | "Block Number" | "Re-Survey Number"
  area: number
  areaUnit: "acre" | "sqm"
  areaDisplay: string
  document?: File
  createdAt: Date
}

export interface Slab {
  id: string
  landId: string
  startYear: number
  endYear: number
  document?: File
  paiky: boolean
  consolidation: boolean
  paikyEntries?: PaikyEntry[]
  consolidationEntries?: ConsolidationEntry[]
}

export interface PaikyEntry {
  id: string
  surveyNumber: string
  area: number
  areaUnit: "acre" | "sqm"
  document?: File
}

export interface ConsolidationEntry {
  id: string
  surveyNumber: string
  area: number
  areaUnit: "acre" | "sqm"
  document?: File
}

export interface Farmer {
  id: string
  slabId: string
  surveyNumber: string
  name: string
  area: number
  areaUnit: "acre" | "sqm"
}

// Add more comprehensive types
export interface Owner {
  id: string
  name: string
  surveyNumber: string
  area: number
  areaUnit: "acre" | "sqm"
  tenureType: string
}

export interface PassbookEntry {
  id: string
  year: number
  ownerName: string
  ownedArea: number
  areaUnit: "acre" | "sqm"
  surveyNumber: string
  landNoticeNumber: string
}

// Update LandNotice interface with more fields
export interface LandNotice {
  id: string
  noticeNumber: string
  surveyNumbers: string[]
  surveyNumberType: "Survey Number" | "Block Number" | "Re-Survey Number"
  noticeType:
    | "Possessor"
    | "Consolidation"
    | "Inheritance"
    | "Tenancy"
    | "Agricultural Rights"
    | "Sales Deed"
    | "Opposite Sales Deed"
    | "Order"
    | "Debar"
    | "Transfer"
    | "Other"
  subtype: string
  description: string
  status: "Valid" | "Invalid" | "Nullified"
  displayInOutput: boolean
  documentsAvailable: boolean
  documents?: File[]
  owners?: Owner[]
  createdAt: Date
}

// Update LRMSState interface
interface LRMSState {
  lands: Land[]
  slabs: Slab[]
  farmers: Farmer[]
  landNotices: LandNotice[]
  passbookEntries: PassbookEntry[]
  selectedLand: Land | null
}

// Create comprehensive dummy data
const dummyLands: Land[] = [
  {
    id: "1",
    district: "Pune",
    taluka: "Pune City",
    village: "Kothrud",
    surveyNumber: "123/A",
    surveyNumberType: "Survey Number",
    area: 2.5,
    areaUnit: "acre",
    areaDisplay: "2 Acre 20 Guntha (10,117.50 Sq.m)",
    createdAt: new Date("2023-01-15"),
  },
  {
    id: "2",
    district: "Pune",
    taluka: "Haveli",
    village: "Pirangut",
    surveyNumber: "456/B",
    surveyNumberType: "Survey Number",
    area: 1.75,
    areaUnit: "acre",
    areaDisplay: "1 Acre 30 Guntha (7,082.25 Sq.m)",
    createdAt: new Date("2023-02-20"),
  },
  {
    id: "3",
    district: "Mumbai",
    taluka: "Mumbai City",
    village: "Andheri",
    surveyNumber: "789/C",
    surveyNumberType: "Block Number",
    area: 5000,
    areaUnit: "sqm",
    areaDisplay: "5000 Sq.m (1.2355 Acre)",
    createdAt: new Date("2023-03-10"),
  },
  {
    id: "4",
    district: "Nashik",
    taluka: "Nashik",
    village: "Panchavati",
    surveyNumber: "234/D",
    surveyNumberType: "Re-Survey Number",
    area: 3.25,
    areaUnit: "acre",
    areaDisplay: "3 Acre 10 Guntha (13,152.75 Sq.m)",
    createdAt: new Date("2023-04-05"),
  },
  {
    id: "5",
    district: "Aurangabad",
    taluka: "Aurangabad",
    village: "Cidco",
    surveyNumber: "567/E",
    surveyNumberType: "Survey Number",
    area: 4.0,
    areaUnit: "acre",
    areaDisplay: "4 Acre 0 Guntha (16,188.00 Sq.m)",
    createdAt: new Date("2023-05-12"),
  },
]

const dummySlabs: Slab[] = [
  {
    id: "1",
    landId: "1",
    startYear: 2020,
    endYear: 2024,
    paiky: true,
    consolidation: false,
    paikyEntries: [
      { id: "p1", surveyNumber: "123/A1", area: 0.5, areaUnit: "acre" },
      { id: "p2", surveyNumber: "123/A2", area: 0.75, areaUnit: "acre" },
    ],
  },
  {
    id: "2",
    landId: "1",
    startYear: 2025,
    endYear: 2029,
    paiky: false,
    consolidation: true,
    consolidationEntries: [{ id: "c1", surveyNumber: "123/B", area: 1.0, areaUnit: "acre" }],
  },
  {
    id: "3",
    landId: "2",
    startYear: 2021,
    endYear: 2025,
    paiky: false,
    consolidation: false,
  },
  {
    id: "4",
    landId: "3",
    startYear: 2022,
    endYear: 2026,
    paiky: true,
    consolidation: true,
    paikyEntries: [{ id: "p3", surveyNumber: "789/C1", area: 2000, areaUnit: "sqm" }],
    consolidationEntries: [{ id: "c2", surveyNumber: "789/C2", area: 1500, areaUnit: "sqm" }],
  },
]

const dummyFarmers: Farmer[] = [
  { id: "1", slabId: "1", surveyNumber: "123/A", name: "Ramesh Patil", area: 1.25, areaUnit: "acre" },
  { id: "2", slabId: "1", surveyNumber: "123/A", name: "Suresh Kumar", area: 1.25, areaUnit: "acre" },
  { id: "3", slabId: "2", surveyNumber: "123/A", name: "Ganesh Sharma", area: 2.5, areaUnit: "acre" },
  { id: "4", slabId: "3", surveyNumber: "456/B", name: "Mahesh Desai", area: 0.75, areaUnit: "acre" },
  { id: "5", slabId: "3", surveyNumber: "456/B", name: "Rajesh Joshi", area: 1.0, areaUnit: "acre" },
  { id: "6", slabId: "4", surveyNumber: "789/C", name: "Prakash Yadav", area: 3000, areaUnit: "sqm" },
  { id: "7", slabId: "4", surveyNumber: "789/C", name: "Dinesh Gupta", area: 2000, areaUnit: "sqm" },
]

const dummyLandNotices: LandNotice[] = [
  {
    id: "1",
    noticeNumber: "LN/2024/001",
    surveyNumbers: ["123/A", "456/B"],
    surveyNumberType: "Survey Number",
    noticeType: "Possessor",
    subtype: "New Ownership",
    description: "Transfer of ownership from father to son",
    status: "Valid",
    displayInOutput: true,
    documentsAvailable: true,
    owners: [
      { id: "o1", name: "Ramesh Patil", surveyNumber: "123/A", area: 1.25, areaUnit: "acre", tenureType: "New" },
      { id: "o2", name: "Suresh Patil", surveyNumber: "123/A", area: 1.25, areaUnit: "acre", tenureType: "Old" },
    ],
    createdAt: new Date("2024-01-15"),
  },
  {
    id: "2",
    noticeNumber: "LN/2024/002",
    surveyNumbers: ["789/C"],
    surveyNumberType: "Block Number",
    noticeType: "Sales Deed",
    subtype: "Agricultural Sale",
    description: "Sale of agricultural land to new buyer",
    status: "Valid",
    displayInOutput: true,
    documentsAvailable: true,
    owners: [
      {
        id: "o3",
        name: "Prakash Yadav",
        surveyNumber: "789/C",
        area: 2500,
        areaUnit: "sqm",
        tenureType: "Agricultural",
      },
    ],
    createdAt: new Date("2024-02-20"),
  },
  {
    id: "3",
    noticeNumber: "LN/2024/003",
    surveyNumbers: ["234/D"],
    surveyNumberType: "Re-Survey Number",
    noticeType: "Inheritance",
    subtype: "Family Inheritance",
    description: "Land inherited by multiple heirs",
    status: "Nullified",
    displayInOutput: false,
    documentsAvailable: false,
    createdAt: new Date("2024-03-10"),
  },
]

const dummyPassbookEntries: PassbookEntry[] = [
  {
    id: "1",
    year: 2023,
    ownerName: "Ramesh Patil",
    ownedArea: 1.25,
    areaUnit: "acre",
    surveyNumber: "123/A",
    landNoticeNumber: "LN/2024/001",
  },
  {
    id: "2",
    year: 2023,
    ownerName: "Suresh Kumar",
    ownedArea: 1.25,
    areaUnit: "acre",
    surveyNumber: "123/A",
    landNoticeNumber: "LN/2024/001",
  },
  {
    id: "3",
    year: 2024,
    ownerName: "Prakash Yadav",
    ownedArea: 3000,
    areaUnit: "sqm",
    surveyNumber: "789/C",
    landNoticeNumber: "LN/2024/002",
  },
  {
    id: "4",
    year: 2024,
    ownerName: "Mahesh Desai",
    ownedArea: 0.75,
    areaUnit: "acre",
    surveyNumber: "456/B",
    landNoticeNumber: "LN/2024/001",
  },
  {
    id: "5",
    year: 2024,
    ownerName: "Ganesh Sharma",
    ownedArea: 2.5,
    areaUnit: "acre",
    surveyNumber: "123/A",
    landNoticeNumber: "LN/2024/001",
  },
]

// Update initial state
const initialState: LRMSState = {
  lands: dummyLands,
  slabs: dummySlabs,
  farmers: dummyFarmers,
  landNotices: dummyLandNotices,
  passbookEntries: dummyPassbookEntries,
  selectedLand: null,
}

// Add new action types
type LRMSAction =
  | { type: "ADD_LAND"; payload: Land }
  | { type: "ADD_SLAB"; payload: Slab }
  | { type: "ADD_FARMER"; payload: Farmer }
  | { type: "ADD_LAND_NOTICE"; payload: LandNotice }
  | { type: "ADD_PASSBOOK_ENTRY"; payload: PassbookEntry }
  | { type: "SELECT_LAND"; payload: Land | null }
  | { type: "UPDATE_LAND"; payload: { id: string; updates: Partial<Land> } }
  | { type: "UPDATE_SLAB"; payload: { id: string; updates: Partial<Slab> } }
  | { type: "UPDATE_FARMER"; payload: { id: string; updates: Partial<Farmer> } }
  | { type: "DELETE_FARMER"; payload: string }

// Update reducer with new cases
function lrmsReducer(state: LRMSState, action: LRMSAction): LRMSState {
  switch (action.type) {
    case "ADD_LAND":
      return { ...state, lands: [...state.lands, action.payload] }
    case "ADD_SLAB":
      return { ...state, slabs: [...state.slabs, action.payload] }
    case "ADD_FARMER":
      return { ...state, farmers: [...state.farmers, action.payload] }
    case "ADD_LAND_NOTICE":
      return { ...state, landNotices: [...state.landNotices, action.payload] }
    case "ADD_PASSBOOK_ENTRY":
      return { ...state, passbookEntries: [...state.passbookEntries, action.payload] }
    case "SELECT_LAND":
      return { ...state, selectedLand: action.payload }
    case "UPDATE_LAND":
      return {
        ...state,
        lands: state.lands.map((land) =>
          land.id === action.payload.id ? { ...land, ...action.payload.updates } : land,
        ),
      }
    case "UPDATE_SLAB":
      return {
        ...state,
        slabs: state.slabs.map((slab) =>
          slab.id === action.payload.id ? { ...slab, ...action.payload.updates } : slab,
        ),
      }
    case "UPDATE_FARMER":
      return {
        ...state,
        farmers: state.farmers.map((farmer) =>
          farmer.id === action.payload.id ? { ...farmer, ...action.payload.updates } : farmer,
        ),
      }
    case "DELETE_FARMER":
      return {
        ...state,
        farmers: state.farmers.filter((farmer) => farmer.id !== action.payload),
      }
    default:
      return state
  }
}

const LRMSContext = createContext<{
  state: LRMSState
  dispatch: React.Dispatch<LRMSAction>
} | null>(null)

export function LRMSProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(lrmsReducer, initialState)

  return <LRMSContext.Provider value={{ state, dispatch }}>{children}</LRMSContext.Provider>
}

export function useLRMS() {
  const context = useContext(LRMSContext)
  if (!context) {
    throw new Error("useLRMS must be used within LRMSProvider")
  }
  return context
}

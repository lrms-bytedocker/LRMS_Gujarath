"use client";

import { useState, useEffect, useMemo } from "react";
import { ChevronUp, ChevronDown  } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
  Upload
} from "lucide-react";
import {
  useLandRecord,
  YearSlab,
  SlabEntry,
} from "@/contexts/land-record-context";
import { useToast } from "@/hooks/use-toast";
import { convertToSquareMeters, convertFromSquareMeters } from "@/lib/supabase";
import { Loader2 } from "lucide-react"; // For loading spinner
import { uploadFile } from "@/lib/supabase"; // For file uploads
import { LandRecordService } from "@/lib/supabase"; // For saving data
import { useStepFormData } from "@/hooks/use-step-form-data";

// ---------- UI-only Types ----------
type SNoTypeUI = "survey_no" | "block_no" | "re_survey_no";
type AreaTypeUI = "acre_guntha" | "sq_m";

interface AreaUI {
  areaType: AreaTypeUI;
  acre?: number;
  guntha?: number;
  sq_m?: number;
}
interface SlabEntryUI {
  sNoTypeUI: SNoTypeUI;
  sNo: string;
  areaUI: AreaUI;
  integrated712?: string;
}
interface YearSlabUI {
  id: string;
  startYear: number;
  endYear: number;
  sNoTypeUI: SNoTypeUI;
  sNo: string;
  areaUI: AreaUI;
  integrated712?: string;
  paiky: boolean;
  paikyCount: number;
  paikyEntries: SlabEntryUI[];
  ekatrikaran: boolean;
  ekatrikaranCount: number;
  ekatrikaranEntries: SlabEntryUI[];
  collapsed: boolean;
}

// ---------- End Types ----------

const SNO_TYPES = [
  { key: "survey_no", label: "Survey No." },
  { key: "block_no", label: "Block No." },
  { key: "re_survey_no", label: "Re-Survey No." },
] as const;
const AREA_TYPES = [
  { key: "acre_guntha", label: "Acre - Guntha" },
  { key: "sq_m", label: "Sq. Mtr." },
] as const;

// ---------- TYPE MAPPINGS ----------

// Explicit mapping from UI to context type
function mapSNoTypeUIToContext(
  s: SNoTypeUI
): "s_no" | "block_no" | "re_survey_no" {
  switch (s) {
    case "survey_no":
      return "s_no";
    case "block_no":
      return "block_no";
    case "re_survey_no":
      return "re_survey_no";
  }
}

// Explicit mapping from context to UI type
function mapSNoTypeContextToUI(s: "s_no" | "block_no" | "re_survey_no"): SNoTypeUI {
  switch (s) {
    case "s_no":
      return "survey_no";
    case "block_no":
      return "block_no";
    case "re_survey_no":
      return "re_survey_no";
  }
}

// Helper to determine which field to use from landBasicInfo
function getAutoPopulatedSNoData(landBasicInfo: any, selectedType: SNoTypeUI): string {
  if (!landBasicInfo) return "";
  
  switch(selectedType) {
    case "survey_no":
      // Only return sNo for survey_no, no fallback to blockNo
      return landBasicInfo.sNo || "";
    case "block_no":
      // Only return blockNo for block_no
      return landBasicInfo.blockNo || "";
    case "re_survey_no":
      // Only return reSurveyNo for re_survey_no
      return landBasicInfo.reSurveyNo || "";
    default:
      return "";
  }
}
// Convert from UI-area to context-area
function fromAreaUI(areaUI: AreaUI): { value: number; unit: "sq_m" | "acre" | "guntha" } {
  if (areaUI.areaType === "sq_m") {
    return {
      value: areaUI.sq_m || 0,
      unit: "sq_m"
    };
  } else {
    // For acre_guntha, we need to store them separately
    if (areaUI.acre && areaUI.acre > 0) {
      return {
        value: areaUI.acre,
        unit: "acre"
      };
    } else if (areaUI.guntha && areaUI.guntha > 0) {
      return {
        value: areaUI.guntha,
        unit: "guntha"
      };
    }
    return { value: 0, unit: "sq_m" }; // Default fallback
  }
}

function toAreaUI(area?: { value: number; unit: "sq_m" | "acre" | "guntha" }): AreaUI {
  if (!area) {
    return { areaType: "acre_guntha", acre: 0, guntha: 0 };
  }

  if (area.unit === "sq_m") {
    return {
      areaType: "sq_m",
      sq_m: area.value,
      acre: convertFromSquareMeters(area.value, "acre"),
      guntha: convertFromSquareMeters(area.value, "guntha") % 40
    };
  } else if (area.unit === "acre") {
    return {
      areaType: "acre_guntha",
      acre: area.value,
      guntha: 0,
      sq_m: convertToSquareMeters(area.value, "acre")
    };
  } else { // guntha
    return {
      areaType: "acre_guntha",
      acre: 0,
      guntha: area.value,
      sq_m: convertToSquareMeters(area.value, "guntha")
    };
  }
}
function fromSlabEntryUI(e: SlabEntryUI): SlabEntry {
  return {
    sNo: e.sNo,
    sNoType: mapSNoTypeUIToContext(e.sNoTypeUI),
    area: fromAreaUI(e.areaUI),
    integrated712: e.integrated712,
  };
}
function toSlabEntryUI(e: SlabEntry): SlabEntryUI {
  return {
    sNo: e.sNo,
    sNoTypeUI: mapSNoTypeContextToUI(e.sNoType),
    areaUI: toAreaUI(e.area),
    integrated712: e.integrated712,
  };
}
function fromYearSlabUI(s: YearSlabUI): YearSlab {
  return {
    ...s,
    sNo: s.sNo,
    sNoType: mapSNoTypeUIToContext(s.sNoTypeUI),
    area: fromAreaUI(s.areaUI),
    paikyEntries: (s.paikyEntries || []).map(fromSlabEntryUI),
    ekatrikaranEntries: (s.ekatrikaranEntries || []).map(fromSlabEntryUI),
  };
}
function toYearSlabUI(s: YearSlab): YearSlabUI {
  return {
    ...s,
    sNoTypeUI: mapSNoTypeContextToUI(s.sNoType),
    areaUI: toAreaUI(s.area),
    paikyEntries: (s.paikyEntries ?? []).map(toSlabEntryUI),
    ekatrikaranEntries: (s.ekatrikaranEntries ?? []).map(toSlabEntryUI),
  };
}

// ---------- MAIN COMPONENT ----------
export default function YearSlabs() {
  const { 
    yearSlabs, 
    setYearSlabs, 
    setCurrentStep, 
    landBasicInfo, 
    currentStep 
  } = useLandRecord();
  const { toast } = useToast();
  
  // Add this hook
  const { 
    getStepData, 
    updateStepData, 
    markAsSaved,
    hasUnsavedChanges
  } = useStepFormData(2);
  const [loading, setLoading] = useState(false);
  const [currentPaikyPage, setCurrentPaikyPage] = useState<Record<string, number>>({});
const PAIKY_PER_PAGE = 5;
  const [slabs, setSlabs] = useState<YearSlabUI[]>([]);
   const [uploadedFileName, setUploadedFileName] = useState<string>("");
   const [currentEkatrikaranPage, setCurrentEkatrikaranPage] = useState<Record<string, number>>({});
const EKATRIKARAN_PER_PAGE = 5;
const [activeTab, setActiveTab] = useState<Record<string, 'main' | 'paiky' | 'ekatrikaran'>>({});
const [slabUploadedFileNames, setSlabUploadedFileNames] = useState<Record<string, string>>({});
const [entryUploadedFileNames, setEntryUploadedFileNames] = useState<Record<string, string>>({});

  const handleEntryFileUpload = async (
  file: File,
  slabId: string,
  action: 'create' | 'update' = 'create',
  entryIndex?: number,
  entryType?: 'paiky' | 'ekatrikaran'
) => {
  if (!file) return;
  
  try {
    setLoading(true);
    
    // Generate a unique filename with timestamp
    const timestamp = Date.now();
    const sanitizedFileName = file.name
      .replace(/[^a-zA-Z0-9._-]/g, '_')
      .replace(/_{2,}/g, '_')
      .replace(/^_|_$/g, '');
    
    // Always upload to land-documents bucket
    const path = `land-documents/${timestamp}_${sanitizedFileName}`;
    
    // Upload file to specified bucket
    const url = await uploadFile(file, path);
    
    if (!url) throw new Error("Upload failed");
    
    // Update state based on context
    if (entryIndex !== undefined && entryType) {
      updateSlabEntry(slabId, entryType, entryIndex, {
        integrated712: url
      });
      // Track filename for entries
      const entryKey = `${slabId}_${entryType}_${entryIndex}`;
      setEntryUploadedFileNames(prev => ({
        ...prev,
        [entryKey]: file.name
      }));
    } else {
      updateSlab(slabId, {
        integrated712: url
      });
      // Track filename for main slab
      setSlabUploadedFileNames(prev => ({
        ...prev,
        [slabId]: file.name
      }));
    }
    
    toast({ 
      title: "File uploaded successfully",
      description: "Document saved to land-documents bucket"
    });
    
  } catch (error) {
    console.error('File upload error:', error);
    toast({ 
      title: "Upload failed", 
      description: error.message,
      variant: "destructive" 
    });
  } finally {
    setLoading(false);
  }
}


 // Replace the useEffect with this more robust version
useEffect(() => {
  const loadData = async () => {
    try {
      if (landBasicInfo?.id) {
        const { data: dbSlabs, error } = await LandRecordService.getYearSlabs(landBasicInfo.id);
        
        if (!error && dbSlabs) {
          setSlabs(dbSlabs.map(s => ({
            ...toYearSlabUI(s),
            collapsed: false
          })));
          return;
        }
      }

      // Fallback to empty state - let user enter S.No manually
      setSlabs([{
        id: "1",
        startYear: "",
        endYear: 2004,
        sNoTypeUI: "survey_no",
        sNo: "", // Start with empty field
        areaUI: landBasicInfo?.area ? toAreaUI(landBasicInfo.area) : { 
          areaType: "acre_guntha", 
          acre: 0, 
          guntha: 0 
        },
        integrated712: "",
        paiky: false,
        paikyCount: 0,
        paikyEntries: [],
        ekatrikaran: false,
        ekatrikaranCount: 0,
        ekatrikaranEntries: [],
        collapsed: false
      }]);
    } catch (error) {
      console.error('Error loading slabs:', error);
      // Fallback with error handling
      setSlabs([{
        id: "1",
        startYear: "",
        endYear: 2004,
        sNoTypeUI: "survey_no",
        sNo: "", // Start with empty field
        areaUI: { areaType: "acre_guntha", acre: 0, guntha: 0 },
        integrated712: "",
        paiky: false,
        paikyCount: 0,
        paikyEntries: [],
        ekatrikaran: false,
        ekatrikaranCount: 0,
        ekatrikaranEntries: [],
        collapsed: false
      }]);
    }
  };

  loadData();
}, [landBasicInfo]);

useEffect(() => {
    if (slabs.length > 0) {
      // Only update if there's actual content
      const hasContent = slabs.some(slab => 
  (slab.sNo && slab.sNo.trim() !== "") || 
  slab.startYear !== "" ||
  slab.paikyEntries.length > 0 ||
  slab.ekatrikaranEntries.length > 0
);
      
      if (hasContent || slabs.length > 1) {
        const timeoutId = setTimeout(() => {
          updateStepData({ yearSlabs: slabs.map(fromYearSlabUI) });
        }, 300);
        
        return () => clearTimeout(timeoutId);
      }
    }
  }, [slabs, updateStepData]);

useEffect(() => {
  const handleBeforeUnload = (e: BeforeUnloadEvent) => {
    if (hasUnsavedChanges[currentStep]) {
      e.preventDefault();
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?';
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
  };
}, [hasUnsavedChanges, currentStep]);

  // --- UI rendering helpers ---

const areaFields = ({ area, onChange }: { area?: AreaUI; onChange: (a: AreaUI) => void }) => {
  // Provide a default area object if undefined
  const safeArea = area || { areaType: "acre_guntha", acre: 0, guntha: 0 };
  
  // Use safeArea instead of area everywhere in the component
  const displayValues = (() => {
    if (safeArea.areaType === "sq_m") {
      return {
        sq_m: safeArea.sq_m,
        acre: safeArea.sq_m ? convertFromSquareMeters(safeArea.sq_m, "acre") : undefined,
        guntha: safeArea.sq_m ? convertFromSquareMeters(safeArea.sq_m, "guntha") % 40 : undefined
      };
    } else {
      return {
        sq_m: (safeArea.acre || 0) * 4046.86 + (safeArea.guntha || 0) * 101.17,
        acre: safeArea.acre,
        guntha: safeArea.guntha
      };
    }
  })();

  // Update all references from area to safeArea in the handlers
  const handleSqmChange = (value: string) => {
    if (value === "") {
      onChange({
        ...safeArea,
        areaType: "sq_m",
        sq_m: undefined,
        acre: undefined,
        guntha: undefined
      });
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (area.areaType === "acre_guntha") {
        const totalAcres = convertFromSquareMeters(num, "acre");
        const acres = Math.floor(totalAcres);
        const remainingGuntha = (totalAcres - acres) * 40;
        onChange({
          ...area,
          acre: acres,
          guntha: remainingGuntha,
          sq_m: num
        });
      } else {
        onChange({
          ...area,
          areaType: "sq_m",
          sq_m: num,
          acre: convertFromSquareMeters(num, "acre"),
          guntha: convertFromSquareMeters(num, "guntha") % 40
        });
      }
    }
  };

  const handleAcreChange = (value: string) => {
    if (value === "") {
      onChange({
        ...area,
        areaType: "acre_guntha",
        acre: undefined,
        guntha: area.guntha,
        sq_m: area.guntha ? convertToSquareMeters(area.guntha, "guntha") : undefined
      });
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (area.areaType === "sq_m") {
        const newSqm = convertToSquareMeters(num, "acre") + 
                      (displayValues.guntha ? convertToSquareMeters(displayValues.guntha, "guntha") : 0);
        onChange({
          ...area,
          sq_m: newSqm,
          acre: num,
          guntha: displayValues.guntha
        });
      } else {
        onChange({
          ...area,
          areaType: "acre_guntha",
          acre: num,
          sq_m: convertToSquareMeters(num, "acre") + 
               (area.guntha ? convertToSquareMeters(area.guntha, "guntha") : 0)
        });
      }
    }
  };

  const handleGunthaChange = (value: string) => {
    if (value === "") {
      onChange({
        ...area,
        areaType: "acre_guntha",
        guntha: undefined,
        acre: area.acre,
        sq_m: area.acre ? convertToSquareMeters(area.acre, "acre") : undefined
      });
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (num >= 40) {
        toast({ title: "Guntha must be less than 40" });
        return;
      }
      
      if (area.areaType === "sq_m") {
        const newSqm = (displayValues.acre ? convertToSquareMeters(displayValues.acre, "acre") : 0) + 
                      convertToSquareMeters(num, "guntha");
        onChange({
          ...area,
          sq_m: newSqm,
          acre: displayValues.acre,
          guntha: num
        });
      } else {
        onChange({
          ...area,
          areaType: "acre_guntha",
          guntha: num,
          sq_m: (area.acre ? convertToSquareMeters(area.acre, "acre") : 0) + 
               convertToSquareMeters(num, "guntha")
        });
      }
    }
  };

  const formatValue = (value: number | undefined): string => {
    return value === undefined ? "" : value.toString();
  };

  return (
    <div className="space-y-4">
      {/* Area Type selector commented out */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        {/* Content commented out */}
      </div>

      {safeArea.areaType === "sq_m" ? (
        <div className="space-y-2">
          <Label>Square Meters</Label>
          <Input
            type="number"
            min={0}
            step="0.01"
            value={formatValue(displayValues.sq_m)}
            onChange={(e) => handleSqmChange(e.target.value)}
            placeholder="Enter sq. meters"
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Acres</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={formatValue(displayValues.acre)}
              onChange={(e) => handleAcreChange(e.target.value)}
              placeholder="Enter acres"
            />
          </div>
          <div className="space-y-2">
            <Label>Guntha</Label>
            <Input
              type="number"
              min={0}
              max={39.99}
              step="0.01"
              value={formatValue(displayValues.guntha)}
              onChange={(e) => handleGunthaChange(e.target.value)}
              placeholder="Enter guntha (≤40)"
              onKeyDown={(e) => {
                const target = e.target as HTMLInputElement;
                if (e.key === 'e' || 
                    (e.key === '.' && target.value.includes('.')) ||
                    (parseFloat(target.value + e.key) >= 40)) {
                  e.preventDefault();
                }
              }}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        {safeArea.areaType === "sq_m" ? (
          <>
            <div className="space-y-2">
              <Label>Acres</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={formatValue(displayValues.acre)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter or view acres"
                className="bg-blue-50 border-blue-200"
              />
            </div>
            <div className="space-y-2">
              <Label>Guntha</Label>
              <Input
                type="number"
                min={0}
                max={39.99}
                step="0.01"
                value={formatValue(displayValues.guntha)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter guntha (≤40)"
                className="bg-blue-50 border-blue-200"
                onKeyDown={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (e.key === 'e' || 
                      (e.key === '.' && target.value.includes('.')) ||
                      (parseFloat(target.value + e.key) >= 40)) {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter or view sq. meters"
              className="bg-blue-50 border-blue-200"
            />
          </div>
        )}
      </div>
    </div>
  );
};

const validateYearOrder = (slabs: YearSlabUI[]) => {
  for (let i = 1; i < slabs.length; i++) {
    // Current slab's end year must be ≤ previous slab's start year
    if (slabs[i].endYear > slabs[i-1].startYear) {
      return {
        valid: false,
        message: `Slab ${i+1} (${slabs[i].startYear}-${slabs[i].endYear}) must end before Slab ${i} (${slabs[i-1].startYear}-${slabs[i-1].endYear}) starts`
      };
    }
    
    // Within each slab, start year should be ≥ end year
    if (slabs[i].startYear > slabs[i].endYear) {
      return {
        valid: false,
        message: `Slab ${i+1}: Start year (${slabs[i].startYear}) must be ≥ end year (${slabs[i].endYear})`
      };
    }
  }
  return { valid: true };
};

const updateSlab = (id: string, updates: Partial<YearSlabUI>) => {
  setSlabs(prev => prev.map(slab => {
    if (slab.id !== id) return slab;

    // When S.No type changes, clear the sNo field and let user enter manually
   if (updates.sNoTypeUI && updates.sNoTypeUI !== slab.sNoTypeUI) {
  const autoPopulatedSNo = getAutoPopulatedSNoData(landBasicInfo, updates.sNoTypeUI);
  return {
    ...slab,
    ...updates,
    sNo: autoPopulatedSNo // Auto-populate instead of clearing
  };
}
    
    return { ...slab, ...updates };
  }));
};

const addSlab = () => {
  const defaultArea = landBasicInfo?.area 
    ? toAreaUI(landBasicInfo.area) 
    : { areaType: "acre_guntha", acre: 0, guntha: 0 };

  let startYear, endYear;
  
  if (slabs.length === 0) {
    startYear = "";
    endYear = 2004;
  } else {
    const previousSlab = slabs[slabs.length - 1];
    endYear = previousSlab.startYear;
    startYear = "";
  }

  const newSlab: YearSlabUI = {
    id: Date.now().toString(),
    startYear,
    endYear,
    sNoTypeUI: "survey_no",
    sNo: "", // Start with empty field, let user enter manually
    areaUI: defaultArea,
    integrated712: "",
    paiky: false,
    paikyCount: 0,
    paikyEntries: [],
    ekatrikaran: false,
    ekatrikaranCount: 0,
    ekatrikaranEntries: [],
    collapsed: false,
  };

  setSlabs([...slabs.map(s => ({ ...s, collapsed: true })), newSlab]);
};

  const removeSlab = (id: string) => {

    setSlabs(slabs.filter((slab) => slab.id !== id));
  };

  // "Count" updating helpers
  const updatePaikyCount = (slabId: string, count: number) => {
  setSlabs(prev => prev.map(slab => {
    if (slab.id !== slabId) return slab;
    
    const defaultEntry = {
      sNo: "", // Start with empty field
      sNoTypeUI: "survey_no" as SNoTypeUI,
      areaUI: { areaType: "acre_guntha" as AreaTypeUI, acre: 0, guntha: 0 },
      integrated712: ""
    };

    return {
      ...slab,
      paikyCount: count,
      paiky: slab.paiky,
      paikyEntries: Array.from({ length: count }, (_, i) => {
        return slab.paikyEntries?.[i] || { ...defaultEntry };
      })
    };
  }));
};

const updateEkatrikaranCount = (slabId: string, count: number) => {
  setSlabs(prev => prev.map(slab => {
    if (slab.id !== slabId) return slab;
    
    const defaultEntry = {
      sNo: "", // Start with empty field
      sNoTypeUI: "survey_no" as SNoTypeUI,
      areaUI: { areaType: "acre_guntha" as AreaTypeUI, acre: 0, guntha: 0 },
      integrated712: ""
    };

    return {
      ...slab,
      ekatrikaranCount: count,
      ekatrikaran: slab.ekatrikaran,
      ekatrikaranEntries: Array.from({ length: count }, (_, i) => {
        return slab.ekatrikaranEntries?.[i] || { ...defaultEntry };
      })
    };
  }));
};
  
const updateSlabEntry = (
  slabId: string,
  type: "paiky" | "ekatrikaran",
  index: number,
  updates: Partial<SlabEntryUI>
) => {
  setSlabs(prev => prev.map(slab => {
    if (slab.id !== slabId) return slab;
    
    // Handle S.No type change for entries - clear instead of auto-populate
    if (updates.sNoTypeUI) {
      const entries = type === "paiky" 
        ? slab.paikyEntries || [] 
        : slab.ekatrikaranEntries || [];
      const currentEntry = entries[index] || {};
      
      if (updates.sNoTypeUI !== currentEntry.sNoTypeUI) {
  const autoPopulatedSNo = getAutoPopulatedSNoData(landBasicInfo, updates.sNoTypeUI);
  updates = {
    ...updates,
    sNo: autoPopulatedSNo // Auto-populate instead of clearing
  };
}
    }

    if (type === "paiky") {
      const updatedEntries = [...(slab.paikyEntries || [])];
      updatedEntries[index] = { 
        ...(updatedEntries[index] || {}), 
        ...updates 
      };
      return { ...slab, paikyEntries: updatedEntries };
    } else {
      const updatedEntries = [...(slab.ekatrikaranEntries || [])];
      updatedEntries[index] = { 
        ...(updatedEntries[index] || {}), 
        ...updates 
      };
      return { ...slab, ekatrikaranEntries: updatedEntries };
    }
  }));
};

const handleSaveAndNext = async () => {
  setLoading(true);
  
  try {
    // Validate year ordering
    const { valid, message } = validateYearOrder(slabs);
    if (!valid) {
      toast({ title: "Invalid year sequence", description: message, variant: "destructive" });
      return;
    }

    // Convert to database format - Fixed version
    const dbSlabs = slabs.map(slab => ({
      start_year: slab.startYear,
      end_year: slab.endYear,
      s_no: slab.sNo,
      s_no_type: mapSNoTypeUIToContext(slab.sNoTypeUI),
      area_value: slab.areaUI.areaType === "sq_m" 
        ? slab.areaUI.sq_m || 0
        : convertToSquareMeters(slab.areaUI.acre || 0, "acre") +
          convertToSquareMeters(slab.areaUI.guntha || 0, "guntha"),
      area_unit: "sq_m",
      integrated_712: slab.integrated712,
      paiky: slab.paiky,
      paiky_count: slab.paikyCount,
      ekatrikaran: slab.ekatrikaran,
      ekatrikaran_count: slab.ekatrikaranCount,
      
      // FIXED: Properly structure the entries arrays
      paiky_entries: slab.paikyEntries?.map(entry => ({
        s_no: entry.sNo,
        s_no_type: mapSNoTypeUIToContext(entry.sNoTypeUI),
        area_value: entry.areaUI.areaType === "sq_m"
          ? entry.areaUI.sq_m || 0
          : convertToSquareMeters(entry.areaUI.acre || 0, "acre") +
            convertToSquareMeters(entry.areaUI.guntha || 0, "guntha"),
        area_unit: "sq_m",
        integrated_712: entry.integrated712
      })) || [], // Ensure it's always an array
      
      ekatrikaran_entries: slab.ekatrikaranEntries?.map(entry => ({
        s_no: entry.sNo,
        s_no_type: mapSNoTypeUIToContext(entry.sNoTypeUI),
        area_value: entry.areaUI.areaType === "sq_m"
          ? entry.areaUI.sq_m || 0
          : convertToSquareMeters(entry.areaUI.acre || 0, "acre") +
            convertToSquareMeters(entry.areaUI.guntha || 0, "guntha"),
        area_unit: "sq_m",
        integrated_712: entry.integrated712
      })) || [] // Ensure it's always an array
    }));

    if (!landBasicInfo?.id) {
      toast({ title: "Land record not found", variant: "destructive" });
      return;
    }

    // Save to database
    const { data: savedData, error } = await LandRecordService.saveYearSlabs(
      landBasicInfo.id,
      dbSlabs
    );
    
    if (error) {
      console.error('Save error details:', error);
      throw error;
    }

    // Update context
    const { data: fetchedSlabs } = await LandRecordService.getYearSlabs(landBasicInfo.id);
    if (fetchedSlabs) {
      setYearSlabs(fetchedSlabs);
    }

    setCurrentStep(3);
    toast({ title: "Year slabs saved successfully" });
    
  } catch (error) {
    console.error('Save error:', error);
    toast({ 
      title: "Save failed", 
      description: error?.message || "Unknown error occurred",
      variant: "destructive" 
    });
  } finally {
    setLoading(false);
  }
};

const toggleCollapse = (id: string) => {
  setSlabs(prev => prev.map(slab => 
    slab.id === id ? { ...slab, collapsed: !slab.collapsed } : slab
  ));
};

  // --- Render ---
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Add Year Slabs</CardTitle>
        {landBasicInfo && (
          <div className="text-sm text-muted-foreground">
            Auto-populated from Step 1: {landBasicInfo.district}, {landBasicInfo.taluka}, {landBasicInfo.village}
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-6">
        {slabs.map((slab, slabIndex) => (
  <Card key={slab.id} className="p-4">
    <div className="flex justify-between items-center mb-4">
      <div className="flex items-center space-x-4">
        <h3 className="text-lg font-semibold">Slab {slabIndex + 1}</h3>
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => toggleCollapse(slab.id)}
        >
          {slab.collapsed ? 'Expand' : 'Collapse'}
        </Button>
      </div>
      {slabs.length > 1 && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => removeSlab(slab.id)}
          className="text-red-600"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      )}
    </div>
    {!slab.collapsed && (
      <>
            {/* Start/End year */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Start Year Field */}
<div className="space-y-2">
  <Label>Start Year *</Label>
<Input
  type="number"
  value={slab.startYear === "" ? "" : slab.startYear}
  onChange={(e) => {
    const value = e.target.value;
    if (value === "") {
      updateSlab(slab.id, { startYear: "" });
    } else {
      const newYear = parseInt(value);
      if (!isNaN(newYear)) {
        updateSlab(slab.id, { startYear: newYear });
      }
    }
  }}
  onWheel={(e) => e.currentTarget.blur()}
  max={slab.endYear}
/>
  <p className="text-xs text-muted-foreground">
    Must be ≤ end year ({slab.endYear})
  </p>
</div>

{/* End Year Field */}
<div className="space-y-2">
  <Label>End Year *</Label>
  <Input
    type="number"
    value={slab.endYear}
    onChange={(e) => {
      const newYear = parseInt(e.target.value);
      if (!isNaN(newYear)) {
        updateSlab(slab.id, { endYear: newYear });
      }
    }}
    min={slab.startYear}  // Corrected: end ≥ start
    max={
      slabIndex > 0
        ? slabs[slabIndex - 1].startYear  // Must end before previous slab starts
        : undefined
    }
  />
  <div className="flex flex-col gap-1">
    <p className="text-xs text-muted-foreground">
      Must be ≥ start year ({slab.startYear})
    </p>
    {slabIndex > 0 && (
      <p className="text-xs text-muted-foreground">
        Must end before Slab {slabIndex}'s start ({slabs[slabIndex - 1].startYear})
      </p>
    )}
  </div>
</div>
            </div>
            
            {/* S.No and Area and Document - hide if any sub-slab active */}
            {(!slab.paiky && !slab.ekatrikaran) && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="space-y-2">
                  <Label>S.No Type</Label>
                  <Select
                    value={slab.sNoTypeUI}
                    onValueChange={(value) =>
                      updateSlab(slab.id, { sNoTypeUI: value as SNoTypeUI })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {SNO_TYPES.map((item) => (
                        <SelectItem key={item.key} value={item.key}>
                          {item.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>S.No / Block No / Re-Survey No *</Label>
                  <Input
                    value={slab.sNo}
                    onChange={(e) => updateSlab(slab.id, { sNo: e.target.value })}
                    placeholder="Enter number"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Area Type</Label>
                  <Select
                    value={slab.areaUI.areaType}
                    onValueChange={(val) =>
                      updateSlab(slab.id, {
                        areaUI: { ...slab.areaUI, areaType: val as AreaTypeUI },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {AREA_TYPES.map((a) => (
                        <SelectItem key={a.key} value={a.key}>
                          {a.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 md:col-span-2">
        {areaFields({ 
  area: slab.areaUI, 
  onChange: (areaUI) => updateSlab(slab.id, { areaUI }) 
})}

                </div>
                <div className="space-y-2">
  <Label>7/12 Document</Label>
  <div className="flex items-center gap-4">
    <div className="relative">
      <input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            handleEntryFileUpload(file, slab.id);
            e.target.value = '';
          }
        }}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={loading}
      />
      <Button 
        type="button" 
        variant="outline" 
        disabled={loading}
        className="flex items-center gap-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:opacity-50"
      >
        <Upload className="w-4 h-4" />
        {loading ? "Uploading..." : "Choose File"}
      </Button>
    </div>
    {slabUploadedFileNames[slab.id] && (
      <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
        <span className="text-sm text-green-800 max-w-[200px] truncate" title={slabUploadedFileNames[slab.id]}>
          {slabUploadedFileNames[slab.id]}
        </span>
        <button
          type="button"
          onClick={() => {
            updateSlab(slab.id, { integrated712: "" });
            setSlabUploadedFileNames(prev => {
              const newState = { ...prev };
              delete newState[slab.id];
              return newState;
            });
          }}
          className="text-green-600 hover:text-green-800 text-lg leading-none"
          title="Remove file"
        >
          ×
        </button>
      </div>
    )}
    {slab.integrated712 && (
      <a 
        href={slab.integrated712} 
        target="_blank" 
        rel="noopener noreferrer"
        className="text-sm text-blue-600 hover:underline"
      >
        View Document
      </a>
    )}
  </div>
  <p className="text-xs text-gray-500">
    Supported formats: PDF, JPG, JPEG, PNG (Max 10MB)
  </p>
</div>
              </div>
            )}
            
            {/* Paiky Section */}
            <div className="border-t pt-6 mb-4">
  <div className="flex justify-center items-center gap-8">
              {/* Paiky Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={slab.paiky}
                  onCheckedChange={(checked) => {
  updateSlab(slab.id, {
    paiky: !!checked,
    paikyCount: checked ? slab.paikyCount : 0,
    paikyEntries: checked ? slab.paikyEntries : []
  });
  setCurrentPaikyPage(prev => ({ ...prev, [slab.id]: 0 }));
  // Set active tab when paiky is enabled
  if (checked) {
    setActiveTab(prev => ({ ...prev, [slab.id]: 'paiky' }));
  } else if (slab.ekatrikaran) {
    setActiveTab(prev => ({ ...prev, [slab.id]: 'ekatrikaran' }));
  }
}}
                />
                <Label>Paiky</Label>
              </div>

              {/* Ekatrikaran Checkbox */}
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={slab.ekatrikaran}
                  onCheckedChange={(checked) => {
  updateSlab(slab.id, {
    ekatrikaran: !!checked,
    ekatrikaranCount: checked ? slab.ekatrikaranCount : 0,
    ekatrikaranEntries: checked ? slab.ekatrikaranEntries : []
  });
  setCurrentEkatrikaranPage(prev => ({ ...prev, [slab.id]: 0 }));
  // Set active tab when ekatrikaran is enabled
  if (checked) {
    setActiveTab(prev => ({ ...prev, [slab.id]: 'ekatrikaran' }));
  } else if (slab.paiky) {
    setActiveTab(prev => ({ ...prev, [slab.id]: 'paiky' }));
  }
}}
                />
                <Label>Ekatrikaran</Label>
              </div>
            </div>
            </div>

            {/* Tab Navigation - Show when both are enabled */}
            {slab.paiky && slab.ekatrikaran && (
  <div className="flex space-x-2 border-b">
    <Button
      variant={activeTab[slab.id] === 'paiky' || !activeTab[slab.id] ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setActiveTab(prev => ({ ...prev, [slab.id]: 'paiky' }))}
    >
      Paiky ({slab.paikyCount})
    </Button>
    <Button
      variant={activeTab[slab.id] === 'ekatrikaran' ? 'default' : 'ghost'}
      size="sm"
      onClick={() => setActiveTab(prev => ({ ...prev, [slab.id]: 'ekatrikaran' }))}
    >
      Ekatrikaran ({slab.ekatrikaranCount})
    </Button>
  </div>
)}

            {/* Paiky Section Content */}
            {slab.paiky && (activeTab[slab.id] === 'paiky' || (!slab.ekatrikaran && slab.paiky)) && (
              <div className="space-y-4 pt-4 relative">
                <div className="space-y-4 pl-6 pr-16"> {/* Added right padding for floating controls */}
                  <div className="space-y-2">
                    <Label>Number of Paiky Entries</Label>
                    <Input
  type="number"
  value={slab.paikyCount === 0 ? '' : slab.paikyCount}
  onChange={(e) => {
  const value = e.target.value;
  
  // Allow empty string (will be converted to 0)
  if (value === '') {
    updatePaikyCount(slab.id, 0);
    return;
  }
  
  // Only allow numbers >= 0
  const numValue = parseInt(value);
  if (!isNaN(numValue) && numValue >= 0) {
    updatePaikyCount(slab.id, numValue);
  }
}}
  min="0"
  placeholder="0"
/>
                  </div>

                  {/* Horizontal Pagination at Top */}
                  {slab.paikyCount > PAIKY_PER_PAGE && (
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm text-muted-foreground">
                        Page {(currentPaikyPage[slab.id] || 0) + 1} of {Math.ceil(slab.paikyCount / PAIKY_PER_PAGE)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={(currentPaikyPage[slab.id] || 0) === 0}
                          onClick={() => setCurrentPaikyPage(prev => ({
                            ...prev,
                            [slab.id]: (prev[slab.id] || 0) - 1
                          }))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={(currentPaikyPage[slab.id] || 0) >= Math.ceil(slab.paikyCount / PAIKY_PER_PAGE) - 1}
                          onClick={() => setCurrentPaikyPage(prev => ({
                            ...prev,
                            [slab.id]: (prev[slab.id] || 0) + 1
                          }))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Floating Vertical Pagination - Fixed positioning within this section */}
                  {slab.paikyCount > PAIKY_PER_PAGE && (
                    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-1 z-50 bg-white/95 backdrop-blur-sm p-2 rounded-lg border shadow-lg max-h-96 overflow-y-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        disabled={(currentPaikyPage[slab.id] || 0) === 0}
                        onClick={() => setCurrentPaikyPage(prev => ({
                          ...prev,
                          [slab.id]: (prev[slab.id] || 0) - 1
                        }))}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                        {Array.from({ length: Math.ceil(slab.paikyCount / PAIKY_PER_PAGE) }).map((_, index) => (
                          <Button
                            key={index}
                            variant={(currentPaikyPage[slab.id] || 0) === index ? "default" : "ghost"}
                            size="sm"
                            className={`h-8 w-8 p-0 rounded-full flex-shrink-0 ${
                              (currentPaikyPage[slab.id] || 0) === index 
                                ? "bg-primary text-primary-foreground" 
                                : "hover:bg-accent"
                            }`}
                            onClick={() => setCurrentPaikyPage(prev => ({
                              ...prev,
                              [slab.id]: index
                            }))}
                          >
                            {index + 1}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        disabled={(currentPaikyPage[slab.id] || 0) >= Math.ceil(slab.paikyCount / PAIKY_PER_PAGE) - 1}
                        onClick={() => setCurrentPaikyPage(prev => ({
                          ...prev,
                          [slab.id]: (prev[slab.id] || 0) + 1
                        }))}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Paginated Entries */}
                  {slab.paikyEntries
                    .slice(
                      (currentPaikyPage[slab.id] || 0) * PAIKY_PER_PAGE,
                      ((currentPaikyPage[slab.id] || 0) + 1) * PAIKY_PER_PAGE
                    )
                    .map((entry, entryIndex) => {
                      const globalIndex = (currentPaikyPage[slab.id] || 0) * PAIKY_PER_PAGE + entryIndex;
                      return (
                        <Card key={globalIndex} className="p-3 mt-2">
                          <h4 className="text-sm font-medium mb-3">Paiky Entry {globalIndex + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label>S.No Type</Label>
                              <Select
                                value={entry.sNoTypeUI}
                                onValueChange={(val) =>
                                  updateSlabEntry(slab.id, "paiky", globalIndex, {
                                    sNoTypeUI: val as SNoTypeUI,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SNO_TYPES.map((item) => (
                                    <SelectItem key={item.key} value={item.key}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Number</Label>
                              <Input
                                value={entry.sNo}
                                onChange={(e) =>
                                  updateSlabEntry(slab.id, "paiky", globalIndex, {
                                    sNo: e.target.value,
                                  })
                                }
                                placeholder="Enter number"
                              />
                            </div>
                            <div>
                              <Label>Area Type</Label>
                              <Select
                                value={entry.areaUI.areaType}
                                onValueChange={(val) =>
                                  updateSlabEntry(slab.id, "paiky", globalIndex, {
                                    areaUI: { ...entry.areaUI, areaType: val as AreaTypeUI },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {AREA_TYPES.map((a) => (
                                    <SelectItem key={a.key} value={a.key}>
                                      {a.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-2">
                              <Label>Area</Label>
                          

  {areaFields({ 
    area: entry.areaUI, 
    onChange: (area) => updateSlabEntry(slab.id, "paiky", globalIndex, {
      areaUI: area
    })
  })}

                            </div>
                            <div className="space-y-2">
                              <Label>7/12 Document</Label>
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleEntryFileUpload(
                                      file, 
                                      slab.id,
                                      'create',
                                      globalIndex,
                                      'paiky'
                                    );
                                  }
                                }}
                                disabled={loading}
                              />
                              {entry.integrated712 && (
                                <a 
                                  href={entry.integrated712} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  View Document
                                </a>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  }
                </div>
              </div>
            )}


            {/* Ekatrikaran Section Content */}
            {slab.ekatrikaran && (activeTab[slab.id] === 'ekatrikaran' || (!slab.paiky && slab.ekatrikaran)) && (
              <div className="space-y-4 pt-4 relative">
                <div className="space-y-4 pl-6 pr-16"> {/* Added right padding for floating controls */}
                  <div className="space-y-2">
                    <Label>Number of Ekatrikaran Entries</Label>
                    <Input
  type="number"
  value={slab.ekatrikaranCount === 0 ? '' : slab.ekatrikaranCount}
  onChange={(e) => {
  const value = e.target.value;
  
  // Allow empty string (will be converted to 0)
  if (value === '') {
    updateEkatrikaranCount(slab.id, 0);
    return;
  }
  
  // Only allow numbers >= 0
  const numValue = parseInt(value);
  if (!isNaN(numValue) && numValue >= 0) {
    updateEkatrikaranCount(slab.id, numValue);
  }
}}
  min="0"
  placeholder="0"
/>
                  </div>

                  {/* Horizontal Pagination at Top */}
                  {slab.ekatrikaranCount > EKATRIKARAN_PER_PAGE && (
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-sm text-muted-foreground">
                        Page {(currentEkatrikaranPage[slab.id] || 0) + 1} of {Math.ceil(slab.ekatrikaranCount / EKATRIKARAN_PER_PAGE)}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={(currentEkatrikaranPage[slab.id] || 0) === 0}
                          onClick={() => setCurrentEkatrikaranPage(prev => ({
                            ...prev,
                            [slab.id]: (prev[slab.id] || 0) - 1
                          }))}
                        >
                          Previous
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={(currentEkatrikaranPage[slab.id] || 0) >= Math.ceil(slab.ekatrikaranCount / EKATRIKARAN_PER_PAGE) - 1}
                          onClick={() => setCurrentEkatrikaranPage(prev => ({
                            ...prev,
                            [slab.id]: (prev[slab.id] || 0) + 1
                          }))}
                        >
                          Next
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Floating Vertical Pagination - Fixed positioning within this section */}
                  {slab.ekatrikaranCount > EKATRIKARAN_PER_PAGE && (
                    <div className="fixed right-4 top-1/2 transform -translate-y-1/2 flex flex-col items-center gap-1 z-50 bg-white/95 backdrop-blur-sm p-2 rounded-lg border shadow-lg max-h-96 overflow-y-auto">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        disabled={(currentEkatrikaranPage[slab.id] || 0) === 0}
                        onClick={() => setCurrentEkatrikaranPage(prev => ({
                          ...prev,
                          [slab.id]: (prev[slab.id] || 0) - 1
                        }))}
                      >
                        <ChevronUp className="h-4 w-4" />
                      </Button>
                      
                      <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
                        {Array.from({ length: Math.ceil(slab.ekatrikaranCount / EKATRIKARAN_PER_PAGE) }).map((_, index) => (
                          <Button
                            key={index}
                            variant={(currentEkatrikaranPage[slab.id] || 0) === index ? "default" : "ghost"}
                            size="sm"
                            className={`h-8 w-8 p-0 rounded-full flex-shrink-0 ${
                              (currentEkatrikaranPage[slab.id] || 0) === index 
                                ? "bg-primary text-primary-foreground" 
                                : "hover:bg-accent"
                            }`}
                            onClick={() => setCurrentEkatrikaranPage(prev => ({
                              ...prev,
                              [slab.id]: index
                            }))}
                          >
                            {index + 1}
                          </Button>
                        ))}
                      </div>

                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 flex-shrink-0"
                        disabled={(currentEkatrikaranPage[slab.id] || 0) >= Math.ceil(slab.ekatrikaranCount / EKATRIKARAN_PER_PAGE) - 1}
                        onClick={() => setCurrentEkatrikaranPage(prev => ({
                          ...prev,
                          [slab.id]: (prev[slab.id] || 0) + 1
                        }))}
                      >
                        <ChevronDown className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {/* Paginated Entries */}
                  {slab.ekatrikaranEntries
                    .slice(
                      (currentEkatrikaranPage[slab.id] || 0) * EKATRIKARAN_PER_PAGE,
                      ((currentEkatrikaranPage[slab.id] || 0) + 1) * EKATRIKARAN_PER_PAGE
                    )
                    .map((entry, entryIndex) => {
                      const globalIndex = (currentEkatrikaranPage[slab.id] || 0) * EKATRIKARAN_PER_PAGE + entryIndex;
                      return (
                        <Card key={globalIndex} className="p-3 mt-2">
                          <h4 className="text-sm font-medium mb-3">Ekatrikaran Entry {globalIndex + 1}</h4>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            <div>
                              <Label>S.No Type</Label>
                              <Select
                                value={entry.sNoTypeUI}
                                onValueChange={(val) =>
                                  updateSlabEntry(slab.id, "ekatrikaran", globalIndex, {
                                    sNoTypeUI: val as SNoTypeUI,
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Type" />
                                </SelectTrigger>
                                <SelectContent>
                                  {SNO_TYPES.map((item) => (
                                    <SelectItem key={item.key} value={item.key}>
                                      {item.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <Label>Number</Label>
                              <Input
                                value={entry.sNo}
                                onChange={(e) =>
                                  updateSlabEntry(slab.id, "ekatrikaran", globalIndex, {
                                    sNo: e.target.value,
                                  })
                                }
                                placeholder="Enter number"
                              />
                            </div>
                            <div>
                              <Label>Area Type</Label>
                              <Select
                                value={entry.areaUI.areaType}
                                onValueChange={(val) =>
                                  updateSlabEntry(slab.id, "ekatrikaran", globalIndex, {
                                    areaUI: { ...entry.areaUI, areaType: val as AreaTypeUI },
                                  })
                                }
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {AREA_TYPES.map((a) => (
                                    <SelectItem key={a.key} value={a.key}>
                                      {a.label}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="md:col-span-2">
                              <Label>Area</Label>
                              {areaFields({ 
    area: entry.areaUI, 
    onChange: (area) => updateSlabEntry(slab.id, "ekatrikaran", globalIndex, {
      areaUI: area
    })
  })}
                            </div>
                            <div className="space-y-2">
                              <Label>7/12 Document</Label>
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) {
                                    handleEntryFileUpload(
                                      file, 
                                      slab.id,
                                      'create',
                                      globalIndex,
                                      'ekatrikaran'
                                    );
                                  }
                                }}
                                disabled={loading}
                              />
                              {entry.integrated712 && (
                                <a 
                                  href={entry.integrated712} 
                                  target="_blank" 
                                  rel="noopener noreferrer"
                                  className="text-sm text-blue-600 hover:underline"
                                >
                                  View Document
                                </a>
                              )}
                            </div>
                          </div>
                        </Card>
                      );
                    })
                  }
                </div>
              </div>
            )}
            </>
    )}
          </Card>
        ))}
        <Button onClick={addSlab} variant="outline" className="w-full bg-transparent">
          <Plus className="w-4 h-4 mr-2" /> Add Another Slab
        </Button>
        <div className="flex justify-center pt-6">
         
          <Button
            onClick={handleSaveAndNext}
            disabled={loading}
          >
            {loading ? "Saving..." : "Save"}{" "}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
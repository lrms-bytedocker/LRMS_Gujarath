"use client";

import { useState, useEffect } from "react";
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
    case "block_no":
      return landBasicInfo.blockNo || "";
    case "re_survey_no":
      return landBasicInfo.reSurveyNo || "";
    case "survey_no":
      return landBasicInfo.sNo || "";
    default:
      return "";
  }
}
// Convert from UI-area to context-area
function fromAreaUI(areaUI: AreaUI): { value: number; unit: "acre" | "guntha" | "sq_m" } {
  if (areaUI.areaType === "sq_m") return { value: areaUI.sq_m || 0, unit: "sq_m" };
  if ((areaUI.acre ?? 0) > 0) return { value: areaUI.acre!, unit: "acre" };
  if ((areaUI.guntha ?? 0) > 0) return { value: areaUI.guntha!, unit: "guntha" };
  return { value: 0, unit: "acre" };
}
function toAreaUI(area: { value: number; unit: "acre" | "guntha" | "sq_m" }): AreaUI {
  if (area.unit === "sq_m") return { areaType: "sq_m", sq_m: area.value };
  if (area.unit === "acre") return { areaType: "acre_guntha", acre: area.value, guntha: 0 };
  if (area.unit === "guntha") return { areaType: "acre_guntha", acre: 0, guntha: area.value };
  return { areaType: "acre_guntha", acre: 0, guntha: 0 };
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
  const { yearSlabs, setYearSlabs, setCurrentStep, landBasicInfo } = useLandRecord();
  const { toast } = useToast();
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

  useEffect(() => {
  if (yearSlabs?.length) {
    setSlabs(yearSlabs.map(toYearSlabUI));
  } else {
    const autoSNoData = getAutoPopulatedSNoData(landBasicInfo, "survey_no");
    const defaultArea = landBasicInfo?.area 
      ? toAreaUI(landBasicInfo.area) 
      : { areaType: "acre_guntha", acre: 0, guntha: 0 };
    
    setSlabs([{
      id: "1",
      startYear: "",
      endYear: 2004,
      sNoTypeUI: "survey_no",
      sNo: autoSNoData?.sNo || "",
      areaUI: defaultArea,
      integrated712: landBasicInfo?.integrated712 || "",
      paiky: false,
      paikyCount: 0,
      paikyEntries: [],
      ekatrikaran: false,
      ekatrikaranCount: 0,
      ekatrikaranEntries: [],
      collapsed: false
    }]);
  }
}, [yearSlabs, landBasicInfo]);

  // --- UI rendering helpers ---
const areaFields = (area: AreaUI, onChange: (a: AreaUI) => void) => {
  // Calculate all values
  const currentSqm = area.sq_m ?? 
    (convertToSquareMeters(area.acre || 0, "acre") + 
     convertToSquareMeters(area.guntha || 0, "guntha"));

  const acreValue = convertFromSquareMeters(currentSqm, "acre");
  const gunthaValue = convertFromSquareMeters(currentSqm, "guntha");

  // Handlers for each input type
  const handleSqmChange = (value: string) => {
    if (value === "") {
      onChange({ ...area, sq_m: undefined, acre: undefined, guntha: undefined });
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onChange({
        ...area,
        sq_m: num,
        acre: convertFromSquareMeters(num, "acre"),
        guntha: convertFromSquareMeters(num, "guntha") % 40
      });
    }
  };

  const handleAcreChange = (value: string) => {
    if (value === "") {
      onChange({ ...area, acre: undefined, sq_m: undefined, guntha: undefined });
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onChange({
        ...area,
        acre: num,
        sq_m: convertToSquareMeters(num, "acre") + 
              convertToSquareMeters(area.guntha || 0, "guntha"),
        guntha: area.guntha // preserve existing guntha
      });
    }
  };

  const handleGunthaChange = (value: string) => {
    if (value === "") {
      onChange({ ...area, guntha: undefined, sq_m: undefined, acre: undefined });
      return;
    }
    let num = parseFloat(value);
    if (!isNaN(num)) {
      if (num >= 40) {
        num = 39.99;
        toast({ title: "Guntha must be less than 40" });
      }
      onChange({
        ...area,
        guntha: num,
        sq_m: convertToSquareMeters(area.acre || 0, "acre") + 
              convertToSquareMeters(num, "guntha"),
        acre: area.acre // preserve existing acre
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* First row - primary field based on areaType */}
      <div className={`grid gap-4 ${area.areaType === "sq_m" ? "grid-cols-1" : "grid-cols-2"}`}>
        {area.areaType === "sq_m" ? (
          <div className="space-y-2">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={area.sq_m ?? ""}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter sq. meters"
            />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Acres</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={area.acre ?? ""}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter acres"
              />
            </div>
            <div className="space-y-2">
              <Label>Guntha (must be &lt;40)</Label>
              <Input
                type="number"
                min={0}
                max={39.99}
                step="0.01"
                value={area.guntha ?? ""}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter guntha"
              />
            </div>
          </>
        )}
      </div>

      {/* Second row - other fields (also editable) */}
      <div className={`grid gap-4 ${area.areaType === "sq_m" ? "grid-cols-2" : "grid-cols-1"}`}>
        {area.areaType === "sq_m" ? (
          <>
            <div className="space-y-2">
              <Label>Acres</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={area.acre ?? ""}
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
                value={area.guntha ?? ""}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter guntha"
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
              value={area.sq_m ?? ""}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter sq. meters"
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
    
    // When S.No type changes, fetch corresponding value
    if (updates.sNoTypeUI && updates.sNoTypeUI !== slab.sNoTypeUI) {
      return {
        ...slab,
        ...updates,
        sNo: getAutoPopulatedSNoData(landBasicInfo, updates.sNoTypeUI)
      };
    }
    
    return { ...slab, ...updates };
  }));
};

 const addSlab = () => {
  const autoSNoData = getAutoPopulatedSNoData(landBasicInfo);
  const defaultArea = landBasicInfo?.area 
    ? toAreaUI(landBasicInfo.area) 
    : { areaType: "acre_guntha", acre: 0, guntha: 0 };

  let startYear, endYear;
  
  if (slabs.length === 0) {
  // First slab
  startYear = "";
  endYear = 2004;
} else {
  // Subsequent slabs - end year = previous slab's start year
  const previousSlab = slabs[slabs.length - 1];
  endYear = previousSlab.startYear;
  startYear = ""; // Keep start year empty
}

   // Collapse all previous slabs
  const collapsedSlabs = slabs.map(slab => ({
    ...slab,
    collapsed: true
  }));

  const newSlab: YearSlabUI = {
    id: Date.now().toString(),
    startYear,
    endYear,    sNo: autoSNoData.sNo,
    sNoTypeUI: autoSNoData.sNoTypeUI,
    areaUI: defaultArea,
    integrated712: "",
    paiky: false,
    paikyCount: 0,
    paikyEntries: [],
    ekatrikaran: false,
    ekatrikaranCount: 0,
    ekatrikaranEntries: [],
    collapsed: false, // New slab is expanded by default
  };

  setSlabs([...collapsedSlabs, newSlab]);
};

  const removeSlab = (id: string) => setSlabs(slabs.filter((slab) => slab.id !== id));

  // "Count" updating helpers
  const updatePaikyCount = (slabId: string, count: number) => {
  setSlabs(prev => prev.map(slab => {
    if (slab.id !== slabId) return slab;
    
    const autoSNoData = getAutoPopulatedSNoData(landBasicInfo);
    const defaultEntry = {
      sNo: autoSNoData?.sNo || "",
      sNoTypeUI: autoSNoData?.sNoTypeUI || "survey_no",
      areaUI: { areaType: "acre_guntha", acre: 0, guntha: 0 },
      integrated712: ""
    };

    return {
      ...slab,
      paikyCount: count,
      paiky: slab.paiky, // Keep checkbox state unchanged
      paikyEntries: Array.from({ length: count }, (_, i) => {
        return slab.paikyEntries?.[i] || { ...defaultEntry };
      })
    };
  }));
};

const updateEkatrikaranCount = (slabId: string, count: number) => {
  setSlabs(prev => prev.map(slab => {
    if (slab.id !== slabId) return slab;
    
    const autoSNoData = getAutoPopulatedSNoData(landBasicInfo);
    const defaultEntry = {
      sNo: autoSNoData?.sNo || "",
      sNoTypeUI: autoSNoData?.sNoTypeUI || "survey_no",
      areaUI: { areaType: "acre_guntha", acre: 0, guntha: 0 },
      integrated712: ""
    };

    return {
      ...slab,
      ekatrikaranCount: count,
      ekatrikaran: slab.ekatrikaran, // Keep checkbox state unchanged
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
    
    // Handle S.No type change for entries
    if (updates.sNoTypeUI) {
      const entries = type === "paiky" 
        ? slab.paikyEntries || [] 
        : slab.ekatrikaranEntries || [];
      const currentEntry = entries[index] || {};
      
      if (updates.sNoTypeUI !== currentEntry.sNoTypeUI) {
        updates = {
          ...updates,
          sNo: getAutoPopulatedSNoData(landBasicInfo, updates.sNoTypeUI) || ""
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
    // Debug: Log the raw slab data
    console.log('Raw slab data before conversion:', slabs);
    
    // Validate year ordering
    const { valid, message } = validateYearOrder(slabs);
    if (!valid) {
      toast({
        title: "Invalid year sequence",
        description: message,
        variant: "destructive"
      });
      return;
    }
    
    // Convert to database format
    const dbSlabs = slabs.map((slab, index) => {
      // Debug each slab
      console.log('Converting slab:', {
        index,
        id: slab.id,
        startYear: slab.startYear,
        endYear: slab.endYear,
        type: typeof slab.startYear
      });
      
      if (isNaN(slab.startYear) || isNaN(slab.endYear)) {
        throw new Error(`Invalid year values for slab at index ${index}`);
      }
      
      // Don't include 'id' field - let database generate UUID
      const dbSlab = {
        // id is auto-generated by database, don't include it
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
        // Include entries if they exist
        paiky_entries: slab.paiky && slab.paikyCount > 0 
          ? slab.paikyEntries.slice(0, slab.paikyCount).map(entry => ({
              s_no: entry.sNo,
              s_no_type: mapSNoTypeUIToContext(entry.sNoTypeUI),
              area_value: entry.areaUI.areaType === "sq_m"
                ? entry.areaUI.sq_m || 0
                : convertToSquareMeters(entry.areaUI.acre || 0, "acre") +
                  convertToSquareMeters(entry.areaUI.guntha || 0, "guntha"),
              area_unit: "sq_m",
              integrated_712: entry.integrated712
            }))
          : [],
        ekatrikaran_entries: slab.ekatrikaran && slab.ekatrikaranCount > 0
          ? slab.ekatrikaranEntries.slice(0, slab.ekatrikaranCount).map(entry => ({
              s_no: entry.sNo,
              s_no_type: mapSNoTypeUIToContext(entry.sNoTypeUI),
              area_value: entry.areaUI.areaType === "sq_m"
                ? entry.areaUI.sq_m || 0
                : convertToSquareMeters(entry.areaUI.acre || 0, "acre") +
                  convertToSquareMeters(entry.areaUI.guntha || 0, "guntha"),
              area_unit: "sq_m",
              integrated_712: entry.integrated712
            }))
          : []
      };
      
      console.log('Converted slab for DB:', dbSlab);
      return dbSlab;
    });
    
    console.log('Final data for saving (no IDs):', dbSlabs);
    
    if (!landBasicInfo?.id) {
      toast({
        title: "Land record not found",
        description: "Please complete step 1 first",
        variant: "destructive"
      });
      return;
    }
    
    // Save to database
    const { data: savedSlabs, error } = await LandRecordService.saveYearSlabs(
      landBasicInfo.id,
      dbSlabs
    );
    
    if (error) throw error;
    
    console.log('Saved slabs returned from DB:', savedSlabs);
    
    // Fetch the saved data to get proper UUIDs for context
    const { data: fetchedSlabs, error: fetchError } = await LandRecordService.getYearSlabs(
      landBasicInfo.id
    );
    
    if (fetchError) {
      console.warn('Could not fetch saved slabs:', fetchError);
      // Continue anyway, just use what we have
    }
    
    // Update context with proper UUIDs from database
    if (fetchedSlabs && fetchedSlabs.length > 0) {
      console.log('Setting context with fetched slabs:', fetchedSlabs);
      setYearSlabs(fetchedSlabs);
    } else {
      // Fallback: create temporary slabs with the returned data
      const contextSlabs = savedSlabs?.map((savedSlab, index) => ({
        id: savedSlab.id, // This should now be a proper UUID
        startYear: savedSlab.start_year,
        endYear: savedSlab.end_year,
        sNo: savedSlab.s_no,
        area: {
          value: savedSlab.area_value || 0,
          unit: savedSlab.area_unit || 'sq_m'
        },
        integrated712: savedSlab.integrated_712,
        paiky: savedSlab.paiky || false,
        ekatrikaran: savedSlab.ekatrikaran || false,
        paikyCount: slabs[index].paikyCount,
        ekatrikaranCount: slabs[index].ekatrikaranCount
      })) || [];
      
      console.log('Setting context with converted saved slabs:', contextSlabs);
      setYearSlabs(contextSlabs);
    }
    
    setCurrentStep(3);
    toast({ title: "Year slabs saved successfully" });
    
  } catch (error) {
    console.error('Save error details:', {
      error: error?.message,
      stack: error?.stack
    });
    toast({
      title: "Save failed",
      description: error?.message || "An unknown error occurred",
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
  value={slab.startYear}
  onChange={(e) => {
    const newYear = parseInt(e.target.value);
    if (!isNaN(newYear)) {
      updateSlab(slab.id, { startYear: newYear });
    }
  }}
  onWheel={(e) => e.currentTarget.blur()} // Add this line
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
        
                  {areaFields(slab.areaUI, (areaUI) =>
                    updateSlab(slab.id, { areaUI })
                  )}
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
                              {areaFields(entry.areaUI, (area) =>
                                updateSlabEntry(slab.id, "paiky", globalIndex, {
                                  areaUI: area,
                                })
                              )}
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
                              {areaFields(entry.areaUI, (area) =>
                                updateSlabEntry(slab.id, "ekatrikaran", globalIndex, {
                                  areaUI: area,
                                })
                              )}
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
            {loading ? "Saving..." : "Save and Continue"}{" "}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
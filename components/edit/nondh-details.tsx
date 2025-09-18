"use client"
import React from 'react'
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Upload, Eye, Loader2, ChevronDown, ChevronUp, Badge, Save } from "lucide-react"
import { useLandRecord, type NondhDetail } from "@/contexts/land-record-context"
import { supabase, uploadFile } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { LandRecordService } from "@/lib/supabase"

const nondhTypes = [
  "Kabjedaar",
  "Ekatrikaran",
  "Varsai",
  "Hayati_ma_hakh_dakhal",
  "Hakkami",
  "Vechand",
  "Durasti",
  "Promulgation",
  "Hukam",
  "Vehchani",
  "Bojo",
  "Other",
]

const tenureTypes = ["Navi", "Juni", "Kheti_Kheti_ma_Juni", "NA", "Bin_Kheti_Pre_Patra", "Prati_bandhit_satta_prakar"]

const hukamTypes = ["SSRD", "Collector", "Collector_ganot", "Prant", "Mamlajdaar", "GRT", "Jasu", "ALT Krushipanch", "DILR"]

const ganotOptions = ["1st Right", "2nd Right"]

interface AreaFieldsProps {
  area: { 
    value: number; 
    unit: 'acre_guntha' | 'sq_m';
    acres?: number;
    gunthas?: number;
    square_meters?: number;
  };
  onChange: (area: { 
    value: number; 
    unit: 'acre_guntha' | 'sq_m';
    acres?: number;
    gunthas?: number;
    square_meters?: number;
  }) => void;
  disabled?: boolean;
}

const statusTypes = [
  { value: "valid", label: "Pramanik" },
  { value: "invalid", label: "Radd" },
  { value: "nullified", label: "Na manjoor" }
]

const GUNTHAS_PER_ACRE = 40;
const SQM_PER_GUNTHA = 101.1714;
const SQM_PER_ACRE = SQM_PER_GUNTHA * GUNTHAS_PER_ACRE;

const areaFields = ({ area, onChange }: AreaFieldsProps) => {
  // Define constants
  const SQM_PER_GUNTHA = 101.17;
  const SQM_PER_ACRE = 4046.86;
  const GUNTHAS_PER_ACRE = 40;

  // Helper functions for conversions
  const convertToSquareMeters = (value: number, unit: string) => {
    if (unit === "acre") return value * SQM_PER_ACRE;
    if (unit === "guntha") return value * SQM_PER_GUNTHA;
    return value;
  };

  const convertFromSquareMeters = (sqm: number, unit: string) => {
    if (unit === "acre") return sqm / SQM_PER_ACRE;
    if (unit === "guntha") return sqm / SQM_PER_GUNTHA;
    return sqm;
  };

  // Define workingArea at component level
  const workingArea = area || { unit: "acre_guntha", value: 0, acres: 0, gunthas: 0 };

  // Calculate display values based on current state - exactly like your working example
  const displayValues = (() => {
    if (workingArea.unit === "sq_m") {
      return {
        sq_m: workingArea.value,
        acres: workingArea.value ? Math.floor(convertFromSquareMeters(workingArea.value, "acre")) : undefined,
        gunthas: workingArea.value ? Math.round(convertFromSquareMeters(workingArea.value, "guntha") % 40) : undefined
      };
    } else {
      const calculatedSqm = workingArea.sq_m || ((workingArea.acres || 0) * SQM_PER_ACRE + (workingArea.gunthas || 0) * SQM_PER_GUNTHA);
      return {
        sq_m: calculatedSqm ? parseFloat(calculatedSqm.toFixed(2)) : calculatedSqm, // Round to 2 decimal places
        acres: workingArea.acres ? Math.floor(workingArea.acres) : workingArea.acres,
        gunthas: workingArea.gunthas ? Math.round(workingArea.gunthas) : workingArea.gunthas
      };
    }
  })();

  const handleSqmChange = (value: string) => {
    if (value === "") {
      onChange({
        ...workingArea,
        value: undefined,
        acres: undefined,
        gunthas: undefined,
        sq_m: undefined
      });
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      const totalAcres = convertFromSquareMeters(num, "acre");
      const acres = Math.floor(totalAcres);
      const remainingGuntha = Math.round((totalAcres - acres) * 40);
      
      if (workingArea.unit === "sq_m") {
        // Square meter is primary
        onChange({
          ...workingArea,
          value: num,
          acres,
          gunthas: remainingGuntha
        });
      } else {
        // Square meter is secondary - update acre/guntha values
        onChange({
          ...workingArea,
          unit: "acre_guntha",
          acres,
          gunthas: remainingGuntha,
          sq_m: parseFloat(num.toFixed(2)) // Round to 2 decimal places
        });
      }
    }
  };

  const handleAcreChange = (value: string) => {
    if (value === "") {
      onChange({
        ...workingArea,
        acres: undefined,
        gunthas: workingArea.gunthas,
        value: workingArea.unit === "sq_m" ? (workingArea.gunthas ? convertToSquareMeters(workingArea.gunthas, "guntha") : undefined) : workingArea.value,
        sq_m: workingArea.gunthas ? convertToSquareMeters(workingArea.gunthas, "guntha") : undefined
      });
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (workingArea.unit === "sq_m") {
        const newSqm = convertToSquareMeters(num, "acre") + 
                      (displayValues.gunthas ? convertToSquareMeters(displayValues.gunthas, "guntha") : 0);
        onChange({
          ...workingArea,
          value: newSqm,
          acres: num,
          gunthas: displayValues.gunthas
        });
      } else {
        onChange({
          ...workingArea,
          unit: "acre_guntha",
          acres: num,
          sq_m: parseFloat((convertToSquareMeters(num, "acre") + 
               (workingArea.gunthas ? convertToSquareMeters(workingArea.gunthas, "guntha") : 0)).toFixed(2))
        });
      }
    }
  };

  const handleGunthaChange = (value: string) => {
    if (value === "") {
      onChange({
        ...workingArea,
        gunthas: undefined,
        acres: workingArea.acres,
        value: workingArea.unit === "sq_m" ? (workingArea.acres ? convertToSquareMeters(workingArea.acres, "acre") : undefined) : workingArea.value,
        sq_m: workingArea.acres ? convertToSquareMeters(workingArea.acres, "acre") : undefined
      });
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      if (num >= 40) {
        // Handle guntha >= 40 like in your working example
        return;
      }
      
      if (workingArea.unit === "sq_m") {
        const newSqm = (displayValues.acres ? convertToSquareMeters(displayValues.acres, "acre") : 0) + 
                      convertToSquareMeters(num, "guntha");
        onChange({
          ...workingArea,
          value: newSqm,
          acres: displayValues.acres,
          gunthas: num
        });
      } else {
        onChange({
          ...workingArea,
          unit: "acre_guntha",
          gunthas: num,
          sq_m: parseFloat(((workingArea.acres ? convertToSquareMeters(workingArea.acres, "acre") : 0) +
               convertToSquareMeters(num, "guntha")).toFixed(2))
        });
      }
    }
  };

  const formatValue = (value: number | undefined): string => {
    return value === undefined ? "" : value.toString();
  };

  return (
    <div className="space-y-4">
      {/* On mobile: Stack all fields vertically */}
      <div className="md:hidden space-y-4">
        {/* Unit Selector */}
        <div className="space-y-2 w-full">
          <Label>Unit</Label>
          <Select
            value={workingArea.unit}
            onValueChange={(unit) => {
              const newUnit = unit as AreaUnit;
              if (newUnit === "sq_m") {
                // Convert to sq_m mode - preserve the sq_m value
                const sqmValue = displayValues.sq_m || 0;
                onChange({ 
                  ...workingArea, 
                  unit: "sq_m",
                  value: sqmValue,
                  acres: displayValues.acres,
                  gunthas: displayValues.gunthas
                });
              } else {
                // Convert to acre_guntha mode - preserve acre/guntha values
                onChange({ 
                  ...workingArea, 
                  unit: "acre_guntha",
                  acres: displayValues.acres || 0,
                  gunthas: displayValues.gunthas || 0,
                  sq_m: displayValues.sq_m
                });
              }
            }}
          >
            <SelectTrigger className="w-full px-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acre_guntha">Acre-Guntha</SelectItem>
              <SelectItem value="sq_m">Square Meters</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Primary Field */}
        {workingArea.unit === "sq_m" ? (
          <div className="space-y-2 w-full">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter square meters"
              className="w-full"
            />
          </div>
        ) : (
          <>
            <div className="space-y-2 w-full">
              <Label>Acres</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formatValue(displayValues.acres)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter acres"
                className="w-full"
              />
            </div>
            <div className="space-y-2 w-full">
              <Label>Gunthas</Label>
              <Input
                type="number"
                min="0"
                max="39"
                step="1"
                value={formatValue(displayValues.gunthas)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter gunthas (0-39)"
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </>
        )}

        {/* Secondary Fields */}
        {workingArea.unit === "sq_m" ? (
          <>
            <div className="space-y-2 w-full">
              <Label>Acres</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formatValue(displayValues.acres)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter or view acres"
                className="w-full bg-blue-50 border-blue-200"
              />
            </div>
            <div className="space-y-2 w-full">
              <Label>Gunthas</Label>
              <Input
                type="number"
                min="0"
                max="39"
                step="1"
                value={formatValue(displayValues.gunthas)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter gunthas (0-39)"
                className="w-full bg-blue-50 border-blue-200"
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2 w-full">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter or view sq. meters"
              className="w-full bg-blue-50 border-blue-200"
            />
          </div>
        )}
      </div>

      {/* On desktop: Original single-row layout with better spacing */}
      <div className="hidden md:flex items-end gap-6">
        {/* Unit Selector */}
        <div className="space-y-2 w-[140px] flex-shrink-0">
          <Label>Unit</Label>
          <Select
            value={workingArea.unit}
            onValueChange={(unit) => {
              const newUnit = unit as AreaUnit;
              if (newUnit === "sq_m") {
                // Convert to sq_m mode - preserve the sq_m value
                const sqmValue = displayValues.sq_m || 0;
                onChange({ 
                  ...workingArea, 
                  unit: "sq_m",
                  value: sqmValue,
                  acres: displayValues.acres,
                  gunthas: displayValues.gunthas
                });
              } else {
                // Convert to acre_guntha mode - preserve acre/guntha values
                onChange({ 
                  ...workingArea, 
                  unit: "acre_guntha",
                  acres: displayValues.acres || 0,
                  gunthas: displayValues.gunthas || 0,
                  sq_m: displayValues.sq_m
                });
              }
            }}
          >
            <SelectTrigger className="w-[140px] px-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acre_guntha">Acre-Guntha</SelectItem>
              <SelectItem value="sq_m">Square Meters</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Primary Fields */}
        {workingArea.unit === "sq_m" ? (
          <div className="space-y-2 min-w-[150px] flex-1">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter square meters"
              className="w-full"
            />
          </div>
        ) : (
          <>
            <div className="space-y-2 min-w-[120px] flex-1">
              <Label>Acres</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formatValue(displayValues.acres)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter acres"
                className="w-full"
              />
            </div>
            <div className="space-y-2 min-w-[100px] flex-1">
              <Label>Gunthas</Label>
              <Input
                type="number"
                min="0"
                max="39"
                step="1"
                value={formatValue(displayValues.gunthas)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter gunthas (0-39)"
                className="w-full"
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </>
        )}

        {/* Secondary Fields */}
        {workingArea.unit === "sq_m" ? (
          <>
            <div className="space-y-2 min-w-[120px] flex-1">
              <Label>Acres</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={formatValue(displayValues.acres)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter or view acres"
                className="w-full bg-blue-50 border-blue-200"
              />
            </div>
            <div className="space-y-2 min-w-[100px] flex-1">
              <Label>Gunthas</Label>
              <Input
                type="number"
                min="0"
                max="39"
                step="1"
                value={formatValue(displayValues.gunthas)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter gunthas (0-39)"
                className="w-full bg-blue-50 border-blue-200"
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2 min-w-[150px] flex-1">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter or view sq. meters"
              className="w-full bg-blue-50 border-blue-200"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default function NondhDetailsEdit() {
  const { landBasicInfo, yearSlabs, nondhs: contextNondhs, setNondhs, recordId, setCurrentStep } = useLandRecord()
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [nondhs, setLocalNondhs] = useState<any[]>([])
  const [nondhDetails, setNondhDetails] = useState<NondhDetail[]>([])
  const [originalDetails, setOriginalDetails] = useState<NondhDetail[]>([])
  const [collapsedNondhs, setCollapsedNondhs] = useState<Set<string>>(new Set())
  const [equalDistribution, setEqualDistribution] = useState<Record<string, boolean>>({})
  const [documents712, setDocuments712] = useState<any[]>([])
  const [hasChanges, setHasChanges] = useState(false)
  const [ownerTransfers, setOwnerTransfers] = useState<Record<string, Array<any>>>({})
const [transferEqualDistribution, setTransferEqualDistribution] = useState<Record<string, Record<string, boolean>>>({})
const [affectedNondhDetails, setAffectedNondhDetails] = useState<Record<string, Array<any>>>({})
const [originalAffectedNondhDetails, setOriginalAffectedNondhDetails] = useState<Record<string, Array<any>>>({})

  // Load data on mount
 useEffect(() => {
  const loadData = async () => {
    if (!recordId) return;

    try {
      setLoading(true);
      
      // Load nondhs - matches view component approach
      const { data: nondhData, error: nondhError } = await LandRecordService.getNondhsforDetails(recordId);
      if (nondhError) throw nondhError;
      
      // Transform to consistent format
      const formattedNondhs = (nondhData || []).map(nondh => ({
        ...nondh,
        // Ensure affectedSNos is always an array
        affectedSNos: Array.isArray(nondh.affected_s_nos) 
          ? nondh.affected_s_nos 
          : nondh.affectedSNos 
            ? [nondh.affectedSNos] 
            : []
      }));
      
      setLocalNondhs(formattedNondhs);
      setNondhs(formattedNondhs);

      // Then load details using the proper service function
      const { data: detailData, error: detailError } = await LandRecordService.getNondhDetailsWithRelations(recordId);
      if (detailError) throw detailError;

        // Transform to match our NondhDetail type
        const transformedDetails = (detailData || []).map((detail: any) => ({
          id: detail.id,
          nondhId: detail.nondh_id,
          sNo: detail.s_no,
          type: detail.type,
          reason: detail.reason || "",
          date: detail.date || "",
          vigat: detail.vigat || "",
          status: detail.status || "valid",
          invalidReason: detail.invalid_reason || "",
          showInOutput: detail.show_in_output !== false,
          hasDocuments: detail.has_documents || false,
          docUpload: detail.doc_upload_url || "",
          oldOwner: detail.old_owner?.includes('|') 
    ? detail.old_owner.split('|')[1] 
    : detail.old_owner,
          hukamDate: detail.hukam_date || "",
          hukamType: detail.hukam_type || "SSRD",
          hukamStatus: detail.hukam_status || "valid",
          hukamInvalidReason: detail.hukam_invalid_reason || "",
          ganot: detail.ganot || "",
restrainingOrder: detail.restraining_order || "no",
sdDate: detail.sd_date || "",
            tenure: detail.tenure || "Navi",
amount: detail.amount || null,
affectedNondhDetails: detail.affected_nondh_details 
  ? JSON.parse(detail.affected_nondh_details) 
  : [],
          ownerRelations: (detail.owner_relations || []).map((rel: any) => ({
            id: rel.id,
            ownerName: rel.owner_name,
            sNo: rel.s_no,
            area: {
              value: rel.square_meters || (rel.acres * SQM_PER_ACRE + rel.gunthas * SQM_PER_GUNTHA),
              unit: rel.area_unit as 'acre_guntha' | 'sq_m',
              acres: rel.acres,
              gunthas: rel.gunthas
            },
            isValid: rel.is_valid !== false,
            surveyNumber: rel.survey_number || "",
surveyNumberType: rel.survey_number_type || "s_no"
          }))
        }))

        const existingDetailNondhIds = new Set(transformedDetails.map(detail => detail.nondhId));
const allDetails = [...transformedDetails];

// Add missing details without overriding existing ones
formattedNondhs
  .filter(nondh => !existingDetailNondhIds.has(nondh.id))
  .forEach(nondh => {
    allDetails.push({
      id: `temp_${nondh.id}_${Date.now()}`, // Temporary ID for new records
    nondhId: nondh.id,
    sNo: nondh.affectedSNos?.[0] || '', // Use first affected S.No
    type: nondh.type || 'Kabjedaar', // Default type
    reason: "",
    date: "",
    vigat: "",
    status: "valid",
    invalidReason: "",
    showInOutput: true,
    hasDocuments: false,
    docUpload: "",
    oldOwner: "",
    hukamDate: "",
    hukamType: "SSRD",
    hukamStatus: "valid",
    hukamInvalidReason: "",
    affectedNondhNo: "",
    ownerRelations: [] 
    });
  });


setNondhDetails(allDetails);
setOriginalDetails(allDetails);
// Initialize affectedNondhDetails state from database data
const initialAffectedDetails = {};
transformedDetails.forEach(detail => {
  if (detail.affectedNondhDetails && detail.affectedNondhDetails.length > 0) {
    initialAffectedDetails[detail.id] = detail.affectedNondhDetails.map((affected, index) => ({
      ...affected,
      id: affected.id || `existing_${detail.id}_${index}` // Ensure each has an ID
    }));
  }
});
setAffectedNondhDetails(initialAffectedDetails);
setOriginalAffectedNondhDetails(initialAffectedDetails);
      // Load documents
      const { data: docData, error: docError } = await LandRecordService.get712Documents(recordId);
      if (docError) throw docError;
      setDocuments712(docData || []);

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error loading data",
        description: error instanceof Error ? error.message : "Unknown error",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  loadData();
}, [recordId, toast, setNondhs]);

  // Check for changes
  useEffect(() => {
  setHasChanges(!deepEqual(nondhDetails, originalDetails) || 
               !deepEqual(affectedNondhDetails, originalAffectedNondhDetails))
}, [nondhDetails, originalDetails, affectedNondhDetails, originalAffectedNondhDetails])

useEffect(() => {
  Object.entries(affectedNondhDetails).forEach(([detailId, affectedList]) => {
    affectedList.forEach(affected => {
      if (affected.status === "invalid" && affected.invalidReason) {
        propagateReasonToAffectedNondh(affected.nondhNo, affected.invalidReason);
      }
    });
  });
}, [affectedNondhDetails]);

  // Deep equality check
  const deepEqual = (a: any, b: any) => {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  const propagateReasonToAffectedNondh = (affectedNondhNo: string, reason: string) => {
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  const affectedNondh = allSortedNondhs.find(n => n.number.toString() === affectedNondhNo);
  
  if (!affectedNondh) return;

  setNondhDetails(prev => prev.map(detail => 
    detail.nondhId === affectedNondh.id && detail.status === "invalid"
      ? { ...detail, invalidReason: reason }
      : detail
  ));
};

  // Original component functions - maintain all logic
  const getSNoTypesFromSlabs = () => {
    const sNoTypes = new Map<string, "s_no" | "block_no" | "re_survey_no">();
    
    yearSlabs.forEach(slab => {
      if (slab.sNo) {
        sNoTypes.set(slab.sNo, slab.sNoType);
      }
    });
    
    yearSlabs.forEach(slab => {
      slab.paikyEntries.forEach(entry => {
        if (entry.sNo) {
          sNoTypes.set(entry.sNo, entry.sNoType);
        }
      });
    });
    
    yearSlabs.forEach(slab => {
      slab.ekatrikaranEntries.forEach(entry => {
        if (entry.sNo) {
          sNoTypes.set(entry.sNo, entry.sNoType);
        }
      });
    });
    
    return sNoTypes;
  }

  const getNondhNumber = (nondh: any): number => {
    if (typeof nondh.number === 'number') return nondh.number;
    const num = parseInt(nondh.number, 10);
    return isNaN(num) ? 0 : num;
  };

  const safeNondhNumber = (nondh: any): number => {
    const numberValue = typeof nondh.number === 'string' 
      ? parseInt(nondh.number, 10) 
      : nondh.number;
    return isNaN(numberValue) ? 0 : numberValue;
  };

const getPrimarySNoType = (affectedSNos: string[]): string => {
  if (!affectedSNos || affectedSNos.length === 0) return 's_no';
  
  // Priority order: s_no > block_no > re_survey_no
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  
  // Parse the stringified JSON objects to get the actual types
  const types = affectedSNos.map(sNoStr => {
    try {
      const parsed = JSON.parse(sNoStr);
      return parsed.type || 's_no';
    } catch (e) {
      return 's_no'; // fallback
    }
  });
  
  // Find the highest priority type present
  for (const type of priorityOrder) {
    if (types.includes(type)) {
      return type;
    }
  }
  
  return 's_no'; // default
};

  const sortNondhs = (a: any, b: any): number => {
  // Get primary types from affected_s_nos
  const aType = getPrimarySNoType(a.affected_s_nos);
  const bType = getPrimarySNoType(b.affected_s_nos);

  // Priority order: s_no > block_no > re_survey_no
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  const aPriority = priorityOrder.indexOf(aType);
  const bPriority = priorityOrder.indexOf(bType);

  // First sort by primary type priority
  if (aPriority !== bPriority) return aPriority - bPriority;

  // Within same type group, sort by nondh number (ascending)
  const aNum = parseInt(a.number.toString()) || 0;
  const bNum = parseInt(b.number.toString()) || 0;
  return aNum - bNum;
};

  const handleStatusChange = (detailId: string, newStatus: "valid" | "invalid" | "nullified") => {
  setNondhDetails(prev => {
    const updatedDetails = prev.map(detail => 
      detail.id === detailId 
        ? { 
            ...detail, 
            status: newStatus,
            invalidReason: detail.invalidReason || ''
          } 
        : detail
    );
    
    // Process validity chain immediately
    return processValidityChain(updatedDetails);
  });
};

  const processValidityChain = (details: NondhDetail[]): NondhDetail[] => {
  const sortedNondhs = [...nondhs].sort(sortNondhs);
  const nondhDetailMap = new Map<string, NondhDetail>();
  details.forEach(detail => {
    nondhDetailMap.set(detail.nondhId, detail);
  });

  const affectingCounts = new Map<string, number>();
  sortedNondhs.forEach((nondh, index) => {
    let count = 0;
    for (let i = index + 1; i < sortedNondhs.length; i++) {
      const affectingNondh = sortedNondhs[i];
      const affectingDetail = nondhDetailMap.get(affectingNondh.id);
      if (affectingDetail?.status === 'invalid') {
        count++;
      }
    }
    affectingCounts.set(nondh.id, count);
  });

  // Create updated details with proper validity
  const updatedDetails = details.map(detail => {
    const affectingCount = affectingCounts.get(detail.nondhId) || 0;
    const shouldBeValid = affectingCount % 2 === 0;
    
    const currentValidity = detail.ownerRelations.every(r => r.isValid);
    if (currentValidity !== shouldBeValid) {
      return {
        ...detail,
        ownerRelations: detail.ownerRelations.map(relation => ({
          ...relation,
          isValid: shouldBeValid
        }))
      };
    }
    return detail;
  });

  return updatedDetails; // Return instead of setting state
};

  //Function to add a new transfer
const addOwnerTransfer = (detailId: string) => {
  setOwnerTransfers(prev => ({
    ...prev,
    [detailId]: [
      ...(prev[detailId] || []),
      {
        id: Date.now().toString(),
        oldOwner: '',
        newOwners: [],
        equalDistribution: false,
        oldOwnerArea: { value: 0, unit: 'sq_m' },
        newOwnerAreas: []
      }
    ]
  }));
};

// Function to remove a transfer
const removeOwnerTransfer = (detailId: string, transferId: string) => {
  setOwnerTransfers(prev => ({
    ...prev,
    [detailId]: (prev[detailId] || []).filter(t => t.id !== transferId)
  }));
};

// Function to update transfer data
const updateOwnerTransfer = (detailId: string, transferId: string, updates: any) => {
  setOwnerTransfers(prev => ({
    ...prev,
    [detailId]: (prev[detailId] || []).map(transfer =>
      transfer.id === transferId ? { ...transfer, ...updates } : transfer
    )
  }));
};

//   const getSNoTypesFromSlabs = () => {
//   const sNoTypes = new Map<string, "s_no" | "block_no" | "re_survey_no">();
  
//   // Process main slab S.Nos
//   yearSlabs.forEach(slab => {
//     if (slab.sNo) {
//       sNoTypes.set(slab.sNo, slab.sNoType);
//     }
//   });
  
//   // Process paiky entries
//   yearSlabs.forEach(slab => {
//     slab.paikyEntries.forEach(entry => {
//       if (entry.sNo) {
//         sNoTypes.set(entry.sNo, entry.sNoType);
//       }
//     });
//   });
  
//   // Process ekatrikaran entries
//   yearSlabs.forEach(slab => {
//     slab.ekatrikaranEntries.forEach(entry => {
//       if (entry.sNo) {
//         sNoTypes.set(entry.sNo, entry.sNoType);
//       }
//     });
//   });
  
//   return sNoTypes;
// };

// Add function to manage affected nondh details
const addAffectedNondh = (detailId: string) => {
  setAffectedNondhDetails(prev => ({
    ...prev,
    [detailId]: [
      ...(prev[detailId] || []),
      {
        id: Date.now().toString(),
        nondhNo: '',
        status: 'valid',
        invalidReason: ''
      }
    ]
  }));
};

const removeAffectedNondh = (detailId: string, affectedId: string) => {
  setAffectedNondhDetails(prev => ({
    ...prev,
    [detailId]: (prev[detailId] || []).filter(a => a.id !== affectedId)
  }));
};

const updateAffectedNondh = (detailId: string, affectedId: string, updates: any) => {
  setAffectedNondhDetails(prev => ({
    ...prev,
    [detailId]: (prev[detailId] || []).map(affected =>
      affected.id === affectedId ? { ...affected, ...updates } : affected
    )
  }));
  
};

  const handleGanotChange = (detailId: string, ganot: string) => {
  updateNondhDetail(detailId, { ganot });
  
  // Create default transfer for 1st Right if none exists
  if (ganot === "1st Right" && (!ownerTransfers[detailId] || ownerTransfers[detailId].length === 0)) {
    addOwnerTransfer(detailId);
  }
};

const updateAffectedNondhValidityChain = (detailId: string, affectedNondhNo: string, newStatus: string) => {
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  
  // Find the affected nondh by number
  const affectedNondh = allSortedNondhs.find(n => 
    n.number.toString() === affectedNondhNo
  );
  
  if (!affectedNondh) return;

  // Update the actual nondh detail's status
  const affectedDetail = nondhDetails.find(d => d.nondhId === affectedNondh.id);
  
  if (affectedDetail) {
    // Update the state immediately
    setNondhDetails(prev => prev.map(detail => 
      detail.id === affectedDetail.id 
        ? { ...detail, status: newStatus }
        : detail
    ));
    
    // Process validity chain with the updated state
    const updatedDetails = nondhDetails.map(detail => 
      detail.id === affectedDetail.id 
        ? { ...detail, status: newStatus }
        : detail
    );
    
    processValidityChain(updatedDetails);
  }
};

// processValidityChainFromNondh function
const processValidityChainFromNondh = (startIndex: number, changedStatus: string, updatedData: NondhDetail[]) => {
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  
  // Create a map for faster lookup
  const nondhDetailMap = new Map();
  updatedData.forEach(detail => {
    nondhDetailMap.set(detail.nondhId, detail);
  });
  
  // Process all nondhs that come before the changed nondh (inclusive of the changed one for counting)
  for (let i = 0; i < startIndex; i++) {
    const nondh = allSortedNondhs[i];
    const detail = nondhDetailMap.get(nondh.id);
    
    if (detail) {
      // Count invalid nondhs that come after this one (including the changed one)
      let invalidCount = 0;
      for (let j = i + 1; j <= startIndex; j++) {
        const laterNondh = allSortedNondhs[j];
        const laterDetail = nondhDetailMap.get(laterNondh.id);
        if (laterDetail?.status === 'invalid') {
          invalidCount++;
        }
      }
      
      const shouldBeValid = invalidCount % 2 === 0;
      
      // Only update if validity needs to change
      const currentValidity = detail.ownerRelations.every(r => r.isValid);
      if (currentValidity !== shouldBeValid) {
        const updatedRelations = detail.ownerRelations.map(relation => ({
          ...relation,
          isValid: shouldBeValid
        }));
        
        updateNondhDetail(detail.id, { ownerRelations: updatedRelations });
      }
    }
  }
};

  const getAvailableOwnersForGanot = (ganotType: string, currentNondhId: string, currentSNos: string[]) => {
  // Get all nondhs sorted using the same logic as display
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  const currentIndex = allSortedNondhs.findIndex(n => n.id === currentNondhId);
  
  if (ganotType === "2nd Right") {
    // For 2nd Right, return all owners from nondhs that come BEFORE current nondh
    const previousNondhs = allSortedNondhs.slice(0, currentIndex);
    
    return previousNondhs
      .flatMap(nondh => {
        const detail = nondhDetails.find(d => d.nondhId === nondh.id);
        if (!detail) return [];
        
        const firstSNo = (() => {
          try {
            return JSON.parse(nondh.affectedSNos[0]).number;
          } catch (e) {
            return nondh.affectedSNos[0];
          }
        })();
        
        return detail.ownerRelations.map(r => ({ 
          id: r.id,
          name: r.ownerName, 
          area: r.area,
          sNo: firstSNo,
          nondhId: nondh.id,
          nondhType: detail.type
        }));
      })
      .filter(owner => owner.name.trim() !== '');
      
  } else if (ganotType === "1st Right") {
    const previousNondhs = allSortedNondhs.slice(0, currentIndex);
    
    // Get old owners (excluding 2nd Right from Hukam)
    const oldOwners = previousNondhs
      .filter(nondh => {
        const detail = nondhDetails.find(d => d.nondhId === nondh.id);
        return !(detail?.type === "Hukam" && detail?.ganot === "2nd Right");
      })
      .flatMap(nondh => {
        const detail = nondhDetails.find(d => d.nondhId === nondh.id);
        if (!detail) return [];
        
        const firstSNo = (() => {
          try {
            return JSON.parse(nondh.affectedSNos[0]).number;
          } catch (e) {
            return nondh.affectedSNos[0];
          }
        })();
        
        return detail.ownerRelations.map(r => ({ 
          id: r.id,
          name: r.ownerName, 
          area: r.area,
          sNo: firstSNo,
          nondhId: nondh.id,
          nondhType: detail.type,
          category: 'old'
        }));
      })
      .filter(owner => owner.name.trim() !== '');

    // Get new owners (2nd Right from previous Hukam nondhs)
    const newOwners = previousNondhs
      .filter(nondh => {
        const detail = nondhDetails.find(d => d.nondhId === nondh.id);
        return detail?.type === "Hukam" && detail?.ganot === "2nd Right";
      })
      .flatMap(nondh => {
        const detail = nondhDetails.find(d => d.nondhId === nondh.id);
        if (!detail) return [];
        
        const firstSNo = (() => {
          try {
            return JSON.parse(nondh.affectedSNos[0]).number;
          } catch (e) {
            return nondh.affectedSNos[0];
          }
        })();
        
        return detail.ownerRelations.map(r => ({ 
          id: r.id,
          name: r.ownerName, 
          area: r.area,
          sNo: firstSNo,
          nondhId: nondh.id,
          nondhType: detail.type,
          category: 'new'
        }));
      })
      .filter(owner => owner.name.trim() !== '');

    return { oldOwners, newOwners };
  }
  return [];
};

const getMinDateForNondh = (nondhId: string): string => {
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  const currentIndex = allSortedNondhs.findIndex(n => n.id === nondhId);
  
  if (currentIndex <= 0) return ''; // First nondh has no minimum date
  
  // Get the date of the previous nondh
  const prevNondhId = allSortedNondhs[currentIndex - 1].id;
  const prevDetail = nondhDetails.find(d => d.nondhId === prevNondhId);
  return prevDetail?.date || '';
};

const getMaxDateForNondh = (nondhId: string): string => {
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  const currentIndex = allSortedNondhs.findIndex(n => n.id === nondhId);
  
  if (currentIndex >= allSortedNondhs.length - 1) return ''; // Last nondh has no maximum date
  
  // Get the date of the next nondh
  const nextNondhId = allSortedNondhs[currentIndex + 1].id;
  const nextDetail = nondhDetails.find(d => d.nondhId === nextNondhId);
  return nextDetail?.date || '';
};

const isValidNondhDateOrder = (nondhId: string, newDate: string): boolean => {
  if (!newDate) return true;
  
  const minDate = getMinDateForNondh(nondhId);
  const maxDate = getMaxDateForNondh(nondhId);
  
  if (minDate && newDate <= minDate) return false;
  if (maxDate && newDate >= maxDate) return false;
  
  return true;
};

  const updateValidityChain = () => {
    const sortedNondhs = [...nondhs].sort(sortNondhs);
    const nondhDetailMap = new Map<string, NondhDetail>();
    nondhDetails.forEach(detail => {
      nondhDetailMap.set(detail.nondhId, detail);
    });

    const affectingCounts = new Map<string, number>();
    sortedNondhs.forEach((nondh, index) => {
      let count = 0;
      for (let i = index + 1; i < sortedNondhs.length; i++) {
        const affectingNondh = sortedNondhs[i];
        const affectingDetail = nondhDetailMap.get(affectingNondh.id);
        if (affectingDetail?.status === 'invalid') {
          count++;
        }
      }
      affectingCounts.set(nondh.id, count);
    });

    sortedNondhs.forEach(nondh => {
      const detail = nondhDetailMap.get(nondh.id);
      if (!detail) return;

      const affectingCount = affectingCounts.get(nondh.id) || 0;
      const shouldBeValid = affectingCount % 2 === 0;
      const currentValidity = detail.ownerRelations.every(r => r.isValid);
      
      if (currentValidity !== shouldBeValid) {
        const updatedRelations = detail.ownerRelations.map(relation => ({
          ...relation,
          isValid: shouldBeValid
        }));
        updateNondhDetail(detail.id, { ownerRelations: updatedRelations });
      }
    });
  };

  const handleHukamTypeChange = (detailId: string, hukamType: string) => {
  updateNondhDetail(detailId, { hukamType });
  
  // Reset ganot when changing hukam type
  if (hukamType !== "ALT Krushipanch") {
    updateNondhDetail(detailId, { ganot: "" });
  }
};

  const updateHukamValidityChain = (detailId: string) => {
    const detail = nondhDetails.find(d => d.id === detailId);
    if (!detail || !detail.affectedNondhNo) return;

    const currentNondh = nondhs.find(n => n.id === detail.nondhId);
    if (!currentNondh) return;

    const allSortedNondhs = [...nondhs].sort(sortNondhs);
    const affectedNondh = allSortedNondhs.find(n => 
      safeNondhNumber(n).toString() === detail.affectedNondhNo
    );
    
    if (!affectedNondh) return;

    const currentIndex = allSortedNondhs.findIndex(n => n.id === detail.nondhId);
    const affectedIndex = allSortedNondhs.findIndex(n => n.id === affectedNondh.id);

    const affectedNondhIds = allSortedNondhs
      .slice(affectedIndex, currentIndex)
      .map(n => n.id);

    const shouldBeValid = detail.hukamStatus === "valid";
    
    affectedNondhIds.forEach(nondhId => {
      const affectedDetail = nondhDetails.find(d => d.nondhId === nondhId);
      if (affectedDetail) {
        const updatedRelations = affectedDetail.ownerRelations.map(relation => ({
          ...relation,
          isValid: shouldBeValid
        }));
        updateNondhDetail(affectedDetail.id, { 
          ownerRelations: updatedRelations
        });
      }
    });
  };

  const getPreviousOwners = (sNo: string, currentNondhId: string) => {
    return nondhDetails
      .filter(d => 
        d.sNo === sNo && 
        d.nondhId !== currentNondhId &&
        ["Varsai", "Hakkami", "Vechand", "Kabjedaar", "Ekatrikaran", "Hayati_ma_hakh_dakhal"].includes(d.type)
      )
      .sort((a, b) => sortNondhsBySNoType(a, b, nondhs))
      .flatMap(d => d.ownerRelations.map(r => ({ 
        name: r.ownerName, 
        area: r.area,
        type: d.type,
        nondhId: d.nondhId
      })))
      .filter(owner => owner.name.trim() !== '');
  };

  const sortNondhsBySNoType = (a: NondhDetail, b: NondhDetail, nondhs: any[]): number => {
    const sNoTypes = getSNoTypesFromSlabs();
    const nondhA = nondhs.find(n => n.id === a.nondhId);
    const nondhB = nondhs.find(n => n.id === b.nondhId);
    
    const getPrimaryType = (nondh: any): string => {
      if (!nondh) return 's_no';
      const types = nondh.affectedSNos.map((sNo: string) => sNoTypes.get(sNo) || 's_no');
      if (types.includes('s_no')) return 's_no';
      if (types.includes('block_no')) return 'block_no';
      return 're_survey_no';
    };

    const typeA = getPrimaryType(nondhA);
    const typeB = getPrimaryType(nondhB);
    
    const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
    const priorityA = priorityOrder.indexOf(typeA);
    const priorityB = priorityOrder.indexOf(typeB);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    const aFirstSNo = nondhA?.affectedSNos[0] || '';
    const bFirstSNo = nondhB?.affectedSNos[0] || '';
    const sNoCompare = aFirstSNo.localeCompare(bFirstSNo, undefined, { numeric: true });
    if (sNoCompare !== 0) return sNoCompare;
    
    const aNondhNo = nondhA ? getNondhNumber(nondhA) : 0;
    const bNondhNo = nondhB ? getNondhNumber(nondhB) : 0;
    return aNondhNo - bNondhNo;
  };

  // Form update functions
  const updateNondhDetail = (id: string, updates: Partial<NondhDetail>) => {
    setNondhDetails(prev => prev.map(detail => (detail.id === id ? { ...detail, ...updates } : detail)))
  }

  const toggleCollapse = (detailId: string) => {
    setCollapsedNondhs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(detailId)) {
        newSet.delete(detailId)
      } else {
        newSet.add(detailId)
      }
      return newSet
    })
  }

  const toggleEqualDistribution = (detailId: string, checked: boolean) => {
    setEqualDistribution(prev => ({ ...prev, [detailId]: checked }))
    
    if (checked) {
      const detail = nondhDetails.find(d => d.id === detailId)
      if (detail && detail.ownerRelations.length > 1) {
        const oldOwnerArea = detail.ownerRelations[0]?.area?.value || 0
        const newOwnersCount = detail.ownerRelations.length - 1
        const equalArea = oldOwnerArea / newOwnersCount
        
        const updatedRelations = detail.ownerRelations.map((relation, index) => {
          if (index === 0) return relation
          return { ...relation, area: { ...relation.area, value: equalArea } }
        })
        
        updateNondhDetail(detailId, { ownerRelations: updatedRelations })
      }
    }
  }

  const addOwnerRelation = (detailId: string) => {
    const detail = nondhDetails.find((d) => d.id === detailId)
    if (detail) {
      const newRelation = {
        id: Date.now().toString(),
        ownerName: "",
        sNo: detail.sNo,
        area: { value: 0, unit: "sq_m" },
        tenure: "Navi",
        isValid: true
      }
      const updatedRelations = [...detail.ownerRelations, newRelation]
      updateNondhDetail(detailId, { ownerRelations: updatedRelations })
      
      if (equalDistribution[detailId] && updatedRelations.length > 1) {
        const oldOwnerArea = updatedRelations[0]?.area?.value || 0
        const newOwnersCount = updatedRelations.length - 1
        const equalArea = oldOwnerArea / newOwnersCount
        
        const redistributed = updatedRelations.map((relation, index) => {
          if (index === 0) return relation
          return { ...relation, area: { ...relation.area, value: equalArea } }
        })
        
        updateNondhDetail(detailId, { ownerRelations: redistributed })
      }
    }
  }

  const removeOwnerRelation = (detailId: string, relationId: string) => {
    const detail = nondhDetails.find((d) => d.id === detailId)
    if (detail) {
      const updatedRelations = detail.ownerRelations.filter((r) => r.id !== relationId)
      updateNondhDetail(detailId, { ownerRelations: updatedRelations })
      
      if (equalDistribution[detailId] && updatedRelations.length > 1) {
        const oldOwnerArea = updatedRelations[0]?.area?.value || 0
        const newOwnersCount = updatedRelations.length - 1
        const equalArea = oldOwnerArea / newOwnersCount
        
        const redistributed = updatedRelations.map((relation, index) => {
          if (index === 0) return relation
          return { ...relation, area: { ...relation.area, value: equalArea } }
        })
        
        updateNondhDetail(detailId, { ownerRelations: redistributed })
      }
    }
  }

  const updateOwnerRelation = (detailId: string, relationId: string, updates: any) => {
    const detail = nondhDetails.find((d) => d.id === detailId)
    if (detail) {
      const updatedRelations = detail.ownerRelations.map((relation) =>
        relation.id === relationId ? { ...relation, ...updates } : relation,
      )
      updateNondhDetail(detailId, { ownerRelations: updatedRelations })
      
      if (detail.type === "Varsai" && !equalDistribution[detailId]) {
        const oldOwnerArea = updatedRelations[0]?.area?.value || 0
        const newOwnersTotal = updatedRelations.slice(1).reduce((sum, r) => sum + (r.area?.value || 0), 0)
        
        if (newOwnersTotal > oldOwnerArea) {
          toast({
            title: "Area validation error",
            description: "Total area for new owners cannot exceed old owner's area",
            variant: "destructive"
          })
        }
      }
    }
  }

  const handleFileUpload = async (file: File, detailId: string) => {
    try {
      setLoading(true)
      const path = `nondh-detail-documents/${Date.now()}_${file.name}`
      const url = await uploadFile(file, "land-documents", path)
      updateNondhDetail(detailId, { docUpload: url, hasDocuments: true })
      toast({ title: "File uploaded successfully" })
    } catch (error) {
      toast({ title: "Error uploading file", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const validateNondhDetails = (details: NondhDetail[]): { isValid: boolean; errors: string[] } => {
  const errors: string[] = [];
  
  details.forEach((detail, index) => {
    const nondhNumber = nondhs.find(n => n.id === detail.nondhId)?.number || index + 1;
    
    // Common required fields for all types
    if (!detail.type.trim()) {
      errors.push(`Nondh ${nondhNumber}: Type is required`);
    }
    if (!detail.date.trim()) {
      errors.push(`Nondh ${nondhNumber}: Date is required`);
    }

    // Owner name validation
    const hasValidOwnerName = detail.ownerRelations.some(rel => rel.ownerName.trim() !== "");
    const is1stRightHukam = detail.type === "Hukam" && detail.ganot === "1st Right";

    if (!hasValidOwnerName && !is1stRightHukam) {
      errors.push(`Nondh ${nondhNumber}: At least one owner name is required`);
    }
    
    // Status-specific validation - only Radd requires reason
    if (detail.status === "invalid" && (!detail.invalidReason || !detail.invalidReason.trim())) {
      errors.push(`Nondh ${nondhNumber}: Reason is required when status is Radd`);
    }
    
    // Type-specific validations
    switch (detail.type) {
      case "Vehchani":
      case "Varsai":
      case "Hakkami": 
      case "Vechand":
      case "Hayati_ma_hakh_dakhal":
        if (!detail.oldOwner || !detail.oldOwner.trim()) {
          errors.push(`Nondh ${nondhNumber}: Old Owner is required for ${detail.type} type`);
        }
        break;
        
      case "Hukam":
        if (!detail.hukamDate || !detail.hukamDate.trim()) {
          errors.push(`Nondh ${nondhNumber}: Hukam Date is required`);
        }
        // Validate affected nondh details
        const affectedDetails = affectedNondhDetails[detail.id] || [];
        affectedDetails.forEach((affected, idx) => {
          if (affected.status === "invalid" && (!affected.invalidReason || !affected.invalidReason.trim())) {
            errors.push(`Nondh ${nondhNumber}, Affected Nondh ${idx + 1}: Reason is required when status is Radd`);
          }
        });
        break;
    }
  });
  
  return {
    isValid: errors.length === 0,
    errors
  };
};

  const saveChanges = async () => {
  if (!hasChanges) return;
  
  try {
    setSaving(true);

    const validation = validateNondhDetails(nondhDetails);
    if (!validation.isValid) {
      toast({
        title: "Validation Error",
        description: validation.errors.join('; '),
        variant: "destructive"
      });
      return;
    }

    // Process validity chains and affected nondh details before saving
    const processedDetails = nondhDetails.map(detail => {
      // Remove the owner tenure copying logic since tenure is now per nondh
      return detail;
    });

    // Check for empty date values AFTER processedDetails is defined
    const detailsWithEmptyDates = processedDetails.filter(detail => 
      detail.date === "" || detail.hukamDate === ""
    );
    
    if (detailsWithEmptyDates.length > 0) {
      console.log("Found details with empty dates:", detailsWithEmptyDates);
      // Convert empty strings to null
      detailsWithEmptyDates.forEach(detail => {
        if (detail.date === "") detail.date = null;
        if (detail.hukamDate === "") detail.hukamDate = null;
      });
    }

    // Update validity chains for invalid status changes
    processedDetails.forEach(detail => {
      if (detail.status === 'invalid') {
        const allSortedNondhs = [...nondhs].sort(sortNondhs);
        const currentIndex = allSortedNondhs.findIndex(n => n.id === detail.nondhId);
        if (currentIndex !== -1) {
          processValidityChainFromNondh(currentIndex, 'invalid', processedDetails);
        }
      }
      
      // Update validity chain for Hukam with affected nondhs
      if (detail.type === "Hukam" && affectedNondhDetails[detail.id]) {
        affectedNondhDetails[detail.id].forEach(affected => {
          if (affected.nondhNo && affected.status) {
            updateAffectedNondhValidityChain(detail.id, affected.nondhNo, affected.status);
          }
        });
      }
    });

    // Transform data before saving with enhanced affected nondh details
    const changes = processedDetails.map(detail => {
      const transformedDetail = {
        ...transformForDB(detail),
        // Ensure old_owner contains the name, not just ID
        old_owner: detail.oldOwner?.includes('-') 
          ? processedDetails.find(d => d.nondhId === detail.oldOwner)?.ownerRelations[0]?.ownerName 
            || detail.oldOwner
          : detail.oldOwner,
        // Add affected nondh details for Hukam types
        affected_nondh_details: affectedNondhDetails[detail.id] && affectedNondhDetails[detail.id].length > 0 
          ? JSON.stringify(affectedNondhDetails[detail.id].map(a => ({
              id: a.id,
              nondhNo: a.nondhNo,
              status: a.status,
              invalidReason: a.invalidReason || null
            }))) 
          : null
      };

      return { 
        id: detail.id, 
        changes: transformedDetail
      };
    });

    // Save nondh details
    for (const change of changes) {
      const detail = processedDetails.find(d => d.id === change.id);
      
      if (detail && detail.id && !detail.id.toString().startsWith('temp_')) {
        const { data: updatedDetail, error } = await LandRecordService.updateNondhDetail(
          detail.id, 
          change.changes
        );
        
        if (error) {
          console.error('Error updating detail:', error);
          throw error;
        }
      } else {
        // New record - create it
        const { data: newDetail, error } = await LandRecordService.createNondhDetail({
          ...change.changes,
          land_record_id: recordId // Make sure to include land_record_id
        });
        
        if (error) {
          console.error('Error creating detail:', error);
          throw error;
        }
      }
    }

    // Handle owner relations
    for (const detail of processedDetails) {
      const originalDetail = originalDetails.find(d => d.id === detail.id);
      if (!originalDetail) continue;
      
      // Process all owner relations (both new and existing)
      for (const relation of detail.ownerRelations) {
        const originalRelation = originalDetail.ownerRelations.find(r => r.id === relation.id);
        
        if (!originalRelation) {
          // New relation - create with proper nondh_detail_id
          await LandRecordService.createNondhOwnerRelation({
            ...transformOwnerRelationForDB(relation),
            nondh_detail_id: detail.id
          });
        } else {
          // Existing relation - update
          if (relation.id && !relation.id.toString().startsWith('temp_')) {
            await LandRecordService.updateNondhOwnerRelation(
              relation.id,
              transformOwnerRelationForDB(relation)
            );
          }
        }
      }
      
      // Handle deleted relations
      if (originalDetail.ownerRelations) {
        const currentRelationIds = detail.ownerRelations.map(r => r.id);
        const deletedRelations = originalDetail.ownerRelations.filter(
          r => r.id && !currentRelationIds.includes(r.id)
        );
        
        for (const deletedRelation of deletedRelations) {
          if (deletedRelation.id && !deletedRelation.id.toString().startsWith('temp_')) {
            await LandRecordService.deleteNondhOwnerRelation(deletedRelation.id);
          }
        }
      }
    }

    // Refresh data to get updated validity states
    const { data: updatedDetails, error: refreshError } = await LandRecordService.getNondhDetailsWithRelations(recordId || '');
    if (refreshError) throw refreshError;

    const transformed = (updatedDetails || []).map((detail: any) => ({
      id: detail.id,
      nondhId: detail.nondh_id,
      sNo: detail.s_no,
      type: detail.type,
      date: detail.date || "",
      vigat: detail.vigat || "",
      status: detail.status || "valid",
      invalidReason: detail.invalid_reason || "",
      showInOutput: detail.show_in_output !== false,
      hasDocuments: detail.has_documents || false,
      docUpload: detail.doc_upload_url || "",
      oldOwner: detail.old_owner || "",
      hukamDate: detail.hukam_date || "",
      hukamType: detail.hukam_type || "SSRD",
      hukamStatus: detail.hukam_status || "valid",
      hukamInvalidReason: detail.hukam_invalid_reason || "",
      ganot: detail.ganot || "",
      restrainingOrder: detail.restraining_order || "no",
      sdDate: detail.sd_date || "",
      tenure: detail.tenure || "Navi",
      amount: detail.amount || null,
      affectedNondhDetails: detail.affected_nondh_details 
        ? JSON.parse(detail.affected_nondh_details) 
        : [],
      ownerRelations: (detail.owner_relations || []).map((rel: any) => ({
        id: rel.id,
        ownerName: rel.owner_name,
        sNo: rel.s_no,
        area: {
          value: rel.square_meters || (rel.acres * SQM_PER_ACRE + rel.gunthas * SQM_PER_GUNTHA),
          unit: rel.area_unit as 'acre_guntha' | 'sq_m',
          acres: rel.acres,
          gunthas: rel.gunthas
        },
        isValid: rel.is_valid !== false,
        surveyNumber: rel.survey_number || "",
        surveyNumberType: rel.survey_number_type || "s_no"
      }))
    }));

    // Update local state with fresh data
    setNondhDetails(transformed);
    setOriginalDetails(transformed);
    
    // Refresh affected nondh details state
    const refreshedAffectedDetails = {};
    transformed.forEach(detail => {
      if (detail.affectedNondhDetails && detail.affectedNondhDetails.length > 0) {
        refreshedAffectedDetails[detail.id] = detail.affectedNondhDetails.map((affected, index) => ({
          ...affected,
          id: affected.id || `existing_${detail.id}_${index}`
        }));
      }
    });
    setAffectedNondhDetails(refreshedAffectedDetails);
    setOriginalAffectedNondhDetails(refreshedAffectedDetails);
    
    setHasChanges(false);
    
    toast({ title: "Changes saved successfully" });
    setCurrentStep(6);
    
  } catch (error) {
    console.error('Error saving changes:', error);
    toast({
      title: "Error saving changes",
      description: error instanceof Error ? error.message : "Unknown error occurred",
      variant: "destructive"
    });
  } finally {
    setSaving(false);
  }
};
  const transformForDB = (data: any) => {
  return {
    nondh_id: data.nondhId,
    s_no: data.sNo,
    type: data.type,
    date: data.date || null,
    vigat: data.vigat,
    status: data.status,
    invalid_reason: data.invalidReason,
    show_in_output: data.showInOutput,
    has_documents: data.hasDocuments,
    doc_upload_url: data.docUpload,
    old_owner: data.oldOwner,
    hukam_status: data.hukamStatus,
    hukam_invalid_reason: data.hukamInvalidReason,
    affected_nondh_no: data.affectedNondhNo,
    hukam_type: data.hukamType,
    hukam_date: data.hukamDate,
    ganot: data.ganot,
    tenure: data.tenure,
    restraining_order: data.restrainingOrder === 'yes',
    affected_nondh_details: affectedNondhDetails[data.id] && affectedNondhDetails[data.id].length > 0 
      ? JSON.stringify(affectedNondhDetails[data.id]) 
      : null
  }
}

  const transformOwnerRelationForDB = (data: any) => {
  const isAcreGuntha = data.area?.unit === 'acre_guntha';
  return {
    owner_name: data.ownerName,
    s_no: data.sNo,
    acres: isAcreGuntha ? data.area?.acres : null,
    gunthas: isAcreGuntha ? data.area?.gunthas : null,
    square_meters: isAcreGuntha ? null : data.area?.value,
    area_unit: data.area?.unit || 'sq_m',
    is_valid: data.isValid,
    survey_number: data.surveyNumber || null,
survey_number_type: data.surveyNumberType || null
  }
}

  // Render functions from original component
  const renderOwnerSelectionFields = (detail: NondhDetail) => {
  const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
  
  const hakkamiPreviousOwners = detail.type === "Hakkami" 
    ? getPreviousOwners(detail.sNo, detail.nondhId)
    : [];

  return (
    <div className="space-y-4">
      {/* SD Date and Amount fields for Vechand */}
      {detail.type === "Vechand" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>SD Date</Label>
            <Input
              type="date"
              value={detail.sdDate || ''}
              onChange={(e) => {
    const value = e.target.value;
    updateNondhDetail(detail.id, { 
      date: value === '' ? null : value  // Convert empty string to null
    });
  }}
            />
          </div>
          <div className="space-y-2">
            <Label>Amount</Label>
            <Input
              type="number"
              value={detail.amount || ''}
              onChange={(e) => updateNondhDetail(detail.id, { amount: parseFloat(e.target.value) || 0 })}
              placeholder="Enter amount"
            />
          </div>
        </div>
      )}

      {/* Old Owner Field - shown for all types */}
      <div className="space-y-2">
        <Label>Old Owner *</Label>
        <Select
          value={detail.oldOwner}
          onValueChange={(value) => {
            const selectedOwner = previousOwners.find(owner => 
              owner.name === value
            );
            
            if (selectedOwner) {
              // For Hakkami, replace owner relations with old owner only
              if (detail.type === "Hakkami") {
                const oldOwnerRelation = {
                  id: Date.now().toString(),
                  ownerName: selectedOwner.name,
                  sNo: detail.sNo,
                  area: selectedOwner.area,
                  tenure: "Navi",
                  isValid: true
                };
                
                updateNondhDetail(detail.id, { 
                  oldOwner: selectedOwner.name,
                  ownerRelations: [oldOwnerRelation] 
                });
              } else {
                updateNondhDetail(detail.id, { 
                  oldOwner: selectedOwner.name
                });
              }
            }
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select Old Owner" />
          </SelectTrigger>
          <SelectContent>
            {previousOwners.map((owner, index) => (
              <SelectItem key={`${owner.name}_${index}`} value={owner.name}>
                {owner.name} ({owner.area.value} {owner.area.unit})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Hakkami Section */}
      {detail.type === "Hakkami" && (
        <div className="space-y-4">
          {/* Equal distribution checkbox */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`equal_dist_${detail.id}`}
              checked={equalDistribution[detail.id] || false}
              onCheckedChange={(checked) => toggleEqualDistribution(detail.id, checked as boolean)}
            />
            <Label htmlFor={`equal_dist_${detail.id}`}>Equal Distribution of Land</Label>
          </div>

          {/* Available Previous Owners as Checkboxes for NEW owners only */}
          <div className="space-y-2">
            <Label>Select New Owners *</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
              {hakkamiPreviousOwners
                .filter(owner => owner.name !== detail.oldOwner)
                .map((owner, index) => {
                  const isSelected = detail.ownerRelations.some(rel => 
                    rel.ownerName === owner.name && rel.ownerName !== detail.oldOwner
                  );
                  
                  return (
                    <div key={`hakkami_${owner.name}_${index}`} className="flex items-center space-x-2 mb-2">
                      <Checkbox
                        id={`hakkami_owner_${index}`}
                        checked={isSelected}
                        onCheckedChange={(checked) => {
                          const oldOwnerRelation = detail.ownerRelations.find(rel => rel.ownerName === detail.oldOwner);
                          const oldOwnerArea = oldOwnerRelation?.area?.value || 0;
                          
                          let updatedRelations = [...detail.ownerRelations];
                          
                          if (checked) {
                            const newRelation = {
                              id: Date.now().toString(),
                              ownerName: owner.name,
                              sNo: detail.sNo,
                              area: { value: 0, unit: owner.area.unit },
                              tenure: "Navi",
                              isValid: true
                            };
                            updatedRelations.push(newRelation);
                          } else {
                            updatedRelations = updatedRelations.filter(rel => 
                              rel.ownerName !== owner.name || rel.ownerName === detail.oldOwner
                            );
                          }
                          
                          updateNondhDetail(detail.id, { ownerRelations: updatedRelations });
                        }}
                      />
                      <Label htmlFor={`hakkami_owner_${index}`} className="flex-1">
                        {owner.name} ({owner.area.value} {owner.area.unit})
                      </Label>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* Equal distribution checkbox - shown for Hayati, Varsai, and Vechand */}
      {(detail.type === "Hayati_ma_hakh_dakhal" || detail.type === "Varsai" || detail.type === "Vechand") && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`equal_dist_${detail.id}`}
            checked={equalDistribution[detail.id] || false}
            onCheckedChange={(checked) => toggleEqualDistribution(detail.id, checked as boolean)}
          />
          <Label htmlFor={`equal_dist_${detail.id}`}>Equal Distribution of Land</Label>
        </div>
      )}

      {/* Owner Details Section for Hayati, Varsai, and Vechand */}
      {(detail.type === "Varsai" || detail.type === "Hayati_ma_hakh_dakhal" || detail.type === "Vechand") && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>New Owner Details</Label>
            <Button size="sm" onClick={() => addOwnerRelation(detail.id)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Owner
            </Button>
          </div>

          {detail.ownerRelations.map((relation, index) => (
            <Card key={relation.id} className="p-3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">New Owner {index + 1}</h4>
                {detail.ownerRelations.length > 1 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => removeOwnerRelation(detail.id, relation.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={relation.ownerName}
                    onChange={(e) => updateOwnerRelation(detail.id, relation.id, { ownerName: e.target.value })}
                    placeholder="Enter new owner name"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Area</Label>
                {areaFields({
                  area: relation.area,
                  onChange: (newArea) => updateOwnerRelation(detail.id, relation.id, { area: newArea }),
                  disabled: equalDistribution[detail.id]
                })}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

  const renderTypeSpecificFields = (detail: NondhDetail) => {
  // Handle types that need owner selection
  if (["Hayati_ma_hakh_dakhal", "Varsai", "Hakkami", "Vechand", "Vehchani"].includes(detail.type)) {
    return renderOwnerSelectionFields(detail);
  }

  switch (detail.type) {
    case "Kabjedaar":
    case "Ekatrikaran":
      return (
        <div className="space-y-4">

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Owner Details</Label>
              <Button size="sm" onClick={() => addOwnerRelation(detail.id)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Owner
              </Button>
            </div>

            {detail.ownerRelations.map((relation, index) => (
              <Card key={relation.id} className="p-3">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Owner {index + 1}</h4>
                  {detail.ownerRelations.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOwnerRelation(detail.id, relation.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Owner Name</Label>
                    <Input
                      value={relation.ownerName}
                      onChange={(e) => updateOwnerRelation(detail.id, relation.id, { 
                        ownerName: e.target.value 
                      })}
                      placeholder="Enter owner name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Area</Label>
                    {areaFields({
                      area: relation.area,
                      onChange: (newArea) => updateOwnerRelation(
                        detail.id, 
                        relation.id, 
                        { area: newArea }
                      )
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )

    case "Durasti":
    case "Promulgation":
      return (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Owner Details with Survey Numbers</Label>
              <Button size="sm" onClick={() => addOwnerRelation(detail.id)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Owner
              </Button>
            </div>

            {detail.ownerRelations.map((relation, index) => (
              <Card key={relation.id} className="p-3">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Owner {index + 1}</h4>
                  {detail.ownerRelations.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOwnerRelation(detail.id, relation.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="space-y-2 mb-3">
                  <Label>Owner Name</Label>
                  <Input
                    value={relation.ownerName}
                    onChange={(e) => updateOwnerRelation(detail.id, relation.id, { 
                      ownerName: e.target.value 
                    })}
                    placeholder="Enter owner name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                  <div className="space-y-2">
                    <Label>Survey Number</Label>
                    <Input
                      value={relation.surveyNumber || ''}
                      onChange={(e) => updateOwnerRelation(detail.id, relation.id, { 
                        surveyNumber: e.target.value 
                      })}
                      placeholder="Enter survey number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Survey Number Type</Label>
                    <Select
                      value={relation.surveyNumberType || 's_no'}
                      onValueChange={(value) => updateOwnerRelation(detail.id, relation.id, { 
                        surveyNumberType: value 
                      })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="s_no">Survey No</SelectItem>
                        <SelectItem value="block_no">Block No</SelectItem>
                        <SelectItem value="re_survey_no">Re-survey No</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Area</Label>
                    {areaFields({
                      area: relation.area,
                      onChange: (newArea) => updateOwnerRelation(detail.id, relation.id, { 
                        area: newArea 
                      })
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      );

    case "Bojo":
      return (
        <div className="space-y-4">
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Owner Details</Label>
              <Button size="sm" onClick={() => addOwnerRelation(detail.id)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Owner
              </Button>
            </div>

            {detail.ownerRelations.map((relation, index) => (
              <Card key={relation.id} className="p-3">
                <div className="flex justify-between items-center mb-3">
                  <h4 className="font-medium">Owner {index + 1}</h4>
                  {detail.ownerRelations.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOwnerRelation(detail.id, relation.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="space-y-2">
                    <Label>Owner Name</Label>
                    <Input
                      value={relation.ownerName}
                      onChange={(e) => updateOwnerRelation(detail.id, relation.id, { 
                        ownerName: e.target.value 
                      })}
                      placeholder="Enter owner name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Area</Label>
                    {areaFields({
                      area: relation.area,
                      onChange: (newArea) => updateOwnerRelation(detail.id, relation.id, { 
                        area: newArea 
                      })
                    })}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )

    case "Hukam":
      return (
        <div className="space-y-6">
          <div className="space-y-2">
            <Label>Restraining Order Passed?</Label>
            <RadioGroup
              value={detail.restrainingOrder || "no"}
              onValueChange={(value) => updateNondhDetail(detail.id, { restrainingOrder: value })}
              className="flex gap-6"
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="yes" id={`yes_${detail.id}`} />
                <Label htmlFor={`yes_${detail.id}`}>Yes</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="no" id={`no_${detail.id}`} />
                <Label htmlFor={`no_${detail.id}`}>No</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Affected Nondh Management */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label>Affected Nondh Numbers (Optional)</Label>
              <Button size="sm" onClick={() => addAffectedNondh(detail.id)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Affected Nondh
              </Button>
            </div>

            {(affectedNondhDetails[detail.id] || []).map((affected) => {
              const currentNondh = nondhs.find(n => n.id === detail.nondhId);
              if (!currentNondh) return null;

              const allSortedNondhs = [...nondhs].sort(sortNondhs);
              const currentIndex = allSortedNondhs.findIndex(n => n.id === detail.nondhId);
              const sortedOriginalNondhs = allSortedNondhs.slice(0, currentIndex);

              return (
                <Card key={affected.id} className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Affected Nondh</h4>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeAffectedNondh(detail.id, affected.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Nondh Number</Label>
                      {sortedOriginalNondhs.length === 0 ? (
                        <Select disabled>
                          <SelectTrigger>
                            <SelectValue placeholder="No previous nondhs available" />
                          </SelectTrigger>
                        </Select>
                      ) : (
                        <Select
                          value={affected.nondhNo}
                          onValueChange={(value) => updateAffectedNondh(detail.id, affected.id, { nondhNo: value })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select nondh" />
                          </SelectTrigger>
                          <SelectContent className="max-h-[300px] overflow-y-auto">
                            {sortedOriginalNondhs.map(nondh => {
                              const nondhDetail = nondhDetails.find(d => d.nondhId === nondh.id);
                              const type = nondhDetail?.type || 'Nondh';
                              const primaryType = getPrimarySNoType(nondh.affectedSNos);
                              const typeLabel = 
                                primaryType === 'block_no' ? 'Block' :
                                primaryType === 're_survey_no' ? 'Resurvey' : 
                                'Survey';

                              return (
                                <SelectItem key={nondh.id} value={nondh.number.toString()}>
                                  <div className="flex flex-col">
                                    <span className="font-medium">Nondh No: {nondh.number}</span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                      <span className="text-xs px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 rounded">
                                        {typeLabel} No: {nondh.affectedSNos[0] || ''}
                                      </span>
                                      <span className="text-xs px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 rounded">
                                        Type: {type}
                                      </span>
                                    </div>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Hukam Status</Label>
                      <Select
                        value={affected.status}
                        onValueChange={(value) => {
  // Update UI state first
  updateAffectedNondh(detail.id, affected.id, { 
    status: value,
    invalidReason: value === "invalid" ? affected.invalidReason : ""
  });
  
  // Update the actual nondh status in the backend data
  if (affected.nondhNo) {
    // Find the actual nondh detail that corresponds to this affected nondh number
    const affectedNondh = nondhs.find(n => n.number.toString() === affected.nondhNo);
    if (affectedNondh) {
      const affectedDetail = nondhDetails.find(d => d.nondhId === affectedNondh.id);
      if (affectedDetail) {
        handleStatusChange(affectedDetail.id, value);
      }
    }
  }
}}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {statusTypes.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2 mt-4">
                    <Label>
                      Reason {affected.status === "invalid" ? "*" : "(Optional)"}
                    </Label>
                    <Input
                      value={affected.invalidReason || ''}
                      onChange={(e) => updateAffectedNondh(detail.id, affected.id, { 
                        invalidReason: e.target.value 
                      })}
                      placeholder={affected.status === "invalid" ? "Enter reason for invalidation" : "Enter reason (optional)"}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
          {/* Ganot field for ALT Krushipanch */}
          {detail.hukamType === "ALT Krushipanch" && (
            <div className="space-y-2">
              <Label>Ganot *</Label>
              <Select
                value={detail.ganot || ''}
                onValueChange={(value) => handleGanotChange(detail.id, value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Ganot" />
                </SelectTrigger>
                <SelectContent>
                  {ganotOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Ganot-specific owner handling */}
          {detail.ganot === "2nd Right" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Owner Details</Label>
                <Button size="sm" onClick={() => addOwnerRelation(detail.id)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Owner
                </Button>
              </div>

              {detail.ownerRelations.map((relation, index) => (
                <Card key={relation.id} className="p-3">
                  <div className="flex justify-between items-center mb-3">
                    <h4 className="font-medium">Owner {index + 1}</h4>
                    {detail.ownerRelations.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeOwnerRelation(detail.id, relation.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>

                  <div className="space-y-2 mb-3">
                    <Label>Owner Name</Label>
                    <Input
                      value={relation.ownerName}
                      onChange={(e) => updateOwnerRelation(detail.id, relation.id, { 
                        ownerName: e.target.value 
                      })}
                      placeholder="Enter owner name"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>Area</Label>
                    {areaFields({
                      area: relation.area,
                      onChange: (newArea) => updateOwnerRelation(detail.id, relation.id, { 
                        area: newArea 
                      })
                    })}
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* 1st Right - Transfer Management */}
          {detail.ganot === "1st Right" && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Owner Transfers</Label>
                <Button size="sm" onClick={() => addOwnerTransfer(detail.id)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Transfer
                </Button>
              </div>

              {(ownerTransfers[detail.id] || []).map((transfer, transferIndex) => {
                const currentNondh = nondhs.find(n => n.id === detail.nondhId);
                const currentSNos = currentNondh?.affectedSNos || [];
                const availableOwners = getAvailableOwnersForGanot("1st Right", detail.nondhId, currentSNos);
                const isEqualDistribution = transferEqualDistribution[detail.id]?.[transfer.id] || false;
                
                return (
                  <Card key={transfer.id} className="p-4">
                    <div className="flex justify-between items-center mb-4">
                      <h4 className="font-medium">Transfer {transferIndex + 1}</h4>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeOwnerTransfer(detail.id, transfer.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    <div className="space-y-2 mb-4">
                      <Label>Old Owner *</Label>
                      <Select
                        value={transfer.oldOwner}
                        onValueChange={(value) => {
                          const selectedOwner = availableOwners.oldOwners?.find(o => o.id === value);
                          updateOwnerTransfer(detail.id, transfer.id, {
                            oldOwner: value,
                            oldOwnerArea: selectedOwner?.area || { value: 0, unit: 'sq_m' }
                          });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select old owner" />
                        </SelectTrigger>
                        <SelectContent>
                          {(availableOwners.oldOwners || []).map((owner) => (
                            <SelectItem key={owner.id} value={owner.id}>
                              {owner.name} - {owner.area.value} {owner.area.unit}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex items-center space-x-2 mb-4">
                      <Checkbox
                        id={`equal_dist_${detail.id}_${transfer.id}`}
                        checked={isEqualDistribution}
                        onCheckedChange={(checked) => {
                          setTransferEqualDistribution(prev => ({
                            ...prev,
                            [detail.id]: {
                              ...prev[detail.id],
                              [transfer.id]: checked as boolean
                            }
                          }));
                        }}
                        disabled={(transfer.newOwners?.length || 0) <= 1}
                      />
                      <Label htmlFor={`equal_dist_${detail.id}_${transfer.id}`}>
                        Equal Distribution of Land
                      </Label>
                    </div>

                    <div className="space-y-2 mb-4">
                      <Label>New Owners *</Label>
                      <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
                        {(availableOwners.newOwners || []).map((owner) => (
                          <div key={owner.id} className="flex items-center space-x-2 mb-2">
                            <Checkbox
                              id={`new_owner_${owner.id}`}
                              checked={(transfer.newOwners || []).includes(owner.id)}
                              onCheckedChange={(checked) => {
                                const updatedNewOwners = checked
                                  ? [...(transfer.newOwners || []), owner.id]
                                  : (transfer.newOwners || []).filter(id => id !== owner.id);
                                
                                updateOwnerTransfer(detail.id, transfer.id, { 
                                  newOwners: updatedNewOwners 
                                });
                              }}
                            />
                            <Label htmlFor={`new_owner_${owner.id}`} className="flex-1">
                              {owner.name} - {owner.area.value} {owner.area.unit}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Area Distribution for Selected New Owners */}
                    {(transfer.newOwners || []).length > 0 && (
                      <div className="space-y-3">
                        <Label>Area Distribution for New Owners</Label>
                        {(transfer.newOwners || []).map((ownerId) => {
                          const owner = (availableOwners.newOwners || []).find(o => o.id === ownerId);
                          const currentArea = (transfer.newOwnerAreas || []).find(a => a.ownerId === ownerId)?.area || { value: 0, unit: 'sq_m' };
                          
                          return (
                            <div key={ownerId} className="flex items-center gap-3 p-2 border rounded">
                              <span className="min-w-0 flex-1 font-medium">{owner?.name}</span>
                              <div className="flex-shrink-0">
                                {areaFields({
                                  area: currentArea,
                                  onChange: (newArea) => {
                                    if (isEqualDistribution) return;
                                    
                                    const updatedAreas = (transfer.newOwnerAreas || []).filter(a => a.ownerId !== ownerId);
                                    updatedAreas.push({ ownerId, area: newArea });
                                    updateOwnerTransfer(detail.id, transfer.id, { newOwnerAreas: updatedAreas });
                                  },
                                  disabled: isEqualDistribution
                                })}
                              </div>
                            </div>
                          );
                        })}
                        
                        {/* Area validation display */}
                        <div className="text-sm text-muted-foreground">
                          {(() => {
                            const totalNewOwnerArea = (transfer.newOwnerAreas || []).reduce((sum, area) => sum + area.area.value, 0);
                            const oldOwnerArea = transfer.oldOwnerArea?.value || 0;
                            const remaining = oldOwnerArea - totalNewOwnerArea;
                            
                            return (
                              <div className={`p-2 rounded ${remaining < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                                Old Owner Area: {oldOwnerArea} | New Owners Total: {totalNewOwnerArea} | Remaining: {remaining}
                                {remaining < 0 && " (⚠️ Exceeds old owner area!)"}
                                {isEqualDistribution && ` (Equal distribution: ${(oldOwnerArea / (transfer.newOwners?.length || 1)).toFixed(2)} each)`}
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    )}
                  </Card>
                );
              })}
            </div>
          )}

          {/* Regular owner details for non-ganot Hukam */}
          {(!detail.ganot || (detail.ganot !== "1st Right" && detail.ganot !== "2nd Right")) && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>Owner Details</Label>
                <Button size="sm" onClick={() => addOwnerRelation(detail.id)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Owner
                </Button>
              </div>

              {detail.ownerRelations.map((relation, index) => (
                <Card key={relation.id} className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Owner {index + 1}</h4>
                    {detail.ownerRelations.length > 1 && (
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeOwnerRelation(detail.id, relation.id)} 
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Owner Name</Label>
                      <Input
                        value={relation.ownerName}
                        onChange={(e) => updateOwnerRelation(detail.id, relation.id, { 
                          ownerName: e.target.value 
                        })}
                        placeholder="Enter owner name"
                      />
                    </div>

                    <div className="flex flex-col md:flex-row gap-4">
                      <div className="flex-1">
                        <Label>Area</Label>
                        {areaFields({
                          area: relation.area,
                          onChange: (newArea) => updateOwnerRelation(
                            detail.id, 
                            relation.id, 
                            { area: newArea }
                          )
                        })}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )

    default:
      return (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Owner Details</Label>
            <Button size="sm" onClick={() => addOwnerRelation(detail.id)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Owner
            </Button>
          </div>

          {detail.ownerRelations.map((relation, index) => (
            <Card key={relation.id} className="p-3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">Owner {index + 1}</h4>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeOwnerRelation(detail.id, relation.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={relation.ownerName}
                    onChange={(e) => updateOwnerRelation(
                      detail.id, 
                      relation.id, 
                      { ownerName: e.target.value }
                    )}
                    placeholder="Enter owner name"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Area</Label>
                  {areaFields({
                    area: relation.area,
                    onChange: (newArea) => updateOwnerRelation(
                      detail.id, 
                      relation.id, 
                      { area: newArea }
                    )
                  })}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )
  }
};

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nondh Details</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Nondh Details</CardTitle>
          
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 7/12 Documents Table */}
        {/* {documents712.length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Available 7/12 Documents</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>S.No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents712.map((doc, index) => (
                  <TableRow key={index}>
                    <TableCell>{doc.year}</TableCell>
                    <TableCell>{doc.s_no}</TableCell>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>{formatArea(doc.area)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )} */}

        {/* Nondh Details */}
        {nondhs
          .sort(sortNondhs)
          .map(nondh => {
            const detail = nondhDetails.find(d => d.nondhId === nondh.id);
            if (!detail) return null;

            return (
              <Card key={nondh.id} className="p-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        Nondh No: {nondh.number}
                      </h3>
                      <Badge variant={detail.status === 'invalid' ? 'destructive' : 'default'}>
                        {statusTypes.find(s => s.value === detail.status)?.label || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Affected Survey Numbers:
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-1">
  {nondh.affectedSNos
    ?.map(sNoItem => {
      // Parse the stringified JSON object
      try {
        const parsed = typeof sNoItem === 'string' ? JSON.parse(sNoItem) : sNoItem;
        return {
          number: parsed.number || sNoItem,
          type: parsed.type || 's_no'
        };
      } catch (e) {
        // Fallback if parsing fails
        return {
          number: sNoItem,
          type: 's_no'
        };
      }
    })
    .sort((a, b) => {
      const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
      const aPriority = priorityOrder.indexOf(a.type);
      const bPriority = priorityOrder.indexOf(b.type);
      if (aPriority !== bPriority) return aPriority - bPriority;
      return a.number.localeCompare(b.number, undefined, { numeric: true });
    })
    .map(({ number, type }) => (
      <span 
        key={`${number}-${type}`}
        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm"
      >
        {number} ({type})
      </span>
    ))}
</div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCollapse(nondh.id)}
                    className="flex items-center gap-1"
                  >
                    {collapsedNondhs.has(nondh.id) ? (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>Show Details</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Hide Details</span>
                      </>
                    )}
                  </Button>
                </div>

                {!collapsedNondhs.has(nondh.id) && (
                  <div className="mt-4 space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
                          <Label>Nondh Type *</Label>
                          <Select
                            value={detail.type}
                            onValueChange={(value) => updateNondhDetail(detail.id, { type: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {nondhTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Date *</Label>
                          <Input
  type="date"
  value={detail.date || ''}
  min={getMinDateForNondh(nondh.id)}
  max={getMaxDateForNondh(nondh.id)}
  onChange={(e) => {
    const newDate = e.target.value;
    if (isValidNondhDateOrder(nondh.id, newDate)) {
      updateNondhDetail(detail.id, { date: newDate });
    } else {
      toast({
        title: "Invalid Date",
        description: "Nondh dates must be in ascending order",
        variant: "destructive"
      });
    }
  }}
/>
                        </div>
                        <div className="space-y-2">
                          <Label>Tenure Type</Label>
                          <Select
                            value={detail.tenure || "Navi"}
                            onValueChange={(value) => updateNondhDetail(detail.id, { tenure: value })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {tenureTypes.map((type) => (
                                <SelectItem key={type} value={type}>
                                  {type}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

{/* Hukam-specific fields - add these after tenure type */}
{detail.type === "Hukam" && (
  <>
    <div className="space-y-2">
      <Label>Hukam Type *</Label>
      <Select
        value={detail.hukamType || "SSRD"}
        onValueChange={(value) => handleHukamTypeChange(detail.id, value)}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
  {hukamTypes.map((type) => (
    <SelectItem key={type} value={type}>
      {type}
    </SelectItem>
  ))}
</SelectContent>
      </Select>
    </div>
    <div className="space-y-2">
      <Label>Hukam Date</Label>
      <Input
        type="date"
        value={detail.hukamDate || ''}
        onChange={(e) => updateNondhDetail(detail.id, { hukamDate: e.target.value })}
      />
    </div>
  </>
)}

                      <div className="space-y-4 mb-4">
                        <div className="space-y-2">
                          <Label>Vigat</Label>
                          <Textarea
                            value={detail.vigat}
                            onChange={(e) => updateNondhDetail(detail.id, { vigat: e.target.value })}
                            placeholder="Enter vigat details"
                            rows={3}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Status</Label>
                          <Select
                            value={detail.status}
                            onValueChange={(value) => handleStatusChange(detail.id, value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {statusTypes.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <div className="space-y-2 mt-2">
  <Label>
    Reason {detail.status === "invalid" ? "*" : "(Optional)"}
  </Label>
  <Input
    value={detail.invalidReason}
    onChange={(e) => updateNondhDetail(detail.id, { invalidReason: e.target.value })}
    placeholder={
      detail.status === "invalid" 
        ? "Enter reason for invalidation" 
        : "Enter reason (optional)"
    }
  />
</div>
                        </div>
                      </div>

                      <div className="space-y-4 mb-4">
                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`show_${detail.id}`}
                            checked={detail.showInOutput}
                            onCheckedChange={(checked) =>
                              updateNondhDetail(detail.id, { showInOutput: checked as boolean })
                            }
                          />
                          <Label htmlFor={`show_${detail.id}`}>Show in query list</Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Checkbox
                            id={`docs_${detail.id}`}
                            checked={detail.hasDocuments}
                            onCheckedChange={(checked) =>
                              updateNondhDetail(detail.id, { hasDocuments: checked as boolean })
                            }
                          />
                          <Label htmlFor={`docs_${detail.id}`}>Do you have relevant documents?</Label>
                        </div>

                        {detail.hasDocuments && (
  <div className="space-y-2">
    <Label>Upload Documents</Label>
    
    {!detail.docUpload ? (
      // Show file input only when no document is uploaded
      <Input
        type="file"
        accept=".pdf,.jpg,.jpeg,.png"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) handleFileUpload(file, detail.id)
        }}
      />
    ) : (
      // Show document actions when document exists
      <div className="flex items-center gap-2">
        <Button
          variant="outline" 
          size="sm"
          onClick={() => window.open(detail.docUpload, '_blank')}
        >
          <Eye className="w-4 h-4 mr-1" />
          View Document
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            // Create a hidden file input for replacement
            const input = document.createElement('input')
            input.type = 'file'
            input.accept = '.pdf,.jpg,.jpeg,.png'
            input.onchange = (e) => {
              const file = e.target.files?.[0]
              if (file) handleFileUpload(file, detail.id)
            }
            input.click()
          }}
        >
          Replace
        </Button>
        
        <Button
          variant="link"
          size="sm"
          className="text-red-600 h-4 p-0"
          onClick={() => updateNondhDetail(detail.id, { docUpload: '', hasDocuments: false })}
        >
          Remove
        </Button>
      </div>
    )}
    
    {detail.docUpload && (
      <p className="text-sm text-green-600">
        <Eye className="w-4 h-4 inline mr-1" />
        Document has been uploaded
      </p>
    )}
  </div>
)}
                      </div>

                      {renderTypeSpecificFields(detail)}
                    </div>
                    
                  </div>
                )}
                
              </Card>
            );
          })}
          {hasChanges && (
  <div className="flex justify-center mt-4">
    <Button onClick={saveChanges} disabled={saving}>
      {saving ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Saving...
        </>
      ) : (
        <>Save & Continue</>
      )}
    </Button>
  </div>
)}
      </CardContent>
    </Card>
  )
}
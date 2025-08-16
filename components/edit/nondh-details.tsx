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

const hukamTypes = ["SSRD", "Collector", "Collector_ganot", "Prant", "Mamlajdaar", "GRT", "Jasu", "Krushipanch", "DILR"]

const statusTypes = [
  { value: "valid", label: "Valid" },
  { value: "invalid", label: "Invalid" },
  { value: "nullified", label: "Nullified" }
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
          affectedNondhNo: detail.affected_nondh_no || "",
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
            tenure: rel.tenure || "Navi",
            isValid: rel.is_valid !== false,
            hukamType: rel.hukam_type,
            hukamDate: rel.hukam_date,
            restrainingOrder: rel.restraining_order ? "yes" : "no"
          }))
        }))

        const existingDetailNondhIds = new Set(transformedDetails.map(detail => detail.nondhId));
const missingDetails = formattedNondhs
  .filter(nondh => !existingDetailNondhIds.has(nondh.id))
  .map(nondh => ({
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
    ownerRelations: [] // Initialize with empty relations
  }));

// Combine existing details with initialized missing ones
const allDetails = [...transformedDetails, ...missingDetails];

setNondhDetails(allDetails);
setOriginalDetails(allDetails);

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
    setHasChanges(!deepEqual(nondhDetails, originalDetails))
  }, [nondhDetails, originalDetails])

  // Deep equality check
  const deepEqual = (a: any, b: any) => {
    return JSON.stringify(a) === JSON.stringify(b)
  }

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

  const getSurveyNumberType = (sNo: string): string => {
    if (landBasicInfo?.blockNo && sNo === landBasicInfo.blockNo) {
      return 'block_no';
    }
    if (landBasicInfo?.reSurveyNo && sNo === landBasicInfo.reSurveyNo) {
      return 're_survey_no';
    }
    return 'survey_no';
  };

  const getPrimarySNoType = (affectedSNos: string[] = []): string => {
  const sNoTypes = getSNoTypesFromSlabs();
  const types = affectedSNos?.map(sNo => sNoTypes.get(sNo) || 's_no');
  if (types?.includes('s_no')) return 's_no';
  if (types?.includes('block_no')) return 'block_no';
  return 're_survey_no';
};

const sortNondhs = (a: any, b: any): number => {
  // Safely get affected survey numbers (handle both API response formats)
  const aAffectedSNos = Array.isArray(a.affected_s_nos) ? a.affected_s_nos : 
                       a.affectedSNos ? [a.affectedSNos] : [];
  const bAffectedSNos = Array.isArray(b.affected_s_nos) ? b.affected_s_nos : 
                       b.affectedSNos ? [b.affectedSNos] : [];

  // Get primary types
  const aType = getPrimarySNoType(aAffectedSNos);
  const bType = getPrimarySNoType(bAffectedSNos);

  // Priority order
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  const aPriority = priorityOrder.indexOf(aType);
  const bPriority = priorityOrder.indexOf(bType);

  // First sort by primary type
  if (aPriority !== bPriority) return aPriority - bPriority;

  // For same type, sort by first affected S.No numerically
  const aFirstSNo = aAffectedSNos[0] || '';
  const bFirstSNo = bAffectedSNos[0] || '';
  const sNoCompare = aFirstSNo.localeCompare(bFirstSNo, undefined, { numeric: true });
  if (sNoCompare !== 0) return sNoCompare;

  // Finally sort by nondh number if S.Nos are same
  return getNondhNumber(a) - getNondhNumber(b);
};

  const handleStatusChange = (detailId: string, newStatus: "valid" | "invalid" | "nullified") => {
    setNondhDetails(prev => {
      const updatedDetails = prev.map(detail => 
        detail.id === detailId 
          ? { 
              ...detail, 
              status: newStatus,
              invalidReason: newStatus === 'invalid' ? detail.invalidReason || '' : ''
            } 
          : detail
      );
      processValidityChain(updatedDetails);
      return updatedDetails;
    });
  };

  const processValidityChain = (details: NondhDetail[]) => {
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

    setNondhDetails(updatedDetails);
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

  const saveChanges = async () => {
  if (!hasChanges) return;
  
  try {
    setSaving(true);
    
    // Transform data before saving
    const changes = nondhDetails.map(detail => {
      const original = originalDetails.find(d => d.id === detail.id);
      return { 
        id: detail.id, 
        changes: {
          ...transformForDB(detail),
          // Ensure old_owner contains the name, not just ID
          old_owner: detail.oldOwner?.includes('-') 
            ? nondhDetails.find(d => d.nondhId === detail.oldOwner)?.ownerRelations[0]?.ownerName 
              || detail.oldOwner
            : detail.oldOwner
        }
      };
    }).filter(item => Object.keys(item.changes).length > 0);

    // Save nondh details
    for (const change of changes) {
      if (!change.id) {
        await LandRecordService.createNondhDetail(change.changes);
      } else {
        await LandRecordService.updateNondhDetail(change.id, change.changes);
      }
    }

    // Handle owner relations
    for (const detail of nondhDetails) {
      const originalDetail = originalDetails.find(d => d.id === detail.id);
      if (!originalDetail) continue;
      
      // Process all owner relations (both new and existing)
      for (const relation of detail.ownerRelations) {
        const originalRelation = originalDetail.ownerRelations.find(r => r.id === relation.id);
        
        if (!originalRelation) {
          // New relation - create with proper nondh_detail_id
          await LandRecordService.createNondhOwnerRelation({
            ...transformOwnerRelationForDB(relation),
            nondh_detail_id: detail.id // Ensure this is set
          });
        } else {
          // Existing relation - update
          if (relation.id) { // Only update if we have an ID
            await LandRecordService.updateNondhOwnerRelation(
              relation.id,
              transformOwnerRelationForDB(relation)
            );
          }
        }
      }
    }

      // Refresh data
      const { data: updatedDetails, error } = await LandRecordService.getNondhDetailsWithRelations(recordId || '')
      if (error) throw error

      const transformed = (updatedDetails || []).map((detail: any) => ({
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
        oldOwner: detail.old_owner || "",
        hukamDate: detail.hukam_date || "",
        hukamType: detail.hukam_type || "SSRD",
        hukamStatus: detail.hukam_status || "valid",
        hukamInvalidReason: detail.hukam_invalid_reason || "",
        affectedNondhNo: detail.affected_nondh_no || "",
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
          tenure: rel.tenure || "Navi",
          isValid: rel.is_valid !== false,
          hukamType: rel.hukam_type,
          hukamDate: rel.hukam_date,
          restrainingOrder: rel.restraining_order ? "yes" : "no"
        }))
      }))

      setNondhDetails(transformed)
      setOriginalDetails(transformed)
      setHasChanges(false)
      
      toast({ title: "Changes saved successfully" })
      setCurrentStep(6);
    } catch (error) {
      console.error('Error saving changes:', error)
      toast({
        title: "Error saving changes",
        description: "Could not update nondh details",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const getObjectChanges = (original: any, current: any) => {
    if (!original) return current
    
    const changes: any = {}
    Object.keys(current).forEach(key => {
      if (JSON.stringify(original[key]) !== JSON.stringify(current[key])) {
        changes[key] = current[key]
      }
    })
    return changes
  }

  const transformForDB = (data: any) => {
  return {
    nondh_id: data.nondhId,
    s_no: data.sNo,
    type: data.type,
    reason: data.reason,
    date: data.date,
    vigat: data.vigat,
    status: data.status,
    invalid_reason: data.invalidReason,
    show_in_output: data.showInOutput,
    has_documents: data.hasDocuments,
    doc_upload_url: data.docUpload,
    hukam_status: data.hukamStatus,
    hukam_invalid_reason: data.hukamInvalidReason,
    affected_nondh_no: data.affectedNondhNo,
    // old_owner handled separately in saveChanges
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
    tenure: data.tenure,
    is_valid: data.isValid,
    hukam_type: data.hukamType,
    hukam_date: data.hukamDate,
    restraining_order: data.restrainingOrder === 'yes'
  }
}

  const formatArea = (area: { value: number, unit: string }) => {
  if (!area) return "N/A";
  
  if (area.unit === 'sq_m') {
    return `${area.value} sq.m`;
  } else if (area.unit === 'acre') {
    return `${area.value} acres`;
  } else if (area.unit === 'guntha') {
    return `${area.value} gunthas`;
  }
  return "N/A";
};

  // Render functions from original component
  const renderOwnerSelectionFields = (detail: NondhDetail) => {
    const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
    const hakkamiPreviousOwners = detail.type === "Hakkami" 
      ? getPreviousOwners(detail.sNo, detail.nondhId)
      : [];

    return (
      <div className="space-y-4">
        {/* Old Owner Field */}
        <div className="space-y-2">
  <Label>Old Owner *</Label>
  <Select
    value={detail.oldOwner?.split('|')[1] || detail.oldOwner || ''}
    onValueChange={(value) => {
      const selectedOwner = previousOwners.find(o => o.nondhId === value);
      updateNondhDetail(detail.id, { 
        oldOwner: selectedOwner ? `${selectedOwner.name}|${value}` : value 
      });
    }}
  >
    <SelectTrigger>
      <SelectValue placeholder="Select old owner" />
    </SelectTrigger>
    <SelectContent>
      {previousOwners.map((owner, index) => (
        <SelectItem key={`${owner.nondhId}_${index}`} value={owner.nondhId}>
          {owner.name} ({owner.area.value} {owner.area.unit})
        </SelectItem>
      ))}
    </SelectContent>
  </Select>
</div>

        {/* Hakkami New Owner */}
        {detail.type === "Hakkami" && (
          <div className="space-y-2">
            <Label>New Owner *</Label>
            <Select
              value={detail.ownerRelations[0]?.ownerName || ''}
              onValueChange={(value) => {
                if (detail.ownerRelations.length === 0) {
                  addOwnerRelation(detail.id);
                }
                updateOwnerRelation(detail.id, detail.ownerRelations[0]?.id, { 
                  ownerName: value 
                });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select New Owner" />
              </SelectTrigger>
              <SelectContent>
                {hakkamiPreviousOwners.map((owner, index) => (
                  <SelectItem key={`new_${owner.name}_${index}`} value={owner.name}>
                    {owner.name} ({owner.area.value} {owner.area.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Vechand New Owner */}
        {detail.type === "Vechand" && (
          <div className="space-y-2">
            <Label>New Owner *</Label>
            <Input
              value={detail.ownerRelations[0]?.ownerName || ''}
              onChange={(e) => {
                if (detail.ownerRelations.length === 0) {
                  addOwnerRelation(detail.id);
                }
                updateOwnerRelation(detail.id, detail.ownerRelations[0]?.id, { 
                  ownerName: e.target.value 
                });
              }}
              placeholder="Enter new owner name"
            />
          </div>
        )}

        {/* Equal distribution checkbox */}
        {(detail.type === "Hayati_ma_hakh_dakhal" || detail.type === "Varsai") && (
          <div className="flex items-center space-x-2">
            <Checkbox
              id={`equal_dist_${detail.id}`}
              checked={equalDistribution[detail.id] || false}
              onCheckedChange={(checked) => toggleEqualDistribution(detail.id, checked as boolean)}
            />
            <Label htmlFor={`equal_dist_${detail.id}`}>Equal Distribution of Land</Label>
          </div>
        )}

        {/* Owner Details Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>
              {detail.type === "Varsai" || detail.type === "Hayati_ma_hakh_dakhal" ? "New Owner Details" : "Owner Details"}
            </Label>
            <Button size="sm" onClick={() => addOwnerRelation(detail.id)}>
              <Plus className="w-4 h-4 mr-2" />
              {detail.type === "Varsai" || detail.type === "Hayati_ma_hakh_dakhal" ? "Add New Owner" : "Add Owner"}
            </Button>
          </div>

          {detail.ownerRelations.map((relation, index) => (
            <Card key={relation.id} className="p-3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">
                  {detail.type === "Varsai" 
                    ? `New Owner ${index + 1}`
                    : index === 0 
                      ? (detail.type === "Hakkami" || detail.type === "Vechand") 
                        ? "New Owner" 
                        : "Old Owner"
                      : `New Owner ${index}`}
                </h4>
                {index > 0 && (
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
                  {detail.type === "Hakkami" && index === 0 ? (
                    <Input
                      value={relation.ownerName}
                      disabled
                      placeholder="Selected from dropdown"
                    />
                  ) : (
                    <Input
                      value={relation.ownerName}
                      onChange={(e) => updateOwnerRelation(
                        detail.id, 
                        relation.id, 
                        { ownerName: e.target.value }
                      )}
                      placeholder="Enter owner name"
                    />
                  )}
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

                {/* Tenure Field - shown for all except Vechand */}
                {(detail.type !== "Varsai" && detail.type !== "Hayati_ma_hakh_dakhal") && 
                 detail.type !== "Vechand" && detail.type !== "Hakkami" && (
                  <div className="space-y-2">
                    <Label>Tenure</Label>
                    <Select
                      value={relation.tenure || "Navi"}
                      onValueChange={(value) => updateOwnerRelation(
                        detail.id, 
                        relation.id, 
                        { tenure: value }
                      )}
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
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  };

  const renderTypeSpecificFields = (detail: NondhDetail) => {
    if (["Hayati_ma_hakh_dakhal", "Varsai", "Hakkami", "Vechand"].includes(detail.type)) {
      return renderOwnerSelectionFields(detail);
    }

    switch (detail.type) {
      case "Kabjedaar":
      case "Ekatrikaran":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Tenure Type</Label>
              <Select
                value={detail.ownerRelations[0]?.tenure || "Navi"}
                onValueChange={(value) => {
                  if (detail.ownerRelations.length === 0) {
                    addOwnerRelation(detail.id)
                  }
                  updateOwnerRelation(detail.id, detail.ownerRelations[0]?.id, { tenure: value })
                }}
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
      case "Vehchani": 
      case "Bojo":
        return (
          <div className="space-y-4">
            <div className="space-y-4">
              {detail.ownerRelations.map((relation, index) => (
                <Card key={relation.id} className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Owner {index + 1}</h4>
                    {detail.ownerRelations.length > 1 && (
                      <Button variant="outline" size="sm" onClick={() => removeOwnerRelation(detail.id, relation.id)} className="text-red-600">
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

      case "Hukam":
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Hukam Date *</Label>
                <Input
                  type="date"
                  value={detail.hukamDate || ''}
                  onChange={(e) => updateNondhDetail(detail.id, { hukamDate: e.target.value })}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label>Hukam Type</Label>
                <Select
                  value={detail.hukamType || "SSRD"}
                  onValueChange={(value) => handleHukamTypeChange(detail.id, value)}
                >
                  <SelectTrigger className="w-full">
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
            </div>

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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Affected From Nondh Number *</Label>
                {(() => {
                  const currentNondh = nondhs.find(n => n.id === detail.nondhId);
                  if (!currentNondh) return null;

                  const currentNumber = safeNondhNumber(currentNondh);
                  const allSortedNondhs = [...nondhs].sort(sortNondhs);
                  const currentIndex = allSortedNondhs.findIndex(n => n.id === detail.nondhId);
                  const sortedOriginalNondhs = allSortedNondhs.slice(0, currentIndex); 
                  
                  if (sortedOriginalNondhs.length === 0) {
                    return (
                      <Select disabled>
                        <SelectTrigger>
                          <SelectValue placeholder="No previous nondhs available" />
                        </SelectTrigger>
                      </Select>
                    );
                  }

                  return (
                    <Select
                      value={detail.affectedNondhNo || ''}
                      onValueChange={(value) => {
                        updateNondhDetail(detail.id, { affectedNondhNo: value });
                        if (detail.hukamStatus === 'invalid') {
                          updateHukamValidityChain(detail.id);
                        }
                      }}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue placeholder="Select affected nondh" />
                      </SelectTrigger>
                      <SelectContent className="max-h-[300px] overflow-y-auto">
                        {sortedOriginalNondhs.map(nondh => {
                          if (!nondh) return null;
                          
                          const nondhDetail = nondhDetails.find(d => d.nondhId === nondh.id);
                          const type = nondhDetail?.type || 'Nondh';
                          const status = nondhDetail?.status || 'valid';
                          const primaryType = getPrimarySNoType(nondh.affectedSNos);
                          const typeLabel = 
                            primaryType === 'block_no' ? 'Block' :
                            primaryType === 're_survey_no' ? 'Resurvey' : 
                            'Survey';

                          return (
                            <SelectItem 
                              key={nondh.id} 
                              value={nondh.number.toString()}
                              className="flex items-start gap-2 py-2"
                            >
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
                  );
                })()}
              </div>

              <div className="space-y-2">
                <Label>Hukam Status</Label>
                <Select
                  value={detail.hukamStatus || "valid"}
                  onValueChange={(value) => {
                    const newStatus = value as "valid" | "invalid" | "nullified";
                    updateNondhDetail(detail.id, { 
                      hukamStatus: newStatus,
                      hukamInvalidReason: newStatus === "invalid" ? detail.hukamInvalidReason : ""
                    });
                    if (detail.affectedNondhNo) {
                      updateHukamValidityChain(detail.id);
                    }
                  }}
                >
                  <SelectTrigger className="w-full">
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
                {detail.hukamStatus === "invalid" && (
                  <div className="space-y-2 mt-2">
                    <Label>Hukam Invalid Reason *</Label>
                    <Input
                      value={detail.hukamInvalidReason || ''}
                      onChange={(e) => updateNondhDetail(detail.id, { hukamInvalidReason: e.target.value })}
                      placeholder="Enter reason for hukam invalidation"
                    />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              {detail.ownerRelations.map((relation, index) => (
                <Card key={relation.id} className="p-4">
                  <div className="flex justify-between items-center mb-4">
                    <h4 className="font-medium">Owner {index + 1}</h4>
                    {detail.ownerRelations.length > 1 && (
                      <Button variant="outline" size="sm" onClick={() => removeOwnerRelation(detail.id, relation.id)} className="text-red-600">
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
                      
                      <div className="w-full md:w-40">
                        <Label>Tenure</Label>
                        <Select
                          value={relation.tenure || "Navi"}
                          onValueChange={(value) => updateOwnerRelation(
                            detail.id, 
                            relation.id, 
                            { tenure: value }
                          )}
                        >
                          <SelectTrigger className="w-full">
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
                  </div>
                </Card>
              ))}
            </div>
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
  }

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
                            onChange={(e) => updateNondhDetail(detail.id, { date: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="space-y-2 mb-4">
                        <Label>Reason</Label>
                        <Textarea
                          value={detail.reason}
                          onChange={(e) => updateNondhDetail(detail.id, { reason: e.target.value })}
                          placeholder="Enter reason for this nondh"
                          rows={3}
                        />
                      </div>

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
                          {detail.status === "invalid" && (
                            <div className="space-y-2 mt-2">
                              <Label>Invalid Reason *</Label>
                              <Input
                                value={detail.invalidReason}
                                onChange={(e) => updateNondhDetail(detail.id, { invalidReason: e.target.value })}
                                placeholder="Enter reason for invalidation"
                              />
                            </div>
                          )}
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
                            <div className="flex items-center gap-4">
                              <Input
                                type="file"
                                accept=".pdf,.jpg,.jpeg,.png"
                                onChange={(e) => {
                                  const file = e.target.files?.[0]
                                  if (file) handleFileUpload(file, detail.id)
                                }}
                              />
                              {detail.docUpload && (
                                <div className="flex items-center gap-2">
                                  <Eye className="w-4 h-4 text-green-600" />
                                  <span className="text-sm text-green-600">Document uploaded</span>
                                  <Button
                                    variant="link"
                                    size="sm"
                                    className="text-red-600 h-4 p-0"
                                    onClick={() => updateNondhDetail(detail.id, { docUpload: '' })}
                                  >
                                    Remove
                                  </Button>
                                </div>
                              )}
                            </div>
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
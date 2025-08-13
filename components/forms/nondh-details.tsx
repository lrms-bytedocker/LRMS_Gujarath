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
import { Trash2, Plus, ArrowRight, ArrowLeft, Upload, Eye, Loader2, ChevronDown, ChevronUp, Badge } from "lucide-react"
import { useLandRecord, type NondhDetail } from "@/contexts/land-record-context"
import { supabase, uploadFile } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useStepFormData } from "@/hooks/use-step-form-data"
import { date } from 'zod'
import { isValid } from 'date-fns'

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
const SQM_PER_GUNTHA = 101.1714; // Approx 1 guntha = 101.1714 sq meters
const SQM_PER_ACRE = SQM_PER_GUNTHA * GUNTHAS_PER_ACRE; // Approx 1 acre = 4046.856 sq meters


type AreaUnit = "acre" | "guntha" | "sq_m";

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
}

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
            <SelectTrigger className="w-full">
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

      {/* On desktop: Original single-row layout */}
      <div className="hidden md:flex items-end gap-4">
        {/* Unit Selector */}
        <div className="space-y-2 w-[180px]">
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
            <SelectTrigger className="w-[180px]">
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
            <div className="space-y-2 min-w-[150px] flex-1">
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
            <div className="space-y-2 min-w-[120px] flex-1">
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
            <div className="space-y-2 min-w-[150px] flex-1">
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
            <div className="space-y-2 min-w-[120px] flex-1">
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

export default function NondhDetails() {
  const { yearSlabs, nondhs, setNondhs, nondhDetails, setNondhDetails, setCurrentStep, landBasicInfo } = useLandRecord()
  const { toast } = useToast()
  const { getStepData, updateStepData, markAsSaved } = useStepFormData(5) // Step 5 for NondhDetails
  const [loading, setLoading] = useState(false)
  const [nondhDetailData, setNondhDetailData] = useState<NondhDetail[]>(getStepData().nondhDetails || [])
  const [collapsedNondhs, setCollapsedNondhs] = useState<Set<string>>(new Set())
  const [equalDistribution, setEqualDistribution] = useState<Record<string, boolean>>({})
  const getSNoTypesFromSlabs = () => {
  const sNoTypes = new Map<string, "s_no" | "block_no" | "re_survey_no">();
  
  // Process main slab S.Nos
  yearSlabs.forEach(slab => {
    if (slab.sNo) {
      sNoTypes.set(slab.sNo, slab.sNoType);
    }
  });
  
  // Process paiky entries
  yearSlabs.forEach(slab => {
    slab.paikyEntries.forEach(entry => {
      if (entry.sNo) {
        sNoTypes.set(entry.sNo, entry.sNoType);
      }
    });
  });
  
  // Process ekatrikaran entries
  yearSlabs.forEach(slab => {
    slab.ekatrikaranEntries.forEach(entry => {
      if (entry.sNo) {
        sNoTypes.set(entry.sNo, entry.sNoType);
      }
    });
  });
  
  return sNoTypes;
};
const parseNondhNumber = (nondh: any): number => {
  if (typeof nondh.number === 'number') return nondh.number;
  const num = parseInt(nondh.number, 10);
  return isNaN(num) ? 0 : num;
};
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
  // First check if it's a block number
  if (landBasicInfo?.blockNo && sNo === landBasicInfo.blockNo) {
    return 'block_no';
  }
  // Then check if it's a resurvey number
  if (landBasicInfo?.reSurveyNo && sNo === landBasicInfo.reSurveyNo) {
    return 'resurvey_no';
  }
  // Everything else is considered a survey number
  return 'survey_no';
};

// Enhanced sorting function for nondhs
const sortNondhsBySNoType = (a: NondhDetail, b: NondhDetail, nondhs: any[]): number => {
  const sNoTypes = getSNoTypesFromSlabs();
  
  // Get the nondh objects for the details
  const nondhA = nondhs.find(n => n.id === a.nondhId);
  const nondhB = nondhs.find(n => n.id === b.nondhId);
  
  // Function to determine primary type considering all affected S.Nos
  const getPrimaryType = (nondh: any): string => {
    if (!nondh) return 's_no';
    const types = nondh.affectedSNos.map((sNo: string) => sNoTypes.get(sNo) || 's_no');
    
    // Priority: survey_no appears anywhere > block_no > resurvey_no
    if (types.includes('s_no')) return 's_no';
    if (types.includes('block_no')) return 'block_no';
    return 're_survey_no';
  };

  const typeA = getPrimaryType(nondhA);
  const typeB = getPrimaryType(nondhB);
  
  // Priority order: survey_no > block_no > resurvey_no
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  const priorityA = priorityOrder.indexOf(typeA);
  const priorityB = priorityOrder.indexOf(typeB);
  
  // First sort by type priority
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  
  // For same type, sort by first affected S.No numerically
  const aFirstSNo = nondhA?.affectedSNos[0] || '';
  const bFirstSNo = nondhB?.affectedSNos[0] || '';
  const sNoCompare = aFirstSNo.localeCompare(bFirstSNo, undefined, { numeric: true });
  if (sNoCompare !== 0) return sNoCompare;
  
  // Finally sort by nondh number if S.Nos are same
  const aNondhNo = nondhA ? getNondhNumber(nondhA) : 0;
  const bNondhNo = nondhB ? getNondhNumber(nondhB) : 0;
  return aNondhNo - bNondhNo;
};
  // Initialize with saved data if available
  useEffect(() => {
  const stepData = getStepData()
  if (stepData.nondhDetails) {
    setNondhDetailData(stepData.nondhDetails)
  }
}, [getStepData])

  // Update form data whenever nondhDetailData changes (with debouncing to prevent excessive updates)
  useEffect(() => {
    if (nondhDetailData.length > 0) {
      const hasContent = nondhDetailData.some(detail => 
  detail.type.trim() !== "" || 
  detail.ownerRelations.some(rel => rel.ownerName.trim() !== "") ||
  detail.status !== "valid" ||
  detail.reason.trim() !== "" ||
  detail.vigat.trim() !== "" ||
  detail.date.trim() !== ""
)
      
      const currentStepData = getStepData()
      const isDifferent = JSON.stringify(currentStepData.nondhDetails) !== JSON.stringify(nondhDetailData)
      
      if (hasContent && isDifferent) {
        const timeoutId = setTimeout(() => {
          updateStepData({ nondhDetails: nondhDetailData })
        }, 300)
        
        return () => clearTimeout(timeoutId)
      }
    }
  }, [nondhDetailData, updateStepData, getStepData])

  // Load nondhs from database first
  useEffect(() => {
    const loadNondhs = async () => {
      if (!landBasicInfo?.id) return

      try {
        const { data: nondhData, error } = await supabase
          .from('nondhs')
          .select('*')
          .eq('land_record_id', landBasicInfo.id)
          .order('number')

        if (error) throw error

        if (nondhData?.length) {
          const formattedNondhs = nondhData.map(nondh => ({
            id: nondh.id,
            number: nondh.number,
            sNoType: nondh.s_no_type,
            affectedSNos: nondh.affected_s_nos || [],
            nondhDoc: nondh.nondh_doc_url || '',
          }))

          setNondhs(formattedNondhs)
        }
      } catch (error) {
        console.error('Error loading nondhs:', error)
        toast({
          title: "Error loading nondhs",
          description: "Could not load nondh data from database",
          variant: "destructive"
        })
      }
    }

    loadNondhs()
  }, [landBasicInfo?.id, setNondhs, toast])

  useEffect(() => {
  const initializeData = () => {
    if (nondhDetailData.length === 0) {
      const initialData: NondhDetail[] = nondhs.map(nondh => ({
        id: nondh.id,
        nondhId: nondh.id,
        sNo: nondh.affectedSNos[0] || '',
        type: "Kabjedaar",
        reason: "",
        date: "",
        vigat: "",
        status: "valid",
        raddReason: "",
        showInOutput: true, // Default to true
        hasDocuments: false,
        docUpload: "",
        oldOwner: "",
        hukamDate: "",
        hukamType: "SSRD", // Default Hukam type
        ownerRelations: [{
          id: Date.now().toString(),
          ownerName: "",
          area: { value: 0, unit: "sq_m" },
          tenure: "Navi",
          isValid: true
        }],
      }));
      setNondhDetailData(initialData);
    }
  };
  initializeData();
}, [nondhs]);

  const updateNondhDetail = (id: string, updates: Partial<NondhDetail>) => {
    setNondhDetailData((prev) => prev.map((detail) => (detail.id === id ? { ...detail, ...updates } : detail)))
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
      const detail = nondhDetailData.find(d => d.id === detailId)
      if (detail && detail.ownerRelations.length > 1) {
        const oldOwnerArea = detail.ownerRelations[0]?.area?.value || 0
        const newOwnersCount = detail.ownerRelations.length - 1
        const equalArea = oldOwnerArea / newOwnersCount
        
        const updatedRelations = detail.ownerRelations.map((relation, index) => {
          if (index === 0) return relation // Keep old owner area
          return { ...relation, area: { ...relation.area, value: equalArea } }
        })
        
        updateNondhDetail(detailId, { ownerRelations: updatedRelations })
      }
    }
  }

  const addOwnerRelation = (detailId: string) => {
    const detail = nondhDetailData.find((d) => d.id === detailId)
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
      
      // Auto-distribute if equal distribution is enabled
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
    const detail = nondhDetailData.find((d) => d.id === detailId)
    if (detail) {
      const updatedRelations = detail.ownerRelations.filter((r) => r.id !== relationId)
      updateNondhDetail(detailId, { ownerRelations: updatedRelations })
      
      // Auto-redistribute if equal distribution is enabled
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
    const detail = nondhDetailData.find((d) => d.id === detailId)
    if (detail) {
      const updatedRelations = detail.ownerRelations.map((relation) =>
        relation.id === relationId ? { ...relation, ...updates } : relation,
      )
      updateNondhDetail(detailId, { ownerRelations: updatedRelations })
      
      // Validate area constraints for Varsai
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

const getPrimarySNoType = (affectedSNos: string[]): string => {
  const sNoTypes = getSNoTypesFromSlabs();
  
  // Check all affected S.Nos and determine the primary type
  const types = affectedSNos.map(sNo => sNoTypes.get(sNo) || 's_no');
  
  // Priority: survey_no appears anywhere > block_no > resurvey_no
  if (types.includes('s_no')) return 's_no';
  if (types.includes('block_no')) return 'block_no';
  return 're_survey_no';
};

// Enhanced sorting function for nondhs
const sortNondhs = (a: any, b: any): number => {
  // Get primary types
  const aType = getPrimarySNoType(a.affectedSNos);
  const bType = getPrimarySNoType(b.affectedSNos);

  // Priority order
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  const aPriority = priorityOrder.indexOf(aType);
  const bPriority = priorityOrder.indexOf(bType);

  // First sort by primary type
  if (aPriority !== bPriority) return aPriority - bPriority;

  // For same type, sort by first affected S.No numerically
  const aFirstSNo = a.affectedSNos[0] || '';
  const bFirstSNo = b.affectedSNos[0] || '';
  const sNoCompare = aFirstSNo.localeCompare(bFirstSNo, undefined, { numeric: true });
  if (sNoCompare !== 0) return sNoCompare;

  // Finally sort by nondh number if S.Nos are same
  return getNondhNumber(a) - getNondhNumber(b);
};
// Helper function to sort nondhs by S.No type and number
const getSNoTypePriority = (type: string | undefined): number => {
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  return priorityOrder.indexOf(type || 's_no');
};


const handleStatusChange = (detailId: string, newStatus: "valid" | "invalid" | "nullified") => {
  // Update the state first
  setNondhDetailData(prev => {
    const updatedDetails = prev.map(detail => 
      detail.id === detailId 
        ? { 
            ...detail, 
            status: newStatus,
            invalidReason: newStatus === 'invalid' ? detail.invalidReason || '' : ''
          } 
        : detail
    );
    
    // Then process the validity chain with the updated state
    processValidityChain(updatedDetails);
    
    return updatedDetails;
  });
};

// Separate function to process the validity chain
const processValidityChain = (details: NondhDetail[]) => {
  // Get all nondhs sorted by S.No type and number
  const sortedNondhs = [...nondhs].sort(sortNondhs);
  
  // Create a map of nondh ID to its detail
  const nondhDetailMap = new Map<string, NondhDetail>();
  details.forEach(detail => {
    nondhDetailMap.set(detail.nondhId, detail);
  });

  // First pass: count how many invalid nondhs affect each nondh
  const affectingCounts = new Map<string, number>();
  sortedNondhs.forEach((nondh, index) => {
    let count = 0;
    
    // Count invalid nondhs that come after this one in the sorted list
    for (let i = index + 1; i < sortedNondhs.length; i++) {
      const affectingNondh = sortedNondhs[i];
      const affectingDetail = nondhDetailMap.get(affectingNondh.id);
      if (affectingDetail?.status === 'invalid') {
        count++;
      }
    }
    
    affectingCounts.set(nondh.id, count);
  });

  // Second pass: update owner validity based on the count
  const updatedDetails = details.map(detail => {
    const affectingCount = affectingCounts.get(detail.nondhId) || 0;
    const shouldBeValid = affectingCount % 2 === 0;

    // Only update if current validity doesn't match
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

  setNondhDetailData(updatedDetails);
};

// Update the updateValidityChain function to use the sorted nondhs
const updateValidityChain = () => {
  // Get all nondhs sorted by S.No type and number (same as display sorting)
  const sortedNondhs = [...nondhs].sort(sortNondhs);
  
  // Create a map of nondh ID to its detail
  const nondhDetailMap = new Map<string, NondhDetail>();
  nondhDetailData.forEach(detail => {
    nondhDetailMap.set(detail.nondhId, detail);
  });

  // First pass: count how many invalid nondhs affect each nondh
  const affectingCounts = new Map<string, number>();
  sortedNondhs.forEach((nondh, index) => {
    let count = 0;
    
    // Count invalid nondhs that come after this one in the sorted list
    for (let i = index + 1; i < sortedNondhs.length; i++) {
      const affectingNondh = sortedNondhs[i];
      const affectingDetail = nondhDetailMap.get(affectingNondh.id);
      if (affectingDetail?.status === 'invalid') {
        count++;
      }
    }
    
    affectingCounts.set(nondh.id, count);
  });

  // Second pass: update owner validity based on the count
  sortedNondhs.forEach(nondh => {
    const detail = nondhDetailMap.get(nondh.id);
    if (!detail) return;

    const affectingCount = affectingCounts.get(nondh.id) || 0;
    
    // If affected by odd number of invalid nondhs, owners should be invalid
    // If affected by even number (or zero), owners should be valid
    const shouldBeValid = affectingCount % 2 === 0;

    // Only update if current validity doesn't match
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
  // First update the hukam type
  updateNondhDetail(detailId, { hukamType });
};

const updateHukamValidityChain = (detailId: string) => {
  const detail = nondhDetailData.find(d => d.id === detailId);
  if (!detail || !detail.affectedNondhNo) return;

  const currentNondh = nondhs.find(n => n.id === detail.nondhId);
  if (!currentNondh) return;

  // Get all nondhs in proper sorted order
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  
  // Find affected nondh by number
  const affectedNondh = allSortedNondhs.find(n => 
    safeNondhNumber(n).toString() === detail.affectedNondhNo
  );
  
  if (!affectedNondh) return;

  const currentIndex = allSortedNondhs.findIndex(n => n.id === detail.nondhId);
  const affectedIndex = allSortedNondhs.findIndex(n => n.id === affectedNondh.id);

  // Get all nondhs in the affected range (from affected to current-1)
  const affectedNondhIds = allSortedNondhs
    .slice(affectedIndex, currentIndex)
    .map(n => n.id);

  // Update all affected nondh details based on hukam status
  const shouldBeValid = detail.hukamStatus === "valid";
  
  affectedNondhIds.forEach(nondhId => {
    const affectedDetail = nondhDetailData.find(d => d.nondhId === nondhId);
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
  // Get previous owners for dropdown (Varsai, Hakkami, Vechand, Hayati_ma_hakh_dakhal)
const getPreviousOwners = (sNo: string, currentNondhId: string) => {
  return nondhDetailData
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

  const updateNondhDetailData = (newData: NondhDetail[]) => {
  setNondhDetailData(newData)
  updateStepData({ nondhDetails: newData })
}
  const handleFileUpload = async (file: File, detailId: string) => {
    try {
      const path = `nondh-detail-documents/${Date.now()}_${file.name}`
      const url = await uploadFile(file, "land-documents", path)
      const updatedDetails = nondhDetailData.map(detail => 
      detail.id === detailId ? { ...detail, docUpload: url } : detail
    )
    updateNondhDetailData(updatedDetails)
    toast({ title: "File uploaded successfully" })
    } catch (error) {
      toast({ title: "Error uploading file", variant: "destructive" })
    }
  }

  const renderOwnerSelectionFields = (detail: NondhDetail) => {
  const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
  
  // For Hakkami - get previous owners for both dropdowns
  const hakkamiPreviousOwners = detail.type === "Hakkami" 
    ? getPreviousOwners(detail.sNo, detail.nondhId)
    : [];

  return (
    <div className="space-y-4">
      {/* Old Owner Field - shown for all types except Varsai */}
        <div className="space-y-2">
          <Label>Old Owner *</Label>
          <Select
            value={detail.oldOwner}
            onValueChange={(value) => {
              updateNondhDetail(detail.id, { oldOwner: value });
              if (detail.status === 'invalid') {
                updateValidityChain(detail.id, value, false);
              } else {
                updateValidityChain(detail.id, value, true);
              }
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Old Owner" />
            </SelectTrigger>
            <SelectContent>
              {previousOwners.map((owner, index) => (
                <SelectItem key={`${owner.name}_${index}`} value={owner.nondhId}>
                  {owner.name} ({owner.area.value} {owner.area.unit})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


      {/* Special handling for Hakkami */}
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

      {/* Special handling for Vechand */}
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

      {/* Equal distribution checkbox - shown for Hayati and Varsai */}
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
              {/* Owner Name Field - disabled for Hakkami new owner */}
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

              {/* Area Field */}
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
              {(detail.type !== "Varsai" && detail.type !== "Hayati_ma_hakh_dakhal") && detail.type !== "Vechand" && detail.type !== "Hakkami" && (
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
                        onChange={(e) => updateOwnerRelation(detail.id, relation.id, { ownerName: e.target.value })}
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
      {/* Owner Details Section */}
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
              {/* Owner Name */}
              <div className="space-y-2">
                <Label>Owner Name</Label>
                <Input
                  value={relation.ownerName}
                  onChange={(e) => updateOwnerRelation(detail.id, relation.id, { ownerName: e.target.value })}
                  placeholder="Enter owner name"
                />
              </div>

              {/* Area Fields - Full width below name */}
              <div className="space-y-2">
                <Label>Area</Label>
                {areaFields({
                  area: relation.area,
                  onChange: (newArea) => updateOwnerRelation(detail.id, relation.id, { area: newArea })
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
      {/* Hukam-specific fields */}
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
                    
                    const nondhDetail = nondhDetailData.find(d => d.nondhId === nondh.id);
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
            {/* Owner Name - Full width */}
            <div className="space-y-2">
              <Label>Owner Name</Label>
              <Input
                value={relation.ownerName}
                onChange={(e) => updateOwnerRelation(detail.id, relation.id, { ownerName: e.target.value })}
                placeholder="Enter owner name"
              />
            </div>

            {/* Area and Tenure in one row on desktop */}
            <div className="flex flex-col md:flex-row gap-4">
              {/* Area Fields - Takes remaining space */}
              <div className="flex-1">
                <Label>Area</Label>
                {areaFields({
                  area: relation.area,
                  onChange: (newArea) => updateOwnerRelation(detail.id, relation.id, { area: newArea })
                })}
              </div>
              
              {/* Tenure - Compact on right */}
              <div className="w-full md:w-40">
                <Label>Tenure</Label>
                <Select
                  value={relation.tenure || "Navi"}
                  onValueChange={(value) => updateOwnerRelation(detail.id, relation.id, { tenure: value })}
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
                      onChange={(e) => updateOwnerRelation(detail.id, relation.id, { ownerName: e.target.value })}
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

  const get712Documents = () => {
    const docs: any[] = []
    yearSlabs.forEach((slab) => {
      if (slab.integrated712) {
        docs.push({
          year: `${slab.startYear}-${slab.endYear}`,
          sNo: slab.sNo,
          url: slab.integrated712,
          type: "Main Slab",
          area: slab.area ? `${slab.area.value} ${slab.area.unit}` : 'N/A'
        })
      }

      slab.paikyEntries.forEach((entry, index) => {
        if (entry.integrated712) {
          docs.push({
            year: `${slab.startYear}-${slab.endYear}`,
            sNo: entry.sNo,
            url: entry.integrated712,
            type: `Paiky ${index + 1}`,
            area: entry.area ? `${entry.area.value} ${entry.area.unit}` : 'N/A'
          })
        }
      })

      slab.ekatrikaranEntries.forEach((entry, index) => {
        if (entry.integrated712) {
          docs.push({
            year: `${slab.startYear}-${slab.endYear}`,
            sNo: entry.sNo,
            url: entry.integrated712,
            type: `Ekatrikaran ${index + 1}`,
            area: entry.area ? `${entry.area.value} ${entry.area.unit}` : 'N/A'
          })
        }
      })
    })
    return docs
  }

  const handleSubmit = async () => {
  // Update validity chain for all nondhs first
  nondhDetailData.forEach(detail => {
    if (detail.status === 'invalid') {
      updateValidityChain();
    }
    if (detail.hukamStatus === 'invalid' && detail.affectedNondhNo) {
      updateHukamValidityChain(detail.id);
    }
  });

  if (!nondhs.length) {
    toast({
      title: "Error",
      description: "No nondh data available to save",
      variant: "destructive"
    });
    return;
  }

  // Process data before saving - copy tenure for Varsai/Hayyati types
  const processedDetails = nondhDetailData.map(detail => {
    // For Varsai and Hayyati types, copy tenure from old owner to new owners
    if (["Varsai", "Hayati_ma_hakh_dakhal","Hakkami","Vechand"].includes(detail.type) && detail.ownerRelations.length > 1) {
      const oldOwnerTenure = detail.ownerRelations[0]?.tenure || "Navi";
      return {
        ...detail,
        ownerRelations: detail.ownerRelations.map((relation, index) => ({
          ...relation,
          // Keep old owner's tenure, copy to new owners
          tenure: index === 0 ? relation.tenure : oldOwnerTenure
        }))
      };
    }
    return detail;
  });

  // Filter out empty/incomplete nondh details from processed data
  const validNondhDetails = processedDetails.filter(detail => {
    // Check if detail has meaningful content
    const hasOwnerNames = detail.ownerRelations.some(rel => rel.ownerName.trim() !== "");
    const hasReason = detail.reason.trim() !== "";
    const hasVigat = detail.vigat.trim() !== "";
    const hasDate = detail.date.trim() !== "";
    const isNonDefaultStatus = detail.status !== "valid";
    const hasDocuments = detail.hasDocuments && detail.docUpload;
    
    // Special handling for different nondh types
    const hasTypeSpecificData = (() => {
      switch (detail.type) {
        case "Hukam":
          return detail.ownerRelations.some(rel => 
            rel.hukamDate || rel.hukamType || rel.restrainingOrder
          );
        case "Varsai":
        case "Hakkami":
        case "Vechand":
        case "Hayati_ma_hakh_dakhal":
          return detail.oldOwner && detail.oldOwner.trim() !== "";
        default:
          return true; // For basic types, owner names are sufficient
      }
    })();
    
    return hasOwnerNames || hasReason || hasVigat || hasDate || 
           isNonDefaultStatus || hasDocuments || hasTypeSpecificData;
  });

  if (!validNondhDetails.length) {
    toast({
      title: "No data to save",
      description: "Please enter nondh details before saving",
      variant: "destructive"
    });
    return;
  }

  setLoading(true);
  try {
    // 1. First get all existing nondh IDs to delete
    const existingNondhIds = nondhs
      .map(n => n.id)
      .filter(id => id && id !== "1" && id !== "new");

    if (existingNondhIds.length === 0) {
      throw new Error("No valid nondh IDs found");
    }

    // 2. Get existing nondh details and their relations to delete
    const { data: existingDetails, error: fetchError } = await supabase
      .from('nondh_details')
      .select('id')
      .in('nondh_id', existingNondhIds);

    if (fetchError) throw fetchError;

    // 3. Delete existing data in correct order (relations first)
    if (existingDetails?.length) {
      // Delete owner relations first
      const { error: relationsDeleteError } = await supabase
        .from('nondh_owner_relations')
        .delete()
        .in('nondh_detail_id', existingDetails.map(d => d.id));

      if (relationsDeleteError) throw relationsDeleteError;

      // Then delete nondh details
      const { error: detailsDeleteError } = await supabase
        .from('nondh_details')
        .delete()
        .in('id', existingDetails.map(d => d.id));

      if (detailsDeleteError) throw detailsDeleteError;
    }

    // 4. Insert new nondh details 
    const { data: insertedDetails, error: insertError } = await supabase
      .from('nondh_details')
      .insert(validNondhDetails.map(detail => ({
        nondh_id: detail.nondhId,
        s_no: detail.sNo || nondhs.find(n => n.id === detail.nondhId)?.affectedSNos[0] || '',
        type: detail.type,
        reason: detail.reason || null,
        date: detail.date || null,
        vigat: detail.vigat || null,
        status: detail.status,
        invalid_reason: detail.status === 'invalid' ? (detail.invalidReason || null) : null,
        old_owner: detail.oldOwner || null,
        show_in_output: detail.showInOutput !== false,
        has_documents: detail.hasDocuments || false,
        doc_upload_url: detail.docUpload || null,
        hukam_status: detail.hukamStatus || 'valid',
        hukam_invalid_reason: detail.hukamInvalidReason || null,
        affected_nondh_no: detail.affectedNondhNo || null
      })))
      .select();

    if (insertError) throw insertError;

    // 5. Prepare owner relations data
    const ownerRelationsToInsert = validNondhDetails.flatMap(detail => {
      const insertedDetail = insertedDetails.find(d => 
        d.nondh_id === detail.nondhId && 
        d.s_no === detail.sNo
      );
      
      if (!insertedDetail) return [];

      return detail.ownerRelations
        .filter(relation => relation.ownerName.trim() !== "")
        .map(relation => {
          const isAcreGuntha = relation.area.unit === 'acre_guntha';
          const acres = isAcreGuntha ? Math.floor(relation.area.value || 0) : null;
          const gunthas = isAcreGuntha ? ((relation.area.value || 0) % 1) * 40 : null;
          const square_meters = isAcreGuntha ? null : (relation.area.value || 0);

          return {
            nondh_detail_id: insertedDetail.id,
            owner_name: relation.ownerName.trim(),
            s_no: relation.sNo || detail.sNo,
            acres,
            gunthas,
            square_meters,
            area_unit: relation.area.unit === 'acre_guntha' ? 'acre_guntha' : 'sq_m',
            tenure: relation.tenure || 'Navi',
            is_valid: relation.isValid !== false,
            hukam_type: relation.hukamType || 'SSRD',
            hukam_date: relation.hukamDate || null,
            restraining_order: relation.restrainingOrder === 'yes'
          };
        });
    });

    // 6. Insert owner relations in batch
    if (ownerRelationsToInsert.length > 0) {
      const { data: insertedRelations, error: relationsError } = await supabase
        .from('nondh_owner_relations')
        .insert(ownerRelationsToInsert)
        .select();

      if (relationsError) {
        console.error('Owner relations insert error:', relationsError);
        throw relationsError;
      }
    }

    // 7. Update local state
    const updatedDetails = validNondhDetails.map(detail => {
      const insertedDetail = insertedDetails.find(d => 
        d.nondh_id === detail.nondhId && d.s_no === detail.sNo
      );
      return insertedDetail ? { ...detail, dbId: insertedDetail.id } : detail;
    });

    setNondhDetails(updatedDetails);
    markAsSaved();
    
    toast({ 
      title: "Success", 
      description: `Saved ${validNondhDetails.length} nondh detail(s) with ${ownerRelationsToInsert.length} owner relations successfully` 
    });
    
    setCurrentStep(6);
  } catch (error) {
    console.error('Save error:', error);
    toast({
      title: "Error saving nondh details",
      description: error instanceof Error ? error.message : "Database error",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};

  const documents712 = get712Documents()

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4B: Nondh Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 7/12 Documents Table */}
        {documents712.length > 0 && (
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
                    <TableCell>{doc.sNo}</TableCell>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>{doc.area}</TableCell>
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
        )}

        {/* Nondh Details by S.No */}
        {nondhs
  .map(nondh => ({
    ...nondh,
    primarySNoType: getPrimarySNoType(nondh.affectedSNos)
  }))
  .sort(sortNondhs)
  .map(sortedNondh => {
    const detail = nondhDetailData.find(d => d.nondhId === sortedNondh.id);
    if (!detail) return null;

    return (
      <Card key={sortedNondh.id} className="p-4 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-lg font-semibold">
                Nondh No: {sortedNondh.number}
              </h3>
              <span className="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded-full">
                {nondhTypes.find(t => t === detail.type) || 'Nondh'}
              </span>
            </div>
            <div className="mt-2">
              <h4 className="text-sm font-medium text-muted-foreground">
                Affected Survey Numbers:
              </h4>
              <div className="flex flex-wrap gap-2 mt-1">
                {sortedNondh.affectedSNos
                  .map(sNo => {
                    const sNoTypes = getSNoTypesFromSlabs();
                    const type = sNoTypes.get(sNo) || 's_no';
                    return { sNo, type };
                  })
                  .sort((a, b) => {
                    const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
                    const aPriority = priorityOrder.indexOf(a.type);
                    const bPriority = priorityOrder.indexOf(b.type);
                    if (aPriority !== bPriority) return aPriority - bPriority;
                    return a.sNo.localeCompare(b.sNo, undefined, { numeric: true });
                  })
                  .map(({ sNo, type }) => {
                    const typeLabel = 
                      type === 'block_no' ? 'Block No' :
                      type === 're_survey_no' ? 'Resurvey No' : 'Survey No';
                    
                    return (
                      <span 
                        key={sNo} 
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm flex items-center gap-1"
                      >
                        <span className="font-medium">{typeLabel}:</span>
                        <span>{sNo}</span>
                      </span>
                    );
                  })}
              </div>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => toggleCollapse(sortedNondh.id)}
            className="flex items-center gap-1"
          >
            {collapsedNondhs.has(sortedNondh.id) ? (
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

        {!collapsedNondhs.has(sortedNondh.id) && (
          <div className="mt-4 space-y-4">
            <div className="border rounded-lg p-4">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h4 className="font-medium">
                    Details for Nondh No: {sortedNondh.number}
                  </h4>
                  
                </div>
                <Badge variant={detail.status === 'invalid' ? 'destructive' : 'default'}>
                  {statusTypes.find(s => s.value === detail.status)?.label || 'Unknown'}
                </Badge>
              </div>

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
                        multiple
                        onChange={(e) => {
                          const file = e.target.files?.[0]
                          if (file) handleFileUpload(file, detail.id)
                        }}
                      />
                      <Upload className="w-5 h-5 text-muted-foreground" />
                    </div>
                    {detail.docUpload && (
                      <div className="flex items-center gap-2 mt-2">
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
                )}
              </div>

              {renderTypeSpecificFields(detail)}
            </div>
          </div>
        )}
      </Card>
    );
  })}

        <div className="flex justify-center pt-6">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save & Continue
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
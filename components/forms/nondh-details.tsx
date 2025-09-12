"use client"
import React from 'react'
import { useState, useEffect, useRef, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Upload, Eye, Loader2, ChevronDown, ChevronUp, Badge} from "lucide-react"
import { useLandRecord, type NondhDetail } from "@/contexts/land-record-context"
import { supabase, uploadFile } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useStepFormData } from "@/hooks/use-step-form-data"

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

const statusTypes = [
  { value: "valid", label: "Pramanik" },
  { value: "invalid", label: "Radd" },
  { value: "nullified", label: "Na manjoor" }
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
  disabled?: boolean;
}

const areaFields = ({ area, onChange, disabled = false }: AreaFieldsProps) => {
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
              disabled={disabled}
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
                disabled={disabled}
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
                disabled={disabled}
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

export default function NondhDetails() {
  const { yearSlabs, nondhs, setNondhs, nondhDetails, setNondhDetails, setCurrentStep, landBasicInfo } = useLandRecord()
  const { toast } = useToast()
  const { getStepData, updateStepData, markAsSaved } = useStepFormData(5) // Step 5 for NondhDetails
  console.log('Initial nondhs data:', nondhs);
  console.log('Land basic info:', landBasicInfo);
  const [loading, setLoading] = useState(false)
  const [nondhDetailData, setNondhDetailData] = useState<NondhDetail[]>(getStepData().nondhDetails || [])
  const [collapsedNondhs, setCollapsedNondhs] = useState<Set<string>>(new Set())
  const [equalDistribution, setEqualDistribution] = useState<Record<string, boolean>>({})
  const [ownerTransfers, setOwnerTransfers] = useState<Record<string, Array<any>>>({})
const [transferEqualDistribution, setTransferEqualDistribution] = useState<Record<string, Record<string, boolean>>>({})
const [affectedNondhDetails, setAffectedNondhDetails] = useState<Record<string, Array<{
  id: string;
  nondhNo: string;
  status: "valid" | "invalid" | "nullified";
  invalidReason?: string;
}>>>({});

const cleanupTimeoutRef = useRef(null);

useEffect(() => {
  if (cleanupTimeoutRef.current) {
    clearTimeout(cleanupTimeoutRef.current);
  }

  cleanupTimeoutRef.current = setTimeout(() => {
    const cleanedData = nondhDetailData.map(detail => {
      if (["Hakkami"].includes(detail.type)) {
        const nonEmptyRelations = detail.ownerRelations.filter(rel => rel.ownerName.trim() !== "");
        if (nonEmptyRelations.length !== detail.ownerRelations.length) {
          return { ...detail, ownerRelations: nonEmptyRelations };
        }
      }
      return detail;
    });
    
    if (JSON.stringify(cleanedData) !== JSON.stringify(nondhDetailData)) {
      setNondhDetailData(cleanedData);
    }
  }, 100);

  return () => {
    if (cleanupTimeoutRef.current) {
      clearTimeout(cleanupTimeoutRef.current);
    }
  };
}, [nondhDetailData.map(d => `${d.id}-${d.type}-${d.ownerRelations.length}`).join(',')]); // More specific dependency

// Initialize additional states from step data
useEffect(() => {
  const stepData = getStepData();
  
  // Always restore additional states if they exist in step data
  if (stepData.ownerTransfers && Object.keys(stepData.ownerTransfers).length > 0) {
    setOwnerTransfers(stepData.ownerTransfers);
  }
  
  if (stepData.transferEqualDistribution && Object.keys(stepData.transferEqualDistribution).length > 0) {
    setTransferEqualDistribution(stepData.transferEqualDistribution);
  }
  
  if (stepData.affectedNondhDetails && Object.keys(stepData.affectedNondhDetails).length > 0) {
    setAffectedNondhDetails(stepData.affectedNondhDetails);
  }
}, []);

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

const updateAffectedNondhValidityChain = (detailId: string, affectedNondhNo: string, newStatus: string) => {
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  
  // Find the affected nondh by number
  const affectedNondhIndex = allSortedNondhs.findIndex(n => 
    safeNondhNumber(n).toString() === affectedNondhNo
  );
  
  if (affectedNondhIndex === -1) return;

  // Update the affected nondh's status to match what was selected
  const affectedNondhId = allSortedNondhs[affectedNondhIndex].id;
  const affectedDetail = nondhDetailData.find(d => d.nondhId === affectedNondhId);
  
  if (affectedDetail) {
    // Create updated state immediately for processing
    const updatedNondhDetailData = nondhDetailData.map(detail => 
      detail.id === affectedDetail.id 
        ? { ...detail, status: newStatus }
        : detail
    );
    
    // Update the actual state
    updateNondhDetail(affectedDetail.id, { status: newStatus });
    
    // Process validity chain with the updated data
    processValidityChainFromNondh(affectedNondhIndex, newStatus, updatedNondhDetailData);
  }
};

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
    // For 2nd Right, return all owners from nondhs that come BEFORE current nondh with matching S.Nos
    const previousNondhs = allSortedNondhs.slice(0, currentIndex);
    
    return previousNondhs
      .filter(nondh => 
        nondh.affectedSNos.some(sNoStr => {
          try {
            const parsed = JSON.parse(sNoStr);
            return currentSNos.includes(parsed.number);
          } catch (e) {
            return currentSNos.includes(sNoStr);
          }
        })
      )
      .flatMap(nondh => {
        const detail = nondhDetailData.find(d => d.nondhId === nondh.id);
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
    // Similar logic for 1st Right...
    const previousNondhs = allSortedNondhs.slice(0, currentIndex);
    
    // Get old owners (excluding 2nd Right from Hukam)
    const oldOwners = previousNondhs
      .filter(nondh => {
        const detail = nondhDetailData.find(d => d.nondhId === nondh.id);
        const hasMatchingSNos = nondh.affectedSNos.some(sNoStr => {
          try {
            const parsed = JSON.parse(sNoStr);
            return currentSNos.includes(parsed.number);
          } catch (e) {
            return currentSNos.includes(sNoStr);
          }
        });
        
        return hasMatchingSNos && !(detail?.type === "Hukam" && detail?.ganot === "2nd Right");
      })
      .flatMap(nondh => {
        const detail = nondhDetailData.find(d => d.nondhId === nondh.id);
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
        const detail = nondhDetailData.find(d => d.nondhId === nondh.id);
        const hasMatchingSNos = nondh.affectedSNos.some(sNoStr => {
          try {
            const parsed = JSON.parse(sNoStr);
            return currentSNos.includes(parsed.number);
          } catch (e) {
            return currentSNos.includes(sNoStr);
          }
        });
        
        return hasMatchingSNos && detail?.type === "Hukam" && detail?.ganot === "2nd Right";
      })
      .flatMap(nondh => {
        const detail = nondhDetailData.find(d => d.nondhId === nondh.id);
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
  const prevDetail = nondhDetailData.find(d => d.nondhId === prevNondhId);
  return prevDetail?.date || '';
};

const getMaxDateForNondh = (nondhId: string): string => {
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  const currentIndex = allSortedNondhs.findIndex(n => n.id === nondhId);
  
  if (currentIndex >= allSortedNondhs.length - 1) return ''; // Last nondh has no maximum date
  
  // Get the date of the next nondh
  const nextNondhId = allSortedNondhs[currentIndex + 1].id;
  const nextDetail = nondhDetailData.find(d => d.nondhId === nextNondhId);
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

    // Owner name validation (at least one non-empty owner name) - Skip for 1st Right Hukam
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

const safeNondhNumber = (nondh: any): number => {
  const numberValue = typeof nondh.number === 'string' 
    ? parseInt(nondh.number, 10) 
    : nondh.number;
  return isNaN(numberValue) ? 0 : numberValue;
};

// Update the handleTypeChange function to include Vechand
const handleTypeChange = (detailId: string, newType: string) => {
  const detail = nondhDetailData.find(d => d.id === detailId);
  if (!detail) return;

  // If changing to Vechand, Varsai, or Hayati and no owner relations exist, initialize one
  if (["Vechand", "Varsai", "Hayati_ma_hakh_dakhal", "Vehchani"].includes(newType) && detail.ownerRelations.length === 0) {
    const newRelation = {
      id: Date.now().toString() + Math.random(),
      ownerName: "",
      area: { value: 0, unit: "sq_m" },
      tenure: "Navi",
      isValid: true
    };
    
    updateNondhDetail(detailId, { 
      type: newType, 
      ownerRelations: [newRelation] 
    });
  } else {
    updateNondhDetail(detailId, { type: newType });
  }
  
  // Initialize default affected nondh for Hukam type
  if (newType === "Hukam" && (!affectedNondhDetails[detailId] || affectedNondhDetails[detailId].length === 0)) {
    addAffectedNondh(detailId);
  }
};

// Add a ref to debounce saves
const saveTimeoutRef = useRef(null);

  // useEffect that saves to step data
useEffect(() => {
  if (nondhDetailData.length === 0) return;
  
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }

  saveTimeoutRef.current = setTimeout(() => {
    const hasContent = nondhDetailData.some(detail => 
      detail.type.trim() !== "" || 
      detail.ownerRelations.some(rel => rel.ownerName.trim() !== "") ||
      detail.status !== "valid" ||
      detail.reason.trim() !== "" ||
      detail.vigat.trim() !== "" ||
      detail.date.trim() !== "" ||
      detail.ganot || 
      detail.sdDate ||
      detail.amount
    );
    
    if (hasContent) {
      updateStepData({
        nondhDetails: nondhDetailData,
        ownerTransfers,
        transferEqualDistribution,
        affectedNondhDetails
      });
    }
  }, 500); // Debounce saves

  return () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
  };
}, [nondhDetailData, ownerTransfers, transferEqualDistribution, affectedNondhDetails]);


// Load nondhs from database first
useEffect(() => {
  const loadNondhs = async () => {
    if (!landBasicInfo?.id) return;

    try {
      const { data: nondhData, error } = await supabase
        .from('nondhs')
        .select('*')
        .eq('land_record_id', landBasicInfo.id)
        .order('number');

      if (error) throw error;

      if (nondhData?.length) {
        const formattedNondhs = nondhData.map(nondh => ({
          id: nondh.id,
          number: nondh.number.toString(),
          sNoType: nondh.s_no_type,
          affectedSNos: Array.isArray(nondh.affected_s_nos) 
            ? nondh.affected_s_nos
            : nondh.affected_s_nos 
              ? JSON.parse(nondh.affected_s_nos) 
              : [],
          nondhDoc: nondh.nondh_doc_url || '',
        }));
        
        setNondhs(formattedNondhs);
        // Clear existing nondhDetailData when nondhs change
        setNondhDetailData([]);
      }
    } catch (error) {
      console.error('Error loading nondhs:', error);
      toast({ title: "Error loading nondhs", variant: "destructive" });
    }
  };

  loadNondhs();
}, [landBasicInfo?.id]);

useEffect(() => {
  if (nondhs.length === 0) return;

  const stepData = getStepData();
  
  // Check if we need to reinitialize (new nondhs or mismatched data)
  const needsReinit = nondhDetailData.length === 0 || 
                     nondhDetailData.length !== nondhs.length ||
                     !nondhs.every(nondh => nondhDetailData.some(detail => detail.nondhId === nondh.id));
  
  if (needsReinit) {
    // Check if we have saved data that matches current nondhs
    const hasSavedDataForCurrentNondhs = stepData.nondhDetails && 
                                         stepData.nondhDetails.length === nondhs.length &&
                                         nondhs.every(nondh => stepData.nondhDetails.some(detail => detail.nondhId === nondh.id));
    
    if (hasSavedDataForCurrentNondhs) {
      // Restore saved data
      setNondhDetailData(stepData.nondhDetails);
      
      // Restore additional states
      if (stepData.ownerTransfers) setOwnerTransfers(stepData.ownerTransfers);
      if (stepData.transferEqualDistribution) setTransferEqualDistribution(stepData.transferEqualDistribution);
      if (stepData.affectedNondhDetails) setAffectedNondhDetails(stepData.affectedNondhDetails);
    } else {
      // Initialize new data for all nondhs
      const initialData = nondhs.map(nondh => {
        const firstSNo = Array.isArray(nondh.affectedSNos) && nondh.affectedSNos.length > 0
          ? typeof nondh.affectedSNos[0] === 'string'
            ? JSON.parse(nondh.affectedSNos[0]).number
            : nondh.affectedSNos[0].number
          : '';
          
        const initialOwnerRelations = [{
          id: Date.now().toString() + Math.random(),
          ownerName: "",
          area: { value: 0, unit: "sq_m" },
          tenure: "Navi",
          isValid: true
        }];
          
        return {
          id: Date.now().toString() + Math.random(), // Ensure unique IDs
          nondhId: nondh.id,
          sNo: firstSNo,
          type: "Kabjedaar",
          reason: "",
          date: "",
          vigat: "",
          status: "valid",
          showInOutput: true,
          hasDocuments: false,
          ganot: undefined,
          sdDate: undefined,
          amount: undefined,
          hukamDate: undefined,
          hukamType: "SSRD",
          restrainingOrder: "no",
          ownerRelations: initialOwnerRelations,
        };
      });
      
      setNondhDetailData(initialData);
      
      // Clear additional states when initializing fresh
      setOwnerTransfers({});
      setTransferEqualDistribution({});
      setAffectedNondhDetails({});
    }
  }
}, [nondhs, nondhDetailData.length]); // Watch for changes in nondhs or length mismatch

  const updateNondhDetail = useCallback((id: string, updates: Partial<NondhDetail>) => {
  setNondhDetailData((prev) => {
    return prev.map((detail) => {
      if (detail.id === id) {
        return { 
          ...detail, 
          ...updates,
          ...(updates.ownerRelations && { ownerRelations: updates.ownerRelations })
        };
      }
      return detail;
    });
  });
}, []);

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

  // Update the addOwnerRelation function to properly handle Vechand type
const addOwnerRelation = (detailId: string) => {
  console.log('addOwnerRelation called for:', detailId);
  const detail = nondhDetailData.find((d) => d.id === detailId)
  console.log('Found detail:', detail);
  
  if (detail) {
    const newRelation = {
      id: Date.now().toString() + Math.random(), // Add randomness for uniqueness
      ownerName: "",
      sNo: detail.sNo,
      area: { value: 0, unit: "sq_m" },
      tenure: "Navi",
      isValid: true
    }
    const updatedRelations = [...detail.ownerRelations, newRelation]
    console.log('Updated relations:', updatedRelations);
    
    updateNondhDetail(detail.id, { ownerRelations: updatedRelations })
    
    // Auto-distribute if equal distribution is enabled
    if (equalDistribution[detailId] && updatedRelations.length > 1) {
      // For Vechand, get old owner area from previous owners data
      let oldOwnerArea = 0;
      if (detail.type === "Vechand" && detail.oldOwner) {
        const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
        const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
        oldOwnerArea = selectedOldOwner?.area?.value || 0;
      } else {
        // For other types, use the first owner's area
        oldOwnerArea = updatedRelations[0]?.area?.value || 0;
      }
      
      const newOwnersCount = updatedRelations.filter(rel => 
        rel.ownerName !== detail.oldOwner
      ).length;
      
      if (newOwnersCount > 0) {
        const equalArea = oldOwnerArea / newOwnersCount;
        
        const redistributed = updatedRelations.map((relation) => {
          // Don't modify old owner area for Vechand type
          if (detail.type === "Vechand" && relation.ownerName === detail.oldOwner) {
            return relation;
          }
          return { ...relation, area: { ...relation.area, value: equalArea } };
        });
        
        updateNondhDetail(detail.id, { ownerRelations: redistributed });
      }
    }
  } else {
    console.log('Detail not found for ID:', detailId);
  }
}

 const removeOwnerRelation = (detailId: string, relationId: string) => {
  const detail = nondhDetailData.find((d) => d.id === detailId) // Changed from nondhId to id
  if (detail) {
    const updatedRelations = detail.ownerRelations.filter((r) => r.id !== relationId)
    updateNondhDetail(detail.id, { ownerRelations: updatedRelations })
    
    // Auto-redistribute if equal distribution is enabled
    if (equalDistribution[detail.id] && updatedRelations.length > 1) {
      const oldOwnerArea = updatedRelations[0]?.area?.value || 0
      const newOwnersCount = updatedRelations.length - 1
      const equalArea = oldOwnerArea / newOwnersCount
      
      const redistributed = updatedRelations.map((relation, index) => {
        if (index === 0) return relation
        return { ...relation, area: { ...relation.area, value: equalArea } }
      })
      
      updateNondhDetail(detail.id, { ownerRelations: redistributed })
    }
  }
}

const updateOwnerRelation = (detailId: string, relationId: string, updates: any) => {
  const detail = nondhDetailData.find((d) => d.id === detailId) // Changed from nondhId to id
  if (detail) {
    const updatedRelations = detail.ownerRelations.map((relation) =>
      relation.id === relationId ? { ...relation, ...updates } : relation,
    )
    updateNondhDetail(detail.id, { ownerRelations: updatedRelations })
    
    // Validate area constraints for Varsai
    if (detail.type === "Varsai" && !equalDistribution[detail.id]) {
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

const sortNondhs = (a: Nondh, b: Nondh): number => {
  // Get primary types from affected_s_nos
  const aType = getPrimarySNoType(a.affectedSNos);
  const bType = getPrimarySNoType(b.affectedSNos);

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
  // Get previous owners for dropdown (Varsai, Hakkami, Vechand, Vehchani, Hayati_ma_hakh_dakhal)
const getPreviousOwners = (sNo: string, currentNondhId: string) => {
  // First, get the current nondh to understand what S.Nos it affects
  const currentNondh = nondhs.find(n => n.id === currentNondhId);
  if (!currentNondh) return [];

  // Extract all S.No numbers that the current nondh affects
  const currentAffectedSNos = currentNondh.affectedSNos.map(sNoStr => {
    try {
      const parsed = JSON.parse(sNoStr);
      return parsed.number;
    } catch (e) {
      return sNoStr;
    }
  });

  // Get all nondhs sorted by priority
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  const currentIndex = allSortedNondhs.findIndex(n => n.id === currentNondhId);
  
  // Only look at nondhs that come BEFORE the current one
  const previousNondhs = allSortedNondhs.slice(0, currentIndex);

  return nondhDetailData
    .filter(d => {
      // Must be from a previous nondh
      const nondh = previousNondhs.find(n => n.id === d.nondhId);
      if (!nondh) return false;
      
      // Check if this previous nondh affects any of the same S.Nos as current nondh
      const hasMatchingSNo = nondh.affectedSNos.some(sNoStr => {
        try {
          const parsed = JSON.parse(sNoStr);
          return currentAffectedSNos.includes(parsed.number);
        } catch (e) {
          return currentAffectedSNos.includes(sNoStr);
        }
      });
      
      return hasMatchingSNo && 
             ["Varsai", "Hakkami", "Vechand", "Kabjedaar", "Ekatrikaran", "Hayati_ma_hakh_dakhal", "Vehchani"].includes(d.type);
    })
    .sort((a, b) => {
      const nondhA = nondhs.find(n => n.id === a.nondhId);
      const nondhB = nondhs.find(n => n.id === b.nondhId);
      return nondhA && nondhB ? sortNondhs(nondhA, nondhB) : 0;
    })
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
  
  if (detail.type === "Vechand") {
    console.log('Vechand detail ownerRelations:', detail.ownerRelations);
    console.log('Vechand detail:', detail);
  }

  // For Hakkami - get previous owners for both dropdowns
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
              onChange={(e) => updateNondhDetail(detail.id, { sdDate: e.target.value })}
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
            // Find the selected owner from previous owners
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
                // For Vechand, Hayati, Varsai - only update oldOwner field
                // Keep the existing new owner relations (don't add old owner to relations)
                updateNondhDetail(detail.id, { 
                  oldOwner: selectedOwner.name
                });
              }
              
              if (detail.status === 'invalid') {
                updateValidityChain(detail.id, selectedOwner.name, false);
              } else {
                updateValidityChain(detail.id, selectedOwner.name, true);
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
              onCheckedChange={(checked) => {
                setEqualDistribution(prev => ({ ...prev, [detail.id]: checked }));
                
                if (checked) {
                  const oldOwnerRelation = detail.ownerRelations.find(rel => rel.ownerName === detail.oldOwner);
                  const oldOwnerArea = oldOwnerRelation?.area?.value || 0;
                  
                  // Get only new owners (excluding old owner)
                  const newOwners = detail.ownerRelations.filter(rel => 
                    rel.ownerName.trim() !== "" && rel.ownerName !== detail.oldOwner
                  );
                  const newOwnersCount = newOwners.length;
                  
                  if (newOwnersCount > 0) {
                    const equalArea = oldOwnerArea / newOwnersCount;
                    
                    const updatedRelations = detail.ownerRelations.map((relation) => {
                      if (relation.ownerName === detail.oldOwner) {
                        return relation; // Keep old owner area unchanged
                      }
                      return { ...relation, area: { ...relation.area, value: equalArea } };
                    });
                    
                    updateNondhDetail(detail.id, { ownerRelations: updatedRelations });
                  }
                }
              }}
            />
            <Label htmlFor={`equal_dist_${detail.id}`}>Equal Distribution of Land</Label>
          </div>

          {/* Available Previous Owners as Checkboxes for NEW owners only */}
          <div className="space-y-2">
            <Label>Select New Owners *</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
              {hakkamiPreviousOwners
                .filter(owner => owner.name !== detail.oldOwner) // Exclude the selected old owner
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
                            // Add new owner relation
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
                            // Remove owner relation (only if not the old owner)
                            updatedRelations = updatedRelations.filter(rel => 
                              rel.ownerName !== owner.name || rel.ownerName === detail.oldOwner
                            );
                          }
                          
                          updateNondhDetail(detail.id, { ownerRelations: updatedRelations });
                          
                          // Auto-distribute if equal distribution is enabled
                          if (equalDistribution[detail.id] && oldOwnerRelation) {
                            const newOwnersCount = updatedRelations.filter(rel => 
                              rel.ownerName !== detail.oldOwner
                            ).length;
                            
                            if (newOwnersCount > 0) {
                              const equalArea = oldOwnerArea / newOwnersCount;
                              
                              const redistributed = updatedRelations.map(relation => {
                                if (relation.ownerName === detail.oldOwner) {
                                  return relation; // Keep old owner area unchanged
                                }
                                return { ...relation, area: { ...relation.area, value: equalArea } };
                              });
                              
                              updateNondhDetail(detail.id, { ownerRelations: redistributed });
                            }
                          }
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

          {/* Area Distribution for NEW Owners Only */}
          {detail.ownerRelations.filter(rel => 
            rel.ownerName.trim() !== "" && rel.ownerName !== detail.oldOwner
          ).length > 0 && (
            <div className="space-y-3">
              <Label>Area Distribution for New Owners</Label>
              
              {/* Show new owners with editable areas */}
              {detail.ownerRelations
                .filter(rel => rel.ownerName.trim() !== "" && rel.ownerName !== detail.oldOwner)
                .map((relation) => (
                  <div key={relation.id} className="flex items-center gap-3 p-2 border rounded">
                    <span className="min-w-0 flex-1 font-medium">{relation.ownerName}</span>
                    <div className="flex-shrink-0">
                      {areaFields({
                        area: relation.area,
                        onChange: (newArea) => updateOwnerRelation(detail.id, relation.id, { area: newArea }),
                        disabled: equalDistribution[detail.id]
                      })}
                    </div>
                  </div>
                ))}
              
              {/* Area validation display */}
              <div className="text-sm text-muted-foreground">
                {(() => {
                  const oldOwnerRelation = detail.ownerRelations.find(rel => rel.ownerName === detail.oldOwner);
                  const oldOwnerArea = oldOwnerRelation?.area?.value || 0;
                  const newOwnersTotal = detail.ownerRelations
                    .filter(rel => rel.ownerName !== detail.oldOwner)
                    .reduce((sum, rel) => sum + (rel.area?.value || 0), 0);
                  const remaining = oldOwnerArea - newOwnersTotal;
                  
                  return (
                    <div className={`p-2 rounded ${remaining < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      Old Owner Area: {oldOwnerArea} | New Owners Total: {newOwnersTotal} | Remaining: {remaining}
                      {remaining < 0 && " (⚠️ Exceeds old owner area!)"}
                      {remaining > 0 && " (Old owner retains remaining area)"}
                      {equalDistribution[detail.id] && ` (Equal distribution: ${(oldOwnerArea / detail.ownerRelations.filter(rel => rel.ownerName !== detail.oldOwner).length).toFixed(2)} each)`}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Equal distribution checkbox - shown for Hayati, Varsai, and Vechand */}
      {(detail.type === "Hayati_ma_hakh_dakhal" || detail.type === "Varsai" || detail.type === "Vechand") && (
        <div className="flex items-center space-x-2">
          <Checkbox
            id={`equal_dist_${detail.id}`}
            checked={equalDistribution[detail.id] || false}
            onCheckedChange={(checked) => {
              setEqualDistribution(prev => ({ ...prev, [detail.id]: checked }));
              
              if (checked) {
                // Get old owner area from previous owners data, not from ownerRelations
                const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
                const oldOwnerArea = selectedOldOwner?.area?.value || 0;
                
                // Get only new owners (excluding any potential old owner that might be in relations)
                const newOwners = detail.ownerRelations.filter(rel => 
                  rel.ownerName.trim() !== "" && rel.ownerName !== detail.oldOwner
                );
                const newOwnersCount = newOwners.length;
                
                if (newOwnersCount > 0) {
                  const equalArea = oldOwnerArea / newOwnersCount;
                  
                  const updatedRelations = detail.ownerRelations.map((relation) => {
                    // Don't modify old owner area (it shouldn't be in relations anyway)
                    if (relation.ownerName === detail.oldOwner) {
                      return relation;
                    }
                    return { ...relation, area: { ...relation.area, value: equalArea } };
                  });
                  
                  updateNondhDetail(detail.id, { ownerRelations: updatedRelations });
                }
              }
            }}
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

              {/* Owner Name and Tenure in one row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    value={relation.ownerName}
                    onChange={(e) => updateOwnerRelation(detail.id, relation.id, { ownerName: e.target.value })}
                    placeholder="Enter new owner name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Tenure</Label>
                  <Select
                    value={relation.tenure || "Navi"}
                    onValueChange={(value) => updateOwnerRelation(detail.id, relation.id, { tenure: value })}
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

              {/* Area in next row */}
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
          
          {/* Show remaining area info */}
          <div className="text-sm text-muted-foreground p-2 bg-gray-50 rounded">
            {(() => {
              // Get old owner area from previous owners data
              const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
              const oldOwnerArea = selectedOldOwner?.area?.value || 0;
              
              const newOwnersTotal = detail.ownerRelations
                .filter(rel => rel.ownerName !== detail.oldOwner)
                .reduce((sum, rel) => sum + (rel.area?.value || 0), 0);
              const remaining = oldOwnerArea - newOwnersTotal;
              
              return (
                <div className={`p-2 rounded ${remaining < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                  Old Owner Area: {oldOwnerArea} | New Owners Total: {newOwnersTotal} | Remaining: {remaining}
                  {remaining < 0 && " (⚠️ Exceeds old owner area!)"}
                  {remaining > 0 && " (Old owner retains remaining area)"}
                  {equalDistribution[detail.id] && ` (Equal distribution: ${(oldOwnerArea / detail.ownerRelations.filter(rel => rel.ownerName !== detail.oldOwner).length).toFixed(2)} each)`}
                </div>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
};

  const renderTypeSpecificFields = (detail: NondhDetail) => {

  // Handle other types that need owner selection
  if (["Hayati_ma_hakh_dakhal", "Varsai", "Hakkami", "Vechand", "Vehchani"].includes(detail.type)) {
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
case "Bojo":
  return (
    <div className="space-y-4">
      {/* Owner Details Section - Compact like Kabjedaar */}
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

            {/* Compact layout like Kabjedaar */}
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
                <div className="flex gap-2 items-center">
                  <Input
                    type="number"
                    value={relation.area.value || 0}
                    onChange={(e) => {
                      const newValue = parseFloat(e.target.value) || 0;
                      updateOwnerRelation(detail.id, relation.id, { 
                        area: { ...relation.area, value: newValue } 
                      });
                    }}
                    className="w-20"
                    min="0"
                    step="0.01"
                  />
                  <Select
                    value={relation.area.unit}
                    onValueChange={(value) => updateOwnerRelation(detail.id, relation.id, { 
                      area: { ...relation.area, unit: value } 
                    })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="sq_m">Sq. M</SelectItem>
                      <SelectItem value="acre_guntha">Acre-Guntha</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Tenure</Label>
                <Select
                  value={relation.tenure || "Navi"}
                  onValueChange={(value) => updateOwnerRelation(detail.id, relation.id, { tenure: value })}
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
                          const nondhDetail = nondhDetailData.find(d => d.nondhId === nondh.id);
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
                                    {typeLabel} No: {typeof nondh.affectedSNos[0] === 'string' ? nondh.affectedSNos[0] : nondh.affectedSNos[0]?.number || ''}
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
  updateAffectedNondh(detail.id, affected.id, { 
    status: value,
    invalidReason: value === "invalid" ? affected.invalidReason : ""
  });
  
  // Update validity chain based on this change
  if (affected.nondhNo) {
    updateAffectedNondhValidityChain(detail.id, affected.nondhNo, value);
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
    onChange={(e) => updateAffectedNondh(detail.id, affected.id, { invalidReason: e.target.value })}
    placeholder={affected.status === "invalid" ? "Enter reason for invalidation" : "Enter reason (optional)"}
  />
</div>
            </Card>
          );
        })}
      </div>
{/* Show tenure for ALT Krushipanch and Collector */}
          {(detail.hukamType === "ALT Krushipanch" || detail.hukamType === "Collector") && (
            <div className="space-y-2">
              <Label>Tenure Type</Label>
              <Select
                value={detail.ownerRelations[0]?.tenure || "Navi"}
                onValueChange={(value) => {
                  if (detail.ownerRelations.length === 0) {
                    addOwnerRelation(detail.id);
                  }
                  updateOwnerRelation(detail.id, detail.ownerRelations[0]?.id, { tenure: value });
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

        {/* Owner Name - Full width */}
        <div className="space-y-2 mb-3">
          <Label>Owner Name</Label>
          <Input
            value={relation.ownerName}
            onChange={(e) => updateOwnerRelation(detail.id, relation.id, { ownerName: e.target.value })}
            placeholder="Enter owner name"
          />
        </div>

        {/* Area - Compact like Kabjedaar */}
        <div className="space-y-2">
          <Label>Area</Label>
          {areaFields({
            area: relation.area,
            onChange: (newArea) => updateOwnerRelation(detail.id, relation.id, { area: newArea })
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
      const currentSNos = currentNondh?.affectedSNos.map(sNo => 
        typeof sNo === 'string' ? JSON.parse(sNo).number : sNo.number
      ) || [];
      
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

          {/* Old Owner Selection */}
          <div className="space-y-2 mb-4">
            <Label>Old Owner *</Label>
            <Select
              value={transfer.oldOwner}
              onValueChange={(value) => {
                const selectedOwner = availableOwners.oldOwners.find(o => o.id === value);
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
                {availableOwners.oldOwners.map((owner) => (
                  <SelectItem key={owner.id} value={owner.id}>
                    {owner.name} - {owner.area.value} {owner.area.unit} (From Nondh: {nondhs.find(n => n.id === owner.nondhId)?.number})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Equal Distribution Checkbox */}
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
                
                if (checked && transfer.newOwners.length > 1) {
                  const equalArea = (transfer.oldOwnerArea.value || 0) / transfer.newOwners.length;
                  const newAreas = transfer.newOwners.map(ownerId => ({
                    ownerId,
                    area: { value: equalArea, unit: transfer.oldOwnerArea.unit }
                  }));
                  updateOwnerTransfer(detail.id, transfer.id, { newOwnerAreas: newAreas });
                }
              }}
              disabled={transfer.newOwners.length <= 1}
            />
            <Label htmlFor={`equal_dist_${detail.id}_${transfer.id}`}>
              Equal Distribution of Land {transfer.newOwners.length <= 1 && "(Select multiple owners to enable)"}
            </Label>
          </div>

          {/* New Owners Selection */}
          <div className="space-y-2 mb-4">
            <Label>New Owners *</Label>
            <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
              {availableOwners.newOwners.map((owner) => (
                <div key={owner.id} className="flex items-center space-x-2 mb-2">
                  <Checkbox
                    id={`new_owner_${owner.id}`}
                    checked={transfer.newOwners.includes(owner.id)}
                    onCheckedChange={(checked) => {
                      const updatedNewOwners = checked
                        ? [...transfer.newOwners, owner.id]
                        : transfer.newOwners.filter(id => id !== owner.id);
                      
                      updateOwnerTransfer(detail.id, transfer.id, { newOwners: updatedNewOwners });
                      
                      // Auto-distribute if equal distribution is enabled
                      if (isEqualDistribution && updatedNewOwners.length > 0) {
                        const equalArea = (transfer.oldOwnerArea.value || 0) / updatedNewOwners.length;
                        const newAreas = updatedNewOwners.map(ownerId => ({
                          ownerId,
                          area: { value: equalArea, unit: transfer.oldOwnerArea.unit }
                        }));
                        updateOwnerTransfer(detail.id, transfer.id, { newOwnerAreas: newAreas });
                      }
                    }}
                  />
                  <Label htmlFor={`new_owner_${owner.id}`} className="flex-1">
                    {owner.name} - {owner.area.value} {owner.area.unit} (From Nondh: {nondhs.find(n => n.id === owner.nondhId)?.number})
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Area Distribution for Selected New Owners - Show regardless of equal distribution */}
          {transfer.newOwners.length > 0 && (
            <div className="space-y-3">
              <Label>Area Distribution for New Owners</Label>
              {transfer.newOwners.map((ownerId) => {
                const owner = availableOwners.newOwners.find(o => o.id === ownerId);
                const currentArea = transfer.newOwnerAreas.find(a => a.ownerId === ownerId)?.area || { value: 0, unit: 'sq_m' };
                
                return (
                  <div key={ownerId} className="flex items-center gap-3 p-2 border rounded">
                    <span className="min-w-0 flex-1 font-medium">{owner?.name}</span>
                    <div className="flex-shrink-0">
                      {areaFields({
                        area: currentArea,
                        onChange: (newArea) => {
                          // If equal distribution is enabled, don't allow manual changes
                          if (isEqualDistribution) return;
                          
                          const updatedAreas = transfer.newOwnerAreas.filter(a => a.ownerId !== ownerId);
                          updatedAreas.push({ ownerId, area: newArea });
                          updateOwnerTransfer(detail.id, transfer.id, { newOwnerAreas: updatedAreas });
                        },
                        disabled: isEqualDistribution // Disable if equal distribution is on
                      })}
                    </div>
                  </div>
                );
              })}
              
              {/* Area validation display */}
              <div className="text-sm text-muted-foreground">
                {(() => {
                  const totalNewOwnerArea = transfer.newOwnerAreas.reduce((sum, area) => sum + area.area.value, 0);
                  const oldOwnerArea = transfer.oldOwnerArea.value || 0;
                  const remaining = oldOwnerArea - totalNewOwnerArea;
                  
                  return (
                    <div className={`p-2 rounded ${remaining < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
                      Old Owner Area: {oldOwnerArea} | New Owners Total: {totalNewOwnerArea} | Remaining: {remaining}
                      {remaining < 0 && " (⚠️ Exceeds old owner area!)"}
                      {isEqualDistribution && ` (Equal distribution: ${(oldOwnerArea / transfer.newOwners.length).toFixed(2)} each)`}
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
{(!detail.ganot || (detail.ganot !== "1st Right" && detail.ganot !== "2nd Right")) && (
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
const handleGanotChange = (detailId: string, ganot: string) => {
  updateNondhDetail(detailId, { ganot });
  
  // Create default transfer for 1st Right if none exists
  if (ganot === "1st Right" && (!ownerTransfers[detailId] || ownerTransfers[detailId].length === 0)) {
    addOwnerTransfer(detailId);
  }
};
  const handleSubmit = async () => {
    // Force save current state to step data immediately before submitting
   const immediateStepData = {
    nondhDetails: nondhDetailData,
    ownerTransfers,
    transferEqualDistribution,
    affectedNondhDetails
  };
  updateStepData(immediateStepData);
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

  const validation = validateNondhDetails(processedDetails);
if (!validation.isValid) {
  toast({
    title: "Validation Error",
    description: validation.errors.join('; '),
    variant: "destructive"
  });
  return;
}

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

    // Insert new nondh details 
    const { data: insertedDetails, error: insertError } = await supabase
  .from('nondh_details')
  .insert(validNondhDetails.map(detail => ({
    nondh_id: detail.nondhId,
    s_no: detail.sNo || nondhs.find(n => n.id === detail.nondhId)?.affectedSNos[0] || '',
    type: detail.type,
    reason: detail.reason || null,
    date: detail.date || null,
    hukam_date: detail.hukamDate || null,
    hukam_type: detail.hukamType || 'SSRD',
    vigat: detail.vigat || null,
    status: detail.status,
    invalid_reason: detail.status === 'invalid' ? (detail.invalidReason || null) : null,
    old_owner: detail.oldOwner || null,
    show_in_output: detail.showInOutput !== false,
    has_documents: detail.hasDocuments || false,
    doc_upload_url: detail.docUpload || null,
    hukam_status: detail.hukamStatus || 'valid',
    hukam_invalid_reason: detail.hukamInvalidReason || null,
    affected_nondh_details: affectedNondhDetails[detail.id] && affectedNondhDetails[detail.id].length > 0 
      ? JSON.stringify(affectedNondhDetails[detail.id].map(a => ({
          nondhNo: a.nondhNo,
          status: a.status,
          invalidReason: a.invalidReason || null
        }))) 
      : null,
    ganot: detail.ganot || null,
    restraining_order: detail.restrainingOrder || 'no',
    sd_date: detail.sdDate || null,
    amount: detail.amount || null
  })))
  .select();

if (insertError) throw insertError;

    // Prepare owner relations data
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
        is_valid: relation.isValid !== false
      };
    });
});

    //  Insert owner relations in batch
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

    // Update local state
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
    .map(sNoStr => {
      try {
        return JSON.parse(sNoStr);
      } catch (e) {
        return { number: sNoStr, type: 's_no' };
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
          <div className="flex items-center gap-2">
            {/* Show nondh document if available */}
            {sortedNondh.nondhDoc && (
              <div className="flex items-center gap-2 mr-4">
                <div className="text-sm">
                  <div className="font-medium text-blue-600">
                    {sortedNondh.nondhDocFileName || 'Nondh Document'}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(sortedNondh.nondhDoc, '_blank')}
                    className="mt-1"
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Document
                  </Button>
                </div>
              </div>
            )}
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
    onValueChange={(value) => handleTypeChange(detail.id, value)}
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
    min={getMinDateForNondh(sortedNondh.id)}
    max={getMaxDateForNondh(sortedNondh.id)}
    onChange={(e) => {
      const newDate = e.target.value;
      if (isValidNondhDateOrder(sortedNondh.id, newDate)) {
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
</div>

{/* Move Hukam Date and Type here for Hukam type */}
{detail.type === "Hukam" && (
  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
    <div className="space-y-2">
  <Label>Hukam Date *</Label>
  <Input
    type="date"
    value={detail.hukamDate || ''}
    min={getMinDateForNondh(sortedNondh.id)}
    max={getMaxDateForNondh(sortedNondh.id)}
    onChange={(e) => {
      const newDate = e.target.value;
      if (isValidNondhDateOrder(sortedNondh.id, newDate)) {
        updateNondhDetail(detail.id, { hukamDate: newDate });
      } else {
        toast({
          title: "Invalid Hukam Date",
          description: "Hukam dates must follow nondh date order",
          variant: "destructive"
        });
      }
    }}
    className="w-full"
  />
</div>
    <div className="space-y-2">
      <Label>Hukam Type</Label>
      <Select
        value={detail.hukamType || "SSRD"}
        onValueChange={(value) => {
          updateNondhDetail(detail.id, { hukamType: value });
          // Clear ganot if not ALT Krushipanch
          if (value !== "ALT Krushipanch") {
            updateNondhDetail(detail.id, { ganot: undefined });
          }
        }}
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
    {/* Add Ganot field for ALT Krushipanch */}
    {detail.hukamType === "ALT Krushipanch" && (
  <div className="space-y-2 md:col-span-2">
    <Label>Ganot *</Label>
    <Select
      value={detail.ganot || ''}
      onValueChange={(value) => handleGanotChange(detail.id, value)}
    >
      <SelectTrigger className="w-full">
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
  </div>
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
  </div>
  
  {/* Reason field - always shown, mandatory only for invalid status */}
  <div className="space-y-2">
    <Label>Reason {detail.status === "invalid" ? "*" : "(Optional)"}</Label>
    <Input
      value={detail.invalidReason || ''}
      onChange={(e) => updateNondhDetail(detail.id, { invalidReason: e.target.value })}
      placeholder="Enter reason"
    />
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
"use client"
import React from 'react'
import { useState, useEffect, useCallback } from "react"
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
import { useStepFormData } from "@/hooks/use-step-form-data";

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
  maxValue?: number; // New prop for maximum allowed value 
}

const statusTypes = [
  { value: "valid", label: "Pramanik" },
  { value: "invalid", label: "Radd" },
  { value: "nullified", label: "Na manjoor" }
]

const GUNTHAS_PER_ACRE = 40;
const SQM_PER_GUNTHA = 101.1714;
const SQM_PER_ACRE = SQM_PER_GUNTHA * GUNTHAS_PER_ACRE;

const areaFields = ({ area, onChange, disabled = false, maxValue }: AreaFieldsProps) => {
  // Define constants
  const SQM_PER_GUNTHA = 101.17;
  const SQM_PER_ACRE = 4046.86;
  const GUNTHAS_PER_ACRE = 40;

  // Add validation function that uses maxValue
  const validateAreaInput = (newValue: number, currentArea: any): number => {
    // Prevent negative values
    if (newValue < 0) return 0;
    
    // Prevent exceeding maximum if maxValue is provided
    if (maxValue !== undefined && maxValue !== null && newValue > maxValue) {
      return maxValue;
    }
    
    return newValue;
  };

  const handleValueChange = (field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    
    // Apply validation
    const validatedValue = validateAreaInput(numValue, area);
    
    if (area.unit === 'acre_guntha') {
      const newArea = { ...area, [field]: validatedValue };
      
      // Recalculate the other field if acres/gunthas changed
      if (field === 'acres') {
        // Keep gunthas as is, just update acres
      } else if (field === 'gunthas') {
        // Keep acres as is, just update gunthas
        if (validatedValue >= 40) {
          newArea.acres = (area.acres || 0) + Math.floor(validatedValue / 40);
          newArea.gunthas = validatedValue % 40;
        }
      }
      
      onChange(newArea);
    } else {
      onChange({ ...area, value: validatedValue });
    }
  };

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

  // Calculate display values based on current state
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
        sq_m: calculatedSqm ? parseFloat(calculatedSqm.toFixed(2)) : calculatedSqm,
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
      const validatedValue = validateAreaInput(num, workingArea);
      const totalAcres = convertFromSquareMeters(validatedValue, "acre");
      const acres = Math.floor(totalAcres);
      const remainingGuntha = Math.round((totalAcres - acres) * 40);
      
      if (workingArea.unit === "sq_m") {
        onChange({
          ...workingArea,
          value: validatedValue,
          acres,
          gunthas: remainingGuntha
        });
      } else {
        onChange({
          ...workingArea,
          unit: "acre_guntha",
          acres,
          gunthas: remainingGuntha,
          sq_m: parseFloat(validatedValue.toFixed(2))
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
      const validatedValue = validateAreaInput(num, workingArea);
      
      if (workingArea.unit === "sq_m") {
        const newSqm = convertToSquareMeters(validatedValue, "acre") + 
                      (displayValues.gunthas ? convertToSquareMeters(displayValues.gunthas, "guntha") : 0);
        onChange({
          ...workingArea,
          value: newSqm,
          acres: validatedValue,
          gunthas: displayValues.gunthas
        });
      } else {
        onChange({
          ...workingArea,
          unit: "acre_guntha",
          acres: validatedValue,
          sq_m: parseFloat((convertToSquareMeters(validatedValue, "acre") + 
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
        return;
      }
      
      const validatedValue = validateAreaInput(num, workingArea);
      
      if (workingArea.unit === "sq_m") {
        const newSqm = (displayValues.acres ? convertToSquareMeters(displayValues.acres, "acre") : 0) + 
                      convertToSquareMeters(validatedValue, "guntha");
        onChange({
          ...workingArea,
          value: newSqm,
          acres: displayValues.acres,
          gunthas: validatedValue
        });
      } else {
        onChange({
          ...workingArea,
          unit: "acre_guntha",
          gunthas: validatedValue,
          sq_m: parseFloat(((workingArea.acres ? convertToSquareMeters(workingArea.acres, "acre") : 0) +
               convertToSquareMeters(validatedValue, "guntha")).toFixed(2))
        });
      }
    }
  };

  const formatValue = (value: number | undefined): string => {
    return value === undefined ? "" : value.toString();
  };

  // Add max value indicator
  const showMaxValueWarning = maxValue !== undefined && maxValue !== null && area.value > maxValue;

  return (
    <div className="space-y-4">
      {/* Max Value Warning */}
      {showMaxValueWarning && (
        <div className="bg-red-50 border border-red-200 rounded p-2">
          <p className="text-red-700 text-sm">
            ⚠️ Area exceeds maximum allowed value: {maxValue}
          </p>
        </div>
      )}

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
                const sqmValue = displayValues.sq_m || 0;
                onChange({ 
                  ...workingArea, 
                  unit: "sq_m",
                  value: sqmValue,
                  acres: displayValues.acres,
                  gunthas: displayValues.gunthas
                });
              } else {
                onChange({ 
                  ...workingArea, 
                  unit: "acre_guntha",
                  acres: displayValues.acres || 0,
                  gunthas: displayValues.gunthas || 0,
                  sq_m: displayValues.sq_m
                });
              }
            }}
            disabled={disabled}
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
                readOnly
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
                readOnly
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
              readOnly
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
                const sqmValue = displayValues.sq_m || 0;
                onChange({ 
                  ...workingArea, 
                  unit: "sq_m",
                  value: sqmValue,
                  acres: displayValues.acres,
                  gunthas: displayValues.gunthas
                });
              } else {
                onChange({ 
                  ...workingArea, 
                  unit: "acre_guntha",
                  acres: displayValues.acres || 0,
                  gunthas: displayValues.gunthas || 0,
                  sq_m: displayValues.sq_m
                });
              }
            }}
            disabled={disabled}
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
              disabled={disabled}
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
                disabled={disabled}
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
                readOnly
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
                readOnly
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
              readOnly
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
const { getStepData, updateStepData, markAsSaved, hasUnsavedChanges } = useStepFormData(5)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [hasChanges, setHasChanges] = useState(false)
  const [isInitialized, setIsInitialized] = useState(false);
 const getStepFormData = () => {
  const stepData = getStepData();
  return {
    nondhs: stepData.nondhs || [],
    nondhDetails: stepData.nondhDetails || [],
    originalDetails: stepData.originalDetails || [],
    collapsedNondhs: new Set(stepData.collapsedNondhs || []),
    equalDistribution: stepData.equalDistribution || {},
    documents712: stepData.documents712 || [],
    ownerTransfers: stepData.ownerTransfers || {},
    transferEqualDistribution: stepData.transferEqualDistribution || {},
    affectedNondhDetails: stepData.affectedNondhDetails || {},
    originalAffectedNondhDetails: stepData.originalAffectedNondhDetails || {}
  };
};

const [localState, setLocalState] = useState(() => ({
  nondhs: [],
  nondhDetails: [],
  originalDetails: [],
  collapsedNondhs: new Set(),
  equalDistribution: {},
  documents712: [],
  ownerTransfers: {},
  transferEqualDistribution: {},
  affectedNondhDetails: {},
  originalAffectedNondhDetails: {}
}));

// Get values from localState
const nondhs = Array.isArray(localState.nondhs) ? localState.nondhs : [];
const nondhDetails = localState.nondhDetails;
const originalDetails = localState.originalDetails;
const collapsedNondhs = localState.collapsedNondhs;
const equalDistribution = localState.equalDistribution;
const documents712 = localState.documents712;
const ownerTransfers = localState.ownerTransfers;
const transferEqualDistribution = localState.transferEqualDistribution;
const affectedNondhDetails = localState.affectedNondhDetails;
const originalAffectedNondhDetails = localState.originalAffectedNondhDetails;

const updateLocalState = (field: string, value: any) => {
  setLocalState(prev => {
    const newState = { ...prev, [field]: value };
    
    // Sync immediately without setTimeout
    const currentData = getStepData();
    updateStepData({ 
      ...currentData, 
      [field]: value 
    });
    
    return newState;
  });
};

useEffect(() => {
  console.log('nondhDetails updated:', nondhDetails);
  console.log('nondhs:', nondhs);
}, [nondhDetails, nondhs]);

const setLocalNondhs = (nondhs: any[]) => updateLocalState('nondhs', nondhs);
const setNondhDetails = (details: NondhDetail[]) => updateLocalState('nondhDetails', details);
const setOriginalDetails = (details: NondhDetail[]) => updateLocalState('originalDetails', details);
const setCollapsedNondhs = (collapsed: Set<string>) => updateLocalState('collapsedNondhs', Array.from(collapsed));
const setEqualDistribution = (distribution: Record<string, boolean>) => updateLocalState('equalDistribution', distribution);
const setDocuments712 = (docs: any[]) => updateLocalState('documents712', docs);
const setOwnerTransfers = (transfers: Record<string, Array<any>>) => updateLocalState('ownerTransfers', transfers);
const setTransferEqualDistribution = (distribution: Record<string, Record<string, boolean>>) => updateLocalState('transferEqualDistribution', distribution);
const setAffectedNondhDetails = (details: Record<string, Array<any>>) => updateLocalState('affectedNondhDetails', details);
const setOriginalAffectedNondhDetails = (details: Record<string, Array<any>>) => updateLocalState('originalAffectedNondhDetails', details);

useEffect(() => {
  const initializeData = async () => {
    const stepData = getStepData();
    console.log('Step data on mount/return:', stepData);
    
    if (stepData) {
      try {
        setLoading(true); // Start loading
        
        // ALWAYS load nondhs from database to get the numbers (1, 2, 3, etc.)
        const { data: nondhData, error: nondhError } = await LandRecordService.getNondhsforDetails(recordId);
        
        if (!nondhError && nondhData) {
          const formattedNondhs = nondhData.map(nondh => ({
            ...nondh,
            affectedSNos: Array.isArray(nondh.affected_s_nos) 
              ? nondh.affected_s_nos 
              : nondh.affectedSNos 
                ? [nondh.affectedSNos] 
                : [],
            nondhDoc: nondh.nondh_doc_url || ''
          }));
          
          console.log('Nondh numbers from DB:', formattedNondhs.map(n => n.number));
          
          // Check if we need to load nondh details from database
          const needsDetails = !stepData.nondhDetails || stepData.nondhDetails.length === 0;
          
          if (needsDetails) {
            // Load details from database (your original logic)
            await loadDataFromDatabase(formattedNondhs);
          } else {
            // Use nondhs from DB but keep nondhDetails from step data
            setLocalState({
              nondhs: formattedNondhs, // From database
              nondhDetails: stepData.nondhDetails || [], // From step data
              originalDetails: stepData.originalDetails || [],
              collapsedNondhs: new Set(stepData.collapsedNondhs || []),
              equalDistribution: stepData.equalDistribution || {},
              documents712: stepData.documents712 || [],
              ownerTransfers: stepData.ownerTransfers || {},
              transferEqualDistribution: stepData.transferEqualDistribution || {},
              affectedNondhDetails: stepData.affectedNondhDetails || {},
              originalAffectedNondhDetails: stepData.originalAffectedNondhDetails || {}
            });
            
            // Update step data with the new nondhs but keep existing details
            updateStepData({
              ...stepData,
              nondhs: formattedNondhs
            });
          }
        }
        const { data: docs712Data, error: docs712Error } = await LandRecordService.get712Documents(recordId);
if (!docs712Error && docs712Data) {
  setDocuments712(docs712Data);
}
        setIsInitialized(true);
      } catch (error) {
        console.error('Error in initializeData:', error);
      } finally {
        setLoading(false); // Always stop loading
      }
    } else {
      setLoading(false); // Also stop loading if no step data
    }
  };

  if (recordId) {
    initializeData();
  } else {
    setLoading(false); // Stop loading if no recordId
  }
}, [recordId]);

const loadDataFromDatabase = async () => {
  console.log('Loading data from database...');
  if (!recordId) return;

  try {
    setLoading(true);
    
    // Load nondhs from database
    const { data: nondhData, error: nondhError } = await LandRecordService.getNondhsforDetails(recordId);
    if (nondhError) throw nondhError;
    
    const formattedNondhs = (nondhData || []).map(nondh => ({
      ...nondh,
      affectedSNos: Array.isArray(nondh.affected_s_nos) 
        ? nondh.affected_s_nos 
        : nondh.affectedSNos 
          ? [nondh.affectedSNos] 
          : [],
      nondhDoc: nondh.nondh_doc_url || ''
    }));
    
    setLocalNondhs(formattedNondhs);

    // Load nondh details from database
    const { data: detailData, error: detailError } = await LandRecordService.getNondhDetailsWithRelations(recordId);
    if (detailError) throw detailError;

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
      }));

    const existingDetailNondhIds = new Set(transformedDetails.map(detail => detail.nondhId));
    const allDetails = [...transformedDetails];

    // Add missing details
formattedNondhs
    .filter(nondh => !existingDetailNondhIds.has(nondh.id))
    .forEach(nondh => {
      console.log('Adding missing detail for nondh:', nondh.id);
      
      // Determine if we should initialize with an empty owner relation
      const shouldInitializeOwner = !["Hakkami", "Vehchani"].includes(nondh.type || '');
      
      const newDetail = {
        id: `temp_${nondh.id}_${Date.now()}`,
        nondhId: nondh.id,
        sNo: nondh.affectedSNos?.[0] || '',
        type: nondh.type || 'Kabjedaar',
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
        ganot: "",
        restrainingOrder: "no",
        sdDate: "",
        tenure: "Navi",
        amount: null,
        affectedNondhDetails: [],
        ownerRelations: shouldInitializeOwner ? [{
          id: Date.now().toString() + Math.random(),
          ownerName: "",
          sNo: nondh.affectedSNos?.[0] || '',
          area: { value: 0, unit: "sq_m" },
          isValid: true,
          surveyNumber: "",
          surveyNumberType: "s_no"
        }] : [] // Empty array for Hakkami and Vehchani
      };
      
      allDetails.push(newDetail);
    });

    setNondhDetails(allDetails);
    setOriginalDetails(allDetails);
    
    // Update step data with the loaded data
    const currentData = getStepData();
    updateStepData({
      ...currentData,
      nondhs: formattedNondhs,
      nondhDetails: allDetails,
      originalDetails: allDetails
    });

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

  // Check for changes
useEffect(() => {
  const currentStepData = getStepFormData();
  if (currentStepData.nondhDetails && currentStepData.originalDetails) {
    const dbChanged = !deepEqual(currentStepData.nondhDetails, currentStepData.originalDetails) || 
                     !deepEqual(currentStepData.affectedNondhDetails, currentStepData.originalAffectedNondhDetails);
    setHasChanges(dbChanged);
  }
}, [nondhDetails, originalDetails, affectedNondhDetails, originalAffectedNondhDetails]);

useEffect(() => {
  Object.entries(affectedNondhDetails).forEach(([detailId, affectedList]) => {
    affectedList.forEach(affected => {
      if (affected.status === "invalid" && affected.invalidReason) {
        propagateReasonToAffectedNondh(affected.nondhNo, affected.invalidReason);
      }
    });
  });
}, [affectedNondhDetails]);

const handleTransferEqualDistribution = (detailId: string, transferId: string, checked: boolean) => {
  setLocalState(prev => {
    const newTransferEqualDistribution = {
      ...prev.transferEqualDistribution,
      [detailId]: {
        ...prev.transferEqualDistribution[detailId],
        [transferId]: checked
      }
    };
    
    const newState = {
      ...prev,
      transferEqualDistribution: newTransferEqualDistribution
    };
    
    // Sync with step data
    const currentData = getStepData();
    updateStepData({
      ...currentData,
      transferEqualDistribution: newTransferEqualDistribution
    });
    
    return newState;
  });
  
  // Apply equal distribution to transfer
  if (checked) {
    const transfer = localState.ownerTransfers[detailId]?.find(t => t.id === transferId);
    if (transfer && transfer.newOwners && transfer.newOwners.length > 0) {
      const oldOwnerArea = transfer.oldOwnerArea?.value || 0;
      const equalAreaValue = oldOwnerArea / transfer.newOwners.length;
      
      const updatedNewOwnerAreas = transfer.newOwners.map(ownerId => ({
        ownerId,
        area: { 
          ...transfer.oldOwnerArea, 
          value: equalAreaValue 
        }
      }));
      
      updateOwnerTransfer(detailId, transferId, { newOwnerAreas: updatedNewOwnerAreas });
    }
  }
};

  // Deep equality check
  const deepEqual = (a: any, b: any) => {
    return JSON.stringify(a) === JSON.stringify(b)
  }

 const propagateReasonToAffectedNondh = (affectedNondhNo: string, reason: string) => {
  const allSortedNondhs = [...localState.nondhs].sort(sortNondhs); // Use localState.nondhs
  const affectedNondh = allSortedNondhs.find(n => n.number.toString() === affectedNondhNo);
  
  if (!affectedNondh) return;

  setLocalState(prev => {
    const updatedNondhDetails = prev.nondhDetails.map(detail => 
      detail.nondhId === affectedNondh.id && detail.status === "invalid"
        ? { ...detail, invalidReason: reason }
        : detail
    );
    
    const newState = {
      ...prev,
      nondhDetails: updatedNondhDetails
    };
    
    // Sync with step data
    const currentData = getStepData();
    updateStepData({
      ...currentData,
      nondhDetails: updatedNondhDetails
    });
    
    return newState;
  });
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

  const validateAreaInput = (newValue: number, currentArea: any, maxAllowed: number): number => {
  // Prevent negative values
  if (newValue < 0) return 0;
  
  // Prevent exceeding maximum
  if (newValue > maxAllowed) return maxAllowed;
  
  return newValue;
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
  setLocalState(prev => {
    const updatedNondhDetails = prev.nondhDetails.map(detail => 
      detail.id === detailId 
        ? { 
            ...detail, 
            status: newStatus,
            invalidReason: detail.invalidReason || ''
          } 
        : detail
    );
    
    // Process validity chain immediately
    const processedDetails = processValidityChain(updatedNondhDetails);
    
    const newState = {
      ...prev,
      nondhDetails: processedDetails
    };
    
    // Sync with step data
    const currentData = getStepData();
    updateStepData({
      ...currentData,
      nondhDetails: processedDetails
    });
    
    return newState;
  });
};

const convertAreaUnits = (value: number, fromUnit: string, toUnit: string): number => {
  if (fromUnit === toUnit) return value;
  
  // Convert to square meters first
  let sqMeters = 0;
  switch (fromUnit) {
    case 'acre':
      sqMeters = value * 4046.86;
      break;
    case 'guntha':
      sqMeters = value * 101.17;
      break;
    default:
      sqMeters = value;
  }
  
  // Convert from square meters to target unit
  switch (toUnit) {
    case 'acre':
      return sqMeters / 4046.86;
    case 'guntha':
      return sqMeters / 101.17;
    default:
      return sqMeters;
  }
};

  const processValidityChain = (details: NondhDetail[]): NondhDetail[] => {
  const sortedNondhs = [...localState.nondhs].sort(sortNondhs); // Use localState.nondhs
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

  return updatedDetails;
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
  setLocalState(prev => {
    const currentTransfers = prev.ownerTransfers[detailId] || [];
    const updatedTransfers = currentTransfers.map(transfer =>
      transfer.id === transferId ? { ...transfer, ...updates } : transfer
    );
    
    const newState = {
      ...prev,
      ownerTransfers: {
        ...prev.ownerTransfers,
        [detailId]: updatedTransfers
      }
    };
    
    // Sync with step data
    const currentData = getStepData();
    updateStepData({
      ...currentData,
      ownerTransfers: newState.ownerTransfers
    });
    
    return newState;
  });
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
  console.log('➕ Adding affected nondh for detail:', detailId);
  
  setLocalState(prev => {
    const currentAffected = prev.affectedNondhDetails[detailId] || [];
    const newAffected = [
      ...currentAffected,
      {
        id: `affected_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        nondhNo: '',
        status: 'valid',
        invalidReason: ''
      }
    ];
    
    const newState = {
      ...prev,
      affectedNondhDetails: {
        ...prev.affectedNondhDetails,
        [detailId]: newAffected
      }
    };
    
    // Sync with step data
    const currentData = getStepData();
    updateStepData({
      ...currentData,
      affectedNondhDetails: newState.affectedNondhDetails
    });
    
    return newState;
  });
};

const removeAffectedNondh = (detailId: string, affectedId: string) => {
  setAffectedNondhDetails(prev => ({
    ...prev,
    [detailId]: (prev[detailId] || []).filter(a => a.id !== affectedId)
  }));
};

const updateAffectedNondh = (detailId: string, affectedId: string, updates: any) => {
  setLocalState(prev => {
    const currentAffected = prev.affectedNondhDetails[detailId] || [];
    const updatedAffected = currentAffected.map(affected =>
      affected.id === affectedId ? { ...affected, ...updates } : affected
    );
    
    const newState = {
      ...prev,
      affectedNondhDetails: {
        ...prev.affectedNondhDetails,
        [detailId]: updatedAffected
      }
    };
    
    // Sync with step data
    const currentData = getStepData();
    updateStepData({
      ...currentData,
      affectedNondhDetails: newState.affectedNondhDetails
    });
    
    return newState;
  });
};

  const handleGanotChange = (detailId: string, ganot: string) => {
  console.log('=== HANDLE GANOT CHANGE START ===');
  console.log('Detail ID:', detailId);
  console.log('New Ganot:', ganot);
  
  // CRITICAL: Get detail and nondh BEFORE any state updates
  const detail = nondhDetails.find(d => d.id === detailId);
  
  if (!detail) {
    console.log('ERROR: Detail not found for detailId:', detailId);
    return;
  }
  
  // Now update the ganot
  updateNondhDetail(detailId, { ganot });
  
  // Create default transfer for 1st Right if none exists
  if (ganot === "1st Right") {
  console.log('Adding owner transfer for 1st Right');
  
  // Initialize with proper structure including area distribution
  const newTransfer = {
    id: `transfer_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    oldOwner: '',
    newOwners: [],
    equalDistribution: false,
    oldOwnerArea: { value: 0, unit: 'sq_m' },
    newOwnerAreas: [] // Initialize empty array
  };
  
  setLocalState(prev => {
    const currentTransfers = prev.ownerTransfers[detailId] || [];
    const newState = {
      ...prev,
      ownerTransfers: {
        ...prev.ownerTransfers,
        [detailId]: [...currentTransfers, newTransfer]
      }
    };
    
    // Sync with step data
    const currentData = getStepData();
    updateStepData({
      ...currentData,
      ownerTransfers: newState.ownerTransfers
    });
    
    return newState;
  });
}
  
  // Auto-populate all previous owners for 2nd Right
if (ganot === "2nd Right") {
  console.log('Processing 2nd Right auto-population');
  
  // Get the current nondh FIRST
  const currentNondh = nondhs.find(n => n.id === detail.nondhId);
  
  if (!currentNondh) {
    console.log('ERROR: Current nondh not found');
    return;
  }
  
  const currentSNos = currentNondh.affectedSNos.map(sNo => 
    typeof sNo === 'string' ? JSON.parse(sNo).number : sNo.number
  );
  console.log('Current SNos:', currentSNos);
  
  const previousOwners = getAvailableOwnersForGanot("2nd Right", currentNondh.id, currentSNos);
  console.log('Previous owners returned:', previousOwners);
  console.log('Previous owners count:', previousOwners.length);
  
  // Ensure we have an array (not object with oldOwners/newOwners)
  const ownersArray = Array.isArray(previousOwners) ? previousOwners : [];
  
  // Convert all previous owners to owner relations
  const ownerRelations = ownersArray.map((owner, index) => ({
    id: (Date.now() + index).toString(),
    ownerName: owner.name,
    sNo: owner.sNo,
    area: owner.area,
    isValid: true,
    surveyNumber: "",
    surveyNumberType: "s_no"
  }));
  
  console.log('Setting owner relations:', ownerRelations.map(r => r.ownerName));
  
  // Update with the new owner relations
  updateNondhDetail(detailId, { ownerRelations });
}
  
  console.log('=== HANDLE GANOT CHANGE END ===\n');
};

const updateAffectedNondhValidityChain = (detailId: string, affectedNondhNo: string, newStatus: string) => {
  const allSortedNondhs = [...localState.nondhs].sort(sortNondhs); // Use localState.nondhs
  
  // Find the affected nondh by number
  const affectedNondh = allSortedNondhs.find(n => 
    n.number.toString() === affectedNondhNo
  );
  
  if (!affectedNondh) return;

  // Update the actual nondh detail's status using setLocalState
  setLocalState(prev => {
    const updatedNondhDetails = prev.nondhDetails.map(detail => 
      detail.nondhId === affectedNondh.id 
        ? { ...detail, status: newStatus }
        : detail
    );
    
    // Process validity chain with the updated state
    const processedDetails = processValidityChain(updatedNondhDetails);
    
    const newState = {
      ...prev,
      nondhDetails: processedDetails
    };
    
    // Sync with step data
    const currentData = getStepData();
    updateStepData({
      ...currentData,
      nondhDetails: processedDetails
    });
    
    return newState;
  });
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
  console.log('=== getAvailableOwnersForGanot START ===');
  console.log('Ganot Type:', ganotType);
  console.log('Current Nondh ID:', currentNondhId);
  
  // Get all nondhs sorted using the same logic as display
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  console.log('All sorted nondhs:', allSortedNondhs.map(n => ({ id: n.id, number: n.number })));
  
  const currentIndex = allSortedNondhs.findIndex(n => n.id === currentNondhId);
  console.log('Current nondh index:', currentIndex);
  
  if (ganotType === "2nd Right") {
    console.log('--- Processing 2nd Right ---');
    const previousNondhs = allSortedNondhs.slice(0, currentIndex);
    console.log('Previous nondhs count:', previousNondhs.length);
    
    const allOwners = previousNondhs
      .map((nondh, index) => {
        console.log(`\nProcessing nondh ${nondh.number} (index: ${index})`);
        const detail = nondhDetails.find(d => d.nondhId === nondh.id);
        if (!detail) {
          console.log('  No detail found for this nondh');
          return [];
        }
        
        // Skip if status is invalid/nullified (Radd/Na Manjoor)
        if (detail.status === 'invalid' || detail.status === 'nullified') {
          console.log('  Skipped - Status is Radd/Na Manjoor');
          return [];
        }
        
        console.log('  Detail type:', detail.type);
        console.log('  Owner relations count:', detail.ownerRelations.length);
        
        const firstSNo = (() => {
          try {
            return JSON.parse(nondh.affectedSNos[0]).number;
          } catch (e) {
            return nondh.affectedSNos[0];
          }
        })();
        
        const isTransferType = ["Varsai", "Hakkami", "Vechand", "Hayati_ma_hakh_dakhal", "Vehchani"].includes(detail.type);
        console.log('  Is transfer type:', isTransferType);
        
        const owners = [];
        
        // Add old owner with remaining area (if any remaining)
        if (isTransferType && detail.oldOwner && detail.oldOwner.trim() !== "") {
          console.log('  Old owner:', detail.oldOwner);
          
          // Calculate remaining area for old owner
          const newOwnersTotal = detail.ownerRelations
            .filter(rel => rel.ownerName !== detail.oldOwner && rel.ownerName.trim() !== "")
            .reduce((sum, rel) => sum + (rel.area?.value || 0), 0);
          
          // Find old owner's original area
          const oldOwnerOriginalArea = (() => {
            const nondhIndex = allSortedNondhs.findIndex(n => n.id === nondh.id);
            const priorNondhs = allSortedNondhs.slice(0, nondhIndex);
            
            for (let i = priorNondhs.length - 1; i >= 0; i--) {
              const priorDetail = nondhDetails.find(d => d.nondhId === priorNondhs[i].id);
              if (!priorDetail || priorDetail.status === 'invalid' || priorDetail.status === 'nullified') continue;
              
              const ownerRel = priorDetail.ownerRelations.find(rel => rel.ownerName === detail.oldOwner);
              if (ownerRel) {
                return ownerRel.area?.value || 0;
              }
            }
            return 0;
          })();
          
          const remainingArea = Math.max(0, oldOwnerOriginalArea - newOwnersTotal);
          console.log(`  Old owner remaining area: ${remainingArea}`);
          
          // Only include old owner if they have remaining area
          if (remainingArea > 0) {
            owners.push({
              id: `old-${detail.oldOwner}-${nondh.id}`,
              name: detail.oldOwner,
              area: { value: remainingArea, unit: detail.ownerRelations[0]?.area?.unit || 'sq_m' },
              sNo: firstSNo,
              nondhId: nondh.id,
              nondhType: detail.type,
              isOldOwner: true,
              sortIndex: index
            });
          }
        }
        
        // Add new owners (exclude old owner)
        const newOwners = detail.ownerRelations
          .filter(r => {
            if (!isTransferType) return true;
            const isNotOldOwner = r.ownerName !== detail.oldOwner;
            console.log(`    Owner "${r.ownerName}" - isNotOldOwner: ${isNotOldOwner}`);
            return isNotOldOwner;
          })
          .map(r => ({ 
            id: r.id,
            name: r.ownerName, 
            area: r.area,
            sNo: firstSNo,
            nondhId: nondh.id,
            nondhType: detail.type,
            isOldOwner: false,
            sortIndex: index
          }));
        
        owners.push(...newOwners);
        
        console.log('  All owners from this nondh:', owners.map(o => `${o.name} ${o.isOldOwner ? '(old, area: ' + o.area.value + ')' : ''}`));
        return owners;
      })
      .flat()
      .filter(owner => owner.name.trim() !== '');
    
    console.log('\nAll owners before deduplication:', allOwners.map(o => `${o.name} (index: ${o.sortIndex})`));
    
    // Get unique owners - keep only the latest (highest sortIndex) for each name
    const uniqueOwnersMap = new Map();
    allOwners.forEach(owner => {
      const existing = uniqueOwnersMap.get(owner.name);
      if (!existing || existing.sortIndex < owner.sortIndex) {
        uniqueOwnersMap.set(owner.name, owner);
      }
    });
    
    const result = Array.from(uniqueOwnersMap.values());
    console.log('\nFinal unique owners:', result.map(o => `${o.name} (index: ${o.sortIndex})`));
    console.log('=== getAvailableOwnersForGanot END ===\n');
    return result;
      
  } else if (ganotType === "1st Right") {
    console.log('--- Processing 1st Right ---');
    const previousNondhs = allSortedNondhs.slice(0, currentIndex);
    console.log('Previous nondhs count:', previousNondhs.length);
    
    // Get old owners (excluding 2nd Right from Hukam with Radd/Na Manjoor status)
    console.log('\n--- Processing OLD OWNERS ---');
    const allOldOwners = previousNondhs
      .map((nondh, index) => {
        console.log(`\nProcessing nondh ${nondh.number} (index: ${index}) for OLD owners`);
        const detail = nondhDetails.find(d => d.nondhId === nondh.id);
        
        // Skip if no detail, is Hukam 2nd Right, OR status is invalid/nullified
        if (!detail || 
            (detail.type === "Hukam" && detail.ganot === "2nd Right") ||
            detail.status === 'invalid' || 
            detail.status === 'nullified') {
          console.log('  Skipped (no detail, Hukam 2nd Right, or Radd/Na Manjoor)');
          return [];
        }
        
        console.log('  Detail type:', detail.type);
        const isTransferType = ["Varsai", "Hakkami", "Vechand", "Hayati_ma_hakh_dakhal", "Vehchani"].includes(detail.type);
        console.log('  Is transfer type:', isTransferType);
        
        const owners = [];
        
        // Add old owner with remaining area (if any remaining)
        if (isTransferType && detail.oldOwner && detail.oldOwner.trim() !== "") {
          console.log('  Old owner:', detail.oldOwner);
          
          // Calculate remaining area for old owner
          const newOwnersTotal = detail.ownerRelations
            .filter(rel => rel.ownerName !== detail.oldOwner && rel.ownerName.trim() !== "")
            .reduce((sum, rel) => sum + (rel.area?.value || 0), 0);
          
          // Find old owner's original area
          const oldOwnerOriginalArea = (() => {
            const nondhIndex = allSortedNondhs.findIndex(n => n.id === nondh.id);
            const priorNondhs = allSortedNondhs.slice(0, nondhIndex);
            
            for (let i = priorNondhs.length - 1; i >= 0; i--) {
              const priorDetail = nondhDetails.find(d => d.nondhId === priorNondhs[i].id);
              if (!priorDetail || priorDetail.status === 'invalid' || priorDetail.status === 'nullified') continue;
              
              const ownerRel = priorDetail.ownerRelations.find(rel => rel.ownerName === detail.oldOwner);
              if (ownerRel) {
                return ownerRel.area?.value || 0;
              }
            }
            return 0;
          })();
          
          const remainingArea = Math.max(0, oldOwnerOriginalArea - newOwnersTotal);
          console.log(`  Old owner remaining area: ${remainingArea}`);
          
          const firstSNo = (() => {
          try {
            return JSON.parse(nondh.affectedSNos[0]).number;
          } catch (e) {
            return nondh.affectedSNos[0];
          }
        })();

          // Only include old owner if they have remaining area
          if (remainingArea > 0) {
            owners.push({
              id: `old-${detail.oldOwner}-${nondh.id}`,
              name: detail.oldOwner,
              area: { value: remainingArea, unit: detail.ownerRelations[0]?.area?.unit || 'sq_m' },
              sNo: firstSNo,
              nondhId: nondh.id,
              nondhType: detail.type,
              category: 'old',
              isOldOwner: true,
              sortIndex: index
            });
          }
        }
        
        const firstSNo = (() => {
          try {
            return JSON.parse(nondh.affectedSNos[0]).number;
          } catch (e) {
            return nondh.affectedSNos[0];
          }
        })();
        
        // Add new owners (exclude old owner)
        const newOwners = detail.ownerRelations
          .filter(r => {
            if (!isTransferType) return true;
            const isNotOldOwner = r.ownerName !== detail.oldOwner;
            console.log(`    Owner "${r.ownerName}" - isNotOldOwner: ${isNotOldOwner}`);
            return isNotOldOwner;
          })
          .map(r => ({ 
            id: r.id,
            name: r.ownerName, 
            area: r.area,
            sNo: firstSNo,
            nondhId: nondh.id,
            nondhType: detail.type,
            category: 'old',
            isOldOwner: false,
            sortIndex: index
          }));
        
        owners.push(...newOwners);
        
        console.log('  Filtered OLD owners:', owners.map(r => `${r.name} ${r.isOldOwner ? '(old, area: ' + r.area.value + ')' : ''}`));
        return owners;
      })
      .flat()
      .filter(owner => owner.name.trim() !== '');

    console.log('\nAll OLD owners before deduplication:', allOldOwners.map(o => `${o.name} (index: ${o.sortIndex})`));

    // Get unique old owners
    const oldOwnersMap = new Map();
    allOldOwners.forEach(owner => {
      const existing = oldOwnersMap.get(owner.name);
      if (!existing || existing.sortIndex < owner.sortIndex) {
        console.log(`  Setting OLD owner "${owner.name}" with sortIndex ${owner.sortIndex}${existing ? ` (replacing sortIndex ${existing.sortIndex})` : ' (new)'}`);
        oldOwnersMap.set(owner.name, owner);
      } else {
        console.log(`  Skipping OLD owner "${owner.name}" with sortIndex ${owner.sortIndex} (keeping existing sortIndex ${existing.sortIndex})`);
      }
    });
    const oldOwners = Array.from(oldOwnersMap.values());
    console.log('\nFinal unique OLD owners:', oldOwners.map(o => `${o.name} (index: ${o.sortIndex})`));

    // Get new owners (2nd Right from previous Hukam nondhs) - ONLY if status is Pramanik (valid)
    console.log('\n--- Processing NEW OWNERS ---');
    const allNewOwners = previousNondhs
      .map((nondh, index) => {
        console.log(`\nProcessing nondh ${nondh.number} (index: ${index}) for NEW owners`);
        const detail = nondhDetails.find(d => d.nondhId === nondh.id);
        
        // Only include if it's Hukam 2nd Right AND status is valid (Pramanik)
        if (!detail || 
            !(detail.type === "Hukam" && detail.ganot === "2nd Right") ||
            detail.status !== 'valid') {
          console.log('  Skipped (not Hukam 2nd Right or not Pramanik status)');
          return [];
        }
        
        console.log('  Is Hukam 2nd Right with Pramanik status - including all owners');
        
        const firstSNo = (() => {
          try {
            return JSON.parse(nondh.affectedSNos[0]).number;
          } catch (e) {
            return nondh.affectedSNos[0];
          }
        })();
        
        const relations = detail.ownerRelations.map(r => ({ 
          id: r.id,
          name: r.ownerName, 
          area: r.area,
          sNo: firstSNo,
          nondhId: nondh.id,
          nondhType: detail.type,
          category: 'new',
          isOldOwner: false,
          sortIndex: index
        }));
        
        console.log('  NEW owners:', relations.map(r => r.name));
        return relations;
      })
      .flat()
      .filter(owner => owner.name.trim() !== '');

    console.log('\nAll NEW owners before deduplication:', allNewOwners.map(o => `${o.name} (index: ${o.sortIndex})`));

    // Get unique new owners
    const newOwnersMap = new Map();
    allNewOwners.forEach(owner => {
      const existing = newOwnersMap.get(owner.name);
      if (!existing || existing.sortIndex < owner.sortIndex) {
        console.log(`  Setting NEW owner "${owner.name}" with sortIndex ${owner.sortIndex}${existing ? ` (replacing sortIndex ${existing.sortIndex})` : ' (new)'}`);
        newOwnersMap.set(owner.name, owner);
      } else {
        console.log(`  Skipping NEW owner "${owner.name}" with sortIndex ${owner.sortIndex} (keeping existing sortIndex ${existing.sortIndex})`);
      }
    });
    const newOwners = Array.from(newOwnersMap.values());
    console.log('\nFinal unique NEW owners:', newOwners.map(o => `${o.name} (index: ${o.sortIndex})`));

    console.log('=== getAvailableOwnersForGanot END ===\n');
    return { oldOwners, newOwners };
  }
  
  console.log('=== getAvailableOwnersForGanot END (no matching ganot type) ===\n');
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

  const handleHukamTypeChange = (detailId: string, hukamType: string) => {
  updateNondhDetail(detailId, { hukamType });
  
  // Reset ganot when changing hukam type
  if (hukamType !== "ALT Krushipanch") {
    updateNondhDetail(detailId, { ganot: "" });
  }
};

const getYearSlabAreaForDate = (date: string) => {
  if (!date) return null;
  
  const year = new Date(date).getFullYear();
  const matchingYearSlab = yearSlabs.find(slab => 
    year >= slab.startYear && year <= slab.endYear
  );
  
  if (!matchingYearSlab) return null;
  
  let totalArea = matchingYearSlab.area?.value || 0;
  const unit = matchingYearSlab.area?.unit || 'sq_m';
  
  // Sum paiky entries
  matchingYearSlab.paikyEntries?.forEach(entry => {
    if (entry.area?.unit === unit) {
      totalArea += entry.area.value || 0;
    } else {
      totalArea += convertAreaUnits(entry.area?.value || 0, entry.area?.unit || 'sq_m', unit);
    }
  });
  
  // Sum ekatrikaran entries  
  matchingYearSlab.ekatrikaranEntries?.forEach(entry => {
    if (entry.area?.unit === unit) {
      totalArea += entry.area.value || 0;
    } else {
      totalArea += convertAreaUnits(entry.area?.value || 0, entry.area?.unit || 'sq_m', unit);
    }
  });
  
  return { value: totalArea, unit };
};

  const getPreviousOwners = (sNo: string, currentNondhId: string) => {
  // Get all nondhs sorted by priority
  const allSortedNondhs = [...nondhs].sort(sortNondhs);
  const currentIndex = allSortedNondhs.findIndex(n => n.id === currentNondhId);
  
  // Only look at nondhs that come BEFORE the current one
  const previousNondhs = allSortedNondhs.slice(0, currentIndex);

  // Track owners by name to keep only the most recent version
  const ownerMap = new Map();

  previousNondhs.forEach(nondh => {
    const detail = nondhDetails.find(d => d.nondhId === nondh.id);
    
    // Skip if no detail OR if status is invalid/nullified (Radd/Na Manjoor)
    if (!detail || detail.status === 'invalid' || detail.status === 'nullified') {
      return;
    }

    // Only include relevant nondh types
    if (!["Varsai", "Hakkami", "Vechand", "Vehchani", "Kabjedaar", "Ekatrikaran", "Hayati_ma_hakh_dakhal"].includes(detail.type)) {
      return;
    }

    // For transfer types, handle old owner specially
    const isTransferType = ["Varsai", "Hakkami", "Vechand", "Hayati_ma_hakh_dakhal", "Vehchani"].includes(detail.type);
    
    if (isTransferType && detail.oldOwner) {
      // Calculate if old owner's area was completely distributed
      const newOwnersTotal = detail.ownerRelations
        .filter(rel => rel.ownerName !== detail.oldOwner && rel.ownerName.trim() !== "")
        .reduce((sum, rel) => sum + (rel.area?.value || 0), 0);
      
      // Find old owner's original area from previous nondhs
      const oldOwnerOriginalArea = (() => {
        // Look backwards from this nondh to find old owner's area
        const nondhIndex = allSortedNondhs.findIndex(n => n.id === nondh.id);
        const priorNondhs = allSortedNondhs.slice(0, nondhIndex);
        
        for (let i = priorNondhs.length - 1; i >= 0; i--) {
          const priorDetail = nondhDetails.find(d => d.nondhId === priorNondhs[i].id);
          if (!priorDetail) continue;
          
          const ownerRel = priorDetail.ownerRelations.find(rel => rel.ownerName === detail.oldOwner);
          if (ownerRel) {
            return ownerRel.area?.value || 0;
          }
        }
        return 0;
      })();
      
      const remainingArea = oldOwnerOriginalArea - newOwnersTotal;
      
      // Update or add old owner with remaining area (0 if fully distributed)
      ownerMap.set(detail.oldOwner, {
        name: detail.oldOwner,
        area: { 
          value: Math.max(0, remainingArea), 
          unit: detail.ownerRelations[0]?.area?.unit || 'sq_m' 
        },
        type: detail.type,
        nondhId: nondh.id
      });
    }

    // Add/update new owners (for all types including transfer types)
    detail.ownerRelations.forEach(rel => {
      if (rel.ownerName.trim() === "") return;
      
      // For transfer types, skip old owner in relations (already handled above)
      if (isTransferType && rel.ownerName === detail.oldOwner) {
        return;
      }
      
      // Update owner in map (this will overwrite older versions)
      ownerMap.set(rel.ownerName, {
        name: rel.ownerName,
        area: rel.area,
        type: detail.type,
        nondhId: nondh.id
      });
    });
  });

  // Return array of unique owners (most recent version of each)
  return Array.from(ownerMap.values());
};

  // Form update functions
  const updateNondhDetail = (id: string, updates: Partial<NondhDetail>) => {
  setLocalState(prev => {
    const updatedNondhDetails = prev.nondhDetails.map(detail => 
      detail.id === id ? { ...detail, ...updates } : detail
    );
    
    const newState = {
      ...prev,
      nondhDetails: updatedNondhDetails
    };
    
    // Sync immediately without setTimeout
    const currentData = getStepData();
    updateStepData({ 
      ...currentData, 
      nondhDetails: updatedNondhDetails
    });
    
    return newState;
  });
}

  const toggleCollapse = (detailId: string) => {
  setLocalState(prev => {
    const newCollapsedNondhs = new Set(prev.collapsedNondhs);
    
    if (newCollapsedNondhs.has(detailId)) {
      newCollapsedNondhs.delete(detailId);
    } else {
      newCollapsedNondhs.add(detailId);
    }
    
    return {
      ...prev,
      collapsedNondhs: newCollapsedNondhs
    };
  });
};

  const toggleEqualDistribution = (detailId: string, checked: boolean) => {
  setLocalState(prev => {
    const newState = {
      ...prev,
      equalDistribution: {
        ...prev.equalDistribution,
        [detailId]: checked
      }
    };
    
    // Sync with step data
    const currentData = getStepData();
    updateStepData({
      ...currentData,
      equalDistribution: newState.equalDistribution
    });
    
    return newState;
  });
  
  // Apply equal distribution logic to ALL transfer types
  const detail = localState.nondhDetails.find(d => d.id === detailId);
  if (detail && checked) {
    const transferTypes = ["Varsai", "Hakkami", "Vechand", "Hayati_ma_hakh_dakhal", "Vehchani"];
    
    if (transferTypes.includes(detail.type) && detail.ownerRelations.length >= 1) {
      // For transfer types, distribute old owner's area equally among new owners
      const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
      const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
      const oldOwnerArea = selectedOldOwner?.area?.value || 0;
      const newOwnersCount = detail.ownerRelations.filter(rel => rel.ownerName !== detail.oldOwner).length;
      
const equalArea = newOwnersCount > 0 ? oldOwnerArea / newOwnersCount : oldOwnerArea;
        
        const updatedRelations = detail.ownerRelations.map((relation) => {
          if (relation.ownerName === detail.oldOwner) {
            return relation; // Keep old owner relation as is
          }
          return { 
            ...relation, 
            area: { 
              ...relation.area, 
              value: equalArea 
            } 
          };
        });
        
        updateNondhDetail(detailId, { ownerRelations: updatedRelations });
      
    }
  }
};

  const addOwnerRelation = (detailId: string) => {
    const detail = nondhDetails.find((d) => d.id === detailId)
    if (detail) {
      // Get area from year slab if date is available
    const yearSlabArea = detail.date ? getYearSlabAreaForDate(detail.date) : null;
    const defaultArea = yearSlabArea || { value: 0, unit: "sq_m" };

    const newRelation = {
      id: Date.now().toString() + Math.random(),
      ownerName: "",
      sNo: detail.sNo,
      area: defaultArea,
      tenure: "Navi",
      isValid: true
    };
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
    // If updating area, validate against old owner area
    if (updates.area && ["Varsai", "Hakkami", "Vechand", "Hayati_ma_hakh_dakhal", "Vehchani"].includes(detail?.type || "")) {
      const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
      const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
      const oldOwnerArea = selectedOldOwner?.area?.value || 0;
      
      const otherNewOwnersTotal = detail.ownerRelations
        .filter(rel => rel.id !== relationId && rel.ownerName !== detail.oldOwner && rel.ownerName.trim() !== "")
        .reduce((sum, rel) => sum + (rel.area?.value || 0), 0);
      
      const maxAllowedForThisOwner = oldOwnerArea - otherNewOwnersTotal;
      
      // Validate and cap the area value
      const validatedArea = {
        ...updates.area,
        value: validateAreaInput(updates.area.value || 0, updates.area, maxAllowedForThisOwner)
      };
      
      updates = { ...updates, area: validatedArea };
      
      // Show warning if area was capped
      if ((updates.area.value || 0) !== (updates.area.value || 0) && maxAllowedForThisOwner > 0) {
        toast({
          title: "Area adjusted",
          description: `Area capped to maximum allowed: ${maxAllowedForThisOwner}`,
          variant: "default"
        });
      } else if (maxAllowedForThisOwner <= 0) {
        toast({
          title: "Cannot assign area",
          description: "No remaining area available for new owners",
          variant: "destructive"
        });
        return;
      }
    }
    
    const updatedRelations = detail.ownerRelations.map((relation) =>
      relation.id === relationId ? { ...relation, ...updates } : relation,
    )
    updateNondhDetail(detailId, { ownerRelations: updatedRelations })
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

    if (!detail.vigat || !detail.vigat.trim()) {
      errors.push(`Nondh ${nondhNumber}: Vigat is required`);
    }

    // Owner name validation
    // const hasValidOwnerName = detail.ownerRelations.some(rel => rel.ownerName.trim() !== "");
    // const is1stRightHukam = detail.type === "Hukam" && detail.ganot === "1st Right";

    // if (!hasValidOwnerName && !is1stRightHukam) {
    //   errors.push(`Nondh ${nondhNumber}: At least one owner name is required`);
    // }
    
    // Status-specific validation - only Radd requires reason
    if (detail.status === "invalid" && (!detail.invalidReason || !detail.invalidReason.trim())) {
      errors.push(`Nondh ${nondhNumber}: Reason is required when status is Radd`);
    }
    
    // Type-specific validations
    switch (detail.type) {
      // case "Vehchani":
      // case "Varsai":
      // case "Hakkami": 
      // case "Vechand":
      // case "Hayati_ma_hakh_dakhal":
      //   if (!detail.oldOwner || !detail.oldOwner.trim()) {
      //     errors.push(`Nondh ${nondhNumber}: Old Owner is required for ${detail.type} type`);
      //   }
      //   break;
        
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

  const renderOwnerSelectionFields = (detail: NondhDetail) => {
  const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
  
  const hakkamiPreviousOwners = detail.type === "Hakkami" 
    ? getPreviousOwners(detail.sNo, detail.nondhId)
    : [];

    const vehchaniPreviousOwners = detail.type === "Vehchani" 
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
      date: value === '' ? null : value
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
    updateNondhDetail(detail.id, { 
      oldOwner: selectedOwner.name
    });
    
    // Only auto-apply equal distribution for types that should have default owners
    const shouldAutoApplyEqualDist = !["Hakkami", "Vehchani"].includes(detail.type);
    
    // ADD THIS: For Hakkami and Vehchani, ensure no owner relations are created
    if (["Hakkami", "Vehchani"].includes(detail.type)) {
      // Explicitly set empty owner relations if somehow any got created
      if (detail.ownerRelations.length > 0) {
        updateNondhDetail(detail.id, { ownerRelations: [] });
      }
      return; // Don't proceed further for these types
    }
    
    if (equalDistribution[detail.id] && shouldAutoApplyEqualDist) {
      setTimeout(() => {
        toggleEqualDistribution(detail.id, true);
      }, 100);
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

{/* Vehchani Section */}
      {detail.type === "Vehchani" && (
  <div className="space-y-4">
    
    {/* Available Previous Owners as Checkboxes for NEW owners only */}
    <div className="space-y-2">
      <Label>Select New Owners *</Label>
      <div className="border rounded-lg p-3 max-h-40 overflow-y-auto">
        {vehchaniPreviousOwners
          .filter(owner => owner.name !== detail.oldOwner)
          .map((owner, index) => {
            const isSelected = detail.ownerRelations.some(rel => 
              rel.ownerName === owner.name && rel.ownerName !== detail.oldOwner
            );
            
            return (
              <div key={`vehchani_${owner.name}_${index}`} className="flex items-center space-x-2 mb-2">
                <Checkbox
                  id={`vehchani_owner_${index}`}
                  checked={isSelected}
onCheckedChange={(checked) => {
  const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
  const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
  const oldOwnerArea = selectedOldOwner?.area?.value || 0;
  
  let updatedRelations = [...detail.ownerRelations];
  
  if (checked) {
    // Calculate area for new owner
    let newOwnerArea = 0;
    if (equalDistribution[detail.id]) {
      const newOwnersCount = updatedRelations.filter(rel => rel.ownerName !== detail.oldOwner).length + 1;
      newOwnerArea = oldOwnerArea / newOwnersCount;
    }
    
    const newRelation = {
      id: Date.now().toString() + Math.random(),
      ownerName: owner.name,
      sNo: detail.sNo,
      area: { 
        value: newOwnerArea, 
        unit: owner.area.unit 
      },
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
  
  // Re-apply equal distribution if enabled
  if (equalDistribution[detail.id]) {
    setTimeout(() => {
      toggleEqualDistribution(detail.id, true);
    }, 100);
  }
}}
                />
                <Label htmlFor={`vehchani_owner_${index}`} className="flex-1">
                  {owner.name} ({owner.area.value} {owner.area.unit})
                </Label>
              </div>
            );
          })}
      </div>
    </div>
  </div>
)}
      {/* Hakkami Section */}
      {detail.type === "Hakkami" && (
  <div className="space-y-4">
    
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
  const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
  const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
  const oldOwnerArea = selectedOldOwner?.area?.value || 0;
  
  let updatedRelations = [...detail.ownerRelations];
  
  if (checked) {
    // Calculate area for new owner
    let newOwnerArea = 0;
    if (equalDistribution[detail.id]) {
      const newOwnersCount = updatedRelations.filter(rel => rel.ownerName !== detail.oldOwner).length + 1;
      newOwnerArea = oldOwnerArea / newOwnersCount;
    }
    
    const newRelation = {
      id: Date.now().toString() + Math.random(),
      ownerName: owner.name,
      sNo: detail.sNo,
      area: { 
        value: newOwnerArea, 
        unit: owner.area.unit 
      },
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
  
  // Re-apply equal distribution if enabled
  if (equalDistribution[detail.id]) {
    setTimeout(() => {
      toggleEqualDistribution(detail.id, true);
    }, 100);
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
  </div>
)}

      {/* Owner Details Section for Hayati, Varsai, and Vechand */}
{(detail.type === "Varsai" || detail.type === "Hayati_ma_hakh_dakhal" || detail.type === "Vechand" || detail.type === "Hakkami" || detail.type === "Vehchani") && (
  <div className="space-y-4">
    <div className="flex justify-between items-center">
      <Label>New Owner Details</Label>
      <Button size="sm" onClick={() => addOwnerRelation(detail.id)}>
        <Plus className="w-4 h-4 mr-2" />
        Add New Owner
      </Button>
    </div>

    {/* Area Distribution Header */}
<div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
  <div className="flex justify-between items-start mb-3">
    <div>
      <h4 className="font-medium text-blue-800">Area Distribution Control</h4>
      <p className="text-sm text-blue-600 mt-1">
        Old Owner: <strong>{detail.oldOwner}</strong> - 
        Total Area: <strong>{(() => {
          const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
          const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
          return selectedOldOwner?.area?.value || 0;
        })()} {detail.ownerRelations[0]?.area?.unit || 'sq_m'}</strong>
      </p>
    </div>
    <div className="flex items-center space-x-2">
      <Checkbox
        id={`equal_dist_${detail.id}`}
        checked={equalDistribution[detail.id] || false}
        onCheckedChange={(checked) => toggleEqualDistribution(detail.id, checked as boolean)}
        disabled={detail.ownerRelations.filter(rel => rel.ownerName !== detail.oldOwner).length < 1}
      />
      <Label htmlFor={`equal_dist_${detail.id}`} className="text-blue-800 font-medium">
        Equal Distribution
        {detail.ownerRelations.filter(rel => rel.ownerName !== detail.oldOwner).length <= 1 && 
          " (Need atleast 1 new owner)"}
      </Label>
    </div>
  </div>
  
  {/* Real-time Area Summary */}
  {(() => {
    const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
    const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
    const oldOwnerArea = selectedOldOwner?.area?.value || 0;
    const newOwners = detail.ownerRelations.filter(rel => rel.ownerName !== detail.oldOwner);
    const newOwnersTotal = newOwners.reduce((sum, rel) => sum + (rel.area?.value || 0), 0);
    const remaining = oldOwnerArea - newOwnersTotal;
    const isBalanced = Math.abs(remaining) < 0.01;
    
    return (
      <div className={`p-3 rounded text-sm ${
        remaining < 0 ? 'bg-red-100 text-red-700 border border-red-300' : 
        isBalanced ? 'bg-green-100 text-green-700 border border-green-300' : 
        'bg-yellow-100 text-yellow-700 border border-yellow-300'
      }`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-center">
          <div>
            <div className="font-semibold">Old Owner Area</div>
            <div>{oldOwnerArea.toFixed(2)}</div>
          </div>
          <div>
            <div className="font-semibold">New Owners Total</div>
            <div>{newOwnersTotal.toFixed(2)}</div>
          </div>
          <div>
            <div className="font-semibold">Remaining</div>
            <div className={remaining < 0 ? 'font-bold' : ''}>
              {remaining.toFixed(2)}
            </div>
          </div>
          <div>
            <div className="font-semibold">Status</div>
            <div>
              {remaining < 0 ? '⚠️ Exceeded!' : 
               isBalanced ? '✓ Balanced' : 
               '⚠️ Not distributed'}
            </div>
          </div>
        </div>
        
        {equalDistribution[detail.id] && newOwners.length > 0 && (
          <div className="mt-2 pt-2 border-t border-blue-200 text-center">
            <strong>Equal Distribution:</strong> { (oldOwnerArea / newOwners.length).toFixed(4) } each
          </div>
        )}
      </div>
    );
  })()}
</div>

    {detail.ownerRelations
      .filter(relation => relation.ownerName !== detail.oldOwner) // Only show new owners
      .map((relation, index) => (
      <Card key={relation.id} className="p-3">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium">New Owner {index + 1}</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeOwnerRelation(detail.id, relation.id)}
            className="text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
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
  onChange: (newArea) => {
    // Validate area for transfer types
    if (["Varsai", "Hakkami", "Vechand", "Hayati_ma_hakh_dakhal", "Vehchani"].includes(detail?.type || "")) {
      const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
      const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
      const oldOwnerArea = selectedOldOwner?.area?.value || 0;
      
      // Calculate total area of other new owners (excluding current one being edited)
      const otherNewOwnersTotal = detail.ownerRelations
        .filter(rel => rel.id !== relation.id && rel.ownerName !== detail.oldOwner && rel.ownerName.trim() !== "")
        .reduce((sum, rel) => sum + (rel.area?.value || 0), 0);
      
      // Calculate proposed total with the new area
      const proposedTotal = otherNewOwnersTotal + (newArea.value || 0);
      
      // Check if proposed total exceeds old owner's area
      if (proposedTotal > oldOwnerArea) {
        toast({
          title: "Area validation error",
          description: `Total area would exceed old owner's area (${oldOwnerArea}). Maximum allowed for this owner: ${oldOwnerArea - otherNewOwnersTotal}`,
          variant: "destructive"
        });
        return; // Don't update if validation fails
      }
    }
    
    // If validation passes, update the area
    updateOwnerRelation(detail.id, relation.id, { area: newArea });
  },
  disabled: equalDistribution[detail.id],
  maxValue: (() => {
    if (["Varsai", "Hakkami", "Vechand", "Hayati_ma_hakh_dakhal", "Vehchani"].includes(detail?.type || "")) {
      const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
      const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
      const oldOwnerArea = selectedOldOwner?.area?.value || 0;
      const otherNewOwnersTotal = detail.ownerRelations
        .filter(rel => rel.id !== relation.id && rel.ownerName !== detail.oldOwner && rel.ownerName.trim() !== "")
        .reduce((sum, rel) => sum + (rel.area?.value || 0), 0);
      return Math.max(0, oldOwnerArea - otherNewOwnersTotal);
    }
    return undefined;
  })()
})}
        </div>
        
        {/* Individual owner area status */}
        {(() => {
          const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId);
          const selectedOldOwner = previousOwners.find(owner => owner.name === detail.oldOwner);
          const oldOwnerArea = selectedOldOwner?.area?.value || 0;
          const otherNewOwnersTotal = detail.ownerRelations
            .filter(rel => rel.id !== relation.id && rel.ownerName !== detail.oldOwner)
            .reduce((sum, rel) => sum + (rel.area?.value || 0), 0);
          const maxAllowed = Math.max(0, oldOwnerArea - otherNewOwnersTotal);
          
          return (
            <div className={`text-xs mt-1 p-1 rounded ${
              relation.area?.value > maxAllowed ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'
            }`}>
              Max allowed: {maxAllowed} {relation.area?.unit || 'sq_m'}
              {relation.area?.value > maxAllowed && " ⚠️ Over allocated!"}
            </div>
          );
        })()}
      </Card>
    ))}
  </div>
)}
    </div>
  );
};

const formatArea = (area: { value: number; unit: string }) => {
  if (!area) return 'N/A';
  
  const { value, unit } = area;
  
  switch (unit) {
    case 'acre':
      return `${value.toFixed(2)} Acre`;
    case 'guntha':
      return `${value.toFixed(2)} Guntha`;
    case 'sq_m':
      return `${value.toFixed(2)} Sq.m`;
    case 'acre_guntha':
      // If it's acre_guntha format, you might have acres and gunthas properties
      const acres = Math.floor(value / 4046.86);
      const remainingSqm = value % 4046.86;
      const gunthas = Math.floor(remainingSqm / 101.17);
      return `${acres}A ${gunthas}G`;
    default:
      return `${value.toFixed(2)} ${unit}`;
  }
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
                
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOwnerRelation(detail.id, relation.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
   
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
               
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOwnerRelation(detail.id, relation.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
            
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
               
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOwnerRelation(detail.id, relation.id)}
                      className="text-red-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
      
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
      <Label>Ganot Details</Label>
      <Button size="sm" onClick={() => {
        // Add a new empty owner relation
        const newRelation = {
          id: Date.now().toString() + Math.random(),
          ownerName: "",
          sNo: detail.sNo,
          area: { value: 0, unit: "sq_m" },
          isValid: true
        };
        const updatedRelations = [...detail.ownerRelations, newRelation];
        updateNondhDetail(detail.id, { ownerRelations: updatedRelations });
      }}>
        <Plus className="w-4 h-4 mr-2" />
        Add Ganot
      </Button>
    </div>

    {detail.ownerRelations.map((relation, index) => (
      <Card key={relation.id} className="p-3">
        <div className="flex justify-between items-center mb-3">
          <h4 className="font-medium">Ganot {index + 1}</h4>
          <Button
            variant="outline"
            size="sm"
            onClick={() => removeOwnerRelation(detail.id, relation.id)}
            className="text-red-600"
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>

        {/* Owner Name - Full width */}
        <div className="space-y-2 mb-3">
          <Label>Ganot Name</Label>
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
                <Label>Ganot Transfers</Label>
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
                      <Label>Old Ganot</Label>
<Select
  value={transfer.oldOwner}
  onValueChange={(value) => {
    const selectedOwner = availableOwners.oldOwners?.find(o => o.name === value);
    const oldOwnerArea = selectedOwner?.area || { value: 0, unit: 'sq_m' };
    
    updateOwnerTransfer(detail.id, transfer.id, {
      oldOwner: value,
      oldOwnerArea: oldOwnerArea
    });
    
    // Auto-apply equal distribution if enabled
    const isEqualDist = transferEqualDistribution[detail.id]?.[transfer.id];
    if (isEqualDist && transfer.newOwners && transfer.newOwners.length > 0) {
      const equalAreaValue = oldOwnerArea.value / transfer.newOwners.length;
      const updatedNewOwnerAreas = transfer.newOwners.map(ownerId => ({
        ownerId,
        area: { ...oldOwnerArea, value: parseFloat(equalAreaValue.toFixed(4)) }
      }));
      
      updateOwnerTransfer(detail.id, transfer.id, { 
        newOwnerAreas: updatedNewOwnerAreas 
      });
    }
  }}
>
  <SelectTrigger>
    <SelectValue placeholder="Select old owner" />
  </SelectTrigger>
  <SelectContent>
    {(availableOwners.oldOwners || []).map((owner) => (
      <SelectItem key={owner.name} value={owner.name}> {/* Use owner.name as value */}
        {owner.name} - {owner.area.value} {owner.area.unit}
      </SelectItem>
    ))}
  </SelectContent>
</Select>
                    </div>
                    <div className="flex items-center space-x-2 mb-4">
  <Checkbox
    id={`equal_dist_${detail.id}_${transfer.id}`}
    checked={transferEqualDistribution[detail.id]?.[transfer.id] || false}
    onCheckedChange={(checked) => {
      handleTransferEqualDistribution(detail.id, transfer.id, checked as boolean);
    }}
    disabled={(transfer.newOwners?.length || 0) <= 1}
  />
  <Label htmlFor={`equal_dist_${detail.id}_${transfer.id}`}>
    Equal Distribution of Land
    {(transfer.newOwners?.length || 0) <= 1 && " (Requires at least 1 new owner)"}
  </Label>
</div>
                    <div className="space-y-2 mb-4">
                      <Label>New Ganots</Label>
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
{transfer.newOwners && transfer.newOwners.length > 0 && (
  <div className="space-y-3">
    <Label>Area Distribution for New Owners</Label>
    {transfer.newOwners.map((ownerId) => {
      const owner = availableOwners.newOwners?.find(o => o.id === ownerId);
      if (!owner) return null;
      
      const currentArea = transfer.newOwnerAreas?.find(a => a.ownerId === ownerId)?.area || { 
        value: 0, 
        unit: 'sq_m' 
      };
      
      // Calculate equal distribution if enabled
      const isEqualDist = transferEqualDistribution[detail.id]?.[transfer.id];
      const oldOwnerAreaValue = transfer.oldOwnerArea?.value || 0;
      const equalAreaValue = oldOwnerAreaValue / transfer.newOwners.length;
      
      return (
        <div key={ownerId} className="flex items-center gap-3 p-2 border rounded">
          <span className="min-w-0 flex-1 font-medium">{owner.name}</span>
          <div className="flex-shrink-0">
            {areaFields({
              area: isEqualDist 
                ? { ...currentArea, value: equalAreaValue }
                : currentArea,
              onChange: (newArea) => {
                if (isEqualDist) return;
                
                const oldOwnerTotalArea = transfer.oldOwnerArea?.value || 0;
                const otherNewOwnersTotal = (transfer.newOwnerAreas || [])
                  .filter(a => a.ownerId !== ownerId)
                  .reduce((sum, areaObj) => sum + (areaObj.area?.value || 0), 0);
                
                const proposedTotal = otherNewOwnersTotal + (newArea.value || 0);
                
                if (proposedTotal > oldOwnerTotalArea) {
                  toast({
                    title: "Area validation error",
                    description: `Total area would exceed old owner's area (${oldOwnerTotalArea}). Maximum allowed for this owner: ${oldOwnerTotalArea - otherNewOwnersTotal}`,
                    variant: "destructive"
                  });
                  return;
                }
                
                const updatedAreas = (transfer.newOwnerAreas || []).filter(a => a.ownerId !== ownerId);
                updatedAreas.push({ ownerId, area: newArea });
                updateOwnerTransfer(detail.id, transfer.id, { newOwnerAreas: updatedAreas });
              },
              disabled: isEqualDist,
              maxValue: isEqualDist ? undefined : (() => {
                const oldOwnerTotalArea = transfer.oldOwnerArea?.value || 0;
                const otherNewOwnersTotal = (transfer.newOwnerAreas || [])
                  .filter(a => a.ownerId !== ownerId)
                  .reduce((sum, areaObj) => sum + (areaObj.area?.value || 0), 0);
                return Math.max(0, oldOwnerTotalArea - otherNewOwnersTotal);
              })()
            })}
          </div>
        </div>
      );
    })}
    
    {/* Area validation display */}
    <div className="text-sm text-muted-foreground">
      {(() => {
        const totalNewOwnerArea = isEqualDistribution 
          ? oldOwnerAreaValue
          : (transfer.newOwnerAreas || []).reduce((sum, areaObj) => sum + (areaObj.area?.value || 0), 0);
        const oldOwnerArea = transfer.oldOwnerArea?.value || 0;
        const remaining = oldOwnerArea - totalNewOwnerArea;
        
        return (
          <div className={`p-2 rounded ${remaining < 0 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>
            Old Owner Area: {oldOwnerArea} | New Owners Total: {totalNewOwnerArea} | Remaining: {remaining}
            {remaining < 0 && " (⚠️ Exceeds old owner area!)"}
            {isEqualDist && ` (Equal distribution: ${equalAreaValue.toFixed(2)} each)`}
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
             
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => removeOwnerRelation(detail.id, relation.id)} 
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
        
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
      return null;
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
        )}

        {/* Nondh Details */}
        {nondhs
  .sort(sortNondhs)
  .map(nondh => {
    // Add safety check - ensure nondhDetails is an array
    const detail = Array.isArray(nondhDetails) 
      ? nondhDetails.find(d => d.nondhId === nondh.id)
      : null;
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
                 <div className="flex items-center gap-2">
  {/* View Document Button - only show if document exists */}
  {(nondh as any).nondhDoc && (
    <Button
      variant="outline"
      size="sm"
      onClick={() => window.open((nondh as any).nondhDoc, '_blank')}
      className="flex items-center gap-1"
    >
      <Eye className="w-4 h-4" />
      View Document
    </Button>
  )}
  
  {/* Existing Collapse Button */}
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
</div>

                {!collapsedNondhs.has(nondh.id) && (
                  <div className="mt-4 space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div className="space-y-2">
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
    
    // Auto-populate areas when date changes
    const yearSlabArea = getYearSlabAreaForDate(newDate);
    if (yearSlabArea) {
      const updatedRelations = detail.ownerRelations.map(relation => ({
        ...relation,
        area: { ...yearSlabArea }
      }));
      updateNondhDetail(detail.id, { ownerRelations: updatedRelations });
    }
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
                        
                        {detail.type === "Hukam" && (
<div className="space-y-2">
      <Label>Authority</Label>
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
    )}
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

{/* Hukam-specific fields */}
{detail.type === "Hukam" && (
  <>
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
                          <Label>Vigat *</Label>
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
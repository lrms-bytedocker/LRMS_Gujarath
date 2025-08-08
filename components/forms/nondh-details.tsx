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
import { Trash2, Plus, ArrowRight, ArrowLeft, Upload, Eye, Loader2, ChevronDown, ChevronUp } from "lucide-react"
import { useLandRecord, type NondhDetail } from "@/contexts/land-record-context"
import { supabase, uploadFile } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useStepFormData } from "@/hooks/use-step-form-data"
import { date } from 'zod'

const nondhTypes = [
  "Kabjedaar",
  "Ekatrikaran",
  "Varsai",
  "Hakkami",
  "Hayati_ma_hakh_dakhal",
  "Salesdeed",
  "Opp_Salesdeed",
  "Hukam",
  "Bojo",
  "Vechadi",
  "Other",
]

const tenureTypes = ["Navi", "Juni", "Kheti_Kheti_ma_Juni", "NA", "Bin_Kheti_Pre_Patra", "Prati_bandhit_satta_prakar"]

const hukamTypes = ["SSRD", "Collector", "Collector_ganot", "Prant", "Mamlajdaar", "GRT", "Jasu", "Krushipanch", "DILR"]

const statusTypes = [
  { value: "valid", label: "Valid" },
  { value: "invalid", label: "Invalid" },
  { value: "nullified", label: "Nullified" }
]


// Enhanced sorting function for nondhs
const sortNondhsBySNoType = (a: NondhDetail, b: NondhDetail, nondhs: any[]) => {
  const nondhA = nondhs.find(n => n.id === a.nondhId);
  const nondhB = nondhs.find(n => n.id === b.nondhId);
  
  if (!nondhA || !nondhB) return 0;

  // Priority order: survey_no > block_no > resurvey_no
  const priorityOrder = ['survey_no', 'block_no', 'resurvey_no'];
  
  const priorityA = priorityOrder.indexOf(nondhA.sNoType);
  const priorityB = priorityOrder.indexOf(nondhB.sNoType);
  
  // If both have defined priorities, sort by priority
  if (priorityA !== -1 && priorityB !== -1) {
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
  } else if (priorityA !== -1) {
    return -1; // A has priority, B doesn't
  } else if (priorityB !== -1) {
    return 1; // B has priority, A doesn't
  }
  
  // If same priority or undefined, sort by nondh number
  const getFirstNumber = (str: string) => {
    const match = str.match(/^(\d+)/);
    return match ? parseInt(match[1]) : 0;
  };
  
  const numA = getFirstNumber(nondhA.number);
  const numB = getFirstNumber(nondhB.number);
  
  if (numA !== numB) {
    return numA - numB;
  }
  
  return nondhA.number.localeCompare(nondhB.number);
};

const GUNTHAS_PER_ACRE = 40;
const SQM_PER_GUNTHA = 101.1714; // Approx 1 guntha = 101.1714 sq meters
const SQM_PER_ACRE = SQM_PER_GUNTHA * GUNTHAS_PER_ACRE; // Approx 1 acre = 4046.856 sq meters
const convertToSquareMeters = (value: number, unit: "acre" | "guntha"): number => {
  if (unit === "acre") return value * 4046.86
  if (unit === "guntha") return value * 101.171
  return value
}

const convertFromSquareMeters = (value: number, unit: "acre" | "guntha"): number => {
  if (unit === "acre") return value / 4046.86
  if (unit === "guntha") return value / 101.171
  return value
}

type AreaUnit = "acre" | "guntha" | "sq_m";

interface AreaFieldsProps {
  area: { value: number; unit: AreaUnit };
  onChange: (area: { value: number; unit: AreaUnit }) => void;
}

const areaFields = ({ area, onChange }: AreaFieldsProps) => {
  // Calculate current area in square meters (single source of truth)
  const currentSqm = area.unit === "sq_m"
    ? area.value
    : area.unit === "acre"
      ? area.value * SQM_PER_ACRE
      : area.value * SQM_PER_GUNTHA;

  // Calculate derived values for display
  const totalGunthas = currentSqm / SQM_PER_GUNTHA;
  const acres = totalGunthas / GUNTHAS_PER_ACRE; // Keep as decimal for display
  const gunthas = (acres % 1) * GUNTHAS_PER_ACRE;

  const handlePrimaryChange = (value: string, field: "acre" | "guntha" | "sq_m") => {
    const num = value === "" ? 0 : parseFloat(value);
    if (isNaN(num)) return;

    if (area.unit === "sq_m") {
      // When unit is sq_m, primary field is square meters
      onChange({ value: num, unit: "sq_m" });
    } else {
      // When unit is acre, primary fields are acre and guntha
      if (field === "acre") {
        // Update the full acre value (including decimals)
        onChange({ value: num, unit: "acre" });
      } else if (field === "guntha") {
        // Update guntha fraction, keep existing acres
        const currentAcres = Math.floor(area.value);
        const clampedGuntha = Math.min(num, 39.99); // Ensure guntha < 40
        const newTotalValue = currentAcres + (clampedGuntha / 40);
        onChange({ value: newTotalValue, unit: "acre" });
      }
    }
  };

  const handleSecondaryChange = (value: string, field: "acre" | "guntha" | "sq_m") => {
    const num = value === "" ? 0 : parseFloat(value);
    if (isNaN(num)) return;

    if (area.unit === "sq_m") {
      // When unit is sq_m, secondary fields (acre/guntha) should update the sq_m value
      if (field === "acre") {
        const currentGunthaValue = gunthas;
        const newSqm = (num * GUNTHAS_PER_ACRE + currentGunthaValue) * SQM_PER_GUNTHA;
        onChange({ value: newSqm, unit: "sq_m" });
      } else if (field === "guntha") {
        const currentAcreValue = acres;
        const clampedGuntha = Math.min(num, 39.99);
        const newSqm = (currentAcreValue * GUNTHAS_PER_ACRE + clampedGuntha) * SQM_PER_GUNTHA;
        onChange({ value: newSqm, unit: "sq_m" });
      }
    } else {
      // When unit is acre, secondary field is sq_m - convert sq_m to acre
      if (field === "sq_m") {
        const newAcreValue = num / SQM_PER_ACRE;
        onChange({ value: newAcreValue, unit: "acre" });
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-end gap-4">
        {/* Unit Selector - Increased width */}
        <div className="space-y-2 w-[180px]">
          <Label>Unit</Label>
          <Select
            value={area.unit}
            onValueChange={(unit) => {
              const newUnit = unit as AreaUnit;
              if (newUnit === "sq_m") {
                onChange({ value: currentSqm, unit: newUnit });
              } else if (newUnit === "acre") {
                onChange({ value: currentSqm / SQM_PER_ACRE, unit: newUnit });
              } else {
                onChange({ value: currentSqm / SQM_PER_GUNTHA, unit: newUnit });
              }
            }}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acre">Acre-Guntha</SelectItem>
              <SelectItem value="sq_m">Square Meters</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Primary Fields */}
        {area.unit === "sq_m" ? (
          <div className="space-y-2 min-w-[150px] flex-1">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={area.value || ""}
              onChange={(e) => handlePrimaryChange(e.target.value, "sq_m")}
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
                value={area.value.toFixed(2) || ""}
                onChange={(e) => handlePrimaryChange(e.target.value, "acre")}
                placeholder="Enter acres"
                className="w-full"
              />
            </div>
            <div className="space-y-2 min-w-[120px] flex-1">
              <Label>Gunthas</Label>
              <Input
                type="number"
                min="0"
                max="39.99"
                step="0.01"
                value={((area.value % 1) * 40).toFixed(2) || ""}
                onChange={(e) => handlePrimaryChange(e.target.value, "guntha")}
                placeholder="Enter gunthas"
                className="w-full"
              />
            </div>
          </>
        )}

        {/* Secondary Fields */}
        {area.unit === "sq_m" ? (
          <>
            <div className="space-y-2 min-w-[150px] flex-1">
              <Label>Acres</Label>
              <Input
                type="number"
                min="0"
                step="0.01"
                value={acres.toFixed(2) || ""}
                onChange={(e) => handleSecondaryChange(e.target.value, "acre")}
                placeholder="0.00"
                className="w-full"
              />
            </div>
            <div className="space-y-2 min-w-[120px] flex-1">
              <Label>Gunthas</Label>
              <Input
                type="number"
                min="0"
                max="39.99"
                step="0.01"
                value={gunthas.toFixed(2) || ""}
                onChange={(e) => handleSecondaryChange(e.target.value, "guntha")}
                placeholder="0.00"
                className="w-full"
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
              value={currentSqm.toFixed(2) || ""}
              onChange={(e) => handleSecondaryChange(e.target.value, "sq_m")}
              placeholder="0.00"
              className="w-full"
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
        detail.ownerRelations.length > 0 ||
        detail.status !== "Pramanik"
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
        const initialData: NondhDetail[] = []
        const sNoNondhMap = new Map<string, any[]>()

        nondhs.forEach(nondh => {
          nondh.affectedSNos.forEach(sNo => {
            if (!sNoNondhMap.has(sNo)) sNoNondhMap.set(sNo, [])
            sNoNondhMap.get(sNo)!.push(nondh)
          })
        })

        Array.from(sNoNondhMap.keys())
          .sort()
          .forEach(sNo => {
            sNoNondhMap.get(sNo)!.forEach(nondh => {
              const newDetail = {
                id: `${nondh.id}_${sNo}`,
                nondhId: nondh.id,
                sNo,
                type: "Kabjedaar",
                reason: "",
                date: "",
                vigat: "",
                status: "Pramanik",
                raddReason: "",
                showInOutput: false,
                hasDocuments: false,
                docUpload: "",
                oldOwner: "",
                hukamDate: "",
                ownerRelations: [{
                  id: Date.now().toString(),
                  ownerName: "",
                  sNo,
                  area: { value: 0, unit: "sq_m" },
                  tenure: "Navi",
                  isValid: true
                }],
              }
              initialData.push(newDetail)
            })
          })

        setNondhDetailData(initialData)
      }
    }

    initializeData()
  }, [nondhs])

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

  const handleStatusChange = (detailId: string, newStatus: "valid" | "invalid" | "nullified") => {
  const detail = nondhDetailData.find(d => d.id === detailId)
  if (!detail) return

  // Clear invalid reason if status is no longer invalid
  const updates = { 
    status: newStatus,
    invalidReason: newStatus === 'invalid' ? detail.invalidReason : '' 
  }
  
  updateNondhDetail(detailId, updates)

  // NEW: Call validity chain update when status changes to invalid
  if (newStatus === 'invalid' && detail.oldOwner) {
    // Find the old owner's nondh ID from the oldOwner field
    updateValidityChain(detailId, detail.oldOwner, false) // false because this nondh is now invalid
  } else if (newStatus === 'valid' && detail.oldOwner) {
    // If changing back to valid, restore validity chain
    updateValidityChain(detailId, detail.oldOwner, true)
  }
}

const updateValidityChain = (currentDetailId: string, oldOwnerNondhId: string, isCurrentValid: boolean) => {
  const currentDetail = nondhDetailData.find(d => d.id === currentDetailId);
  if (!currentDetail) return;

  // Find all nondh details for the same S.No, sorted by priority
  const sameSnDetails = nondhDetailData
    .filter(d => d.sNo === currentDetail.sNo)
    .sort((a, b) => sortNondhsBySNoType(a, b, nondhs));

  const currentIndex = sameSnDetails.findIndex(d => d.id === currentDetailId);
  
  // Find the old owner detail by matching nondh ID
  const oldOwnerDetailIndex = sameSnDetails.findIndex(d => d.nondhId === oldOwnerNondhId);

  // Safety checks
  if (oldOwnerDetailIndex === -1 || currentIndex === -1 || oldOwnerDetailIndex >= currentIndex) {
    console.warn('Invalid validity chain update parameters');
    return;
  }

  // Get the old owner detail
  const oldOwnerDetail = sameSnDetails[oldOwnerDetailIndex];
  
  // Logic: If current nondh becomes invalid, all previous nondhs in chain should become invalid
  // If current nondh becomes valid, previous nondhs should become valid (unless they have their own invalid status)
  
  // Update validity for all nondhs between old owner and current nondh (inclusive of old owner, exclusive of current)
  for (let i = oldOwnerDetailIndex; i < currentIndex; i++) {
    const detailToUpdate = sameSnDetails[i];
    
    // Don't update the current detail itself, and respect explicit invalid status
    if (detailToUpdate.id !== currentDetailId && detailToUpdate.status !== 'invalid') {
      const newValidityState = isCurrentValid;
      
      const updatedRelations = detailToUpdate.ownerRelations.map(relation => ({
        ...relation,
        isValid: newValidityState
      }));
      
      updateNondhDetail(detailToUpdate.id, { ownerRelations: updatedRelations });
      
      // Recursively update if this detail also affects others
      if (detailToUpdate.oldOwner && detailToUpdate.oldOwner !== oldOwnerNondhId) {
        updateValidityChain(detailToUpdate.id, detailToUpdate.oldOwner, newValidityState);
      }
    }
  }
}

  // Get previous owners for dropdown (Varsai, Hakkami, Vechadi, Hayati_ma_hakh_dakhal)
const getPreviousOwners = (sNo: string, currentNondhId: string) => {
  return nondhDetailData
    .filter(d => 
      d.sNo === sNo && 
      d.nondhId !== currentNondhId &&
      ["Varsai", "Hakkami", "Vechadi", "Kabjedaar", "Ekatrikaran", "Hayati_ma_hakh_dakhal"].includes(d.type)
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

      {/* Special handling for Vechadi */}
      {detail.type === "Vechadi" && (
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
                    ? (detail.type === "Hakkami" || detail.type === "Vechadi") 
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

              {/* Tenure Field - shown for all except Vechadi */}
              {detail.type !== "Vechadi" && (
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
   if (["Hayati_ma_hakh_dakhal", "Varsai", "Hakkami", "Vechadi"].includes(detail.type)) {
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

      case "Hukam":
  return (
    <div className="space-y-4">
      {/* Keep existing Hukam-specific fields */}
      <div className="space-y-2">
        <Label>Hukam Date *</Label>
        <Input
          type="date"
          value={detail.ownerRelations[0]?.hukamDate || ''}
          onChange={(e) => updateOwnerRelation(
            detail.id, 
            detail.ownerRelations[0]?.id, 
            { hukamDate: e.target.value }
          )}
        />
      </div>

      <div className="space-y-4">
        <Label>Restraining Order Passed?</Label>
        <RadioGroup
          value={detail.ownerRelations[0]?.restrainingOrder || "no"}
          onValueChange={(value) => {
            if (detail.ownerRelations.length === 0) {
              addOwnerRelation(detail.id)
            }
            updateOwnerRelation(detail.id, detail.ownerRelations[0]?.id, { restrainingOrder: value })
          }}
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

      <div className="space-y-2">
        <Label>Hukam Type</Label>
        <Select
          value={detail.ownerRelations[0]?.hukamType || "SSRD"}
          onValueChange={(value) => {
            if (detail.ownerRelations.length === 0) {
              addOwnerRelation(detail.id)
            }
            updateOwnerRelation(detail.id, detail.ownerRelations[0]?.id, { hukamType: value })
          }}
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

      {/* Add Owner Details section similar to Kabjedaar */}
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
    if (!nondhs.length || !nondhDetailData.length) {
      toast({
        title: "Error",
        description: "No nondh data available to save",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Prepare data for batch insert
      const nondhDetailsToInsert = nondhDetailData.map(detail => ({
        nondh_id: detail.nondhId,
        s_no: detail.sNo,
        type: detail.type,
        reason: detail.reason || null,
  date: detail.date || null,
        vigat: detail.vigat,
        status: detail.status,
        invalid_reason: detail.status === 'invalid' ? detail.invalidReason : null,
        old_owner: detail.oldOwner || null,
        show_in_output: detail.showInOutput,
        has_documents: detail.hasDocuments,
        doc_upload_url: detail.docUpload
      }))

      // Get existing nondh details to delete
      const { data: existingDetails, error: fetchError } = await supabase
        .from('nondh_details')
        .select('id')
        .in('nondh_id', nondhs.map(n => n.id).filter(id => id && id !== "1" && id !== "new"))

      if (fetchError) throw fetchError

      // Delete existing nondh details and relations
      if (existingDetails?.length) {
        // Delete owner relations first
        await supabase
          .from('nondh_owner_relations')
          .delete()
          .in('nondh_detail_id', existingDetails.map(d => d.id))

        // Then delete nondh details
        await supabase
          .from('nondh_details')
          .delete()
          .in('id', existingDetails.map(d => d.id))
      }

      // Insert new nondh details and get their IDs
      const { data: insertedDetails, error: insertError } = await supabase
        .from('nondh_details')
        .insert(nondhDetailsToInsert)
        .select()

      if (insertError) throw insertError

      // Prepare owner relations data
      const ownerRelationsToInsert = nondhDetailData.flatMap(detail => {
  const detailRecord = insertedDetails.find(d => 
    d.nondh_id === detail.nondhId && 
    d.s_no === detail.sNo
  );
  
  if (!detailRecord) return [];

  return detail.ownerRelations.map(relation => ({
    nondh_detail_id: detailRecord.id,
    owner_name: relation.ownerName,
    s_no: relation.sNo,
    area_value: relation.area.value,
    area_unit: relation.area.unit,
    tenure: relation.tenure,
    is_valid: relation.isValid !== false, // Defaults to true if undefined
    ...(relation.hukamType && { hukam_type: relation.hukamType }),
    ...(relation.hukamDate && { hukam_date: relation.hukamDate }),
    ...(relation.restrainingOrder && { 
      restraining_order: relation.restrainingOrder === 'yes' 
    })
  }));
});

      // Insert owner relations if any
      if (ownerRelationsToInsert.length > 0) {
        const { error: relationsError } = await supabase
          .from('nondh_owner_relations')
          .insert(ownerRelationsToInsert)

        if (relationsError) throw relationsError
      }

      // Update local state
      const updatedDetails = nondhDetailData.map(detail => {
        const insertedDetail = insertedDetails.find(d => 
          d.nondh_id === detail.nondhId && d.s_no === detail.sNo
        )
        return insertedDetail ? { ...detail, dbId: insertedDetail.id } : detail
      })

      setNondhDetails(updatedDetails)
      markAsSaved()
    toast({ title: "Nondh details saved successfully" })
    setCurrentStep(6)
    } catch (error) {
      console.error('Save error:', error)
      toast({
        title: "Error saving nondh details",
        description: error instanceof Error ? error.message : "Database error",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const groupedDetails = nondhDetailData.reduce(
    (acc, detail) => {
      if (!acc[detail.sNo]) {
        acc[detail.sNo] = []
      }
      acc[detail.sNo].push(detail)
      return acc
    },
    {} as Record<string, NondhDetail[]>,
  )

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
        {Object.keys(groupedDetails)
  .sort((a, b) => {
    const aType = getSurveyNumberType(a);
    const bType = getSurveyNumberType(b);
    const priorityOrder = ['survey_no', 'block_no', 'resurvey_no'];
    const aPriority = priorityOrder.indexOf(aType);
    const bPriority = priorityOrder.indexOf(bType);

    // First sort by type priority
    if (aPriority !== bPriority) {
      return aPriority - bPriority;
    }
    
    // Then sort numerically within each type
    return a.localeCompare(b, undefined, { numeric: true });
  })
  .map((sNo) => {
    const sNoType = getSurveyNumberType(sNo);
    const displayLabel = 
      sNoType === 'block_no' ? 'Block No' :
      sNoType === 'resurvey_no' ? 'Resurvey No' : 'Survey No';

    return (
      <Card key={sNo} className="p-4">
        <h3 className="text-xl font-semibold mb-4">
          {sNoType === 'survey_no' ? 'Survey No' : 
 sNoType === 'block_no' ? 'Block No' : 'Resurvey No'}: {sNo}
        </h3>

              {groupedDetails[sNo]
                .sort((a, b) => {
                  const nondhA = nondhs.find((n) => n.id === a.nondhId)
                  const nondhB = nondhs.find((n) => n.id === b.nondhId)
                  if (!nondhA || !nondhB) return 0
                  return sortNondhsBySNoType(a, b, nondhs)
                })
                .map((detail) => {
                  const nondh = nondhs.find((n) => n.id === detail.nondhId)
                  return (
                    <Card key={detail.id} className="p-4 mb-4">
  <div className="flex justify-between items-center">
    <h4 className="text-lg font-medium">Nondh {nondh?.number}</h4>
    <Button
      variant="ghost"
      size="sm"
      onClick={() => toggleCollapse(detail.id)}
      className="text-muted-foreground"
    >
      {collapsedNondhs.has(detail.id) ? (
        <>
          <ChevronDown className="w-4 h-4 mr-2" />
          Expand
        </>
      ) : (
        <>
          <ChevronUp className="w-4 h-4 mr-2" />
          Collapse
        </>
      )}
    </Button>
  </div>

  {!collapsedNondhs.has(detail.id) && (
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4 mt-4">
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

  {/* Add Date Field */}
  <div className="space-y-2">
    <Label>Date *</Label>
    <Input
      type="date"
      value={detail.date || ''}
      onChange={(e) => updateNondhDetail(detail.id, { date: e.target.value })}
    />
  </div>
</div>

{/* Add Reason Field */}
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

      {/* Type-specific fields */}
      {renderTypeSpecificFields(detail)}
    </>
  )}
</Card>
                  )
                })}
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
                Save
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
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
const sortNondhsBySNoType = (a, b, nondhs) => {
  const nondhA = nondhs.find(n => n.id === a.nondhId)
  const nondhB = nondhs.find(n => n.id === b.nondhId)
  
  if (!nondhA || !nondhB) return 0

  // Priority: s_no > block_no > resurvey_no
  const priorityOrder = ['s_no', 'block_no', 'resurvey_no']
  
  const priorityA = priorityOrder.indexOf(nondhA.sNoType) !== -1 ? priorityOrder.indexOf(nondhA.sNoType) : 999
  const priorityB = priorityOrder.indexOf(nondhB.sNoType) !== -1 ? priorityOrder.indexOf(nondhB.sNoType) : 999
  
  if (priorityA !== priorityB) {
    return priorityA - priorityB
  }
  
  // If same priority, sort by nondh number
  const getFirstNumber = (str) => {
    const match = str.match(/^(\d+)/)
    return match ? parseInt(match[1]) : 0
  }
  
  const numA = getFirstNumber(nondhA.number)
  const numB = getFirstNumber(nondhB.number)
  
  if (numA !== numB) {
    return numA - numB
  }
  
  return nondhA.number.localeCompare(nondhB.number)
}

export default function NondhDetails() {
  const { yearSlabs, nondhs, setNondhs, nondhDetails, setNondhDetails, setCurrentStep, landBasicInfo } = useLandRecord()
  const { toast } = useToast()
  const { getStepData, updateStepData, markAsSaved } = useStepFormData(5) // Step 5 for NondhDetails
  const [loading, setLoading] = useState(false)
  const [nondhDetailData, setNondhDetailData] = useState<NondhDetail[]>(getStepData().nondhDetails || [])
  const [collapsedNondhs, setCollapsedNondhs] = useState<Set<string>>(new Set())
  const [equalDistribution, setEqualDistribution] = useState<Record<string, boolean>>({})

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
                subType: "",
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

  // Get previous owners for dropdown (Varsai, Hakkami, Vechadi)
const getPreviousOwners = (sNo: string, currentNondhId: string) => {
  return nondhDetailData
    .filter(d => 
      d.sNo === sNo && 
      d.nondhId !== currentNondhId &&
      ["Varsai", "Hakkami", "Vechadi", "Kabjedaar", "Ekatrikaran"].includes(d.type) // Include more types
    )
    .sort((a, b) => sortNondhsBySNoType(a, b, nondhs))
    .flatMap(d => d.ownerRelations.map(r => ({ 
      name: r.ownerName, 
      area: r.area,
      type: d.type,
      nondhId: d.nondhId // FIX: Add the nondhId here
    })))
    .filter(owner => owner.name.trim() !== '')
}

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
    const previousOwners = getPreviousOwners(detail.sNo, detail.nondhId)
    
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Old Owner *</Label>
          <Select
  value={detail.oldOwner}
  onValueChange={(value) => {
    updateNondhDetail(detail.id, { oldOwner: value })
    
    // NEW: Update validity chain when old owner changes
    if (detail.status === 'invalid') {
      updateValidityChain(detail.id, value, false)
    } else {
      updateValidityChain(detail.id, value, true)
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

        <div className="flex items-center space-x-2">
          <Checkbox
            id={`equal_dist_${detail.id}`}
            checked={equalDistribution[detail.id] || false}
            onCheckedChange={(checked) => toggleEqualDistribution(detail.id, checked as boolean)}
          />
          <Label htmlFor={`equal_dist_${detail.id}`}>Equal Distribution of Land</Label>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <Label>Owner Details</Label>
            <Button size="sm" onClick={() => addOwnerRelation(detail.id)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Owner
            </Button>
          </div>

          {detail.ownerRelations.map((relation, index) => (
            <Card key={relation.id} className="p-3">
              <div className="flex justify-between items-center mb-3">
                <h4 className="font-medium">
                  {index === 0 ? "Old Owner" : `New Owner ${index}`}
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
                  <Input
                    value={relation.ownerName}
                    onChange={(e) => updateOwnerRelation(detail.id, relation.id, { ownerName: e.target.value })}
                    placeholder="Enter owner name"
                    disabled={index === 0 && detail.oldOwner}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Area Value</Label>
<Input
  type="number"
  value={relation.area.value === 0 ? '' : relation.area.value}
  onChange={(e) => {
    const inputValue = e.target.value;
    const numericValue = inputValue === '' ? 0 : parseFloat(inputValue);
    
    // Skip validation if empty (allowing backspace)
    if (inputValue === '') {
      updateOwnerRelation(detail.id, relation.id, {
        area: { ...relation.area, value: 0 }
      });
      return;
    }

    // Validate guntha limit
    if (relation.area.unit === 'guntha' && numericValue > 40) {
      toast({
        title: "Validation Error",
        description: "Guntha value cannot exceed 40",
        variant: "destructive"
      });
      return;
    }

    // Only update if valid number
    if (!isNaN(numericValue)) {
      updateOwnerRelation(detail.id, relation.id, {
        area: { ...relation.area, value: numericValue }
      });
    }
  }}
  min={0}
  max={relation.area.unit === 'guntha' ? 40 : undefined}
  placeholder="Enter area"
  className="[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
/>
                </div>
                <div className="space-y-2">
                  <Label>Area Unit</Label>
                  <Select
                    value={relation.area.unit}
                    onValueChange={(value) =>
                      updateOwnerRelation(detail.id, relation.id, {
                        area: { ...relation.area, unit: value },
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="guntha">Guntha</SelectItem>
                      <SelectItem value="sq_m">Square Meter</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  const renderTypeSpecificFields = (detail: NondhDetail) => {
    if (["Varsai", "Hakkami", "Vechadi"].includes(detail.type)) {
      return renderOwnerSelectionFields(detail)
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
                      <Label>Area Value</Label>
                      <Input
                        type="number"
                        value={relation.area.value}
                        onChange={(e) =>
                          updateOwnerRelation(detail.id, relation.id, {
                            area: { ...relation.area, value: Number.parseFloat(e.target.value) || 0 },
                          })
                        }
                        placeholder="Enter area"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Area Unit</Label>
                      <Select
                        value={relation.area.unit}
                        onValueChange={(value) =>
                          updateOwnerRelation(detail.id, relation.id, {
                            area: { ...relation.area, unit: value },
                          })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="guntha">Guntha</SelectItem>
                          <SelectItem value="sq_m">Square Meter</SelectItem>
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
          <div className="space-y-4">
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
              <Label>Tenure Change</Label>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Area</Label>
                <Input
                  type="number"
                  value={detail.ownerRelations[0]?.area?.value || 0}
                  onChange={(e) => {
                    if (detail.ownerRelations.length === 0) {
                      addOwnerRelation(detail.id)
                    }
                    updateOwnerRelation(detail.id, detail.ownerRelations[0]?.id, {
                      area: { value: Number.parseFloat(e.target.value) || 0, unit: "sq_m" },
                    })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>S.No</Label>
                <Input
                  value={detail.ownerRelations[0]?.sNo || detail.sNo}
                  onChange={(e) => {
                    if (detail.ownerRelations.length === 0) {
                      addOwnerRelation(detail.id)
                    }
                    updateOwnerRelation(detail.id, detail.ownerRelations[0]?.id, { sNo: e.target.value })
                  }}
                />
              </div>
              <div className="space-y-2">
                <Label>New Owner Name</Label>
                <Input
                  value={detail.ownerRelations[0]?.ownerName || ""}
                  onChange={(e) => {
                    if (detail.ownerRelations.length === 0) {
                      addOwnerRelation(detail.id)
                    }
                    updateOwnerRelation(detail.id, detail.ownerRelations[0]?.id, { ownerName: e.target.value })
                  }}
                  placeholder="Enter new owner name"
                />
              </div>
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
                    <Input
                      type="number"
                      value={relation.area.value}
                      onChange={(e) =>
                        updateOwnerRelation(detail.id, relation.id, {
                          area: { ...relation.area, value: Number.parseFloat(e.target.value) || 0 },
                        })
                      }
                      placeholder="Enter area"
                    />
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
        sub_type: detail.subType,
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
          .sort()
          .map((sNo) => (
            <Card key={sNo} className="p-4">
              <h3 className="text-xl font-semibold mb-4">S.No: {sNo}</h3>

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

        <div className="space-y-2">
          <Label>Sub Type</Label>
          <Input
            value={detail.subType}
            onChange={(e) => updateNondhDetail(detail.id, { subType: e.target.value })}
            placeholder="Enter sub type"
          />
        </div>
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
          ))}

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
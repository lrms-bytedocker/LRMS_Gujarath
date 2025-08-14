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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Trash2, Plus, Upload, Eye, Loader2, ChevronDown, ChevronUp, Badge, Save } from "lucide-react"
import { useLandRecord } from "@/contexts/land-record-context"
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

export default function NondhDetailsEdit() {
  const { landBasicInfo } = useLandRecord()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [nondhs, setNondhs] = useState<any[]>([])
  const [nondhDetails, setNondhDetails] = useState<any[]>([])
  const [originalDetails, setOriginalDetails] = useState<any[]>([])
  const [collapsedNondhs, setCollapsedNondhs] = useState<Set<string>>(new Set())
  const [equalDistribution, setEqualDistribution] = useState<Record<string, boolean>>({})
  const [documents712, setDocuments712] = useState<any[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      if (!landBasicInfo?.id) return

      try {
        setLoading(true)
        
        // Fetch nondhs
        const { data: nondhData, error: nondhError } = await LandRecordService.getNondhs(landBasicInfo.id)
        if (nondhError) throw nondhError
        setNondhs(nondhData || [])

        // Fetch nondh details with relations
        const { data: detailData, error: detailError } = await LandRecordService.getNondhDetailsWithRelations(landBasicInfo.id)
        if (detailError) throw detailError
        
        // Transform data to match our form structure
        const transformedDetails = detailData?.map((detail: any) => ({
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
          hukamStatus: detail.hukam_status || "valid",
          hukamInvalidReason: detail.hukam_invalid_reason || "",
          affectedNondhNo: detail.affected_nondh_no || "",
          ownerRelations: detail.owner_relations?.map((rel: any) => ({
            id: rel.id,
            ownerName: rel.owner_name,
            sNo: rel.s_no,
            area: {
              value: rel.square_meters || (rel.acres * 4046.86 + rel.gunthas * 101.17),
              unit: rel.area_unit,
              acres: rel.acres,
              gunthas: rel.gunthas
            },
            tenure: rel.tenure || "Navi",
            isValid: rel.is_valid !== false
          })) || []
        })) || []

        setNondhDetails(transformedDetails)
        setOriginalDetails(transformedDetails)

        // Fetch 7/12 documents
        const { data: docData, error: docError } = await LandRecordService.get712Documents(landBasicInfo.id)
        if (docError) throw docError
        setDocuments712(docData || [])

      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: "Error loading data",
          description: "Could not load nondh data from database",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [landBasicInfo?.id, toast])

  useEffect(() => {
    // Check for changes
    setHasChanges(!deepEqual(nondhDetails, originalDetails))
  }, [nondhDetails, originalDetails])

  const deepEqual = (a: any, b: any) => {
    return JSON.stringify(a) === JSON.stringify(b)
  }

  const toggleCollapse = (nondhId: string) => {
    setCollapsedNondhs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nondhId)) {
        newSet.delete(nondhId)
      } else {
        newSet.add(nondhId)
      }
      return newSet
    })
  }

  const updateNondhDetail = (id: string, updates: any) => {
    setNondhDetails(prev => prev.map(detail => 
      detail.id === id ? { ...detail, ...updates } : detail
    ))
  }

  const addOwnerRelation = (detailId: string) => {
    setNondhDetails(prev => prev.map(detail => {
      if (detail.id !== detailId) return detail
      
      const newRelation = {
        id: Date.now().toString(),
        ownerName: "",
        sNo: detail.sNo,
        area: { value: 0, unit: "sq_m" },
        tenure: "Navi",
        isValid: true
      }
      
      return {
        ...detail,
        ownerRelations: [...detail.ownerRelations, newRelation]
      }
    }))
  }

  const removeOwnerRelation = (detailId: string, relationId: string) => {
    setNondhDetails(prev => prev.map(detail => {
      if (detail.id !== detailId) return detail
      
      return {
        ...detail,
        ownerRelations: detail.ownerRelations.filter(r => r.id !== relationId)
      }
    }))
  }

  const updateOwnerRelation = (detailId: string, relationId: string, updates: any) => {
    setNondhDetails(prev => prev.map(detail => {
      if (detail.id !== detailId) return detail
      
      return {
        ...detail,
        ownerRelations: detail.ownerRelations.map(relation => 
          relation.id === relationId ? { ...relation, ...updates } : relation
        )
      }
    }))
  }

  const handleFileUpload = async (file: File, detailId: string) => {
    try {
      setLoading(true)
      const path = `nondh-detail-documents/${Date.now()}_${file.name}`
      const url = await uploadFile(file, "land-documents", path)
      
      updateNondhDetail(detailId, { 
        docUpload: url,
        hasDocuments: true 
      })
      
      toast({ title: "File uploaded successfully" })
    } catch (error) {
      toast({ title: "Error uploading file", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const handleSaveChanges = async () => {
    if (!hasChanges) return
    
    try {
      setSaving(true)
      
      // Identify changes to save
      const changes = nondhDetails.map(detail => {
        const original = originalDetails.find(d => d.id === detail.id)
        return {
          id: detail.id,
          changes: getObjectChanges(original, detail)
        }
      }).filter(item => Object.keys(item.changes).length > 0)

      // Save changes
      for (const change of changes) {
        if (!change.id) {
          // New record - POST
          await LandRecordService.createNondhDetail(change.changes)
        } else {
          // Existing record - PATCH
          await LandRecordService.updateNondhDetail(change.id, change.changes)
        }
      }

      // Update original data
      setOriginalDetails([...nondhDetails])
      setHasChanges(false)
      
      toast({ title: "Changes saved successfully" })
    } catch (error) {
      console.error('Error saving changes:', error)
      toast({
        title: "Error saving changes",
        description: "Could not save nondh details",
        variant: "destructive"
      })
    } finally {
      setSaving(false)
    }
  }

  const getObjectChanges = (original: any, current: any) => {
    if (!original) return current // New record
    
    const changes: any = {}
    Object.keys(current).forEach(key => {
      if (!deepEqual(original[key], current[key])) {
        changes[key] = current[key]
      }
    })
    return changes
  }

  const formatArea = (area: any) => {
    if (!area) return "N/A"
    if (area.unit === 'sq_m') {
      return `${area.value} sq.m`
    } else {
      return `${area.acres || 0} acres ${area.gunthas || 0} gunthas`
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
          {hasChanges && (
            <Button onClick={handleSaveChanges} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          )}
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
        {nondhs.map(nondh => {
          const detail = nondhDetails.find(d => d.nondhId === nondh.id)
          if (!detail) return null

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
                      {nondh.affected_s_nos?.map((sNo: string) => (
                        <span 
                          key={sNo} 
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm"
                        >
                          {sNo}
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
                          onValueChange={(value) => updateNondhDetail(detail.id, { status: value })}
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

                    {/* Owner Relations */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>Owner Relations</Label>
                        <Button 
                          size="sm" 
                          onClick={() => addOwnerRelation(detail.id)}
                          className="flex items-center gap-1"
                        >
                          <Plus className="w-4 h-4" />
                          Add Owner
                        </Button>
                      </div>

                      {detail.ownerRelations.map((relation: any, index: number) => (
                        <Card key={relation.id} className="p-4">
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
                              <div className="flex items-center gap-2">
                                <Input
                                  type="number"
                                  value={relation.area.value || ''}
                                  onChange={(e) => updateOwnerRelation(
                                    detail.id,
                                    relation.id,
                                    { area: { ...relation.area, value: parseFloat(e.target.value) || 0 } }
                                  )}
                                  placeholder="Enter area"
                                />
                                <Select
                                  value={relation.area.unit}
                                  onValueChange={(unit) => updateOwnerRelation(
                                    detail.id,
                                    relation.id,
                                    { area: { ...relation.area, unit } }
                                  )}
                                >
                                  <SelectTrigger className="w-[100px]">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="sq_m">sq.m</SelectItem>
                                    <SelectItem value="acre_guntha">acre/guntha</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                            <div className="space-y-2">
                              <Label>Tenure</Label>
                              <Select
                                value={relation.tenure}
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
                          </div>
                        </Card>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )
        })}
      </CardContent>
    </Card>
  )
}
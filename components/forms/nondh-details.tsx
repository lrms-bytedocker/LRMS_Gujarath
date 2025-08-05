"use client"

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
import { Trash2, Plus, ArrowRight, ArrowLeft, Upload, Eye } from "lucide-react"
import { useLandRecord, type NondhDetail } from "@/contexts/land-record-context"
import { supabase, uploadFile } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

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

export default function NondhDetails() {
  const { yearSlabs, nondhs, nondhDetails, setNondhDetails, setCurrentStep } = useLandRecord()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [nondhDetailData, setNondhDetailData] = useState<NondhDetail[]>([])

  useEffect(() => {
  const loadNondhDetails = async () => {
    if (!nondhs.length) return;

    try {
      // Load nondh details from database
      const { data: detailsData, error: detailsError } = await supabase
        .from('nondh_details')
        .select('*')
        .in('nondh_id', nondhs.map(n => n.id));

      if (detailsError) throw detailsError;

      // Load owner relations
      const { data: relationsData, error: relationsError } = await supabase
        .from('nondh_owner_relations')
        .select('*')
        .in('nondh_detail_id', detailsData?.map(d => d.id) || []);

      if (relationsError) throw relationsError;

      if (detailsData?.length) {
        // Map database data to our state format
        const loadedDetails = detailsData.map(detail => {
          const relations = relationsData?.filter(r => r.nondh_detail_id === detail.id) || [];
          return {
            id: `${detail.nondh_id}_${detail.s_no}`,
            nondhId: detail.nondh_id,
            sNo: detail.s_no,
            type: detail.type,
            subType: detail.sub_type || '',
            vigat: detail.vigat || '',
            status: detail.status as 'Valid' | 'Invalid' | 'Nullified',
            showInOutput: detail.show_in_output,
            hasDocuments: detail.has_documents,
            docUpload: detail.doc_upload_url || '',
            ownerRelations: relations.map(r => ({
              id: r.id.toString(),
              ownerName: r.owner_name,
              sNo: r.s_no,
              area: { value: r.area_value, unit: r.area_unit as 'guntha' | 'sq_m' },
              tenure: r.tenure,
              ...(r.hukam_type && { hukamType: r.hukam_type }),
              ...(typeof r.restraining_order === 'boolean' && { 
                restrainingOrder: r.restraining_order ? 'yes' : 'no' 
              })
            })),
            dbId: detail.id
          };
        });

        setNondhDetailData(loadedDetails);
        setNondhDetails(loadedDetails);
      } else {
        // Initialize fresh data if no saved data exists
        const initialData: NondhDetail[] = [];
        const sNoNondhMap = new Map<string, any[]>();

        nondhs.forEach(nondh => {
          nondh.affectedSNos.forEach(sNo => {
            if (!sNoNondhMap.has(sNo)) sNoNondhMap.set(sNo, []);
            sNoNondhMap.get(sNo)!.push(nondh);
          });
        });

        Array.from(sNoNondhMap.keys())
          .sort()
          .forEach(sNo => {
            sNoNondhMap.get(sNo)!
              .sort((a, b) => a.number - b.number)
              .forEach(nondh => {
                initialData.push({
                  id: `${nondh.id}_${sNo}`,
                  nondhId: nondh.id,
                  sNo,
                  type: "Kabjedaar",
                  subType: "",
                  vigat: "",
                  status: "Valid",
                  showInOutput: false,
                  hasDocuments: false,
                  docUpload: "",
                  ownerRelations: [],
                });
              });
          });

        setNondhDetailData(initialData);
      }
    } catch (error) {
      console.error('Load error:', error);
      toast({
        title: "Error loading nondh details",
        variant: "destructive"
      });
    }
  };

  loadNondhDetails();
}, [nondhs]);

  const updateNondhDetail = (id: string, updates: Partial<NondhDetail>) => {
    setNondhDetailData((prev) => prev.map((detail) => (detail.id === id ? { ...detail, ...updates } : detail)))
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
      }
      updateNondhDetail(detailId, {
        ownerRelations: [...detail.ownerRelations, newRelation],
      })
    }
  }

  const removeOwnerRelation = (detailId: string, relationId: string) => {
    const detail = nondhDetailData.find((d) => d.id === detailId)
    if (detail) {
      updateNondhDetail(detailId, {
        ownerRelations: detail.ownerRelations.filter((r) => r.id !== relationId),
      })
    }
  }

  const updateOwnerRelation = (detailId: string, relationId: string, updates: any) => {
    const detail = nondhDetailData.find((d) => d.id === detailId)
    if (detail) {
      const updatedRelations = detail.ownerRelations.map((relation) =>
        relation.id === relationId ? { ...relation, ...updates } : relation,
      )
      updateNondhDetail(detailId, { ownerRelations: updatedRelations })
    }
  }

  const handleFileUpload = async (file: File, detailId: string) => {
    try {
      const path = `nondh-detail-documents/${Date.now()}_${file.name}`
      const url = await uploadFile(file, "land-documents", path)
      updateNondhDetail(detailId, { docUpload: url })
      toast({ title: "File uploaded successfully" })
    } catch (error) {
      toast({ title: "Error uploading file", variant: "destructive" })
    }
  }

  const renderTypeSpecificFields = (detail: NondhDetail) => {
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
        })
      }

      slab.paikyEntries.forEach((entry, index) => {
        if (entry.integrated712) {
          docs.push({
            year: `${slab.startYear}-${slab.endYear}`,
            sNo: entry.sNo,
            url: entry.integrated712,
            type: `Paiky ${index + 1}`,
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
    });
    return;
  }

  setLoading(true);
  try {
    // Prepare data for batch insert
    const nondhDetailsToInsert = nondhDetailData.map(detail => ({
      nondh_id: detail.nondhId,
      s_no: detail.sNo,
      type: detail.type,
      sub_type: detail.subType,
      vigat: detail.vigat,
      status: detail.status,
      show_in_output: detail.showInOutput,
      has_documents: detail.hasDocuments,
      doc_upload_url: detail.docUpload
    }));

    // Get existing nondh details to delete
    const { data: existingDetails, error: fetchError } = await supabase
      .from('nondh_details')
      .select('id')
      .in('nondh_id', nondhs.map(n => n.id));

    if (fetchError) throw fetchError;

    // Delete existing nondh details and relations
    if (existingDetails?.length) {
      // Delete owner relations first
      await supabase
        .from('nondh_owner_relations')
        .delete()
        .in('nondh_detail_id', existingDetails.map(d => d.id));

      // Then delete nondh details
      await supabase
        .from('nondh_details')
        .delete()
        .in('id', existingDetails.map(d => d.id));
    }

    // Insert new nondh details and get their IDs
    const { data: insertedDetails, error: insertError } = await supabase
      .from('nondh_details')
      .insert(nondhDetailsToInsert)
      .select();

    if (insertError) throw insertError;

    // Prepare owner relations data
    const ownerRelationsToInsert = nondhDetailData.flatMap(detail => {
      const detailRecord = insertedDetails.find(d => d.nondh_id === detail.nondhId && d.s_no === detail.sNo);
      if (!detailRecord) return [];

      return detail.ownerRelations.map(relation => ({
        nondh_detail_id: detailRecord.id,
        owner_name: relation.ownerName,
        s_no: relation.sNo,
        area_value: relation.area.value,
        area_unit: relation.area.unit,
        tenure: relation.tenure,
        ...(relation.hukamType && { hukam_type: relation.hukamType }),
        ...(relation.restrainingOrder && { restraining_order: relation.restrainingOrder === 'yes' })
      }));
    });

    // Insert owner relations if any
    if (ownerRelationsToInsert.length > 0) {
      const { error: relationsError } = await supabase
        .from('nondh_owner_relations')
        .insert(ownerRelationsToInsert);

      if (relationsError) throw relationsError;
    }

    // Update local state
    const updatedDetails = nondhDetailData.map(detail => {
      const insertedDetail = insertedDetails.find(d => 
        d.nondh_id === detail.nondhId && d.s_no === detail.sNo
      );
      return insertedDetail ? { ...detail, dbId: insertedDetail.id } : detail;
    });

    setNondhDetails(updatedDetails);
    toast({ title: "Nondh details saved successfully" });
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
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents712.map((doc, index) => (
                  <TableRow key={index}>
                    <TableCell>{doc.year}</TableCell>
                    <TableCell>{doc.sNo}</TableCell>
                    <TableCell>{doc.type}</TableCell>
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
                  return (nondhA?.number || 0) - (nondhB?.number || 0)
                })
                .map((detail) => {
                  const nondh = nondhs.find((n) => n.id === detail.nondhId)
                  return (
                    <Card key={detail.id} className="p-4 mb-4">
                      <h4 className="text-lg font-medium mb-4">Nondh {nondh?.number}</h4>

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
                            onValueChange={(value: "Valid" | "Invalid" | "Nullified") =>
                              updateNondhDetail(detail.id, { status: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Valid">Valid</SelectItem>
                              <SelectItem value="Invalid">Invalid</SelectItem>
                              <SelectItem value="Nullified">Nullified</SelectItem>
                            </SelectContent>
                          </Select>
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
                          {detail.docUpload && <p className="text-sm text-green-600">Document uploaded successfully</p>}
                        </div>
                      </div>

                      {/* Type-specific fields */}
                      {renderTypeSpecificFields(detail)}
                    </Card>
                  )
                })}
            </Card>
          ))}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(4)}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? "Saving..." : "Next Step"}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

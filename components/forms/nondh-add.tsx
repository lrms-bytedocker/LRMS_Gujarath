"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Plus, ArrowRight, ArrowLeft, Upload } from "lucide-react"
import { useLandRecord, type Nondh } from "@/contexts/land-record-context"
import { supabase, uploadFile } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"

type SNoTypeUI = "block_no" | "re_survey_no" | "survey_no";

export default function NondhAdd() {
  const { yearSlabs, nondhs, setNondhs, setCurrentStep, landBasicInfo } = useLandRecord()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [nondhData, setNondhData] = useState<Nondh[]>([
    {
      id: "1",
      number: "",
      sNoType: "s_no",
      affectedSNos: [],
      nondhDoc: "",
    },
  ])

  // Get unique S.Nos from all slabs
  const getAllSNos = () => {
    const sNos = new Set<string>()
    yearSlabs.forEach((slab) => {
      sNos.add(slab.sNo)
      slab.paikyEntries.forEach((entry) => sNos.add(entry.sNo))
      slab.ekatrikaranEntries.forEach((entry) => sNos.add(entry.sNo))
    })
    return Array.from(sNos).filter((sNo) => sNo.trim() !== "")
  }

  const availableSNos = getAllSNos()

  useEffect(() => {
    if (nondhs.length > 0) {
      setNondhData(nondhs)
    }
  }, [nondhs])

  // Automatically add new nondh when user starts typing in last empty one
  useEffect(() => {
    const lastNondh = nondhData[nondhData.length - 1];
    
    // Always ensure there's at least one empty box
    if (nondhData.length === 0) {
      setNondhData([{
        id: "1",
        number: "",
        sNoType: "s_no",
        affectedSNos: [],
        nondhDoc: "",
      }]);
      return;
    }

    // Add new box when user starts typing in the last box
    if (lastNondh.number.trim() !== "") {
      const newNondh: Nondh = {
        id: Date.now().toString(), // Use timestamp for unique ID
        number: "",
        sNoType: "s_no",
        affectedSNos: [],
        nondhDoc: "",
      };
      setNondhData(prev => [...prev, newNondh]);
    }
  }, [nondhData]);

  const removeNondh = (id: string) => {
    if (nondhData.length > 1) {
      setNondhData(prev => prev.filter(nondh => nondh.id !== id));
    } else {
      // If it's the last box, just clear it instead of removing
      setNondhData([{
        id: "1",
        number: "",
        sNoType: "s_no",
        affectedSNos: [],
        nondhDoc: "",
      }]);
    }
  };

  const updateNondh = (id: string, updates: Partial<Nondh>) => {
    setNondhData(nondhData.map((nondh) => (nondh.id === id ? { ...nondh, ...updates } : nondh)))
  }

  const handleSNoSelection = (nondhId: string, sNo: string, checked: boolean) => {
    const nondh = nondhData.find((n) => n.id === nondhId)
    if (nondh) {
      let updatedSNos = [...nondh.affectedSNos]
      if (checked) {
        if (!updatedSNos.includes(sNo)) {
          updatedSNos.push(sNo)
        }
      } else {
        updatedSNos = updatedSNos.filter((s) => s !== sNo)
      }
      updateNondh(nondhId, { affectedSNos: updatedSNos })
    }
  }

  const handleFileUpload = async (file: File, nondhId: string) => {
    try {
      setLoading(true)
      const path = `nondh-documents/${Date.now()}_${file.name}`
      const url = await uploadFile(file, "land-documents", path)
      updateNondh(nondhId, { nondhDoc: url })
      toast({ title: "File uploaded successfully" })
    } catch (error) {
      toast({ 
        title: "Error uploading file", 
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  const validateNondhNumber = (number: string) => {
    // Regex for numbers separated by / or - (e.g. 10-35 or 30/45)
    const regex = /^(\d+([-/]\d+)*)$/
    return regex.test(number)
  }

  function getAutoPopulatedSNoData(selectedType: SNoTypeUI): string[] {
  if (!landBasicInfo) return [];
  
  switch(selectedType) {
    case "block_no":
      return landBasicInfo.blockNo ? [landBasicInfo.blockNo] : [];
    case "re_survey_no":
      return landBasicInfo.reSurveyNo ? [landBasicInfo.reSurveyNo] : [];
    case "survey_no":
      // Handle case where sNo might be multiple values (comma separated)
      return landBasicInfo.sNo ? 
        landBasicInfo.sNo.split(',').map((s: string) => s.trim()) : [];
    default:
      return [];
  }
}

  const handleAutoFill = (nondhId: string) => {
  const nondh = nondhData.find(n => n.id === nondhId);
  if (!nondh) return;

  const sNoType: SNoTypeUI = nondh.sNoType === "s_no" ? "survey_no" : nondh.sNoType;
  const autoPopulatedValues = getAutoPopulatedSNoData(sNoType);
  
  if (autoPopulatedValues.length > 0) {
    // Filter values that exist in availableSNos and aren't already selected
    const newValues = autoPopulatedValues.filter(
      val => availableSNos.includes(val) && 
             !nondh.affectedSNos.includes(val)
    );
    
    if (newValues.length > 0) {
      updateNondh(nondhId, { 
        affectedSNos: [...nondh.affectedSNos, ...newValues]
      });
      toast({
        title: "Auto-filled affected S.Nos",
        description: `Added: ${newValues.join(", ")}`
      });
    } else {
      toast({
        title: "No new S.Nos to add",
        description: "All matching S.Nos are already selected"
      });
    }
  } else {
    toast({
      title: "No data available",
      description: `No ${sNoType.replace("_", " ")} found for this land record`,
      variant: "destructive"
    });
  }
}

  const handleSubmit = async () => {
    if (!landBasicInfo?.id) {
      toast({ 
        title: "Error", 
        description: "Land record not found", 
        variant: "destructive" 
      })
      return
    }

    setLoading(true)
    try {
      // Filter out empty nondhs (where number is empty)
      const validNondhs = nondhData.filter(nondh => 
        nondh.number.trim() !== "" && nondh.id !== "new"
      )

      // Validate nondh numbers format
      const hasInvalidNumbers = validNondhs.some(nondh => !validateNondhNumber(nondh.number))
      if (hasInvalidNumbers) {
        throw new Error("Nondh numbers must be in format like 10-35 or 30/45")
      }

      // Validate that all nondhs have at least one affected S.No
      const hasEmptyAffectedSNos = validNondhs.some(nondh => nondh.affectedSNos.length === 0)
      if (hasEmptyAffectedSNos) {
        throw new Error("Please select at least one affected S.No for each Nondh")
      }

      // Prepare data for Supabase
      const nondhsToSave = validNondhs.map(nondh => ({
        land_record_id: landBasicInfo.id,
        number: nondh.number,
        s_no_type: nondh.sNoType,
        affected_s_nos: nondh.affectedSNos,
        nondh_doc_url: nondh.nondhDoc,
      }))

      // Delete existing nondhs for this land record
      const { error: deleteError } = await supabase
        .from("nondhs")
        .delete()
        .eq("land_record_id", landBasicInfo.id)

      if (deleteError) throw deleteError

      // Insert new nondhs
      const { error: insertError } = await supabase
        .from("nondhs")
        .insert(nondhsToSave)

      if (insertError) throw insertError

      setNondhs(validNondhs)
      toast({ title: "Nondh data saved successfully" })
      setCurrentStep(5)
    } catch (error) {
      toast({ 
        title: "Error saving nondh data", 
        description: error instanceof Error ? error.message : "Save failed",
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 4A: Add Nondh</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {nondhData.map((nondh, index) => (
          <Card key={nondh.id} className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Nondh {index + 1}</h3>
              {nondhData.length > 1 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => removeNondh(nondh.id)} 
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Nondh Number */}
              <div className="space-y-2">
                <Label>Nondh Number * (e.g. 10-35 or 30/45)</Label>
                <Input
                  value={nondh.number}
                  onChange={(e) => updateNondh(nondh.id, { number: e.target.value })}
                  placeholder="Enter nondh number (e.g. 10-35 or 30/45)"
                />
                {nondh.number && !validateNondhNumber(nondh.number) && (
                  <p className="text-sm text-red-500">
                    Invalid format. Use numbers separated by / or - (e.g. 10-35 or 30/45)
                  </p>
                )}
              </div>

              {/* S.No Type */}
              <div className="space-y-4">
                <Label>S.No Type *</Label>
                <RadioGroup
                  value={nondh.sNoType}
                  onValueChange={(value: "s_no" | "block_no" | "re_survey_no") => {
                    updateNondh(nondh.id, { sNoType: value });
                    handleAutoFill(nondh.id);
                  }}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="s_no" id={`s_no_${nondh.id}`} />
                    <Label htmlFor={`s_no_${nondh.id}`}>S.No</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="block_no" id={`block_no_${nondh.id}`} />
                    <Label htmlFor={`block_no_${nondh.id}`}>Block No</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="re_survey_no" id={`re_survey_no_${nondh.id}`} />
                    <Label htmlFor={`re_survey_no_${nondh.id}`}>Re Survey No</Label>
                  </div>
                </RadioGroup>
              </div>

              {/* Affected S.Nos */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label>Affected S.Nos * (Select all that apply)</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAutoFill(nondh.id)}
                    disabled={!landBasicInfo}
                  >
                    Auto-fill Current Type
                  </Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                  {availableSNos.map((sNo) => (
                    <div key={sNo} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${nondh.id}_${sNo}`}
                        checked={nondh.affectedSNos.includes(sNo)}
                        onCheckedChange={(checked) => handleSNoSelection(nondh.id, sNo, checked as boolean)}
                      />
                      <Label htmlFor={`${nondh.id}_${sNo}`} className="text-sm">
                        {sNo}
                      </Label>
                    </div>
                  ))}
                </div>
                {nondh.affectedSNos.length > 0 && (
                  <p className="text-sm text-muted-foreground">Selected: {nondh.affectedSNos.join(", ")}</p>
                )}
              </div>

              {/* Document Upload */}
              <div className="space-y-2">
                <Label>Nondh Document</Label>
                <div className="flex items-center gap-4">
                  <Input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) handleFileUpload(file, nondh.id)
                    }}
                    disabled={loading}
                  />
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                {nondh.nondhDoc && (
                  <p className="text-sm text-green-600">Document uploaded successfully</p>
                )}
              </div>
            </div>
          </Card>
        ))}

        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(3)}>
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
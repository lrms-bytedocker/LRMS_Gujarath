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

export default function NondhAdd() {
  const { yearSlabs, nondhs, setNondhs, setCurrentStep } = useLandRecord()
  const { toast } = useToast()
  const [loading, setLoading] = useState(false)
  const [nondhData, setNondhData] = useState<Nondh[]>([
    {
      id: "1",
      number: 1,
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

  const addNondh = () => {
    const newNondh: Nondh = {
      id: Date.now().toString(),
      number: Math.max(...nondhData.map((n) => n.number), 0) + 1,
      sNoType: "s_no",
      affectedSNos: [],
      nondhDoc: "",
    }
    setNondhData([...nondhData, newNondh])
  }

  const removeNondh = (id: string) => {
    setNondhData(nondhData.filter((nondh) => nondh.id !== id))
  }

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
      const path = `nondh-documents/${Date.now()}_${file.name}`
      const url = await uploadFile(file, "land-documents", path)
      updateNondh(nondhId, { nondhDoc: url })
      toast({ title: "File uploaded successfully" })
    } catch (error) {
      toast({ title: "Error uploading file", variant: "destructive" })
    }
  }

  const handleSubmit = async () => {
    // Validate that all nondhs have at least one affected S.No
    // const hasEmptyAffectedSNos = nondhData.some((nondh) => nondh.affectedSNos.length === 0)

    // if (hasEmptyAffectedSNos) {
    //   toast({ title: "Please select at least one affected S.No for each Nondh", variant: "destructive" })
    //   return
    // }

    // setLoading(true)
    // try {
    //   // Save nondhs to database
    //   for (const nondh of nondhData) {
    //     const { error } = await supabase.from("nondhs").insert({
    //       number: nondh.number,
    //       s_no_type: nondh.sNoType,
    //       affected_s_no: nondh.affectedSNos,
    //       nondh_doc: nondh.nondhDoc,
    //     })

    //     if (error) throw error
    //   }

    //   setNondhs(nondhData)
    //   toast({ title: "Nondh data saved successfully" })
    // } catch (error) {
    //   toast({ title: "Error saving nondh data", variant: "destructive" })
    // } finally {
    //   setLoading(false)
    // }
    setCurrentStep(5)
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
                <Button variant="outline" size="sm" onClick={() => removeNondh(nondh.id)} className="text-red-600">
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="space-y-4">
              {/* Nondh Number */}
              <div className="space-y-2">
                <Label>Nondh Number *</Label>
                <Input
                  type="number"
                  value={nondh.number}
                  onChange={(e) => updateNondh(nondh.id, { number: Number.parseInt(e.target.value) || 1 })}
                  min="1"
                />
              </div>

              {/* S.No Type */}
              <div className="space-y-4">
                <Label>S.No Type *</Label>
                <RadioGroup
                  value={nondh.sNoType}
                  onValueChange={(value: "s_no" | "block_no" | "re_survey_no") =>
                    updateNondh(nondh.id, { sNoType: value })
                  }
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
                <Label>Affected S.Nos * (Select all that apply)</Label>
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
                  />
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                {nondh.nondhDoc && <p className="text-sm text-green-600">Document uploaded successfully</p>}
              </div>
            </div>
          </Card>
        ))}

        <Button onClick={addNondh} variant="outline" className="w-full bg-transparent">
          <Plus className="w-4 h-4 mr-2" />
          Add Another Nondh
        </Button>

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

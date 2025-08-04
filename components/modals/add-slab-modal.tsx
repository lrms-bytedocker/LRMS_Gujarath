"use client"

import type React from "react"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Trash2, Upload, FileText } from "lucide-react"
import { useLRMS, type Slab, type PaikyEntry, type ConsolidationEntry } from "@/contexts/lrms-context"
import { useToast } from "@/hooks/use-toast"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const slabSchema = z
  .object({
    startYear: z.number().min(1900, "Start year must be after 1900").max(2100, "Start year must be before 2100"),
    endYear: z.number().min(1900, "End year must be after 1900").max(2100, "End year must be before 2100"),
    paiky: z.boolean(),
    consolidation: z.boolean(),
    paikyCount: z.number().min(0).optional(),
    consolidationCount: z.number().min(0).optional(),
  })
  .refine((data) => data.endYear >= data.startYear, {
    message: "End year must be greater than or equal to start year",
    path: ["endYear"],
  })

type SlabFormData = z.infer<typeof slabSchema>

interface AddSlabModalProps {
  landId: string
  onClose: () => void
}

export function AddSlabModal({ landId, onClose }: AddSlabModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [paikyEntries, setPaikyEntries] = useState<PaikyEntry[]>([])
  const [consolidationEntries, setConsolidationEntries] = useState<ConsolidationEntry[]>([])
  const { state, dispatch } = useLRMS()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<SlabFormData>({
    resolver: zodResolver(slabSchema),
    defaultValues: {
      paiky: false,
      consolidation: false,
      paikyCount: 0,
      consolidationCount: 0,
    },
  })

  const watchedValues = watch()
  const land = state.lands.find((l) => l.id === landId)
  const existingSlabs = state.slabs.filter((s) => s.landId === landId)

  const validateYearRange = (startYear: number, endYear: number) => {
    return !existingSlabs.some(
      (slab) =>
        (startYear >= slab.startYear && startYear <= slab.endYear) ||
        (endYear >= slab.startYear && endYear <= slab.endYear) ||
        (startYear <= slab.startYear && endYear >= slab.endYear),
    )
  }

  const addPaikyEntry = () => {
    const newEntry: PaikyEntry = {
      id: Date.now().toString(),
      surveyNumber: "",
      area: 0,
      areaUnit: "acre",
    }
    setPaikyEntries([...paikyEntries, newEntry])
  }

  const removePaikyEntry = (id: string) => {
    setPaikyEntries(paikyEntries.filter((entry) => entry.id !== id))
  }

  const updatePaikyEntry = (id: string, updates: Partial<PaikyEntry>) => {
    setPaikyEntries(paikyEntries.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)))
  }

  const addConsolidationEntry = () => {
    const newEntry: ConsolidationEntry = {
      id: Date.now().toString(),
      surveyNumber: "",
      area: 0,
      areaUnit: "acre",
    }
    setConsolidationEntries([...consolidationEntries, newEntry])
  }

  const removeConsolidationEntry = (id: string) => {
    setConsolidationEntries(consolidationEntries.filter((entry) => entry.id !== id))
  }

  const updateConsolidationEntry = (id: string, updates: Partial<ConsolidationEntry>) => {
    setConsolidationEntries(consolidationEntries.map((entry) => (entry.id === id ? { ...entry, ...updates } : entry)))
  }

  const onSubmit = (data: SlabFormData) => {
    if (!validateYearRange(data.startYear, data.endYear)) {
      toast({
        title: "Year Range Conflict",
        description: "The specified year range overlaps with an existing slab.",
        variant: "destructive",
      })
      return
    }

    const newSlab: Slab = {
      id: Date.now().toString(),
      landId,
      startYear: data.startYear,
      endYear: data.endYear,
      document: selectedFile || undefined,
      paiky: data.paiky,
      consolidation: data.consolidation,
      paikyEntries: data.paiky ? paikyEntries : undefined,
      consolidationEntries: data.consolidation ? consolidationEntries : undefined,
    }

    dispatch({ type: "ADD_SLAB", payload: newSlab })

    toast({
      title: "Slab Added Successfully",
      description: `Slab for years ${data.startYear}-${data.endYear} has been created.`,
    })

    reset()
    setSelectedFile(null)
    setPaikyEntries([])
    setConsolidationEntries([])
    onClose()
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  // Generate paiky entries based on count
  const handlePaikyCountChange = (count: number) => {
    setValue("paikyCount", count)
    const currentCount = paikyEntries.length

    if (count > currentCount) {
      const newEntries = Array.from({ length: count - currentCount }, (_, i) => ({
        id: (Date.now() + i).toString(),
        surveyNumber: "",
        area: 0,
        areaUnit: "acre" as const,
      }))
      setPaikyEntries([...paikyEntries, ...newEntries])
    } else if (count < currentCount) {
      setPaikyEntries(paikyEntries.slice(0, count))
    }
  }

  // Generate consolidation entries based on count
  const handleConsolidationCountChange = (count: number) => {
    setValue("consolidationCount", count)
    const currentCount = consolidationEntries.length

    if (count > currentCount) {
      const newEntries = Array.from({ length: count - currentCount }, (_, i) => ({
        id: (Date.now() + i).toString(),
        surveyNumber: "",
        area: 0,
        areaUnit: "acre" as const,
      }))
      setConsolidationEntries([...consolidationEntries, ...newEntries])
    } else if (count < currentCount) {
      setConsolidationEntries(consolidationEntries.slice(0, count))
    }
  }

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Slab</DialogTitle>
        <DialogDescription>Create a new yearly slab for Survey {land?.surveyNumber}</DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Slab Information */}
        <Card>
          <CardHeader>
            <CardTitle>Slab Details</CardTitle>
            <CardDescription>Enter the year range and basic information for this slab</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startYear">Start Year *</Label>
                <Input
                  id="startYear"
                  type="number"
                  min="1900"
                  max="2100"
                  {...register("startYear", { valueAsNumber: true })}
                />
                {errors.startYear && <p className="text-sm text-red-500">{errors.startYear.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="endYear">End Year *</Label>
                <Input
                  id="endYear"
                  type="number"
                  min="1900"
                  max="2100"
                  {...register("endYear", { valueAsNumber: true })}
                />
                {errors.endYear && <p className="text-sm text-red-500">{errors.endYear.message}</p>}
              </div>
            </div>

            {/* Existing Slabs Warning */}
            {existingSlabs.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg">
                <h4 className="font-medium text-amber-900 mb-2">Existing Slabs</h4>
                <div className="text-sm text-amber-800 space-y-1">
                  {existingSlabs.map((slab) => (
                    <p key={slab.id}>
                      {slab.startYear} - {slab.endYear}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Upload */}
        <Card>
          <CardHeader>
            <CardTitle>7/12 Document</CardTitle>
            <CardDescription>Upload the 7/12 document for this slab</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
              <div className="text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <Label htmlFor="document" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">Upload 7/12 Document</span>
                    <span className="mt-1 block text-sm text-gray-500">PDF, JPG, PNG up to 10MB</span>
                  </Label>
                  <Input
                    id="document"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>

            {selectedFile && (
              <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg mt-4">
                <FileText className="h-5 w-5 text-green-600" />
                <span className="text-sm text-green-800">{selectedFile.name}</span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setSelectedFile(null)}
                  className="text-red-600 hover:text-red-800"
                >
                  Remove
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Paiky and Consolidation Options */}
        <Card>
          <CardHeader>
            <CardTitle>Additional Options</CardTitle>
            <CardDescription>Enable Paiky and Consolidation options if applicable</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="paiky"
                checked={watchedValues.paiky}
                onCheckedChange={(checked) => setValue("paiky", !!checked)}
              />
              <Label htmlFor="paiky">Enable Paiky</Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox
                id="consolidation"
                checked={watchedValues.consolidation}
                onCheckedChange={(checked) => setValue("consolidation", !!checked)}
              />
              <Label htmlFor="consolidation">Enable Consolidation</Label>
            </div>
          </CardContent>
        </Card>

        {/* Paiky Entries */}
        {watchedValues.paiky && (
          <Card>
            <CardHeader>
              <CardTitle>Paiky Entries</CardTitle>
              <CardDescription>Add survey numbers and areas for Paiky entries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Number of Paiky Entries</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={watchedValues.paikyCount || 0}
                    onChange={(e) => handlePaikyCountChange(Number.parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                </div>
              </div>

              {paikyEntries.map((entry, index) => (
                <div key={entry.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Paiky Entry {index + 1}</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removePaikyEntry(entry.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Survey Number</Label>
                      <Input
                        value={entry.surveyNumber}
                        onChange={(e) => updatePaikyEntry(entry.id, { surveyNumber: e.target.value })}
                        placeholder="e.g., 123/A"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Area</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={entry.area}
                        onChange={(e) => updatePaikyEntry(entry.id, { area: Number.parseFloat(e.target.value) || 0 })}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select
                        value={entry.areaUnit}
                        onValueChange={(value: "acre" | "sqm") => updatePaikyEntry(entry.id, { areaUnit: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="acre">Acre</SelectItem>
                          <SelectItem value="sqm">Sq.m</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Consolidation Entries */}
        {watchedValues.consolidation && (
          <Card>
            <CardHeader>
              <CardTitle>Consolidation Entries</CardTitle>
              <CardDescription>Add survey numbers and areas for Consolidation entries</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="space-y-2">
                  <Label>Number of Consolidation Entries</Label>
                  <Input
                    type="number"
                    min="0"
                    max="10"
                    value={watchedValues.consolidationCount || 0}
                    onChange={(e) => handleConsolidationCountChange(Number.parseInt(e.target.value) || 0)}
                    className="w-32"
                  />
                </div>
              </div>

              {consolidationEntries.map((entry, index) => (
                <div key={entry.id} className="p-4 border rounded-lg space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium">Consolidation Entry {index + 1}</h4>
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeConsolidationEntry(entry.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Survey Number</Label>
                      <Input
                        value={entry.surveyNumber}
                        onChange={(e) => updateConsolidationEntry(entry.id, { surveyNumber: e.target.value })}
                        placeholder="e.g., 456/B"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Area</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={entry.area}
                        onChange={(e) =>
                          updateConsolidationEntry(entry.id, { area: Number.parseFloat(e.target.value) || 0 })
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Unit</Label>
                      <Select
                        value={entry.areaUnit}
                        onValueChange={(value: "acre" | "sqm") =>
                          updateConsolidationEntry(entry.id, { areaUnit: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="acre">Acre</SelectItem>
                          <SelectItem value="sqm">Sq.m</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit Button */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">Create Slab</Button>
        </div>
      </form>
    </DialogContent>
  )
}

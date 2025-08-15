"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Plus, Upload, Save, Loader2 } from "lucide-react"
import { useLandRecord } from "@/contexts/land-record-context"
import { supabase, uploadFile } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { LandRecordService } from "@/lib/supabase"
import type { Nondh } from "@/contexts/land-record-context"

const initialNondhData: Nondh = {
  id: "",
  number: "",
  sNoType: "s_no",
  affectedSNos: [],
  nondhDoc: "",
  nondhDocFileName: ""
}

function isEqual(obj1: any, obj2: any) {
  return JSON.stringify(obj1) === JSON.stringify(obj2)
}

export default function NondhAdd() {
  const { recordId, yearSlabs, landBasicInfo, setHasUnsavedChanges, currentStep, setCurrentStep } = useLandRecord()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())
  const [nondhs, setNondhs] = useState<Nondh[]>([{ ...initialNondhData, id: "1" }])
  const [originalNondhs, setOriginalNondhs] = useState<Nondh[]>([])
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // Get all unique S.Nos from slabs with their types
  const getAllSNos = useCallback(() => {
    const sNosMap = new Map<string, string>(); // Map<number, type>
    
    yearSlabs.forEach((slab) => {
      if (slab.sNo.trim() !== "") {
        sNosMap.set(slab.sNo, slab.sNoType || 'S.No.');
      }
      slab.paikyEntries.forEach((entry) => {
        if (entry.sNo.trim() !== "") {
          sNosMap.set(entry.sNo, entry.sNoType || 'S.No.');
        }
      })
      slab.ekatrikaranEntries.forEach((entry) => {
        if (entry.sNo.trim() !== "") {
          sNosMap.set(entry.sNo, entry.sNoType || 'S.No.');
        }
      })
    })

    // Convert to array of unique entries
    return Array.from(sNosMap.entries()).map(([number, type]) => ({
      type,
      number
    }));
  }, [yearSlabs])

  // Fetch existing nondh data
  useEffect(() => {
    const fetchNondhs = async () => {
      if (!recordId) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await LandRecordService.getNondhs(recordId);
        
        if (error) throw error;
        
        if (data && data.length > 0) {
          // LandRecordService.getNondhs already returns mapped data in the correct format
          console.log('[NondhAdd Edit] Received data from service:', data);
          
          setNondhs(data);
          setOriginalNondhs(data);
        } else {
          // Keep the initial empty nondh if no data found
          setOriginalNondhs([]);
        }
        
        setIsDataLoaded(true);
      } catch (error) {
        console.error('Error fetching nondhs:', error);
        toast({ 
          title: "Error loading nondh data", 
          variant: "destructive" 
        });
        setIsDataLoaded(true);
      } finally {
        setLoading(false);
      }
    };

    fetchNondhs();
  }, [recordId, toast]);
  // Add this useEffect hook to your component
useEffect(() => {
  console.log('Current nondhs state:', JSON.stringify(nondhs, null, 2));
  
  // Log the affectedSNos structure for each nondh
  nondhs.forEach((nondh, index) => {
    console.log(`Nondh ${index + 1} affectedSNos:`, {
      rawValue: nondh.affectedSNos,
      type: Array.isArray(nondh.affectedSNos) ? 'array' : typeof nondh.affectedSNos,
      contents: Array.isArray(nondh.affectedSNos) 
        ? nondh.affectedSNos.map(item => ({
            value: item,
            type: typeof item,
            isObject: typeof item === 'object',
            number: typeof item === 'object' ? item.number : null
          }))
        : null
    });
  });
}, [nondhs]); // This will run whenever nondhs state changes

  // Check if form has changes
  const hasChanges = !isEqual(nondhs, originalNondhs)

  // Update unsaved changes status
  useEffect(() => {
    if (isDataLoaded) {
      setHasUnsavedChanges(currentStep, hasChanges)
    }
  }, [hasChanges, currentStep, setHasUnsavedChanges, isDataLoaded])

  // Prevent navigation with unsaved changes
  useEffect(() => {
    if (!hasChanges) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasChanges])

  // Update a specific nondh
  const updateNondh = (id: string, updates: Partial<Nondh>) => {
    setNondhs(prev => prev.map(nondh => 
      nondh.id === id ? { ...nondh, ...updates } : nondh
    ))
  }

  // Add a new nondh
  const addNondh = () => {
    setNondhs(prev => [
      ...prev,
      {
        ...initialNondhData,
        id: Date.now().toString()
      }
    ])
  }

  // Remove a nondh
  const removeNondh = (id: string) => {
    if (nondhs.length > 1) {
      setNondhs(prev => prev.filter(nondh => nondh.id !== id))
    }
  }

  // Handle S.No selection
  const handleSNoSelection = (nondhId: string, sNo: string, checked: boolean) => {
    const nondh = nondhs.find(n => n.id === nondhId)
    if (nondh) {
      let updatedSNos = [...nondh.affectedSNos]
      if (checked) {
        if (!updatedSNos.includes(sNo)) {
          updatedSNos.push(sNo)
        }
      } else {
        updatedSNos = updatedSNos.filter(s => s !== sNo)
      }
      updateNondh(nondhId, { affectedSNos: updatedSNos })
    }
  }

  // Handle file upload
  const handleFileUpload = async (file: File, nondhId: string) => {
    if (!file) return

    try {
      setUploadingFiles(prev => new Set(prev).add(nondhId))
      
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
      
      const path = `nondh-documents/${Date.now()}_${sanitizedFileName}`
      const url = await uploadFile(file, "land-documents", path)
      
      if (!url) throw new Error("Failed to upload file")

      updateNondh(nondhId, { 
        nondhDoc: url,
        nondhDocFileName: file.name
      })
      toast({ title: "File uploaded successfully" })
    } catch (error) {
      console.error('File upload error:', error)
      toast({ 
        title: "Error uploading file", 
        description: error instanceof Error ? error.message : "Upload failed",
        variant: "destructive" 
      })
    } finally {
      setUploadingFiles(prev => {
        const newSet = new Set(prev)
        newSet.delete(nondhId)
        return newSet
      })
    }
  }

  // Remove file
  const handleRemoveFile = (nondhId: string) => {
    updateNondh(nondhId, { 
      nondhDoc: "",
      nondhDocFileName: ""
    })
  }

  // Validate nondh number format
  const validateNondhNumber = (number: string) => {
    const regex = /^(\d+([-/]\d+)*|\d+)$/
    return regex.test(number)
  }

  // Save changes
  const handleSave = async () => {
    // Filter out empty nondhs and validate
    const validNondhs = nondhs.filter(nondh => 
      nondh.number.trim() !== "" && 
      nondh.affectedSNos.length > 0
    )

    // Validate all nondh numbers
    const hasInvalidNumbers = validNondhs.some(nondh => 
      !validateNondhNumber(nondh.number)
    )
    if (hasInvalidNumbers) {
      toast({
        title: "Invalid Nondh Numbers",
        description: "Nondh numbers must be in format like 1234, 10-35 or 30/45",
        variant: "destructive"
      })
      return
    }

    if (!recordId) {
      toast({
        title: "Error",
        description: "Land record not found",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Prepare data for upsert
      const nondhsToSave = validNondhs.map(nondh => ({
        id: nondh.id.length > 1 ? nondh.id : undefined, // Only include ID if it's not a temporary one
        land_record_id: recordId,
        number: nondh.number,
        s_no_type: nondh.sNoType,
        affected_s_nos: nondh.affectedSNos,
        nondh_doc_url: nondh.nondhDoc || null,
        nondh_doc_filename: nondh.nondhDocFileName || null
      }))

      // Use upsert to handle both inserts and updates
      const { error } = await LandRecordService.upsertNondhs(nondhsToSave)
      
      if (error) throw error

      // Get IDs of nondhs to delete (present in original but not in current)
      const nondhsToDelete = originalNondhs
        .filter(original => !validNondhs.some(current => current.id === original.id))
        .map(nondh => nondh.id)

      // Delete removed nondhs
      if (nondhsToDelete.length > 0) {
        const { error: deleteError } = await LandRecordService.deleteNondhs(nondhsToDelete)
        if (deleteError) throw deleteError
      }

      // Update original data
      setOriginalNondhs(validNondhs)
      toast({ title: "Nondh data saved successfully" })
      setCurrentStep(5);
    } catch (error) {
      console.error('Error saving nondhs:', error)
      toast({ 
        title: "Error saving nondh data", 
        description: error instanceof Error ? error.message : "Save failed",
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  if (loading && !isDataLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nondh Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading nondh data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Nondh Information</CardTitle>
          
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {nondhs.map((nondh, index) => (
          <div key={nondh.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Nondh {index + 1}</h3>
              {nondhs.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => removeNondh(nondh.id)}
                  className="text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Nondh Number */}
            <div className="space-y-2">
              <Label>Nondh Number * (e.g. 1234, 10-35 or 30/45)</Label>
              <Input
                value={nondh.number}
                onChange={(e) => updateNondh(nondh.id, { number: e.target.value })}
                placeholder="Enter nondh number"
              />
              {nondh.number && !validateNondhNumber(nondh.number) && (
                <p className="text-sm text-red-500">
                  Invalid format. Use numbers only (1234) or separated by / or - (e.g. 10-35 or 30/45)
                </p>
              )}
            </div>

            {/* Affected S.Nos */}
            <div className="space-y-2">
              <Label>Affected Survey Numbers *</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded p-3">
                {getAllSNos().map(({ type, number }) => (
                  <div key={number} className="flex items-center space-x-2">
                    <Checkbox
                      id={`${nondh.id}_${number}`}
                      checked={nondh.affectedSNos.includes(number)}
                      onCheckedChange={(checked) => 
                        handleSNoSelection(nondh.id, number, checked as boolean)
                      }
                    />
                    <Label htmlFor={`${nondh.id}_${number}`} className="text-sm">
                      {type} {number}
                    </Label>
                  </div>
                ))}
              </div>
              {nondh.affectedSNos.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Selected: {nondh.affectedSNos.map(sNo => {
                    const sNoInfo = getAllSNos().find(item => item.number === sNo);
                    return `${sNoInfo?.type || 'S.No.'} ${sNo}`;
                  }).join(", ")}
                </p>
              )}
            </div>

            {/* Document Upload */}
            <div className="space-y-2">
              <Label>Nondh Document</Label>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => {
                      const file = e.target.files?.[0]
                      if (file) {
                        handleFileUpload(file, nondh.id)
                        e.target.value = ''
                      }
                    }}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={uploadingFiles.has(nondh.id)}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    disabled={uploadingFiles.has(nondh.id)}
                    className="flex items-center gap-2"
                  >
                    {uploadingFiles.has(nondh.id) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Choose File
                      </>
                    )}
                  </Button>
                </div>
                {nondh.nondhDocFileName && (
                  <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                    <span 
                      className="text-sm text-green-800 max-w-[200px] truncate" 
                      title={nondh.nondhDocFileName}
                    >
                      {nondh.nondhDocFileName}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleRemoveFile(nondh.id)}
                      className="text-green-600 hover:text-green-800 text-lg leading-none"
                      title="Remove file"
                    >
                      ×
                    </button>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500">
                Supported formats: PDF, JPG, JPEG, PNG (Max 10MB)
              </p>
            </div>
          </div>
        ))}

        {/* Add Nondh Button */}
      <div className="flex flex-col items-center gap-4">
  <Button 
    onClick={addNondh} 
    variant="outline" 
    className="flex items-center gap-2"
  >
    <Plus className="w-4 h-4" />
    Add Another Nondh
  </Button>

  {hasChanges && (
    <Button 
      onClick={handleSave} 
      disabled={loading} 
      size="sm" 
      className="flex items-center gap-2"
    >
      {loading ? "Saving..." : "Save & Continue"}
    </Button>
  )}
</div>


      </CardContent>
    </Card>
  )
}
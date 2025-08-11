"use client"
import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Trash2, Plus, ArrowRight, ArrowLeft, Upload, Loader2 } from "lucide-react"
import { useLandRecord, type Nondh } from "@/contexts/land-record-context"
import { supabase, uploadFile } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useStepFormData } from "@/hooks/use-step-form-data"

type SNoTypeUI = "block_no" | "re_survey_no" | "survey_no";

export default function NondhAdd() {
  const { yearSlabs, setCurrentStep, currentStep, landBasicInfo} = useLandRecord()
  const { toast } = useToast()
  const { getStepData, updateStepData, markAsSaved } = useStepFormData(4) // Step 4 for NondhAdd
  const [loading, setLoading] = useState(false)
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set())
  const [nondhData, setNondhData] = useState<Nondh[]>([
    {
      id: "1",
      number: "",
      sNoType: "s_no",
      affectedSNos: [],
      nondhDoc: "",
      nondhDocFileName: "",
    },
  ])

  // Initialize with saved data if available
  useEffect(() => {
    const stepData = getStepData()
    if (stepData.nondhs && stepData.nondhs.length > 0) {
      setNondhData(stepData.nondhs)
    }
  }, [getStepData])

  // Update form data whenever nondhData changes (with debouncing to prevent excessive updates)
  useEffect(() => {
  if (nondhData.length > 0) {
    // Only update if there's actual content that's different from initial state
    const hasContent = nondhData.some(nondh => 
      nondh.number.trim() !== "" || 
      nondh.affectedSNos.length > 0 || 
      nondh.nondhDoc !== ""
    );
    
    // Also check if the data is actually different from what's already saved
    const currentStepData = getStepData();
    const isDifferent = JSON.stringify(currentStepData.nondhs) !== JSON.stringify(nondhData);
    
    if ((hasContent || nondhData.length > 1) && isDifferent) {
      const timeoutId = setTimeout(() => {
        updateStepData({ nondhs: nondhData });
      }, 300);
      
      return () => clearTimeout(timeoutId);
    }
  }
}, [nondhData, updateStepData, getStepData]);

  // Get unique S.Nos from all slabs
  const getAllSNos = () => {
  const sNos = new Map<string, { type: "s_no" | "block_no" | "re_survey_no" }>();
  
  yearSlabs.forEach((slab) => {
    if (slab.sNo.trim() !== "") {
      sNos.set(slab.sNo, { type: slab.sNoType });
    }
    
    slab.paikyEntries.forEach((entry) => {
      if (entry.sNo.trim() !== "") {
        sNos.set(entry.sNo, { type: entry.sNoType });
      }
    });
    
    slab.ekatrikaranEntries.forEach((entry) => {
      if (entry.sNo.trim() !== "") {
        sNos.set(entry.sNo, { type: entry.sNoType });
      }
    });
  });
  
  return sNos;
}
  const availableSNos = getAllSNos()

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
        nondhDocFileName: "",
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
        nondhDocFileName: "",
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
        nondhDocFileName: "",
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
    if (!file) return;

    try {
      setUploadingFiles(prev => new Set(prev).add(nondhId))
      
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '');
      
      const path = `nondh-documents/${Date.now()}_${sanitizedFileName}`
      const url = await uploadFile(file, "land-documents", path)
      
      if (!url) throw new Error("Failed to upload file");

      updateNondh(nondhId, { 
        nondhDoc: url,
        nondhDocFileName: file.name
      })
      toast({ title: "File uploaded successfully" })
    } catch (error) {
      console.error('File upload error:', error);
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

  const handleRemoveFile = (nondhId: string) => {
    updateNondh(nondhId, { 
      nondhDoc: "",
      nondhDocFileName: ""
    });
  }

  const getDisplayFileName = (nondh: Nondh) => {
    if (nondh.nondhDocFileName) {
      return nondh.nondhDocFileName;
    } else if (nondh.nondhDoc) {
      const urlParts = nondh.nondhDoc.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const cleanFileName = fileName.includes('_') ? fileName.split('_').slice(1).join('_') : fileName;
      return cleanFileName || "Document uploaded";
    }
    return "";
  }

  const validateNondhNumber = (number: string) => {
  // Allows:
  // - Plain digits (1234)
  // - Hyphen-separated (10-35 or 10-35-40)
  // - Slash-separated (30/45 or 30/45/60)
  const regex = /^(\d+([-/]\d+)*|\d+)$/
  return regex.test(number)
}

  function getAutoPopulatedSNoData(selectedType: SNoTypeUI): string[] {
    const stepData = getStepData();
    if (!landBasicInfo) return [];
    
    switch(selectedType) {
      case "block_no":
        return landBasicInfo.blockNo ? [landBasicInfo.blockNo] : [];
      case "re_survey_no":
        return landBasicInfo.reSurveyNo ? [landBasicInfo.reSurveyNo] : [];
      case "survey_no":
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
    const stepData = getStepData();
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
        nondh_doc_filename: nondh.nondhDocFileName || null,
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

      // Update local state with only valid nondhs
      setNondhData(validNondhs)
      updateStepData({ nondhs: validNondhs })
      
      // Mark this step as saved
      markAsSaved()
      
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
  <Label>Nondh Number * (e.g. 1234, 10-35 or 30/45)</Label>
  <Input
    value={nondh.number}
    onChange={(e) => updateNondh(nondh.id, { number: e.target.value })}
    placeholder="Enter nondh number (e.g. 1234, 10-35 or 30/45)"
  />
  {nondh.number && !validateNondhNumber(nondh.number) && (
    <p className="text-sm text-red-500">
      Invalid format. Use numbers only (1234) or separated by / or - (e.g. 10-35 or 30/45)
    </p>
  )}
</div>

              {/* Affected S.Nos */}
             
<div className="space-y-4">
  <div className="flex items-center justify-between">
    <Label>Affected Survey Nos * (Select all that apply)</Label>
  </div>

  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded p-3">
  {Array.from(availableSNos.entries()).map(([sNo, { type }]) => {
    const sNoType = type === "s_no" ? "Survey" : 
                   type === "block_no" ? "Block" : 
                   "Re-survey";
    
    return (
      <div key={sNo} className="flex items-center space-x-2">
        <Checkbox
          id={`${nondh.id}_${sNo}`}
          checked={nondh.affectedSNos.includes(sNo)}
          onCheckedChange={(checked) => handleSNoSelection(nondh.id, sNo, checked as boolean)}
        />
        <Label htmlFor={`${nondh.id}_${sNo}`} className="text-sm">
          {sNo} ({sNoType})
        </Label>
      </div>
    );
  })}
</div>
  {nondh.affectedSNos.length > 0 && (
  <p className="text-sm text-muted-foreground">
    Selected: {nondh.affectedSNos.map(sNo => {
      const type = availableSNos.get(sNo)?.type || "s_no";
      const typeDisplay = type === "s_no" ? "Survey" : 
                        type === "block_no" ? "Block" : 
                        "Re-survey";
      return `${sNo} (${typeDisplay})`;
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
                      className="flex items-center gap-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:opacity-50"
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
                  {getDisplayFileName(nondh) && (
                    <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                      <span className="text-sm text-green-800 max-w-[200px] truncate" title={getDisplayFileName(nondh)}>
                        {getDisplayFileName(nondh)}
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
                Save & Continue
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
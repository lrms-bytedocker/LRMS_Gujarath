"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload, Save } from "lucide-react"
import { useLandRecord } from "@/contexts/land-record-context"
import { supabase, uploadFile } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { LandRecordService } from "@/lib/supabase"
import { promulgationData, getDistricts, getTalukas, getVillages, isPromulgation } from "@/lib/mock-data"
import { useStepFormData } from "@/hooks/use-step-form-data"
import type { LandBasicInfo } from "@/contexts/land-record-context"

const initialFormData: LandBasicInfo = {
  district: "",
  taluka: "",
  village: "",
  area: { value: 0, unit: "sq_m" },
  sNoType: "s_no",
  sNo: "",
  isPromulgation: false,
  blockNo: "",
  reSurveyNo: "",
  integrated712: "",
  integrated712FileName: ""
}

function isEqual(obj1: any, obj2: any) {
  return JSON.stringify(obj1) === JSON.stringify(obj2);
}

export default function LandBasicInfoComponent() {
  const { 
    recordId,
    setHasUnsavedChanges, 
    currentStep, 
    hasUnsavedChanges 
  } = useLandRecord()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string>("")
  const [formData, setFormData] = useState<LandBasicInfo>(initialFormData)
  const [originalData, setOriginalData] = useState<LandBasicInfo>(initialFormData)
  const [isDataLoaded, setIsDataLoaded] = useState(false)

  // Check if form has changes
  const hasChanges = !isEqual(formData, originalData)

  // Fetch existing land record data
  useEffect(() => {
    const fetchLandRecord = async () => {
      if (!recordId) {
        setIsDataLoaded(true)
        return
      }

      try {
        setLoading(true)
        const { data, error } = await LandRecordService.getLandRecord(recordId)
        
        if (error) throw error
        
        if (data) {
          const mappedData: LandBasicInfo = {
            id: data.id,
            district: data.district || "",
            taluka: data.taluka || "",
            village: data.village || "",
            area: { 
              value: data.area_value || 0, 
              unit: data.area_unit || "sq_m" 
            },
            sNoType: data.s_no_type || "s_no",
            sNo: data.s_no || "",
            isPromulgation: data.is_promulgation || false,
            blockNo: data.block_no || "",
            reSurveyNo: data.re_survey_no || "",
            integrated712: data.integrated_712 || "",
            integrated712FileName: data.integrated_712_filename || ""
          }
          
          setFormData(mappedData)
          setOriginalData(mappedData)
          
          if (mappedData.integrated712FileName) {
            setUploadedFileName(mappedData.integrated712FileName)
          }
        }
      } catch (error) {
        console.error('Error fetching land record:', error)
        toast({ 
          title: "Error loading land record", 
          variant: "destructive" 
        })
      } finally {
        setLoading(false)
        setIsDataLoaded(true)
      }
    }

    fetchLandRecord()
  }, [recordId, toast])

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

  // Helper function to update form data
  const updateFormField = useCallback((updates: Partial<LandBasicInfo>) => {
    setFormData(prev => ({
      ...prev,
      ...updates
    }))
  }, [])

  // Handlers for cascading selects
  const handleDistrictChange = (value: string) => {
    updateFormField({
      district: value,
      taluka: "",
      village: "",
      isPromulgation: false
    })
  }

  const handleTalukaChange = (value: string) => {
    updateFormField({
      taluka: value,
      village: "",
      isPromulgation: false
    })
  }

  const handleVillageChange = (value: string) => {
    const isProm = isPromulgation(formData.district, formData.taluka, value)
    updateFormField({
      village: value,
      isPromulgation: isProm
    })
  }

  // File upload
  const handleFileUpload = async (file: File) => {
    if (!file) return
    
    try {
      setLoading(true)
      
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_')
        .replace(/_{2,}/g, '_')
        .replace(/^_|_$/g, '')
      
      const path = `${Date.now()}_${sanitizedFileName}`
      const url = await uploadFile(file, "land-documents", path)
      
      if (!url) throw new Error("Failed to upload file")

      updateFormField({ 
        integrated712: url,
        integrated712FileName: file.name
      })
      
      setUploadedFileName(file.name)
      toast({ title: "File uploaded successfully" })
      
    } catch (error) {
      console.error('File upload error:', error)
      toast({ 
        title: "Error uploading file", 
        description: "Please try again or contact support",
        variant: "destructive" 
      })
    } finally {
      setLoading(false)
    }
  }

  // Remove uploaded file
  const handleRemoveFile = () => {
    updateFormField({ 
      integrated712: "",
      integrated712FileName: ""
    })
    setUploadedFileName("")
  }

  // Save changes
const handleSave = async () => {
  // Validate all required fields
  if (!formData.district || !formData.taluka || !formData.village || !formData.blockNo) {
    toast({ title: "Please fill all required fields", variant: "destructive" })
    return
  }
  if (formData.isPromulgation && !formData.reSurveyNo) {
    toast({ title: "Re Survey No is required for Promulgation", variant: "destructive" })
    return
  }

  setLoading(true)
  try {
    // Map form data to database schema for UPDATE
    const updateData = {
      district: formData.district,
      taluka: formData.taluka,
      village: formData.village,
      area_value: formData.area.value || 0,
      area_unit: formData.area.unit || 'sq_m',
      s_no_type: formData.sNoType || 's_no',
      s_no: formData.sNo || formData.blockNo,
      is_promulgation: formData.isPromulgation || false,
      block_no: formData.blockNo,
      re_survey_no: formData.reSurveyNo || null,
      integrated_712: formData.integrated712 || null,
      integrated_712_filename: formData.integrated712FileName || null,
      updated_at: new Date().toISOString() // Add timestamp
    }

    // Use UPDATE instead of INSERT - pass the ID
    const { data: result, error } = await LandRecordService.updateLandRecord(formData.id!, updateData)
    
    if (error) throw error

    // Update the original data to match current form data
    const updatedData = { ...formData }
    setOriginalData(updatedData)

    toast({ title: "Land basic info updated successfully" })
    
  } catch (error) {
    console.error('Error updating land record:', error)
    toast({ title: "Error updating data", variant: "destructive" })
  } finally {
    setLoading(false)
  }
}

  if (loading && !isDataLoaded) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Step 1: Land Basic Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading land record...</p>
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
          <CardTitle>Step 1: Land Basic Information</CardTitle>
          {hasChanges && (
            <Button onClick={handleSave} disabled={loading} size="sm" className="flex items-center gap-2">
              <Save className="w-4 h-4" />
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>District *</Label>
            <Select value={formData.district} onValueChange={handleDistrictChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent>
                {getDistricts().map((dist) => (
                  <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Taluka *</Label>
            <Select value={formData.taluka} onValueChange={handleTalukaChange} disabled={!formData.district}>
              <SelectTrigger>
                <SelectValue placeholder="Select Taluka" />
              </SelectTrigger>
              <SelectContent>
                {getTalukas(formData.district).map((tal) => (
                  <SelectItem key={tal} value={tal}>{tal}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Village *</Label>
            <Select value={formData.village} onValueChange={handleVillageChange} disabled={!formData.taluka}>
              <SelectTrigger>
                <SelectValue placeholder="Select Village" />
              </SelectTrigger>
              <SelectContent>
                {getVillages(formData.district, formData.taluka).map((vill) => (
                  <SelectItem key={vill} value={vill}>{vill}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Promulgation Display */}
        {formData.village && formData.isPromulgation !== null && (
          <div>
            <Label>Promulgation Status:</Label>{" "}
            <span className={formData.isPromulgation ? "text-green-600" : "text-red-600"}>
              {formData.isPromulgation ? "Yes" : "No"}
            </span>
          </div>
        )}

        {/* Block No - Always show */}
        <div className="space-y-2">
          <Label htmlFor="block-no">Block No *</Label>
          <Input
            id="block-no"
            value={formData.blockNo}
            onChange={(e) => updateFormField({ blockNo: e.target.value })}
            placeholder="Enter Block No"
          />
        </div>

        {/* Re Survey No - Only show if promulgation is Yes */}
        {formData.isPromulgation && (
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="space-y-2">
              <Label htmlFor="re-survey-no">Re Survey No *</Label>
              <Input
                id="re-survey-no"
                value={formData.reSurveyNo}
                onChange={(e) => updateFormField({ reSurveyNo: e.target.value })}
                placeholder="Enter Re Survey No"
              />
            </div>
          </div>
        )}

        {/* Document Upload */}
        <div className="space-y-2">
          <Label htmlFor="integrated-712">Integrated 7/12 Document</Label>
          <div className="flex items-center gap-4">
            <div className="relative">
              <input
                id="integrated-712"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) {
                    handleFileUpload(file)
                    e.target.value = ''
                  }
                }}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={loading}
              />
              <Button 
                type="button" 
                variant="outline" 
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" />
                {loading ? "Uploading..." : "Choose File"}
              </Button>
            </div>
            {uploadedFileName && (
              <div className="flex items-center gap-2 px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                <span className="text-sm text-green-800 max-w-[200px] truncate" title={uploadedFileName}>
                  {uploadedFileName}
                </span>
                <button
                  type="button"
                  onClick={handleRemoveFile}
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
      </CardContent>
    </Card>
  )
}
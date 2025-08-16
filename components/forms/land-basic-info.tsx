"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Upload } from "lucide-react"
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

interface ValidationErrors {
  district?: string
  taluka?: string
  village?: string
  blockNo?: string
  reSurveyNo?: string
  integrated712?: string
}

export default function LandBasicInfoComponent() {
  const { 
    landBasicInfo, 
    setLandBasicInfo, 
    setCurrentStep, 
    setHasUnsavedChanges, 
    currentStep, 
    hasUnsavedChanges 
  } = useLandRecord()
  const { toast } = useToast()

  const [loading, setLoading] = useState(false)
  const [uploadedFileName, setUploadedFileName] = useState<string>("")
  const [validationErrors, setValidationErrors] = useState<ValidationErrors>({})

  // Form data with proper initialization
  const { getStepData, updateStepData } = useStepFormData(currentStep)
  
  // Get form data from context or use initial values
  const contextData = getStepData()
  const formData = contextData.landBasicInfo 
    ? { ...initialFormData, ...contextData.landBasicInfo } 
    : initialFormData

  const district = formData.district
  const taluka = formData.taluka
  const village = formData.village

  useEffect(() => {
    if (!hasUnsavedChanges[currentStep]) return

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = 'You have unsaved changes. Are you sure you want to leave?'
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload)
    }
  }, [hasUnsavedChanges, currentStep])

  // Prefill from previous info (if any)
  useEffect(() => {
  if (landBasicInfo && !isEqual(landBasicInfo, formData)) {
    updateStepData({
      landBasicInfo: {
        ...initialFormData,
        ...landBasicInfo
      }
    });
    
    if (landBasicInfo.integrated712FileName) {
      setUploadedFileName(landBasicInfo.integrated712FileName);
    } else if (landBasicInfo.integrated712) {
      const urlParts = landBasicInfo.integrated712.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const cleanFileName = fileName.includes('_') ? fileName.split('_').slice(1).join('_') : fileName;
      setUploadedFileName(cleanFileName || "Document uploaded");
    }
  }
}, [landBasicInfo]); // Only depend on landBasicInfo

  // Helper function to update form data
  const updateFormField = useCallback((updates: Partial<LandBasicInfo>) => {
    updateStepData({
      landBasicInfo: {
        ...formData,
        ...updates
      }
    })
    
    // Clear validation errors for updated fields
    const updatedErrors = { ...validationErrors }
    Object.keys(updates).forEach(field => {
      if (updatedErrors[field as keyof ValidationErrors]) {
        delete updatedErrors[field as keyof ValidationErrors]
      }
    })
    setValidationErrors(updatedErrors)
  }, [formData, updateStepData, validationErrors])

  // Validation function
  const validateForm = (): boolean => {
    const errors: ValidationErrors = {}
    let isValid = true

    if (!formData.district) {
      errors.district = "Please select a district"
      isValid = false
    }

    if (!formData.taluka) {
      errors.taluka = "Please select a taluka"
      isValid = false
    }

    if (!formData.village) {
      errors.village = "Please select a village"
      isValid = false
    }

    if (!formData.blockNo) {
      errors.blockNo = "Please enter Block No"
      isValid = false
    }

    if (formData.isPromulgation && !formData.reSurveyNo) {
      errors.reSurveyNo = "Please enter Re Survey No (required for Promulgation)"
      isValid = false
    }

    if (!formData.integrated712) {
      errors.integrated712 = "Please upload Integrated 7/12 Document"
      isValid = false
    }

    setValidationErrors(errors)
    return isValid
  }

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

  // File upload with better error handling and filename sanitization
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

  // Submission
  const handleSubmit = async () => {
    // Validate all required fields
    if (!validateForm()) {
      return
    }

    setLoading(true)
    try {
      // Map form data to database schema - use default values for required fields
      const landRecordData = {
        district: formData.district,
        taluka: formData.taluka,
        village: formData.village,
        area_value: formData.area.value || 0, // Default value
        area_unit: formData.area.unit || 'sq_m', // Default unit
        s_no_type: formData.sNoType || 's_no', // Default type
        s_no: formData.sNo || formData.blockNo, // Use blockNo as fallback for s_no
        is_promulgation: formData.isPromulgation || false,
        block_no: formData.blockNo,
        re_survey_no: formData.reSurveyNo || null,
        integrated_712: formData.integrated712 || null,
        integrated_712_filename: formData.integrated712FileName || null,
        current_step: 1,
        status: 'draft'
      }

      // Add ID if updating existing record
      if (landBasicInfo?.id) {
        landRecordData.id = landBasicInfo.id
      }

      const { data: result, error } = await LandRecordService.saveLandRecord(landRecordData)
      
      if (error) throw error

      // Update context with the saved data
      const updatedInfo: LandBasicInfo = {
        id: result.id,
        district: formData.district, 
        taluka: formData.taluka, 
        village: formData.village, 
        area: formData.area, 
        sNoType: formData.sNoType, 
        sNo: formData.sNo,
        isPromulgation: formData.isPromulgation, 
        blockNo: formData.blockNo, 
        reSurveyNo: formData.reSurveyNo, 
        integrated712: formData.integrated712,
        integrated712FileName: formData.integrated712FileName
      }

      setLandBasicInfo(updatedInfo)
      
      // Update step data
      updateStepData({
        landBasicInfo: updatedInfo
      })

      setHasUnsavedChanges(currentStep, false)
      toast({ title: "Land basic info saved successfully" })
      setCurrentStep(2)
      
    } catch (error) {
      console.error('Error saving land record:', error)
      toast({ title: "Error saving data", variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 1: Land Basic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Location Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label>District *</Label>
            <Select value={district} onValueChange={handleDistrictChange}>
              <SelectTrigger className={validationErrors.district ? "border-red-500" : ""}>
                <SelectValue placeholder="Select District" />
              </SelectTrigger>
              <SelectContent>
                {getDistricts().map((dist) => (
                  <SelectItem key={dist} value={dist}>{dist}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.district && (
              <p className="text-sm text-red-600">{validationErrors.district}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Taluka *</Label>
            <Select value={taluka} onValueChange={handleTalukaChange} disabled={!district}>
              <SelectTrigger className={validationErrors.taluka ? "border-red-500" : ""}>
                <SelectValue placeholder="Select Taluka" />
              </SelectTrigger>
              <SelectContent>
                {getTalukas(district).map((tal) => (
                  <SelectItem key={tal} value={tal}>{tal}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.taluka && (
              <p className="text-sm text-red-600">{validationErrors.taluka}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label>Village *</Label>
            <Select value={village} onValueChange={handleVillageChange} disabled={!taluka}>
              <SelectTrigger className={validationErrors.village ? "border-red-500" : ""}>
                <SelectValue placeholder="Select Village" />
              </SelectTrigger>
              <SelectContent>
                {getVillages(district, taluka).map((vill) => (
                  <SelectItem key={vill} value={vill}>{vill}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {validationErrors.village && (
              <p className="text-sm text-red-600">{validationErrors.village}</p>
            )}
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
            className={validationErrors.blockNo ? "border-red-500" : ""}
          />
          {validationErrors.blockNo && (
            <p className="text-sm text-red-600">{validationErrors.blockNo}</p>
          )}
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
                className={validationErrors.reSurveyNo ? "border-red-500" : ""}
              />
              {validationErrors.reSurveyNo && (
                <p className="text-sm text-red-600">{validationErrors.reSurveyNo}</p>
              )}
            </div>
          </div>
        )}

        {/* Document Upload */}
        <div className="space-y-2">
          <Label htmlFor="integrated-712">Integrated 7/12 Document *</Label>
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
                className={`flex items-center gap-2 bg-blue-600 text-white border-blue-600 hover:bg-blue-700 disabled:opacity-50 ${
                  validationErrors.integrated712 ? 'border-red-500' : ''
                }`}
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
          {validationErrors.integrated712 && (
            <p className="text-sm text-red-600">{validationErrors.integrated712}</p>
          )}
          <p className="text-xs text-gray-500">
            Supported formats: PDF, JPG, JPEG, PNG (Max 10MB)
          </p>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2">
            {loading ? "Saving..." : "Save & Continue"}        
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
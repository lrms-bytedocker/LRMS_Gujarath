"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Checkbox } from "@/components/ui/checkbox"
import { Upload, ArrowRight } from "lucide-react"
import { useLandRecord } from "@/contexts/land-record-context"
import { supabase, uploadFile } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { LandRecordService } from "@/lib/supabase";
import { promulgationData, getDistricts, getTalukas, getVillages, isPromulgation } from "@/lib/mock-data";

export default function LandBasicInfoComponent() {
  const { landBasicInfo, setLandBasicInfo, setCurrentStep } = useLandRecord()
  const { toast } = useToast()

  // State for dropdowns & form
  const [district, setDistrict] = useState("")
  const [taluka, setTaluka] = useState("")
  const [village, setVillage] = useState("")
  const [promStatus, setPromStatus] = useState<boolean | null>(null)

  const [loading, setLoading] = useState(false)

  // Other form fields
  const [formData, setFormData] = useState({
    area: { value: 0, unit: "sq_m" },
    sNoType: "s_no",
    sNo: "",
    blockNo: "",
    reSurveyNo: "",
    integrated712: "",
    integrated712FileName: "", // Store original filename separately
  })

  // State for file upload
  const [uploadedFileName, setUploadedFileName] = useState<string>("")

  // Prefill from previous info (if any)
  useEffect(() => {
    if (landBasicInfo) {
      setDistrict(landBasicInfo.district || "")
      setTaluka(landBasicInfo.taluka || "")
      setVillage(landBasicInfo.village || "")
      setPromStatus(isPromulgation(landBasicInfo.district, landBasicInfo.taluka, landBasicInfo.village))
      setFormData({
        area: landBasicInfo.area || { value: 0, unit: "sq_m" },
        sNoType: landBasicInfo.sNoType || "s_no",
        sNo: landBasicInfo.sNo || "",
        blockNo: landBasicInfo.blockNo || "",
        reSurveyNo: landBasicInfo.reSurveyNo || "",
        integrated712: landBasicInfo.integrated712 || "",
        integrated712FileName: landBasicInfo.integrated712FileName || ""
      })
      
      // Set uploaded file name - prioritize stored filename over URL parsing
      if (landBasicInfo.integrated712FileName) {
        setUploadedFileName(landBasicInfo.integrated712FileName)
      } else if (landBasicInfo.integrated712) {
        // Fallback: Extract filename from URL
        const urlParts = landBasicInfo.integrated712.split('/')
        const fileName = urlParts[urlParts.length - 1]
        // Remove timestamp prefix if present (format: timestamp_filename)
        const cleanFileName = fileName.includes('_') ? fileName.split('_').slice(1).join('_') : fileName
        setUploadedFileName(cleanFileName || "Document uploaded")
      }
    }
  }, [landBasicInfo])

  // Handlers for cascading selects
  const handleDistrictChange = (value: string) => {
    setDistrict(value)
    setTaluka("")
    setVillage("")
    setPromStatus(null)
  }
  const handleTalukaChange = (value: string) => {
    setTaluka(value)
    setVillage("")
    setPromStatus(null)
  }
  const handleVillageChange = (value: string) => {
    setVillage(value)
    setPromStatus(isPromulgation(district, taluka, value))
  }

  // File upload with better error handling and filename sanitization
  const handleFileUpload = async (file: File) => {
    if (!file) return
    
    try {
      setLoading(true)
      
      // Sanitize filename for storage but keep original for display
      const sanitizedFileName = file.name
        .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace invalid chars with underscore
        .replace(/_{2,}/g, '_') // Replace multiple underscores with single
        .replace(/^_|_$/g, '') // Remove leading/trailing underscores
      
      const path = `${Date.now()}_${sanitizedFileName}`
      const url = await uploadFile(file, "land-documents", path)
      
      if (!url) {
        throw new Error("Failed to upload file")
      }
      
      setFormData((prev) => ({ 
        ...prev, 
        integrated712: url,
        integrated712FileName: file.name // Store original filename for display
      }))
      setUploadedFileName(file.name) // Display original filename
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
    setFormData((prev) => ({ 
      ...prev, 
      integrated712: "",
      integrated712FileName: ""
    }))
    setUploadedFileName("")
  }

  // Submission
  const handleSubmit = async () => {
    // Validate all required fields
    if (!district || !taluka || !village || !formData.blockNo) {
      toast({ title: "Please fill all required fields", variant: "destructive" })
      return
    }
    if (promStatus && !formData.reSurveyNo) {
      toast({ title: "Re Survey No is required for Promulgation", variant: "destructive" })
      return
    }
    
    setLoading(true)
    try {
      // Prepare data for saving
      const landRecordData: any = {
        district,
        taluka,
        village,
        area_value: formData.area.value,
        area_unit: formData.area.unit,
        s_no_type: formData.sNoType,
        s_no: formData.sNo,
        is_promulgation: promStatus || false,
        block_no: formData.blockNo,
        re_survey_no: formData.reSurveyNo || null,
        integrated_712: formData.integrated712 || null,
        integrated_712_filename: formData.integrated712FileName || null, // Store filename in DB
        current_step: 1,
        status: 'draft'
      }

      // Only include ID if we're updating an existing record
      if (landBasicInfo?.id) {
        landRecordData.id = landBasicInfo.id
      }

      const { data: result, error } = await LandRecordService.saveLandRecord(landRecordData)
      
      if (error) throw error

      // Update context with saved data
      setLandBasicInfo({
        id: result.id,
        district, 
        taluka, 
        village, 
        area: formData.area, 
        sNoType: formData.sNoType, 
        sNo: formData.sNo,
        isPromulgation: promStatus, 
        blockNo: formData.blockNo, 
        reSurveyNo: formData.reSurveyNo, 
        integrated712: formData.integrated712,
        integrated712FileName: formData.integrated712FileName // Store in context
      })
      
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
            <Select value={taluka} onValueChange={handleTalukaChange} disabled={!district}>
              <SelectTrigger>
                <SelectValue placeholder="Select Taluka" />
              </SelectTrigger>
              <SelectContent>
                {getTalukas(district).map((tal) => (
                  <SelectItem key={tal} value={tal}>{tal}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Village *</Label>
            <Select value={village} onValueChange={handleVillageChange} disabled={!taluka}>
              <SelectTrigger>
                <SelectValue placeholder="Select Village" />
              </SelectTrigger>
              <SelectContent>
                {getVillages(district, taluka).map((vill) => (
                  <SelectItem key={vill} value={vill}>{vill}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Promulgation Display */}
        {village && promStatus !== null && (
          <div>
            <Label>Promulgation Status:</Label>{" "}
            <span className={promStatus ? "text-green-600" : "text-red-600"}>
              {promStatus ? "Yes" : "No"}
            </span>
          </div>
        )}

        {/* Block No - Always show */}
        <div className="space-y-2">
          <Label htmlFor="block-no">Block No *</Label>
          <Input
            id="block-no"
            value={formData.blockNo}
            onChange={(e) => setFormData((prev) => ({ ...prev, blockNo: e.target.value }))}
            placeholder="Enter Block No"
          />
        </div>

        {/* Re Survey No - Only show if promulgation is Yes */}
        {promStatus && (
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="space-y-2">
              <Label htmlFor="re-survey-no">Re Survey No *</Label>
              <Input
                id="re-survey-no"
                value={formData.reSurveyNo}
                onChange={(e) => setFormData((prev) => ({ ...prev, reSurveyNo: e.target.value }))}
                placeholder="Enter Re Survey No"
              />
            </div>
          </div>
        )}

        {/* Document Upload with Better UX */}
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
                    // Clear the input so same file can be selected again
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

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2">
            {loading ? "Saving..." : "Save and Continue"}        
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
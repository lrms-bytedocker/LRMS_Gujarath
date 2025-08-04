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

// Import your promulgation data and utils
// import { promulgationData, getDistricts, getTalukas, getVillages, isPromulgation } from "@/lib/promulgationData"
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
  })

  // Prefill from previous info (if any)
  useEffect(() => {
    if (landBasicInfo) {
      setDistrict(landBasicInfo.district || "")
      setTaluka(landBasicInfo.taluka || "")
      setVillage(landBasicInfo.village || "")
      setPromStatus(isPromulgation(landBasicInfo.district, landBasicInfo.taluka, landBasicInfo.village))
      setFormData({
        area: landBasicInfo.area,
        sNoType: landBasicInfo.sNoType,
        sNo: landBasicInfo.sNo,
        blockNo: landBasicInfo.blockNo || "",
        reSurveyNo: landBasicInfo.reSurveyNo || "",
        integrated712: landBasicInfo.integrated712 || ""
      })
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

  // File upload
  const handleFileUpload = async (file: File) => {
    try {
      const path = `documents/${Date.now()}_${file.name}`
      const url = await uploadFile(file, "land-documents", path)
      setFormData((prev) => ({ ...prev, integrated712: url }))
      toast({ title: "File uploaded successfully" })
    } catch (error) {
      toast({ title: "Error uploading file", variant: "destructive" })
    }
  }

  // Submission
  const handleSubmit = async () => {
    // Validate all required fields
    if (!district || !taluka || !village || !formData.sNo) {
      toast({ title: "Please fill all required fields", variant: "destructive" })
      return
    }
    if (promStatus && (!formData.blockNo || !formData.reSurveyNo)) {
      toast({ title: "Block No and Re Survey No are required for Promulgation", variant: "destructive" })
      return
    }
    setLoading(true)
    try {
      // Example: save to DB (uncomment and adapt as needed)
      /*
      const { error } = await supabase.from("lands").insert({
        district,
        taluka,
        village,
        area: formData.area.value,
        area_unit: formData.area.unit,
        s_no_type: formData.sNoType,
        s_no: formData.sNo,
        isPromulgation: promStatus,
        blockNo: formData.blockNo,
        reSurveyNo: formData.reSurveyNo,
        integrated712: formData.integrated712
      })
      if (error) throw error
      */
      // setLandBasicInfo({
      //   district, taluka, village, area: formData.area, sNoType: formData.sNoType, sNo: formData.sNo,
      //   isPromulgation: promStatus, blockNo: formData.blockNo, reSurveyNo: formData.reSurveyNo, integrated712: formData.integrated712
      // })
      toast({ title: "Land basic info saved successfully" })
      setCurrentStep(2)
    } catch (error) {
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

        {/* Area Input */}
        {/* <div className="space-y-4">
          <Label>Area Input *</Label>
          <div className="flex gap-4 items-end">
            <div className="flex-1">
              <Label htmlFor="area-value">Area Value</Label>
              <Input
                id="area-value"
                type="number"
                value={formData.area.value}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    area: { ...prev.area, value: Number.parseFloat(e.target.value) || 0 }
                  }))
                }
                placeholder="Enter area"
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="area-unit">Unit</Label>
              <Select
                value={formData.area.unit}
                onValueChange={(value: "acre" | "guntha" | "sq_m") =>
                  setFormData((prev) => ({ ...prev, area: { ...prev.area, unit: value } }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="acre">Acre</SelectItem>
                  <SelectItem value="guntha">Guntha</SelectItem>
                  <SelectItem value="sq_m">Square Meter</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div> */}

        {/* S.No Type */}
        {/* <div className="space-y-4">
          <Label>S.No Type *</Label>
          <RadioGroup
            value={formData.sNoType}
            onValueChange={(value: "s_no" | "block_no" | "re_survey_no") =>
              setFormData((prev) => ({ ...prev, sNoType: value }))
            }
            className="flex gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="s_no" id="s_no" />
              <Label htmlFor="s_no">S.No</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="block_no" id="block_no" />
              <Label htmlFor="block_no">Block No</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="re_survey_no" id="re_survey_no" />
              <Label htmlFor="re_survey_no">Re Survey No</Label>
            </div>
          </RadioGroup>
        </div> */}

        {/* S.No Input */}
        {/* <div className="space-y-2">
          <Label htmlFor="sno">S.No *</Label>
          <Input
            id="sno"
            value={formData.sNo}
            onChange={(e) => setFormData((prev) => ({ ...prev, sNo: e.target.value }))}
            placeholder="Enter S.No"
          />
        </div> */}

        {/* Block No & Re Survey No: Only show if isPromulgation Yes */}
            <div className="space-y-2">
              <Label htmlFor="block-no">Block No *</Label>
              <Input
                id="block-no"
                value={formData.blockNo}
                onChange={(e) => setFormData((prev) => ({ ...prev, blockNo: e.target.value }))}
                placeholder="Enter Block No"
              />
            </div>
        {promStatus && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 border rounded-lg">
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

        {/* Document Upload */}
        <div className="space-y-2">
          <Label htmlFor="integrated-712">Integrated 7/12 Document</Label>
          <div className="flex items-center gap-4">
            <Input
              id="integrated-712"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              onChange={(e) => {
                const file = e.target.files?.[0]
                if (file) handleFileUpload(file)
              }}
            />
            <Upload className="w-5 h-5 text-muted-foreground" />
          </div>
          {formData.integrated712 && (
            <p className="text-sm text-green-600">Document uploaded successfully</p>
          )}
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <Button onClick={handleSubmit} disabled={loading} className="flex items-center gap-2">
            {loading ? "Saving..." : "Next Step"}
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

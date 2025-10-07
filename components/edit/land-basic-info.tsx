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
import { convertToSquareMeters, convertFromSquareMeters } from "@/lib/supabase";

const initialFormData: LandBasicInfo = {
  district: "",
  taluka: "",
  village: "",
  area: { 
    value: 0, 
    unit: "sq_m",
    acres: 0,
    gunthas: 0,
    square_meters: 0
  },
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

interface AreaFieldsProps {
  area: { 
    value: number; 
    unit: 'acre_guntha' | 'sq_m';
    acres?: number;
    gunthas?: number;
    square_meters?: number;
  };
  onChange: (area: { 
    value: number; 
    unit: 'acre_guntha' | 'sq_m';
    acres?: number;
    gunthas?: number;
    square_meters?: number;
  }) => void;
  disabled?: boolean;
}

const AreaFields = ({ area, onChange, disabled = false }: AreaFieldsProps) => {
  // Define constants
  const SQM_PER_GUNTHA = 101.17;
  const SQM_PER_ACRE = 4046.86;
  const GUNTHAS_PER_ACRE = 40;

  // Helper functions for conversions
  const convertToSquareMeters = (value: number, unit: string) => {
    if (unit === "acre") return value * SQM_PER_ACRE;
    if (unit === "guntha") return value * SQM_PER_GUNTHA;
    return value;
  };

  const convertFromSquareMeters = (sqm: number, unit: string) => {
    if (unit === "acre") return sqm / SQM_PER_ACRE;
    if (unit === "guntha") return sqm / SQM_PER_GUNTHA;
    return sqm;
  };

  // Calculate display values based on current area with rounded sq_m
  const displayValues = {
    sq_m: Math.round((area.value || 0) * 100) / 100, // Round to 2 decimal places
    acre: Math.floor(convertFromSquareMeters(area.value || 0, "acre")),
    guntha: Math.round(convertFromSquareMeters(area.value || 0, "guntha") % 40)
  };

  const handleSqmChange = (value: string) => {
    if (value === "") {
      onChange({
        ...area,
        value: 0,
        unit: "sq_m",
        acres: undefined,
        gunthas: undefined,
        square_meters: undefined
      });
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      const totalAcres = convertFromSquareMeters(num, "acre");
      const acres = Math.floor(totalAcres);
      const remainingGuntha = Math.round((totalAcres - acres) * 40);
      
      onChange({
        ...area,
        value: num,
        unit: "sq_m",
        acres: acres,
        gunthas: remainingGuntha,
        square_meters: num
      });
    }
  };

  const handleAcreChange = (value: string) => {
    if (value === "") {
      const remainingSqm = area.gunthas ? Math.round(convertToSquareMeters(area.gunthas, "guntha") * 100) / 100 : undefined;
      onChange({
        ...area,
        value: remainingSqm || 0,
        unit: area.unit,
        acres: undefined,
        gunthas: area.gunthas,
        square_meters: remainingSqm
      });
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      const guntha = area.gunthas || 0;
      const totalSqm = Math.round((convertToSquareMeters(num, "acre") + 
                      convertToSquareMeters(guntha, "guntha")) * 100) / 100; // Round to 2 decimal places
      onChange({ 
        ...area, 
        value: totalSqm,
        unit: area.unit,
        acres: num,
        gunthas: guntha,
        square_meters: totalSqm
      });
    }
  };

  const handleGunthaChange = (value: string) => {
    if (value === "") {
      const remainingSqm = area.acres ? Math.round(convertToSquareMeters(area.acres, "acre") * 100) / 100 : undefined;
      onChange({
        ...area,
        value: remainingSqm || 0,
        unit: area.unit,
        gunthas: undefined,
        acres: area.acres,
        square_meters: remainingSqm
      });
      return;
    }

    let num = parseFloat(value);
    if (!isNaN(num)) {
      if (num >= 40) {
        num = 39;
        // You might want to add toast here if needed
        console.warn("Guntha must be less than 40");
      }
      
      const acre = area.acres || 0;
      const totalSqm = Math.round((convertToSquareMeters(acre, "acre") + 
                      convertToSquareMeters(num, "guntha")) * 100) / 100; // Round to 2 decimal places
      onChange({ 
        ...area, 
        value: totalSqm,
        unit: area.unit,
        gunthas: num,
        acres: acre,
        square_meters: totalSqm
      });
    }
  };

  const formatValue = (value: number | undefined): string => {
    return value === undefined ? "" : value.toString();
  };

  return (
    <div className="space-y-4">
      {/* On mobile: Stack all fields vertically */}
      <div className="md:hidden space-y-4">
        {/* Unit Selector */}
        <div className="space-y-2 w-full">
          <Label>Unit</Label>
          <Select
            value={area.unit}
            onValueChange={(unit) => {
              const newUnit = unit as 'acre_guntha' | 'sq_m';
              onChange({
                ...area,
                unit: newUnit,
                value: area.value || 0
              });
            }}
          >
            <SelectTrigger className="w-full px-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acre_guntha">Acre-Guntha</SelectItem>
              <SelectItem value="sq_m">Square Meters</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Primary Field */}
        {area.unit === "sq_m" ? (
          <div className="space-y-2 w-full">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter square meters"
              className="w-full"
              disabled={disabled}
            />
          </div>
        ) : (
          <>
            <div className="space-y-2 w-full">
              <Label>Acres</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formatValue(displayValues.acre)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter acres"
                className="w-full"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2 w-full">
              <Label>Gunthas</Label>
              <Input
                type="number"
                min="0"
                max="39"
                step="1"
                value={formatValue(displayValues.guntha)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter gunthas (0-39)"
                className="w-full"
                disabled={disabled}
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </>
        )}

        {/* Secondary Fields */}
        {area.unit === "sq_m" ? (
          <>
            <div className="space-y-2 w-full">
              <Label>Acres</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formatValue(displayValues.acre)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter or view acres"
                className="w-full bg-blue-50 border-blue-200"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2 w-full">
              <Label>Gunthas</Label>
              <Input
                type="number"
                min="0"
                max="39"
                step="1"
                value={formatValue(displayValues.guntha)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter gunthas (0-39)"
                className="w-full bg-blue-50 border-blue-200"
                disabled={disabled}
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2 w-full">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter or view sq. meters"
              className="w-full bg-blue-50 border-blue-200"
              disabled={disabled}
            />
          </div>
        )}
      </div>

      {/* On desktop: Original single-row layout with better spacing */}
      <div className="hidden md:flex items-end gap-6">
        {/* Unit Selector */}
        <div className="space-y-2 w-[140px] flex-shrink-0">
          <Label>Unit</Label>
          <Select
            value={area.unit}
            onValueChange={(unit) => {
              const newUnit = unit as 'acre_guntha' | 'sq_m';
              onChange({
                ...area,
                unit: newUnit,
                value: area.value || 0
              });
            }}
          >
            <SelectTrigger className="w-[140px] px-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="acre_guntha">Acre-Guntha</SelectItem>
              <SelectItem value="sq_m">Square Meters</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Primary Fields */}
        {area.unit === "sq_m" ? (
          <div className="space-y-2 min-w-[150px] flex-1">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter square meters"
              className="w-full"
              disabled={disabled}
            />
          </div>
        ) : (
          <>
            <div className="space-y-2 min-w-[120px] flex-1">
              <Label>Acres</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formatValue(displayValues.acre)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter acres"
                className="w-full"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2 min-w-[100px] flex-1">
              <Label>Gunthas</Label>
              <Input
                type="number"
                min="0"
                max="39"
                step="1"
                value={formatValue(displayValues.guntha)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter gunthas (0-39)"
                className="w-full"
                disabled={disabled}
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </>
        )}

        {/* Secondary Fields */}
        {area.unit === "sq_m" ? (
          <>
            <div className="space-y-2 min-w-[120px] flex-1">
              <Label>Acres</Label>
              <Input
                type="number"
                min="0"
                step="1"
                value={formatValue(displayValues.acre)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter or view acres"
                className="w-full bg-blue-50 border-blue-200"
                disabled={disabled}
              />
            </div>
            <div className="space-y-2 min-w-[100px] flex-1">
              <Label>Gunthas</Label>
              <Input
                type="number"
                min="0"
                max="39"
                step="1"
                value={formatValue(displayValues.guntha)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter gunthas (0-39)"
                className="w-full bg-blue-50 border-blue-200"
                disabled={disabled}
                onKeyDown={(e) => {
                  if (e.key === 'e' || e.key === '-' || e.key === '+') {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </>
        ) : (
          <div className="space-y-2 min-w-[150px] flex-1">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min="0"
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter or view sq. meters"
              className="w-full bg-blue-50 border-blue-200"
              disabled={disabled}
            />
          </div>
        )}
      </div>
    </div>
  );
};

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
        // Since we're always storing sqm in database, convert back to user's preferred unit
        const areaValueSqm = data.area_value || 0;
        
        const mappedData: LandBasicInfo = {
          id: data.id,
          district: data.district || "",
          taluka: data.taluka || "",
          village: data.village || "",
          area: { 
            value: areaValueSqm, // Always load as sqm value
            unit: "sq_m", // Default to sq_m since that's what we store
            acres: areaValueSqm ? Math.floor(areaValueSqm / 4046.86) : undefined,
            gunthas: areaValueSqm ? Math.round((areaValueSqm / 101.17) % 40) : undefined,
            square_meters: areaValueSqm,
            sq_m: areaValueSqm // Add this for consistency with AreaFields component
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
  // Validate area based on unit type
  const hasValidArea = (() => {
    if (formData.area.unit === 'sq_m') {
      return formData.area.value && formData.area.value > 0;
    } else if (formData.area.unit === 'acre_guntha') {
      return (formData.area.acres && formData.area.acres > 0) || 
             (formData.area.gunthas && formData.area.gunthas > 0);
    }
    return false;
  })();

  if (!hasValidArea) {
    toast({ title: "Please enter a valid area", variant: "destructive" })
    return
  }

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
    // Always save square meters value, regardless of unit chosen
    let areaValueInSqm = 0;
    
    if (formData.area.unit === 'acre_guntha') {
      // Use the calculated sq_m value from AreaFields component
      areaValueInSqm = formData.area.sq_m || 0;
    } else if (formData.area.unit === 'sq_m') {
      // Use the value directly for sq_m unit
      areaValueInSqm = formData.area.value || 0;
    }

    // Map form data to database schema for UPDATE
    const updateData = {
      district: formData.district,
      taluka: formData.taluka,
      village: formData.village,
      area_value: areaValueInSqm, // Always save sqm value
      area_unit: 'sq_m', // Always save as sq_m in database
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

{/* Area Fields */}
<div className="space-y-2">
  <Label>Land Area *</Label>
  <AreaFields
    area={formData.area}
    onChange={(newArea) => updateFormField({ area: newArea })}
    disabled={loading}
  />
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
            Supported formats: PDF, JPG, JPEG, PNG 
          </p>
        </div>
      </CardContent>
    </Card>
  )
}
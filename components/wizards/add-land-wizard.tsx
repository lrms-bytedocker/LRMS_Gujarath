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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ChevronLeft, ChevronRight, Upload, FileText } from "lucide-react"
import { useLRMS, type Land } from "@/contexts/lrms-context"
import { useToast } from "@/hooks/use-toast"

const landSchema = z.object({
  district: z.string().min(1, "District is required"),
  taluka: z.string().min(1, "Taluka is required"),
  village: z.string().min(1, "Village is required"),
  area: z.number().min(0.01, "Area must be greater than 0"),
  areaUnit: z.enum(["acre", "sqm"]),
  surveyNumberType: z.enum(["Survey Number", "Block Number", "Re-Survey Number"]),
  surveyNumber: z.string().min(1, "Survey number is required"),
  document: z.any().optional(),
})

type LandFormData = z.infer<typeof landSchema>

const districts = ["Pune", "Mumbai", "Nashik", "Aurangabad", "Kolhapur"]
const talukasByDistrict: Record<string, string[]> = {
  Pune: ["Pune City", "Haveli", "Mulshi", "Bhor", "Daund"],
  Mumbai: ["Mumbai City", "Mumbai Suburban", "Thane", "Kalyan"],
  Nashik: ["Nashik", "Malegaon", "Sinnar", "Dindori"],
  Aurangabad: ["Aurangabad", "Gangapur", "Paithan", "Sillod"],
  Kolhapur: ["Kolhapur", "Panhala", "Hatkanangle", "Shirol"],
}

const villagesByTaluka: Record<string, string[]> = {
  "Pune City": ["Kothrud", "Warje", "Karve Nagar", "Aundh"],
  Haveli: ["Pirangut", "Lavale", "Sus", "Bavdhan"],
  Mulshi: ["Paud", "Tamhini", "Donaje", "Bhugaon"],
}

interface AddLandWizardProps {
  onClose: () => void
}

export function AddLandWizard({ onClose }: AddLandWizardProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const { dispatch } = useLRMS()
  const { toast } = useToast()

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<LandFormData>({
    resolver: zodResolver(landSchema),
    defaultValues: {
      areaUnit: "acre",
      surveyNumberType: "Survey Number",
    },
  })

  const watchedValues = watch()
  const totalSteps = 4
  const progress = (currentStep / totalSteps) * 100

  const convertArea = (area: number, fromUnit: string, toUnit: string): number => {
    if (fromUnit === toUnit) return area
    if (fromUnit === "acre" && toUnit === "sqm") return area * 4047
    if (fromUnit === "sqm" && toUnit === "acre") return area / 4047
    return area
  }

  const formatAreaDisplay = (area: number, unit: string) => {
    if (unit === "acre") {
      const acres = Math.floor(area)
      const gunthas = Math.round((area - acres) * 40)
      return `${acres} Acre ${gunthas} Guntha (${convertArea(area, "acre", "sqm").toFixed(2)} Sq.m)`
    }
    return `${area} Sq.m (${convertArea(area, "sqm", "acre").toFixed(4)} Acre)`
  }

  const onSubmit = (data: LandFormData) => {
    const newLand: Land = {
      id: Date.now().toString(),
      district: data.district,
      taluka: data.taluka,
      village: data.village,
      surveyNumber: data.surveyNumber,
      surveyNumberType: data.surveyNumberType,
      area: data.area,
      areaUnit: data.areaUnit,
      areaDisplay: formatAreaDisplay(data.area, data.areaUnit),
      document: selectedFile || undefined,
      createdAt: new Date(),
    }

    dispatch({ type: "ADD_LAND", payload: newLand })

    toast({
      title: "Land Record Added",
      description: `Survey ${data.surveyNumber} has been successfully added to the system.`,
    })

    reset()
    setSelectedFile(null)
    setCurrentStep(1)
    onClose()
  }

  const nextStep = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1)
    }
  }

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setSelectedFile(file)
    }
  }

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
      <DialogHeader>
        <DialogTitle>Add New Land Record</DialogTitle>
        <DialogDescription>Follow the steps to add a new land record to the system</DialogDescription>
      </DialogHeader>

      <div className="space-y-6">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>
              Step {currentStep} of {totalSteps}
            </span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Step 1: Location Selection */}
          {currentStep === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 1: Location Details</CardTitle>
                <CardDescription>Select the district, taluka, and village for the land record</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="district">District *</Label>
                    <Select
                      value={watchedValues.district}
                      onValueChange={(value) => {
                        setValue("district", value)
                        setValue("taluka", "")
                        setValue("village", "")
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select District" />
                      </SelectTrigger>
                      <SelectContent>
                        {districts.map((district) => (
                          <SelectItem key={district} value={district}>
                            {district}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {errors.district && <p className="text-sm text-red-500">{errors.district.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="taluka">Taluka *</Label>
                    <Select
                      value={watchedValues.taluka}
                      onValueChange={(value) => {
                        setValue("taluka", value)
                        setValue("village", "")
                      }}
                      disabled={!watchedValues.district}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Taluka" />
                      </SelectTrigger>
                      <SelectContent>
                        {watchedValues.district &&
                          talukasByDistrict[watchedValues.district]?.map((taluka) => (
                            <SelectItem key={taluka} value={taluka}>
                              {taluka}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {errors.taluka && <p className="text-sm text-red-500">{errors.taluka.message}</p>}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="village">Village *</Label>
                    <Select
                      value={watchedValues.village}
                      onValueChange={(value) => setValue("village", value)}
                      disabled={!watchedValues.taluka}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select Village" />
                      </SelectTrigger>
                      <SelectContent>
                        {watchedValues.taluka &&
                          villagesByTaluka[watchedValues.taluka]?.map((village) => (
                            <SelectItem key={village} value={village}>
                              {village}
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                    {errors.village && <p className="text-sm text-red-500">{errors.village.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Area Details */}
          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 2: Area Information</CardTitle>
                <CardDescription>Enter the area details with unit conversion</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="areaUnit">Area Unit *</Label>
                    <Select
                      value={watchedValues.areaUnit}
                      onValueChange={(value: "acre" | "sqm") => setValue("areaUnit", value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="acre">Acre + Guntha</SelectItem>
                        <SelectItem value="sqm">Square Meter</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="area">Area ({watchedValues.areaUnit === "acre" ? "Acre.Guntha" : "Sq.m"}) *</Label>
                    <Input
                      id="area"
                      type="number"
                      step="0.01"
                      placeholder={watchedValues.areaUnit === "acre" ? "1.25" : "5000"}
                      {...register("area", { valueAsNumber: true })}
                    />
                    {errors.area && <p className="text-sm text-red-500">{errors.area.message}</p>}
                  </div>
                </div>

                {watchedValues.area && (
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Area Conversion</h4>
                    <p className="text-blue-800">{formatAreaDisplay(watchedValues.area, watchedValues.areaUnit)}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Step 3: Survey Number */}
          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 3: Survey Number Details</CardTitle>
                <CardDescription>Select the survey number type and enter the corresponding number</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="surveyNumberType">Survey Number Type *</Label>
                    <Select
                      value={watchedValues.surveyNumberType}
                      onValueChange={(value: "Survey Number" | "Block Number" | "Re-Survey Number") =>
                        setValue("surveyNumberType", value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Survey Number">Survey Number</SelectItem>
                        <SelectItem value="Block Number">Block Number</SelectItem>
                        <SelectItem value="Re-Survey Number">Re-Survey Number</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="surveyNumber">{watchedValues.surveyNumberType} *</Label>
                    <Input id="surveyNumber" placeholder="e.g., 123/A, 456/B/1" {...register("surveyNumber")} />
                    {errors.surveyNumber && <p className="text-sm text-red-500">{errors.surveyNumber.message}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Document Upload */}
          {currentStep === 4 && (
            <Card>
              <CardHeader>
                <CardTitle>Step 4: Document Upload</CardTitle>
                <CardDescription>Upload the Integrated 7/12 document for this land record</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Label htmlFor="document" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">
                          Upload Integrated 7/12 Document
                        </span>
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
                  <div className="flex items-center space-x-2 p-3 bg-green-50 rounded-lg">
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

                {/* Summary */}
                <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium mb-3">Summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div>
                      <span className="text-gray-600">Location:</span>
                      <span className="ml-2 font-medium">
                        {watchedValues.village}, {watchedValues.taluka}, {watchedValues.district}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Survey Number:</span>
                      <span className="ml-2 font-medium">{watchedValues.surveyNumber}</span>
                    </div>
                    <div>
                      <span className="text-gray-600">Area:</span>
                      <span className="ml-2 font-medium">
                        {watchedValues.area && formatAreaDisplay(watchedValues.area, watchedValues.areaUnit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-600">Document:</span>
                      <span className="ml-2 font-medium">{selectedFile ? selectedFile.name : "Not uploaded"}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={prevStep} disabled={currentStep === 1}>
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>

            {currentStep < totalSteps ? (
              <Button
                type="button"
                onClick={nextStep}
                disabled={
                  (currentStep === 1 && (!watchedValues.district || !watchedValues.taluka || !watchedValues.village)) ||
                  (currentStep === 2 && !watchedValues.area) ||
                  (currentStep === 3 && !watchedValues.surveyNumber)
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button type="submit">Create Land Record</Button>
            )}
          </div>
        </form>
      </div>
    </DialogContent>
  )
}

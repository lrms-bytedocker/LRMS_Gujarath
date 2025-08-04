"use client"

import type React from "react"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import * as z from "zod"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Trash2, Upload, FileText } from "lucide-react"
import { useLRMS, type LandNotice } from "@/contexts/lrms-context"
import { useToast } from "@/hooks/use-toast"

const landNoticeSchema = z.object({
  noticeNumber: z.string().min(1, "Notice number is required"),
  surveyNumberType: z.enum(["Survey Number", "Block Number", "Re-Survey Number"]),
  entries: z
    .array(
      z.object({
        surveyNumber: z.string().min(1, "Survey number is required"),
      }),
    )
    .min(1, "At least one survey number is required"),
})

type LandNoticeFormData = z.infer<typeof landNoticeSchema>

export default function LandNoticeEntry() {
  const { state, dispatch } = useLRMS()
  const { toast } = useToast()
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const {
    register,
    control,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
    reset,
  } = useForm<LandNoticeFormData>({
    resolver: zodResolver(landNoticeSchema),
    defaultValues: {
      surveyNumberType: "Survey Number",
      entries: [{ surveyNumber: "" }],
    },
  })

  const { fields, append, remove } = useFieldArray({
    control,
    name: "entries",
  })

  const watchedValues = watch()

  // Get available survey numbers based on type
  const getAvailableSurveyNumbers = () => {
    return state.lands
      .filter((land) => land.surveyNumberType === watchedValues.surveyNumberType)
      .map((land) => land.surveyNumber)
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setSelectedFiles([...selectedFiles, ...files])
  }

  const removeFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index))
  }

  const onSubmit = (data: LandNoticeFormData) => {
    const newLandNotice: LandNotice = {
      id: Date.now().toString(),
      noticeNumber: data.noticeNumber,
      surveyNumbers: data.entries.map((entry) => entry.surveyNumber),
      surveyNumberType: data.surveyNumberType,
      noticeType: "Other", // Will be set in details page
      subtype: "",
      description: "",
      status: "Valid",
      displayInOutput: true,
      documentsAvailable: selectedFiles.length > 0,
      documents: selectedFiles,
      createdAt: new Date(),
    }

    dispatch({ type: "ADD_LAND_NOTICE", payload: newLandNotice })

    toast({
      title: "Land Notice Created",
      description: `Notice ${data.noticeNumber} has been created successfully.`,
    })

    reset()
    setSelectedFiles([])
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Land Notice Entry</h1>
        <p className="text-muted-foreground">Create new land notices with affected survey numbers</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Entry Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>New Land Notice</CardTitle>
            <CardDescription>Enter the basic information for the land notice</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="noticeNumber">Land Notice Number *</Label>
                  <Input id="noticeNumber" placeholder="e.g., LN/2024/001" {...register("noticeNumber")} />
                  {errors.noticeNumber && <p className="text-sm text-red-500">{errors.noticeNumber.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label>Survey Number Type *</Label>
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
              </div>

              {/* Survey Numbers */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Affected Survey Numbers *</Label>
                  <Button type="button" variant="outline" size="sm" onClick={() => append({ surveyNumber: "" })}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Survey Number
                  </Button>
                </div>

                <div className="space-y-3">
                  {fields.map((field, index) => (
                    <div key={field.id} className="flex gap-2 items-end">
                      <div className="flex-1 space-y-2">
                        <Label>Survey Number {index + 1}</Label>
                        <Select
                          value={watchedValues.entries?.[index]?.surveyNumber || ""}
                          onValueChange={(value) => setValue(`entries.${index}.surveyNumber`, value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select survey number" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAvailableSurveyNumbers().map((surveyNumber) => (
                              <SelectItem key={surveyNumber} value={surveyNumber}>
                                {surveyNumber}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      {fields.length > 1 && (
                        <Button type="button" variant="ghost" size="sm" onClick={() => remove(index)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
                {errors.entries && <p className="text-sm text-red-500">{errors.entries.message}</p>}
              </div>

              {/* Document Upload */}
              <div className="space-y-4">
                <Label>Related Documents</Label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div className="text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4">
                      <Label htmlFor="documents" className="cursor-pointer">
                        <span className="mt-2 block text-sm font-medium text-gray-900">Upload Related Documents</span>
                        <span className="mt-1 block text-sm text-gray-500">PDF, JPG, PNG up to 10MB each</span>
                      </Label>
                      <Input
                        id="documents"
                        type="file"
                        multiple
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleFileChange}
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    {selectedFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-5 w-5 text-green-600" />
                          <span className="text-sm text-green-800">{file.name}</span>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(index)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4">
                <Button type="button" variant="outline" onClick={() => reset()}>
                  Reset
                </Button>
                <Button type="submit">Create Land Notice</Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Preview/Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Summary of the land notice being created</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium">Notice Number</Label>
              <p className="text-sm text-muted-foreground">{watchedValues.noticeNumber || "Not specified"}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Survey Number Type</Label>
              <p className="text-sm text-muted-foreground">{watchedValues.surveyNumberType}</p>
            </div>

            <div>
              <Label className="text-sm font-medium">Affected Survey Numbers</Label>
              <div className="space-y-1">
                {watchedValues.entries?.map((entry, index) => (
                  <div key={index}>
                    {entry.surveyNumber ? (
                      <Badge variant="outline">{entry.surveyNumber}</Badge>
                    ) : (
                      <span className="text-sm text-muted-foreground">Survey {index + 1}: Not selected</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium">Documents</Label>
              <p className="text-sm text-muted-foreground">{selectedFiles.length} file(s) selected</p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-xs text-muted-foreground">
                After creating the notice, you can add detailed information in the Land Notice Details section.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Existing Land Notices */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Land Notices</CardTitle>
          <CardDescription>Recently created land notices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Notice Number</TableHead>
                  <TableHead>Survey Numbers</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.landNotices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      No land notices created yet
                    </TableCell>
                  </TableRow>
                ) : (
                  state.landNotices.slice(0, 5).map((notice) => (
                    <TableRow key={notice.id}>
                      <TableCell className="font-medium">{notice.noticeNumber}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {notice.surveyNumbers.map((surveyNumber) => (
                            <Badge key={surveyNumber} variant="outline" className="text-xs">
                              {surveyNumber}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{notice.surveyNumberType}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            notice.status === "Valid"
                              ? "default"
                              : notice.status === "Invalid"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {notice.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {notice.createdAt.toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="sm">
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

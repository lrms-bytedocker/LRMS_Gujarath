"use client"

import type React from "react"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, FileText, Upload, Trash2 } from "lucide-react"
import { useLRMS, type Owner } from "@/contexts/lrms-context"
import { useToast } from "@/hooks/use-toast"

const noticeTypes = [
  "Possessor",
  "Consolidation",
  "Inheritance",
  "Tenancy",
  "Agricultural Rights",
  "Sales Deed",
  "Opposite Sales Deed",
  "Order",
  "Debar",
  "Transfer",
  "Other",
]

const tenureTypes = ["New", "Old", "Agricultural", "Not Applicable"]

export default function LandNoticeDetails() {
  const { state } = useLRMS()
  const { toast } = useToast()
  const [selectedNoticeId, setSelectedNoticeId] = useState("")
  const [noticeDetails, setNoticeDetails] = useState({
    noticeType: "",
    subtype: "",
    description: "",
    status: "Valid",
    displayInOutput: true,
    documentsAvailable: false,
  })
  const [owners, setOwners] = useState<Owner[]>([])
  const [newOwner, setNewOwner] = useState<Partial<Owner>>({})
  const [additionalDocuments, setAdditionalDocuments] = useState<File[]>([])

  const selectedNotice = state.landNotices.find((notice) => notice.id === selectedNoticeId)

  // Get related 7/12 documents from slabs
  const getRelatedDocuments = () => {
    if (!selectedNotice) return []

    const relatedSlabs = state.slabs.filter((slab) => {
      const land = state.lands.find((l) => l.id === slab.landId)
      return land && selectedNotice.surveyNumbers.includes(land.surveyNumber)
    })

    return relatedSlabs.map((slab) => {
      const land = state.lands.find((l) => l.id === slab.landId)
      return {
        slabYear: `${slab.startYear}-${slab.endYear}`,
        surveyNumber: land?.surveyNumber || "",
        document: slab.document,
        hasDocument: !!slab.document,
      }
    })
  }

  const addOwner = () => {
    if (!newOwner.name || !newOwner.surveyNumber || !newOwner.area) {
      toast({
        title: "Missing Information",
        description: "Please fill all required owner fields.",
        variant: "destructive",
      })
      return
    }

    const owner: Owner = {
      id: Date.now().toString(),
      name: newOwner.name,
      surveyNumber: newOwner.surveyNumber,
      area: newOwner.area,
      areaUnit: newOwner.areaUnit || "acre",
      tenureType: newOwner.tenureType || "New",
    }

    setOwners([...owners, owner])
    setNewOwner({})
    toast({
      title: "Owner Added",
      description: "Owner has been added successfully.",
    })
  }

  const removeOwner = (ownerId: string) => {
    setOwners(owners.filter((owner) => owner.id !== ownerId))
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || [])
    setAdditionalDocuments([...additionalDocuments, ...files])
  }

  const removeDocument = (index: number) => {
    setAdditionalDocuments(additionalDocuments.filter((_, i) => i !== index))
  }

  const saveNoticeDetails = () => {
    if (!selectedNoticeId) {
      toast({
        title: "No Notice Selected",
        description: "Please select a land notice to update.",
        variant: "destructive",
      })
      return
    }

    // In a real app, this would update the notice in the database
    toast({
      title: "Notice Updated",
      description: "Land notice details have been saved successfully.",
    })
  }

  const renderConditionalForm = () => {
    switch (noticeDetails.noticeType) {
      case "Possessor":
      case "Consolidation":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Owner Details</CardTitle>
              <CardDescription>Add owners with their survey numbers and areas</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Add New Owner Form */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border rounded-lg bg-blue-50">
                <div className="space-y-2">
                  <Label>Owner Name</Label>
                  <Input
                    placeholder="Enter owner name"
                    value={newOwner.name || ""}
                    onChange={(e) => setNewOwner({ ...newOwner, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Survey Number</Label>
                  <Select
                    value={newOwner.surveyNumber || ""}
                    onValueChange={(value) => setNewOwner({ ...newOwner, surveyNumber: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select survey" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedNotice?.surveyNumbers.map((surveyNumber) => (
                        <SelectItem key={surveyNumber} value={surveyNumber}>
                          {surveyNumber}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Owned Area</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="Area"
                    value={newOwner.area || ""}
                    onChange={(e) => setNewOwner({ ...newOwner, area: Number.parseFloat(e.target.value) || 0 })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tenure Type</Label>
                  <Select
                    value={newOwner.tenureType || "New"}
                    onValueChange={(value) => setNewOwner({ ...newOwner, tenureType: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {tenureTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="md:col-span-4 flex justify-end">
                  <Button onClick={addOwner}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Owner
                  </Button>
                </div>
              </div>

              {/* Owners List */}
              {owners.length > 0 && (
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Owner Name</TableHead>
                        <TableHead>Survey Number</TableHead>
                        <TableHead>Owned Area</TableHead>
                        <TableHead>Tenure Type</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {owners.map((owner) => (
                        <TableRow key={owner.id}>
                          <TableCell className="font-medium">{owner.name}</TableCell>
                          <TableCell>{owner.surveyNumber}</TableCell>
                          <TableCell>
                            {owner.areaUnit === "acre"
                              ? `${Math.floor(owner.area)}A ${Math.round((owner.area - Math.floor(owner.area)) * 40)}G`
                              : `${owner.area} Sq.m`}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{owner.tenureType}</Badge>
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => removeOwner(owner.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        )

      case "Inheritance":
      case "Agricultural Rights":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Inheritance Details</CardTitle>
              <CardDescription>Specify inheritance from current owner to new owners</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>From Current Owner</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select current owner" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="owner1">Ramesh Patil</SelectItem>
                      <SelectItem value="owner2">Suresh Kumar</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Number of New Owners</Label>
                  <Input type="number" min="1" max="10" defaultValue="2" />
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>Note: Total assigned area must be ≤ original owner's area</p>
              </div>
            </CardContent>
          </Card>
        )

      case "Sales Deed":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Sales Deed Details</CardTitle>
              <CardDescription>Transfer from existing owner to new buyers</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>From Existing Owner</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select seller" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="seller1">Prakash Yadav</SelectItem>
                    <SelectItem value="seller2">Dinesh Gupta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                <p>⚠️ Area assigned cannot exceed held area</p>
              </div>
            </CardContent>
          </Card>
        )

      case "Order":
        return (
          <Card>
            <CardHeader>
              <CardTitle>Legal Order Details</CardTitle>
              <CardDescription>Administrative and legal order information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Restraining Order</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="yes">Yes</SelectItem>
                      <SelectItem value="no">No</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Tenure Change</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select tenure change" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="agricultural">Agricultural</SelectItem>
                      <SelectItem value="residential">Residential</SelectItem>
                      <SelectItem value="commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Order Type</Label>
                <Select>
                  <SelectTrigger>
                    <SelectValue placeholder="Select order type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="administrative">Administrative Order</SelectItem>
                    <SelectItem value="court">Court Order</SelectItem>
                    <SelectItem value="revenue">Revenue Order</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        )

      default:
        return null
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Land Notice Details</h1>
        <p className="text-muted-foreground">Add detailed information to land notices</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Notice Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Select Notice</CardTitle>
            <CardDescription>Choose a land notice to add details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Land Notice</Label>
              <Select value={selectedNoticeId} onValueChange={setSelectedNoticeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select notice" />
                </SelectTrigger>
                <SelectContent>
                  {state.landNotices.map((notice) => (
                    <SelectItem key={notice.id} value={notice.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{notice.noticeNumber}</span>
                        <span className="text-xs text-muted-foreground">{notice.surveyNumbers.join(", ")}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedNotice && (
              <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                <h4 className="font-medium text-blue-900">Notice Information</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>
                    <span className="font-medium">Number:</span> {selectedNotice.noticeNumber}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span> {selectedNotice.surveyNumberType}
                  </p>
                  <p>
                    <span className="font-medium">Status:</span> {selectedNotice.status}
                  </p>
                  <p>
                    <span className="font-medium">Surveys:</span>
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {selectedNotice.surveyNumbers.map((survey) => (
                      <Badge key={survey} variant="outline" className="text-xs">
                        {survey}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Notice Details Form */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Notice Details</CardTitle>
            <CardDescription>
              {selectedNotice
                ? `Add detailed information for ${selectedNotice.noticeNumber}`
                : "Select a notice to add details"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedNotice ? (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Please select a land notice to add detailed information</p>
              </div>
            ) : (
              <Tabs defaultValue="basic" className="space-y-6">
                <TabsList>
                  <TabsTrigger value="basic">Basic Details</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                  <TabsTrigger value="conditional">Type-Specific</TabsTrigger>
                </TabsList>

                <TabsContent value="basic" className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Notice Type *</Label>
                      <Select
                        value={noticeDetails.noticeType}
                        onValueChange={(value) => setNoticeDetails({ ...noticeDetails, noticeType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select notice type" />
                        </SelectTrigger>
                        <SelectContent>
                          {noticeTypes.map((type) => (
                            <SelectItem key={type} value={type}>
                              {type}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Subtype</Label>
                      <Input
                        placeholder="Enter subtype"
                        value={noticeDetails.subtype}
                        onChange={(e) => setNoticeDetails({ ...noticeDetails, subtype: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="Enter detailed description of the notice"
                      rows={4}
                      value={noticeDetails.description}
                      onChange={(e) => setNoticeDetails({ ...noticeDetails, description: e.target.value })}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Status</Label>
                      <Select
                        value={noticeDetails.status}
                        onValueChange={(value: "Valid" | "Invalid" | "Nullified") =>
                          setNoticeDetails({ ...noticeDetails, status: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Valid">Valid</SelectItem>
                          <SelectItem value="Invalid">Invalid</SelectItem>
                          <SelectItem value="Nullified">Nullified</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="displayInOutput"
                          checked={noticeDetails.displayInOutput}
                          onCheckedChange={(checked) =>
                            setNoticeDetails({ ...noticeDetails, displayInOutput: !!checked })
                          }
                        />
                        <Label htmlFor="displayInOutput">Display in Output</Label>
                      </div>

                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="documentsAvailable"
                          checked={noticeDetails.documentsAvailable}
                          onCheckedChange={(checked) =>
                            setNoticeDetails({ ...noticeDetails, documentsAvailable: !!checked })
                          }
                        />
                        <Label htmlFor="documentsAvailable">Documents Available</Label>
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="documents" className="space-y-6">
                  {/* Related 7/12 Documents */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Related 7/12 Documents</CardTitle>
                      <CardDescription>Documents from slab creation for affected survey numbers</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-md border">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Slab Year</TableHead>
                              <TableHead>Survey Number</TableHead>
                              <TableHead>Document Status</TableHead>
                              <TableHead>Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {getRelatedDocuments().map((doc, index) => (
                              <TableRow key={index}>
                                <TableCell>{doc.slabYear}</TableCell>
                                <TableCell>{doc.surveyNumber}</TableCell>
                                <TableCell>
                                  <Badge variant={doc.hasDocument ? "default" : "destructive"}>
                                    {doc.hasDocument ? "Available" : "Missing"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <Button variant="ghost" size="sm" disabled={!doc.hasDocument}>
                                    View
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Additional Documents Upload */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Additional Documents</CardTitle>
                      <CardDescription>Upload additional documents related to this notice</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                        <div className="text-center">
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <div className="mt-4">
                            <Label htmlFor="additionalDocs" className="cursor-pointer">
                              <span className="mt-2 block text-sm font-medium text-gray-900">
                                Upload Additional Documents
                              </span>
                              <span className="mt-1 block text-sm text-gray-500">PDF, JPG, PNG up to 10MB each</span>
                            </Label>
                            <Input
                              id="additionalDocs"
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png"
                              onChange={handleFileUpload}
                              className="hidden"
                            />
                          </div>
                        </div>
                      </div>

                      {additionalDocuments.length > 0 && (
                        <div className="space-y-2">
                          {additionalDocuments.map((file, index) => (
                            <div key={index} className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-5 w-5 text-green-600" />
                                <span className="text-sm text-green-800">{file.name}</span>
                              </div>
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => removeDocument(index)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="conditional" className="space-y-6">
                  {noticeDetails.noticeType ? (
                    renderConditionalForm()
                  ) : (
                    <Card>
                      <CardContent className="text-center py-8">
                        <p className="text-muted-foreground">
                          Please select a notice type in the Basic Details tab to see type-specific fields
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </TabsContent>
              </Tabs>
            )}

            {selectedNotice && (
              <div className="flex justify-end space-x-4 pt-6 border-t">
                <Button variant="outline">Reset</Button>
                <Button onClick={saveNoticeDetails}>Save Details</Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

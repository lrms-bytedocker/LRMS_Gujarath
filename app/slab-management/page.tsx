"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Calendar, FileText, Search } from "lucide-react"
import { useLRMS } from "@/contexts/lrms-context"
import { AddSlabModal } from "@/components/modals/add-slab-modal"
import { Dialog, DialogTrigger } from "@/components/ui/dialog"

export default function SlabManagement() {
  const { state } = useLRMS()
  const [selectedLandId, setSelectedLandId] = useState("")
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState("")

  // Filter slabs based on selected land and search
  const filteredSlabs = state.slabs.filter((slab) => {
    const land = state.lands.find((l) => l.id === slab.landId)
    const matchesLand = !selectedLandId || slab.landId === selectedLandId
    const matchesSearch =
      !searchTerm ||
      land?.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      land?.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      slab.startYear.toString().includes(searchTerm) ||
      slab.endYear.toString().includes(searchTerm)

    return matchesLand && matchesSearch
  })

  const selectedLand = state.lands.find((land) => land.id === selectedLandId)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Slab Management</h1>
          <p className="text-muted-foreground">Manage yearly slabs for land records</p>
        </div>
        <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
          <DialogTrigger asChild>
            <Button disabled={!selectedLandId}>
              <Plus className="h-4 w-4 mr-2" />
              Add New Slab
            </Button>
          </DialogTrigger>
          {selectedLandId && <AddSlabModal landId={selectedLandId} onClose={() => setIsModalOpen(false)} />}
        </Dialog>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Land Selection */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Select Land</CardTitle>
            <CardDescription>Choose a land record to manage its slabs</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Search Lands</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by survey number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Land Record</Label>
              <Select value={selectedLandId} onValueChange={setSelectedLandId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a land record" />
                </SelectTrigger>
                <SelectContent>
                  {state.lands.map((land) => (
                    <SelectItem key={land.id} value={land.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{land.surveyNumber}</span>
                        <span className="text-xs text-muted-foreground">
                          {land.village}, {land.taluka}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedLand && (
              <div className="p-3 bg-blue-50 rounded-lg space-y-2">
                <h4 className="font-medium text-blue-900">Selected Land Details</h4>
                <div className="text-sm text-blue-800 space-y-1">
                  <p>
                    <span className="font-medium">Survey:</span> {selectedLand.surveyNumber}
                  </p>
                  <p>
                    <span className="font-medium">Location:</span> {selectedLand.village}, {selectedLand.taluka}
                  </p>
                  <p>
                    <span className="font-medium">Area:</span> {selectedLand.areaDisplay}
                  </p>
                  <p>
                    <span className="font-medium">Type:</span> {selectedLand.surveyNumberType}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Slabs Table */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Yearly Slabs</CardTitle>
            <CardDescription>
              {selectedLand
                ? `Slabs for Survey ${selectedLand.surveyNumber}`
                : "Select a land record to view its slabs"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {!selectedLandId ? (
              <div className="text-center py-8 text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Please select a land record to view and manage its slabs</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSlabs.length === 0 ? (
                  <div className="text-center py-8">
                    <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground mb-4">No slabs found for this land record</p>
                    <Button onClick={() => setIsModalOpen(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create First Slab
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Start Year</TableHead>
                          <TableHead>End Year</TableHead>
                          <TableHead>Duration</TableHead>
                          <TableHead>Paiky</TableHead>
                          <TableHead>Consolidation</TableHead>
                          <TableHead>Document</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredSlabs.map((slab) => (
                          <TableRow key={slab.id}>
                            <TableCell className="font-medium">{slab.startYear}</TableCell>
                            <TableCell>{slab.endYear}</TableCell>
                            <TableCell>
                              <Badge variant="outline">{slab.endYear - slab.startYear + 1} years</Badge>
                            </TableCell>
                            <TableCell>
                              {slab.paiky ? (
                                <Badge variant="secondary">Yes ({slab.paikyEntries?.length || 0})</Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {slab.consolidation ? (
                                <Badge variant="secondary">Yes ({slab.consolidationEntries?.length || 0})</Badge>
                              ) : (
                                <Badge variant="outline">No</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              {slab.document ? (
                                <Badge variant="default">Uploaded</Badge>
                              ) : (
                                <Badge variant="destructive">Missing</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm">
                                  View
                                </Button>
                                <Button variant="ghost" size="sm">
                                  Edit
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

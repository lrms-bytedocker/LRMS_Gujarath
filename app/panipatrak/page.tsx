"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Plus, Search, Edit, Trash2, Save, X } from "lucide-react"
import { useLRMS, type Farmer } from "@/contexts/lrms-context"
import { useToast } from "@/hooks/use-toast"

export default function Panipatrak() {
  const { state, dispatch } = useLRMS()
  const { toast } = useToast()
  const [selectedSlabId, setSelectedSlabId] = useState("")
  const [searchTerm, setSearchTerm] = useState("")
  const [editingFarmer, setEditingFarmer] = useState<string | null>(null)
  const [newFarmer, setNewFarmer] = useState<Partial<Farmer>>({})
  const [isAddingNew, setIsAddingNew] = useState(false)

  // Get slabs with land information
  const slabsWithLandInfo = state.slabs.map((slab) => {
    const land = state.lands.find((l) => l.id === slab.landId)
    return {
      ...slab,
      landInfo: land,
    }
  })

  // Filter farmers based on selected slab and search
  const filteredFarmers = state.farmers.filter((farmer) => {
    const matchesSlab = !selectedSlabId || farmer.slabId === selectedSlabId
    const matchesSearch =
      !searchTerm ||
      farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesSlab && matchesSearch
  })

  // Group farmers by slab year and survey number
  const groupedFarmers = filteredFarmers.reduce(
    (acc, farmer) => {
      const slab = state.slabs.find((s) => s.id === farmer.slabId)
      const land = state.lands.find((l) => l.id === slab?.landId)

      if (!slab || !land) return acc

      const key = `${slab.startYear}-${slab.endYear}_${farmer.surveyNumber}`

      if (!acc[key]) {
        acc[key] = {
          slabYear: `${slab.startYear}-${slab.endYear}`,
          surveyNumber: farmer.surveyNumber,
          landInfo: land,
          farmers: [],
          totalArea: 0,
        }
      }

      acc[key].farmers.push(farmer)
      acc[key].totalArea += farmer.area

      return acc
    },
    {} as Record<string, any>,
  )

  const convertArea = (area: number, unit: string) => {
    if (unit === "acre") {
      const acres = Math.floor(area)
      const gunthas = Math.round((area - acres) * 40)
      return `${acres}A ${gunthas}G`
    }
    return `${area} Sq.m`
  }

  const handleEditFarmer = (farmerId: string) => {
    setEditingFarmer(farmerId)
  }

  const handleSaveFarmer = (farmerId: string, updates: Partial<Farmer>) => {
    dispatch({ type: "UPDATE_FARMER", payload: { id: farmerId, updates } })
    setEditingFarmer(null)
    toast({
      title: "Farmer Updated",
      description: "Farmer record has been updated successfully.",
    })
  }

  const handleDeleteFarmer = (farmerId: string) => {
    dispatch({ type: "DELETE_FARMER", payload: farmerId })
    toast({
      title: "Farmer Deleted",
      description: "Farmer record has been deleted successfully.",
    })
  }

  const handleAddNewFarmer = () => {
    if (!selectedSlabId || !newFarmer.name || !newFarmer.surveyNumber || !newFarmer.area) {
      toast({
        title: "Missing Information",
        description: "Please fill all required fields.",
        variant: "destructive",
      })
      return
    }

    const farmer: Farmer = {
      id: Date.now().toString(),
      slabId: selectedSlabId,
      name: newFarmer.name,
      surveyNumber: newFarmer.surveyNumber,
      area: newFarmer.area,
      areaUnit: newFarmer.areaUnit || "acre",
    }

    dispatch({ type: "ADD_FARMER", payload: farmer })
    setNewFarmer({})
    setIsAddingNew(false)
    toast({
      title: "Farmer Added",
      description: "New farmer record has been added successfully.",
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Panipatrak Registry</h1>
          <p className="text-muted-foreground">Manage farmer records grouped by slab year and survey number</p>
        </div>
        <Button onClick={() => setIsAddingNew(true)} disabled={!selectedSlabId}>
          <Plus className="h-4 w-4 mr-2" />
          Add Farmer
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Filters */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
            <CardDescription>Filter farmers by slab and search criteria</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Search Farmers</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or survey..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Slab Year</Label>
              <Select value={selectedSlabId} onValueChange={setSelectedSlabId}>
                <SelectTrigger>
                  <SelectValue placeholder="All Slabs" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Slabs</SelectItem>
                  {slabsWithLandInfo.map((slab) => (
                    <SelectItem key={slab.id} value={slab.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {slab.startYear}-{slab.endYear}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {slab.landInfo?.surveyNumber} - {slab.landInfo?.village}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Summary Stats */}
            <div className="pt-4 border-t space-y-3">
              <div className="text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Farmers:</span>
                  <span className="font-medium">{filteredFarmers.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Total Groups:</span>
                  <span className="font-medium">{Object.keys(groupedFarmers).length}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Farmers Table */}
        <Card className="lg:col-span-3">
          <CardHeader>
            <CardTitle>Farmer Records</CardTitle>
            <CardDescription>
              {selectedSlabId
                ? `Farmers for selected slab (${Object.keys(groupedFarmers).length} groups)`
                : "All farmer records grouped by slab year and survey number"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {Object.keys(groupedFarmers).length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <div className="mb-4">
                  {state.farmers.length === 0 ? (
                    <>
                      <h3 className="text-lg font-medium mb-2">No Farmer Records</h3>
                      <p>Start by adding farmer records to the system.</p>
                    </>
                  ) : (
                    <>
                      <h3 className="text-lg font-medium mb-2">No Records Found</h3>
                      <p>No farmers match your current search criteria.</p>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                {Object.entries(groupedFarmers).map(([key, group]) => (
                  <div key={key} className="border rounded-lg p-4">
                    <div className="flex justify-between items-center mb-4">
                      <div>
                        <h3 className="text-lg font-semibold">
                          Survey {group.surveyNumber} ({group.slabYear})
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {group.landInfo.village}, {group.landInfo.taluka}, {group.landInfo.district}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline" className="mb-1">
                          {group.farmers.length} Farmers
                        </Badge>
                        <p className="text-sm font-medium">
                          Total: {convertArea(group.totalArea, group.farmers[0]?.areaUnit || "acre")}
                        </p>
                      </div>
                    </div>

                    <div className="rounded-md border">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Farmer Name</TableHead>
                            <TableHead>Owned Area</TableHead>
                            <TableHead>Area Unit</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {group.farmers.map((farmer: Farmer) => (
                            <TableRow key={farmer.id}>
                              <TableCell>
                                {editingFarmer === farmer.id ? (
                                  <Input
                                    defaultValue={farmer.name}
                                    onBlur={(e) => handleSaveFarmer(farmer.id, { name: e.target.value })}
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveFarmer(farmer.id, { name: e.currentTarget.value })
                                      }
                                      if (e.key === "Escape") {
                                        setEditingFarmer(null)
                                      }
                                    }}
                                    autoFocus
                                  />
                                ) : (
                                  <span className="font-medium">{farmer.name}</span>
                                )}
                              </TableCell>
                              <TableCell>
                                {editingFarmer === farmer.id ? (
                                  <Input
                                    type="number"
                                    step="0.01"
                                    defaultValue={farmer.area}
                                    onBlur={(e) =>
                                      handleSaveFarmer(farmer.id, { area: Number.parseFloat(e.target.value) || 0 })
                                    }
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") {
                                        handleSaveFarmer(farmer.id, {
                                          area: Number.parseFloat(e.currentTarget.value) || 0,
                                        })
                                      }
                                      if (e.key === "Escape") {
                                        setEditingFarmer(null)
                                      }
                                    }}
                                  />
                                ) : (
                                  convertArea(farmer.area, farmer.areaUnit)
                                )}
                              </TableCell>
                              <TableCell>
                                {editingFarmer === farmer.id ? (
                                  <Select
                                    defaultValue={farmer.areaUnit}
                                    onValueChange={(value: "acre" | "sqm") =>
                                      handleSaveFarmer(farmer.id, { areaUnit: value })
                                    }
                                  >
                                    <SelectTrigger className="w-24">
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="acre">Acre</SelectItem>
                                      <SelectItem value="sqm">Sq.m</SelectItem>
                                    </SelectContent>
                                  </Select>
                                ) : (
                                  <Badge variant="outline">{farmer.areaUnit === "acre" ? "Acre" : "Sq.m"}</Badge>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  {editingFarmer === farmer.id ? (
                                    <>
                                      <Button variant="ghost" size="sm" onClick={() => setEditingFarmer(null)}>
                                        <Save className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => setEditingFarmer(null)}>
                                        <X className="h-4 w-4" />
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button variant="ghost" size="sm" onClick={() => handleEditFarmer(farmer.id)}>
                                        <Edit className="h-4 w-4" />
                                      </Button>
                                      <Button variant="ghost" size="sm" onClick={() => handleDeleteFarmer(farmer.id)}>
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}

                          {/* Add New Farmer Row */}
                          {isAddingNew && selectedSlabId && group.farmers[0]?.slabId === selectedSlabId && (
                            <TableRow className="bg-blue-50">
                              <TableCell>
                                <Input
                                  placeholder="Farmer name"
                                  value={newFarmer.name || ""}
                                  onChange={(e) => setNewFarmer({ ...newFarmer, name: e.target.value })}
                                />
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  step="0.01"
                                  placeholder="Area"
                                  value={newFarmer.area || ""}
                                  onChange={(e) =>
                                    setNewFarmer({ ...newFarmer, area: Number.parseFloat(e.target.value) || 0 })
                                  }
                                />
                              </TableCell>
                              <TableCell>
                                <Select
                                  value={newFarmer.areaUnit || "acre"}
                                  onValueChange={(value: "acre" | "sqm") =>
                                    setNewFarmer({ ...newFarmer, areaUnit: value })
                                  }
                                >
                                  <SelectTrigger className="w-24">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="acre">Acre</SelectItem>
                                    <SelectItem value="sqm">Sq.m</SelectItem>
                                  </SelectContent>
                                </Select>
                              </TableCell>
                              <TableCell>
                                <div className="flex gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setNewFarmer({ ...newFarmer, surveyNumber: group.surveyNumber })
                                      handleAddNewFarmer()
                                    }}
                                  >
                                    <Save className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setIsAddingNew(false)
                                      setNewFarmer({})
                                    }}
                                  >
                                    <X className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

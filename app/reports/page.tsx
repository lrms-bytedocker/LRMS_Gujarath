"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Search, Download, Filter, CalendarIcon, FileText, BarChart3 } from "lucide-react"
import { useLRMS } from "@/contexts/lrms-context"
import { format } from "date-fns"
import { cn } from "@/lib/utils"

export default function ReportsAndQueries() {
  const { state } = useLRMS()
  const [activeTab, setActiveTab] = useState("queries")

  // Query filters
  const [dateRange, setDateRange] = useState<{ from?: Date; to?: Date }>({})
  const [districtFilter, setDistrictFilter] = useState("all")
  const [talukaFilter, setTalukaFilter] = useState("all")
  const [slabYearFilter, setSlabYearFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [searchTerm, setSearchTerm] = useState("")

  // Get unique values for filters
  const districts = ["all", ...new Set(state.lands.map((land) => land.district))]
  const talukas = ["all", ...new Set(state.lands.map((land) => land.taluka))]
  const slabYears = ["all", ...new Set(state.slabs.map((slab) => `${slab.startYear}-${slab.endYear}`))]
  const statuses = ["all", "Valid", "Invalid", "Nullified"]

  // Filter land notices based on criteria
  const filteredNotices = state.landNotices.filter((notice) => {
    const noticeDate = notice.createdAt
    const matchesDateRange =
      (!dateRange.from || noticeDate >= dateRange.from) && (!dateRange.to || noticeDate <= dateRange.to)

    // Get land info for the notice
    const noticeLands = state.lands.filter((land) => notice.surveyNumbers.includes(land.surveyNumber))

    const matchesDistrict = districtFilter === "all" || noticeLands.some((land) => land.district === districtFilter)

    const matchesTaluka = talukaFilter === "all" || noticeLands.some((land) => land.taluka === talukaFilter)

    const matchesStatus = statusFilter === "all" || notice.status === statusFilter

    const matchesSearch =
      !searchTerm ||
      notice.noticeNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      notice.surveyNumbers.some((survey) => survey.toLowerCase().includes(searchTerm.toLowerCase()))

    return matchesDateRange && matchesDistrict && matchesTaluka && matchesStatus && matchesSearch
  })

  // Get notices for output (marked to display)
  const outputNotices = filteredNotices.filter((notice) => notice.displayInOutput)

  // Generate summary statistics
  const generateSummaryStats = () => {
    const totalLands = state.lands.length
    const totalSlabs = state.slabs.length
    const totalFarmers = state.farmers.length
    const totalNotices = state.landNotices.length

    const validNotices = state.landNotices.filter((n) => n.status === "Valid").length
    const invalidNotices = state.landNotices.filter((n) => n.status === "Invalid").length
    const nullifiedNotices = state.landNotices.filter((n) => n.status === "Nullified").length

    const noticesByType = state.landNotices.reduce(
      (acc, notice) => {
        acc[notice.noticeType] = (acc[notice.noticeType] || 0) + 1
        return acc
      },
      {} as Record<string, number>,
    )

    return {
      totalLands,
      totalSlabs,
      totalFarmers,
      totalNotices,
      validNotices,
      invalidNotices,
      nullifiedNotices,
      noticesByType,
    }
  }

  const stats = generateSummaryStats()

  const handleExportQuery = () => {
    const csvContent = [
      ["Notice Number", "Survey Numbers", "Type", "Status", "Description", "Created Date"],
      ...filteredNotices.map((notice) => [
        notice.noticeNumber,
        notice.surveyNumbers.join("; "),
        notice.noticeType,
        notice.status,
        notice.description,
        notice.createdAt.toLocaleDateString(),
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "land-notices-query.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const handleExportSummary = () => {
    const csvContent = [
      ["Notice Number", "Survey Numbers", "Type", "Subtype", "Description", "Status"],
      ...outputNotices.map((notice) => [
        notice.noticeNumber,
        notice.surveyNumbers.join("; "),
        notice.noticeType,
        notice.subtype,
        notice.description,
        notice.status,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "land-notices-summary.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Reports & Queries</h1>
        <p className="text-muted-foreground">Generate reports and query land notice data</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="queries" className="flex items-center gap-2">
            <Search className="h-4 w-4" />
            Query List
          </TabsTrigger>
          <TabsTrigger value="summary" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Notice Summary
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analytics
          </TabsTrigger>
        </TabsList>

        <TabsContent value="queries" className="space-y-6">
          {/* Query Filters */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Filter className="h-5 w-5" />
                Query Filters
              </CardTitle>
              <CardDescription>Filter land notices by various criteria</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
                {/* Date Range */}
                <div className="space-y-2">
                  <Label>From Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.from && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.from ? format(dateRange.from, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.from}
                        onSelect={(date) => setDateRange({ ...dateRange, from: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>To Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "w-full justify-start text-left font-normal",
                          !dateRange.to && "text-muted-foreground",
                        )}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {dateRange.to ? format(dateRange.to, "PPP") : "Pick a date"}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={dateRange.to}
                        onSelect={(date) => setDateRange({ ...dateRange, to: date })}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                </div>

                <div className="space-y-2">
                  <Label>District</Label>
                  <Select value={districtFilter} onValueChange={setDistrictFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {districts.map((district) => (
                        <SelectItem key={district} value={district}>
                          {district === "all" ? "All Districts" : district}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Taluka</Label>
                  <Select value={talukaFilter} onValueChange={setTalukaFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {talukas.map((taluka) => (
                        <SelectItem key={taluka} value={taluka}>
                          {taluka === "all" ? "All Talukas" : taluka}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Status</Label>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {statuses.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status === "all" ? "All Statuses" : status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Search</Label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search notices..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center mt-4 pt-4 border-t">
                <div className="text-sm text-muted-foreground">
                  Found {filteredNotices.length} notices matching criteria
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setDateRange({})
                      setDistrictFilter("all")
                      setTalukaFilter("all")
                      setSlabYearFilter("all")
                      setStatusFilter("all")
                      setSearchTerm("")
                    }}
                  >
                    Clear Filters
                  </Button>
                  <Button onClick={handleExportQuery}>
                    <Download className="h-4 w-4 mr-2" />
                    Export Results
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Query Results */}
          <Card>
            <CardHeader>
              <CardTitle>Query Results</CardTitle>
              <CardDescription>Land notices matching your filter criteria</CardDescription>
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
                      <TableHead>Description</TableHead>
                      <TableHead>Created Date</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredNotices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No notices match your search criteria
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredNotices.map((notice) => (
                        <TableRow key={notice.id}>
                          <TableCell className="font-medium">{notice.noticeNumber}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {notice.surveyNumbers.map((survey) => (
                                <Badge key={survey} variant="outline" className="text-xs">
                                  {survey}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{notice.noticeType}</Badge>
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
                          <TableCell className="max-w-xs truncate">{notice.description || "No description"}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {notice.createdAt.toLocaleDateString()}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Land Notice Summary</CardTitle>
              <CardDescription>
                Summary of notices marked for output display ({outputNotices.length} notices)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex justify-end mb-4">
                <Button onClick={handleExportSummary}>
                  <Download className="h-4 w-4 mr-2" />
                  Export Summary
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Notice Number</TableHead>
                      <TableHead>Survey Numbers</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Subtype</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {outputNotices.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No notices are marked for output display
                        </TableCell>
                      </TableRow>
                    ) : (
                      outputNotices.map((notice) => (
                        <TableRow key={notice.id}>
                          <TableCell className="font-medium">{notice.noticeNumber}</TableCell>
                          <TableCell>
                            <div className="flex flex-wrap gap-1">
                              {notice.surveyNumbers.map((survey) => (
                                <Badge key={survey} variant="outline" className="text-xs">
                                  {survey}
                                </Badge>
                              ))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">{notice.noticeType}</Badge>
                          </TableCell>
                          <TableCell>{notice.subtype || "-"}</TableCell>
                          <TableCell className="max-w-xs truncate">{notice.description || "No description"}</TableCell>
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
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-6">
          {/* Summary Statistics */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Lands</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalLands}</div>
                <p className="text-xs text-muted-foreground">Registered land records</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Slabs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalSlabs}</div>
                <p className="text-xs text-muted-foreground">Yearly slab records</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalFarmers}</div>
                <p className="text-xs text-muted-foreground">Registered farmers</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Notices</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalNotices}</div>
                <p className="text-xs text-muted-foreground">Land notices created</p>
              </CardContent>
            </Card>
          </div>

          {/* Notice Status Breakdown */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Notice Status Distribution</CardTitle>
                <CardDescription>Breakdown of land notices by status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="default">Valid</Badge>
                    </div>
                    <span className="font-medium">{stats.validNotices}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="destructive">Invalid</Badge>
                    </div>
                    <span className="font-medium">{stats.invalidNotices}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">Nullified</Badge>
                    </div>
                    <span className="font-medium">{stats.nullifiedNotices}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notice Types</CardTitle>
                <CardDescription>Distribution by notice type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(stats.noticesByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm">{type}</span>
                      <Badge variant="outline">{count}</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Date-wise Archive */}
          <Card>
            <CardHeader>
              <CardTitle>Date-wise Archive</CardTitle>
              <CardDescription>All land notices grouped by creation date</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Object.entries(
                  state.landNotices.reduce(
                    (acc, notice) => {
                      const date = notice.createdAt.toDateString()
                      if (!acc[date]) acc[date] = []
                      acc[date].push(notice)
                      return acc
                    },
                    {} as Record<string, typeof state.landNotices>,
                  ),
                )
                  .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                  .map(([date, notices]) => (
                    <div key={date} className="border rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <h4 className="font-medium">{date}</h4>
                        <Badge variant="outline">{notices.length} notices</Badge>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {notices.map((notice) => (
                          <div key={notice.id} className="text-sm p-2 bg-gray-50 rounded">
                            <div className="font-medium">{notice.noticeNumber}</div>
                            <div className="text-muted-foreground">
                              {notice.surveyNumbers.join(", ")} - {notice.noticeType}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

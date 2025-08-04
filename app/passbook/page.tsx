"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Download, PrinterIcon as Print, Filter } from "lucide-react"
import { useLRMS } from "@/contexts/lrms-context"

export default function PassbookLedger() {
  const { state } = useLRMS()
  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState("all")
  const [ownerFilter, setOwnerFilter] = useState("all")

  // Get unique years and owners for filters
  const years = ["all", ...new Set(state.passbookEntries.map((entry) => entry.year.toString()))]
  const owners = ["all", ...new Set(state.passbookEntries.map((entry) => entry.ownerName))]

  // Filter passbook entries
  const filteredEntries = state.passbookEntries.filter((entry) => {
    const matchesSearch =
      entry.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.landNoticeNumber.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesYear = yearFilter === "all" || entry.year.toString() === yearFilter
    const matchesOwner = ownerFilter === "all" || entry.ownerName === ownerFilter

    return matchesSearch && matchesYear && matchesOwner
  })

  // Group entries by year for better organization
  const groupedEntries = filteredEntries.reduce(
    (acc, entry) => {
      const year = entry.year.toString()
      if (!acc[year]) {
        acc[year] = []
      }
      acc[year].push(entry)
      return acc
    },
    {} as Record<string, typeof filteredEntries>,
  )

  const convertArea = (area: number, unit: string) => {
    if (unit === "acre") {
      const acres = Math.floor(area)
      const gunthas = Math.round((area - acres) * 40)
      return `${acres} Acre ${gunthas} Guntha`
    }
    return `${area} Sq.m`
  }

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    // In a real app, this would generate and download a CSV/PDF
    const csvContent = [
      ["Year", "Owner Name", "Owned Area", "Survey Number", "Land Notice Number"],
      ...filteredEntries.map((entry) => [
        entry.year,
        entry.ownerName,
        convertArea(entry.ownedArea, entry.areaUnit),
        entry.surveyNumber,
        entry.landNoticeNumber,
      ]),
    ]
      .map((row) => row.join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "passbook-ledger.csv"
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Passbook Ledger</h1>
          <p className="text-muted-foreground">Printable ledger view of land ownership records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button onClick={handlePrint}>
            <Print className="h-4 w-4 mr-2" />
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
          <CardDescription>Filter passbook entries by year, owner, or search terms</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search owner, survey, notice..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Year</Label>
              <Select value={yearFilter} onValueChange={setYearFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Years</SelectItem>
                  {years.slice(1).map((year) => (
                    <SelectItem key={year} value={year}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Owner</Label>
              <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Owners" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Owners</SelectItem>
                  {owners.slice(1).map((owner) => (
                    <SelectItem key={owner} value={owner}>
                      {owner}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("")
                  setYearFilter("all")
                  setOwnerFilter("all")
                }}
              >
                Clear Filters
              </Button>
            </div>
          </div>

          <div className="mt-4 flex gap-4 text-sm text-muted-foreground">
            <span>Total Entries: {filteredEntries.length}</span>
            <span>Years: {Object.keys(groupedEntries).length}</span>
            <span>Unique Owners: {new Set(filteredEntries.map((e) => e.ownerName)).size}</span>
          </div>
        </CardContent>
      </Card>

      {/* Passbook Ledger */}
      <Card className="print:shadow-none">
        <CardHeader className="print:border-b print:pb-4">
          <CardTitle className="text-center">Land Record Passbook Ledger</CardTitle>
          <CardDescription className="text-center print:text-black">
            Generated on {new Date().toLocaleDateString()} | Total Records: {filteredEntries.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="print:p-0">
          {Object.keys(groupedEntries).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                {state.passbookEntries.length === 0 ? (
                  <>
                    <h3 className="text-lg font-medium mb-2">No Passbook Entries</h3>
                    <p>No passbook entries have been recorded yet.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium mb-2">No Records Found</h3>
                    <p>No entries match your current filter criteria.</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedEntries)
                .sort(([a], [b]) => Number.parseInt(b) - Number.parseInt(a))
                .map(([year, entries]) => (
                  <div key={year} className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-xl font-semibold">Year {year}</h3>
                      <Badge variant="outline" className="print:border-black">
                        {entries.length} entries
                      </Badge>
                    </div>

                    <div className="rounded-md border print:border-black">
                      <Table>
                        <TableHeader>
                          <TableRow className="print:border-black">
                            <TableHead className="print:border-black print:font-bold print:text-black">
                              Sr. No.
                            </TableHead>
                            <TableHead className="print:border-black print:font-bold print:text-black">
                              Owner Name
                            </TableHead>
                            <TableHead className="print:border-black print:font-bold print:text-black">
                              Owned Land Area
                            </TableHead>
                            <TableHead className="print:border-black print:font-bold print:text-black">
                              Survey Number
                            </TableHead>
                            <TableHead className="print:border-black print:font-bold print:text-black">
                              Land Notice Number
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {entries.map((entry, index) => (
                            <TableRow key={entry.id} className="print:border-black">
                              <TableCell className="print:border-black print:text-black">{index + 1}</TableCell>
                              <TableCell className="font-medium print:border-black print:text-black">
                                {entry.ownerName}
                              </TableCell>
                              <TableCell className="print:border-black print:text-black">
                                {convertArea(entry.ownedArea, entry.areaUnit)}
                              </TableCell>
                              <TableCell className="print:border-black print:text-black">
                                <Badge variant="outline" className="print:border-black print:text-black">
                                  {entry.surveyNumber}
                                </Badge>
                              </TableCell>
                              <TableCell className="print:border-black print:text-black">
                                {entry.landNoticeNumber}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Year Summary */}
                    <div className="bg-gray-50 p-4 rounded-lg print:bg-white print:border print:border-black">
                      <h4 className="font-medium mb-2 print:text-black">Year {year} Summary</h4>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="text-muted-foreground print:text-black">Total Entries:</span>
                          <span className="ml-2 font-medium print:text-black">{entries.length}</span>
                        </div>
                        <div>
                          <span className="text-muted-foreground print:text-black">Unique Owners:</span>
                          <span className="ml-2 font-medium print:text-black">
                            {new Set(entries.map((e) => e.ownerName)).size}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground print:text-black">Survey Numbers:</span>
                          <span className="ml-2 font-medium print:text-black">
                            {new Set(entries.map((e) => e.surveyNumber)).size}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground print:text-black">Total Area:</span>
                          <span className="ml-2 font-medium print:text-black">
                            {entries
                              .reduce((sum, entry) => {
                                // Convert all to acres for summation
                                const areaInAcres = entry.areaUnit === "acre" ? entry.ownedArea : entry.ownedArea / 4047
                                return sum + areaInAcres
                              }, 0)
                              .toFixed(2)}{" "}
                            Acres
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print\\:shadow-none,
          .print\\:shadow-none * {
            visibility: visible;
          }
          .print\\:shadow-none {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          @page {
            margin: 1in;
          }
        }
      `}</style>
    </div>
  )
}

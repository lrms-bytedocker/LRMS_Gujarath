"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Search, Download, PrinterIcon as Print, Filter, Loader2, ChevronDown, X } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { LandRecordService, convertToSquareMeters, convertFromSquareMeters } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"

interface PassbookEntry {
  id: string
  year: number
  ownerName: string
  ownedArea: number
  areaUnit: 'acre_guntha' | 'sq_m'
  surveyNumber: string
  surveyNumberType: string
  nondhNumber: number
  createdAt: string
  acres?: number
  gunthas?: number
  squareMeters?: number
  district: string
  taluka: string
  village: string
}

export default function PassbookLedger() {
  const { toast } = useToast()
  const [passbookEntries, setPassbookEntries] = useState<PassbookEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [yearFilter, setYearFilter] = useState("all")
  const [ownerFilter, setOwnerFilter] = useState("all")
  const [areaDisplayType, setAreaDisplayType] = useState<'sq_m' | 'acre_guntha'>('sq_m')
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    console.log('Component mounted, fetching data...')
    fetchAllPassbookData()
  }, [])

  const fetchAllPassbookData = async () => {
    setLoading(true)
    console.log('Starting to fetch all passbook data...')
    
    try {
      console.log('Calling get_valid_owner_relations function...')
      const { data, error } = await supabase.rpc('get_valid_owner_relations')
      
      if (error) {
        console.error('Error fetching owner relations:', error)
        throw error
      }

      console.log('Received data from DB:', data?.length, 'records')
      
      if (!data || data.length === 0) {
        console.log('No valid owner relations found')
        setPassbookEntries([])
        return
      }

      // Create a map to ensure unique owners
      const uniqueOwnersMap = new Map<string, any>();
      data.forEach((entry: any) => {
        if (!uniqueOwnersMap.has(entry.owner_name)) {
          uniqueOwnersMap.set(entry.owner_name, entry);
        }
      });

      const entries: PassbookEntry[] = Array.from(uniqueOwnersMap.values()).map((entry: any) => {
        const ownerName = String(entry.owner_name ?? '')
        const surveyNumber = String(entry.s_no ?? '')
        const surveyNumberType = String(entry.s_no_type ?? 'survey_no')
        const district = String(entry.district ?? '')
        const taluka = String(entry.taluka ?? '')
        const village = String(entry.village ?? '')
        
        // Numeric fields
        const acres = entry.acres ? Number(entry.acres) : undefined
        const gunthas = entry.gunthas ? Number(entry.gunthas) : undefined
        const squareMeters = entry.square_meters ? Number(entry.square_meters) : undefined
        
        // Calculate area
        let ownedArea = 0
        if (entry.area_unit === 'acre_guntha') {
          ownedArea = convertToSquareMeters((acres || 0) * 40 + (gunthas || 0), 'guntha')
        } else {
          ownedArea = squareMeters || 0
        }

        return {
          id: entry.id,
          year: new Date(entry.created_at).getFullYear(),
          ownerName,
          ownedArea,
          areaUnit: entry.area_unit,
          surveyNumber,
          surveyNumberType,
          nondhNumber: Number(entry.nondh_number) || 0,
          createdAt: new Date(entry.created_at).toISOString(),
          acres,
          gunthas,
          squareMeters,
          district,
          taluka,
          village
        }
      })

      console.log('Processed unique owner entries:', entries.length)
      setPassbookEntries(entries)
      
    } catch (error) {
      console.error('Error in fetchAllPassbookData:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch passbook data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
      console.log('Finished loading data')
    }
  }

  // Get unique values for filters
  const years = Array.from(new Set(passbookEntries.map((entry) => entry.year.toString())))
    .sort((a, b) => Number(b) - Number(a));
  const owners = Array.from(new Set(passbookEntries.map((entry) => entry.ownerName)))
    .sort();

  // Filter passbook entries
  const filteredEntries = passbookEntries.filter((entry) => {
    const matchesSearch =
      entry.ownerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entry.nondhNumber.toString().includes(searchTerm.toLowerCase());

    const matchesYear = yearFilter === "all" || entry.year.toString() === yearFilter;
    const matchesOwner = ownerFilter === "all" || entry.ownerName === ownerFilter;

    return matchesSearch && matchesYear && matchesOwner;
  });

  // Format area based on display type
  const formatArea = (entry: PassbookEntry) => {
    if (areaDisplayType === 'acre_guntha') {
      const totalGunthas = entry.ownedArea / 101.17; // 1 Guntha = 101.17 sq.m
      const acres = Math.floor(totalGunthas / 40);
      const gunthas = Math.round(totalGunthas % 40);
      return `${acres} Acre ${gunthas} Guntha`;
    }
    return `${entry.ownedArea.toFixed(2)} Sq.m`;
  }

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

  const handlePrint = () => {
    window.print()
  }

  const handleExport = () => {
    if (filteredEntries.length === 0) {
      toast({
        title: 'No Data',
        description: 'No data available to export',
        variant: 'destructive'
      })
      return
    }

    const csvContent = [
      ["Year", "Owner Name", "Owned Area", "Survey Number", "Nondh Number", "Created Date"],
      ...filteredEntries.map((entry) => [
        entry.year,
        entry.ownerName,
        formatArea(entry),
        `${entry.surveyNumber} (${entry.surveyNumberType})`,
        entry.nondhNumber,
        new Date(entry.createdAt).toLocaleDateString()
      ]),
    ]
      .map((row) => row.map(cell => 
        typeof cell === 'string' && cell.includes(',') ? `"${cell}"` : cell
      ).join(","))
      .join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `passbook-ledger-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Success',
      description: 'Passbook ledger exported successfully',
    })
  }

  const clearFilters = () => {
    setSearchTerm("")
    setYearFilter("all")
    setOwnerFilter("all")
  }

  const hasActiveFilters = searchTerm || yearFilter !== "all" || ownerFilter !== "all"

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px] p-4">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4" />
          <h3 className="text-lg font-medium mb-2">Loading Passbook Data</h3>
          <p className="text-muted-foreground text-sm">Fetching land ownership records...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Passbook Ledger</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Printable ledger view of land ownership records
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button 
            variant="outline" 
            onClick={handleExport}
            disabled={filteredEntries.length === 0}
            className="w-full sm:w-auto"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button 
            onClick={handlePrint}
            disabled={filteredEntries.length === 0}
            className="w-full sm:w-auto"
          >
            <Print className="h-4 w-4 mr-2" />
            Print Ledger
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Filter className="h-5 w-5" />
              <CardTitle className="text-lg">Filters</CardTitle>
              {hasActiveFilters && (
                <Badge variant="secondary" className="ml-2">
                  Active
                </Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowFilters(!showFilters)}
              className="sm:hidden"
            >
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
            </Button>
          </div>
          <CardDescription className="text-sm">
            Filter passbook entries by year, owner, or search terms
          </CardDescription>
        </CardHeader>
        
        {/* Desktop Filters - Always visible */}
        <div className="hidden sm:block">
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Search input */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search owner, survey..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              {/* Year filter */}
              <div className="space-y-2">
                <Label>Year</Label>
                <Select value={yearFilter} onValueChange={setYearFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Years" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Years</SelectItem>
                    {years.map((year) => (
                      <SelectItem key={year} value={year}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Owner filter */}
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Owners" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Owners</SelectItem>
                    {owners.map((owner) => (
                      <SelectItem key={owner} value={owner}>
                        {owner}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Area display type */}
              <div className="space-y-2">
                <Label>Area Display</Label>
                <Select value={areaDisplayType} onValueChange={(v: 'sq_m' | 'acre_guntha') => setAreaDisplayType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Square Meters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sq_m">Square Meters</SelectItem>
                    <SelectItem value="acre_guntha">Acre-Guntha</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear filters button */}
              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={clearFilters}
                  disabled={!hasActiveFilters}
                >
                  {hasActiveFilters && <X className="h-4 w-4 mr-2" />}
                  Clear
                </Button>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span>Total Entries: {filteredEntries.length}</span>
              <span>Years: {Object.keys(groupedEntries).length}</span>
              <span>Unique Owners: {new Set(filteredEntries.map((e) => e.ownerName)).size}</span>
            </div>
          </CardContent>
        </div>

        {/* Mobile Filters - Collapsible */}
        <Collapsible open={showFilters} onOpenChange={setShowFilters} className="sm:hidden">
          <CollapsibleContent>
            <CardContent className="space-y-4">
              {/* Search input */}
              <div className="space-y-2">
                <Label>Search</Label>
                <div className="relative">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search owner, survey, nondh..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Year filter */}
                <div className="space-y-2">
                  <Label>Year</Label>
                  <Select value={yearFilter} onValueChange={setYearFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Years" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Years</SelectItem>
                      {years.map((year) => (
                        <SelectItem key={year} value={year}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Owner filter */}
                <div className="space-y-2">
                  <Label>Owner</Label>
                  <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                    <SelectTrigger>
                      <SelectValue placeholder="All Owners" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Owners</SelectItem>
                      {owners.map((owner) => (
                        <SelectItem key={owner} value={owner}>
                          {owner}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Area display type */}
              <div className="space-y-2">
                <Label>Area Display</Label>
                <Select value={areaDisplayType} onValueChange={(v: 'sq_m' | 'acre_guntha') => setAreaDisplayType(v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Square Meters" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sq_m">Square Meters</SelectItem>
                    <SelectItem value="acre_guntha">Acre-Guntha</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Clear filters button */}
              <Button
                variant="outline"
                onClick={clearFilters}
                disabled={!hasActiveFilters}
                className="w-full"
              >
                {hasActiveFilters && <X className="h-4 w-4 mr-2" />}
                Clear All Filters
              </Button>

              <div className="flex flex-wrap gap-4 text-sm text-muted-foreground border-t pt-4">
                <span>Entries: {filteredEntries.length}</span>
                <span>Years: {Object.keys(groupedEntries).length}</span>
                <span>Owners: {new Set(filteredEntries.map((e) => e.ownerName)).size}</span>
              </div>
            </CardContent>
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* Passbook Ledger */}
      <Card className="print:shadow-none">
        <CardHeader className="print:border-b print:pb-4">
          <CardTitle className="text-center text-lg sm:text-xl">Land Record Passbook Ledger</CardTitle>
          <CardDescription className="text-center print:text-black text-sm">
            Generated on {new Date().toLocaleDateString()} | Total Records: {filteredEntries.length}
          </CardDescription>
        </CardHeader>
        <CardContent className="print:p-0">
          {Object.keys(groupedEntries).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <div className="mb-4">
                {passbookEntries.length === 0 ? (
                  <>
                    <h3 className="text-lg font-medium mb-2">No Passbook Entries</h3>
                    <p className="text-sm">No passbook entries have been recorded yet.</p>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-medium mb-2">No Records Found</h3>
                    <p className="text-sm">No entries match your current filter criteria.</p>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-6 sm:space-y-8">
              {Object.entries(groupedEntries)
                .sort(([a], [b]) => Number(b) - Number(a))
                .map(([year, entries]) => (
                  <div key={year} className="space-y-4">
                    <div className="flex items-center justify-between border-b pb-2">
                      <h3 className="text-lg sm:text-xl font-semibold">Year {year}</h3>
                      <Badge variant="outline" className="print:border-black text-xs sm:text-sm">
                        {entries.length} entries
                      </Badge>
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden lg:block rounded-md border print:border-black">
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
                              Village/Taluka/District
                            </TableHead>
                            <TableHead className="print:border-black print:font-bold print:text-black">
                              Survey Number (Type)
                            </TableHead>
                            <TableHead className="print:border-black print:font-bold print:text-black">
                              Nondh Number
                            </TableHead>
                            <TableHead className="print:border-black print:font-bold print:text-black">
                              Area ({areaDisplayType === 'sq_m' ? 'Sq.m' : 'Acre-Guntha'})
                            </TableHead>
                            <TableHead className="print:border-black print:font-bold print:text-black">
                              Date
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
                                {entry.village}/{entry.taluka}/{entry.district}
                              </TableCell>
                              <TableCell className="print:border-black print:text-black">
                                <Badge variant="outline" className="print:border-black print:text-black">
                                  {entry.surveyNumber} ({entry.surveyNumberType})
                                </Badge>
                              </TableCell>
                              <TableCell className="print:border-black print:text-black">
                                <Badge variant="secondary" className="print:border-black print:text-black">
                                  {entry.nondhNumber}
                                </Badge>
                              </TableCell>
                              <TableCell className="print:border-black print:text-black">
                                {formatArea(entry)}
                              </TableCell>
                              <TableCell className="print:border-black print:text-black">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>

                    {/* Mobile/Tablet Cards */}
                    <div className="lg:hidden space-y-3">
                      {entries.map((entry, index) => (
                        <Card key={entry.id} className="p-4">
                          <div className="space-y-3">
                            <div className="flex justify-between items-start">
                              <div className="space-y-1">
                                <div className="font-medium text-sm">#{index + 1} {entry.ownerName}</div>
                                <div className="text-muted-foreground text-xs">
                                  {entry.village}, {entry.taluka}, {entry.district}
                                </div>
                              </div>
                              <div className="text-xs text-muted-foreground">
                                {new Date(entry.createdAt).toLocaleDateString()}
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div>
                                <span className="text-muted-foreground">Survey:</span>
                                <div className="font-medium">{entry.surveyNumber}</div>
                                <div className="text-xs text-muted-foreground">({entry.surveyNumberType})</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Nondh:</span>
                                <div className="font-medium">{entry.nondhNumber}</div>
                              </div>
                            </div>
                            
                            <div className="pt-2 border-t">
                              <span className="text-muted-foreground text-sm">Area:</span>
                              <div className="font-medium">{formatArea(entry)}</div>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>

                  {/* Year Summary */}
<div className="bg-gray-50 p-3 sm:p-4 rounded-lg print:bg-white print:border print:border-black">
  <h4 className="font-medium mb-2 print:text-black text-sm sm:text-base">Year {year} Summary</h4>
  
  {/* Mobile: Vertical Stack */}
  <div className="flex flex-col space-y-2 sm:hidden text-xs">
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
          .reduce((sum, entry) => sum + entry.ownedArea, 0)
          .toFixed(2)} Sq.m
        <span className="text-xs text-muted-foreground print:text-black ml-1">
          ({convertFromSquareMeters(
            entries.reduce((sum, entry) => sum + entry.ownedArea, 0),
            'acre'
          ).toFixed(2)} Acres)
        </span>
      </span>
    </div>
  </div>

  {/* Desktop: Grid Layout */}
  <div className="hidden sm:grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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
      <div>
        <span className="text-muted-foreground print:text-black">Total Area:</span>
        <span className="ml-2 font-medium print:text-black">
          {entries
            .reduce((sum, entry) => sum + entry.ownedArea, 0)
            .toFixed(2)} Sq.m
        </span>
      </div>
      <div className="ml-[5rem] text-xs text-muted-foreground print:text-black">
        ({convertFromSquareMeters(
          entries.reduce((sum, entry) => sum + entry.ownedArea, 0),
          'acre'
        ).toFixed(2)} Acres)
      </div>
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
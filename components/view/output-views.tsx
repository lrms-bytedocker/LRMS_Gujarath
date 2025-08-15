"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Eye, Filter, Calendar } from "lucide-react"
import { useLandRecord } from "@/contexts/land-record-context"
import { convertToSquareMeters, LandRecordService } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { useRouter } from "next/navigation"

interface PassbookEntry {
  year: number
  ownerName: string
  area: number
  sNo: string
  nondhNumber: number
  createdAt: string
}

interface NondhDetail {
  id: string
  nondhId: string
  nondhNumber: number
  sNo: string
  type: string
  reason: string
  status: string
  vigat: string
  hasDocuments: boolean
  showInOutput: boolean
  createdAt: string
}

export default function OutputViews() {
  const { recordId, setCurrentStep } = useLandRecord()
  const { toast } = useToast()
  const router = useRouter()
  const [passbookData, setPassbookData] = useState<PassbookEntry[]>([])
  const [nondhDetails, setNondhDetails] = useState<NondhDetail[]>([])
  const [filteredNondhs, setFilteredNondhs] = useState<NondhDetail[]>([])
  const [dateFilter, setDateFilter] = useState("")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (recordId) {
      fetchAllData()
    }
  }, [recordId])

  const fetchAllData = async () => {
    if (!recordId) {
      toast({
        title: 'Error',
        description: 'No land record ID found',
        variant: 'destructive'
      })
      return
    }

    setLoading(true)
    try {
      await Promise.all([
        fetchPassbookData(),
        fetchNondhDetails()
      ])
    } catch (error) {
      console.error('Error fetching data:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch output data',
        variant: 'destructive'
      })
    } finally {
      setLoading(false)
    }
  }

  const fetchPassbookData = async () => {
    try {
      console.log('Fetching passbook data for recordId:', recordId)
      
      // Get nondhs first
      const { data: nondhs, error: nondhError } = await LandRecordService.getNondhs(recordId)
      if (nondhError) throw nondhError

      if (!nondhs || nondhs.length === 0) {
        console.log('No nondhs found')
        setPassbookData([])
        return
      }

      // Get nondh details with owner relations
      const { data: nondhDetailsWithRelations, error: detailsError } = 
        await LandRecordService.getNondhDetailsWithRelations(recordId)
      
      if (detailsError) throw detailsError

      const passbookEntries: PassbookEntry[] = []

      // Process each nondh detail and its owner relations
      nondhDetailsWithRelations?.forEach(detail => {
        const nondh = nondhs.find(n => n.id === detail.nondh_id)
        const nondhNumber = Number(nondh?.number || 0)

        // Process owner relations for this detail - filter only valid relations
        detail.owner_relations?.forEach(relation => {
          // Only include relations where is_valid is true
          if (!relation.is_valid) {
            return // Skip invalid relations
          }

          let area = 0
          
          // Calculate area based on unit
          if (relation.area_unit === 'acre_guntha') {
            const totalGunthas = (relation.acres || 0) * 40 + (relation.gunthas || 0)
            area = convertToSquareMeters(totalGunthas, 'guntha')
          } else {
            area = relation.square_meters || 0
          }

          passbookEntries.push({
            year: new Date(relation.created_at || new Date()).getFullYear(),
            ownerName: relation.owner_name || '',
            area,
            sNo: relation.s_no || '',
            nondhNumber,
            createdAt: relation.created_at || new Date().toISOString()
          })
        })
      })

      console.log('Processed passbook entries:', passbookEntries)
      setPassbookData(passbookEntries.sort((a, b) => a.year - b.year))
      
    } catch (error) {
      console.error('Error in fetchPassbookData:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch passbook data',
        variant: 'destructive'
      })
    }
  }

  const fetchNondhDetails = async () => {
    try {
      console.log('Fetching nondh details for recordId:', recordId)
      
      // Get nondhs first
      const { data: nondhs, error: nondhError } = await LandRecordService.getNondhs(recordId)
      if (nondhError) throw nondhError

      if (!nondhs || nondhs.length === 0) {
        console.log('No nondhs found')
        setNondhDetails([])
        setFilteredNondhs([])
        return
      }

      // Get nondh details with relations
      const { data: nondhDetailsWithRelations, error: detailsError } = 
        await LandRecordService.getNondhDetailsWithRelations(recordId)
      
      if (detailsError) throw detailsError

      const processedDetails: NondhDetail[] = []

      // Process each nondh detail
      nondhDetailsWithRelations?.forEach(detail => {
        const nondh = nondhs.find(n => n.id === detail.nondh_id)
        
        processedDetails.push({
          id: detail.id,
          nondhId: detail.nondh_id,
          nondhNumber: Number(nondh?.number || 0),
          sNo: detail.s_no || '',
          type: detail.type || 'Standard',
          reason: detail.reason || detail.vigat || '-',
          status: detail.status || 'Pending',
          vigat: detail.vigat || '',
          hasDocuments: Boolean(detail.document_url),
          showInOutput: Boolean(detail.show_in_output),
          createdAt: detail.created_at || new Date().toISOString()
        })
      })

      console.log('Processed nondh details:', processedDetails)
      setNondhDetails(processedDetails)
      
      // Filter for output display
      const filtered = processedDetails
        .filter(detail => detail.showInOutput)
        .sort((a, b) => a.nondhNumber - b.nondhNumber)
      
      setFilteredNondhs(filtered)
      
    } catch (error) {
      console.error('Error in fetchNondhDetails:', error)
      toast({
        title: 'Error',
        description: 'Failed to fetch nondh details',
        variant: 'destructive'
      })
    }
  }

  const exportToCSV = (data: any[], filename: string) => {
    if (!data || data.length === 0) {
      toast({
        title: 'No Data',
        description: 'No data available to export',
        variant: 'destructive'
      })
      return
    }

    const headers = Object.keys(data[0] || {})
    const csvContent = [
      headers.join(","), 
      ...data.map((row) => 
        headers.map((header) => {
          const value = row[header]
          // Handle values that might contain commas
          return typeof value === 'string' && value.includes(',') 
            ? `"${value}"` 
            : value
        }).join(",")
      )
    ].join("\n")

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    window.URL.revokeObjectURL(url)

    toast({
      title: 'Success',
      description: `${filename}.csv exported successfully`,
    })
  }

  const getFilteredByDate = () => {
    if (!dateFilter) return nondhDetails
    return nondhDetails.filter((nondh) => 
      nondh.createdAt.includes(dateFilter)
    )
  }

  const handleBackToLandMaster = () => {
    router.push('/land-master')
  }

  const renderQueryListCard = (nondh: NondhDetail, index: number) => (
    <Card key={nondh.id || index} className="p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="font-medium text-sm">Nondh #{nondh.nondhNumber}</div>
            <div className="text-muted-foreground text-xs">S.No: {nondh.sNo}</div>
          </div>
          <Badge 
            className={`text-xs ${
              nondh.status === "Valid"
                ? "bg-green-100 text-green-800"
                : nondh.status === "Invalid"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
            }`}
          >
            {nondh.status}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Type:</span>
            <div className="font-medium">{nondh.type}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Documents:</span>
            <div className="font-medium">
              {nondh.hasDocuments ? (
                <Button size="sm" variant="outline" className="h-6 px-2">
                  <Eye className="w-3 h-3" />
                </Button>
              ) : (
                "-"
              )}
            </div>
          </div>
        </div>
        
        <div className="space-y-1">
          <span className="text-muted-foreground text-sm">Reason:</span>
          <div className="text-sm font-medium">{nondh.reason}</div>
        </div>
        
        {nondh.vigat && (
          <div className="space-y-1">
            <span className="text-muted-foreground text-sm">Vigat:</span>
            <div className="text-sm font-medium truncate">{nondh.vigat}</div>
          </div>
        )}
      </div>
    </Card>
  )

  const renderPassbookCard = (entry: PassbookEntry, index: number) => (
    <Card key={index} className="p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="font-medium text-sm">{entry.ownerName}</div>
            <div className="text-muted-foreground text-xs">Year: {entry.year}</div>
          </div>
          <Badge variant="outline" className="text-xs">
            #{entry.nondhNumber || "-"}
          </Badge>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">S.No:</span>
            <div className="font-medium">{entry.sNo}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Area:</span>
            <div className="font-medium">{entry.area?.toFixed(2)} sq.m</div>
          </div>
        </div>
      </div>
    </Card>
  )

  const renderDateWiseCard = (nondh: NondhDetail, index: number) => (
    <Card key={nondh.id || index} className="p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="font-medium text-sm">Nondh #{nondh.nondhNumber}</div>
            <div className="text-muted-foreground text-xs">
              {new Date(nondh.createdAt).toLocaleDateString()}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge 
              className={`text-xs ${
                nondh.status === "Valid"
                  ? "bg-green-100 text-green-800"
                  : nondh.status === "Invalid"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
              }`}
            >
              {nondh.status}
            </Badge>
            <span className={`text-xs ${nondh.showInOutput ? "text-green-600" : "text-red-600"}`}>
              {nondh.showInOutput ? "In Output" : "Not in Output"}
            </span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">S.No:</span>
            <div className="font-medium">{nondh.sNo}</div>
          </div>
          <div>
            <span className="text-muted-foreground">Type:</span>
            <div className="font-medium">{nondh.type}</div>
          </div>
        </div>
      </div>
    </Card>
  )

  if (loading) {
    return (
      <Card className="w-full max-w-none">
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Step 6: Output Views & Reports</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading output data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-none">
      <CardHeader>
        <CardTitle className="text-lg sm:text-xl">Step 6: Output Views & Reports</CardTitle>
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <Tabs defaultValue="query-list" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="query-list" className="text-xs sm:text-sm">Query List</TabsTrigger>
            <TabsTrigger value="passbook" className="text-xs sm:text-sm">Passbook</TabsTrigger>
            <TabsTrigger value="date-wise" className="text-xs sm:text-sm">Date-wise</TabsTrigger>
          </TabsList>

          <TabsContent value="query-list" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h3 className="text-base sm:text-lg font-semibold">
                Nondhs Marked for Output ({filteredNondhs.length})
              </h3>
              <Button 
                onClick={() => exportToCSV(filteredNondhs, "query-list")} 
                className="flex items-center gap-2 w-full sm:w-auto"
                disabled={filteredNondhs.length === 0}
                size="sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            {filteredNondhs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No nondhs marked for output display</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Nondh No.</TableHead>
                        <TableHead>S.No</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Vigat</TableHead>
                        <TableHead>Documents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredNondhs.map((nondh, index) => (
                        <TableRow key={nondh.id || index}>
                          <TableCell>{nondh.nondhNumber}</TableCell>
                          <TableCell>{nondh.sNo}</TableCell>
                          <TableCell>{nondh.type}</TableCell>
                          <TableCell>{nondh.reason}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                nondh.status === "Valid"
                                  ? "bg-green-100 text-green-800"
                                  : nondh.status === "Invalid"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {nondh.status}
                            </span>
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {nondh.vigat || "-"}
                          </TableCell>
                          <TableCell>
                            {nondh.hasDocuments ? (
                              <Button size="sm" variant="outline">
                                <Eye className="w-4 h-4" />
                              </Button>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {filteredNondhs.map(renderQueryListCard)}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="passbook" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <h3 className="text-base sm:text-lg font-semibold">
                Passbook View ({passbookData.length} entries)
              </h3>
              <Button 
                onClick={() => exportToCSV(passbookData, "passbook")} 
                className="flex items-center gap-2 w-full sm:w-auto"
                disabled={passbookData.length === 0}
                size="sm"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

            {passbookData.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">No passbook data available</p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Year</TableHead>
                        <TableHead>Land Owner</TableHead>
                        <TableHead>Area (sq.m)</TableHead>
                        <TableHead>S.No</TableHead>
                        <TableHead>Nondh Number</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {passbookData.map((entry, index) => (
                        <TableRow key={index}>
                          <TableCell>{entry.year}</TableCell>
                          <TableCell>{entry.ownerName}</TableCell>
                          <TableCell>{entry.area?.toFixed(2)}</TableCell>
                          <TableCell>{entry.sNo}</TableCell>
                          <TableCell>{entry.nondhNumber || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {passbookData.map(renderPassbookCard)}
                </div>
              </>
            )}
          </TabsContent>

          <TabsContent value="date-wise" className="space-y-4">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <h3 className="text-base sm:text-lg font-semibold">
                  Date-wise All Nondhs ({getFilteredByDate().length})
                </h3>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4" />
                    <Label htmlFor="date-filter" className="text-sm whitespace-nowrap">Filter by Date:</Label>
                    <Input
                      id="date-filter"
                      type="date"
                      value={dateFilter}
                      onChange={(e) => setDateFilter(e.target.value)}
                      className="w-full sm:w-40"
                    />
                  </div>
                  <Button
                    onClick={() => exportToCSV(getFilteredByDate(), "date-wise-nondhs")}
                    className="flex items-center gap-2 w-full sm:w-auto"
                    disabled={getFilteredByDate().length === 0}
                    size="sm"
                  >
                    <Download className="w-4 h-4" />
                    Export CSV
                  </Button>
                </div>
              </div>
            </div>

            {getFilteredByDate().length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-500 text-sm">
                  {dateFilter ? 'No nondhs found for selected date' : 'No nondh details available'}
                </p>
              </div>
            ) : (
              <>
                {/* Desktop Table */}
                <div className="hidden lg:block rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Nondh No.</TableHead>
                        <TableHead>S.No</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Show in Output</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredByDate().map((nondh, index) => (
                        <TableRow key={nondh.id || index}>
                          <TableCell>
                            {new Date(nondh.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>{nondh.nondhNumber}</TableCell>
                          <TableCell>{nondh.sNo}</TableCell>
                          <TableCell>{nondh.type}</TableCell>
                          <TableCell>
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                nondh.status === "Valid"
                                  ? "bg-green-100 text-green-800"
                                  : nondh.status === "Invalid"
                                    ? "bg-red-100 text-red-800"
                                    : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {nondh.status}
                            </span>
                          </TableCell>
                          <TableCell>
                            {nondh.showInOutput ? (
                              <span className="text-green-600 text-sm">Yes</span>
                            ) : (
                              <span className="text-red-600 text-sm">No</span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile Cards */}
                <div className="lg:hidden space-y-3">
                  {getFilteredByDate().map(renderDateWiseCard)}
                </div>
              </>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex flex-col sm:flex-row sm:justify-between items-stretch sm:items-center gap-4 mt-6 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(5)}
            className="flex items-center justify-center gap-2 w-full sm:w-auto"
            size="sm"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Step 5
          </Button>
          
          <Button 
            onClick={handleBackToLandMaster}
            className="w-full sm:w-auto"
            size="sm"
          >
            Back to Land Master
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
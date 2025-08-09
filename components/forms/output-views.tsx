"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Download, Eye } from "lucide-react"
import { useLandRecord } from "@/contexts/land-record-context"
import { convertToSquareMeters } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/lib/supabase"
import { useRouter } from "next/navigation"

interface PassbookEntry {
  year: number
  ownerName: string
  area: number
  sNo: string
  nondhNumber: number
  createdAt: string
}

export default function OutputViews() {
  const { yearSlabs, panipatraks, nondhs, nondhDetails, setCurrentStep } = useLandRecord()
  const { toast } = useToast()
  const router = useRouter()
  const [passbookData, setPassbookData] = useState<PassbookEntry[]>([])
  const [filteredNondhs, setFilteredNondhs] = useState<any[]>([])
  const [dateFilter, setDateFilter] = useState("")

  useEffect(() => {
    fetchPassbookData()
    generateFilteredNondhs()
  }, [yearSlabs, panipatraks, nondhs, nondhDetails])

  const fetchPassbookData = async () => {
  try {
    console.log('Starting to fetch passbook data...');
    
    // Get all nondh detail IDs from nondhDetails context
    const nondhDetailIds = nondhDetails.map(detail => detail.id);
    console.log('nondhDetails IDs from context:', nondhDetailIds);

    if (nondhDetailIds.length === 0) {
      console.log('No nondh details found in context');
      setPassbookData([]);
      return;
    }

    // First, let's find the nondh_ids from our context nondhDetails
    const nondhIds = nondhDetails.map(detail => detail.nondhId);
    console.log('Nondh IDs from context:', nondhIds);

    // Method 1: Try to match using the context IDs directly
    let { data: ownerRelations, error: relationsError } = await supabase
      .from('nondh_owner_relations')
      .select(`
        owner_name,
        s_no,
        acres,
        gunthas,
        square_meters,
        area_unit,
        is_valid,
        created_at,
        nondh_detail_id
      `)
      .in('nondh_detail_id', nondhDetailIds)
      .or('is_valid.eq.true,is_valid.eq.TRUE');

    console.log('Direct match results:', ownerRelations?.length || 0);

    // Method 2: If no direct match, try to find via nondh_details table
    if (!ownerRelations || ownerRelations.length === 0) {
      console.log('No direct match found, trying to find via nondh_details...');
      
      // Get all nondh_details that belong to our nondhs
      const { data: allNondhDetails, error: detailsError } = await supabase
        .from('nondh_details')
        .select('id, nondh_id')
        .in('nondh_id', nondhIds);

      console.log('All nondh_details for our nondhs:', allNondhDetails);

      if (allNondhDetails && allNondhDetails.length > 0) {
        const allDetailIds = allNondhDetails.map(detail => detail.id);
        console.log('All detail IDs for our nondhs:', allDetailIds);

        // Now fetch owner relations for all these details
        const { data: allOwnerRelations, error: allRelationsError } = await supabase
          .from('nondh_owner_relations')
          .select(`
            owner_name,
            s_no,
            acres,
            gunthas,
            square_meters,
            area_unit,
            is_valid,
            created_at,
            nondh_detail_id
          `)
          .in('nondh_detail_id', allDetailIds)
          .or('is_valid.eq.true,is_valid.eq.TRUE');

        ownerRelations = allOwnerRelations;
        relationsError = allRelationsError;
        console.log('Found owner relations via nondh lookup:', ownerRelations?.length || 0);
      }
    }

    if (relationsError) {
      console.error('Error fetching owner relations:', relationsError);
      throw relationsError;
    }

    if (!ownerRelations || ownerRelations.length === 0) {
      console.log('No owner relations found for any method');
      setPassbookData([]);
      return;
    }

    // Process the data - we need to map back to get nondh numbers
    const passbookEntries = [];

    for (const relation of ownerRelations) {
      // Find which nondh this detail belongs to
      const { data: detailInfo, error: detailError } = await supabase
        .from('nondh_details')
        .select('nondh_id')
        .eq('id', relation.nondh_detail_id)
        .single();

      if (detailError) {
        console.warn('Could not find detail info for:', relation.nondh_detail_id);
        continue;
      }

      // Find the nondh number from context
      const nondh = nondhs.find(n => n.id === detailInfo.nondh_id);
      const nondhNumber = Number(nondh?.number || 0);

      // Calculate area
      let area = 0;
      if (relation.area_unit === 'acre_guntha') {
        const totalGunthas = (relation.acres || 0) * 40 + (relation.gunthas || 0);
        area = convertToSquareMeters(totalGunthas, 'guntha');
      } else {
        area = relation.square_meters || 0;
      }

      console.log(`Processing: Owner ${relation.owner_name}, Nondh ${nondhNumber}, Area ${area}`);

      passbookEntries.push({
        year: new Date(relation.created_at).getFullYear(),
        ownerName: relation.owner_name || '',
        area,
        sNo: relation.s_no || '',
        nondhNumber,
        createdAt: relation.created_at || ''
      });
    }

    console.log('Final passbook entries:', passbookEntries);
    setPassbookData(passbookEntries.sort((a, b) => a.year - b.year));
    
  } catch (error) {
    console.error('Error in fetchPassbookData:', error);
    toast({
      title: 'Error',
      description: 'Failed to fetch passbook data',
      variant: 'destructive'
    });
  }
};
  const generateFilteredNondhs = () => {
    const filtered = nondhDetails
      .filter((detail) => detail.showInOutput)
      .map((detail) => {
        const nondh = nondhs.find((n) => n.id === detail.nondhId)
        return {
          ...detail,
          nondhNumber: nondh?.number || 0,
          createdAt: new Date().toISOString().split("T")[0], // Mock date
          reason: detail.reason || detail.vigat || "-" // Use reason or vigat as fallback
        }
      })
      .sort((a, b) => a.nondhNumber - b.nondhNumber)

    setFilteredNondhs(filtered)
  }

  const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0] || {})
    const csvContent = [headers.join(","), ...data.map((row) => headers.map((header) => row[header]).join(","))].join(
      "\n",
    )

    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  const getFilteredByDate = () => {
    if (!dateFilter) return filteredNondhs
    return filteredNondhs.filter((nondh) => nondh.createdAt.includes(dateFilter))
  }

  const handleCompleteProcess = () => {
    toast({ title: "Land record process completed successfully!" })
    router.push('/land-master')
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 6: Output Views & Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="query-list" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="query-list">Query List</TabsTrigger>
            <TabsTrigger value="passbook">Passbook</TabsTrigger>
            <TabsTrigger value="date-wise">Date-wise Nondhs</TabsTrigger>
          </TabsList>

          <TabsContent value="query-list" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Nondhs Marked for Output</h3>
              <Button onClick={() => exportToCSV(filteredNondhs, "query-list")} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

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
                  <TableRow key={index}>
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
                    <TableCell className="max-w-xs truncate">{nondh.vigat || "-"}</TableCell>
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
          </TabsContent>

          <TabsContent value="passbook" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Passbook View</h3>
              <Button onClick={() => exportToCSV(passbookData, "passbook")} className="flex items-center gap-2">
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>

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
          </TabsContent>

          <TabsContent value="date-wise" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Date-wise All Nondhs</h3>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Label htmlFor="date-filter">Filter by Date:</Label>
                  <Input
                    id="date-filter"
                    type="date"
                    value={dateFilter}
                    onChange={(e) => setDateFilter(e.target.value)}
                    className="w-40"
                  />
                </div>
                <Button
                  onClick={() => exportToCSV(getFilteredByDate(), "date-wise-nondhs")}
                  className="flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>

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
                  <TableRow key={index}>
                    <TableCell>{nondh.createdAt}</TableCell>
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
                        <span className="text-green-600">Yes</span>
                      ) : (
                        <span className="text-red-600">No</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>

        <div className="flex justify-center mt-6">
          <Button onClick={handleCompleteProcess}>
            Complete Process
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
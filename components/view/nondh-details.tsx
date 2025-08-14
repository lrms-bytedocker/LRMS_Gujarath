"use client"
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Eye, ChevronDown, ChevronUp, Badge } from "lucide-react"
import { useLandRecord } from "@/contexts/land-record-context"
import { useToast } from "@/hooks/use-toast"
import { LandRecordService } from "@/lib/supabase"

const nondhTypes = [
  "Kabjedaar",
  "Ekatrikaran",
  "Varsai",
  "Hayati_ma_hakh_dakhal",
  "Hakkami",
  "Vechand",
  "Durasti",
  "Promulgation",
  "Hukam",
  "Vehchani",
  "Bojo",
  "Other",
]

const statusTypes = [
  { value: "valid", label: "Valid" },
  { value: "invalid", label: "Invalid" },
  { value: "nullified", label: "Nullified" }
]

export default function NondhDetailsView() {
  const { landBasicInfo } = useLandRecord()
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [nondhs, setNondhs] = React.useState<any[]>([])
  const [nondhDetails, setNondhDetails] = React.useState<any[]>([])
  const [collapsedNondhs, setCollapsedNondhs] = React.useState<Set<string>>(new Set())
  const [documents712, setDocuments712] = React.useState<any[]>([])

  React.useEffect(() => {
    const fetchData = async () => {
      if (!landBasicInfo?.id) return

      try {
        setLoading(true)
        
        // Fetch nondhs
        const { data: nondhData, error: nondhError } = await LandRecordService.getNondhs(landBasicInfo.id)
        if (nondhError) throw nondhError
        setNondhs(nondhData || [])

        // Fetch nondh details
        const { data: detailData, error: detailError } = await LandRecordService.getNondhDetails(landBasicInfo.id)
        if (detailError) throw detailError
        setNondhDetails(detailData || [])

        // Fetch 7/12 documents
        const { data: docData, error: docError } = await LandRecordService.get712Documents(landBasicInfo.id)
        if (docError) throw docError
        setDocuments712(docData || [])

      } catch (error) {
        console.error('Error loading data:', error)
        toast({
          title: "Error loading data",
          description: "Could not load nondh data from database",
          variant: "destructive"
        })
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [landBasicInfo?.id, toast])

  const toggleCollapse = (nondhId: string) => {
    setCollapsedNondhs(prev => {
      const newSet = new Set(prev)
      if (newSet.has(nondhId)) {
        newSet.delete(nondhId)
      } else {
        newSet.add(nondhId)
      }
      return newSet
    })
  }

  const getNondhNumber = (nondh: any): number => {
  if (typeof nondh.number === 'number') return nondh.number;
  const num = parseInt(nondh.number, 10);
  return isNaN(num) ? 0 : num;
};
  const getSNoTypesFromSlabs = () => {
    const sNoTypes = new Map<string, "s_no" | "block_no" | "re_survey_no">();
    // This would need to be implemented based on your actual data structure
    return sNoTypes
  }

  const sortNondhs = (a: any, b: any): number => {
  // Get primary types
  const aType = getPrimarySNoType(a.affectedSNos);
  const bType = getPrimarySNoType(b.affectedSNos);

  // Priority order
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  const aPriority = priorityOrder.indexOf(aType);
  const bPriority = priorityOrder.indexOf(bType);

  // First sort by primary type
  if (aPriority !== bPriority) return aPriority - bPriority;

  // For same type, sort by first affected S.No numerically
  const aFirstSNo = a.affectedSNos[0] || '';
  const bFirstSNo = b.affectedSNos[0] || '';
  const sNoCompare = aFirstSNo.localeCompare(bFirstSNo, undefined, { numeric: true });
  if (sNoCompare !== 0) return sNoCompare;

  // Finally sort by nondh number if S.Nos are same
  return getNondhNumber(a) - getNondhNumber(b);
};

  const getPrimarySNoType = (affectedSNos: string[]) => {
    const sNoTypes = getSNoTypesFromSlabs();
    const types = affectedSNos.map(sNo => sNoTypes.get(sNo) || 's_no');
    if (types.includes('s_no')) return 's_no';
    if (types.includes('block_no')) return 'block_no';
    return 're_survey_no';
  }

  const formatArea = (area: any) => {
    if (!area) return "N/A"
    if (area.unit === 'sq_m') {
      return `${area.value} sq.m`
    } else {
      return `${area.acres || 0} acres ${area.gunthas || 0} gunthas`
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nondh Details</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nondh Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* 7/12 Documents Table */}
        {documents712.length > 0 && (
          <Card className="p-4">
            <h3 className="text-lg font-semibold mb-4">Available 7/12 Documents</h3>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Year</TableHead>
                  <TableHead>S.No</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {documents712.map((doc, index) => (
                  <TableRow key={index}>
                    <TableCell>{doc.year}</TableCell>
                    <TableCell>{doc.s_no}</TableCell>
                    <TableCell>{doc.type}</TableCell>
                    <TableCell>{formatArea(doc.area)}</TableCell>
                    <TableCell>
                      <Button size="sm" variant="outline" asChild>
                        <a href={doc.url} target="_blank" rel="noopener noreferrer">
                          <Eye className="w-4 h-4 mr-2" />
                          View
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {/* Nondh Details */}
        {nondhs
          .sort(sortNondhs)
          .map(nondh => {
            const detail = nondhDetails.find(d => d.nondh_id === nondh.id)
            if (!detail) return null

            return (
              <Card key={nondh.id} className="p-4 mb-6">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold">
                        Nondh No: {nondh.number}
                      </h3>
                      <Badge variant={detail.status === 'invalid' ? 'destructive' : 'default'}>
                        {statusTypes.find(s => s.value === detail.status)?.label || 'Unknown'}
                      </Badge>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Affected Survey Numbers:
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {nondh.affected_s_nos?.map((sNo: string) => {
                          const type = getPrimarySNoType([sNo])
                          const typeLabel = 
                            type === 'block_no' ? 'Block No' :
                            type === 're_survey_no' ? 'Resurvey No' : 'Survey No'
                          
                          return (
                            <span 
                              key={sNo} 
                              className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm flex items-center gap-1"
                            >
                              <span className="font-medium">{typeLabel}:</span>
                              <span>{sNo}</span>
                            </span>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleCollapse(nondh.id)}
                    className="flex items-center gap-1"
                  >
                    {collapsedNondhs.has(nondh.id) ? (
                      <>
                        <ChevronDown className="w-4 h-4" />
                        <span>Show Details</span>
                      </>
                    ) : (
                      <>
                        <ChevronUp className="w-4 h-4" />
                        <span>Hide Details</span>
                      </>
                    )}
                  </Button>
                </div>

                {!collapsedNondhs.has(nondh.id) && (
                  <div className="mt-4 space-y-4">
                    <div className="border rounded-lg p-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                        <div>
                          <Label>Nondh Type</Label>
                          <p className="mt-1">{detail.type}</p>
                        </div>
                        <div>
                          <Label>Date</Label>
                          <p className="mt-1">{detail.date || 'N/A'}</p>
                        </div>
                        <div>
                          <Label>Status</Label>
                          <p className="mt-1">{statusTypes.find(s => s.value === detail.status)?.label || 'Unknown'}</p>
                        </div>
                        {detail.status === "invalid" && (
                          <div>
                            <Label>Invalid Reason</Label>
                            <p className="mt-1">{detail.invalid_reason || 'N/A'}</p>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2 mb-4">
                        <Label>Reason</Label>
                        <p className="mt-1">{detail.reason || 'N/A'}</p>
                      </div>

                      <div className="space-y-2 mb-4">
                        <Label>Vigat</Label>
                        <p className="mt-1">{detail.vigat || 'N/A'}</p>
                      </div>

                      {detail.has_documents && detail.doc_upload_url && (
                        <div className="space-y-2 mb-4">
                          <Label>Documents</Label>
                          <Button variant="outline" asChild>
                            <a href={detail.doc_upload_url} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4 mr-2" />
                              View Document
                            </a>
                          </Button>
                        </div>
                      )}

                      {/* Owner Relations */}
                      <div className="space-y-4">
                        <Label>Owner Relations</Label>
                        {detail.owner_relations?.map((relation: any, index: number) => (
                          <Card key={index} className="p-4">
                            <h4 className="font-medium mb-3">Owner {index + 1}</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div>
                                <Label>Owner Name</Label>
                                <p className="mt-1">{relation.owner_name}</p>
                              </div>
                              <div>
                                <Label>Area</Label>
                                <p className="mt-1">{formatArea({
                                  value: relation.square_meters || 
                                        (relation.acres * 4046.86 + relation.gunthas * 101.17),
                                  unit: relation.area_unit,
                                  acres: relation.acres,
                                  gunthas: relation.gunthas
                                })}</p>
                              </div>
                              <div>
                                <Label>Tenure</Label>
                                <p className="mt-1">{relation.tenure || 'N/A'}</p>
                              </div>
                            </div>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </Card>
            )
          })}
      </CardContent>
    </Card>
  )
}
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
import { record } from 'zod'

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

const SQM_PER_GUNTHA = 101.17;
const SQM_PER_ACRE = 4046.86;
const GUNTHAS_PER_ACRE = 40;

export default function NondhDetails() {
  const { landBasicInfo, yearSlabs, recordId } = useLandRecord()
  const { toast } = useToast()
  const [loading, setLoading] = React.useState(true)
  const [nondhs, setNondhs] = React.useState<any[]>([])
  const [nondhDetails, setNondhDetails] = React.useState<any[]>([])
  const [collapsedNondhs, setCollapsedNondhs] = React.useState<Set<string>>(new Set())
  const [documents712, setDocuments712] = React.useState<any[]>([])
  const [debugLogs, setDebugLogs] = React.useState<string[]>([])

  // Add debug log function - using useCallback to prevent re-renders
  const addDebugLog = React.useCallback((message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    const logMessage = `[${timestamp}] ${message}`
    console.log(logMessage)
    setDebugLogs(prev => [...prev, logMessage])
  }, [])

  // Debug logs display effect
  React.useEffect(() => {
    if (debugLogs.length > 0) {
      console.log("=== DEBUG LOGS ===")
      debugLogs.forEach(log => console.log(log))
    }
  }, [debugLogs])

  React.useEffect(() => {
    addDebugLog("NondhDetails component mounted")
    addDebugLog(`landBasicInfo: ${JSON.stringify(landBasicInfo)}`)
    
    const fetchData = async () => {
      addDebugLog("fetchData function called")
      
      if (!recordId) {
        addDebugLog("No landBasicInfo.id found, returning early")
        setLoading(false)
        return;
      }

      addDebugLog(`Starting data fetch for landRecordId: ${recordId}`)

      try {
        setLoading(true);
        
        // Fetch nondhs
        addDebugLog("Fetching nondhs...")
        const { data: nondhData, error: nondhError } = await LandRecordService.getNondhsforDetails(recordId);
        addDebugLog(`Nondhs fetch result - Data: ${JSON.stringify(nondhData)}, Error: ${JSON.stringify(nondhError)}`)
        
        if (nondhError) {
          addDebugLog(`Nondh fetch error: ${JSON.stringify(nondhError)}`)
          throw nondhError;
        }
        
        setNondhs(nondhData || []);
        addDebugLog(`Set nondhs state with ${(nondhData || []).length} items`)

        // Fetch nondh details WITH relations in one query
        addDebugLog("Fetching nondh details with relations...")
       // Replace the detailData fetch with:
const { data: detailData, error: detailError } = await LandRecordService.getNondhDetailsWithRelations(recordId);
        addDebugLog(`Details fetch result - Data: ${JSON.stringify(detailData)}, Error: ${JSON.stringify(detailError)}`)
        
        if (detailError) {
          addDebugLog(`Detail fetch error: ${JSON.stringify(detailError)}`)
          throw detailError;
        }

        addDebugLog(`Raw detail data length: ${(detailData || []).length}`)

        // Transform the data for the view
const transformedDetails = (detailData || []).map((detail: any) => {
  return {
    id: detail.id,
    nondhId: detail.nondh_id,
    sNo: detail.s_no,
    type: detail.type,
    reason: detail.reason || "",
    date: detail.date || "",
    vigat: detail.vigat || "",
    status: detail.status || "valid",
    invalidReason: detail.invalid_reason || "",
    showInOutput: detail.show_in_output !== false,
    hasDocuments: detail.has_documents || false,
    docUpload: detail.doc_upload_url || "",
    oldOwner: detail.old_owner || "",
    hukamStatus: detail.hukam_status || "valid",
    hukamInvalidReason: detail.hukam_invalid_reason || "",
    affectedNondhNo: detail.affected_nondh_no || "",
    ownerRelations: (detail.owner_relations || []).map((rel: any) => ({
      id: rel.id,
      ownerName: rel.owner_name,
      sNo: rel.s_no,
      area: {
        value: rel.area_value,
        unit: rel.area_unit,
        acres: rel.acres,
        gunthas: rel.gunthas
      },
      tenure: rel.tenure || "Navi",
      hukamType: rel.hukam_type || "",
      hukamDate: rel.hukam_date || "",
      restrainingOrder: rel.restraining_order ? 'yes' : 'no',
      isValid: rel.is_valid !== false
    }))
  };
});

        addDebugLog(`Transformed ${transformedDetails.length} details`)
        setNondhDetails(transformedDetails);

        // Fetch 7/12 documents
        addDebugLog("Fetching 7/12 documents...")
        const { data: docData, error: docError } = await LandRecordService.get712Documents(recordId);
        addDebugLog(`Documents fetch result - Data: ${JSON.stringify(docData)}, Error: ${JSON.stringify(docError)}`)
        
        if (docError) {
          addDebugLog(`Document fetch error: ${JSON.stringify(docError)}`)
          throw docError;
        }
        
        setDocuments712(docData || []);
        addDebugLog(`Set documents712 state with ${(docData || []).length} items`)

        addDebugLog("All data fetched successfully")

      } catch (error) {
        addDebugLog(`Error in fetchData: ${JSON.stringify(error)}`)
        console.error('Error loading data:', error);
        toast({
          title: "Error loading data",
          description: `Could not load nondh data from database: ${error}`,
          variant: "destructive"
        });
      } finally {
        addDebugLog("Setting loading to false")
        setLoading(false);
      }
    }

    fetchData()
  }, [recordId, toast])

  const toggleCollapse = (nondhId: string) => {
    addDebugLog(`Toggling collapse for nondh: ${nondhId}`)
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
    
    yearSlabs.forEach(slab => {
      if (slab.sNo) {
        sNoTypes.set(slab.sNo, slab.sNoType);
      }
    });
    
    yearSlabs.forEach(slab => {
      slab.paikyEntries.forEach(entry => {
        if (entry.sNo) {
          sNoTypes.set(entry.sNo, entry.sNoType);
        }
      });
    });
    
    yearSlabs.forEach(slab => {
      slab.ekatrikaranEntries.forEach(entry => {
        if (entry.sNo) {
          sNoTypes.set(entry.sNo, entry.sNoType);
        }
      });
    });
    
    return sNoTypes;
  }

  const getPrimarySNoType = (affectedSNos: string[]) => {
  const sNoTypes = getSNoTypesFromSlabs();
  // Find the most specific type among all affected S.Nos
  const types = affectedSNos.map(sNo => sNoTypes.get(sNo) || 's_no');
  
  if (types.includes('re_survey_no')) return 're_survey_no';
  if (types.includes('block_no')) return 'block_no';
  return 's_no';
}

const sortNondhs = (a: any, b: any): number => {
  // Get primary types
  const aType = getPrimarySNoType(a.affected_s_nos || []);
  const bType = getPrimarySNoType(b.affected_s_nos || []);

  // Priority order (reverse of what we had before)
  const priorityOrder = ['re_survey_no', 'block_no', 's_no'];
  const aPriority = priorityOrder.indexOf(aType);
  const bPriority = priorityOrder.indexOf(bType);

  // First sort by primary type
  if (aPriority !== bPriority) return aPriority - bPriority;

  // For same type, sort by first affected S.No numerically
  const aFirstSNo = (a.affected_s_nos && a.affected_s_nos[0]) || '';
  const bFirstSNo = (b.affected_s_nos && b.affected_s_nos[0]) || '';
  
  // Numeric comparison for S.Nos
  const aNum = parseInt(aFirstSNo, 10) || 0;
  const bNum = parseInt(bFirstSNo, 10) || 0;
  if (aNum !== bNum) return aNum - bNum;

  // Finally sort by nondh number if S.Nos are same
  return getNondhNumber(a) - getNondhNumber(b);
};

  const formatArea = (area: { value: number, unit: string }) => {
  if (!area) return "N/A";
  
  if (area.unit === 'sq_m') {
    return `${area.value} sq.m`;
  } else if (area.unit === 'acre') {
    return `${area.value} acres`;
  } else if (area.unit === 'guntha') {
    return `${area.value} gunthas`;
  }
  return "N/A";
};

  
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nondh Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
          
          {/* Debug Information */}
          <Card className="p-4 bg-yellow-50 border-yellow-200">
            <h4 className="font-semibold text-yellow-800 mb-2">Debug Information</h4>
            <div className="space-y-1 text-sm text-yellow-700 max-h-40 overflow-y-auto">
              {debugLogs.map((log, index) => (
                <div key={index} className="font-mono text-xs">{log}</div>
              ))}
            </div>
          </Card>
        </CardContent>
      </Card>
    )
  }

  // Show debug info even when loaded
  const hasData = nondhs.length > 0 || nondhDetails.length > 0 || documents712.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nondh Details</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">

        {!hasData && (
          <Card className="p-8 text-center">
            <h3 className="text-lg font-medium text-gray-600">No Data Available</h3>
            <p className="text-sm text-gray-500 mt-2">
              No nondh details or documents found for this land record.
            </p>
          </Card>
        )}

        {/* 7/12 Documents Table */}
{/* {documents712.length > 0 && (
  <Card className="p-4">
    <h3 className="text-lg font-semibold mb-4">Available 7/12 Documents</h3>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Year Range</TableHead>
          <TableHead>S.No Type</TableHead>
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
            <TableCell>
              {doc.s_no_type === 'block_no' ? 'Block No' : 
               doc.s_no_type === 're_survey_no' ? 'Resurvey No' : 'Survey No'}
            </TableCell>
            <TableCell>{doc.s_no}</TableCell>
            <TableCell>
              {doc.type === 'main' ? 'Main' : 
               doc.type === 'paiky' ? 'Paiky' : 'Ekatrikaran'}
            </TableCell>
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
)} */}

        {/* Nondh Details */}
        {nondhs
          .sort(sortNondhs)
          .map(nondh => {
            const detail = nondhDetails.find(d => d.nondhId === nondh.id)
            // Don't call addDebugLog here - it causes infinite re-renders
            
            if (!detail) {
              return (
                <Card key={nondh.id} className="p-4 mb-6 border-orange-200 bg-orange-50">
                  <div className="text-orange-800">
                    <h3 className="text-lg font-semibold">Nondh No: {nondh.number}</h3>
                    <p className="text-sm mt-2">No details found for this nondh</p>
                    <p className="text-xs mt-1">Nondh ID: {nondh.id}</p>
                  </div>
                </Card>
              )
            }

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
                            <p className="mt-1">{detail.invalidReason || 'N/A'}</p>
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

                      {detail.hasDocuments && detail.docUpload && (
                        <div className="space-y-2 mb-4">
                          <Label>Documents</Label>
                          <Button variant="outline" asChild>
                            <a href={detail.docUpload} target="_blank" rel="noopener noreferrer">
                              <Eye className="w-4 h-4 mr-2" />
                              View Document
                            </a>
                          </Button>
                        </div>
                      )}

                      {/* Owner Relations */}
                      <div className="space-y-4">
                        <Label>Owner Relations</Label>
                        {detail.ownerRelations?.length > 0 ? (
                          detail.ownerRelations.map((relation: any, index: number) => (
                            <Card key={index} className="p-4">
                              <h4 className="font-medium mb-3">Owner {index + 1}</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label>Owner Name</Label>
                                  <p className="mt-1">{relation.ownerName}</p>
                                </div>
                                <div>
                                  <Label>Area</Label>
                                  <p className="mt-1">{formatArea(relation.area)}</p>
                                </div>
                                <div>
                                  <Label>Tenure</Label>
                                  <p className="mt-1">{relation.tenure || 'N/A'}</p>
                                </div>
                              </div>
                            </Card>
                          ))
                        ) : (
                          <p className="text-gray-500 text-sm">No owner relations found</p>
                        )}
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
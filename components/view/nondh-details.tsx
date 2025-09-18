"use client"
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Eye, ChevronDown, ChevronUp, Badge } from "lucide-react"
import { useLandRecord } from "@/contexts/land-record-context"
import { useToast } from "@/hooks/use-toast"
import { LandRecordService } from "@/lib/supabase"

const SQM_PER_GUNTHA = 101.17;
const SQM_PER_ACRE = 4046.86;

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

  // Helper function to get status label
  const getStatusLabel = (status: string): string => {
    switch (status) {
      case 'valid':
        return 'Pramaanik'
      case 'nullified':
        return 'Na Manjoor'
      case 'invalid':
        return 'Radd'
      default:
        return 'Pramaanik'
    }
  }

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
            tenure: detail.tenure || "Navi",
            hukamDate: detail.hukam_date || "",
            hukamType: detail.hukam_type || "SSRD",
            ganot: detail.ganot || "",
            restrainingOrder: detail.restraining_order || "no",
            sdDate: detail.sd_date || "",
            amount: detail.amount || null,
            affectedNondhDetails: detail.affected_nondh_details 
              ? JSON.parse(detail.affected_nondh_details) 
              : [],
            ownerRelations: (detail.owner_relations || []).map((rel: any) => ({
              id: rel.id,
              ownerName: rel.owner_name,
              sNo: rel.s_no,
             area: {
  value: rel.square_meters || (rel.acres * SQM_PER_ACRE + rel.gunthas * SQM_PER_GUNTHA),
  unit: rel.area_unit as 'acre_guntha' | 'sq_m',
  acres: rel.acres,
  gunthas: rel.gunthas
},
              isValid: rel.is_valid !== false,
              // Add new fields for owner relations
              surveyNumber: rel.survey_number || "",
              surveyNumberType: rel.survey_number_type || "s_no"
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

const getPrimarySNoType = (affectedSNos: string[]): string => {
  if (!affectedSNos || affectedSNos.length === 0) return 's_no';
  
  // Priority order: s_no > block_no > re_survey_no
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  
  // Parse the stringified JSON objects to get the actual types
  const types = affectedSNos.map(sNoStr => {
    try {
      const parsed = JSON.parse(sNoStr);
      return parsed.type || 's_no';
    } catch (e) {
      return 's_no'; // fallback
    }
  });
  
  // Find the highest priority type present
  for (const type of priorityOrder) {
    if (types.includes(type)) {
      return type;
    }
  }
  
  return 's_no'; // default
};

  const sortNondhs = (a: any, b: any): number => {
  // Get primary types from affected_s_nos
  const aType = getPrimarySNoType(a.affected_s_nos);
  const bType = getPrimarySNoType(b.affected_s_nos);

  // Priority order: s_no > block_no > re_survey_no
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  const aPriority = priorityOrder.indexOf(aType);
  const bPriority = priorityOrder.indexOf(bType);

  // First sort by primary type priority
  if (aPriority !== bPriority) return aPriority - bPriority;

  // Within same type group, sort by nondh number (ascending)
  const aNum = parseInt(a.number.toString()) || 0;
  const bNum = parseInt(b.number.toString()) || 0;
  return aNum - bNum;
};
  const formatArea = (area: { value: number, unit: string, acres?: number, gunthas?: number }) => {
    if (!area) return "N/A";
    
    if (area.unit === 'acre_guntha' && area.acres !== undefined && area.gunthas !== undefined) {
      return `${area.acres} acres ${area.gunthas} gunthas`;
    } else if (area.unit === 'sq_m') {
      return `${area.value} sq.m`;
    } else if (area.unit === 'acre') {
      return `${area.value} acres`;
    } else if (area.unit === 'guntha') {
      return `${area.value} gunthas`;
    }
    return `${area.value} ${area.unit}`;
  };

  const renderTypeSpecificDetails = (detail: any) => {
    return (
      <div className="space-y-4">
        {/* Vechand specific fields */}
        {detail.type === "Vechand" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {detail.sdDate && (
              <div>
                <Label>SD Date</Label>
                <p className="mt-1">{detail.sdDate}</p>
              </div>
            )}
            {detail.amount && (
              <div>
                <Label>Amount</Label>
                <p className="mt-1">{detail.amount}</p>
              </div>
            )}
          </div>
        )}

        {/* Old Owner for transfer types */}
        {(["Varsai", "Hakkami", "Vechand", "Vehchani", "Hayati_ma_hakh_dakhal"].includes(detail.type)) && detail.oldOwner && (
          <div>
            <Label>Old Owner</Label>
            <p className="mt-1">{detail.oldOwner}</p>
          </div>
        )}

        {/* Hukam specific fields */}
        {detail.type === "Hukam" && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {detail.hukamDate && (
                <div>
                  <Label>Hukam Date</Label>
                  <p className="mt-1">{detail.hukamDate}</p>
                </div>
              )}
              <div>
                <Label>Hukam Type</Label>
                <p className="mt-1">{detail.hukamType}</p>
              </div>
            </div>

            {detail.ganot && (
              <div>
                <Label>Ganot</Label>
                <p className="mt-1">{detail.ganot}</p>
              </div>
            )}

            <div>
              <Label>Restraining Order</Label>
              <p className="mt-1">{detail.restrainingOrder === 'yes' ? 'Yes' : 'No'}</p>
            </div>

            {/* Affected Nondh Details */}
            {detail.affectedNondhDetails && detail.affectedNondhDetails.length > 0 && (
              <div>
                <Label>Affected Nondh Details</Label>
                <div className="mt-2 space-y-2">
                  {detail.affectedNondhDetails.map((affected: any, index: number) => (
                    <Card key={index} className="p-3">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                        <div>
                          <Label className="text-sm">Nondh Number</Label>
                          <p className="text-sm">{affected.nondhNo || 'N/A'}</p>
                        </div>
                        <div>
                          <Label className="text-sm">Status</Label>
                          <p className="text-sm">{getStatusLabel(affected.status || 'valid')}</p>
                        </div>
                        {affected.invalidReason && (
                          <div>
                            <Label className="text-sm">Reason</Label>
                            <p className="text-sm">{affected.invalidReason}</p>
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    );
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
         
        </CardContent>
      </Card>
    )
  }

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

        {/* Nondh Details */}
        {nondhs
          .sort(sortNondhs)
          .map(nondh => {
            const detail = nondhDetails.find(d => d.nondhId === nondh.id)
            
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
                      <Badge variant={detail.status === 'invalid' ? 'destructive' : detail.status === 'nullified' ? 'secondary' : 'default'}>
                        {getStatusLabel(detail.status)}
                      </Badge>
                      <span className="text-sm px-2 py-1 bg-blue-100 dark:bg-blue-900 rounded-full">
                        {detail.type}
                      </span>
                    </div>
                    <div className="mt-2">
                      <h4 className="text-sm font-medium text-muted-foreground">
                        Affected Survey Numbers:
                      </h4>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {nondh.affected_s_nos?.map((sNoData: any, index: number) => {
  let sNoNumber, sNoType;
  
  try {
    if (typeof sNoData === 'string') {
      const parsed = JSON.parse(sNoData);
      sNoNumber = parsed.number;
      sNoType = parsed.type;
    } else if (typeof sNoData === 'object' && sNoData.number) {
      sNoNumber = sNoData.number;
      sNoType = sNoData.type;
    } else {
      sNoNumber = sNoData.toString();
      sNoType = 's_no';
    }
  } catch (e) {
    sNoNumber = sNoData.toString();
    sNoType = 's_no';
  }

  const typeLabel = 
    sNoType === 'block_no' ? 'Block No' :
    sNoType === 're_survey_no' ? 'Resurvey No' : 'Survey No'
  
  return (
    <span 
      key={`${sNoNumber}-${index}`}
      className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded text-sm flex items-center gap-1"
    >
      <span className="font-medium">{typeLabel}:</span>
      <span>{sNoNumber}</span>
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
                          <p className="mt-1">{getStatusLabel(detail.status)}</p>
                        </div>
                      </div>

                      {/* Show reason/invalid reason for all statuses */}
                      {detail.invalidReason && (
                        <div className="space-y-2 mb-4">
                          <Label>
                            {detail.status === 'invalid' ? 'Invalid Reason' : 'Reason'}
                          </Label>
                          <p className="mt-1">{detail.invalidReason}</p>
                        </div>
                      )}

                      {detail.reason && (
                        <div className="space-y-2 mb-4">
                          <Label>Reason</Label>
                          <p className="mt-1">{detail.reason}</p>
                        </div>
                      )}

                      {detail.vigat && (
                        <div className="space-y-2 mb-4">
                          <Label>Vigat</Label>
                          <p className="mt-1">{detail.vigat}</p>
                        </div>
                      )}

                      {/* Type-specific fields */}
                      {renderTypeSpecificDetails(detail)}

                      <div className="space-y-2 mb-6">
                        <Label>Tenure</Label>
                        <p className="mt-1">{detail.tenure || 'Navi'}</p>
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
                              <div className="flex justify-between items-start mb-3">
                                <h4 className="font-medium">Owner {index + 1}</h4>
                                {!relation.isValid && (
                                  <Badge variant="destructive">Radd</Badge>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                  <Label>Owner Name</Label>
                                  <p className="mt-1">{relation.ownerName}</p>
                                </div>
                                <div>
                                  <Label>Area</Label>
                                  <p className="mt-1">{formatArea(relation.area)}</p>
                                </div>
                                {/* Survey number fields for Durasti/Promulgation */}
                                {relation.surveyNumber && (
                                  <>
                                    <div>
                                      <Label>Survey Number</Label>
                                      <p className="mt-1">{relation.surveyNumber}</p>
                                    </div>
                                    <div>
                                      <Label>Survey Number Type</Label>
                                      <p className="mt-1">
                                        {relation.surveyNumberType === 'block_no' ? 'Block No' :
                                         relation.surveyNumberType === 're_survey_no' ? 'Resurvey No' : 'Survey No'}
                                      </p>
                                    </div>
                                  </>
                                )}
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
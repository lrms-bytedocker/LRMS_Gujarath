"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowLeft, Download, Eye, Filter, Calendar, AlertTriangle } from "lucide-react"
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
  nondhNumber: string
  createdAt: string
}

interface NondhDetail {
  id: string
  nondhId: string
  sNo: string
  type: string
  subType?: string
  vigat?: string
  invalidReason?: string
  oldOwner?: string
  status: 'valid' | 'invalid' | 'nullified'
  hukamStatus?: 'valid' | 'invalid' | 'nullified'
  hukamInvalidReason?: string
  hukamType?: string
  affectedNondhNo?: string
  showInOutput: boolean
  hasDocuments: boolean
  docUploadUrl?: string
  createdAt: string
  nondhNumber?: number
  affectedSNos?: string[]
  nondhDocUrl?: string
  docUrl?: string
}

export default function OutputViews() {

  const { landBasicInfo, yearSlabs, panipatraks, nondhs, nondhDetails, recordId} = useLandRecord()
  const { toast } = useToast()
  const router = useRouter()
  const [passbookData, setPassbookData] = useState<PassbookEntry[]>([])
  const [filteredNondhs, setFilteredNondhs] = useState<NondhDetail[]>([])
  const [dateFilter, setDateFilter] = useState("")
  const [sNoFilter, setSNoFilter] = useState("")
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false)

  const handleDownloadIntegratedDocument = async () => {
  if (!landBasicInfo) {
    toast({
      title: 'Error',
      description: 'Land basic information is required to generate the document',
      variant: 'destructive'
    });
    return;
  }

  setIsGeneratingPDF(true);
  
  try {
    // Import the PDF generator dynamically to avoid SSR issues
    const { IntegratedDocumentGenerator } = await import('@/lib/pdf-generator');
  
    
    await IntegratedDocumentGenerator.generateIntegratedPDF(recordId as string, landBasicInfo);
    
    toast({
      title: 'Success',
      description: 'Integrated document generated and downloaded successfully',
    });
  } catch (error) {
    console.error('Error generating PDF:', error);
    toast({
      title: 'Error',
      description: 'Failed to generate integrated document. Please try again.',
      variant: 'destructive'
    });
  } finally {
    setIsGeneratingPDF(false);
  }
}

  //helper function to get unique S.Nos with types
 const getUniqueSNosWithTypes = () => {
  const sNoSet = new Set<string>();
  const sNoTypeMap = new Map<string, string>();
  
  // From nondhs (affected S.Nos)
  nondhs.forEach(nondh => {
    if (nondh.affectedSNos && Array.isArray(nondh.affectedSNos)) {
      nondh.affectedSNos.forEach(sNoData => {
        try {
          let sNoObj;
          if (typeof sNoData === 'string' && sNoData.startsWith('{')) {
            sNoObj = JSON.parse(sNoData);
          } else if (typeof sNoData === 'object') {
            sNoObj = sNoData;
          } else {
            sNoObj = { number: sNoData.toString(), type: 's_no' };
          }
          
          const sNoKey = `${sNoObj.number}`;
          sNoSet.add(sNoKey);
          sNoTypeMap.set(sNoKey, sNoObj.type || 's_no');
        } catch (e) {
          const sNoKey = sNoData.toString();
          sNoSet.add(sNoKey);
          sNoTypeMap.set(sNoKey, 's_no');
        }
      });
    }
  });
  
  // From nondhDetails (individual S.Nos)
  nondhDetails.forEach(detail => {
    if (detail.sNo) {
      sNoSet.add(detail.sNo);
      if (!sNoTypeMap.has(detail.sNo)) {
        sNoTypeMap.set(detail.sNo, 's_no');
      }
    }
  });
  
  // From passbook data
  passbookData.forEach(entry => {
    if (entry.sNo) {
      sNoSet.add(entry.sNo);
      if (!sNoTypeMap.has(entry.sNo)) {
        sNoTypeMap.set(entry.sNo, 's_no');
      }
    }
  });
  
  return Array.from(sNoSet).map(sNo => ({
    value: sNo,
    type: sNoTypeMap.get(sNo) || 's_no',
    label: `${sNo} (${sNoTypeMap.get(sNo) === 'block_no' ? 'Block' : 
                     sNoTypeMap.get(sNo) === 're_survey_no' ? 'Re-survey' : 'Survey'})`
  })).sort((a, b) => a.value.localeCompare(b.value, undefined, { numeric: true }));
};

  // Helper function to format affected S.Nos properly
const formatAffectedSNos = (affectedSNos: any): string => {
  if (!affectedSNos) return '-';
  
  try {
    let sNos: Array<{number: string, type: string}> = [];
    
    // Handle if it's already an array of objects
    if (Array.isArray(affectedSNos)) {
      // Check if first element is already an object with number/type properties
      if (affectedSNos.length > 0 && typeof affectedSNos[0] === 'object' && affectedSNos[0].number && affectedSNos[0].type) {
        sNos = affectedSNos;
      } 
      // Handle if it's an array of JSON strings
      else if (typeof affectedSNos[0] === 'string' && affectedSNos[0].startsWith('{')) {
        sNos = affectedSNos.map(sNo => {
          try {
            return JSON.parse(sNo);
          } catch {
            return { number: sNo, type: 's_no' };
          }
        });
      }
      // Handle simple array of strings
      else {
        sNos = affectedSNos.map(sNo => ({ number: sNo.toString(), type: 's_no' }));
      }
    }
    // Handle if it's a string (could be JSON array or single JSON object)
    else if (typeof affectedSNos === 'string') {
      // Try to parse JSON array
      if (affectedSNos.startsWith('[')) {
        try {
          sNos = JSON.parse(affectedSNos);
        } catch {
          // If not JSON array, try to parse as single JSON object
          try {
            const singleObj = JSON.parse(affectedSNos);
            sNos = [singleObj];
          } catch {
            // If not JSON at all, treat as comma-separated values
            return affectedSNos.split(',').map(s => s.trim()).join(', ');
          }
        }
      } 
      // Try to parse single JSON object
      else if (affectedSNos.startsWith('{')) {
        try {
          const singleObj = JSON.parse(affectedSNos);
          sNos = [singleObj];
        } catch {
          // If not JSON, treat as simple string
          return affectedSNos;
        }
      }
      // Simple comma-separated string
      else {
        return affectedSNos.split(',').map(s => s.trim()).join(', ');
      }
    }
    // Handle if it's a single object
    else if (typeof affectedSNos === 'object' && affectedSNos.number && affectedSNos.type) {
      sNos = [affectedSNos];
    }
    
    // Format the S.Nos nicely with type labels
    if (sNos && sNos.length > 0) {
      return sNos.map(sNo => {
        if (typeof sNo === 'object' && sNo.number && sNo.type) {
          const typeLabel = sNo.type === 'block_no' ? 'Block' : 
                           sNo.type === 're_survey_no' ? 'Re-survey' : 'Survey';
          return `${sNo.number} (${typeLabel})`;
        }
        return sNo.toString();
      }).join(', ');
    }
    
    return '-';
  } catch (error) {
    console.warn('Error formatting affected S.Nos:', error);
    return typeof affectedSNos === 'string' ? affectedSNos : JSON.stringify(affectedSNos);
  }
};
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

  // Sorting function for nondhs
 const sortNondhsBySNoType = (a: NondhDetail, b: NondhDetail): number => {
  // Get the nondh objects for the details
  const nondhA = nondhs.find(n => n.id === a.nondhId);
  const nondhB = nondhs.find(n => n.id === b.nondhId);
  
  if (!nondhA || !nondhB) return 0;
  
  // Use the same getPrimarySNoType function for consistency
  const typeA = getPrimarySNoType(nondhA.affectedSNos);
  const typeB = getPrimarySNoType(nondhB.affectedSNos);
  
  // Priority order: s_no > block_no > re_survey_no
  const priorityOrder = ['s_no', 'block_no', 're_survey_no'];
  const priorityA = priorityOrder.indexOf(typeA);
  const priorityB = priorityOrder.indexOf(typeB);
  
  // First sort by type priority
  if (priorityA !== priorityB) {
    return priorityA - priorityB;
  }
  
  // Within same type group, sort only by nondh number (ascending)
  const aNondhNo = parseInt(nondhA.number.toString()) || 0;
  const bNondhNo = parseInt(nondhB.number.toString()) || 0;
  return aNondhNo - bNondhNo;
};

  // Helper function to get status display name
  const getStatusDisplayName = (status: string): string => {
    switch (status) {
      case 'valid': return 'Pramanik'
      case 'invalid': return 'Radd'
      case 'nullified': return 'Na manjoor'
      default: return status
    }
  };

  // Helper function to get status color classes
  const getStatusColorClass = (status: string): string => {
    switch (status) {
      case 'valid': return 'bg-green-100 text-green-800'
      case 'invalid': return 'bg-red-100 text-red-800'
      case 'nullified': return 'bg-yellow-100 text-yellow-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  };

  // Helper function to view document in new window
  const viewDocument = (url: string, title: string) => {
    if (url) {
      window.open(url, '_blank', 'width=800,height=600');
    } else {
      toast({
        title: 'Error',
        description: 'Document URL not available',
        variant: 'destructive'
      });
    }
  };

// Enhanced function to fetch detailed nondh information including document URLs
const fetchDetailedNondhInfo = async (nondhDetails: NondhDetail[]) => {
  try {
    const enhancedDetails = await Promise.all(
      nondhDetails.map(async (detail) => {
        let nondhDocUrl = null;
        let affectedSNosData = null;
        let hukamType = detail.hukamType || detail.subType || null;
        
        // Only try to fetch from database if we have a valid nondhId
        if (detail.nondhId) {
          try {
            // Get nondh document URL from nondh table
            const { data: nondhData, error: nondhError } = await supabase
              .from('nondhs')
              .select('nondh_doc_url, affected_s_nos')
              .eq('id', detail.nondhId)
              .maybeSingle();

            if (!nondhError && nondhData) {
              nondhDocUrl = nondhData.nondh_doc_url;
              affectedSNosData = nondhData.affected_s_nos;
            } else if (nondhError) {
              console.warn(`Error fetching nondh data for ${detail.nondhId}:`, nondhError);
            }
          } catch (error) {
            console.warn(`Exception fetching nondh data for ${detail.nondhId}:`, error);
          }
        }

        let docUploadUrl = detail.docUploadUrl || null;
        let hasDocuments = detail.hasDocuments;
        
        // Only try to fetch detail data if we have a valid detail ID
        if (detail.id) {
          try {
            // Get detail document URL and hukam_type from nondh_details table
            const { data: detailData, error: detailError } = await supabase
              .from('nondh_details')
              .select('doc_upload_url, has_documents, hukam_type')
              .eq('nondh_id', detail.nondhId)
              .maybeSingle();

            if (!detailError && detailData) {
              console.log('Detail data fetched:', detailData);
              
              // Update hasDocuments from database if available
              if (detailData.has_documents !== undefined) {
                hasDocuments = detailData.has_documents;
              }
              
              // Get hukam_type from database
              if (detailData.hukam_type) {
                hukamType = detailData.hukam_type;
              }
              
              const rawDocUrl = detailData.doc_upload_url;
              console.log('Raw doc URL from DB:', rawDocUrl);
              
              // Simplified processing - just use the text as-is if it exists
              if (rawDocUrl && rawDocUrl.trim() !== '') {
                docUploadUrl = rawDocUrl.trim();
                hasDocuments = true; // Force to true if we have a URL
                console.log('Set docUploadUrl to:', docUploadUrl);
              }
            } else if (detailError) {
              console.warn(`Error fetching detail data for ${detail.id}:`, detailError);
            }
          } catch (error) {
            console.warn(`Exception fetching detail data for ${detail.id}:`, error);
          }
        }

        console.log('Final result for nondh:', {
          id: detail.id,
          hasDocuments,
          docUploadUrl,
          nondhDocUrl,
          hukamType
        });

        return {
          ...detail,
          nondhDocUrl: nondhDocUrl,
          docUploadUrl: docUploadUrl,
          hasDocuments: hasDocuments,
          affectedSNos: affectedSNosData || detail.affectedSNos,
          hukamType: hukamType // Include hukamType in the result
        };
      })
    );

    return enhancedDetails;
  } catch (error) {
    console.error('Error fetching detailed nondh info:', error);
    return nondhDetails;
  }
};

  const safeNondhNumber = (nondh: any): string => {
  return nondh.number ? nondh.number.toString() : '0';
};
  useEffect(() => {
    fetchPassbookData()
    generateFilteredNondhs()
  }, [yearSlabs, panipatraks, nondhs, nondhDetails, sNoFilter])

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
      const nondhNumber = nondh ? safeNondhNumber(nondh) : 0;

      // Calculate area
      let area = 0;
      if (relation.area_unit === 'acre_guntha') {
        const totalGunthas = (relation.acres || 0) * 40 + (relation.gunthas || 0);
        area = convertToSquareMeters(totalGunthas, 'guntha');
      } else {
        area = relation.square_meters || 0;
      }

      console.log(`Processing: Owner ${relation.owner_name}, Nondh ${nondhNumber}, Area ${area}`);

      const entry = {
        year: new Date(relation.created_at).getFullYear(),
        ownerName: relation.owner_name || '',
        area,
        sNo: relation.s_no || '',
        nondhNumber: nondh ? safeNondhNumber(nondh) : '0',
        createdAt: relation.created_at || '',
        // Add affected S.Nos for filtering
        affectedSNos: nondh ? formatAffectedSNos(nondh.affectedSNos) : relation.s_no || ''
      };

      // Apply S.No filter
      if (!sNoFilter || 
          entry.sNo === sNoFilter || 
          entry.affectedSNos.includes(sNoFilter)) {
        passbookEntries.push(entry);
      }
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

  const generateFilteredNondhs = async () => {
  // Only show nondhs that are marked for output
  let outputNondhs = nondhDetails
    .filter((detail) => detail.showInOutput)
    .map((detail) => {
      const nondh = nondhs.find((n) => n.id === detail.nondhId)
      return {
        ...detail,
        nondhNumber: nondh?.number || 0,
        affectedSNos: nondh?.affectedSNos || [detail.sNo],
        createdAt: detail.createdAt || new Date().toISOString().split("T")[0],
        docUploadUrl: detail.docUploadUrl,
        hasDocuments: detail.hasDocuments
      } as NondhDetail
    })

  // Apply S.No filter
  if (sNoFilter) {
    outputNondhs = outputNondhs.filter(nondh => {
      // Check if the filter matches any affected S.No
      const affectedSNosStr = formatAffectedSNos(nondh.affectedSNos);
      return affectedSNosStr.includes(sNoFilter) || nondh.sNo === sNoFilter;
    });
  }

  // Fetch detailed info including document URLs
  const enhancedNondhs = await fetchDetailedNondhInfo(outputNondhs);
  
  // Format affected S.Nos for display
  const formattedNondhs = enhancedNondhs.map(nondh => ({
    ...nondh,
    affectedSNos: formatAffectedSNos(nondh.affectedSNos)
  }));
  
  // Sort and set the filtered nondhs
  setFilteredNondhs(formattedNondhs.sort(sortNondhsBySNoType));
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

  const getFilteredByDate = async () => {
  let filteredDetails = nondhDetails;
  
  if (dateFilter) {
    filteredDetails = nondhDetails.filter((detail) => detail.createdAt?.includes(dateFilter));
  }
  
  let mappedDetails = filteredDetails.map((detail) => {
    const nondh = nondhs.find((n) => n.id === detail.nondhId)
    return {
      ...detail,
      nondhNumber: nondh?.number || 0,
      affectedSNos: nondh?.affectedSNos || [detail.sNo],
      createdAt: detail.createdAt || new Date().toISOString().split("T")[0]
    } as NondhDetail
  });

  // Apply S.No filter
  if (sNoFilter) {
    mappedDetails = mappedDetails.filter(nondh => {
      const affectedSNosStr = formatAffectedSNos(nondh.affectedSNos);
      return affectedSNosStr.includes(sNoFilter) || nondh.sNo === sNoFilter;
    });
  }

  // Fetch detailed info including document URLs
  const enhancedDetails = await fetchDetailedNondhInfo(mappedDetails);
  
  // Format affected S.Nos for display
  const formattedDetails = enhancedDetails.map(nondh => ({
    ...nondh,
    affectedSNos: formatAffectedSNos(nondh.affectedSNos)
  }));
  
  return formattedDetails.sort(sortNondhsBySNoType);
}

  const handleCompleteProcess = () => {
    toast({ title: "Land record process completed successfully!" })
    router.push('/land-master')
  }

  const renderQueryListCard = (nondh: NondhDetail, index: number) => {    
  return (
    <Card key={index} className="p-4">
      <div className="space-y-3">
        <div className="flex justify-between items-start">
          <div className="space-y-1">
            <div className="font-medium text-sm">Nondh #{nondh.nondhNumber}</div>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div>
            <span className="text-muted-foreground">Nondh Doc:</span>
            <div className={`font-medium p-1 rounded ${!nondh.nondhDocUrl ? 'bg-red-100' : ''}`}>
              {nondh.nondhDocUrl ? (
                <span className="text-green-600 text-xl">✓</span>
              ) : (
                <span className="text-red-600 text-xs">N/A</span>
              )}
            </div>
          </div>
          <div>
            <span className="text-muted-foreground text-sm">Relevant Docs:</span>
            <div className={`font-medium p-1 rounded ${nondh.hasDocuments ? (!nondh.docUploadUrl ? 'bg-yellow-100' : '') : ''}`}>
              <div className="text-sm">Available: {nondh.hasDocuments ? "Yes" : "No"}</div>
              {nondh.hasDocuments && (
                <div className="mt-1">
                  {nondh.docUploadUrl ? (
                    <span className="text-green-600 text-xl">✓</span>
                  ) : (
                    <span className="text-red-600 text-xl">✗</span>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}

  const renderPassbookCard = (entry: PassbookEntry, index: number) => (
  <Card key={index} className="p-4">
    <div className="space-y-3">
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="font-medium text-sm">{entry.ownerName}</div>
          <div className="text-muted-foreground text-xs">Year: {entry.year}</div>
        </div>
        <Badge variant="outline" className="text-xs">
          {entry.nondhNumber || "-"}
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
      
      {/* Add affected S.Nos display */}
      <div>
        <span className="text-muted-foreground text-sm">Affected S.No:</span>
        <div className="text-sm font-medium">{entry.affectedSNos || entry.sNo}</div>
      </div>
    </div>
  </Card>
)

  const renderDateWiseCard = (nondh: NondhDetail, index: number) => {    
    return (
      <Card key={index} className="p-4">
        <div className="space-y-3">
          <div className="flex justify-between items-start">
            <div className="space-y-1">
              <div className="font-medium text-sm">Nondh #{nondh.nondhNumber}</div>
              <div className="text-muted-foreground text-xs flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {nondh.createdAt}
              </div>
            </div>
            <div className="flex flex-col items-end gap-1">
              <Badge className={`text-xs ${getStatusColorClass(nondh.status)}`}>
                {getStatusDisplayName(nondh.status)}
              </Badge>
              <span className={`text-xs ${nondh.showInOutput ? "text-green-600" : "text-red-600"}`}>
                {nondh.showInOutput ? "In Output" : "Not in Output"}
              </span>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <span className="text-muted-foreground">Affected S.No:</span>
              <div className="font-medium">
                {nondh.affectedSNos || nondh.sNo}
              </div>
            </div>
            <div>
              <span className="text-muted-foreground">Type:</span>
              <div className="font-medium">{nondh.type}</div>
            </div>
          </div>
        </div>
      </Card>
    )
  }

  const SNoFilterComponent = () => {
  const uniqueSNos = getUniqueSNosWithTypes();
  
  return (
    <div className="flex items-center gap-2">
      <Filter className="w-4 h-4" />
      <Label htmlFor="sno-filter" className="text-sm whitespace-nowrap">Filter by S.No:</Label>
      <select
        id="sno-filter"
        value={sNoFilter}
        onChange={(e) => setSNoFilter(e.target.value)}
        className="w-full sm:w-48 px-3 py-1 border border-gray-300 rounded-md text-sm"
      >
        <option value="">All S.Nos</option>
        {uniqueSNos.map((sno, index) => (
          <option key={index} value={sno.value}>
            {sno.label}
          </option>
        ))}
      </select>
    </div>
  );
};

  return (
  <Card className="w-full max-w-none">
    <CardHeader>
      <CardTitle className="text-lg sm:text-xl">Step 6: Output Views & Reports</CardTitle>
    </CardHeader>
    <CardContent className="p-4 sm:p-6">
  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
    <h2 className="text-lg font-semibold">Reports & Documents</h2>
    <Button
      onClick={handleDownloadIntegratedDocument}
      className="flex items-center gap-2 w-full sm:w-auto"
      variant="outline"
      disabled={isGeneratingPDF}
    >
      <Download className="w-4 h-4" />
      {isGeneratingPDF ? 'Generating...' : 'Download Integrated Document'}
    </Button>
  </div>
  <Tabs defaultValue="nondh-table" className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-4">
  <TabsTrigger value="nondh-table" className="text-xs sm:text-sm">Nondh Table</TabsTrigger>
  <TabsTrigger value="query-list" className="text-xs sm:text-sm">Query List</TabsTrigger>
  <TabsTrigger value="passbook" className="text-xs sm:text-sm">Passbook</TabsTrigger>
  <TabsTrigger value="date-wise" className="text-xs sm:text-sm">Date-wise</TabsTrigger>
</TabsList>

<TabsContent value="nondh-table" className="space-y-4">
  <div className="flex flex-col gap-4">
    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
      <h3 className="text-base sm:text-lg font-semibold">
        All Nondhs ({nondhDetails.length})
      </h3>
      
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <SNoFilterComponent />
        <Button 
  onClick={async () => {
    let csvData = nondhDetails.map((detail) => {
      const nondh = nondhs.find((n) => n.id === detail.nondhId)
      return {
        ...detail,
        nondhNumber: nondh?.number || 0,
        affectedSNos: formatAffectedSNos(nondh?.affectedSNos || [detail.sNo]),
        nondhType: nondh?.type || detail.type,
        hukamType: detail.hukamType || detail.subType || '-'
      }
    }).filter(nondh => {
      if (!sNoFilter) return true;
      return nondh.affectedSNos.includes(sNoFilter) || nondh.sNo === sNoFilter;
    });
    
    const enhancedData = await fetchDetailedNondhInfo(csvData);
    const sortedData = enhancedData.sort(sortNondhsBySNoType);
    exportToCSV(sortedData, "all-nondhs-table");
  }}
  className="flex items-center gap-2 w-full sm:w-auto"
  disabled={nondhDetails.length === 0}
  size="sm"
>
  <Download className="w-4 h-4" />
  Export CSV
</Button>
      </div>
    </div>
  </div>

  {(() => {
  const [allNondhsDataState, setAllNondhsDataState] = useState([]);
  const [isLoadingNondhTable, setIsLoadingNondhTable] = useState(true);

  useEffect(() => {
    const loadAllNondhsData = async () => {
      setIsLoadingNondhTable(true);
      
      let mappedData = nondhDetails.map((detail) => {
        const nondh = nondhs.find((n) => n.id === detail.nondhId)
        return {
          ...detail,
          nondhNumber: nondh?.number || 0,
          affectedSNos: formatAffectedSNos(nondh?.affectedSNos || [detail.sNo]),
          nondhType: nondh?.type || detail.type,
          hukamType: nondh?.subType || detail.subType || '-'
        }
      }).filter(nondh => {
        if (!sNoFilter) return true;
        return nondh.affectedSNos.includes(sNoFilter) || nondh.sNo === sNoFilter;
      });

      // Fetch document URLs just like in query list
      const enhancedData = await fetchDetailedNondhInfo(mappedData);
      const sortedData = enhancedData.sort(sortNondhsBySNoType);
      
      setAllNondhsDataState(sortedData);
      setIsLoadingNondhTable(false);
    };

    loadAllNondhsData();
  }, [nondhDetails, nondhs, sNoFilter]);

  if (isLoadingNondhTable) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">Loading nondh data...</p>
      </div>
    );
  }

  if (allNondhsDataState.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 text-sm">
          {sNoFilter ? 'No nondhs found for selected S.No' : 'No nondh data available'}
        </p>
      </div>
    );
  }

  // Use allNondhsDataState instead of allNondhsData in the rest of the component
  return (
    <>
      {/* Desktop Table */}
      <div className="hidden lg:block rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nondh No.</TableHead>
              <TableHead>Nondh Doc</TableHead>
              <TableHead>Nondh Type</TableHead>
              <TableHead>Hukam Type</TableHead>
              <TableHead>Vigat</TableHead>
              <TableHead>Affected S.No</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reason</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {allNondhsDataState.map((nondh, index) => (
              <TableRow key={index}>
                <TableCell>{nondh.nondhNumber}</TableCell>
                <TableCell className={!nondh.nondhDocUrl ? 'bg-red-100' : ''}>
                  {nondh.nondhDocUrl ? (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => viewDocument(nondh.nondhDocUrl!, `Nondh ${nondh.nondhNumber} Document`)}
                    >
                      <Eye className="w-4 h-4 mr-1" />
                      View Document
                    </Button>
                  ) : (
                    <span className="text-red-600 font-medium">N/A</span>
                  )}
                </TableCell>
                <TableCell>{nondh.nondhType}</TableCell>
                <TableCell>
  {nondh.nondhType === 'Hukam' ? (nondh.hukamType || '-') : '-'}
</TableCell>
                <TableCell className="max-w-xs truncate">{nondh.vigat || "-"}</TableCell>
                <TableCell>{nondh.affectedSNos}</TableCell>
                <TableCell>
                  <span className={`px-2 py-1 rounded text-xs ${getStatusColorClass(nondh.status)}`}>
                    {getStatusDisplayName(nondh.status)}
                  </span>
                </TableCell>
                <TableCell className="max-w-xs">
                  {nondh.invalidReason ? (
                    <span className="text-red-600 text-sm">{nondh.invalidReason}</span>
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
        {allNondhsDataState.map((nondh, index) => (
          <Card key={index} className="p-4">
            <div className="space-y-3">
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <div className="font-medium text-sm">Nondh #{nondh.nondhNumber}</div>
                  <div className="text-muted-foreground text-xs">
  Type: {nondh.nondhType}
  {nondh.nondhType === 'Hukam' && nondh.hukamType && nondh.hukamType !== '-' && (
    <span> - {nondh.hukamType}</span>
  )}
</div>
                </div>
                <Badge className={`text-xs ${getStatusColorClass(nondh.status)}`}>
                  {getStatusDisplayName(nondh.status)}
                </Badge>
              </div>
              
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Nondh Doc:</span>
                  <div className={`font-medium p-1 rounded ${!nondh.nondhDocUrl ? 'bg-red-100' : ''}`}>
                    {nondh.nondhDocUrl ? (
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-6 px-2"
                        onClick={() => viewDocument(nondh.nondhDocUrl!, `Nondh ${nondh.nondhNumber} Document`)}
                      >
                        <Eye className="w-3 h-3 mr-1" />
                        View
                      </Button>
                    ) : (
                      <span className="text-red-600 text-xs">N/A</span>
                    )}
                  </div>
                </div>
                <div>
                  <span className="text-muted-foreground">Affected S.No:</span>
                  <div className="font-medium text-xs">{nondh.affectedSNos}</div>
                </div>
              </div>
              
              {nondh.vigat && nondh.vigat !== '-' && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-sm">Vigat:</span>
                  <div className="text-sm font-medium truncate">{nondh.vigat}</div>
                </div>
              )}
              
              {nondh.invalidReason && (
                <div className="space-y-1">
                  <span className="text-muted-foreground text-sm">Reason:</span>
                  <div className="text-sm font-medium text-red-600">{nondh.invalidReason}</div>
                </div>
              )}
            </div>
          </Card>
        ))}
      </div>
    </>
  );
})()}
</TabsContent>

        <TabsContent value="query-list" className="space-y-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <h3 className="text-base sm:text-lg font-semibold">
                Nondhs Marked for Output ({filteredNondhs.length})
              </h3>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <SNoFilterComponent />
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
            </div>
          </div>

          {filteredNondhs.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                {sNoFilter ? 'No nondhs found for selected S.No' : 'No nondhs marked for output display'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
  <TableRow>
    <TableHead>Nondh No.</TableHead>
    <TableHead>Nondh Doc</TableHead>
    <TableHead>Relevant Docs Available</TableHead>
    <TableHead>Relevant Docs</TableHead>
  </TableRow>
</TableHeader>
                  <TableBody>
  {filteredNondhs.map((nondh, index) => {
    return (
      <TableRow key={index}>
        <TableCell>{nondh.nondhNumber}</TableCell>
        <TableCell className={!nondh.nondhDocUrl ? 'bg-red-100' : ''}>
          {nondh.nondhDocUrl ? (
            <div className="flex items-center justify-center">
              <span className="text-green-600 text-xl">✓</span>
            </div>
          ) : (
            <span className="text-red-600 font-medium">N/A</span>
          )}
        </TableCell>
        <TableCell>{nondh.hasDocuments ? "Yes" : "No"}</TableCell>
        <TableCell className={nondh.hasDocuments && !nondh.docUploadUrl ? 'bg-yellow-100' : ''}>
          {nondh.hasDocuments ? (
            nondh.docUploadUrl ? (
              <div className="flex items-center justify-center">
                <span className="text-green-600 text-xl">✓</span>
              </div>
            ) : (
              <div className="flex items-center justify-center">
                <span className="text-red-600 text-xl">✗</span>
              </div>
            )
          ) : (
            "N/A"
          )}
        </TableCell>
      </TableRow>
    );
  })}
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
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <h3 className="text-base sm:text-lg font-semibold">
                Land Ownership Records ({passbookData.length})
              </h3>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <SNoFilterComponent />
                <Button 
                  onClick={() => exportToCSV(passbookData, "passbook-data")} 
                  className="flex items-center gap-2 w-full sm:w-auto"
                  disabled={passbookData.length === 0}
                  size="sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>

          {passbookData.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 text-sm">
                {sNoFilter ? 'No passbook data found for selected S.No' : 'No passbook data available'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Year</TableHead>
                      <TableHead>Owner Name</TableHead>
                      <TableHead>S.No</TableHead>
                      <TableHead>Affected S.No</TableHead>
                      <TableHead>Area (sq.m)</TableHead>
                      <TableHead>Nondh No.</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {passbookData.map((entry, index) => (
                      <TableRow key={index}>
                        <TableCell>{entry.year}</TableCell>
                        <TableCell>{entry.ownerName}</TableCell>
                        <TableCell>{entry.sNo}</TableCell>
                        <TableCell>{entry.affectedSNos || entry.sNo}</TableCell>
                        <TableCell>{entry.area?.toFixed(2)}</TableCell>
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
                Date-wise All Nondhs
              </h3>
              
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <SNoFilterComponent />
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
                  onClick={async () => {
                    const filteredData = await getFilteredByDate();
                    exportToCSV(filteredData, "date-wise-nondhs");
                  }}
                  className="flex items-center gap-2 w-full sm:w-auto"
                  size="sm"
                >
                  <Download className="w-4 h-4" />
                  Export CSV
                </Button>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {(() => {
              const [filteredData, setFilteredData] = useState<NondhDetail[]>([]);
              
              useEffect(() => {
                const loadFilteredData = async () => {
                  const data = await getFilteredByDate();
                  setFilteredData(data);
                };
                loadFilteredData();
              }, [dateFilter, sNoFilter, nondhDetails]);

              if (filteredData.length === 0) {
                return (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-sm">
                      {dateFilter || sNoFilter ? 
                        'No nondhs found for selected filters' : 
                        'No nondh details available'
                      }
                    </p>
                  </div>
                );
              }

              return (
                <>
                  {/* Desktop Table */}
                  <div className="hidden lg:block rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Nondh No.</TableHead>
                          <TableHead>Affected S.No</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Show in Output</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredData.map((nondh, index) => (
                          <TableRow key={index}>
                            <TableCell>{nondh.createdAt}</TableCell>
                            <TableCell>{nondh.nondhNumber}</TableCell>
                            <TableCell>{nondh.affectedSNos || nondh.sNo}</TableCell>
                            <TableCell>{nondh.type}</TableCell>
                            <TableCell>
                              <span
                                className={`px-2 py-1 rounded text-xs ${getStatusColorClass(nondh.status)}`}
                              >
                                {getStatusDisplayName(nondh.status)}
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
                    {filteredData.map(renderDateWiseCard)}
                  </div>
                </>
              );
            })()}
          </div>
        </TabsContent>
      </Tabs>

      <div className="flex flex-col sm:flex-row sm:justify-center items-stretch sm:items-center gap-4 mt-6 pt-4 border-t">
        <Button 
          onClick={handleCompleteProcess}
          className="w-full sm:w-auto"
          size="sm"
        >
          Complete Process
        </Button>
      </div>
    </CardContent>
  </Card>
)
}
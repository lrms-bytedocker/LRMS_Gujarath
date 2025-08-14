"use client"

import { useState, useEffect, useCallback } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Download, Eye, FileText, Trash2 } from "lucide-react"
import { useLandRecord } from "@/contexts/land-record-context"
import { LandRecordService } from "@/lib/supabase"
import { useToast } from "@/hooks/use-toast"
import type { Nondh } from "@/contexts/land-record-context"

export default function NondhAdd() {
  const { recordId, yearSlabs } = useLandRecord()
  const { toast } = useToast()
  
  const [nondhs, setNondhs] = useState<Nondh[]>([])
  const [loading, setLoading] = useState(true)

  // Get all unique S.Nos from slabs with their types
  const getAllSNos = useCallback(() => {
    const sNosMap = new Map<string, string>(); // Map<number, type>
    
    yearSlabs.forEach((slab) => {
      if (slab.sNo.trim() !== "") {
        sNosMap.set(slab.sNo, slab.sNoType || 'S.No.');
      }
      slab.paikyEntries.forEach((entry) => {
        if (entry.sNo.trim() !== "") {
          sNosMap.set(entry.sNo, entry.sNoType || 'S.No.');
        }
      })
      slab.ekatrikaranEntries.forEach((entry) => {
        if (entry.sNo.trim() !== "") {
          sNosMap.set(entry.sNo, entry.sNoType || 'S.No.');
        }
      })
    })

    return sNosMap;
  }, [yearSlabs])

  // Get S.No type for a specific number
  const getSNoType = useCallback((sNo: string) => {
    const sNosMap = getAllSNos();
    return sNosMap.get(sNo) || 'S.No.';
  }, [getAllSNos])

  // Fetch nondh data
  useEffect(() => {
    const fetchNondhs = async () => {
      if (!recordId) {
        console.log('[NondhAdd] No recordId provided');
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        console.log('[NondhAdd] Fetching nondhs for recordId:', recordId);
        const { data, error } = await LandRecordService.getNondhs(recordId);
        
        console.log('[NondhAdd] Received response:', { data, error });

        if (error) throw error;
        
        if (data) {
          console.log('[NondhAdd] Setting nondhs data:', data);
          setNondhs(data);
        }
      } catch (error) {
        console.error('[NondhAdd] Error in fetchNondhs:', error);
        toast({ 
          title: "Error loading nondh data", 
          variant: "destructive" 
        });
      } finally {
        setLoading(false);
      }
    }

    fetchNondhs();
  }, [recordId, toast]);

  const handleFileDownload = (url: string) => {
    if (url) {
      window.open(url, '_blank')
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nondh Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
              <p className="mt-2 text-sm text-muted-foreground">Loading nondh data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!nondhs || nondhs.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Nondh Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center p-8">
            <p className="text-muted-foreground">No nondh records found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nondh Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {nondhs.map((nondh, index) => (
          <div key={nondh.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Nondh {index + 1}</h3>
              <div className="text-sm text-muted-foreground">
                Number: {nondh.number}
              </div>
            </div>

            {/* Affected Survey Numbers */}
            <div className="space-y-2">
              <Label className="text-sm font-medium text-muted-foreground">
                Affected Survey Numbers
              </Label>
              <div className="flex flex-wrap gap-2">
                {nondh.affectedSNos && nondh.affectedSNos.length > 0 ? (
                  nondh.affectedSNos.map((sNo) => (
                    <span 
                      key={`${nondh.id}-${sNo}`} 
                      className="px-2 py-1 bg-gray-100 rounded-md text-sm"
                    >
                      {getSNoType(sNo)} {sNo}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No affected survey numbers</p>
                )}
              </div>
            </div>

            {/* Document Display */}
            {nondh.nondhDoc && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Nondh Document
                </Label>
                <div className="flex items-center gap-3 p-3 border rounded-lg bg-blue-50">
                  <FileText className="w-5 h-5 text-blue-600" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-blue-900">
                      {nondh.nondhDocFileName || 'Document uploaded'}
                    </p>
                    <p className="text-xs text-blue-700">Click on button to view document</p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleFileDownload(nondh.nondhDoc)}
                    className="flex items-center gap-2 border-blue-200 text-blue-700 hover:bg-blue-100"
                  >
                    <Eye className="w-4 h-4" />
                    View
                  </Button>
                </div>
              </div>
            )}

            {!nondh.nondhDoc && (
              <div className="space-y-2">
                <Label className="text-sm font-medium text-muted-foreground">
                  Nondh Document
                </Label>
                <p className="text-sm text-gray-500 italic">No document uploaded</p>
              </div>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
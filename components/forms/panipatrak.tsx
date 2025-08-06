"use client";
import { useState, useEffect } from "react";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Trash2, Plus, ArrowRight, ArrowLeft, Loader2, ChevronUp, ChevronDown } from "lucide-react";
import {
  useLandRecord,
  Farmer,
  YearSlab,
  Panipatrak,
} from "@/contexts/land-record-context";
import { LandRecordService } from "@/lib/supabase"; 
import { toast } from "@/hooks/use-toast";
import { convertToSquareMeters, convertFromSquareMeters } from "@/lib/supabase";

type AreaUnit = "acre" | "sq_m";
type FarmerStrict = {
  id: string;
  name: string;
  area: { value: number; unit: AreaUnit };
  areaType: "acre_guntha" | "sq_m";
  acre?: number;
  guntha?: number;
  sq_m?: number;
};

function getYearPeriods(slab: YearSlab) {
  const periods: { from: number; to: number; period: string }[] = [];
  for (let y = slab.startYear; y < slab.endYear; y++) {
    periods.push({ from: y, to: y + 1, period: `${y}-${y + 1}` });
  }
  return periods;
}

const areaFields = (farmer: FarmerStrict, onChange: (f: FarmerStrict) => void) => {
  // Calculate all values
  const currentSqm = farmer.areaType === "sq_m" 
    ? farmer.sq_m || 0
    : convertToSquareMeters(farmer.acre || 0, "acre") + 
      convertToSquareMeters(farmer.guntha || 0, "guntha");

  const acreValue = convertFromSquareMeters(currentSqm, "acre");
  const gunthaValue = convertFromSquareMeters(currentSqm, "guntha");

  // Handlers for each input type
  const handleSqmChange = (value: string) => {
    if (value === "") {
      onChange({ 
        ...farmer, 
        sq_m: undefined,
        acre: undefined,
        guntha: undefined,
        area: { value: 0, unit: "sq_m" }
      });
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      onChange({
        ...farmer,
        sq_m: num,
        acre: convertFromSquareMeters(num, "acre"),
        guntha: convertFromSquareMeters(num, "guntha") % 40,
        area: { value: num, unit: "sq_m" }
      });
    }
  };

  const handleAcreChange = (value: string) => {
    if (value === "") {
      onChange({ 
        ...farmer, 
        acre: undefined,
        sq_m: convertToSquareMeters(farmer.guntha || 0, "guntha"),
        area: { value: convertToSquareMeters(farmer.guntha || 0, "guntha"), unit: "sq_m" }
      });
      return;
    }
    const num = parseFloat(value);
    if (!isNaN(num)) {
      const sqm = convertToSquareMeters(num, "acre") + 
                 convertToSquareMeters(farmer.guntha || 0, "guntha");
      onChange({ 
        ...farmer, 
        acre: num,
        sq_m: sqm,
        area: { value: sqm, unit: "sq_m" }
      });
    }
  };

  const handleGunthaChange = (value: string) => {
    if (value === "") {
      onChange({ 
        ...farmer, 
        guntha: undefined,
        sq_m: convertToSquareMeters(farmer.acre || 0, "acre"),
        area: { value: convertToSquareMeters(farmer.acre || 0, "acre"), unit: "sq_m" }
      });
      return;
    }
    let num = parseFloat(value);
    if (!isNaN(num)) {
      if (num >= 40) {
        num = 39.99;
        toast({ title: "Guntha must be less than 40" });
      }
      const sqm = convertToSquareMeters(farmer.acre || 0, "acre") + 
                 convertToSquareMeters(num, "guntha");
      onChange({ 
        ...farmer, 
        guntha: num,
        sq_m: sqm,
        area: { value: sqm, unit: "sq_m" }
      });
    }
  };

  return (
    <div className="space-y-4">
      {/* Area Type Selector */}
      <Select
        value={farmer.areaType}
        onValueChange={(val) => {
          const newType = val as "acre_guntha" | "sq_m";
          if (newType === "acre_guntha") {
            onChange({
              ...farmer,
              areaType: newType,
              acre: parseFloat(acreValue.toFixed(2)),
              guntha: parseFloat((gunthaValue % 40).toFixed(2)),
              sq_m: undefined
            });
          } else {
            onChange({
              ...farmer,
              areaType: newType,
              sq_m: currentSqm,
              acre: undefined,
              guntha: undefined
            });
          }
        }}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Area Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="acre_guntha">Acre - Guntha</SelectItem>
          <SelectItem value="sq_m">Square Meters</SelectItem>
        </SelectContent>
      </Select>

      {/* First row - primary field based on areaType */}
      <div className={`grid gap-4 ${farmer.areaType === "sq_m" ? "grid-cols-1" : "grid-cols-2"}`}>
        {farmer.areaType === "sq_m" ? (
          <div className="space-y-2">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={farmer.sq_m ?? ""}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter sq. meters"
            />
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <Label>Acres</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={farmer.acre ?? ""}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter acres"
              />
            </div>
            <div className="space-y-2">
              <Label>Guntha (must be &lt;40)</Label>
              <Input
                type="number"
                min={0}
                max={39.99}
                step="0.01"
                value={farmer.guntha ?? ""}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter guntha"
              />
            </div>
          </>
        )}
      </div>

      {/* Second row - other fields (also editable) */}
      <div className={`grid gap-4 ${farmer.areaType === "sq_m" ? "grid-cols-2" : "grid-cols-1"}`}>
        {farmer.areaType === "sq_m" ? (
          <>
            <div className="space-y-2">
              <Label>Acres</Label>
              <Input
                type="number"
                min={0}
                step="0.01"
                value={farmer.acre ?? ""}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter acres"
              />
            </div>
            <div className="space-y-2">
              <Label>Guntha</Label>
              <Input
                type="number"
                min={0}
                max={39.99}
                step="0.01"
                value={farmer.guntha ?? ""}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter guntha"
              />
            </div>
          </>
        ) : (
          <div className="space-y-2">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={farmer.sq_m ?? ""}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter sq. meters"
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default function PanipatrakStep() {
  const { yearSlabs, setPanipatraks, setCurrentStep, landBasicInfo } = useLandRecord();
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [expandedSlabs, setExpandedSlabs] = useState<Record<string, boolean>>({});
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const [slabPanels, setSlabPanels] = useState<{
    [slabId: string]: {
      periods: {
        period: string;
        from: number;
        to: number;
        farmers: FarmerStrict[];
        sameAsAbove: boolean;
      }[];
      sameForAll: boolean;
      slab: YearSlab;
    };
  }>({});

  // Initialize panels with default data
  const initializePanelsWithDefaults = (slabs: YearSlab[]) => {
    const newPanels: typeof slabPanels = {};
    const initialExpanded: Record<string, boolean> = {};
    const initialPeriodsExpanded: Record<string, boolean> = {};
    
    for (const slab of slabs) {
      const periods = getYearPeriods(slab);
      newPanels[slab.id] = {
        periods: periods.map(pr => ({
          ...pr,
          farmers: [{ 
            id: `farmer-${Date.now()}-${Math.random()}`, 
            name: "", 
            area: { value: 0, unit: "acre" },
            areaType: "acre_guntha",
            acre: 0,
            guntha: 0
          }],
          sameAsAbove: false,
        })),
        sameForAll: false,
        slab,
      };
      initialExpanded[slab.id] = true;
      
      // Expand first period of each slab by default
      if (periods.length > 0) {
        initialPeriodsExpanded[`${slab.id}-${periods[0].period}`] = true;
      }
    }
    
    setExpandedSlabs(initialExpanded);
    setExpandedPeriods(initialPeriodsExpanded);
    return newPanels;
  };

  useEffect(() => {
    if (!yearSlabs || yearSlabs.length === 0) {
      setIsInitialized(false);
      return;
    }

    const initializePanels = async () => {
      let newPanels = initializePanelsWithDefaults(yearSlabs);

      if (landBasicInfo?.id) {
        try {
          const { data, error } = await LandRecordService.getPanipatraks(landBasicInfo.id);
          if (!error && data && data.length > 0) {
            const bySlabId: Record<string, Panipatrak[]> = {};
            data.forEach(p => {
              if (!bySlabId[p.slabId]) bySlabId[p.slabId] = [];
              bySlabId[p.slabId].push(p);
            });

            Object.keys(newPanels).forEach(slabId => {
              if (bySlabId[slabId]) {
                newPanels[slabId].periods = newPanels[slabId].periods.map(period => {
                  const savedData = bySlabId[slabId].find(p => p.year === period.from);
                  if (savedData && savedData.farmers && savedData.farmers.length > 0) {
                    return {
                      ...period,
                      farmers: savedData.farmers.map(f => ({
                        id: f.id || `farmer-${Date.now()}-${Math.random()}`,
                        name: f.name || "",
                        area: f.area || { value: 0, unit: "acre" },
                        areaType: f.area?.unit === "sq_m" ? "sq_m" : "acre_guntha",
                        acre: convertFromSquareMeters(f.area?.value || 0, "acre"),
                        guntha: convertFromSquareMeters(f.area?.value || 0, "guntha") % 40,
                        sq_m: f.area?.unit === "sq_m" ? f.area.value : undefined
                      })),
                      sameAsAbove: false
                    };
                  }
                  return period;
                });
              }
            });
          }
        } catch (error) {
          console.warn("Could not load saved panipatraks:", error);
        }
      }

      setSlabPanels(newPanels);
      setIsInitialized(true);
    };

    initializePanels();
  }, [yearSlabs, landBasicInfo?.id]);

  const addFarmer = (slabId: string, periodIdx: number) => {
    setSlabPanels(prev => {
      const newPanels = JSON.parse(JSON.stringify(prev)); // Deep copy to avoid mutations
      const newFarmer = {
        id: `farmer-${Date.now()}-${Math.random()}`,
        name: "",
        area: { value: 0, unit: "acre" as AreaUnit },
        areaType: "acre_guntha" as const,
        acre: 0,
        guntha: 0
      };
      
      newPanels[slabId].periods[periodIdx].farmers.push(newFarmer);
      
      // If sameForAll is checked, add the farmer to all periods in this slab
      if (newPanels[slabId].sameForAll) {
        newPanels[slabId].periods.forEach((period, idx) => {
          if (idx !== periodIdx) {
            period.farmers.push({
              ...newFarmer,
              id: `farmer-${Date.now()}-${Math.random()}-${idx}`
            });
          }
        });
      }
      
      return newPanels;
    });
  };

  const removeFarmer = (slabId: string, periodIdx: number, farmerId: string) => {
    setSlabPanels(prev => {
      const newPanels = JSON.parse(JSON.stringify(prev)); // Deep copy
      const farmers = newPanels[slabId].periods[periodIdx].farmers;
      if (farmers.length <= 1) return prev;
      
      const farmerIndex = farmers.findIndex(f => f.id === farmerId);
      if (farmerIndex === -1) return prev;
      
      // Remove from current period
      newPanels[slabId].periods[periodIdx].farmers.splice(farmerIndex, 1);
      
      // If sameForAll is checked, remove from all periods in this slab
      if (newPanels[slabId].sameForAll) {
        newPanels[slabId].periods.forEach((period, idx) => {
          if (idx !== periodIdx && period.farmers.length > farmerIndex) {
            period.farmers.splice(farmerIndex, 1);
          }
        });
      }
      
      return newPanels;
    });
  };

  const updateFarmer = (
    slabId: string,
    periodIdx: number,
    farmerId: string,
    updates: Partial<FarmerStrict>
  ) => {
    setSlabPanels(prev => {
      const newPanels = JSON.parse(JSON.stringify(prev)); // Deep copy
      const farmerIndex = newPanels[slabId].periods[periodIdx].farmers.findIndex(f => f.id === farmerId);
      
      if (farmerIndex === -1) return prev;
      
      // Update the farmer in current period
      newPanels[slabId].periods[periodIdx].farmers[farmerIndex] = {
        ...newPanels[slabId].periods[periodIdx].farmers[farmerIndex],
        ...updates
      };
      
      // If sameForAll is checked, update the corresponding farmer in all periods
      if (newPanels[slabId].sameForAll) {
        newPanels[slabId].periods.forEach((period, idx) => {
          if (idx !== periodIdx && period.farmers[farmerIndex]) {
            period.farmers[farmerIndex] = {
              ...period.farmers[farmerIndex],
              ...updates
            };
          }
        });
      }
      
      // If sameAsAbove is checked for subsequent periods, update them too
      for (let i = periodIdx + 1; i < newPanels[slabId].periods.length; i++) {
        if (newPanels[slabId].periods[i].sameAsAbove && newPanels[slabId].periods[i].farmers[farmerIndex]) {
          newPanels[slabId].periods[i].farmers[farmerIndex] = {
            ...newPanels[slabId].periods[i].farmers[farmerIndex],
            ...updates
          };
        } else {
          break; // Stop if we encounter a period that's not "same as above"
        }
      }
      
      return newPanels;
    });
    setHasUnsavedChanges(true);
  };

  const checkSameAsAbove = (slabId: string, periodIdx: number, checked: boolean) => {
    setSlabPanels(prev => {
      const newPanels = { ...prev };
      if (checked && periodIdx > 0) {
        newPanels[slabId].periods[periodIdx].farmers = 
          newPanels[slabId].periods[periodIdx - 1].farmers.map(f => ({
            ...f,
            id: `farmer-${Date.now()}-${Math.random()}`
          }));
      }
      newPanels[slabId].periods[periodIdx].sameAsAbove = checked;
      return newPanels;
    });
  };

  const checkSameForAll = (slabId: string, checked: boolean) => {
    setSlabPanels(prev => {
      const newPanels = { ...prev };
      newPanels[slabId].sameForAll = checked;
      if (checked && newPanels[slabId].periods[0]) {
        const firstFarmers = newPanels[slabId].periods[0].farmers;
        newPanels[slabId].periods = newPanels[slabId].periods.map((p, idx) => ({
          ...p,
          farmers: idx === 0 ? firstFarmers : firstFarmers.map(f => ({
            ...f,
            id: `farmer-${Date.now()}-${Math.random()}-${idx}`
          })),
          sameAsAbove: false,
        }));
      }
      return newPanels;
    });
  };

  const toggleSlab = (slabId: string) => {
    setExpandedSlabs(prev => ({
      ...prev,
      [slabId]: !prev[slabId]
    }));
  };

  const togglePeriod = (slabId: string, period: string) => {
    setExpandedPeriods(prev => ({
      ...prev,
      [`${slabId}-${period}`]: !prev[`${slabId}-${period}`]
    }));
  };

  const handleSubmit = async () => {
    if (!landBasicInfo?.id) {
      toast({
        title: "Error",
        description: "Land record not found",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    
    try {
      const panipatraks: Panipatrak[] = [];
      
      const hasEmptyFarmers = Object.values(slabPanels).some(({ periods }) => 
        periods.some(p => 
          p.farmers.some(f => !f.name.trim())
        )
      );

      if (hasEmptyFarmers) {
        throw new Error("All farmers must have a name");
      }

      Object.values(slabPanels).forEach(({ periods, slab }) => {
        // Debug log to check slab data
        console.log('Processing slab:', slab);
        
        periods.forEach(p => {
          // Validate slab.id is a proper UUID
          if (!slab.id || typeof slab.id !== 'string' || slab.id === '1') {
            console.error('Invalid slab ID:', slab.id);
            throw new Error(`Invalid slab ID: ${slab.id}`);
          }

          panipatraks.push({
            slabId: slab.id,
            sNo: slab.sNo,
            year: p.from,
            farmers: p.farmers.map(f => ({
              id: f.id,
              name: f.name.trim(),
              area: {
                value: f.area.value || 0,
                unit: f.area.unit
              }
            }))
          });
        });
      });

      console.log('Panipatraks to save:', panipatraks);

      const { error } = await LandRecordService.savePanipatraks(
        landBasicInfo.id,
        panipatraks
      );

      if (error) {
        console.error('Save error:', error);
        throw error;
      }

      setPanipatraks(panipatraks);
      setHasUnsavedChanges(false);
      setCurrentStep(4);
      toast({ title: "Panipatraks saved successfully" });

    } catch (error: unknown) {
      console.error('Submit error:', error);
      toast({
        title: "Save failed",
        description: error instanceof Error ? error.message : "An unknown error occurred",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!yearSlabs.length) {
    return <div className="p-10">Please add year slabs in Step 2!</div>;
  }

  if (!isInitialized) {
    return (
      <Card>
        <CardContent className="p-10 text-center">
          <Loader2 className="mx-auto h-8 w-8 animate-spin mb-4" />
          <p>Loading farmer details...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Panipatrak (Farmer Details)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {Object.entries(slabPanels).map(([slabId, { slab, periods, sameForAll }]) => (
          <Card key={slabId} className="mb-6 border-2 border-gray-200">
            <CardHeader className="bg-gray-50 p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="font-bold text-lg">
                    Slab {Object.keys(slabPanels).indexOf(slabId) + 1}: {slab.startYear} - {slab.endYear}
                  </h2>
                  <p className="text-sm text-gray-600">Survey No: {slab.sNo}</p>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleSlab(slabId)}
                >
                  {expandedSlabs[slabId] ? (
                    <ChevronUp className="h-5 w-5" />
                  ) : (
                    <ChevronDown className="h-5 w-5" />
                  )}
                </Button>
              </div>
              
              <div className="flex items-center space-x-4 pt-2">
                <Checkbox
                  checked={sameForAll}
                  onCheckedChange={v => checkSameForAll(slabId, v as boolean)}
                  id={`sameforall-${slabId}`}
                />
                <Label htmlFor={`sameforall-${slabId}`}>Same for all years in this slab</Label>
              </div>
            </CardHeader>
            
            {expandedSlabs[slabId] && (
              <CardContent className="space-y-6 p-4">
                {periods.map((period, periodIdx) => {
                  // Hide periods when sameForAll is checked (show only first period)
                  if (sameForAll && periodIdx > 0) {
                    return null;
                  }
                  
                  return (
                    <Card key={`${slabId}-${period.period}`} className="shadow-sm border">
                      <div 
                        className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
                        onClick={() => togglePeriod(slabId, period.period)}
                      >
                        <div>
                          <h3 className="font-semibold text-md">
                            {sameForAll ? `All Years (${slab.startYear}-${slab.endYear})` : period.period}
                          </h3>
                          <p className="text-sm text-gray-500">
                            {period.farmers.length} farmer(s)
                          </p>
                        </div>
                        <div className="flex items-center space-x-4">
                          {periodIdx > 0 && !sameForAll && (
                            <div 
                              className="flex items-center space-x-2"
                              onClick={e => e.stopPropagation()}
                            >
                              <Checkbox
                                checked={period.sameAsAbove}
                                onCheckedChange={v =>
                                  checkSameAsAbove(slabId, periodIdx, v as boolean)
                                }
                                id={`sameasabove-${slabId}-${period.period}`}
                              />
                              <Label htmlFor={`sameasabove-${slabId}-${period.period}`}>
                                Same as above
                              </Label>
                            </div>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                          >
                            {expandedPeriods[`${slabId}-${period.period}`] ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      
                      {expandedPeriods[`${slabId}-${period.period}`] && (
                        <div className="p-4 space-y-4">
                          {period.farmers.map((farmer, farmerIdx) => (
                            <Card key={farmer.id} className="p-4 bg-gray-50">
                              <div className="flex justify-between items-center mb-3">
                                <h4 className="font-medium text-md">Farmer {farmerIdx + 1}</h4>
                                {period.farmers.length > 1 && !period.sameAsAbove && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => removeFarmer(slabId, periodIdx, farmer.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </div>
                              
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label htmlFor={`farmer-name-${farmer.id}`}>Farmer Name *</Label>
                                  <Input
                                    id={`farmer-name-${farmer.id}`}
                                    value={farmer.name}
                                    onChange={(e) =>
                                      updateFarmer(slabId, periodIdx, farmer.id, { 
                                        name: e.target.value 
                                      })
                                    }
                                    placeholder="Enter farmer name"
                                    disabled={period.sameAsAbove}
                                    className="w-full"
                                  />
                                </div>
                                
                                <div className="space-y-2">
                                  {areaFields(farmer, (updatedFarmer) => {
                                    updateFarmer(slabId, periodIdx, farmer.id, updatedFarmer);
                                  })}
                                </div>
                              </div>
                            </Card>
                          ))}
                          
                          {!period.sameAsAbove && (
                            <Button
                              variant="outline"
                              onClick={() => addFarmer(slabId, periodIdx)}
                              className="w-full mt-3"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add Farmer
                            </Button>
                          )}
                        </div>
                      )}
                    </Card>
                  );
                })}
              </CardContent>
            )}
          </Card>
        ))}
        
        <div className="flex justify-center pt-6">
          <Button onClick={handleSubmit} disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                Save and Continue
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
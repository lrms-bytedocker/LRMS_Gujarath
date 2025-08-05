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
import { Trash2, Plus, ArrowRight, ArrowLeft, Loader2 } from "lucide-react";
import {
  useLandRecord,
  Farmer,
  YearSlab,
  Panipatrak,
} from "@/contexts/land-record-context";
import { LandRecordService } from "@/lib/supabase"; 
import { toast } from "@/hooks/use-toast";

type AreaUnit = "acre" | "sq_m";
type FarmerStrict = {
  id: string;
  name: string;
  area: { value: number; unit: AreaUnit };
};

function getYearPeriods(slab: YearSlab) {
  const periods: { from: number; to: number; period: string }[] = [];
  for (let y = slab.startYear; y < slab.endYear; y++) {
    periods.push({ from: y, to: y + 1, period: `${y}-${y + 1}` });
  }
  return periods;
}

export default function PanipatrakStep() {
  const { yearSlabs, setPanipatraks, setCurrentStep, landBasicInfo } = useLandRecord();
  const [loading, setLoading] = useState(false);

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

 useEffect(() => {
  if (!yearSlabs || yearSlabs.length === 0) return;

  const initializePanels = async () => {
    const newPanels: typeof slabPanels = {};
    
    // Initialize with empty data first
    for (const slab of yearSlabs) {
      newPanels[slab.id] = {
        periods: getYearPeriods(slab).map(pr => ({
          ...pr,
          farmers: [{ id: "1", name: "", area: { value: 0, unit: "acre" } }],
          sameAsAbove: false,
        })),
        sameForAll: false,
        slab,
      };
    }

    // Then load saved data if available
    if (landBasicInfo?.id) {
      const { data, error } = await LandRecordService.getPanipatraks(landBasicInfo.id);
      if (!error && data) {
        // Merge saved data with initialized panels
        const bySlabId: Record<string, Panipatrak[]> = {};
        data.forEach(p => {
          if (!bySlabId[p.slabId]) bySlabId[p.slabId] = [];
          bySlabId[p.slabId].push(p);
        });

        Object.keys(newPanels).forEach(slabId => {
          if (bySlabId[slabId]) {
            newPanels[slabId].periods = newPanels[slabId].periods.map(period => {
              const savedData = bySlabId[slabId].find(p => p.year === period.from);
              return savedData ? {
                ...period,
                farmers: savedData.farmers,
                sameAsAbove: false
              } : period;
            });
          }
        });
      }
    }

    setSlabPanels(newPanels);
  };

  initializePanels();
}, [yearSlabs, landBasicInfo?.id]);

  // Add/remove/edit farmer
  const addFarmer = (slabId: string, periodIdx: number) => {
    setSlabPanels(panels => {
      const clone = { ...panels };
      clone[slabId].periods[periodIdx] = {
        ...clone[slabId].periods[periodIdx],
        farmers: [
          ...clone[slabId].periods[periodIdx].farmers,
          { id: Date.now().toString(), name: "", area: { value: 0, unit: "acre" } }
        ]
      };
      return clone;
    });
  };
  const removeFarmer = (slabId: string, periodIdx: number, farmerId: string) => {
    setSlabPanels(panels => {
      const clone = { ...panels };
      clone[slabId].periods[periodIdx] = {
        ...clone[slabId].periods[periodIdx],
        farmers: clone[slabId].periods[periodIdx].farmers.filter(f => f.id !== farmerId)
      };
      return clone;
    });
  };
  const updateFarmer = (
    slabId: string,
    periodIdx: number,
    farmerId: string,
    updates: Partial<FarmerStrict>
  ) => {
    setSlabPanels(panels => {
      const clone = { ...panels };
      clone[slabId].periods[periodIdx] = {
        ...clone[slabId].periods[periodIdx],
        farmers: clone[slabId].periods[periodIdx].farmers.map(f =>
          f.id === farmerId ? { ...f, ...updates } : f
        ),
      };
      return clone;
    });
  };

  const checkSameAsAbove = (slabId: string, periodIdx: number, checked: boolean) => {
    setSlabPanels(panels => {
      const clone = { ...panels };
      if (checked && periodIdx > 0) {
        clone[slabId].periods[periodIdx].farmers =
          clone[slabId].periods[periodIdx - 1].farmers.map(f => ({ ...f, id: Date.now().toString() }));
      }
      clone[slabId].periods[periodIdx].sameAsAbove = checked;
      return clone;
    });
  };

  const checkSameForAll = (slabId: string, checked: boolean) => {
    setSlabPanels(panels => {
      const clone = { ...panels };
      clone[slabId].sameForAll = checked;
      if (checked && clone[slabId].periods[0]) {
        const firstFarmers = clone[slabId].periods[0].farmers.map(f => ({ ...f, id: Date.now().toString() }));
        clone[slabId].periods = clone[slabId].periods.map(p => ({
          ...p,
          farmers: JSON.parse(JSON.stringify(firstFarmers)),
          sameAsAbove: false,
        }));
      }
      return clone;
    });
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
    
    // Validate at least one farmer has a name
    const hasEmptyFarmers = Object.values(slabPanels).some(({ periods }) => 
      periods.some(p => 
        p.farmers.some(f => !f.name.trim())
      )
    );

    if (hasEmptyFarmers) {
      throw new Error("All farmers must have a name");
    }

    // Prepare data
    Object.values(slabPanels).forEach(({ periods, slab }) => {
      periods.forEach(p => {
        panipatraks.push({
          slabId: slab.id,
          sNo: slab.sNo,
          year: p.from,
          farmers: p.farmers
        });
      });
    });

    const { error } = await LandRecordService.savePanipatraks(
      landBasicInfo.id,
      panipatraks
    );

    if (error) throw error;

    setPanipatraks(panipatraks);
    setCurrentStep(4);
    toast({ title: "Panipatraks saved successfully" });

  } catch (error: unknown) {
    toast({
      title: "Save failed",
      description: error instanceof Error ? error.message : "An unknown error occurred",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};

  if (!yearSlabs.length) return <div className="p-10">Please add year slabs in Step 2!</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 3: Panipatrak (Farmer Details)</CardTitle>
      </CardHeader>
      <CardContent className="space-y-8">
        {Object.values(slabPanels).map(({ slab, periods, sameForAll }) => (
          <Card key={slab.id} className="mb-6 border-2 border-gray-200">
            <CardHeader>
              <h2 className="font-bold mb-2">
                Year Slab: {slab.startYear} - {slab.endYear} | Survey No: {slab.sNo}
              </h2>
              <div className="flex items-center space-x-4">
                <Checkbox
                  checked={sameForAll}
                  onCheckedChange={v => checkSameForAll(slab.id, v as boolean)}
                  id={`sameforall-${slab.id}`}
                />
                <Label htmlFor={`sameforall-${slab.id}`}>Same for all years in this slab</Label>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {periods.map((period, periodIdx) => (
                <Card key={period.period} className="p-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{period.period}</h3>
                    {periodIdx > 0 && !sameForAll && (
                      <div className="flex items-center space-x-1">
                        <Checkbox
                          checked={period.sameAsAbove}
                          onCheckedChange={v =>
                            checkSameAsAbove(slab.id, periodIdx, v as boolean)
                          }
                          id={`sameasabove-${slab.id}-${period.period}`}
                        />
                        <Label htmlFor={`sameasabove-${slab.id}-${period.period}`}>Same as above</Label>
                      </div>
                    )}
                  </div>
                  {period.farmers.map((farmer, farmerIdx) => (
                    <Card key={farmer.id} className="p-3 mb-2">
                      <div className="flex justify-between items-center mb-3">
                        <h4 className="font-medium">Farmer {farmerIdx + 1}</h4>
                        {period.farmers.length > 1 && !sameForAll && !period.sameAsAbove && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeFarmer(slab.id, periodIdx, farmer.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="space-y-2">
                          <Label>Farmer Name *</Label>
                          <Input
                            value={farmer.name}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateFarmer(slab.id, periodIdx, farmer.id, { name: e.target.value })
                            }
                            placeholder="Enter farmer name"
                            disabled={period.sameAsAbove || sameForAll}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Area Value *</Label>
                          <Input
                            type="number"
                            value={farmer.area.value}
                            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                              updateFarmer(slab.id, periodIdx, farmer.id, {
                                area: { ...farmer.area, value: Number(e.target.value) || 0 },
                              })
                            }
                            placeholder="Enter area"
                            disabled={period.sameAsAbove || sameForAll}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Area Unit</Label>
                          <Select
                            value={farmer.area.unit}
                            onValueChange={(value: AreaUnit) =>
                              updateFarmer(slab.id, periodIdx, farmer.id, {
                                area: { ...farmer.area, unit: value },
                              })
                            }
                            disabled={period.sameAsAbove || sameForAll}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="acre">Acre - Guntha</SelectItem>
                              <SelectItem value="sq_m">Sq. Mtr.</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </Card>
                  ))}
                  {!period.sameAsAbove && !sameForAll && (
                    <Button
                      variant="outline"
                      onClick={() => addFarmer(slab.id, periodIdx)}
                      className="w-full"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add Farmer
                    </Button>
                  )}
                </Card>
              ))}
            </CardContent>
          </Card>
        ))}
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(2)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
  {loading ? (
    <>
      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      Saving...
    </>
  ) : (
    <>
      Next Step <ArrowRight className="w-4 h-4 ml-2" />
    </>
  )}
</Button>
        </div>
      </CardContent>
    </Card>
  );
}

"use client";
import { useState, useEffect, useCallback, useMemo } from "react";
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
  SlabEntry,
  Panipatrak,
} from "@/contexts/land-record-context";
import { LandRecordService } from "@/lib/supabase"; 
import { toast } from "@/hooks/use-toast";
import { convertToSquareMeters, convertFromSquareMeters } from "@/lib/supabase";
import { useStepFormData } from "@/hooks/use-step-form-data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

type AreaUnit = "acre" | "sq_m";
type FarmerStrict = {
  id: string;
  name: string;
  area: { value: number; unit: AreaUnit };
  areaType: "acre_guntha" | "sq_m";
  acre?: number;
  guntha?: number;
  sq_m?: number;
  paikyNumber?: number;
  ekatrikaranNumber?: number;
  type: 'regular' | 'paiky' | 'ekatrikaran';
};

const getYearPeriods = (slab: YearSlab) => {
  const periods = [];
  if (slab.startYear && slab.endYear) {
    for (let year = slab.startYear; year < slab.endYear; year++) {
      periods.push({
        period: `${year}-${year + 1}`,
        from: year,
        to: year + 1
      });
    }
  }
  return periods;
};

const areaFields = (farmer: FarmerStrict, onChange: (f: FarmerStrict) => void) => {
  // Calculate display values based on current area with rounded sq_m
  const displayValues = {
    sq_m: Math.round((farmer.area.value || 0) * 100) / 100, // Round to 2 decimal places
    acre: Math.floor(convertFromSquareMeters(farmer.area.value || 0, "acre")),
    guntha: Math.round(convertFromSquareMeters(farmer.area.value || 0, "guntha") % 40)
  };

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
      const totalAcres = convertFromSquareMeters(num, "acre");
      const acres = Math.floor(totalAcres);
      const remainingGuntha = Math.round((totalAcres - acres) * 40);
      
      onChange({
        ...farmer,
        sq_m: num,
        acre: acres,
        guntha: remainingGuntha,
        area: { value: num, unit: "sq_m" },
        areaType: farmer.areaType
      });
    }
  };

  const handleAcreChange = (value: string) => {
    if (value === "") {
      const remainingSqm = farmer.guntha ? Math.round(convertToSquareMeters(farmer.guntha, "guntha") * 100) / 100 : undefined;
      onChange({
        ...farmer,
        acre: undefined,
        guntha: farmer.guntha,
        sq_m: remainingSqm,
        area: {
          value: remainingSqm || 0,
          unit: "sq_m"
        },
        areaType: farmer.areaType
      });
      return;
    }

    const num = parseFloat(value);
    if (!isNaN(num)) {
      const guntha = farmer.guntha || 0;
      const totalSqm = Math.round((convertToSquareMeters(num, "acre") + 
                      convertToSquareMeters(guntha, "guntha")) * 100) / 100; // Round to 2 decimal places
      onChange({ 
        ...farmer, 
        acre: num,
        sq_m: totalSqm,
        area: { value: totalSqm, unit: "sq_m" },
        areaType: farmer.areaType
      });
    }
  };

  const handleGunthaChange = (value: string) => {
    if (value === "") {
      const remainingSqm = farmer.acre ? Math.round(convertToSquareMeters(farmer.acre, "acre") * 100) / 100 : undefined;
      onChange({
        ...farmer,
        guntha: undefined,
        acre: farmer.acre,
        sq_m: remainingSqm,
        area: {
          value: remainingSqm || 0,
          unit: "sq_m"
        },
        areaType: farmer.areaType
      });
      return;
    }

    let num = parseFloat(value);
    if (!isNaN(num)) {
      if (num >= 40) {
        num = 39;
        toast({ title: "Guntha must be less than 40" });
      }
      
      const acre = farmer.acre || 0;
      const totalSqm = Math.round((convertToSquareMeters(acre, "acre") + 
                      convertToSquareMeters(num, "guntha")) * 100) / 100; // Round to 2 decimal places
      onChange({ 
        ...farmer, 
        guntha: num,
        sq_m: totalSqm,
        area: { value: totalSqm, unit: "sq_m" },
        areaType: farmer.areaType
      });
    }
  };

  const formatValue = (value: number | undefined): string => {
    return value === undefined ? "" : value.toString();
  };

  return (
    <div className="space-y-4">
      <Select
        value={farmer.areaType}
        onValueChange={(val) => {
          const newType = val as "acre_guntha" | "sq_m";
          onChange({
            ...farmer,
            areaType: newType,
            area: { value: farmer.area.value || 0, unit: "sq_m" }
          });
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

      {farmer.areaType === "sq_m" ? (
        <>
          <div className="space-y-2">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter sq. meters"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Acres</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={formatValue(displayValues.acre)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter acres"
              />
            </div>
            <div className="space-y-2">
              <Label>Guntha</Label>
              <Input
                type="number"
                min={0}
                max={39}
                step="1"
                value={formatValue(displayValues.guntha)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter guntha (0-39)"
                onKeyDown={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (e.key === 'e' || 
                      (e.key === '.' && target.value.includes('.')) ||
                      (parseFloat(target.value + e.key) >= 40)) {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Acres</Label>
              <Input
                type="number"
                min={0}
                step="1"
                value={formatValue(displayValues.acre)}
                onChange={(e) => handleAcreChange(e.target.value)}
                placeholder="Enter acres"
              />
            </div>
            <div className="space-y-2">
              <Label>Guntha</Label>
              <Input
                type="number"
                min={0}
                max={39}
                step="1"
                value={formatValue(displayValues.guntha)}
                onChange={(e) => handleGunthaChange(e.target.value)}
                placeholder="Enter guntha (0-39)"
                onKeyDown={(e) => {
                  const target = e.target as HTMLInputElement;
                  if (e.key === 'e' || 
                      (e.key === '.' && target.value.includes('.')) ||
                      (parseFloat(target.value + e.key) >= 40)) {
                    e.preventDefault();
                  }
                }}
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label>Square Meters</Label>
            <Input
              type="number"
              min={0}
              step="0.01"
              value={formatValue(displayValues.sq_m)}
              onChange={(e) => handleSqmChange(e.target.value)}
              placeholder="Enter sq. meters"
            />
          </div>
        </>
      )}
    </div>
  );
};

const FarmerCard = ({
  farmer,
  farmerIdx,
  slabId,
  periodIdx,
  onUpdate,
  onRemove,
  isSpecialType = false,
  slabEntryData
}: {
  farmer: FarmerStrict;
  farmerIdx: number;
  slabId: string;
  periodIdx: number;
  onUpdate: (slabId: string, periodIdx: number, farmerId: string, updates: Partial<FarmerStrict>) => void;
  onRemove: (slabId: string, periodIdx: number, farmerId: string) => void;
  isSpecialType?: boolean;
  slabEntryData?: SlabEntry;
}) => {
  return (
    <Card key={farmer.id} className="p-4 bg-gray-50">
      <div className="flex justify-between items-center mb-3">
        <h4 className="font-medium text-md">
          {isSpecialType 
            ? `${farmer.type === 'paiky' ? 'Paiky' : 'Ekatrikaran'} ${farmer.paikyNumber || farmer.ekatrikaranNumber} - Farmer ${farmerIdx + 1}`
            : `Farmer ${farmerIdx + 1}`}
        </h4>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onRemove(slabId, periodIdx, farmer.id)}
          className="text-red-600 hover:text-red-800"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor={`farmer-name-${farmer.id}`}>
            {isSpecialType 
              ? `${farmer.type === 'paiky' ? 'Farmer' : 'Farmer'} Name *`
              : 'Farmer Name *'}
          </Label>
          <Input
            id={`farmer-name-${farmer.id}`}
            value={farmer.name}
            onChange={(e) =>
              onUpdate(slabId, periodIdx, farmer.id, { 
                name: e.target.value 
              })
            }
            placeholder={
              isSpecialType 
                ? `Enter ${farmer.type === 'paiky' ? 'farmer' : 'farmer'} name`
                : "Enter farmer name"
            }
            className="w-full"
          />
        </div>
        
        <div className="space-y-2">
          {areaFields(farmer, (updatedFarmer) => {
            onUpdate(slabId, periodIdx, farmer.id, updatedFarmer);
          })}
        </div>
      </div>
    </Card>
  );
};
const normalizeForComparison = (panipatraks: Panipatrak[]) => {
  if (!panipatraks) return [];
  
  return panipatraks
    .filter(pani => pani.farmers?.length > 0)
    .map(pani => ({
      slabId: pani.slabId,
      sNo: pani.sNo,
      year: pani.year,
      farmers: pani.farmers
        .filter(f => f?.name?.trim())
        .map(f => ({
          name: f.name.trim(),
          area: {
            value: Math.round(f.area.value * 100) / 100, // Round to 2 decimals
            unit: f.area.unit
          },
          type: f.type,
          paikyNumber: f.paikyNumber ?? null, // Use null instead of undefined
          ekatrikaranNumber: f.ekatrikaranNumber ?? null
        }))
        // Stable sort by name then by type
        .sort((a, b) => {
          const nameCompare = a.name.localeCompare(b.name);
          if (nameCompare !== 0) return nameCompare;
          return (a.type || '').localeCompare(b.type || '');
        })
    }))
    // Stable sort by slab then year
    .sort((a, b) => {
      const slabCompare = a.slabId.localeCompare(b.slabId);
      if (slabCompare !== 0) return slabCompare;
      return a.year - b.year;
    });
};

export default function PanipatrakStep() {
  const { yearSlabs, setCurrentStep, currentStep, landBasicInfo, panipatraks, // get panipatraks from context
  setPanipatraks, recordId } = useLandRecord();
  const { getStepData, updateStepData } = useStepFormData(3);
  const [loading, setLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [expandedSlabs, setExpandedSlabs] = useState<Record<string, boolean>>({});
  const [expandedPeriods, setExpandedPeriods] = useState<Record<string, boolean>>({});
  const [previousYearSlabs, setPreviousYearSlabs] = useState<YearSlab[]>([]);

useEffect(() => {
  // Only compare specific properties that affect the period structure
  const shouldReinitialize = yearSlabs.length > 0 && isInitialized && 
      (previousYearSlabs.length !== yearSlabs.length ||
       !yearSlabs.every((slab, index) => 
         previousYearSlabs[index]?.startYear === slab.startYear &&
         previousYearSlabs[index]?.endYear === slab.endYear
       ));
  
  if (shouldReinitialize) {
    console.log('Year slabs structure changed, forcing reinitialization');
    setIsInitialized(false);
  }
  
  // Update previous reference
  setPreviousYearSlabs(yearSlabs);
}, [yearSlabs, isInitialized, previousYearSlabs]);

  const [slabPanels, setSlabPanels] = useState<{
  [slabId: string]: {
    periods: {
      period: string;
      from: number;
      to: number;
      regularFarmers: FarmerStrict[];
      paikies: {
        paikyNumber: number;
        farmers: FarmerStrict[];
        entry?: SlabEntry; // Add this
      }[];
      ekatrikarans: {
        ekatrikaranNumber: number;
        farmers: FarmerStrict[];
        entry?: SlabEntry; // Add this
      }[];
      sameAsAbove: boolean;
    }[];
    sameForAll: boolean;
    slab: YearSlab;
  };
}>({});

  useEffect(() => {
  console.log("Slab panels state:", slabPanels);
}, [slabPanels]);

useEffect(() => {
  console.log("Year slabs:", yearSlabs);
}, [yearSlabs]);

useEffect(() => {
  if (!yearSlabs?.length) {
    setSlabPanels({});
    setIsInitialized(false);
    setPreviousYearSlabs([]);
    return;
  }

  const initialize = async () => {
    // Only initialize if not already initialized or if forced
    if (isInitialized) return;
    console.log('Reinitializing with updated yearSlabs:', yearSlabs);
    
    // Force complete reset before reinitializing
    setSlabPanels({});
    setIsInitialized(false);
    
    // Add a small delay to ensure state is cleared
    await new Promise(resolve => setTimeout(resolve, 50));
    
    const stepData = getStepData();
    let dataToUse: Panipatrak[] = [];

    if (stepData?.panipatraks?.length > 0) {
      dataToUse = stepData.panipatraks;
    } else if (panipatraks?.length > 0) {
      dataToUse = panipatraks;
    }
    
    initializeFromYearSlabs(yearSlabs, dataToUse);
    setIsInitialized(true);
    
    setTimeout(() => {
      const initialPanipatraks = getCurrentPanipatraks();
      setOriginalData(normalizeForComparison(initialPanipatraks));
      setHasChanges(false);
    }, 100);
  };

  initialize();
}, [yearSlabs, panipatraks, isInitialized]);

useEffect(() => {
  console.log('YearSlabs changed:', yearSlabs);
  console.log('SlabPanels:', slabPanels);
  console.log('isInitialized:', isInitialized);
}, [yearSlabs, slabPanels, isInitialized]);

// Add these to your component state
const [originalData, setOriginalData] = useState<Panipatrak[]>([]);
const [hasChanges, setHasChanges] = useState(false);

const getAllUniqueSlabNumbers = (slab: YearSlab) => {
  // If there are paiky/ekatrikaran entries, only show those (ignore main slab s_no)
  if ((slab.paiky || slab.ekatrikaran) && 
      ((slab.paikyEntries && slab.paikyEntries.length > 0) || 
       (slab.ekatrikaranEntries && slab.ekatrikaranEntries.length > 0))) {
    
    const allEntries = [
      ...(slab.paikyEntries || []),
      ...(slab.ekatrikaranEntries || [])
    ];
    
    // Get unique combinations from entries only
    const uniqueEntries = allEntries.reduce((acc: any, entry: any) => {
      const key = `${entry.sNoType}-${entry.sNo}`;
      if (!acc[key]) {
        acc[key] = {
          sNo: entry.sNo,
          sNoType: entry.sNoType
        };
      }
      return acc;
    }, {});
    
    return Object.values(uniqueEntries);
  } else {
    // No paiky/ekatrikaran entries, show main slab s_no
    return [{
      sNo: slab.sNo,
      sNoType: slab.sNoType
    }];
  }
};

// Add this function to get current panipatraks
const getCurrentPanipatraks = useCallback(() => {
  const panipatraks: Panipatrak[] = [];
  Object.values(slabPanels).forEach(({ periods, slab }) => {
    periods.forEach(p => {
      const allFarmers = [
        ...p.regularFarmers,
        ...p.paikies.flatMap(paiky => paiky.farmers),
        ...p.ekatrikarans.flatMap(ek => ek.farmers)
      ];

      // Only include farmers with names (filter out empty farmers)
      const validFarmers = allFarmers.filter(f => f.name.trim());

      if (validFarmers.length > 0) {
        panipatraks.push({
          slabId: slab.id,
          sNo: slab.sNo,
          year: p.from,
          farmers: validFarmers.map(f => ({
            id: f.id,
            name: f.name.trim(),
            area: {
              value: f.area.value || 0,
              unit: f.area.unit
            },
            paikyNumber: f.paikyNumber,
            ekatrikaranNumber: f.ekatrikaranNumber,
            type: f.type
          }))
        });
      }
    });
  });
  
  return panipatraks.sort((a, b) => {
    if (a.slabId !== b.slabId) return a.slabId.localeCompare(b.slabId);
    return a.year - b.year;
  });
}, [slabPanels]);

// Add this useMemo before the effect
const currentNormalizedData = useMemo(() => {
  if (!isInitialized) return [];
  const currentPanipatraks = getCurrentPanipatraks();
  return normalizeForComparison(currentPanipatraks);
}, [slabPanels, isInitialized]);

// Replace the existing effect with this:
useEffect(() => {
  if (!isInitialized || originalData.length === 0 || currentNormalizedData.length === 0) return;
  
  const hasChanged = !deepEqual(currentNormalizedData, originalData);
  setHasChanges(hasChanged);
}, [currentNormalizedData, originalData, isInitialized]);

useEffect(() => {
  if (isInitialized && Object.keys(slabPanels).length > 0 && originalData.length === 0) {
    const initialPanipatraks = getCurrentPanipatraks();
    setOriginalData(normalizeForComparison(initialPanipatraks));
  }
}, [isInitialized, slabPanels, originalData.length]);


const initializeFromYearSlabs = (slabs: YearSlab[], savedPanipatraks: Panipatrak[] = []) => {
    // Clear existing state more aggressively
  setSlabPanels({});
  setExpandedSlabs({});
  setExpandedPeriods({});
  console.log('Initializing from slabs:', slabs);
  console.log('Using saved panipatraks:', savedPanipatraks);
  
  const newPanels: typeof slabPanels = {};
  const initialExpanded: Record<string, boolean> = {};
  const initialPeriodsExpanded: Record<string, boolean> = {};

  slabs.forEach(slab => {
    if (!slab.id || slab.startYear === undefined || slab.endYear === undefined) {
      console.error('Invalid slab data:', slab);
      return;
    }
    
    console.log(`Processing slab ${slab.id}:`, slab);
    
    const periods = getYearPeriods(slab);
    const slabPanipatraks = savedPanipatraks.filter(p => p.slabId === slab.id);
    
    newPanels[slab.id] = {
      slab,
      sameForAll: false,
      periods: periods.map(pr => {
        // Find saved data for this specific period (year)
        const savedData = slabPanipatraks.find(p => p.year === pr.from);
        const allFarmers = savedData?.farmers || [];
        
        // Convert farmers to strict format
        const regularFarmers = allFarmers
          .filter(f => f.type === 'regular')
          .map(f => ({
            id: f.id,
            name: f.name,
            area: {
              value: f.area.value,
              unit: f.area.unit as 'acre' | 'sq_m'
            },
            areaType: "sq_m",
            sq_m: f.area.unit === "sq_m" ? f.area.value : convertToSquareMeters(f.area.value, f.area.unit),
            acre: Math.floor(convertFromSquareMeters(f.area.value, "acre")),
            guntha: Math.round(convertFromSquareMeters(f.area.value, "guntha") % 40),
            type: 'regular'
          }));

        // Create paikies based on current slab data, not saved data
        const paikies = slab.paiky && slab.paikyCount > 0 ? 
          Array.from({ length: slab.paikyCount }, (_, i) => {
            const paikyNumber = i + 1;
            const savedPaikyFarmers = allFarmers.filter(f => 
              f.type === 'paiky' && f.paikyNumber === paikyNumber
            );
            
            // Use saved farmers if they exist, otherwise create default
            const farmers = savedPaikyFarmers.length > 0 ? 
              savedPaikyFarmers.map(f => ({
                id: f.id,
                name: f.name,
                area: f.area,
                areaType: "sq_m",
                sq_m: f.area.unit === "sq_m" ? f.area.value : convertToSquareMeters(f.area.value, f.area.unit),
                acre: convertFromSquareMeters(f.area.value, "acre"),
                guntha: convertFromSquareMeters(f.area.value, "guntha") % 40,
                type: 'paiky',
                paikyNumber
              })) : 
              [{
                id: `paiky-${Date.now()}-${Math.random()}`,
                name: "",
                area: { value: 0, unit: "sq_m" },
                areaType: "sq_m",
                sq_m: 0,
                acre: 0,
                guntha: 0,
                type: 'paiky',
                paikyNumber
              }];
            
            return {
              paikyNumber,
              farmers,
              entry: slab.paikyEntries?.[i]
            };
          }) : [];

        // Create ekatrikarans based on current slab data, not saved data
        const ekatrikarans = slab.ekatrikaran && slab.ekatrikaranCount > 0 ? 
          Array.from({ length: slab.ekatrikaranCount }, (_, i) => {
            const ekatrikaranNumber = i + 1;
            const savedEkatrikaranFarmers = allFarmers.filter(f => 
              f.type === 'ekatrikaran' && f.ekatrikaranNumber === ekatrikaranNumber
            );
            
            // Use saved farmers if they exist, otherwise create default
            const farmers = savedEkatrikaranFarmers.length > 0 ? 
              savedEkatrikaranFarmers.map(f => ({
                id: f.id,
                name: f.name,
                area: f.area,
                areaType: "sq_m",
                sq_m: f.area.unit === "sq_m" ? f.area.value : convertToSquareMeters(f.area.value, f.area.unit),
                acre: convertFromSquareMeters(f.area.value, "acre"),
                guntha: convertFromSquareMeters(f.area.value, "guntha") % 40,
                type: 'ekatrikaran',
                ekatrikaranNumber
              })) : 
              [{
                id: `ekatrikaran-${Date.now()}-${Math.random()}`,
                name: "",
                area: { value: 0, unit: "sq_m" },
                areaType: "sq_m",
                sq_m: 0,
                acre: 0,
                guntha: 0,
                type: 'ekatrikaran',
                ekatrikaranNumber
              }];
            
            return {
              ekatrikaranNumber,
              farmers,
              entry: slab.ekatrikaranEntries?.[i]
            };
          }) : [];

        // If no special types and no saved regular farmers, create default
        if (!slab.paiky && !slab.ekatrikaran && regularFarmers.length === 0) {
          regularFarmers.push({
            id: `farmer-${Date.now()}-${Math.random()}`,
            name: "",
            area: { value: 0, unit: "sq_m" },
            areaType: "sq_m",
            sq_m: 0,
            acre: 0,
            guntha: 0,
            type: 'regular'
          });
        }

        initialExpanded[slab.id] = true;
        if (periods.length > 0) {
          initialPeriodsExpanded[`${slab.id}-${periods[0].period}`] = true;
        }

        return {
          ...pr,
          regularFarmers,
          paikies,
          ekatrikarans,
          sameAsAbove: false
        };
      })
    };
  });

  console.log('New panels created:', newPanels);
  
  setSlabPanels(newPanels);
  setExpandedSlabs(initialExpanded);
  setExpandedPeriods(initialPeriodsExpanded);
};

const createDefaultFarmer = (type: 'regular' | 'paiky' | 'ekatrikaran', number?: number) => ({
  id: `farmer-${Date.now()}-${Math.random()}`,
  name: "",
  area: { value: 0, unit: "sq_m" },
  areaType: "sq_m",
  sq_m: 0,
  acre: 0,
  guntha: 0,
  type,
  ...(type === 'paiky' && { paikyNumber: number }),
  ...(type === 'ekatrikaran' && { ekatrikaranNumber: number })
});

function deepEqual(x: any, y: any): boolean {
  if (x === y) return true;
  if (x == null || y == null) return x === y;
  if (typeof x !== typeof y) return false;

  // Handle arrays
  if (Array.isArray(x)) {
    if (!Array.isArray(y) || x.length !== y.length) return false;
    return x.every((item, i) => deepEqual(item, y[i]));
  }

  // Handle objects
  if (typeof x === 'object') {
    const xKeys = Object.keys(x).filter(k => x[k] !== undefined && x[k] !== null);
    const yKeys = Object.keys(y).filter(k => y[k] !== undefined && y[k] !== null);
    if (xKeys.length !== yKeys.length) return false;
    return xKeys.every(key => deepEqual(x[key], y[key]));
  }

  // Handle numbers with precision
  if (typeof x === 'number') {
    return Math.abs(x - y) < 0.0001;
  }

  return x === y;
}
// Change this effect to prevent infinite updates
useEffect(() => {
  if (!isInitialized) return;

  const panipatraks: Panipatrak[] = [];
  Object.values(slabPanels).forEach(({ periods, slab }) => {
    periods.forEach(p => {
      const allFarmers = [
        ...p.regularFarmers,
        ...p.paikies.flatMap(paiky => paiky.farmers),
        ...p.ekatrikarans.flatMap(ek => ek.farmers)
      ];

      panipatraks.push({
        slabId: slab.id,
        sNo: slab.sNo,
        year: p.from,
        farmers: allFarmers.map(f => ({
          id: f.id,
          name: f.name.trim(),
          area: {
            value: f.area.value || 0,
            unit: f.area.unit
          },
          paikyNumber: f.paikyNumber,
          ekatrikaranNumber: f.ekatrikaranNumber,
          type: f.type
        }))
      });
    });
  });

  // Only update if there are actual changes
  const currentData = getStepData();
  if (!deepEqual(currentData?.panipatraks, panipatraks)) {
    updateStepData({ panipatraks });
  }
}, [slabPanels, isInitialized, getStepData, updateStepData]);
  
  const addFarmer = (slabId: string, periodIdx: number, type: 'regular' | 'paiky' | 'ekatrikaran', number?: number) => {
  setSlabPanels(prev => {
    const newPanels = JSON.parse(JSON.stringify(prev));
    const period = newPanels[slabId].periods[periodIdx];
    const hasSpecialTypes = period.paikies.length > 0 || period.ekatrikarans.length > 0;

    // Don't allow adding regular farmers if special types exist
    if (type === 'regular' && hasSpecialTypes) {
      return prev;
    }

     const newFarmer = {
      id: `farmer-${Date.now()}-${Math.random()}`,
      name: "",
      area: { value: 0, unit: "sq_m" as AreaUnit }, // Changed default to sq_m
      areaType: "sq_m" as const, // Changed default to sq_m
      sq_m: 0,
      acre: 0,
      guntha: 0,
      type,
      ...(type === 'paiky' && { paikyNumber: number }),
      ...(type === 'ekatrikaran' && { ekatrikaranNumber: number })
    };

    if (type === 'regular') {
      period.regularFarmers.push(newFarmer);
    } 
    else if (type === 'paiky' && number) {
      const paiky = period.paikies.find(p => p.paikyNumber === number);
      if (paiky) paiky.farmers.push(newFarmer);
    }
    else if (type === 'ekatrikaran' && number) {
      const ekatrikaran = period.ekatrikarans.find(e => e.ekatrikaranNumber === number);
      if (ekatrikaran) ekatrikaran.farmers.push(newFarmer);
    }

    return newPanels;
  });
};

  const removeFarmer = (slabId: string, periodIdx: number, farmerId: string) => {
  setSlabPanels(prev => {
    const newPanels = JSON.parse(JSON.stringify(prev));
    const period = newPanels[slabId].periods[periodIdx];

    // Check regular farmers
    const regularIndex = period.regularFarmers.findIndex(f => f.id === farmerId);
    if (regularIndex !== -1 && period.regularFarmers.length > 1) {
      period.regularFarmers.splice(regularIndex, 1);
      return newPanels;
    }

    // Check paikies
    for (const paiky of period.paikies) {
      const paikyIndex = paiky.farmers.findIndex(f => f.id === farmerId);
      if (paikyIndex !== -1 && paiky.farmers.length > 1) {
        paiky.farmers.splice(paikyIndex, 1);
        return newPanels;
      }
    }

    // Check ekatrikarans
    for (const ekatrikaran of period.ekatrikarans) {
      const ekatrikaranIndex = ekatrikaran.farmers.findIndex(f => f.id === farmerId);
      if (ekatrikaranIndex !== -1 && ekatrikaran.farmers.length > 1) {
        ekatrikaran.farmers.splice(ekatrikaranIndex, 1);
        return newPanels;
      }
    }

    return prev; // No changes if we can't remove (minimum 1 farmer required)
  });
};

const updateFarmer = (
  slabId: string,
  periodIdx: number,
  farmerId: string,
  updates: Partial<FarmerStrict>
) => {
  setSlabPanels(prev => {
    const newPanels = JSON.parse(JSON.stringify(prev));
    const period = newPanels[slabId].periods[periodIdx];

    // Update in regular farmers
    const regularIndex = period.regularFarmers.findIndex(f => f.id === farmerId);
    if (regularIndex !== -1) {
      period.regularFarmers[regularIndex] = {
        ...period.regularFarmers[regularIndex],
        ...updates
      };
      return newPanels;
    }

    // Update in paikies
    for (const paiky of period.paikies) {
      const paikyIndex = paiky.farmers.findIndex(f => f.id === farmerId);
      if (paikyIndex !== -1) {
        paiky.farmers[paikyIndex] = {
          ...paiky.farmers[paikyIndex],
          ...updates
        };
        return newPanels;
      }
    }

    // Update in ekatrikarans
    for (const ekatrikaran of period.ekatrikarans) {
      const ekatrikaranIndex = ekatrikaran.farmers.findIndex(f => f.id === farmerId);
      if (ekatrikaranIndex !== -1) {
        ekatrikaran.farmers[ekatrikaranIndex] = {
          ...ekatrikaran.farmers[ekatrikaranIndex],
          ...updates
        };
        return newPanels;
      }
    }

    return prev; // No changes if farmer not found
  });
};

  const checkSameAsAbove = (slabId: string, periodIdx: number, checked: boolean) => {
  setSlabPanels(prev => {
    const newPanels = JSON.parse(JSON.stringify(prev));
    
    if (checked && periodIdx > 0) {
      const prevPeriod = newPanels[slabId].periods[periodIdx - 1];
      const currentPeriod = newPanels[slabId].periods[periodIdx];
      
      // Copy all data from previous period
      currentPeriod.regularFarmers = prevPeriod.regularFarmers.map(f => ({
        ...f,
        id: `farmer-${Date.now()}-${Math.random()}`
      }));
      
      currentPeriod.paikies = prevPeriod.paikies.map(paiky => ({
        paikyNumber: paiky.paikyNumber,
        farmers: paiky.farmers.map(f => ({
          ...f,
          id: `paiky-${Date.now()}-${Math.random()}`
        }))
      }));
      
      currentPeriod.ekatrikarans = prevPeriod.ekatrikarans.map(ek => ({
        ekatrikaranNumber: ek.ekatrikaranNumber,
        farmers: ek.farmers.map(f => ({
          ...f,
          id: `ekatrikaran-${Date.now()}-${Math.random()}`
        }))
      }));
    }
    
    newPanels[slabId].periods[periodIdx].sameAsAbove = checked;
    return newPanels;
  });
};

  const checkSameForAll = (slabId: string, checked: boolean) => {
  setSlabPanels(prev => {
    const newPanels = JSON.parse(JSON.stringify(prev));
    newPanels[slabId].sameForAll = checked;
    
    if (checked && newPanels[slabId].periods[0]) {
      const firstPeriod = newPanels[slabId].periods[0];
      
      newPanels[slabId].periods = newPanels[slabId].periods.map((p, idx) => {
        if (idx === 0) return p;
        
        return {
          ...p,
          regularFarmers: firstPeriod.regularFarmers.map(f => ({
            ...f,
            id: `farmer-${Date.now()}-${Math.random()}-${idx}`
          })),
          paikies: firstPeriod.paikies.map(paiky => ({
            paikyNumber: paiky.paikyNumber,
            farmers: paiky.farmers.map(f => ({
              ...f,
              id: `paiky-${Date.now()}-${Math.random()}-${idx}`
            }))
          })),
          ekatrikarans: firstPeriod.ekatrikarans.map(ek => ({
            ekatrikaranNumber: ek.ekatrikaranNumber,
            farmers: ek.farmers.map(f => ({
              ...f,
              id: `ekatrikaran-${Date.now()}-${Math.random()}-${idx}`
            }))
          })),
          sameAsAbove: false
        };
      });
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
  
  if (!recordId) {
    toast({
      title: "Error",
      description: "Land record not found",
      variant: "destructive"
    });
    return;
  }

  setLoading(true);
  
  try {
    const currentPanipatraks = getCurrentPanipatraks();
    console.log('Submitting panipatraks:', currentPanipatraks);

    // 1. First save to database
    const { error: saveError } = await LandRecordService.updatePanipatraks(
      recordId,
      currentPanipatraks
    );
    
    if (saveError) throw saveError;

    // 2. Then refresh from database to ensure consistency
    const { data: updatedPanipatraks, error: fetchError } = 
      await LandRecordService.getPanipatraks(recordId);
    
    if (fetchError) throw fetchError;
    if (!updatedPanipatraks) throw new Error('No panipatraks returned after update');

    console.log('Updated panipatraks from DB:', updatedPanipatraks);

    // 3. Update all state
    setPanipatraks(updatedPanipatraks);
    updateStepData({ panipatraks: updatedPanipatraks });
    setOriginalData(normalizeForComparison(updatedPanipatraks));
    setHasChanges(false);
    
    toast({ title: "Panipatraks updated successfully" });
    setCurrentStep(4);

  } catch (error: unknown) {
    console.error('Submission failed:', error);
    toast({
      title: "Update failed",
      description: error instanceof Error ? error.message : "An unknown error occurred",
      variant: "destructive"
    });
  } finally {
    setLoading(false);
  }
};

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
 if (!yearSlabs.length) {
    return <div className="p-10">Please add year slabs in Step 2!</div>;
  }

return (
  <Card>
    <CardHeader>
      <CardTitle>Step 3: Panipatrak (Farmer Details)</CardTitle>
    </CardHeader>
    <CardContent className="space-y-8">
      {Object.entries(slabPanels).map(([slabId, { slab, periods, sameForAll }]) => {
        const hasPaiky = slab.paiky;
        const hasEkatrikaran = slab.ekatrikaran;
        const showTabs = hasPaiky && hasEkatrikaran;

        return (
          <Card key={slabId} className="mb-6 border-2 border-gray-200">
            <CardHeader className="bg-gray-50 p-4">
              <div className="flex justify-between items-center">
                <div>
  <h2 className="font-bold text-lg">
    Slab {Object.keys(slabPanels).indexOf(slabId) + 1}: {slab.startYear} - {slab.endYear}
  </h2>
  <p className="text-sm text-gray-600">
    {(() => {
      const allNumbers = getAllUniqueSlabNumbers(slab);
      if (allNumbers.length === 1) {
        // Only main slab number
        const entry = allNumbers[0];
        return `${entry.sNoType === 'block_no' ? 'Block No' : 
                 entry.sNoType === 're_survey_no' ? 'Re-survey No' : 'Survey No'}: ${entry.sNo}`;
      } else {
        // Multiple numbers - group by type
        const grouped = allNumbers.reduce((acc: any, entry: any) => {
          const typeLabel = entry.sNoType === 'block_no' ? 'Block' : 
                           entry.sNoType === 're_survey_no' ? 'Re-survey' : 'Survey';
          if (!acc[typeLabel]) acc[typeLabel] = [];
          acc[typeLabel].push(entry.sNo);
          return acc;
        }, {});
        
        return Object.entries(grouped)
          .map(([type, numbers]: [string, any]) => `${type} No${numbers.length > 1 ? 's' : ''}: ${numbers.join(', ')}`)
          .join(' | ');
      }
    })()}
  </p>
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
                  if (sameForAll && periodIdx > 0) return null;

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
                            {period.regularFarmers.length + 
                             period.paikies.reduce((sum, p) => sum + p.farmers.length, 0) + 
                             period.ekatrikarans.reduce((sum, e) => sum + e.farmers.length, 0)} farmer(s)
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
    {showTabs ? (
      <Tabs defaultValue="paiky" className="w-full">
        <TabsList className="grid grid-cols-2">
          <TabsTrigger value="paiky">Paikies</TabsTrigger>
          <TabsTrigger value="ekatrikaran">Ekatrikarans</TabsTrigger>
        </TabsList>
        <TabsContent value="paiky">
          {period.paikies.map((paiky) => (
  <div key={`paiky-${paiky.paikyNumber}`} className="space-y-4">
    <h4 className="font-medium text-lg">
      Paiky {paiky.paikyNumber}
      {paiky.entry && (
        <span className="text-sm text-gray-500 ml-2">
          ({paiky.entry.sNoType === 'block_no' ? 'Block' : 
            paiky.entry.sNoType === 're_survey_no' ? 'Re-survey' : 'Survey'} No: {paiky.entry.sNo})
        </span>
      )}
    </h4>
                {paiky.farmers.map((farmer, farmerIdx) => (
                  <FarmerCard
                    key={farmer.id}
                    farmer={farmer}
                    farmerIdx={farmerIdx}
                    slabId={slabId}
                    periodIdx={periodIdx}
                    onUpdate={updateFarmer}
                    onRemove={removeFarmer}
                    isSpecialType={true}
                    slabEntryData={paiky.entry}
                  />
                ))}
                <Button
                  variant="outline"
                  onClick={() => addFarmer(slabId, periodIdx, 'paiky', paiky.paikyNumber)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Farmer to Paiky {paiky.paikyNumber}
                </Button>
              </div>
                ))}
        </TabsContent>
        <TabsContent value="ekatrikaran">
          {period.ekatrikarans.map((ekatrikaran) => (
  <div key={`ekatrikaran-${ekatrikaran.ekatrikaranNumber}`} className="space-y-4">
    <h4 className="font-medium text-lg">
      Ekatrikaran {ekatrikaran.ekatrikaranNumber}
      {ekatrikaran.entry && (
        <span className="text-sm text-gray-500 ml-2">
          ({ekatrikaran.entry.sNoType === 'block_no' ? 'Block' : 
            ekatrikaran.entry.sNoType === 're_survey_no' ? 'Re-survey' : 'Survey'} No: {ekatrikaran.entry.sNo})
        </span>
      )}
    </h4>
                {ekatrikaran.farmers.map((farmer, farmerIdx) => (
                  <FarmerCard
                    key={farmer.id}
                    farmer={farmer}
                    farmerIdx={farmerIdx}
                    slabId={slabId}
                    periodIdx={periodIdx}
                    onUpdate={updateFarmer}
                    onRemove={removeFarmer}
                    isSpecialType={true}
                    slabEntryData={ekatrikaran.entry}
                  />
                ))}
                <Button
                  variant="outline"
                  onClick={() => addFarmer(slabId, periodIdx, 'ekatrikaran', ekatrikaran.ekatrikaranNumber)}
                  className="w-full"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Farmer to Ekatrikaran {ekatrikaran.ekatrikaranNumber}
                </Button>
              </div>
                ))}
        </TabsContent>
      </Tabs>
    ) : hasPaiky ? (
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Paikies</h3>
        {period.paikies.map((paiky) => (
  <div key={`paiky-${paiky.paikyNumber}`} className="space-y-4">
    <h4 className="font-medium text-lg">
      Paiky {paiky.paikyNumber}
      {paiky.entry && (
        <span className="text-sm text-gray-500 ml-2">
          ({paiky.entry.sNoType === 'block_no' ? 'Block' : 
            paiky.entry.sNoType === 're_survey_no' ? 'Re-survey' : 'Survey'} No: {paiky.entry.sNo})
        </span>
      )}
    </h4>
              {paiky.farmers.map((farmer, farmerIdx) => (
                <FarmerCard
                  key={farmer.id}
                  farmer={farmer}
                  farmerIdx={farmerIdx}
                  slabId={slabId}
                  periodIdx={periodIdx}
                  onUpdate={updateFarmer}
                  onRemove={removeFarmer}
                  isSpecialType={true}
                  slabEntryData={paiky.entry}
                />
              ))}
              <Button
                variant="outline"
                onClick={() => addFarmer(slabId, periodIdx, 'paiky', paiky.paikyNumber)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Farmer to Paiky {paiky.paikyNumber}
              </Button>
            </div>
                ))}
      </div>
    ) : hasEkatrikaran ? (
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Ekatrikarans</h3>
        {period.ekatrikarans.map((ekatrikaran) => (
  <div key={`ekatrikaran-${ekatrikaran.ekatrikaranNumber}`} className="space-y-4">
    <h4 className="font-medium text-lg">
      Ekatrikaran {ekatrikaran.ekatrikaranNumber}
      {ekatrikaran.entry && (
        <span className="text-sm text-gray-500 ml-2">
          ({ekatrikaran.entry.sNoType === 'block_no' ? 'Block' : 
            ekatrikaran.entry.sNoType === 're_survey_no' ? 'Re-survey' : 'Survey'} No: {ekatrikaran.entry.sNo})
        </span>
      )}
    </h4>
              {ekatrikaran.farmers.map((farmer, farmerIdx) => (
                <FarmerCard
                  key={farmer.id}
                  farmer={farmer}
                  farmerIdx={farmerIdx}
                  slabId={slabId}
                  periodIdx={periodIdx}
                  onUpdate={updateFarmer}
                  onRemove={removeFarmer}
                  isSpecialType={true}
                  slabEntryData={ekatrikaran.entry}
                />
              ))}
              <Button
                variant="outline"
                onClick={() => addFarmer(slabId, periodIdx, 'ekatrikaran', ekatrikaran.ekatrikaranNumber)}
                className="w-full"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Farmer to Ekatrikaran {ekatrikaran.ekatrikaranNumber}
              </Button>
            </div>
                ))}
      </div>
    ) : (
      <div className="space-y-4">
        <h3 className="font-medium text-lg">Farmers</h3>
        {period.regularFarmers.map((farmer, farmerIdx) => (
          <FarmerCard
            key={farmer.id}
            farmer={farmer}
            farmerIdx={farmerIdx}
            slabId={slabId}
            periodIdx={periodIdx}
            onUpdate={updateFarmer}
            onRemove={removeFarmer}
          />
        ))}
        <Button
          variant="outline"
          onClick={() => addFarmer(slabId, periodIdx, 'regular')}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Farmer
        </Button>
      </div>
    )}
  </div>
)}
                    </Card>
                  );
                })}
              </CardContent>
            )}
          </Card>
        );
      })}
      
     <div className="flex justify-center pt-6">
  
  {hasChanges && (
    <Button onClick={handleSubmit} disabled={loading}>
      {loading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Saving...
        </>
      ) : (
        <>
          Save & Continue
        </>
      )}
    </Button>
  )}
</div>
    </CardContent>
  </Card>
);
}

"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Trash2,
  Plus,
  ArrowRight,
  ArrowLeft,
} from "lucide-react";
import {
  useLandRecord,
  YearSlab,
  SlabEntry,
} from "@/contexts/land-record-context";
import { useToast } from "@/hooks/use-toast";

// ---------- UI-only Types ----------
type SNoTypeUI = "survey_no" | "block_no" | "re_survey_no";
type AreaTypeUI = "acre_guntha" | "sq_m";

interface AreaUI {
  areaType: AreaTypeUI;
  acre?: number;
  guntha?: number;
  sq_m?: number;
}
interface SlabEntryUI {
  sNoTypeUI: SNoTypeUI;
  sNo: string;
  areaUI: AreaUI;
  integrated712?: string;
}
interface YearSlabUI {
  id: string;
  startYear: number;
  endYear: number;
  sNoTypeUI: SNoTypeUI;
  sNo: string;
  areaUI: AreaUI;
  integrated712?: string;
  paiky: boolean;
  paikyCount: number;
  paikyEntries: SlabEntryUI[];
  ekatrikaran: boolean;
  ekatrikaranCount: number;
  ekatrikaranEntries: SlabEntryUI[];
}
// ---------- End Types ----------

const SNO_TYPES = [
  { key: "survey_no", label: "Survey No." },
  { key: "block_no", label: "Block No." },
  { key: "re_survey_no", label: "Re-Survey No." },
] as const;
const AREA_TYPES = [
  { key: "acre_guntha", label: "Acre - Guntha" },
  { key: "sq_m", label: "Sq. Mtr." },
] as const;

// ---------- TYPE MAPPINGS ----------

// Explicit mapping from UI to context type
function mapSNoTypeUIToContext(
  s: SNoTypeUI
): "s_no" | "block_no" | "re_survey_no" {
  switch (s) {
    case "survey_no":
      return "s_no";
    case "block_no":
      return "block_no";
    case "re_survey_no":
      return "re_survey_no";
  }
}

// Explicit mapping from context to UI type
function mapSNoTypeContextToUI(s: "s_no" | "block_no" | "re_survey_no"): SNoTypeUI {
  switch (s) {
    case "s_no":
      return "survey_no";
    case "block_no":
      return "block_no";
    case "re_survey_no":
      return "re_survey_no";
  }
}

// Convert from UI-area to context-area
function fromAreaUI(areaUI: AreaUI): { value: number; unit: "acre" | "guntha" | "sq_m" } {
  if (areaUI.areaType === "sq_m") return { value: areaUI.sq_m || 0, unit: "sq_m" };
  if ((areaUI.acre ?? 0) > 0) return { value: areaUI.acre!, unit: "acre" };
  if ((areaUI.guntha ?? 0) > 0) return { value: areaUI.guntha!, unit: "guntha" };
  return { value: 0, unit: "acre" };
}
function toAreaUI(area: { value: number; unit: "acre" | "guntha" | "sq_m" }): AreaUI {
  if (area.unit === "sq_m") return { areaType: "sq_m", sq_m: area.value };
  if (area.unit === "acre") return { areaType: "acre_guntha", acre: area.value, guntha: 0 };
  if (area.unit === "guntha") return { areaType: "acre_guntha", acre: 0, guntha: area.value };
  return { areaType: "acre_guntha", acre: 0, guntha: 0 };
}
function fromSlabEntryUI(e: SlabEntryUI): SlabEntry {
  return {
    sNo: e.sNo,
    sNoType: mapSNoTypeUIToContext(e.sNoTypeUI),
    area: fromAreaUI(e.areaUI),
    integrated712: e.integrated712,
  };
}
function toSlabEntryUI(e: SlabEntry): SlabEntryUI {
  return {
    sNo: e.sNo,
    sNoTypeUI: mapSNoTypeContextToUI(e.sNoType),
    areaUI: toAreaUI(e.area),
    integrated712: e.integrated712,
  };
}
function fromYearSlabUI(s: YearSlabUI): YearSlab {
  return {
    ...s,
    sNo: s.sNo,
    sNoType: mapSNoTypeUIToContext(s.sNoTypeUI),
    area: fromAreaUI(s.areaUI),
    paikyEntries: (s.paikyEntries || []).map(fromSlabEntryUI),
    ekatrikaranEntries: (s.ekatrikaranEntries || []).map(fromSlabEntryUI),
  };
}
function toYearSlabUI(s: YearSlab): YearSlabUI {
  return {
    ...s,
    sNoTypeUI: mapSNoTypeContextToUI(s.sNoType),
    areaUI: toAreaUI(s.area),
    paikyEntries: (s.paikyEntries ?? []).map(toSlabEntryUI),
    ekatrikaranEntries: (s.ekatrikaranEntries ?? []).map(toSlabEntryUI),
  };
}

// ---------- MAIN COMPONENT ----------
export default function YearSlabs() {
  const { yearSlabs, setYearSlabs, setCurrentStep, landBasicInfo } = useLandRecord();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [slabs, setSlabs] = useState<YearSlabUI[]>([]);
  useEffect(() => {
    if (yearSlabs.length)
      setSlabs(yearSlabs.map(toYearSlabUI));
    else
      setSlabs([
        {
          id: "1",
          startYear: new Date().getFullYear(),
          endYear: new Date().getFullYear(),
          sNo: landBasicInfo?.sNo || "",
          sNoTypeUI: "survey_no",
          areaUI: { areaType: "acre_guntha", acre: 0, guntha: 0 },
          integrated712: "",
          paiky: false,
          paikyCount: 0,
          paikyEntries: [],
          ekatrikaran: false,
          ekatrikaranCount: 0,
          ekatrikaranEntries: [],
        },
      ]);
  }, [yearSlabs, landBasicInfo]);

  // --- UI rendering helpers ---
  const areaFields = (area: AreaUI, onChange: (a: AreaUI) => void) =>
    area.areaType === "acre_guntha" ? (
      <div className="flex gap-2">
        <div>
          <Label>Acres</Label>
          <Input
            type="number"
            min={0}
            value={area.acre ?? ""}
            placeholder="Acre"
            onChange={(e) => onChange({ ...area, acre: parseFloat(e.target.value) || 0 })}
          />
        </div>
        <div>
          <Label>Guntha</Label>
          <Input
            type="number"
            min={0}
            value={area.guntha ?? ""}
            placeholder="Guntha"
            onChange={(e) => onChange({ ...area, guntha: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>
    ) : (
      <div>
        <Label>Sq. Mtr.</Label>
        <Input
          type="number"
          min={0}
          value={area.sq_m ?? ""}
          placeholder="Sq. Mtr."
          onChange={(e) => onChange({ ...area, sq_m: parseFloat(e.target.value) || 0 })}
        />
      </div>
    );

  const updateSlab = (id: string, updates: Partial<YearSlabUI>) =>
    setSlabs((s) => s.map((slab) => (slab.id === id ? { ...slab, ...updates } : slab)));

  const addSlab = () =>
    setSlabs([
      ...slabs,
      {
        id: Date.now().toString(),
        startYear: new Date().getFullYear(),
        endYear: new Date().getFullYear(),
        sNo: "",
        sNoTypeUI: "survey_no",
        areaUI: { areaType: "acre_guntha", acre: 0, guntha: 0 },
        integrated712: "",
        paiky: false,
        paikyCount: 0,
        paikyEntries: [],
        ekatrikaran: false,
        ekatrikaranCount: 0,
        ekatrikaranEntries: [],
      },
    ]);

  const removeSlab = (id: string) => setSlabs(slabs.filter((slab) => slab.id !== id));

  // "Count" updating helpers
  const updatePaikyCount = (slabId: string, count: number) => {
    setSlabs((prev) =>
      prev.map((slab) =>
        slab.id !== slabId
          ? slab
          : {
              ...slab,
              paikyCount: count,
              paikyEntries: Array.from({ length: count }, (_, i) =>
                slab.paikyEntries[i] ?? {
                  sNo: "",
                  sNoTypeUI: "survey_no",
                  areaUI: { areaType: "acre_guntha", acre: 0, guntha: 0 },
                  integrated712: "",
                }
              ),
            }
      )
    );
  };
  const updateEkatrikaranCount = (slabId: string, count: number) => {
    setSlabs((prev) =>
      prev.map((slab) =>
        slab.id !== slabId
          ? slab
          : {
              ...slab,
              ekatrikaranCount: count,
              ekatrikaranEntries: Array.from({ length: count }, (_, i) =>
                slab.ekatrikaranEntries[i] ?? {
                  sNo: "",
                  sNoTypeUI: "survey_no",
                  areaUI: { areaType: "acre_guntha", acre: 0, guntha: 0 },
                  integrated712: "",
                }
              ),
            }
      )
    );
  };
  const updateSlabEntry = (
    slabId: string,
    type: "paiky" | "ekatrikaran",
    index: number,
    updates: Partial<SlabEntryUI>
  ) => {
    setSlabs((prev) =>
      prev.map((slab) => {
        if (slab.id !== slabId) return slab;
        if (type === "paiky") {
          const updatedEntries = [...slab.paikyEntries];
          updatedEntries[index] = { ...updatedEntries[index], ...updates };
          return { ...slab, paikyEntries: updatedEntries };
        } else {
          const updatedEntries = [...slab.ekatrikaranEntries];
          updatedEntries[index] = { ...updatedEntries[index], ...updates };
          return { ...slab, ekatrikaranEntries: updatedEntries };
        }
      })
    );
  };

  // --- Render ---
  return (
    <Card>
      <CardHeader>
        <CardTitle>Step 2: Add Year Slabs</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {slabs.map((slab, slabIndex) => (
          <Card key={slab.id} className="p-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">Slab {slabIndex + 1}</h3>
              {slabs.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeSlab(slab.id)}
                  className="text-red-600"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
            {/* Start/End year */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div className="space-y-2">
                <Label>Start Year *</Label>
                <Input
                  type="Number"
                  value={slab.startYear}
                  onChange={(e) => updateSlab(slab.id, { startYear: Number.parseInt(e.target.value) })}
                />
              </div>
              <div className="space-y-2">
                <Label>End Year *</Label>
                <Input
                  type="Number"
                  value={slab.endYear}
                  onChange={(e) => updateSlab(slab.id, { endYear: Number.parseInt(e.target.value) })}
                />
              </div>
              {/* S.No and Area and Document - hide if any sub-slab active */}
              {!slab.paiky && !slab.ekatrikaran && (
                <>
                  <div className="space-y-2">
                    <Label>S.No Type</Label>
                    <Select
                      value={slab.sNoTypeUI}
                      onValueChange={(value) =>
                        updateSlab(slab.id, { sNoTypeUI: value as SNoTypeUI })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Type" />
                      </SelectTrigger>
                      <SelectContent>
                        {SNO_TYPES.map((item) => (
                          <SelectItem key={item.key} value={item.key}>
                            {item.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>S.No / Block No / Re-Survey No</Label>
                    <Input
                      value={slab.sNo}
                      onChange={(e) => updateSlab(slab.id, { sNo: e.target.value })}
                      placeholder="Enter number"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Area Type</Label>
                    <Select
                      value={slab.areaUI.areaType}
                      onValueChange={(val) =>
                        updateSlab(slab.id, {
                          areaUI: { ...slab.areaUI, areaType: val as AreaTypeUI },
                        })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {AREA_TYPES.map((a) => (
                          <SelectItem key={a.key} value={a.key}>
                            {a.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    {areaFields(slab.areaUI, (areaUI) =>
                      updateSlab(slab.id, { areaUI })
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label>7/12 Document</Label>
                    <Input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => {
                        // handle file upload logic
                      }}
                    />
                  </div>
                </>
              )}
            </div>
            {/* Paiky Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={slab.paiky}
                  onCheckedChange={(checked) =>
                    updateSlab(slab.id, {
                      paiky: !!checked,
                      paikyCount: checked ? slab.paikyCount : 0,
                    })
                  }
                />
                <Label>Paiky</Label>
              </div>
              {slab.paiky && (
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <Label>Number of Paiky Entries</Label>
                    <Input
                      type="text"
                      value={slab.paikyCount}
                      onChange={(e) =>
                        updatePaikyCount(slab.id, Number.parseInt(e.target.value) || 0)
                      }
                      min="0"
                    />
                  </div>
                  {slab.paikyEntries.map((entry, entryIndex) => (
                    <Card key={entryIndex} className="p-3 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div>
                          <Label>S.No Type</Label>
                          <Select
                            value={entry.sNoTypeUI}
                            onValueChange={(val) =>
                              updateSlabEntry(slab.id, "paiky", entryIndex, {
                                sNoTypeUI: val as SNoTypeUI,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {SNO_TYPES.map((item) => (
                                <SelectItem key={item.key} value={item.key}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          value={entry.sNo}
                          onChange={(e) =>
                            updateSlabEntry(slab.id, "paiky", entryIndex, {
                              sNo: e.target.value,
                            })
                          }
                          placeholder="Enter number"
                        />
                        <div>
                          <Label>Area Type</Label>
                          <Select
                            value={entry.areaUI.areaType}
                            onValueChange={(val) =>
                              updateSlabEntry(slab.id, "paiky", entryIndex, {
                                areaUI: { ...entry.areaUI, areaType: val as AreaTypeUI },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AREA_TYPES.map((a) => (
                                <SelectItem key={a.key} value={a.key}>
                                  {a.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          {areaFields(entry.areaUI, (area) =>
                            updateSlabEntry(slab.id, "paiky", entryIndex, {
                              areaUI: area,
                            })
                          )}
                        </div>
                        <div>
                          <Label>7/12 Document</Label>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {}}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
            {/* Ekatrikaran Section */}
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={slab.ekatrikaran}
                  onCheckedChange={(checked) =>
                    updateSlab(slab.id, {
                      ekatrikaran: !!checked,
                      ekatrikaranCount: checked ? slab.ekatrikaranCount : 0,
                    })
                  }
                />
                <Label>Ekatrikaran</Label>
              </div>
              {slab.ekatrikaran && (
                <div className="space-y-4 pl-6">
                  <div className="space-y-2">
                    <Label>Number of Ekatrikaran Entries</Label>
                    <Input
                      type="text"
                      value={slab.ekatrikaranCount}
                      onChange={(e) =>
                        updateEkatrikaranCount(slab.id, Number.parseInt(e.target.value) || 0)
                      }
                      min="0"
                    />
                  </div>
                  {slab.ekatrikaranEntries.map((entry, entryIndex) => (
                    <Card key={entryIndex} className="p-3 mt-2">
                      <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                        <div>
                          <Label>S.No Type</Label>
                          <Select
                            value={entry.sNoTypeUI}
                            onValueChange={(val) =>
                              updateSlabEntry(slab.id, "ekatrikaran", entryIndex, {
                                sNoTypeUI: val as SNoTypeUI,
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Type" />
                            </SelectTrigger>
                            <SelectContent>
                              {SNO_TYPES.map((item) => (
                                <SelectItem key={item.key} value={item.key}>
                                  {item.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <Input
                          value={entry.sNo}
                          onChange={(e) =>
                            updateSlabEntry(slab.id, "ekatrikaran", entryIndex, {
                              sNo: e.target.value,
                            })
                          }
                          placeholder="Enter number"
                        />
                        <div>
                          <Label>Area Type</Label>
                          <Select
                            value={entry.areaUI.areaType}
                            onValueChange={(val) =>
                              updateSlabEntry(slab.id, "ekatrikaran", entryIndex, {
                                areaUI: { ...entry.areaUI, areaType: val as AreaTypeUI },
                              })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {AREA_TYPES.map((a) => (
                                <SelectItem key={a.key} value={a.key}>
                                  {a.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          {areaFields(entry.areaUI, (area) =>
                            updateSlabEntry(slab.id, "ekatrikaran", entryIndex, {
                              areaUI: area,
                            })
                          )}
                        </div>
                        <div>
                          <Label>7/12 Document</Label>
                          <Input
                            type="file"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={(e) => {}}
                          />
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </Card>
        ))}
        <Button onClick={addSlab} variant="outline" className="w-full bg-transparent">
          <Plus className="w-4 h-4 mr-2" /> Add Another Slab
        </Button>
        <div className="flex justify-between">
          <Button variant="outline" onClick={() => setCurrentStep(1)}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Previous
          </Button>
          <Button
            onClick={() => {
              setYearSlabs(slabs.map(fromYearSlabUI));
              setCurrentStep(3);
            }}
            disabled={loading}
          >
            {loading ? "Saving..." : "Next Step"}{" "}
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

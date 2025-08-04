"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Download } from "lucide-react";
import { useLRMS } from "@/contexts/lrms-context";

export default function LandMaster() {
  const { state } = useLRMS();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [talukaFilter, setTalukaFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");

  // Get unique values for filters
  const districts = [
    "all",
    ...new Set(state.lands.map((land) => land.district)),
  ];
  const talukas = ["all", ...new Set(state.lands.map((land) => land.taluka))];
  const villages = ["all", ...new Set(state.lands.map((land) => land.village))];

  // Filter lands based on search and filters
  const filteredLands = state.lands.filter((land) => {
    const matchesSearch =
      land.surveyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      land.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      land.taluka.toLowerCase().includes(searchTerm.toLowerCase()) ||
      land.village.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesDistrict =
      districtFilter === "all" || land.district === districtFilter;
    const matchesTaluka =
      talukaFilter === "all" || land.taluka === talukaFilter;
    const matchesVillage =
      villageFilter === "all" || land.village === villageFilter;

    return matchesSearch && matchesDistrict && matchesTaluka && matchesVillage;
  });

  const convertArea = (area: number, unit: string) => {
    if (unit === "acre") {
      const acres = Math.floor(area);
      const gunthas = Math.round((area - acres) * 40);
      return `${acres} Acre ${gunthas} Guntha`;
    }
    return `${area} Sq.m`;
  };

  const handleAddNewLand = () => {
    router.push("/land-master/forms");
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Land Master</h1>
          <p className="text-muted-foreground">
            Manage all land records across districts
          </p>
        </div>
        <Button onClick={handleAddNewLand}>
          <Plus className="h-4 w-4 mr-2" />
          Add New Land
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Land Records</CardTitle>
          <CardDescription>
            View and manage all registered land records
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <div className="flex-1 min-w-[200px]">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by survey number, district..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="min-w-[150px]">
              <Label>District</Label>
              <Select value={districtFilter} onValueChange={setDistrictFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Districts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Districts</SelectItem>
                  {districts.slice(1).map((district) => (
                    <SelectItem key={district} value={district}>
                      {district}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <Label>Taluka</Label>
              <Select value={talukaFilter} onValueChange={setTalukaFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Talukas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Talukas</SelectItem>
                  {talukas.slice(1).map((taluka) => (
                    <SelectItem key={taluka} value={taluka}>
                      {taluka}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="min-w-[150px]">
              <Label>Village</Label>
              <Select value={villageFilter} onValueChange={setVillageFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Villages" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Villages</SelectItem>
                  {villages.slice(1).map((village) => (
                    <SelectItem key={village} value={village}>
                      {village}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Data Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District</TableHead>
                  <TableHead>Taluka</TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead>Survey Number</TableHead>
                  <TableHead>Survey Type</TableHead>
                  <TableHead>Area</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredLands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {state.lands.length === 0
                          ? "No land records found. Add your first land record to get started."
                          : "No records match your search criteria."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLands.map((land) => (
                    <TableRow key={land.id}>
                      <TableCell className="font-medium">
                        {land.district}
                      </TableCell>
                      <TableCell>{land.taluka}</TableCell>
                      <TableCell>{land.village}</TableCell>
                      <TableCell>{land.surveyNumber}</TableCell>
                      <TableCell>
                        <Badge variant="outline">{land.surveyNumberType}</Badge>
                      </TableCell>
                      <TableCell>
                        {convertArea(land.area, land.areaUnit)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm">
                            View
                          </Button>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {filteredLands.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredLands.length} of {state.lands.length} records
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

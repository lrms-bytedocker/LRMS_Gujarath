"use client";

import { useState, useEffect } from "react";
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
import { Plus, Search, Download, Loader2, Filter, X } from "lucide-react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";

interface LandRecord {
  id: string;
  district: string;
  taluka: string;
  village: string;
  block_no: string;
  re_survey_no: string;
}

export default function LandMaster() {
  const router = useRouter();
  const [lands, setLands] = useState<LandRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [districtFilter, setDistrictFilter] = useState("all");
  const [talukaFilter, setTalukaFilter] = useState("all");
  const [villageFilter, setVillageFilter] = useState("all");
  const [showFilters, setShowFilters] = useState(false);

  // Fetch land records from Supabase
  useEffect(() => {
    const fetchLandRecords = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data, error } = await supabase
          .from('land_records')
          .select('*')
          .order('created_at', { ascending: false });

        if (error) {
          throw error;
        }

        setLands(data || []);
      } catch (err) {
        console.error('Error fetching land records:', err);
        setError(err instanceof Error ? err.message : 'Failed to fetch land records');
      } finally {
        setLoading(false);
      }
    };

    fetchLandRecords();
  }, []);

  // Get unique values for filters
  const districts = [
    "all",
    ...new Set(lands.map((land) => land.district)),
  ];
  const talukas = ["all", ...new Set(lands.map((land) => land.taluka))];
  const villages = ["all", ...new Set(lands.map((land) => land.village))];

  // Filter lands based on search and filters
  const filteredLands = lands.filter((land) => {
    const matchesSearch =
      land.block_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
      land.re_survey_no.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleAddNewLand = () => {
    router.push("/land-master/forms");
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('land_records')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLands(data || []);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh data');
    } finally {
      setLoading(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm("");
    setDistrictFilter("all");
    setTalukaFilter("all");
    setVillageFilter("all");
  };

  const hasActiveFilters = searchTerm || districtFilter !== "all" || talukaFilter !== "all" || villageFilter !== "all";

  if (error) {
    return (
      <div className="space-y-4 p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Land Master</h1>
            <p className="text-muted-foreground text-sm sm:text-base">
              Manage all land records across districts
            </p>
          </div>
          <Button onClick={handleAddNewLand} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add New Land
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <p className="text-red-600 text-sm sm:text-base">Error loading land records: {error}</p>
              <Button onClick={handleRefresh} variant="outline">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Land Master</h1>
          <p className="text-muted-foreground text-sm sm:text-base">
            Manage all land records across districts
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={loading} className="w-full sm:w-auto">
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Refresh
          </Button>
          <Button onClick={handleAddNewLand} className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Add New Land
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg sm:text-xl">Land Records</CardTitle>
          <CardDescription className="text-sm">
            View and manage all registered land records
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Mobile Search and Filter Toggle */}
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-4">
            <div className="flex-1">
              <Label htmlFor="search" className="sr-only sm:not-sr-only">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search records..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  disabled={loading}
                />
              </div>
            </div>
            
            {/* Mobile Filter Toggle */}
            <div className="flex gap-2 sm:hidden">
              <Button
                variant="outline"
                onClick={() => setShowFilters(!showFilters)}
                className="flex-1"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters {hasActiveFilters && <span className="ml-1 bg-primary text-primary-foreground rounded-full px-1.5 py-0.5 text-xs">•</span>}
              </Button>
              <Button variant="outline" disabled={loading} size="sm">
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Desktop Filters - Always Visible */}
          <div className="hidden sm:flex flex-wrap gap-4">
            <div className="min-w-[150px] flex-1">
              <Label>District</Label>
              <Select 
                value={districtFilter} 
                onValueChange={setDistrictFilter}
                disabled={loading}
              >
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

            <div className="min-w-[150px] flex-1">
              <Label>Taluka</Label>
              <Select 
                value={talukaFilter} 
                onValueChange={setTalukaFilter}
                disabled={loading}
              >
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

            <div className="min-w-[150px] flex-1">
              <Label>Village</Label>
              <Select 
                value={villageFilter} 
                onValueChange={setVillageFilter}
                disabled={loading}
              >
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

            <div className="flex items-end gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" onClick={clearFilters} size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
              <Button variant="outline" disabled={loading}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>

          {/* Mobile Filters - Collapsible */}
          {showFilters && (
            <div className="sm:hidden space-y-4 p-4 bg-muted/50 rounded-lg">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Filters</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFilters(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              
              <div className="space-y-3">
                <div>
                  <Label>District</Label>
                  <Select 
                    value={districtFilter} 
                    onValueChange={setDistrictFilter}
                    disabled={loading}
                  >
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

                <div>
                  <Label>Taluka</Label>
                  <Select 
                    value={talukaFilter} 
                    onValueChange={setTalukaFilter}
                    disabled={loading}
                  >
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

                <div>
                  <Label>Village</Label>
                  <Select 
                    value={villageFilter} 
                    onValueChange={setVillageFilter}
                    disabled={loading}
                  >
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

                {hasActiveFilters && (
                  <Button variant="outline" onClick={clearFilters} className="w-full">
                    <X className="h-4 w-4 mr-2" />
                    Clear All Filters
                  </Button>
                )}
              </div>
            </div>
          )}

          {/* Desktop Table */}
          <div className="hidden lg:block rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>District</TableHead>
                  <TableHead>Taluka</TableHead>
                  <TableHead>Village</TableHead>
                  <TableHead>Block No</TableHead>
                  <TableHead>Re-Survey No</TableHead>
                  { /* <TableHead>Status</TableHead> */} 
                  <TableHead>Actions</TableHead> 
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-12">
                      <div className="flex items-center justify-center space-x-2">
                        <Loader2 className="h-6 w-6 animate-spin" />
                        <span className="text-muted-foreground">
                          Loading land records...
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredLands.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      <div className="text-muted-foreground">
                        {lands.length === 0
                          ? "No land records found. Add your first land record to get started."
                          : "No records match your search criteria."}
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredLands.map((land) => (
                    <TableRow key={land.id}>
                      <TableCell className="font-medium">{land.district}</TableCell>
                      <TableCell>{land.taluka}</TableCell>
                      <TableCell>{land.village}</TableCell>
                      <TableCell>{land.block_no}</TableCell>
                      <TableCell>{land.re_survey_no}</TableCell>
                      {/* <TableCell>
                        <Badge variant="secondary">Active</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Link href={`/land-master/forms?mode=view&id=${land.id}`}>
                            <Button variant="ghost" size="sm">View</Button>
                          </Link>
                          <Link href={`/land-master/forms?mode=edit&id=${land.id}`}>
                            <Button variant="ghost" size="sm">Edit</Button>
                          </Link>
                        </div>
                      </TableCell>
                      </TableCell> */} 
<TableCell>
   <div className="flex gap-2">
    <Link href={`/land-master/forms?mode=view&id=${land.id}`}>
      <Button variant="ghost" size="sm">View</Button>
    </Link>
    <Link href={`/land-master/forms?mode=edit&id=${land.id}`}>
      <Button variant="ghost" size="sm">Edit</Button>
    </Link>
  </div> 
</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile/Tablet Card Layout */}
          <div className="lg:hidden space-y-3">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-2">
                  <Loader2 className="h-6 w-6 animate-spin" />
                  <span className="text-muted-foreground">Loading land records...</span>
                </div>
              </div>
            ) : filteredLands.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground text-sm">
                  {lands.length === 0
                    ? "No land records found. Add your first land record to get started."
                    : "No records match your search criteria."}
                </div>
              </div>
            ) : (
              filteredLands.map((land) => (
                <Card key={land.id} className="p-4">
                  <div className="space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="space-y-1">
                        <div className="font-medium text-sm">{land.district}</div>
                        <div className="text-muted-foreground text-xs">
                          {land.taluka} • {land.village}
                        </div>
                      </div>
                      <Badge variant="secondary" className="text-xs">Active</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Block No:</span>
                        <div className="font-medium">{land.block_no}</div>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Re-Survey No:</span>
                        <div className="font-medium">{land.re_survey_no}</div>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 pt-2">
                      <Link href={`/land-master/forms?mode=view&id=${land.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          View
                        </Button>
                      </Link>
                      <Link href={`/land-master/forms?mode=edit&id=${land.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          Edit
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          {/* Results Summary and Pagination */}
          {!loading && filteredLands.length > 0 && (
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-4 border-t">
              <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Showing {filteredLands.length} of {lands.length} records
              </p>
              <div className="flex gap-2 justify-center sm:justify-end">
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

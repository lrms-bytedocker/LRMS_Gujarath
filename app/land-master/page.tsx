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
import { Plus, Search, Download, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface LandRecord {
  id: string;
  district: string;
  taluka: string;
  village: string;
  block_no: string;
  re_survey_no: string;
  // Add other fields as needed based on your database schema
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

  if (error) {
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
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="text-center space-y-4">
              <p className="text-red-600">Error loading land records: {error}</p>
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Land Master</h1>
          <p className="text-muted-foreground">
            Manage all land records across districts
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleRefresh} variant="outline" disabled={loading}>
            {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Refresh
          </Button>
          <Button onClick={handleAddNewLand}>
            <Plus className="h-4 w-4 mr-2" />
            Add New Land
          </Button>
        </div>
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
                  placeholder="Search by block no, re-survey no, district..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="min-w-[150px]">
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

            <div className="min-w-[150px]">
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

            <div className="min-w-[150px]">
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

            <div className="flex items-end">
              <Button variant="outline" disabled={loading}>
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
                  <TableHead>Block No</TableHead>
                  <TableHead>Re-Survey No</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
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
                    <TableCell colSpan={8} className="text-center py-8">
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
                      <TableCell className="font-medium">
                        {land.district}
                      </TableCell>
                      <TableCell>{land.taluka}</TableCell>
                      <TableCell>{land.village}</TableCell>
                      <TableCell>{land.block_no}</TableCell>
                      <TableCell>{land.re_survey_no}</TableCell>
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

          {!loading && filteredLands.length > 0 && (
            <div className="flex items-center justify-between mt-4">
              <p className="text-sm text-muted-foreground">
                Showing {filteredLands.length} of {lands.length} records
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
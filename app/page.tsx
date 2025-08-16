// "use client"

// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
// import {
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   ResponsiveContainer,
//   PieChart,
//   Pie,
//   Cell,
//   AreaChart,
//   Area,
// } from "recharts"
// import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
// import { MapPin, FileText, Calendar, Users, TrendingUp, AlertCircle, Building2, Layers } from "lucide-react"
// import { useLRMS } from "@/contexts/lrms-context"
// import { Badge } from "@/components/ui/badge"

// // Enhanced dummy data for charts
// const yearlySlabData = [
//   { year: "2020", count: 45, area: 125.5 },
//   { year: "2021", count: 52, area: 142.8 },
//   { year: "2022", count: 38, area: 98.2 },
//   { year: "2023", count: 61, area: 178.9 },
//   { year: "2024", count: 29, area: 89.4 },
// ]

// const monthlyLandData = [
//   { month: "Jan", entries: 12, area: 45.2 },
//   { month: "Feb", entries: 19, area: 67.8 },
//   { month: "Mar", entries: 15, area: 52.1 },
//   { month: "Apr", entries: 22, area: 78.9 },
//   { month: "May", entries: 18, area: 61.4 },
//   { month: "Jun", entries: 25, area: 89.7 },
//   { month: "Jul", entries: 21, area: 73.2 },
//   { month: "Aug", entries: 16, area: 58.6 },
// ]

// const statusData = [
//   { name: "Valid", value: 65, color: "#10b981" },
//   { name: "Pending", value: 25, color: "#f59e0b" },
//   { name: "Invalid", value: 10, color: "#ef4444" },
// ]

// const districtData = [
//   { district: "Pune", lands: 45, farmers: 128, area: 234.5 },
//   { district: "Mumbai", lands: 32, farmers: 89, area: 156.8 },
//   { district: "Nashik", lands: 28, farmers: 76, area: 189.2 },
//   { district: "Aurangabad", lands: 35, farmers: 95, area: 201.7 },
//   { district: "Kolhapur", lands: 22, farmers: 58, area: 134.9 },
// ]

// const noticeTypeData = [
//   { type: "Possessor", count: 15, percentage: 35 },
//   { type: "Sales Deed", count: 12, percentage: 28 },
//   { type: "Inheritance", count: 8, percentage: 19 },
//   { type: "Agricultural Rights", count: 5, percentage: 12 },
//   { type: "Other", count: 3, percentage: 6 },
// ]

// export default function Dashboard() {
//   const { state } = useLRMS()

//   const metrics = [
//     {
//       title: "Total Lands Recorded",
//       value: state.lands.length.toString(),
//       icon: MapPin,
//       description: "Across all districts",
//       trend: "+12%",
//       trendUp: true,
//       color: "text-blue-600",
//       bgColor: "bg-blue-50",
//     },
//     {
//       title: "Active Yearly Slabs",
//       value: state.slabs.length.toString(),
//       icon: Calendar,
//       description: "Current year slabs",
//       trend: "+8%",
//       trendUp: true,
//       color: "text-green-600",
//       bgColor: "bg-green-50",
//     },
//     {
//       title: "Pending Land Notices",
//       value: state.landNotices.filter((notice) => notice.status === "Valid").length.toString(),
//       icon: FileText,
//       description: "Awaiting processing",
//       trend: "-5%",
//       trendUp: false,
//       color: "text-amber-600",
//       bgColor: "bg-amber-50",
//     },
//     {
//       title: "Registered Farmers",
//       value: state.farmers.length.toString(),
//       icon: Users,
//       description: "In panipatrak registry",
//       trend: "+15%",
//       trendUp: true,
//       color: "text-purple-600",
//       bgColor: "bg-purple-50",
//     },
//     {
//       title: "Total Districts",
//       value: new Set(state.lands.map((land) => land.district)).size.toString(),
//       icon: Building2,
//       description: "Coverage areas",
//       trend: "0%",
//       trendUp: true,
//       color: "text-indigo-600",
//       bgColor: "bg-indigo-50",
//     },
//     {
//       title: "Document Upload Rate",
//       value: "87%",
//       icon: Layers,
//       description: "Documents available",
//       trend: "+3%",
//       trendUp: true,
//       color: "text-teal-600",
//       bgColor: "bg-teal-50",
//     },
//   ]

//   // Calculate additional metrics
//   const totalArea = state.lands.reduce((sum, land) => {
//     const areaInAcres = land.areaUnit === "acre" ? land.area : land.area / 4047
//     return sum + areaInAcres
//   }, 0)

//   const avgAreaPerLand = totalArea / state.lands.length || 0

//   return (
//     <div className="space-y-6 p-6">
//       <div>
//         <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
//         <p className="text-muted-foreground">Comprehensive overview of your land record management system</p>
//       </div>

//       {/* Enhanced Metrics Cards */}
//       <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
//         {metrics.map((metric) => (
//           <Card key={metric.title} className="relative overflow-hidden">
//             <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
//               <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
//               <div className={`p-2 rounded-lg ${metric.bgColor}`}>
//                 <metric.icon className={`h-4 w-4 ${metric.color}`} />
//               </div>
//             </CardHeader>
//             <CardContent>
//               <div className="text-2xl font-bold">{metric.value}</div>
//               <div className="flex items-center justify-between mt-2">
//                 <p className="text-xs text-muted-foreground">{metric.description}</p>
//                 <div className={`flex items-center text-xs ${metric.trendUp ? "text-green-600" : "text-red-600"}`}>
//                   <TrendingUp className={`h-3 w-3 mr-1 ${!metric.trendUp ? "rotate-180" : ""}`} />
//                   {metric.trend}
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         ))}
//       </div>

//       {/* Summary Stats */}
//       <div className="grid gap-4 md:grid-cols-4">
//         <Card>
//           <CardContent className="p-6">
//             <div className="text-center">
//               <div className="text-2xl font-bold text-blue-600">{totalArea.toFixed(1)}</div>
//               <p className="text-sm text-muted-foreground">Total Area (Acres)</p>
//             </div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardContent className="p-6">
//             <div className="text-center">
//               <div className="text-2xl font-bold text-green-600">{avgAreaPerLand.toFixed(2)}</div>
//               <p className="text-sm text-muted-foreground">Avg Area per Land</p>
//             </div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardContent className="p-6">
//             <div className="text-center">
//               <div className="text-2xl font-bold text-purple-600">
//                 {state.slabs.filter((s) => s.paiky || s.consolidation).length}
//               </div>
//               <p className="text-sm text-muted-foreground">Special Slabs</p>
//             </div>
//           </CardContent>
//         </Card>
//         <Card>
//           <CardContent className="p-6">
//             <div className="text-center">
//               <div className="text-2xl font-bold text-amber-600">
//                 {state.landNotices.filter((n) => n.displayInOutput).length}
//               </div>
//               <p className="text-sm text-muted-foreground">Output Notices</p>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Charts Section */}
//       <div className="grid gap-6 lg:grid-cols-5">
//         {/* Year-over-year Slab Counts */}
//         <Card className="lg:col-span-3">
//           <CardHeader>
//             <CardTitle>Yearly Slab Distribution</CardTitle>
//             <CardDescription>Number of slabs and total area per year</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <ChartContainer
//               config={{
//                 count: {
//                   label: "Slab Count",
//                   color: "#3b82f6",
//                 },
//                 area: {
//                   label: "Total Area",
//                   color: "#10b981",
//                 },
//               }}
//               className="h-[350px] w-full"
//             >
//               <BarChart data={yearlySlabData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis 
//                   dataKey="year" 
//                   tick={{ fontSize: 12 }}
//                   height={60}
//                 />
//                 <YAxis 
//                   yAxisId="left" 
//                   tick={{ fontSize: 12 }}
//                   width={40}
//                 />
//                 <YAxis 
//                   yAxisId="right" 
//                   orientation="right" 
//                   tick={{ fontSize: 12 }}
//                   width={40}
//                 />
//                 <ChartTooltip content={<ChartTooltipContent />} />
//                 <Bar yAxisId="left" dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
//                 <Bar yAxisId="right" dataKey="area" fill="var(--color-area)" radius={[4, 4, 0, 0]} opacity={0.7} />
//               </BarChart>
//             </ChartContainer>
//           </CardContent>
//         </Card>

//         {/* Monthly New Land Entries */}
//         <Card className="lg:col-span-2">
//           <CardHeader>
//             <CardTitle>Monthly Land Entries</CardTitle>
//             <CardDescription>New land records trend</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <ChartContainer
//               config={{
//                 entries: {
//                   label: "Land Entries",
//                   color: "#8b5cf6",
//                 },
//                 area: {
//                   label: "Area Added",
//                   color: "#06b6d4",
//                 },
//               }}
//               className="h-[350px] w-full"
//             >
//               <AreaChart data={monthlyLandData} margin={{ top: 20, right: 20, left: 20, bottom: 5 }}>
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis 
//                   dataKey="month" 
//                   tick={{ fontSize: 12 }}
//                   height={60}
//                 />
//                 <YAxis 
//                   tick={{ fontSize: 12 }}
//                   width={40}
//                 />
//                 <ChartTooltip content={<ChartTooltipContent />} />
//                 <Area
//                   type="monotone"
//                   dataKey="entries"
//                   stroke="var(--color-entries)"
//                   fill="var(--color-entries)"
//                   fillOpacity={0.6}
//                 />
//               </AreaChart>
//             </ChartContainer>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Second Row of Charts */}
//       <div className="grid gap-6 lg:grid-cols-5">
//         {/* District-wise Distribution */}
//         <Card className="lg:col-span-3">
//           <CardHeader>
//             <CardTitle>District-wise Distribution</CardTitle>
//             <CardDescription>Land records and farmers by district</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <ChartContainer
//               config={{
//                 lands: {
//                   label: "Land Records",
//                   color: "#f59e0b",
//                 },
//                 farmers: {
//                   label: "Farmers",
//                   color: "#06b6d4",
//                 },
//               }}
//               className="h-[350px] w-full"
//             >
//               <BarChart 
//                 data={districtData} 
//                 layout="horizontal"
//                 margin={{ top: 20, right: 30, left: 80, bottom: 5 }}
//               >
//                 <CartesianGrid strokeDasharray="3 3" />
//                 <XAxis 
//                   type="number" 
//                   tick={{ fontSize: 12 }}
//                   height={60}
//                 />
//                 <YAxis 
//                   dataKey="district" 
//                   type="category" 
//                   width={80}
//                   tick={{ fontSize: 12 }}
//                 />
//                 <ChartTooltip content={<ChartTooltipContent />} />
//                 <Bar dataKey="lands" fill="var(--color-lands)" radius={[0, 4, 4, 0]} />
//                 <Bar dataKey="farmers" fill="var(--color-farmers)" radius={[0, 4, 4, 0]} />
//               </BarChart>
//             </ChartContainer>
//           </CardContent>
//         </Card>

//         {/* Notice Status Distribution */}
//         <Card className="lg:col-span-2">
//           <CardHeader>
//             <CardTitle>Land Notice Status</CardTitle>
//             <CardDescription>Distribution of notice statuses</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <ChartContainer
//               config={{
//                 valid: { label: "Valid", color: "#10b981" },
//                 pending: { label: "Pending", color: "#f59e0b" },
//                 invalid: { label: "Invalid", color: "#ef4444" },
//               }}
//               className="h-[350px] w-full"
//             >
//               <PieChart>
//                 <Pie
//                   data={statusData}
//                   cx="50%"
//                   cy="50%"
//                   innerRadius={60}
//                   outerRadius={120}
//                   paddingAngle={5}
//                   dataKey="value"
//                 >
//                   {statusData.map((entry, index) => (
//                     <Cell key={`cell-${index}`} fill={entry.color} />
//                   ))}
//                 </Pie>
//                 <ChartTooltip content={<ChartTooltipContent />} />
//               </PieChart>
//             </ChartContainer>
//             {/* Legend */}
//             <div className="flex justify-center space-x-4 mt-4">
//               {statusData.map((item) => (
//                 <div key={item.name} className="flex items-center">
//                   <div 
//                     className="w-3 h-3 rounded-full mr-2" 
//                     style={{ backgroundColor: item.color }}
//                   />
//                   <span className="text-sm">{item.name}</span>
//                 </div>
//               ))}
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Third Row */}
//       <div className="grid gap-6 lg:grid-cols-5">
//         {/* Notice Type Distribution */}
//         <Card className="lg:col-span-3">
//           <CardHeader>
//             <CardTitle>Notice Type Distribution</CardTitle>
//             <CardDescription>Breakdown of land notices by type</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-6">
//               {noticeTypeData.map((item) => (
//                 <div key={item.type} className="flex items-center justify-between">
//                   <div className="flex items-center gap-3 flex-1">
//                     <div className="w-3 h-3 rounded-full bg-blue-500 flex-shrink-0" />
//                     <span className="text-sm font-medium">{item.type}</span>
//                   </div>
//                   <div className="flex items-center gap-4 flex-1 justify-end">
//                     <div className="w-32 bg-gray-200 rounded-full h-2">
//                       <div 
//                         className="bg-blue-500 h-2 rounded-full transition-all duration-300" 
//                         style={{ width: `${item.percentage}%` }} 
//                       />
//                     </div>
//                     <span className="text-sm text-muted-foreground w-8 text-right">{item.count}</span>
//                     <span className="text-sm font-medium w-10 text-right">{item.percentage}%</span>
//                   </div>
//                 </div>
//               ))}
//             </div>
//           </CardContent>
//         </Card>

//         {/* Recent Activity & Notifications */}
//         <Card className="lg:col-span-2">
//           <CardHeader>
//             <CardTitle>Recent Activity</CardTitle>
//             <CardDescription>Latest system activities</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-4 max-h-[300px] overflow-y-auto">
//               <div className="flex items-start space-x-3">
//                 <AlertCircle className="h-4 w-4 text-amber-500 mt-1 flex-shrink-0" />
//                 <div className="flex-1 space-y-1">
//                   <p className="text-sm font-medium">3 notices need verification</p>
//                   <p className="text-xs text-muted-foreground">Survey: 123/A, 456/B, 789/C</p>
//                 </div>
//                 <Badge variant="secondary" className="text-xs">Pending</Badge>
//               </div>

//               <div className="flex items-start space-x-3">
//                 <AlertCircle className="h-4 w-4 text-blue-500 mt-1 flex-shrink-0" />
//                 <div className="flex-1 space-y-1">
//                   <p className="text-sm font-medium">New slab created</p>
//                   <p className="text-xs text-muted-foreground">Survey 234/D (2024-2029)</p>
//                 </div>
//                 <Badge variant="outline" className="text-xs">Info</Badge>
//               </div>

//               <div className="flex items-start space-x-3">
//                 <AlertCircle className="h-4 w-4 text-green-500 mt-1 flex-shrink-0" />
//                 <div className="flex-1 space-y-1">
//                   <p className="text-sm font-medium">Passbook updated</p>
//                   <p className="text-xs text-muted-foreground">15 farmer records processed</p>
//                 </div>
//                 <Badge variant="outline" className="text-xs">Success</Badge>
//               </div>

//               <div className="flex items-start space-x-3">
//                 <AlertCircle className="h-4 w-4 text-red-500 mt-1 flex-shrink-0" />
//                 <div className="flex-1 space-y-1">
//                   <p className="text-sm font-medium">Area validation failed</p>
//                   <p className="text-xs text-muted-foreground">Survey 567/E area mismatch</p>
//                 </div>
//                 <Badge variant="destructive" className="text-xs">Error</Badge>
//               </div>

//               <div className="flex items-start space-x-3">
//                 <AlertCircle className="h-4 w-4 text-purple-500 mt-1 flex-shrink-0" />
//                 <div className="flex-1 space-y-1">
//                   <p className="text-sm font-medium">Monthly report ready</p>
//                   <p className="text-xs text-muted-foreground">November 2024 summary</p>
//                 </div>
//                 <Badge variant="outline" className="text-xs">Report</Badge>
//               </div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>

//       {/* Quick Actions */}
//       <Card>
//         <CardHeader>
//           <CardTitle>Quick Actions</CardTitle>
//           <CardDescription>Frequently used actions and shortcuts</CardDescription>
//         </CardHeader>
//         <CardContent>
//           <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
//             <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
//               <MapPin className="h-8 w-8 text-blue-600 mb-2" />
//               <span className="text-sm font-medium text-center">Add Land</span>
//             </div>
//             <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
//               <Calendar className="h-8 w-8 text-green-600 mb-2" />
//               <span className="text-sm font-medium text-center">Create Slab</span>
//             </div>
//             <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
//               <Users className="h-8 w-8 text-purple-600 mb-2" />
//               <span className="text-sm font-medium text-center">Add Farmer</span>
//             </div>
//             <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
//               <FileText className="h-8 w-8 text-amber-600 mb-2" />
//               <span className="text-sm font-medium text-center">Land Notice</span>
//             </div>
//             <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
//               <Building2 className="h-8 w-8 text-indigo-600 mb-2" />
//               <span className="text-sm font-medium text-center">View Reports</span>
//             </div>
//             <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
//               <Layers className="h-8 w-8 text-teal-600 mb-2" />
//               <span className="text-sm font-medium text-center">Export Data</span>
//             </div>
//           </div>
//         </CardContent>
//       </Card>
//     </div>
//   )
// }

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
                  <TableHead>Status</TableHead>
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
                      <TableCell>
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
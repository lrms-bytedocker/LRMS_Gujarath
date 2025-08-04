"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { MapPin, FileText, Calendar, Users, TrendingUp, AlertCircle, Building2, Layers } from "lucide-react"
import { useLRMS } from "@/contexts/lrms-context"
import { Badge } from "@/components/ui/badge"

// Enhanced dummy data for charts
const yearlySlabData = [
  { year: "2020", count: 45, area: 125.5 },
  { year: "2021", count: 52, area: 142.8 },
  { year: "2022", count: 38, area: 98.2 },
  { year: "2023", count: 61, area: 178.9 },
  { year: "2024", count: 29, area: 89.4 },
]

const monthlyLandData = [
  { month: "Jan", entries: 12, area: 45.2 },
  { month: "Feb", entries: 19, area: 67.8 },
  { month: "Mar", entries: 15, area: 52.1 },
  { month: "Apr", entries: 22, area: 78.9 },
  { month: "May", entries: 18, area: 61.4 },
  { month: "Jun", entries: 25, area: 89.7 },
  { month: "Jul", entries: 21, area: 73.2 },
  { month: "Aug", entries: 16, area: 58.6 },
]

const statusData = [
  { name: "Valid", value: 65, color: "#10b981" },
  { name: "Pending", value: 25, color: "#f59e0b" },
  { name: "Invalid", value: 10, color: "#ef4444" },
]

const districtData = [
  { district: "Pune", lands: 45, farmers: 128, area: 234.5 },
  { district: "Mumbai", lands: 32, farmers: 89, area: 156.8 },
  { district: "Nashik", lands: 28, farmers: 76, area: 189.2 },
  { district: "Aurangabad", lands: 35, farmers: 95, area: 201.7 },
  { district: "Kolhapur", lands: 22, farmers: 58, area: 134.9 },
]

const noticeTypeData = [
  { type: "Possessor", count: 15, percentage: 35 },
  { type: "Sales Deed", count: 12, percentage: 28 },
  { type: "Inheritance", count: 8, percentage: 19 },
  { type: "Agricultural Rights", count: 5, percentage: 12 },
  { type: "Other", count: 3, percentage: 6 },
]

export default function Dashboard() {
  const { state } = useLRMS()

  const metrics = [
    {
      title: "Total Lands Recorded",
      value: state.lands.length.toString(),
      icon: MapPin,
      description: "Across all districts",
      trend: "+12%",
      trendUp: true,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      title: "Active Yearly Slabs",
      value: state.slabs.length.toString(),
      icon: Calendar,
      description: "Current year slabs",
      trend: "+8%",
      trendUp: true,
      color: "text-green-600",
      bgColor: "bg-green-50",
    },
    {
      title: "Pending Land Notices",
      value: state.landNotices.filter((notice) => notice.status === "Valid").length.toString(),
      icon: FileText,
      description: "Awaiting processing",
      trend: "-5%",
      trendUp: false,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
    {
      title: "Registered Farmers",
      value: state.farmers.length.toString(),
      icon: Users,
      description: "In panipatrak registry",
      trend: "+15%",
      trendUp: true,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      title: "Total Districts",
      value: new Set(state.lands.map((land) => land.district)).size.toString(),
      icon: Building2,
      description: "Coverage areas",
      trend: "0%",
      trendUp: true,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
    },
    {
      title: "Document Upload Rate",
      value: "87%",
      icon: Layers,
      description: "Documents available",
      trend: "+3%",
      trendUp: true,
      color: "text-teal-600",
      bgColor: "bg-teal-50",
    },
  ]

  // Calculate additional metrics
  const totalArea = state.lands.reduce((sum, land) => {
    const areaInAcres = land.areaUnit === "acre" ? land.area : land.area / 4047
    return sum + areaInAcres
  }, 0)

  const avgAreaPerLand = totalArea / state.lands.length || 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Comprehensive overview of your land record management system</p>
      </div>

      {/* Enhanced Metrics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {metrics.map((metric) => (
          <Card key={metric.title} className="relative overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <div className={`p-2 rounded-lg ${metric.bgColor}`}>
                <metric.icon className={`h-4 w-4 ${metric.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center justify-between mt-2">
                <p className="text-xs text-muted-foreground">{metric.description}</p>
                <div className={`flex items-center text-xs ${metric.trendUp ? "text-green-600" : "text-red-600"}`}>
                  <TrendingUp className={`h-3 w-3 mr-1 ${!metric.trendUp ? "rotate-180" : ""}`} />
                  {metric.trend}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{totalArea.toFixed(1)}</div>
              <p className="text-sm text-muted-foreground">Total Area (Acres)</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{avgAreaPerLand.toFixed(2)}</div>
              <p className="text-sm text-muted-foreground">Avg Area per Land</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">
                {state.slabs.filter((s) => s.paiky || s.consolidation).length}
              </div>
              <p className="text-sm text-muted-foreground">Special Slabs</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-amber-600">
                {state.landNotices.filter((n) => n.displayInOutput).length}
              </div>
              <p className="text-sm text-muted-foreground">Output Notices</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Year-over-year Slab Counts */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Yearly Slab Distribution</CardTitle>
            <CardDescription>Number of slabs and total area per year</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer
              config={{
                count: {
                  label: "Slab Count",
                  color: "hsl(var(--chart-1))",
                },
                area: {
                  label: "Total Area",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={yearlySlabData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar yAxisId="left" dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                  <Bar yAxisId="right" dataKey="area" fill="var(--color-area)" radius={[4, 4, 0, 0]} opacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Monthly New Land Entries */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Monthly Land Entries</CardTitle>
            <CardDescription>New land records and area added</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                entries: {
                  label: "Land Entries",
                  color: "hsl(var(--chart-2))",
                },
                area: {
                  label: "Area Added",
                  color: "hsl(var(--chart-3))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyLandData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Area
                    type="monotone"
                    dataKey="entries"
                    stackId="1"
                    stroke="var(--color-entries)"
                    fill="var(--color-entries)"
                    fillOpacity={0.6}
                  />
                  <Area
                    type="monotone"
                    dataKey="area"
                    stackId="2"
                    stroke="var(--color-area)"
                    fill="var(--color-area)"
                    fillOpacity={0.4}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* District-wise Distribution */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>District-wise Distribution</CardTitle>
            <CardDescription>Land records and farmers by district</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                lands: {
                  label: "Land Records",
                  color: "hsl(var(--chart-1))",
                },
                farmers: {
                  label: "Farmers",
                  color: "hsl(var(--chart-2))",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={districtData} layout="horizontal">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="district" type="category" width={80} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="lands" fill="var(--color-lands)" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="farmers" fill="var(--color-farmers)" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Notice Status Distribution */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Land Notice Status</CardTitle>
            <CardDescription>Distribution of notice statuses</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                valid: { label: "Valid", color: "#10b981" },
                pending: { label: "Pending", color: "#f59e0b" },
                invalid: { label: "Invalid", color: "#ef4444" },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {/* Notice Type Distribution */}
        <Card className="col-span-4">
          <CardHeader>
            <CardTitle>Notice Type Distribution</CardTitle>
            <CardDescription>Breakdown of land notices by type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {noticeTypeData.map((item) => (
                <div key={item.type} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-blue-500" />
                    <span className="text-sm font-medium">{item.type}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-24 bg-gray-200 rounded-full h-2">
                      <div className="bg-blue-500 h-2 rounded-full" style={{ width: `${item.percentage}%` }} />
                    </div>
                    <span className="text-sm text-muted-foreground w-8">{item.count}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Notifications */}
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>Latest system activities and alerts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-start space-x-4">
                <AlertCircle className="h-5 w-5 text-amber-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">3 land notices require document verification</p>
                  <p className="text-xs text-muted-foreground">Survey numbers: 123/A, 456/B, 789/C</p>
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>

              <div className="flex items-start space-x-4">
                <AlertCircle className="h-5 w-5 text-blue-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">New slab created for survey 234/D</p>
                  <p className="text-xs text-muted-foreground">Year range: 2024-2029</p>
                </div>
                <Badge variant="outline">Info</Badge>
              </div>

              <div className="flex items-start space-x-4">
                <AlertCircle className="h-5 w-5 text-green-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Passbook entries updated successfully</p>
                  <p className="text-xs text-muted-foreground">15 farmer records processed</p>
                </div>
                <Badge variant="outline">Success</Badge>
              </div>

              <div className="flex items-start space-x-4">
                <AlertCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Area validation failed for survey 567/E</p>
                  <p className="text-xs text-muted-foreground">Total assigned area exceeds available land</p>
                </div>
                <Badge variant="destructive">Error</Badge>
              </div>

              <div className="flex items-start space-x-4">
                <AlertCircle className="h-5 w-5 text-purple-500 mt-0.5" />
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium">Monthly report generated</p>
                  <p className="text-xs text-muted-foreground">Land records summary for November 2024</p>
                </div>
                <Badge variant="outline">Report</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
          <CardDescription>Frequently used actions and shortcuts</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <MapPin className="h-8 w-8 text-blue-600 mb-2" />
              <span className="text-sm font-medium">Add Land</span>
            </div>
            <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Calendar className="h-8 w-8 text-green-600 mb-2" />
              <span className="text-sm font-medium">Create Slab</span>
            </div>
            <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Users className="h-8 w-8 text-purple-600 mb-2" />
              <span className="text-sm font-medium">Add Farmer</span>
            </div>
            <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <FileText className="h-8 w-8 text-amber-600 mb-2" />
              <span className="text-sm font-medium">Land Notice</span>
            </div>
            <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Building2 className="h-8 w-8 text-indigo-600 mb-2" />
              <span className="text-sm font-medium">View Reports</span>
            </div>
            <div className="flex flex-col items-center p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
              <Layers className="h-8 w-8 text-teal-600 mb-2" />
              <span className="text-sm font-medium">Export Data</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

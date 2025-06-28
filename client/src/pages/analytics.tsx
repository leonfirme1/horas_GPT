import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LabelList } from 'recharts';
import { BarChart3, Clock, DollarSign, TrendingUp, Users } from "lucide-react";
import type { Client, Consultant, TimeEntryDetailed, ServiceType, Project } from "@shared/schema";

// Colors for charts
const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

interface AnalyticsData {
  projectStats: Array<{
    name: string;
    hours: number;
    value: number;
  }>;
  serviceLocationStats: Array<{
    name: string;
    hours: number;
    value: number;
  }>;
  sectorStats: Array<{
    name: string;
    hours: number;
    value: number;
  }>;
  serviceTypeStats: Array<{
    name: string;
    hours: number;
    value: number;
  }>;
  totalHours: number;
  totalValue: number;
  totalEntries: number;
}

export default function Analytics() {
  // Get current month dates
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const firstDay = new Date(currentYear, currentMonth, 1);
  const lastDay = new Date(currentYear, currentMonth + 1, 0);
  
  const formatDate = (date: Date) => {
    return date.toISOString().split('T')[0];
  };
  
  const [startDate, setStartDate] = useState(formatDate(firstDay));
  const [endDate, setEndDate] = useState(formatDate(lastDay));
  const [selectedClient, setSelectedClient] = useState<string>("all");
  const [selectedConsultant, setSelectedConsultant] = useState<string>("all");
  const [shouldFetch, setShouldFetch] = useState(false);

  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: consultants = [] } = useQuery<Consultant[]>({
    queryKey: ["/api/consultants"],
  });

  const { data: sectors = [] } = useQuery({
    queryKey: ["/api/sectors"],
  });

  const { data: serviceTypes = [] } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
  });

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ["/api/projects"],
  });

  const { data: timeEntries = [], isLoading: entriesLoading } = useQuery({
    queryKey: ["/api/time-entries/filtered", startDate, endDate, selectedClient, selectedConsultant],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedClient && selectedClient !== 'all') params.append('clientId', selectedClient);
      if (selectedConsultant && selectedConsultant !== 'all') params.append('consultantId', selectedConsultant);
      
      const response = await fetch(`/api/time-entries/filtered?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: shouldFetch,
  });

  const handleGenerateAnalytics = () => {
    setShouldFetch(true);
  };

  // Process data for analytics
  const analyticsData: AnalyticsData = {
    projectStats: [],
    serviceLocationStats: [],
    sectorStats: [],
    serviceTypeStats: [],
    totalHours: 0,
    totalValue: 0,
    totalEntries: timeEntries.length || 0
  };

  if (timeEntries && timeEntries.length > 0) {
    // Group by project using projectId to find project name
    const projectGroups = timeEntries.reduce((acc: any, entry: TimeEntryDetailed) => {
      let projectName = 'Sem Projeto';
      
      // Check if entry has project information
      if (entry.projectId && projects && projects.length > 0) {
        const project = projects.find((p: Project) => p.id === entry.projectId);
        if (project) {
          projectName = project.name;
        } else {
          projectName = `Projeto ${entry.projectId}`;
        }
      }
      
      if (!acc[projectName]) {
        acc[projectName] = { hours: 0, value: 0 };
      }
      acc[projectName].hours += parseFloat(entry.totalHours || '0');
      acc[projectName].value += parseFloat(entry.totalValue || '0');
      return acc;
    }, {});

    analyticsData.projectStats = Object.entries(projectGroups).map(([name, data]: [string, any]) => ({
      name,
      hours: parseFloat(data.hours.toFixed(2)),
      value: parseFloat(data.value.toFixed(2))
    }));

    // Group by service location (tipo de atendimento)
    const locationGroups = timeEntries.reduce((acc: any, entry: TimeEntryDetailed) => {
      const location = entry.serviceLocation || 'Não Informado';
      if (!acc[location]) {
        acc[location] = { hours: 0, value: 0 };
      }
      acc[location].hours += parseFloat(entry.totalHours || '0');
      acc[location].value += parseFloat(entry.totalValue || '0');
      return acc;
    }, {});

    analyticsData.serviceLocationStats = Object.entries(locationGroups).map(([name, data]: [string, any]) => ({
      name,
      hours: parseFloat(data.hours.toFixed(2)),
      value: parseFloat(data.value.toFixed(2))
    }));

    // Group by sector using sector description from sectors table
    const sectorGroups = timeEntries.reduce((acc: any, entry: any) => {
      let sectorName = 'Sem Setor';
      
      // Debug log to see what data we're getting
      if (entry.sectorId) {
        console.log('Entry sector data:', { sectorId: entry.sectorId, sector: entry.sector });
      }
      
      // Check if entry has sector information (from filtered endpoint)
      if (entry.sector && entry.sector.description) {
        sectorName = entry.sector.description;
      } else if (entry.sectorId) {
        // Fallback using sector ID
        sectorName = `Setor ${entry.sectorId}`;
      }
      
      if (!acc[sectorName]) {
        acc[sectorName] = { hours: 0, value: 0 };
      }
      acc[sectorName].hours += parseFloat(entry.totalHours || '0');
      acc[sectorName].value += parseFloat(entry.totalValue || '0');
      return acc;
    }, {});

    analyticsData.sectorStats = Object.entries(sectorGroups).map(([name, data]: [string, any]) => ({
      name,
      hours: parseFloat(data.hours.toFixed(2)),
      value: parseFloat(data.value.toFixed(2))
    }));
    
    console.log('Final sector stats:', analyticsData.sectorStats);

    // Group by service type using service type description from service_types table
    const serviceTypeGroups = timeEntries.reduce((acc: any, entry: any) => {
      let serviceTypeName = 'Sem Tipo de Atendimento';
      
      // Check if entry has service type information
      if (entry.serviceTypeId && serviceTypes) {
        const serviceType = serviceTypes.find((st: ServiceType) => st.id === entry.serviceTypeId);
        if (serviceType) {
          // Use code field instead of description
          serviceTypeName = serviceType.code;
        } else {
          serviceTypeName = `T${entry.serviceTypeId}`;
        }
      } else {
        serviceTypeName = 'NULO';
      }
      
      if (!acc[serviceTypeName]) {
        acc[serviceTypeName] = { hours: 0, value: 0 };
      }
      acc[serviceTypeName].hours += parseFloat(entry.totalHours || '0');
      acc[serviceTypeName].value += parseFloat(entry.totalValue || '0');
      return acc;
    }, {});

    analyticsData.serviceTypeStats = Object.entries(serviceTypeGroups).map(([name, data]: [string, any]) => ({
      name,
      hours: parseFloat(data.hours.toFixed(2)),
      value: parseFloat(data.value.toFixed(2))
    }));

    // Calculate totals
    analyticsData.totalHours = timeEntries.reduce((sum: number, entry: TimeEntryDetailed) => 
      sum + parseFloat(entry.totalHours || '0'), 0);
    analyticsData.totalValue = timeEntries.reduce((sum: number, entry: TimeEntryDetailed) => 
      sum + parseFloat(entry.totalValue || '0'), 0);
  }

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border rounded shadow-lg">
          <p className="font-medium">{`${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.dataKey === 'hours' ? 
                `Horas: ${entry.value}h` : 
                `Valor: R$ ${entry.value.toFixed(2)}`
              }
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Layout title="Analytics">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Filtros Analytics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start-date">Data Inicial</Label>
                <Input
                  id="start-date"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end-date">Data Final</Label>
                <Input
                  id="end-date"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente</Label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os clientes" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os clientes</SelectItem>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id.toString()}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Consultor</Label>
                <Select value={selectedConsultant} onValueChange={setSelectedConsultant}>
                  <SelectTrigger>
                    <SelectValue placeholder="Todos os consultores" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os consultores</SelectItem>
                    {consultants.map((consultant) => (
                      <SelectItem key={consultant.id} value={consultant.id.toString()}>
                        {consultant.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button 
              onClick={handleGenerateAnalytics} 
              className="flex items-center gap-2"
              disabled={entriesLoading}
            >
              <TrendingUp className="h-4 w-4" />
              {entriesLoading ? 'Carregando...' : 'Gerar Analytics'}
            </Button>
          </CardContent>
        </Card>

        {shouldFetch && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Total de Horas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.totalHours.toFixed(2)}h</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Valor Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">R$ {analyticsData.totalValue.toFixed(2)}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Total de Lançamentos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analyticsData.totalEntries}</div>
                </CardContent>
              </Card>
            </div>

            {/* Charts */}
            <Tabs defaultValue="projeto" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="projeto">Projeto</TabsTrigger>
                <TabsTrigger value="atendimento">Loc. Atend.</TabsTrigger>
                <TabsTrigger value="setor">Setor</TabsTrigger>
                <TabsTrigger value="tipoatendimento">Tipo Atend.</TabsTrigger>
              </TabsList>

              <TabsContent value="projeto" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Horas por Projeto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.projectStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="hours" fill="#8884d8" name="Horas">
                            <LabelList dataKey="hours" position="center" fill="white" fontSize={12} fontWeight="bold" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Valor por Projeto</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.projectStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="value" fill="#82ca9d" name="Valor (R$)">
                            <LabelList dataKey="value" position="center" fill="white" fontSize={11} fontWeight="bold" 
                              formatter={(value: number) => `R$ ${value.toFixed(0)}`} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="atendimento" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Horas por Tipo de Atendimento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analyticsData.serviceLocationStats}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: ${value}h`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="hours"
                          >
                            {analyticsData.serviceLocationStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Valor por Tipo de Atendimento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <PieChart>
                          <Pie
                            data={analyticsData.serviceLocationStats}
                            cx="50%"
                            cy="50%"
                            labelLine={false}
                            label={({ name, value }) => `${name}: R$ ${value.toFixed(2)}`}
                            outerRadius={80}
                            fill="#8884d8"
                            dataKey="value"
                          >
                            {analyticsData.serviceLocationStats.map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="setor" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Horas por Setor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.sectorStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="hours" fill="#ffc658" name="Horas">
                            <LabelList dataKey="hours" position="center" fill="white" fontSize={12} fontWeight="bold" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Valor por Setor</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.sectorStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="value" fill="#ff7300" name="Valor (R$)">
                            <LabelList dataKey="value" position="center" fill="white" fontSize={11} fontWeight="bold" 
                              formatter={(value: number) => `R$ ${value.toFixed(0)}`} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="tipoatendimento" className="space-y-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle>Horas por Tipo de Atendimento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.serviceTypeStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="hours" fill="#8884d8" name="Horas">
                            <LabelList dataKey="hours" position="center" fill="white" fontSize={12} fontWeight="bold" />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle>Valor por Tipo de Atendimento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={analyticsData.serviceTypeStats}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" />
                          <YAxis />
                          <Tooltip content={<CustomTooltip />} />
                          <Legend />
                          <Bar dataKey="value" fill="#82ca9d" name="Valor (R$)">
                            <LabelList dataKey="value" position="center" fill="white" fontSize={11} fontWeight="bold" 
                              formatter={(value: number) => `R$ ${value.toFixed(0)}`} />
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>
                </div>
                
                {/* Legend for Service Types */}
                {serviceTypes && serviceTypes.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle>Legenda - Tipos de Atendimento</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 text-sm">
                        {serviceTypes.map((serviceType) => (
                          <div key={serviceType.id} className="flex items-center gap-2">
                            <span className="font-mono font-bold text-primary">{serviceType.code}</span>
                            <span>-</span>
                            <span className="text-gray-600">{serviceType.description}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </TabsContent>
            </Tabs>

            {(!timeEntries || timeEntries.length === 0) && (
              <Card>
                <CardContent className="text-center py-8">
                  <div className="text-muted-foreground">
                    Nenhum dado encontrado para os filtros selecionados.
                  </div>
                  <div className="text-sm text-muted-foreground mt-2">
                    Ajuste os filtros e tente novamente.
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Filter, TrendingUp, Users, Clock, DollarSign, FileText, BarChart3 } from "lucide-react";
import type { Client, Consultant } from "@shared/schema";

interface ReportData {
  totalHours: number;
  totalValue: number;
  totalEntries: number;
  totalClients: number;
  clientBreakdown: Array<{
    clientId: number;
    clientName: string;
    hours: number;
    value: number;
    entries: number;
  }>;
}

export default function Reports() {
  console.log("Reports component rendering...");
  
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

  const { data: clients = [], isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: consultants = [], isLoading: consultantsLoading } = useQuery<Consultant[]>({
    queryKey: ["/api/consultants"],
  });

  const { data: reportData, isLoading: reportLoading, refetch } = useQuery({
    queryKey: ["/api/reports/data"],
    queryFn: async () => {
      console.log("Fetching report data...");
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      if (selectedClient && selectedClient !== 'all') params.append('clientId', selectedClient);
      if (selectedConsultant && selectedConsultant !== 'all') params.append('consultantId', selectedConsultant);
      
      const response = await fetch(`/api/reports/data?${params}`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      return response.json();
    },
    enabled: shouldFetch,
  });

  console.log("Reports state:", { 
    clientsLoading, 
    consultantsLoading, 
    reportLoading, 
    clientsCount: clients.length, 
    consultantsCount: consultants.length,
    shouldFetch,
    reportData 
  });

  const handleGenerateReport = () => {
    setShouldFetch(true);
    refetch();
  };

  const handleExportCSV = () => {
    if (!reportData) return;
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (selectedClient) params.append('clientId', selectedClient);
    if (selectedConsultant) params.append('consultantId', selectedConsultant);
    
    const url = `/api/reports/export?${params}`;
    window.open(url, '_blank');
  };

  const handleExportPDF = () => {
    if (!reportData) return;
    
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    if (selectedClient) params.append('clientId', selectedClient);
    if (selectedConsultant) params.append('consultantId', selectedConsultant);
    
    const url = `/api/reports/pdf?${params}`;
    window.open(url, '_blank');
  };

  return (
    <Layout title="Relatórios">
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5" />
              Filtros do Relatório
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

            <div className="flex gap-2 flex-wrap">
              <Button 
                onClick={handleGenerateReport} 
                className="flex items-center gap-2"
                disabled={reportLoading}
              >
                <Filter className="h-4 w-4" />
                {reportLoading ? 'Gerando...' : 'Gerar Relatório'}
              </Button>
              <Button 
                onClick={handleExportCSV} 
                variant="outline" 
                className="flex items-center gap-2"
                disabled={!reportData || reportLoading}
              >
                <FileDown className="h-4 w-4" />
                Exportar CSV
              </Button>
              <Button 
                onClick={handleExportPDF} 
                variant="outline" 
                className="flex items-center gap-2"
                disabled={!reportData || reportLoading}
              >
                <FileText className="h-4 w-4" />
                Exportar PDF
              </Button>
            </div>
          </CardContent>
        </Card>

        {reportData && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Total de Horas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalHours || 0}h</div>
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
                <div className="text-2xl font-bold">R$ {(reportData.totalValue || 0).toFixed(2)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Total de Lançamentos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalEntries || 0}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Clientes Atendidos
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{reportData.totalClients || 0}</div>
              </CardContent>
            </Card>
          </div>
        )}

        {reportData && reportData.clientBreakdown && reportData.clientBreakdown.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento por Cliente</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reportData.clientBreakdown.map((client: any) => (
                  <div key={client.clientId} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <div className="font-medium">{client.clientName}</div>
                      <div className="text-sm text-muted-foreground">
                        {client.entries} {client.entries === 1 ? 'lançamento' : 'lançamentos'}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-medium">{parseFloat(client.hours || 0).toFixed(2)}h</div>
                      <div className="text-sm text-muted-foreground">R$ {parseFloat(client.value || 0).toFixed(2)}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {shouldFetch && !reportLoading && (!reportData || (reportData.totalEntries === 0)) && (
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
      </div>
    </Layout>
  );
}
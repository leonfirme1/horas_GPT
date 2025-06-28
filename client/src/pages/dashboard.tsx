import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Layout } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, Clock, DollarSign, UserCheck, Calendar } from "lucide-react";

interface DashboardStats {
  totalClients: number;
  monthlyHours: number;
  monthlyRevenue: number;
  activeConsultants: number;
  consultantStats: Array<{
    consultantId: number;
    consultantName: string;
    totalHours: number;
    totalValue: number;
  }>;
  clientStats: Array<{
    clientId: number;
    clientName: string;
    totalHours: number;
    totalValue: number;
  }>;
}

interface TimeEntryDetailed {
  id: number;
  date: string;
  consultant: { name: string };
  client: { name: string };
  service: { description: string };
  totalHours: string;
  totalValue: string;
}

export default function Dashboard() {
  const [selectedMonth, setSelectedMonth] = useState<'current' | 'previous'>('current');
  
  // Calculate month parameters
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const currentYear = currentDate.getFullYear();
  
  const previousDate = new Date(currentYear, currentMonth - 2, 1);
  const previousMonth = previousDate.getMonth() + 1;
  const previousYear = previousDate.getFullYear();
  
  const queryMonth = selectedMonth === 'current' ? currentMonth : previousMonth;
  const queryYear = selectedMonth === 'current' ? currentYear : previousYear;

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery<DashboardStats>({
    queryKey: ["/api/dashboard/stats", queryMonth, queryYear],
    queryFn: async () => {
      const url = `/api/dashboard/stats?month=${queryMonth}&year=${queryYear}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
  });

  const { data: recentEntries, isLoading: entriesLoading, error: entriesError } = useQuery<TimeEntryDetailed[]>({
    queryKey: ["/api/time-entries", queryMonth, queryYear],
    queryFn: async () => {
      const url = `/api/time-entries?month=${queryMonth}&year=${queryYear}`;
      const response = await fetch(url, { credentials: "include" });
      if (!response.ok) {
        throw new Error(`${response.status}: ${await response.text()}`);
      }
      return response.json();
    },
    select: (data) => data?.slice(0, 5) || [],
  });

  console.log("Dashboard render - stats:", stats, "entries:", recentEntries);
  console.log("Dashboard errors - stats:", statsError, "entries:", entriesError);

  if (statsError || entriesError) {
    return (
      <Layout title="Dashboard">
        <div className="space-y-6">
          <div className="text-center py-12">
            <h2 className="text-xl font-semibold text-red-600 mb-2">Erro ao carregar dados</h2>
            <p className="text-gray-600">
              {statsError?.message || entriesError?.message || "Erro desconhecido"}
            </p>
          </div>
        </div>
      </Layout>
    );
  }

  if (statsLoading || entriesLoading) {
    return (
      <Layout title="Dashboard">
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="stats-card animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </Layout>
    );
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getClientInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();
  };

  const monthNames = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentMonthName = monthNames[currentMonth - 1];
  const previousMonthName = monthNames[previousMonth - 1];

  return (
    <Layout title="Dashboard">
      <div className="space-y-6">
        {/* Month Filter Buttons */}
        <div className="flex items-center gap-4 mb-6">
          <Calendar className="h-5 w-5 text-gray-600" />
          <div className="flex gap-2">
            <Button
              variant={selectedMonth === 'current' ? 'default' : 'outline'}
              onClick={() => setSelectedMonth('current')}
            >
              MÊS ATUAL ({currentMonthName})
            </Button>
            <Button
              variant={selectedMonth === 'previous' ? 'default' : 'outline'}
              onClick={() => setSelectedMonth('previous')}
            >
              MÊS ANTERIOR ({previousMonthName})
            </Button>
          </div>
        </div>

        {/* Summary Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Geral de Horas</p>
                  <p className="text-3xl font-bold text-gray-900">{Number(stats?.monthlyHours || 0).toFixed(1)}</p>
                </div>
                <div className="bg-blue-100 p-3 rounded-full">
                  <Clock className="text-blue-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Valor Financeiro Total</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {formatCurrency(Number(stats?.monthlyRevenue || 0))}
                  </p>
                </div>
                <div className="bg-green-100 p-3 rounded-full">
                  <DollarSign className="text-green-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total de Clientes</p>
                  <p className="text-3xl font-bold text-gray-900">{stats?.totalClients || 0}</p>
                </div>
                <div className="bg-purple-100 p-3 rounded-full">
                  <Users className="text-purple-600 h-6 w-6" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats by Consultant and Client */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* By Consultant */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5" />
                Horas e Valores por Consultor
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.consultantStats && stats.consultantStats.length > 0 ? (
                <div className="space-y-4">
                  {stats.consultantStats.map((consultant) => (
                    <div key={consultant.consultantId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900">{consultant.consultantName}</p>
                        <p className="text-sm text-gray-600">{consultant.totalHours.toFixed(1)} horas</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(consultant.totalValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <UserCheck className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>Nenhum dado de consultor encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* By Client */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Horas e Valores por Cliente
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stats?.clientStats && stats.clientStats.length > 0 ? (
                <div className="space-y-4">
                  {stats.clientStats.map((client) => (
                    <div key={client.clientId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-primary text-white rounded-full flex items-center justify-center font-semibold text-sm">
                          {getClientInitials(client.clientName)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{client.clientName}</p>
                          <p className="text-sm text-gray-600">{client.totalHours.toFixed(1)} horas</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          {formatCurrency(client.totalValue)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Users className="mx-auto h-12 w-12 text-gray-300 mb-4" />
                  <p>Nenhum dado de cliente encontrado</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

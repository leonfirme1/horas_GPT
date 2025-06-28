import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertSectorSchema, 
  type SectorWithClient, 
  type InsertSector, 
  type Client 
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Edit, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Sectors() {
  const [editingSector, setEditingSector] = useState<SectorWithClient | null>(null);
  const { toast } = useToast();

  const { data: sectors, isLoading: sectorsLoading } = useQuery<SectorWithClient[]>({
    queryKey: ["/api/sectors"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const form = useForm<InsertSector>({
    resolver: zodResolver(insertSectorSchema),
    defaultValues: {
      code: "",
      description: "",
      clientId: null,
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertSector) => apiRequest("POST", "/api/sectors", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      resetForm();
      toast({
        title: "Sucesso",
        description: "Setor criado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar setor",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertSector> }) => 
      apiRequest("PUT", `/api/sectors/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      resetForm();
      setEditingSector(null);
      toast({
        title: "Sucesso",
        description: "Setor atualizado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar setor",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/sectors/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/sectors"] });
      toast({
        title: "Sucesso",
        description: "Setor excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir setor",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    form.reset({
      code: "",
      description: "",
      clientId: null,
    });
    setEditingSector(null);
  };

  const onSubmit = (data: InsertSector) => {
    if (editingSector) {
      updateMutation.mutate({ id: editingSector.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (sector: SectorWithClient) => {
    setEditingSector(sector);
    form.reset({
      code: sector.code,
      description: sector.description,
      clientId: sector.clientId,
    });
  };

  const handleDelete = (id: number, description: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o setor "${description}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (sectorsLoading || clientsLoading) {
    return (
      <Layout title="Setores">
        <div className="text-center py-8">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Setores">
      <div className="space-y-6">
        {/* Form Section */}
        <div className="content-card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              {editingSector ? "Editar Setor" : "Novo Setor"}
            </h3>
          </div>
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="code"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Digite o código do setor" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="clientId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Cliente (opcional)</FormLabel>
                        <Select onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} value={field.value?.toString() || "none"}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione um cliente (opcional)" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="none">Sem cliente específico</SelectItem>
                            {clients?.map((client) => (
                              <SelectItem key={client.id} value={client.id.toString()}>
                                {client.code} - {client.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="description"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descrição</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Digite a descrição do setor" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingSector ? "Atualizar" : "Salvar"}
                  </Button>
                  {editingSector && (
                    <Button type="button" variant="outline" onClick={resetForm}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </Form>
          </div>
        </div>

        {/* List Section */}
        <div className="content-card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Setores Cadastrados</h3>
          </div>
          <div className="p-6">
            {sectors && sectors.length > 0 ? (
              <div className="space-y-4">
                {sectors.map((sector) => (
                  <div key={sector.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="bg-primary text-white px-2 py-1 rounded text-xs font-semibold">
                            {sector.code}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{sector.description}</span>
                        </div>
                        {sector.client ? (
                          <p className="text-xs text-gray-500">
                            Cliente: {sector.client.code} - {sector.client.name}
                          </p>
                        ) : (
                          <p className="text-xs text-gray-500">
                            Setor geral (sem cliente específico)
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-blue-700 text-xs"
                          onClick={() => handleEdit(sector)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 text-xs"
                          onClick={() => handleDelete(sector.id, sector.description)}
                        >
                          <Trash2 className="h-3 w-3 mr-1" />
                          Excluir
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhum setor cadastrado
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
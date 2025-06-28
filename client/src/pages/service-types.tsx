import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertServiceTypeSchema, 
  type ServiceType, 
  type InsertServiceType
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Edit, Trash2, Plus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ServiceTypes() {
  const [editingServiceType, setEditingServiceType] = useState<ServiceType | null>(null);
  const { toast } = useToast();

  const { data: serviceTypes, isLoading: serviceTypesLoading } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
  });

  const form = useForm<InsertServiceType>({
    resolver: zodResolver(insertServiceTypeSchema),
    defaultValues: {
      code: "",
      description: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertServiceType) => apiRequest("POST", "/api/service-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      resetForm();
      toast({
        title: "Sucesso",
        description: "Tipo de atendimento criado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar tipo de atendimento",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertServiceType> }) => 
      apiRequest("PUT", `/api/service-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      resetForm();
      setEditingServiceType(null);
      toast({
        title: "Sucesso",
        description: "Tipo de atendimento atualizado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar tipo de atendimento",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/service-types/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/service-types"] });
      toast({
        title: "Sucesso",
        description: "Tipo de atendimento excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir tipo de atendimento",
        variant: "destructive",
      });
    },
  });

  const resetForm = () => {
    form.reset({
      code: "",
      description: "",
    });
    setEditingServiceType(null);
  };

  const onSubmit = (data: InsertServiceType) => {
    if (editingServiceType) {
      updateMutation.mutate({ id: editingServiceType.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (serviceType: ServiceType) => {
    setEditingServiceType(serviceType);
    form.reset({
      code: serviceType.code,
      description: serviceType.description,
    });
  };

  const handleDelete = (id: number, description: string) => {
    if (window.confirm(`Tem certeza que deseja excluir o tipo de atendimento "${description}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  if (serviceTypesLoading) {
    return (
      <Layout title="Tipos de Atendimento">
        <div className="text-center py-8">Carregando...</div>
      </Layout>
    );
  }

  return (
    <Layout title="Tipos de Atendimento">
      <div className="space-y-6">
        {/* Form Section */}
        <div className="content-card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <Plus className="h-5 w-5 mr-2" />
              {editingServiceType ? "Editar Tipo de Atendimento" : "Novo Tipo de Atendimento"}
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
                        <FormLabel>Código Tipo Atend.</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Digite o código do tipo de atendimento" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Descrição Tipo Atendimento</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="Digite a descrição do tipo de atendimento" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex gap-2">
                  <Button 
                    type="submit" 
                    disabled={createMutation.isPending || updateMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {editingServiceType ? "Atualizar" : "Salvar"}
                  </Button>
                  {editingServiceType && (
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
            <h3 className="text-lg font-semibold text-gray-800">Tipos de Atendimento Cadastrados</h3>
          </div>
          <div className="p-6">
            {serviceTypes && serviceTypes.length > 0 ? (
              <div className="space-y-4">
                {serviceTypes.map((serviceType) => (
                  <div key={serviceType.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="bg-primary text-white px-2 py-1 rounded text-xs font-semibold">
                            {serviceType.code}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{serviceType.description}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-primary hover:text-blue-700 text-xs"
                          onClick={() => handleEdit(serviceType)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Editar
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-600 hover:text-red-700 text-xs"
                          onClick={() => handleDelete(serviceType.id, serviceType.description)}
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
                Nenhum tipo de atendimento cadastrado
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
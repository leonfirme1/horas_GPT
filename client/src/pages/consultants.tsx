import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertConsultantSchema, type Consultant, type InsertConsultant } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Plus, Edit, Search, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Consultants() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingConsultant, setEditingConsultant] = useState<Consultant | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const { toast } = useToast();

  const { data: consultants, isLoading } = useQuery<Consultant[]>({
    queryKey: ["/api/consultants"],
  });

  const form = useForm<InsertConsultant>({
    resolver: zodResolver(insertConsultantSchema),
    defaultValues: {
      code: "",
      name: "",
      password: "",
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: InsertConsultant) => apiRequest("POST", "/api/consultants", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultants"] });
      setIsDialogOpen(false);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Consultor criado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar consultor",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertConsultant> }) =>
      apiRequest("PUT", `/api/consultants/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/consultants"] });
      setIsDialogOpen(false);
      setEditingConsultant(null);
      form.reset();
      toast({
        title: "Sucesso",
        description: "Consultor atualizado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar consultor",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InsertConsultant) => {
    if (editingConsultant) {
      updateMutation.mutate({ id: editingConsultant.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const handleEdit = (consultant: Consultant) => {
    setEditingConsultant(consultant);
    form.reset({
      code: consultant.code,
      name: consultant.name,
    });
    setIsDialogOpen(true);
  };

  const handleNewConsultant = () => {
    setEditingConsultant(null);
    form.reset({
      code: "",
      name: "",
    });
    setIsDialogOpen(true);
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();
  };

  const filteredConsultants = consultants?.filter(consultant =>
    consultant.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    consultant.code.toLowerCase().includes(searchTerm.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <Layout title="Gerenciar Consultores">
        <div className="content-card">
          <div className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Gerenciar Consultores">
      <div className="content-card">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800">Gerenciar Consultores</h3>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={handleNewConsultant} className="bg-primary hover:bg-blue-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Consultor
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>
                    {editingConsultant ? "Editar Consultor" : "Novo Consultor"}
                  </DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="code"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Código</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome Completo</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Senha</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <div className="flex space-x-3 pt-4">
                      <Button
                        type="submit"
                        className="flex-1 bg-primary hover:bg-blue-700"
                        disabled={createMutation.isPending || updateMutation.isPending}
                      >
                        {createMutation.isPending || updateMutation.isPending ? "Salvando..." : "Salvar"}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsDialogOpen(false)}
                      >
                        Cancelar
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>
        <div className="p-6">
          {/* Search */}
          <div className="mb-6">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Buscar consultores..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Consultants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredConsultants.length > 0 ? (
              filteredConsultants.map((consultant) => (
                <div key={consultant.id} className="bg-gray-50 p-6 rounded-lg border border-gray-200">
                  <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-primary text-white rounded-full flex items-center justify-center text-lg font-semibold">
                      {getInitials(consultant.name)}
                    </div>
                    <div className="flex-1">
                      <h4 className="text-lg font-semibold text-gray-900">{consultant.name}</h4>
                      <p className="text-sm text-gray-600">Código: {consultant.code}</p>
                      <p className="text-sm text-gray-600">Consultor ativo</p>
                    </div>
                  </div>
                  <div className="mt-4 flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => handleEdit(consultant)}
                      className="bg-primary hover:bg-blue-700 text-white"
                    >
                      <Edit className="h-3 w-3 mr-1" />
                      Editar
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-gray-700 hover:bg-gray-100"
                    >
                      <Eye className="h-3 w-3 mr-1" />
                      Ver Horas
                    </Button>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <p className="text-sm text-gray-500">
                  {searchTerm ? "Nenhum consultor encontrado" : "Nenhum consultor cadastrado"}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { 
  insertTimeEntrySchema, 
  type TimeEntryDetailed, 
  type InsertTimeEntry, 
  type Client, 
  type Consultant, 
  type Service,
  type Sector,
  type ServiceType,
  type Project
} from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Save, Edit, Trash2, Eye, EyeOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/App";

export default function TimeEntries() {
  const [calculatedHours, setCalculatedHours] = useState(0);
  const [calculatedValue, setCalculatedValue] = useState(0);
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [clientServices, setClientServices] = useState<Service[]>([]);
  const [clientProjects, setClientProjects] = useState<Project[]>([]);
  const [editingEntry, setEditingEntry] = useState<TimeEntryDetailed | null>(null);
  const [showFinancialValues, setShowFinancialValues] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const { data: timeEntries, isLoading: entriesLoading } = useQuery<TimeEntryDetailed[]>({
    queryKey: ["/api/time-entries"],
  });

  const { data: clients, isLoading: clientsLoading } = useQuery<Client[]>({
    queryKey: ["/api/clients"],
  });

  const { data: consultants, isLoading: consultantsLoading } = useQuery<Consultant[]>({
    queryKey: ["/api/consultants"],
  });

  const { data: sectors, isLoading: sectorsLoading } = useQuery<Sector[]>({
    queryKey: ["/api/sectors"],
  });

  const { data: serviceTypes, isLoading: serviceTypesLoading } = useQuery<ServiceType[]>({
    queryKey: ["/api/service-types"],
  });

  // Projects are loaded dynamically when client is selected
  // const { data: projects, isLoading: projectsLoading } = useQuery<Project[]>({
  //   queryKey: ["/api/projects"],
  // });

  // Find the current user's consultant ID
  const currentConsultant = consultants?.find(c => c.id === user?.id);
  const defaultConsultantId = currentConsultant?.id || 0;

  const form = useForm<InsertTimeEntry>({
    resolver: zodResolver(insertTimeEntrySchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      consultantId: defaultConsultantId,
      clientId: 0,
      serviceId: 0,
      sectorId: null,
      serviceTypeId: null,
      projectId: null,
      startTime: "00:00",
      endTime: "00:00",
      breakStartTime: "00:00",
      breakEndTime: "00:00",
      description: "",
      activityCompleted: "",
      deliveryForecast: "",
      actualDelivery: "",
      serviceLocation: "",
    },
  });

  // Update form when consultants data is loaded
  useEffect(() => {
    if (currentConsultant && !editingEntry) {
      form.setValue('consultantId', currentConsultant.id);
    }
  }, [currentConsultant, form, editingEntry]);

  // Check for editing activity from Activities page
  useEffect(() => {
    const editingActivityData = localStorage.getItem('editingActivity');
    if (editingActivityData && consultants && clients) {
      try {
        const activity = JSON.parse(editingActivityData);
        // Ensure we have all the necessary data before loading
        setTimeout(() => {
          handleEdit(activity);
        }, 100);
        // Clear the localStorage after loading
        localStorage.removeItem('editingActivity');
      } catch (error) {
        console.error('Error loading editing activity:', error);
        localStorage.removeItem('editingActivity');
      }
    }
  }, [consultants, clients]);

  const createMutation = useMutation({
    mutationFn: (data: InsertTimeEntry) => apiRequest("POST", "/api/time-entries", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      resetForm();
      toast({
        title: "Sucesso",
        description: "Lançamento de horas criado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao criar lançamento",
        variant: "destructive",
      });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<InsertTimeEntry> }) => 
      apiRequest("PUT", `/api/time-entries/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      resetForm();
      setEditingEntry(null);
      toast({
        title: "Sucesso",
        description: "Lançamento de horas atualizado com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao atualizar lançamento",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => apiRequest("DELETE", `/api/time-entries/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/time-entries"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/stats"] });
      toast({
        title: "Sucesso",
        description: "Lançamento de horas excluído com sucesso",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Erro",
        description: error.message || "Erro ao excluir lançamento",
        variant: "destructive",
      });
    },
  });

  // Helper function to reset form
  const resetForm = () => {
    form.reset({
      date: new Date().toISOString().split('T')[0],
      consultantId: defaultConsultantId,
      clientId: 0,
      serviceId: 0,
      sectorId: null,
      serviceTypeId: null,
      projectId: null,
      startTime: "00:00",
      endTime: "00:00",
      breakStartTime: "00:00",
      breakEndTime: "00:00",
      description: "",
      activityCompleted: "",
      deliveryForecast: "",
      actualDelivery: "",
      serviceLocation: "",
    });
    setCalculatedHours(0);
    setCalculatedValue(0);
    setSelectedService(null);
    setClientServices([]);
    setClientProjects([]);
    setEditingEntry(null);
  };

  // Function to load entry for editing
  const handleEdit = (entry: TimeEntryDetailed) => {
    setEditingEntry(entry);
    
    // Ensure date is in correct format (YYYY-MM-DD) to avoid timezone issues
    const correctDate = entry.date.includes('T') ? entry.date.split('T')[0] : entry.date;
    
    // Reset form with basic data first
    const formData = {
      date: correctDate,
      consultantId: entry.consultantId,
      clientId: entry.clientId,
      serviceId: 0, // Set to 0 initially, will be set after services load
      sectorId: entry.sectorId || null,
      serviceTypeId: entry.serviceTypeId || null,
      projectId: entry.projectId || null, // Include projectId in form data
      startTime: entry.startTime,
      endTime: entry.endTime,
      breakStartTime: entry.breakStartTime || "00:00",
      breakEndTime: entry.breakEndTime || "00:00",
      description: entry.description || "",
      activityCompleted: entry.activityCompleted || "",
      deliveryForecast: entry.deliveryForecast || "",
      actualDelivery: entry.actualDelivery || "",
      serviceLocation: entry.serviceLocation || "",
    };
    
    form.reset(formData);
    
    // Load client services and projects, then set values after they are loaded
    if (entry.clientId) {
      // Load services
      fetch(`/api/services/by-client/${entry.clientId}`)
        .then(res => res.json())
        .then(services => {
          setClientServices(services);
          // Set the service ID after services are loaded
          setTimeout(() => {
            form.setValue('serviceId', entry.serviceId);
            // Find and set the selected service
            const service = services.find((s: Service) => s.id === entry.serviceId);
            if (service) {
              setSelectedService(service);
            }
          }, 100);
        })
        .catch(() => {
          setClientServices([]);
        });

      // Load projects (only ANDAMENTO and PLANEJADO)
      fetch(`/api/projects/by-client/${entry.clientId}`)
        .then(res => res.json())
        .then(projects => {
          const filteredProjects = projects.filter((project: any) => 
            project.status === "ANDAMENTO" || project.status === "PLANEJADO"
          );
          setClientProjects(filteredProjects);
          
          // Set project ID only if the project is still eligible
          if (entry.projectId) {
            const isProjectEligible = filteredProjects.some((p: any) => p.id === entry.projectId);
            if (isProjectEligible) {
              setTimeout(() => {
                form.setValue('projectId', entry.projectId);
              }, 100);
            } else {
              // Clear project if it's no longer eligible
              form.setValue('projectId', null);
            }
          }
        })
        .catch(() => {
          setClientProjects([]);
        });
    }
    
    // Set calculated values if available
    if (entry.totalHours && entry.totalValue) {
      const hours = parseFloat(entry.totalHours);
      const value = parseFloat(entry.totalValue);
      setCalculatedHours(hours);
      setCalculatedValue(value);
    }
  };

  // Function to handle delete
  const handleDelete = (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir este lançamento?")) {
      deleteMutation.mutate(id);
    }
  };

  const watchedClientId = form.watch("clientId");
  const watchedStartTime = form.watch("startTime");
  const watchedEndTime = form.watch("endTime");
  const watchedBreakStartTime = form.watch("breakStartTime");
  const watchedBreakEndTime = form.watch("breakEndTime");
  const watchedServiceId = form.watch("serviceId");

  // Load services and projects when client changes
  useEffect(() => {
    if (watchedClientId) {
      // Load services
      fetch(`/api/services/by-client/${watchedClientId}`)
        .then(res => res.json())
        .then(services => {
          setClientServices(services);
          form.setValue("serviceId", 0);
          setSelectedService(null);
        })
        .catch(() => {
          setClientServices([]);
        });

      // Load projects (only ANDAMENTO and PLANEJADO)
      fetch(`/api/projects/by-client/${watchedClientId}`)
        .then(res => res.json())
        .then(projects => {
          const filteredProjects = projects.filter((project: any) => 
            project.status === "ANDAMENTO" || project.status === "PLANEJADO"
          );
          setClientProjects(filteredProjects);
          form.setValue("projectId", null);
        })
        .catch(() => {
          setClientProjects([]);
        });
    } else {
      setClientServices([]);
      setClientProjects([]);
      form.setValue("serviceId", 0);
      form.setValue("projectId", null);
      setSelectedService(null);
    }
  }, [watchedClientId, form]);

  // Update selected service when service changes
  useEffect(() => {
    if (watchedServiceId && clientServices.length > 0) {
      const service = clientServices.find(s => s.id === watchedServiceId);
      setSelectedService(service || null);
    } else {
      setSelectedService(null);
    }
  }, [watchedServiceId, clientServices]);

  // Calculate hours and value when times or service change
  useEffect(() => {
    if (watchedStartTime && watchedEndTime && selectedService) {
      const startParts = watchedStartTime.split(':');
      const endParts = watchedEndTime.split(':');
      
      if (startParts.length === 2 && endParts.length === 2) {
        const startMinutes = parseInt(startParts[0]) * 60 + parseInt(startParts[1]);
        const endMinutes = parseInt(endParts[0]) * 60 + parseInt(endParts[1]);
        
        if (endMinutes > startMinutes) {
          let totalMinutes = endMinutes - startMinutes;
          
          // Calculate break time if provided
          if (watchedBreakStartTime && watchedBreakEndTime) {
            const breakStartParts = watchedBreakStartTime.split(':');
            const breakEndParts = watchedBreakEndTime.split(':');
            
            if (breakStartParts.length === 2 && breakEndParts.length === 2) {
              const breakStartMinutes = parseInt(breakStartParts[0]) * 60 + parseInt(breakStartParts[1]);
              const breakEndMinutes = parseInt(breakEndParts[0]) * 60 + parseInt(breakEndParts[1]);
              
              if (breakEndMinutes > breakStartMinutes) {
                const breakDuration = breakEndMinutes - breakStartMinutes;
                totalMinutes = totalMinutes - breakDuration;
              }
            }
          }
          
          const hours = Math.max(0, totalMinutes / 60);
          const value = hours * parseFloat(selectedService.hourlyRate);
          
          setCalculatedHours(hours);
          setCalculatedValue(value);
        } else {
          setCalculatedHours(0);
          setCalculatedValue(0);
        }
      }
    } else {
      setCalculatedHours(0);
      setCalculatedValue(0);
    }
  }, [watchedStartTime, watchedEndTime, watchedBreakStartTime, watchedBreakEndTime, selectedService]);

  const onSubmit = (data: InsertTimeEntry) => {
    if (editingEntry) {
      updateMutation.mutate({ id: editingEntry.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const formatTime = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return `${h}:${m.toString().padStart(2, '0')}`;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  const getClientInitials = (name: string) => {
    return name.split(' ').map(word => word.charAt(0)).join('').substring(0, 2).toUpperCase();
  };

  if (entriesLoading || clientsLoading || consultantsLoading || sectorsLoading || serviceTypesLoading) {
    return (
      <Layout title="Lançamento de Horas">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="content-card">
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="h-10 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
          <div className="content-card">
            <div className="p-6">
              <div className="animate-pulse space-y-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-20 bg-gray-200 rounded"></div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Lançamento de Horas">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Form for new time entry */}
        <div className="content-card">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingEntry ? "Editar Lançamento de Horas" : "Novo Lançamento de Horas"}
                </h3>
                {editingEntry && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={resetForm}
                    className="mt-2 bg-[#ed6d6d]"
                  >
                    Cancelar Edição
                  </Button>
                )}
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setShowFinancialValues(!showFinancialValues)}
                className="flex items-center gap-2"
              >
                {showFinancialValues ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                {showFinancialValues ? "Ocultar Valores" : "Mostrar Valores"}
              </Button>
            </div>
          </div>
          <div className="p-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Data</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" tabIndex={1} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="consultantId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Consultor</FormLabel>
                        <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                          <FormControl>
                            <SelectTrigger tabIndex={2}>
                              <SelectValue placeholder="Selecione um consultor" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {consultants?.map((consultant) => (
                              <SelectItem key={consultant.id} value={consultant.id.toString()}>
                                {consultant.name}
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
                  name="clientId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cliente</FormLabel>
                      <Select onValueChange={(value) => field.onChange(parseInt(value))} value={field.value?.toString()}>
                        <FormControl>
                          <SelectTrigger tabIndex={3}>
                            <SelectValue placeholder="Selecione um cliente" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clients?.map((client) => (
                            <SelectItem key={client.id} value={client.id.toString()}>
                              {client.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Serviço</FormLabel>
                      <Select 
                        onValueChange={(value) => field.onChange(parseInt(value))} 
                        value={field.value?.toString()}
                        disabled={!watchedClientId}
                      >
                        <FormControl>
                          <SelectTrigger tabIndex={4}>
                            <SelectValue placeholder="Selecione um serviço" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {clientServices.map((service) => (
                            <SelectItem key={service.id} value={service.id.toString()}>
                              {service.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="sectorId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Setor (opcional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} value={field.value?.toString() || "none"}>
                        <FormControl>
                          <SelectTrigger tabIndex={5}>
                            <SelectValue placeholder="Selecione um setor (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem setor específico</SelectItem>
                          {sectors?.map((sector) => (
                            <SelectItem key={sector.id} value={sector.id.toString()}>
                              {sector.code} - {sector.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="serviceTypeId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo Atendimento (opcional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} value={field.value?.toString() || "none"}>
                        <FormControl>
                          <SelectTrigger tabIndex={6}>
                            <SelectValue placeholder="Selecione um tipo de atendimento (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem tipo específico</SelectItem>
                          {serviceTypes?.map((serviceType) => (
                            <SelectItem key={serviceType.id} value={serviceType.id.toString()}>
                              {serviceType.code} - {serviceType.description}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="projectId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Projeto (opcional)</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? null : parseInt(value))} value={field.value?.toString() || "none"}>
                        <FormControl>
                          <SelectTrigger tabIndex={7}>
                            <SelectValue placeholder="Selecione um projeto (opcional)" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">Sem projeto específico</SelectItem>
                          {clientProjects?.map((project) => (
                            <SelectItem key={project.id} value={project.id.toString()}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="startTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora Início</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" tabIndex={7} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="endTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Hora Fim</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" tabIndex={8} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="breakStartTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo Início (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" value={field.value || ""} tabIndex={8} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="breakEndTime"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Intervalo Fim (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="time" value={field.value || ""} tabIndex={9} />
                        </FormControl>
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
                      <FormLabel>Descrição das Atividades</FormLabel>
                      <FormControl>
                        <Textarea 
                          {...field} 
                          rows={3} 
                          placeholder="Descreva as atividades realizadas..."
                          value={field.value || ""}
                          onChange={field.onChange}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="serviceLocation"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Local Atendimento</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o local" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="presencial">Presencial</SelectItem>
                            <SelectItem value="remoto">Remoto</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="activityCompleted"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Atividade Concluída (opcional)</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione uma opção" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="sim">Sim</SelectItem>
                          <SelectItem value="nao">Não</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="deliveryForecast"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Previsão de Entrega (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="actualDelivery"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Entrega Realizada (opcional)</FormLabel>
                        <FormControl>
                          <Input {...field} type="date" value={field.value || ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium text-gray-700">Total de Horas:</span>
                    <span className="text-lg font-bold text-primary">
                      {formatTime(calculatedHours)}
                    </span>
                  </div>
                  {showFinancialValues && (
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-sm font-medium text-gray-700">Valor Total:</span>
                      <span className="text-lg font-bold text-green-600">
                        {formatCurrency(calculatedValue)}
                      </span>
                    </div>
                  )}
                </div>
                <Button 
                  type="submit" 
                  className="w-full bg-primary hover:bg-blue-700"
                  disabled={createMutation.isPending}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {createMutation.isPending ? "Salvando..." : "Salvar Lançamento"}
                </Button>
              </form>
            </Form>
          </div>
        </div>

        {/* Recent time entries */}
        <div className="content-card">
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800">Lançamentos Recentes</h3>
          </div>
          <div className="p-6">
            {timeEntries && timeEntries.length > 0 ? (
              <div className="space-y-4">
                {timeEntries.slice(0, 5).map((entry) => (
                  <div key={entry.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="bg-primary text-white px-2 py-1 rounded text-xs font-semibold">
                            {getClientInitials(entry.client.name)}
                          </span>
                          <span className="text-sm font-medium text-gray-900">{entry.client.name}</span>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{entry.service.description}</p>
                        <p className="text-xs text-gray-500">
                          {entry.consultant.name} • {new Date(entry.date).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-xs text-gray-500">
                          {entry.startTime} - {entry.endTime}
                          {entry.breakStartTime && entry.breakEndTime && ` (Intervalo: ${entry.breakStartTime} - ${entry.breakEndTime})`}
                          {` (${parseFloat(entry.totalHours).toFixed(1)}h)`}
                        </p>
                        {entry.project && (
                          <p className="text-xs text-blue-600 font-medium">
                            Projeto: {entry.project}
                          </p>
                        )}
                        {entry.serviceLocation && (
                          <p className="text-xs text-gray-500">
                            Local: {entry.serviceLocation === 'presencial' ? 'Presencial' : 'Remoto'}
                          </p>
                        )}
                        {entry.activityCompleted && (
                          <p className="text-xs text-green-600">
                            Atividade: {entry.activityCompleted === 'sim' ? 'Concluída' : 'Pendente'}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-600 mb-2">
                          {formatCurrency(parseFloat(entry.totalValue))}
                        </p>
                        <div className="flex flex-col gap-1">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-primary hover:text-blue-700 text-xs"
                            onClick={() => handleEdit(entry)}
                          >
                            <Edit className="h-3 w-3 mr-1" />
                            Editar
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="text-red-600 hover:text-red-700 text-xs"
                            onClick={() => handleDelete(entry.id)}
                          >
                            <Trash2 className="h-3 w-3 mr-1" />
                            Excluir
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500 text-center py-8">
                Nenhum lançamento encontrado
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}

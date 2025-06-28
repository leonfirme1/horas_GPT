import { 
  clients, 
  consultants, 
  services, 
  sectors,
  serviceTypes,
  timeEntries,
  projects,
  type Client, 
  type Consultant, 
  type Service, 
  type Sector,
  type ServiceType,
  type TimeEntry,
  type Project,
  type InsertClient, 
  type InsertConsultant, 
  type InsertService, 
  type InsertSector,
  type InsertServiceType,
  type InsertTimeEntry,
  type InsertProject,
  type ServiceWithClient,
  type SectorWithClient,
  type TimeEntryDetailed,
  type ProjectWithClient,
  type LoginData
} from "@shared/schema";
import { db } from "./db";
import { eq, and, gte, lte, sql } from "drizzle-orm";
import bcrypt from "bcrypt";

export interface IStorage {
  // Clients
  getClients(): Promise<Client[]>;
  getClient(id: number): Promise<Client | undefined>;
  getClientByCode(code: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  updateClient(id: number, client: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: number): Promise<boolean>;

  // Consultants
  getConsultants(): Promise<Consultant[]>;
  getConsultant(id: number): Promise<Consultant | undefined>;
  getConsultantByCode(code: string): Promise<Consultant | undefined>;
  createConsultant(consultant: InsertConsultant): Promise<Consultant>;
  updateConsultant(id: number, consultant: Partial<InsertConsultant>): Promise<Consultant | undefined>;
  deleteConsultant(id: number): Promise<boolean>;

  // Authentication
  authenticateConsultant(loginData: LoginData): Promise<Consultant | null>;

  // Services
  getServices(): Promise<ServiceWithClient[]>;
  getService(id: number): Promise<Service | undefined>;
  getServicesByClient(clientId: number): Promise<Service[]>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: number, service: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: number): Promise<boolean>;

  // Sectors
  getSectors(): Promise<SectorWithClient[]>;
  getSector(id: number): Promise<Sector | undefined>;
  getSectorsByClient(clientId: number): Promise<Sector[]>;
  createSector(sector: InsertSector): Promise<Sector>;
  updateSector(id: number, sector: Partial<InsertSector>): Promise<Sector | undefined>;
  deleteSector(id: number): Promise<boolean>;

  // Service Types
  getServiceTypes(): Promise<ServiceType[]>;
  getServiceType(id: number): Promise<ServiceType | undefined>;
  createServiceType(serviceType: InsertServiceType): Promise<ServiceType>;
  updateServiceType(id: number, serviceType: Partial<InsertServiceType>): Promise<ServiceType | undefined>;
  deleteServiceType(id: number): Promise<boolean>;

  // Projects
  getProjects(): Promise<ProjectWithClient[]>;
  getProject(id: number): Promise<Project | undefined>;
  getProjectsByClient(clientId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, project: Partial<InsertProject>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Time Entries
  getTimeEntries(): Promise<TimeEntryDetailed[]>;
  getTimeEntry(id: number): Promise<TimeEntry | undefined>;
  getTimeEntriesByDateRange(startDate: string, endDate: string): Promise<TimeEntryDetailed[]>;
  getTimeEntriesByClient(clientId: number): Promise<TimeEntryDetailed[]>;
  getTimeEntriesByConsultant(consultantId: number): Promise<TimeEntryDetailed[]>;
  createTimeEntry(timeEntry: InsertTimeEntry): Promise<TimeEntry>;
  updateTimeEntry(id: number, timeEntry: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined>;
  deleteTimeEntry(id: number): Promise<boolean>;

  // Dashboard stats
  getDashboardStats(month?: number, year?: number): Promise<{
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
  }>;

  // Reports
  getReportData(filters: {
    startDate?: string;
    endDate?: string;
    clientId?: number;
    consultantId?: number;
  }): Promise<{
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
  }>;
}

export class MemStorage implements IStorage {
  private clients: Map<number, Client>;
  private consultants: Map<number, Consultant>;
  private services: Map<number, Service>;
  private sectors: Map<number, Sector>;
  private serviceTypes: Map<number, ServiceType>;
  private timeEntries: Map<number, TimeEntry>;
  private currentClientId: number;
  private currentConsultantId: number;
  private currentServiceId: number;
  private currentSectorId: number;
  private currentServiceTypeId: number;
  private currentTimeEntryId: number;

  constructor() {
    this.clients = new Map();
    this.consultants = new Map();
    this.services = new Map();
    this.sectors = new Map();
    this.serviceTypes = new Map();
    this.timeEntries = new Map();
    this.currentClientId = 1;
    this.currentConsultantId = 1;
    this.currentServiceId = 1;
    this.currentSectorId = 1;
    this.currentServiceTypeId = 1;
    this.currentTimeEntryId = 1;

    // Add some sample data
    this.addSampleData();
  }

  // Clients
  async getClients(): Promise<Client[]> {
    return Array.from(this.clients.values());
  }

  async getClient(id: number): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientByCode(code: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(client => client.code === code);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const id = this.currentClientId++;
    const client: Client = { ...insertClient, id };
    this.clients.set(id, client);
    return client;
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;
    
    const updatedClient = { ...client, ...updateData };
    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: number): Promise<boolean> {
    return this.clients.delete(id);
  }

  // Consultants
  async getConsultants(): Promise<Consultant[]> {
    return Array.from(this.consultants.values());
  }

  async getConsultant(id: number): Promise<Consultant | undefined> {
    return this.consultants.get(id);
  }

  async getConsultantByCode(code: string): Promise<Consultant | undefined> {
    return Array.from(this.consultants.values()).find(consultant => consultant.code === code);
  }

  async createConsultant(insertConsultant: InsertConsultant): Promise<Consultant> {
    const id = this.currentConsultantId++;
    const consultant: Consultant = { ...insertConsultant, id };
    this.consultants.set(id, consultant);
    return consultant;
  }

  async updateConsultant(id: number, updateData: Partial<InsertConsultant>): Promise<Consultant | undefined> {
    const consultant = this.consultants.get(id);
    if (!consultant) return undefined;
    
    const updatedConsultant = { ...consultant, ...updateData };
    this.consultants.set(id, updatedConsultant);
    return updatedConsultant;
  }

  async deleteConsultant(id: number): Promise<boolean> {
    return this.consultants.delete(id);
  }

  // Services
  async getServices(): Promise<ServiceWithClient[]> {
    const servicesList = Array.from(this.services.values());
    const servicesWithClients: ServiceWithClient[] = [];
    
    for (const service of servicesList) {
      const client = this.clients.get(service.clientId);
      if (client) {
        servicesWithClients.push({ ...service, client });
      }
    }
    
    return servicesWithClients;
  }

  async getService(id: number): Promise<Service | undefined> {
    return this.services.get(id);
  }

  async getServicesByClient(clientId: number): Promise<Service[]> {
    return Array.from(this.services.values()).filter(service => service.clientId === clientId);
  }

  async createService(insertService: InsertService): Promise<Service> {
    const id = this.currentServiceId++;
    const service: Service = { 
      ...insertService, 
      id,
      hourlyRate: insertService.hourlyRate.toString()
    };
    this.services.set(id, service);
    return service;
  }

  async updateService(id: number, updateData: Partial<InsertService>): Promise<Service | undefined> {
    const service = this.services.get(id);
    if (!service) return undefined;
    
    const updatedService = { 
      ...service, 
      ...updateData,
      hourlyRate: updateData.hourlyRate ? updateData.hourlyRate.toString() : service.hourlyRate
    };
    this.services.set(id, updatedService);
    return updatedService;
  }

  async deleteService(id: number): Promise<boolean> {
    return this.services.delete(id);
  }

  // Sectors
  async getSectors(): Promise<SectorWithClient[]> {
    const sectorsList = Array.from(this.sectors.values());
    const sectorsWithClients: SectorWithClient[] = [];
    
    for (const sector of sectorsList) {
      const client = sector.clientId ? this.clients.get(sector.clientId) || null : null;
      sectorsWithClients.push({ ...sector, client });
    }
    
    return sectorsWithClients;
  }

  async getSector(id: number): Promise<Sector | undefined> {
    return this.sectors.get(id);
  }

  async getSectorsByClient(clientId: number): Promise<Sector[]> {
    return Array.from(this.sectors.values()).filter(sector => sector.clientId === clientId);
  }

  async createSector(insertSector: InsertSector): Promise<Sector> {
    const id = this.currentSectorId++;
    const sector: Sector = { 
      id,
      code: insertSector.code,
      description: insertSector.description,
      clientId: insertSector.clientId ?? null
    };
    this.sectors.set(id, sector);
    return sector;
  }

  async updateSector(id: number, updateData: Partial<InsertSector>): Promise<Sector | undefined> {
    const sector = this.sectors.get(id);
    if (!sector) return undefined;
    
    const updatedSector = { ...sector, ...updateData };
    this.sectors.set(id, updatedSector);
    return updatedSector;
  }

  async deleteSector(id: number): Promise<boolean> {
    return this.sectors.delete(id);
  }

  // Service Types operations
  async getServiceTypes(): Promise<ServiceType[]> {
    return Array.from(this.serviceTypes.values());
  }

  async getServiceType(id: number): Promise<ServiceType | undefined> {
    return this.serviceTypes.get(id);
  }

  async createServiceType(insertServiceType: InsertServiceType): Promise<ServiceType> {
    const id = this.currentServiceTypeId++;
    const serviceType: ServiceType = { 
      id,
      code: insertServiceType.code,
      description: insertServiceType.description
    };
    this.serviceTypes.set(id, serviceType);
    return serviceType;
  }

  async updateServiceType(id: number, updateData: Partial<InsertServiceType>): Promise<ServiceType | undefined> {
    const serviceType = this.serviceTypes.get(id);
    if (!serviceType) return undefined;
    
    const updatedServiceType = { ...serviceType, ...updateData };
    this.serviceTypes.set(id, updatedServiceType);
    return updatedServiceType;
  }

  async deleteServiceType(id: number): Promise<boolean> {
    return this.serviceTypes.delete(id);
  }

  private addSampleData() {
    // Sample clients
    this.clients.set(1, { id: 1, code: "CLI001", name: "SkyStoneBrasil", cnpj: "12.345.678/0001-90", email: "contato@skystone.com.br" });
    this.clients.set(2, { id: 2, code: "CLI002", name: "TechCorp", cnpj: "98.765.432/0001-10", email: "contato@techcorp.com" });
    this.clients.set(3, { id: 3, code: "CLI003", name: "InnovaSoft", cnpj: "11.222.333/0001-44", email: "contato@innovasoft.com" });
    this.clients.set(4, { id: 4, code: "CLI004", name: "DataFlow Solutions", cnpj: "55.666.777/0001-88", email: "contato@dataflow.com" });
    this.clients.set(5, { id: 5, code: "CLI005", name: "CloudTech", cnpj: "99.888.777/0001-66", email: "contato@cloudtech.com" });
    this.currentClientId = 6;

    // Sample consultants
    this.consultants.set(1, { id: 1, code: "CON001", name: "João Silva", password: "senha123" });
    this.consultants.set(2, { id: 2, code: "CON002", name: "Maria Santos", password: "senha123" });
    this.consultants.set(3, { id: 3, code: "LEON", name: "Leon T. Firme", password: "C@sull45" });
    this.currentConsultantId = 4;

    // Sample services
    this.services.set(1, { id: 1, code: "DEV001", description: "Desenvolvimento de Sistema ERP", clientId: 1, hourlyRate: "142" });
    this.services.set(2, { id: 2, code: "CONS001", description: "Consultoria em Processos", clientId: 1, hourlyRate: "142" });
    this.services.set(3, { id: 3, code: "SUP001", description: "Suporte Técnico", clientId: 2, hourlyRate: "120" });
    this.currentServiceId = 4;

    // Sample sectors
    this.sectors.set(1, { id: 1, code: "TI", description: "Tecnologia da Informação", clientId: 1 });
    this.sectors.set(2, { id: 2, code: "FIN", description: "Financeiro", clientId: 1 });
    this.sectors.set(3, { id: 3, code: "ADM", description: "Administrativo", clientId: null });
    this.currentSectorId = 4;

    // Sample service types
    this.serviceTypes.set(1, { id: 1, code: "CONS", description: "Consultoria" });
    this.serviceTypes.set(2, { id: 2, code: "IMPL", description: "Implementação" });
    this.serviceTypes.set(3, { id: 3, code: "SUPT", description: "Suporte Técnico" });
    this.serviceTypes.set(4, { id: 4, code: "TREI", description: "Treinamento" });
    this.currentServiceTypeId = 5;

    // Sample time entries
    this.timeEntries.set(1, {
      id: 1,
      date: "2024-12-01",
      consultantId: 3,
      clientId: 1,
      serviceId: 1,
      sectorId: 1,
      serviceTypeId: 1,
      projectId: null,
      startTime: "08:00",
      endTime: "17:00",
      breakStartTime: "12:00",
      breakEndTime: "13:00",
      description: "Desenvolvimento de funcionalidades do sistema ERP",
      activityCompleted: "Implementação completa do módulo de vendas",
      deliveryForecast: null,
      actualDelivery: null,
      serviceLocation: null,
      totalHours: "8.00",
      totalValue: "1136.00"
    });
    
    this.timeEntries.set(2, {
      id: 2,
      date: "2024-12-02",
      consultantId: 3,
      clientId: 1,
      serviceId: 2,
      sectorId: 2,
      serviceTypeId: 2,
      projectId: null,
      startTime: "09:00",
      endTime: "18:00",
      breakStartTime: "12:30",
      breakEndTime: "13:30",
      description: "Consultoria em processos financeiros",
      activityCompleted: "Revisão e otimização dos processos de faturamento",
      deliveryForecast: null,
      actualDelivery: null,
      serviceLocation: null,
      totalHours: "8.00",
      totalValue: "1136.00"
    });
    
    this.timeEntries.set(3, {
      id: 3,
      date: "2024-12-03",
      consultantId: 3,
      clientId: 1,
      serviceId: 1,
      sectorId: null,
      serviceTypeId: 3,
      projectId: null,
      startTime: "08:30",
      endTime: "16:30",
      breakStartTime: null,
      breakEndTime: null,
      description: "Manutenção preventiva do sistema",
      activityCompleted: "Sistema atualizado e funcionando perfeitamente",
      deliveryForecast: null,
      actualDelivery: null,
      serviceLocation: null,
      totalHours: "8.00",
      totalValue: "1136.00"
    });
    this.currentTimeEntryId = 4;
  }

  // Time Entries
  async getTimeEntries(): Promise<TimeEntryDetailed[]> {
    const entriesList = Array.from(this.timeEntries.values());
    const detailedEntries: TimeEntryDetailed[] = [];
    
    for (const entry of entriesList) {
      const consultant = this.consultants.get(entry.consultantId);
      const client = this.clients.get(entry.clientId);
      const service = this.services.get(entry.serviceId);
      
      if (consultant && client && service) {
        detailedEntries.push({ ...entry, consultant, client, service });
      }
    }
    
    return detailedEntries.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    return this.timeEntries.get(id);
  }

  async getTimeEntriesByDateRange(startDate: string, endDate: string): Promise<TimeEntryDetailed[]> {
    const allEntries = await this.getTimeEntries();
    return allEntries.filter(entry => entry.date >= startDate && entry.date <= endDate);
  }

  async getTimeEntriesByClient(clientId: number): Promise<TimeEntryDetailed[]> {
    const allEntries = await this.getTimeEntries();
    return allEntries.filter(entry => entry.clientId === clientId);
  }

  async getTimeEntriesByConsultant(consultantId: number): Promise<TimeEntryDetailed[]> {
    const allEntries = await this.getTimeEntries();
    return allEntries.filter(entry => entry.consultantId === consultantId);
  }

  private calculateHoursAndValue(
    startTime: string, 
    endTime: string, 
    hourlyRate: string, 
    breakStartTime?: string, 
    breakEndTime?: string
  ): { hours: number; value: number } {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    
    const startMinutes = startHour * 60 + startMin;
    const endMinutes = endHour * 60 + endMin;
    
    let totalMinutes = endMinutes - startMinutes;
    
    // Calculate break time if provided
    if (breakStartTime && breakEndTime) {
      const [breakStartHour, breakStartMin] = breakStartTime.split(':').map(Number);
      const [breakEndHour, breakEndMin] = breakEndTime.split(':').map(Number);
      
      const breakStartMinutes = breakStartHour * 60 + breakStartMin;
      const breakEndMinutes = breakEndHour * 60 + breakEndMin;
      
      const breakDuration = breakEndMinutes - breakStartMinutes;
      totalMinutes = totalMinutes - breakDuration;
    }
    
    const hours = Math.max(0, totalMinutes / 60);
    const value = hours * parseFloat(hourlyRate);
    
    return { hours, value };
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    const service = this.services.get(insertTimeEntry.serviceId);
    if (!service) throw new Error("Service not found");
    
    const { hours, value } = this.calculateHoursAndValue(
      insertTimeEntry.startTime, 
      insertTimeEntry.endTime, 
      service.hourlyRate,
      insertTimeEntry.breakStartTime || undefined,
      insertTimeEntry.breakEndTime || undefined
    );
    
    const id = this.currentTimeEntryId++;
    const timeEntry: TimeEntry = { 
      id,
      date: insertTimeEntry.date,
      consultantId: insertTimeEntry.consultantId,
      clientId: insertTimeEntry.clientId,
      serviceId: insertTimeEntry.serviceId,
      sectorId: insertTimeEntry.sectorId || null,
      serviceTypeId: insertTimeEntry.serviceTypeId || null,
      projectId: insertTimeEntry.projectId || null,
      startTime: insertTimeEntry.startTime,
      endTime: insertTimeEntry.endTime,
      description: insertTimeEntry.description || null,
      breakStartTime: insertTimeEntry.breakStartTime || null,
      breakEndTime: insertTimeEntry.breakEndTime || null,
      activityCompleted: insertTimeEntry.activityCompleted || null,
      deliveryForecast: insertTimeEntry.deliveryForecast || null,
      actualDelivery: insertTimeEntry.actualDelivery || null,
      serviceLocation: insertTimeEntry.serviceLocation || null,
      totalHours: hours.toString(),
      totalValue: value.toString()
    };
    this.timeEntries.set(id, timeEntry);
    return timeEntry;
  }

  async updateTimeEntry(id: number, updateData: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    const timeEntry = this.timeEntries.get(id);
    if (!timeEntry) return undefined;
    
    const updatedEntry = { ...timeEntry, ...updateData };
    
    // Recalculate if times or service changed
    if (updateData.startTime || updateData.endTime || updateData.serviceId) {
      const serviceId = updateData.serviceId || timeEntry.serviceId;
      const service = this.services.get(serviceId);
      if (!service) return undefined;
      
      const startTime = updateData.startTime || timeEntry.startTime;
      const endTime = updateData.endTime || timeEntry.endTime;
      
      const { hours, value } = this.calculateHoursAndValue(startTime, endTime, service.hourlyRate);
      updatedEntry.totalHours = hours.toString();
      updatedEntry.totalValue = value.toString();
    }
    
    this.timeEntries.set(id, updatedEntry);
    return updatedEntry;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    return this.timeEntries.delete(id);
  }

  // Dashboard stats
  async getDashboardStats(month?: number, year?: number): Promise<{
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
  }> {
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1);
    const monthStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;
    
    const monthlyEntries = Array.from(this.timeEntries.values())
      .filter(entry => entry.date.startsWith(monthStr));
    
    const monthlyHours = monthlyEntries.reduce((sum, entry) => sum + parseFloat(entry.totalHours), 0);
    const monthlyRevenue = monthlyEntries.reduce((sum, entry) => sum + parseFloat(entry.totalValue), 0);
    
    // Aggregate by consultant
    const consultantMap = new Map<number, { name: string; hours: number; value: number }>();
    monthlyEntries.forEach(entry => {
      const consultant = this.consultants.get(entry.consultantId);
      if (consultant) {
        const existing = consultantMap.get(entry.consultantId) || 
          { name: consultant.name, hours: 0, value: 0 };
        existing.hours += parseFloat(entry.totalHours);
        existing.value += parseFloat(entry.totalValue);
        consultantMap.set(entry.consultantId, existing);
      }
    });

    // Aggregate by client
    const clientMap = new Map<number, { name: string; hours: number; value: number }>();
    monthlyEntries.forEach(entry => {
      const client = this.clients.get(entry.clientId);
      if (client) {
        const existing = clientMap.get(entry.clientId) || 
          { name: client.name, hours: 0, value: 0 };
        existing.hours += parseFloat(entry.totalHours);
        existing.value += parseFloat(entry.totalValue);
        clientMap.set(entry.clientId, existing);
      }
    });

    const consultantStats = Array.from(consultantMap.entries()).map(([id, data]) => ({
      consultantId: id,
      consultantName: data.name,
      totalHours: data.hours,
      totalValue: data.value,
    }));

    const clientStats = Array.from(clientMap.entries()).map(([id, data]) => ({
      clientId: id,
      clientName: data.name,
      totalHours: data.hours,
      totalValue: data.value,
    }));
    
    return {
      totalClients: this.clients.size,
      monthlyHours,
      monthlyRevenue,
      activeConsultants: consultantMap.size,
      consultantStats,
      clientStats,
    };
  }

  // Reports
  async getReportData(filters: {
    startDate?: string;
    endDate?: string;
    clientId?: number;
    consultantId?: number;
  }): Promise<{
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
  }> {
    let filteredEntries = Array.from(this.timeEntries.values());
    
    if (filters.startDate) {
      filteredEntries = filteredEntries.filter(entry => entry.date >= filters.startDate!);
    }
    
    if (filters.endDate) {
      filteredEntries = filteredEntries.filter(entry => entry.date <= filters.endDate!);
    }
    
    if (filters.clientId) {
      filteredEntries = filteredEntries.filter(entry => entry.clientId === filters.clientId);
    }
    
    if (filters.consultantId) {
      filteredEntries = filteredEntries.filter(entry => entry.consultantId === filters.consultantId);
    }
    
    const totalHours = filteredEntries.reduce((sum, entry) => sum + parseFloat(entry.totalHours), 0);
    const totalValue = filteredEntries.reduce((sum, entry) => sum + parseFloat(entry.totalValue), 0);
    const totalEntries = filteredEntries.length;
    
    const clientIds = new Set(filteredEntries.map(entry => entry.clientId));
    const totalClients = clientIds.size;
    
    // Client breakdown
    const clientBreakdown: Array<{
      clientId: number;
      clientName: string;
      hours: number;
      value: number;
      entries: number;
    }> = [];
    
    clientIds.forEach(clientId => {
      const client = this.clients.get(clientId);
      if (!client) return;
      
      const clientEntries = filteredEntries.filter(entry => entry.clientId === clientId);
      const clientHours = clientEntries.reduce((sum, entry) => sum + parseFloat(entry.totalHours), 0);
      const clientValue = clientEntries.reduce((sum, entry) => sum + parseFloat(entry.totalValue), 0);
      
      clientBreakdown.push({
        clientId,
        clientName: client.name,
        hours: clientHours,
        value: clientValue,
        entries: clientEntries.length
      });
    });
    
    clientBreakdown.sort((a, b) => b.value - a.value);
    
    return {
      totalHours,
      totalValue,
      totalEntries,
      totalClients,
      clientBreakdown
    };
  }

  // Projects
  async getProjects(): Promise<ProjectWithClient[]> {
    const result = await db.select({
      id: projects.id,
      clientId: projects.clientId,
      name: projects.name,
      status: projects.status,
      plannedStartDate: projects.plannedStartDate,
      plannedEndDate: projects.plannedEndDate,
      actualStartDate: projects.actualStartDate,
      actualEndDate: projects.actualEndDate,
      plannedHours: projects.plannedHours,
      generalObservations: projects.generalObservations,
      description: projects.description,
      createdAt: projects.createdAt,
      client: {
        id: clients.id,
        code: clients.code,
        name: clients.name,
        cnpj: clients.cnpj,
        email: clients.email,
      }
    }).from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .orderBy(projects.id);

    return result.map(row => ({
      ...row,
      client: row.client!
    }));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByClient(clientId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const projectData = {
      ...insertProject,
      createdAt: new Date().toISOString().split('T')[0]
    };
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async updateProject(id: number, updateData: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db.update(projects).set(updateData).where(eq(projects.id, id)).returning();
    return project || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Authentication
  async authenticateConsultant(loginData: LoginData): Promise<Consultant | null> {
    const consultant = await this.getConsultantByCode(loginData.code);
    
    if (!consultant) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(loginData.password, consultant.password);
    
    if (!isValidPassword) {
      return null;
    }

    return consultant;
  }
}

export class DatabaseStorage implements IStorage {
  // Clients
  async getClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }

  async getClient(id: number): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client || undefined;
  }

  async getClientByCode(code: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.code, code));
    return client || undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db.insert(clients).values(insertClient).returning();
    return client;
  }

  async updateClient(id: number, updateData: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db.update(clients).set(updateData).where(eq(clients.id, id)).returning();
    return client || undefined;
  }

  async deleteClient(id: number): Promise<boolean> {
    const result = await db.delete(clients).where(eq(clients.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Consultants
  async getConsultants(): Promise<Consultant[]> {
    return await db.select().from(consultants);
  }

  async getConsultant(id: number): Promise<Consultant | undefined> {
    const [consultant] = await db.select().from(consultants).where(eq(consultants.id, id));
    return consultant || undefined;
  }

  async getConsultantByCode(code: string): Promise<Consultant | undefined> {
    const [consultant] = await db.select().from(consultants).where(eq(consultants.code, code));
    return consultant || undefined;
  }

  async createConsultant(insertConsultant: InsertConsultant): Promise<Consultant> {
    const hashedPassword = await bcrypt.hash(insertConsultant.password, 10);
    const consultantData = {
      ...insertConsultant,
      password: hashedPassword
    };
    const [consultant] = await db.insert(consultants).values(consultantData).returning();
    return consultant;
  }

  async updateConsultant(id: number, updateData: Partial<InsertConsultant>): Promise<Consultant | undefined> {
    const consultantData: any = { ...updateData };
    if (consultantData.password) {
      consultantData.password = await bcrypt.hash(consultantData.password, 10);
    }
    const [consultant] = await db.update(consultants).set(consultantData).where(eq(consultants.id, id)).returning();
    return consultant || undefined;
  }

  async deleteConsultant(id: number): Promise<boolean> {
    const result = await db.delete(consultants).where(eq(consultants.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Projects
  async getProjects(): Promise<ProjectWithClient[]> {
    const result = await db.select({
      id: projects.id,
      clientId: projects.clientId,
      name: projects.name,
      status: projects.status,
      plannedStartDate: projects.plannedStartDate,
      plannedEndDate: projects.plannedEndDate,
      actualStartDate: projects.actualStartDate,
      actualEndDate: projects.actualEndDate,
      plannedHours: projects.plannedHours,
      generalObservations: projects.generalObservations,
      description: projects.description,
      createdAt: projects.createdAt,
      client: {
        id: clients.id,
        code: clients.code,
        name: clients.name,
        cnpj: clients.cnpj,
        email: clients.email,
      }
    }).from(projects)
      .leftJoin(clients, eq(projects.clientId, clients.id))
      .orderBy(projects.id);

    return result.map(row => ({
      ...row,
      client: row.client!
    }));
  }

  async getProject(id: number): Promise<Project | undefined> {
    const [project] = await db.select().from(projects).where(eq(projects.id, id));
    return project || undefined;
  }

  async getProjectsByClient(clientId: number): Promise<Project[]> {
    return await db.select().from(projects).where(eq(projects.clientId, clientId));
  }

  async createProject(insertProject: InsertProject): Promise<Project> {
    const projectData = {
      ...insertProject,
      createdAt: new Date().toISOString().split('T')[0]
    };
    const [project] = await db.insert(projects).values(projectData).returning();
    return project;
  }

  async updateProject(id: number, updateData: Partial<InsertProject>): Promise<Project | undefined> {
    const [project] = await db.update(projects).set(updateData).where(eq(projects.id, id)).returning();
    return project || undefined;
  }

  async deleteProject(id: number): Promise<boolean> {
    const result = await db.delete(projects).where(eq(projects.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Authentication
  async authenticateConsultant(loginData: LoginData): Promise<Consultant | null> {
    const [consultant] = await db.select().from(consultants).where(eq(consultants.code, loginData.code));
    
    if (!consultant) {
      return null;
    }

    const isValidPassword = await bcrypt.compare(loginData.password, consultant.password);
    
    if (!isValidPassword) {
      return null;
    }

    return consultant;
  }

  // Services
  async getServices(): Promise<ServiceWithClient[]> {
    const result = await db.select().from(services).leftJoin(clients, eq(services.clientId, clients.id));
    return result.map((row) => ({
      ...row.services,
      client: row.clients!,
    }));
  }

  async getService(id: number): Promise<Service | undefined> {
    const [service] = await db.select().from(services).where(eq(services.id, id));
    return service || undefined;
  }

  async getServicesByClient(clientId: number): Promise<Service[]> {
    return await db.select().from(services).where(eq(services.clientId, clientId));
  }

  async createService(insertService: InsertService): Promise<Service> {
    const serviceData = {
      code: insertService.code,
      clientId: insertService.clientId,
      description: insertService.description,
      hourlyRate: insertService.hourlyRate.toString()
    };
    const [service] = await db.insert(services).values(serviceData).returning();
    return service;
  }

  async updateService(id: number, updateData: Partial<InsertService>): Promise<Service | undefined> {
    const serviceData: any = {};
    if (updateData.code !== undefined) serviceData.code = updateData.code;
    if (updateData.clientId !== undefined) serviceData.clientId = updateData.clientId;
    if (updateData.description !== undefined) serviceData.description = updateData.description;
    if (updateData.hourlyRate !== undefined) serviceData.hourlyRate = updateData.hourlyRate.toString();
    
    const [service] = await db.update(services).set(serviceData).where(eq(services.id, id)).returning();
    return service || undefined;
  }

  async deleteService(id: number): Promise<boolean> {
    const result = await db.delete(services).where(eq(services.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Sectors
  async getSectors(): Promise<SectorWithClient[]> {
    const result = await db
      .select()
      .from(sectors)
      .leftJoin(clients, eq(sectors.clientId, clients.id));

    return result.map((row) => ({
      ...row.sectors,
      client: row.clients || null,
    }));
  }

  async getSector(id: number): Promise<Sector | undefined> {
    console.log(`[STORAGE DEBUG] Getting sector with ID: ${id}`);
    const [sector] = await db.select().from(sectors).where(eq(sectors.id, id));
    console.log(`[STORAGE DEBUG] Found sector:`, sector);
    return sector || undefined;
  }

  async getSectorsByClient(clientId: number): Promise<Sector[]> {
    return await db.select().from(sectors).where(eq(sectors.clientId, clientId));
  }

  async createSector(insertSector: InsertSector): Promise<Sector> {
    const [sector] = await db.insert(sectors).values(insertSector).returning();
    return sector;
  }

  async updateSector(id: number, updateData: Partial<InsertSector>): Promise<Sector | undefined> {
    const [sector] = await db.update(sectors).set(updateData).where(eq(sectors.id, id)).returning();
    return sector || undefined;
  }

  async deleteSector(id: number): Promise<boolean> {
    const result = await db.delete(sectors).where(eq(sectors.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Service Types
  async getServiceTypes(): Promise<ServiceType[]> {
    return await db.select().from(serviceTypes);
  }

  async getServiceType(id: number): Promise<ServiceType | undefined> {
    const [serviceType] = await db.select().from(serviceTypes).where(eq(serviceTypes.id, id));
    return serviceType || undefined;
  }

  async createServiceType(insertServiceType: InsertServiceType): Promise<ServiceType> {
    const [serviceType] = await db
      .insert(serviceTypes)
      .values(insertServiceType)
      .returning();
    return serviceType;
  }

  async updateServiceType(id: number, updateData: Partial<InsertServiceType>): Promise<ServiceType | undefined> {
    const [serviceType] = await db
      .update(serviceTypes)
      .set(updateData)
      .where(eq(serviceTypes.id, id))
      .returning();
    return serviceType || undefined;
  }

  async deleteServiceType(id: number): Promise<boolean> {
    const result = await db.delete(serviceTypes).where(eq(serviceTypes.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  // Time Entries
  async getTimeEntries(): Promise<TimeEntryDetailed[]> {
    const result = await db
      .select()
      .from(timeEntries)
      .leftJoin(consultants, eq(timeEntries.consultantId, consultants.id))
      .leftJoin(clients, eq(timeEntries.clientId, clients.id))
      .leftJoin(services, eq(timeEntries.serviceId, services.id))
      .leftJoin(projects, eq(timeEntries.projectId, projects.id));

    return result.map((row) => ({
      ...row.time_entries,
      consultant: row.consultants!,
      client: row.clients!,
      service: row.services!,
      projectName: row.projects?.name || null,
    }));
  }

  async getTimeEntry(id: number): Promise<TimeEntry | undefined> {
    const [timeEntry] = await db.select().from(timeEntries).where(eq(timeEntries.id, id));
    return timeEntry || undefined;
  }

  async getTimeEntriesByDateRange(startDate: string, endDate: string): Promise<TimeEntryDetailed[]> {
    const result = await db
      .select()
      .from(timeEntries)
      .leftJoin(consultants, eq(timeEntries.consultantId, consultants.id))
      .leftJoin(clients, eq(timeEntries.clientId, clients.id))
      .leftJoin(services, eq(timeEntries.serviceId, services.id))
      .leftJoin(sectors, eq(timeEntries.sectorId, sectors.id))
      .leftJoin(projects, eq(timeEntries.projectId, projects.id))
      .where(and(gte(timeEntries.date, startDate), lte(timeEntries.date, endDate)));

    return result.map((row) => ({
      ...row.time_entries,
      consultant: row.consultants!,
      client: row.clients!,
      service: row.services!,
      sector: row.sectors || null,
      projectName: row.projects?.name || null,
    }));
  }

  async getTimeEntriesByClient(clientId: number): Promise<TimeEntryDetailed[]> {
    const result = await db
      .select()
      .from(timeEntries)
      .leftJoin(consultants, eq(timeEntries.consultantId, consultants.id))
      .leftJoin(clients, eq(timeEntries.clientId, clients.id))
      .leftJoin(services, eq(timeEntries.serviceId, services.id))
      .where(eq(timeEntries.clientId, clientId));

    return result.map((row) => ({
      ...row.time_entries,
      consultant: row.consultants!,
      client: row.clients!,
      service: row.services!,
    }));
  }

  async getTimeEntriesByConsultant(consultantId: number): Promise<TimeEntryDetailed[]> {
    const result = await db
      .select()
      .from(timeEntries)
      .leftJoin(consultants, eq(timeEntries.consultantId, consultants.id))
      .leftJoin(clients, eq(timeEntries.clientId, clients.id))
      .leftJoin(services, eq(timeEntries.serviceId, services.id))
      .where(eq(timeEntries.consultantId, consultantId));

    return result.map((row) => ({
      ...row.time_entries,
      consultant: row.consultants!,
      client: row.clients!,
      service: row.services!,
    }));
  }

  async createTimeEntry(insertTimeEntry: InsertTimeEntry): Promise<TimeEntry> {
    // Calculate hours and value
    const service = await this.getService(insertTimeEntry.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }

    const totalHours = this.calculateHours(
      insertTimeEntry.startTime,
      insertTimeEntry.endTime,
      insertTimeEntry.breakStartTime,
      insertTimeEntry.breakEndTime
    );

    const totalValue = totalHours * parseFloat(service.hourlyRate);

    const timeEntryWithCalc = {
      ...insertTimeEntry,
      totalHours: totalHours.toString(),
      totalValue: totalValue.toString(),
    };

    const [timeEntry] = await db.insert(timeEntries).values(timeEntryWithCalc).returning();
    return timeEntry;
  }

  async updateTimeEntry(id: number, updateData: Partial<InsertTimeEntry>): Promise<TimeEntry | undefined> {
    // Always check if we need to recalculate hours and values
    if (updateData.startTime || updateData.endTime || updateData.breakStartTime || updateData.breakEndTime || updateData.serviceId) {
      const existing = await this.getTimeEntry(id);
      if (!existing) return undefined;

      const serviceId = updateData.serviceId || existing.serviceId;
      const service = await this.getService(serviceId);
      if (!service) throw new Error("Service not found");

      const startTime = updateData.startTime || existing.startTime;
      const endTime = updateData.endTime || existing.endTime;
      const breakStartTime = updateData.breakStartTime || existing.breakStartTime;
      const breakEndTime = updateData.breakEndTime || existing.breakEndTime;

      const totalHours = this.calculateHours(startTime, endTime, breakStartTime, breakEndTime);
      const totalValue = totalHours * parseFloat(service.hourlyRate);

      const updatedData: any = {
        ...updateData,
        totalHours: totalHours.toString(),
        totalValue: totalValue.toString()
      };

      console.log(`[STORAGE DEBUG] Updating time entry ${id} with recalculation:`, updatedData);
      const [timeEntry] = await db.update(timeEntries).set(updatedData).where(eq(timeEntries.id, id)).returning();
      return timeEntry || undefined;
    }

    // For other field updates (like projectId), update directly
    console.log(`[STORAGE DEBUG] Updating time entry ${id} without recalculation:`, updateData);
    const [timeEntry] = await db.update(timeEntries).set(updateData).where(eq(timeEntries.id, id)).returning();
    return timeEntry || undefined;
  }

  async deleteTimeEntry(id: number): Promise<boolean> {
    const result = await db.delete(timeEntries).where(eq(timeEntries.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  private calculateHours(startTime: string, endTime: string, breakStartTime?: string | null, breakEndTime?: string | null): number {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    let workMinutes = end - start;

    if (breakStartTime && breakEndTime) {
      const breakStart = this.timeToMinutes(breakStartTime);
      const breakEnd = this.timeToMinutes(breakEndTime);
      workMinutes -= (breakEnd - breakStart);
    }

    return workMinutes / 60;
  }

  private timeToMinutes(time: string): number {
    const [hours, minutes] = time.split(':').map(Number);
    return hours * 60 + minutes;
  }

  // Dashboard stats
  async getDashboardStats(month?: number, year?: number): Promise<{
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
  }> {
    const targetYear = year || new Date().getFullYear();
    const targetMonth = month || (new Date().getMonth() + 1);
    const monthStr = `${targetYear}-${targetMonth.toString().padStart(2, '0')}`;
    
    const [clientsCount] = await db.select({ count: sql<number>`count(*)` }).from(clients);
    
    // Get all entries for the specified month with consultant and client data
    const monthlyEntries = await db
      .select({
        id: timeEntries.id,
        totalHours: timeEntries.totalHours,
        totalValue: timeEntries.totalValue,
        consultantId: timeEntries.consultantId,
        clientId: timeEntries.clientId,
        consultantName: consultants.name,
        clientName: clients.name,
      })
      .from(timeEntries)
      .leftJoin(consultants, eq(timeEntries.consultantId, consultants.id))
      .leftJoin(clients, eq(timeEntries.clientId, clients.id))
      .where(sql`${timeEntries.date} >= ${monthStr + '-01'} AND ${timeEntries.date} < ${monthStr + '-32'}`);

    const totalHours = monthlyEntries.reduce((sum, entry) => sum + parseFloat(entry.totalHours), 0);
    const totalValue = monthlyEntries.reduce((sum, entry) => sum + parseFloat(entry.totalValue), 0);

    // Aggregate by consultant
    const consultantMap = new Map<number, { name: string; hours: number; value: number }>();
    monthlyEntries.forEach(entry => {
      if (entry.consultantId && entry.consultantName) {
        const existing = consultantMap.get(entry.consultantId) || 
          { name: entry.consultantName, hours: 0, value: 0 };
        existing.hours += parseFloat(entry.totalHours);
        existing.value += parseFloat(entry.totalValue);
        consultantMap.set(entry.consultantId, existing);
      }
    });

    // Aggregate by client
    const clientMap = new Map<number, { name: string; hours: number; value: number }>();
    monthlyEntries.forEach(entry => {
      if (entry.clientId && entry.clientName) {
        const existing = clientMap.get(entry.clientId) || 
          { name: entry.clientName, hours: 0, value: 0 };
        existing.hours += parseFloat(entry.totalHours);
        existing.value += parseFloat(entry.totalValue);
        clientMap.set(entry.clientId, existing);
      }
    });

    const consultantStats = Array.from(consultantMap.entries()).map(([id, data]) => ({
      consultantId: id,
      consultantName: data.name,
      totalHours: data.hours,
      totalValue: data.value,
    }));

    const clientStats = Array.from(clientMap.entries()).map(([id, data]) => ({
      clientId: id,
      clientName: data.name,
      totalHours: data.hours,
      totalValue: data.value,
    }));

    return {
      totalClients: clientsCount.count,
      monthlyHours: totalHours,
      monthlyRevenue: totalValue,
      activeConsultants: consultantMap.size,
      consultantStats,
      clientStats,
    };
  }

  // Reports
  async getReportData(filters: {
    startDate?: string;
    endDate?: string;
    clientId?: number;
    consultantId?: number;
  }): Promise<{
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
  }> {
    const conditions = [];
    if (filters.startDate) conditions.push(gte(timeEntries.date, filters.startDate));
    if (filters.endDate) conditions.push(lte(timeEntries.date, filters.endDate));
    if (filters.clientId) conditions.push(eq(timeEntries.clientId, filters.clientId));
    if (filters.consultantId) conditions.push(eq(timeEntries.consultantId, filters.consultantId));
    
    let entries;
    const baseQuery = db.select().from(timeEntries).leftJoin(clients, eq(timeEntries.clientId, clients.id));
    
    if (conditions.length > 0) {
      entries = await baseQuery.where(and(...conditions));
    } else {
      entries = await baseQuery;
    }
    
    const totalHours = entries.reduce((sum, entry) => sum + parseFloat(entry.time_entries.totalHours), 0);
    const totalValue = entries.reduce((sum, entry) => sum + parseFloat(entry.time_entries.totalValue), 0);
    const totalEntries = entries.length;
    
    const uniqueClients = new Set(entries.map(entry => entry.time_entries.clientId));
    const totalClients = uniqueClients.size;
    
    const clientBreakdown = Array.from(uniqueClients).map(clientId => {
      const clientEntries = entries.filter(entry => entry.time_entries.clientId === clientId);
      const clientName = clientEntries[0]?.clients?.name || 'Unknown';
      const hours = clientEntries.reduce((sum, entry) => sum + parseFloat(entry.time_entries.totalHours), 0);
      const value = clientEntries.reduce((sum, entry) => sum + parseFloat(entry.time_entries.totalValue), 0);
      
      return {
        clientId,
        clientName,
        hours,
        value,
        entries: clientEntries.length,
      };
    });

    clientBreakdown.sort((a, b) => b.value - a.value);
    
    return {
      totalHours,
      totalValue,
      totalEntries,
      totalClients,
      clientBreakdown
    };
  }
}

export const storage = new DatabaseStorage();

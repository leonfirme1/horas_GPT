import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const clients = pgTable("clients", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  cnpj: text("cnpj").notNull().unique(),
  email: text("email").notNull(),
});

export const consultants = pgTable("consultants", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  description: text("description").notNull(),
  hourlyRate: decimal("hourly_rate", { precision: 10, scale: 2 }).notNull(),
});

export const sectors = pgTable("sectors", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  clientId: integer("client_id").references(() => clients.id), // nullable - can exist without client
  description: text("description").notNull(),
});

export const serviceTypes = pgTable("service_types", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  description: text("description").notNull(),
});

export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  clientId: integer("client_id").notNull().references(() => clients.id),
  name: text("name").notNull(),
  status: text("status").notNull(), // BACKLOG, PLANEJADO, ANDAMENTO, PARALISADO, CANCELADO, CONCLUIDO
  plannedStartDate: text("planned_start_date"), // YYYY-MM-DD format
  plannedEndDate: text("planned_end_date"), // YYYY-MM-DD format
  actualStartDate: text("actual_start_date"), // YYYY-MM-DD format
  actualEndDate: text("actual_end_date"), // YYYY-MM-DD format
  plannedHours: decimal("planned_hours", { precision: 8, scale: 2 }),
  generalObservations: text("general_observations"),
  description: text("description"),
  createdAt: text("created_at"),
});

export const timeEntries = pgTable("time_entries", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(), // YYYY-MM-DD format
  consultantId: integer("consultant_id").notNull().references(() => consultants.id),
  clientId: integer("client_id").notNull().references(() => clients.id),
  serviceId: integer("service_id").notNull().references(() => services.id),
  sectorId: integer("sector_id").references(() => sectors.id), // optional sector
  serviceTypeId: integer("service_type_id").references(() => serviceTypes.id), // optional service type
  projectId: integer("project_id").references(() => projects.id), // optional project
  startTime: text("start_time").notNull(), // HH:MM format
  endTime: text("end_time").notNull(), // HH:MM format
  breakStartTime: text("break_start_time"), // HH:MM format
  breakEndTime: text("break_end_time"), // HH:MM format
  description: text("description").default(""),
  totalHours: decimal("total_hours", { precision: 5, scale: 2 }).notNull(),
  totalValue: decimal("total_value", { precision: 10, scale: 2 }).notNull(),
  activityCompleted: text("activity_completed"), // "sim" or "nao"
  deliveryForecast: text("delivery_forecast"), // YYYY-MM-DD format
  actualDelivery: text("actual_delivery"), // YYYY-MM-DD format
  serviceLocation: text("service_location"), // "presencial" or "remoto"
});

// Insert schemas
export const insertClientSchema = createInsertSchema(clients).omit({
  id: true,
});

export const insertConsultantSchema = createInsertSchema(consultants).omit({
  id: true,
});

// Schema para login
export const loginSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  password: z.string().min(1, "Senha é obrigatória"),
});

// Schema para validação do backend (converte string para number)
export const insertServiceSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  clientId: z.number().min(1, "Cliente é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  hourlyRate: z.string().transform((val) => parseFloat(val)).refine((val) => val >= 0, "Valor deve ser maior que zero"),
});

// Schema para o formulário frontend (mantém string)
export const insertServiceFormSchema = z.object({
  code: z.string().min(1, "Código é obrigatório"),
  clientId: z.number().min(1, "Cliente é obrigatório"),
  description: z.string().min(1, "Descrição é obrigatória"),
  hourlyRate: z.string().min(1, "Valor por hora é obrigatório"),
});

export const insertSectorSchema = createInsertSchema(sectors).omit({
  id: true,
});

export const insertServiceTypeSchema = createInsertSchema(serviceTypes).omit({
  id: true,
});

export const insertTimeEntrySchema = createInsertSchema(timeEntries).omit({
  id: true,
  totalHours: true,
  totalValue: true,
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clients.$inferSelect;

export type InsertConsultant = z.infer<typeof insertConsultantSchema>;
export type Consultant = typeof consultants.$inferSelect;
export type LoginData = z.infer<typeof loginSchema>;

export type InsertService = z.infer<typeof insertServiceSchema>;
export type InsertServiceForm = z.infer<typeof insertServiceFormSchema>;
export type Service = typeof services.$inferSelect;

export type InsertSector = z.infer<typeof insertSectorSchema>;
export type Sector = typeof sectors.$inferSelect;

export type InsertServiceType = z.infer<typeof insertServiceTypeSchema>;
export type ServiceType = typeof serviceTypes.$inferSelect;

export type InsertTimeEntry = z.infer<typeof insertTimeEntrySchema>;
export type TimeEntry = typeof timeEntries.$inferSelect;

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projects.$inferSelect;

// Extended types for joined data
export type ProjectWithClient = Project & { client: Client };
export type ServiceWithClient = Service & { client: Client };
export type SectorWithClient = Sector & { client: Client | null };
export type TimeEntryDetailed = TimeEntry & {
  consultant: Consultant;
  client: Client;
  service: Service;
  sector?: Sector | null;
  project?: Project | null;
  projectName?: string | null;
};

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  services: many(services),
  sectors: many(sectors),
  timeEntries: many(timeEntries),
  projects: many(projects),
}));

export const consultantsRelations = relations(consultants, ({ many }) => ({
  timeEntries: many(timeEntries),
}));

export const servicesRelations = relations(services, ({ one, many }) => ({
  client: one(clients, {
    fields: [services.clientId],
    references: [clients.id],
  }),
  timeEntries: many(timeEntries),
}));

export const sectorsRelations = relations(sectors, ({ one }) => ({
  client: one(clients, {
    fields: [sectors.clientId],
    references: [clients.id],
  }),
}));

export const serviceTypesRelations = relations(serviceTypes, ({ many }) => ({
  timeEntries: many(timeEntries),
}));

export const timeEntriesRelations = relations(timeEntries, ({ one }) => ({
  consultant: one(consultants, {
    fields: [timeEntries.consultantId],
    references: [consultants.id],
  }),
  client: one(clients, {
    fields: [timeEntries.clientId],
    references: [clients.id],
  }),
  service: one(services, {
    fields: [timeEntries.serviceId],
    references: [services.id],
  }),
  sector: one(sectors, {
    fields: [timeEntries.sectorId],
    references: [sectors.id],
  }),
  serviceType: one(serviceTypes, {
    fields: [timeEntries.serviceTypeId],
    references: [serviceTypes.id],
  }),
  project: one(projects, {
    fields: [timeEntries.projectId],
    references: [projects.id],
  }),
}));

export const projectsRelations = relations(projects, ({ one }) => ({
  client: one(clients, {
    fields: [projects.clientId],
    references: [clients.id],
  }),
}));

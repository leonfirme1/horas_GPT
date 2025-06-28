import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { db } from "./db";
import { sectors as sectorsTable } from "@shared/schema";
import { eq } from "drizzle-orm";

// PDF generation function using simple text format
function generateReportPDF(data: any): Buffer {
  const { jsPDF } = require('jspdf');
  
  try {
    const doc = new jsPDF();
    
    // Set font
    doc.setFont('helvetica');
    
    // Title
    doc.setFontSize(16);
    doc.text(data.title || 'RELATÓRIO DE ATIVIDADES', 20, 20);
    
    // Filters info
    doc.setFontSize(12);
    doc.text(`Cliente: ${data.client || 'N/A'}`, 20, 35);
    doc.text(`Consultor: ${data.consultant || 'N/A'}`, 20, 45);
    doc.text(`Período: ${data.period || 'N/A'}`, 20, 55);
    
    let yPosition = 75;
    
    // Summary section
    if (data.summary) {
      doc.setFontSize(14);
      doc.text('RESUMO GERAL', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(11);
      doc.text(`Total de Horas: ${data.totalHours || 0}h`, 20, yPosition);
      doc.text(`Valor Total: R$ ${data.totalValue || '0.00'}`, 20, yPosition + 10);
      doc.text(`Total de Lançamentos: ${data.summary.totalEntries || 0}`, 20, yPosition + 20);
      doc.text(`Clientes Atendidos: ${data.summary.totalClients || 0}`, 20, yPosition + 30);
      
      yPosition += 50;
      
      // Client breakdown
      if (data.summary.clientBreakdown && data.summary.clientBreakdown.length > 0) {
        doc.setFontSize(14);
        doc.text('DETALHAMENTO POR CLIENTE', 20, yPosition);
        yPosition += 15;
        
        doc.setFontSize(10);
        data.summary.clientBreakdown.forEach((client: any) => {
          if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
          }
          
          doc.text(`${client.clientName}`, 20, yPosition);
          doc.text(`${parseFloat(client.hours || 0).toFixed(2)}h | R$ ${parseFloat(client.value || 0).toFixed(2)} | ${client.entries} lançamentos`, 25, yPosition + 8);
          yPosition += 20;
        });
        
        yPosition += 15;
      }
    }
    
    // Detailed entries
    if (data.entries && data.entries.length > 0) {
      if (yPosition > 200) {
        doc.addPage();
        yPosition = 20;
      }
      
      doc.setFontSize(14);
      doc.text('DETALHAMENTO DAS ATIVIDADES', 20, yPosition);
      yPosition += 15;
      
      doc.setFontSize(9);
      
      data.entries.forEach((entry: any, index: number) => {
        if (yPosition > 260) {
          doc.addPage();
          yPosition = 20;
        }
        
        doc.text(`${index + 1}. ${entry.date} - ${entry.client} - ${entry.consultant}`, 20, yPosition);
        doc.text(`Serviço: ${entry.service} | Projeto: ${entry.project || 'N/A'}`, 25, yPosition + 8);
        doc.text(`Horas: ${entry.hours}h | Valor: R$ ${entry.value} | Concluída: ${entry.completed}`, 25, yPosition + 16);
        
        // Split description into lines if too long
        const description = entry.description || 'Sem descrição';
        const lines = doc.splitTextToSize(description, 160);
        doc.text(`Descrição: ${lines[0]}`, 25, yPosition + 24);
        if (lines.length > 1) {
          doc.text(lines.slice(1), 25, yPosition + 32);
          yPosition += 8 * (lines.length - 1);
        }
        
        yPosition += 45;
      });
    }
    
    return Buffer.from(doc.output('arraybuffer'));
    
  } catch (error) {
    console.error('Error generating report PDF:', error);
    // Return a simple PDF with error message
    const doc = new (require('jspdf').jsPDF)();
    doc.text('Erro ao gerar PDF do relatório', 20, 20);
    doc.text(`Erro: ${(error as Error).message}`, 20, 35);
    return Buffer.from(doc.output('arraybuffer'));
  }
}

function generatePDFContent(data: any): Buffer {
  const content = generateInvoiceText(data);
  
  // Simple PDF-like content (this would be replaced with actual PDF generation using jsPDF)
  const pdfBuffer = Buffer.from(`
%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length ${content.length}
>>
stream
BT
/F1 12 Tf
72 720 Td
(${content.replace(/\n/g, ') Tj T* (')}) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000200 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
${300 + content.length}
%%EOF
  `);
  
  return pdfBuffer;
}

function generateInvoiceText(data: any): string {
  const { client, startDate, endDate, entries, groupedData, totalHours, totalValue, reportType } = data;
  
  return `
FATURA - ${client.name}
CNPJ: ${client.cnpj}
Email: ${client.email}

Período: ${new Date(startDate).toLocaleDateString('pt-BR')} a ${new Date(endDate).toLocaleDateString('pt-BR')}

${reportType === 'detailed' ? 
  'DETALHAMENTO POR ATIVIDADE:\n' + 
  entries.map((entry: any) => 
    `${new Date(entry.date).toLocaleDateString('pt-BR')} - ${entry.service.description} - ${entry.consultant.name} - ${calculateEntryHours(entry)}h - R$ ${calculateEntryValue(entry).toFixed(2)}\n${entry.description}`
  ).join('\n\n') :
  'RESUMO POR PROJETO:\n' +
  groupedData.map((group: any) =>
    `${group.project} (${group.sector} - ${group.serviceType}) - ${group.hours.toFixed(2)}h - R$ ${group.value.toFixed(2)}`
  ).join('\n')
}

TOTAIS:
Total de Horas: ${totalHours.toFixed(2)}h
Valor Total: R$ ${totalValue.toFixed(2)}
  `.trim();
}

function calculateEntryHours(entry: any): number {
  const start = new Date(`2000-01-01T${entry.startTime}`);
  const end = new Date(`2000-01-01T${entry.endTime}`);
  let hours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  
  if (entry.breakStartTime && entry.breakEndTime) {
    const breakStart = new Date(`2000-01-01T${entry.breakStartTime}`);
    const breakEnd = new Date(`2000-01-01T${entry.breakEndTime}`);
    const breakHours = (breakEnd.getTime() - breakStart.getTime()) / (1000 * 60 * 60);
    hours -= breakHours;
  }
  
  return hours;
}

function calculateEntryValue(entry: any): number {
  const hours = calculateEntryHours(entry);
  const hourlyRate = parseFloat(entry.service.hourlyRate) || 0;
  return hours * hourlyRate;
}
import { 
  insertClientSchema, 
  insertConsultantSchema, 
  insertServiceSchema, 
  insertSectorSchema,
  insertServiceTypeSchema,
  insertTimeEntrySchema,
  insertProjectSchema,
  loginSchema 
} from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Billing routes
  app.get("/api/time-entries/billing", async (req, res) => {
    try {
      const { clientId, startDate, endDate } = req.query;
      
      console.log("Billing request:", { clientId, startDate, endDate });
      
      if (!clientId || !startDate || !endDate) {
        return res.status(400).json({ message: "clientId, startDate, and endDate are required" });
      }

      const entries = await storage.getTimeEntriesByDateRange(
        startDate as string, 
        endDate as string
      );
      
      console.log(`Found ${entries.length} entries in date range`);

      const filteredEntries = entries.filter(entry => {
        const matchesClient = entry.client.id === parseInt(clientId as string);
        console.log(`Entry ${entry.id}: date ${entry.date}, client ${entry.client.id} vs ${clientId}, matches: ${matchesClient}`);
        return matchesClient;
      });
      
      console.log(`Filtered to ${filteredEntries.length} entries for client`);

      res.json(filteredEntries);
    } catch (error) {
      console.error("Error fetching billing entries:", error);
      res.status(500).json({ message: "Failed to fetch billing entries" });
    }
  });

  app.post("/api/billing/generate-pdf", async (req, res) => {
    try {
      const { clientId, startDate, endDate, entryIds, reportType } = req.body;
      
      if (!clientId || !startDate || !endDate || !entryIds?.length) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Get client info
      const client = await storage.getClient(clientId);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }

      // Get selected entries
      const allEntries = await storage.getTimeEntriesByDateRange(startDate, endDate);
      const selectedEntries = allEntries.filter(entry => 
        entryIds.includes(entry.id) && entry.client.id === clientId
      );

      if (selectedEntries.length === 0) {
        return res.status(400).json({ message: "No entries found" });
      }

      // Calculate totals
      const totalHours = selectedEntries.reduce((sum, entry) => sum + calculateEntryHours(entry), 0);
      const totalValue = selectedEntries.reduce((sum, entry) => sum + calculateEntryValue(entry), 0);

      // Group by project-sector-service type for synthetic report
      const groupedData = selectedEntries.reduce((groups, entry) => {
        const hours = calculateEntryHours(entry);
        const value = calculateEntryValue(entry);
        const sectorName = entry.sectorId ? `Setor ${entry.sectorId}` : 'Sem Setor';
        
        const existing = groups.find(g => 
          g.project === entry.service.description && 
          g.sector === sectorName && 
          g.serviceType === 'Padrão'
        );

        if (existing) {
          existing.hours += hours;
          existing.value += value;
          existing.entries += 1;
        } else {
          groups.push({
            project: entry.service.description,
            sector: sectorName,
            serviceType: 'Padrão',
            hours: hours,
            value: value,
            entries: 1,
          });
        }
        return groups;
      }, [] as any[]);

      // Generate PDF content based on report type
      const pdfContent = generatePDFContent({
        client,
        startDate,
        endDate,
        entries: selectedEntries,
        groupedData,
        totalHours,
        totalValue,
        reportType,
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="fatura-${client.name}-${startDate}-${endDate}.pdf"`);
      res.send(pdfContent);
    } catch (error) {
      console.error("Error generating PDF:", error);
      res.status(500).json({ message: "Failed to generate PDF" });
    }
  });
  // Authentication routes
  app.post("/api/login", async (req, res) => {
    try {
      const validatedData = loginSchema.parse(req.body);
      const consultant = await storage.authenticateConsultant(validatedData);
      
      if (!consultant) {
        return res.status(401).json({ message: "Código ou senha inválidos" });
      }

      // Remove password from response
      const { password, ...consultantData } = consultant;
      res.json({ consultant: consultantData, message: "Login realizado com sucesso" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Dados inválidos", errors: error.errors });
      } else {
        console.error("Login error:", error);
        res.status(500).json({ message: "Erro interno do servidor" });
      }
    }
  });

  // Clients routes
  app.get("/api/clients", async (req, res) => {
    try {
      const clients = await storage.getClients();
      res.json(clients);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch clients" });
    }
  });

  app.get("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const client = await storage.getClient(id);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch client" });
    }
  });

  app.post("/api/clients", async (req, res) => {
    try {
      const validatedData = insertClientSchema.parse(req.body);
      
      // Check if code already exists
      const existingByCode = await storage.getClientByCode(validatedData.code);
      if (existingByCode) {
        return res.status(400).json({ message: "Client code already exists" });
      }
      
      const client = await storage.createClient(validatedData);
      res.status(201).json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create client" });
      }
    }
  });

  app.put("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertClientSchema.partial().parse(req.body);
      
      const client = await storage.updateClient(id, validatedData);
      if (!client) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.json(client);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update client" });
      }
    }
  });

  app.delete("/api/clients/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteClient(id);
      if (!deleted) {
        return res.status(404).json({ message: "Client not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete client" });
    }
  });

  // Consultants routes
  app.get("/api/consultants", async (req, res) => {
    try {
      const consultants = await storage.getConsultants();
      res.json(consultants);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch consultants" });
    }
  });

  app.post("/api/consultants", async (req, res) => {
    try {
      const validatedData = insertConsultantSchema.parse(req.body);
      
      // Check if code already exists
      const existingByCode = await storage.getConsultantByCode(validatedData.code);
      if (existingByCode) {
        return res.status(400).json({ message: "Consultant code already exists" });
      }
      
      const consultant = await storage.createConsultant(validatedData);
      res.status(201).json(consultant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create consultant" });
      }
    }
  });

  app.put("/api/consultants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertConsultantSchema.partial().parse(req.body);
      
      const consultant = await storage.updateConsultant(id, validatedData);
      if (!consultant) {
        return res.status(404).json({ message: "Consultant not found" });
      }
      res.json(consultant);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update consultant" });
      }
    }
  });

  app.delete("/api/consultants/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteConsultant(id);
      if (!deleted) {
        return res.status(404).json({ message: "Consultant not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete consultant" });
    }
  });

  // Services routes
  app.get("/api/services", async (req, res) => {
    try {
      const services = await storage.getServices();
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.get("/api/services/by-client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const services = await storage.getServicesByClient(clientId);
      res.json(services);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch services" });
    }
  });

  app.post("/api/services", async (req, res) => {
    try {
      const validatedData = insertServiceSchema.parse(req.body);
      const service = await storage.createService(validatedData);
      res.status(201).json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create service" });
      }
    }
  });

  app.put("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceSchema.partial().parse(req.body);
      
      const service = await storage.updateService(id, validatedData);
      if (!service) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.json(service);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update service" });
      }
    }
  });

  app.delete("/api/services/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteService(id);
      if (!deleted) {
        return res.status(404).json({ message: "Service not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service" });
    }
  });

  // Sectors routes
  app.get("/api/sectors", async (req, res) => {
    try {
      const sectors = await storage.getSectors();
      res.json(sectors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sectors" });
    }
  });

  app.get("/api/sectors/by-client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const sectors = await storage.getSectorsByClient(clientId);
      res.json(sectors);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch sectors by client" });
    }
  });

  // Get sector by ID - MUST come after /by-client route
  app.get("/api/sectors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid sector ID" });
      }
      console.log(`Getting sector with ID: ${id}`);
      const sector = await storage.getSector(id);
      console.log(`Found sector:`, sector);
      if (!sector) {
        return res.status(404).json({ message: "Sector not found" });
      }
      res.json(sector);
    } catch (error) {
      console.error("Error fetching sector:", error);
      res.status(500).json({ message: "Failed to fetch sector" });
    }
  });

  app.post("/api/sectors", async (req, res) => {
    try {
      const validatedData = insertSectorSchema.parse(req.body);
      const sector = await storage.createSector(validatedData);
      res.status(201).json(sector);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create sector" });
      }
    }
  });

  app.put("/api/sectors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertSectorSchema.partial().parse(req.body);
      
      const sector = await storage.updateSector(id, validatedData);
      if (!sector) {
        return res.status(404).json({ message: "Sector not found" });
      }
      res.json(sector);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update sector" });
      }
    }
  });

  app.delete("/api/sectors/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteSector(id);
      if (!deleted) {
        return res.status(404).json({ message: "Sector not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete sector" });
    }
  });

  // Service Types routes
  app.get("/api/service-types", async (req, res) => {
    try {
      const serviceTypes = await storage.getServiceTypes();
      res.json(serviceTypes);
    } catch (error) {
      console.error("Error fetching service types:", error);
      res.status(500).json({ message: "Failed to fetch service types" });
    }
  });

  app.post("/api/service-types", async (req, res) => {
    try {
      const validatedData = insertServiceTypeSchema.parse(req.body);
      const serviceType = await storage.createServiceType(validatedData);
      res.status(201).json(serviceType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        console.error("Error creating service type:", error);
        res.status(500).json({ message: "Failed to create service type" });
      }
    }
  });

  app.put("/api/service-types/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertServiceTypeSchema.partial().parse(req.body);
      
      const serviceType = await storage.updateServiceType(id, validatedData);
      if (!serviceType) {
        return res.status(404).json({ message: "Service type not found" });
      }
      res.json(serviceType);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update service type" });
      }
    }
  });

  app.delete("/api/service-types/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteServiceType(id);
      if (!deleted) {
        return res.status(404).json({ message: "Service type not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete service type" });
    }
  });

  // Time entries routes
  app.get("/api/time-entries", async (req, res) => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      
      if (month && year) {
        const startDate = `${year}-${month.toString().padStart(2, '0')}-01`;
        const endDate = `${year}-${month.toString().padStart(2, '0')}-31`;
        const timeEntries = await storage.getTimeEntriesByDateRange(startDate, endDate);
        res.json(timeEntries);
      } else {
        const timeEntries = await storage.getTimeEntries();
        res.json(timeEntries);
      }
    } catch (error) {
      console.error("Error fetching time entries:", error);
      res.status(500).json({ message: "Failed to fetch time entries" });
    }
  });

  app.get("/api/time-entries/filtered", async (req, res) => {
    try {
      const { startDate, endDate, clientId, consultantId } = req.query;
      
      let timeEntries: any[];
      
      if (startDate && endDate) {
        timeEntries = await storage.getTimeEntriesByDateRange(startDate as string, endDate as string);
      } else {
        timeEntries = await storage.getTimeEntries();
      }
      
      // Apply additional filters
      if (clientId) {
        timeEntries = timeEntries.filter(entry => entry.clientId === parseInt(clientId as string));
      }
      
      if (consultantId) {
        timeEntries = timeEntries.filter(entry => entry.consultantId === parseInt(consultantId as string));
      }
      
      res.json(timeEntries);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch filtered time entries" });
    }
  });

  app.post("/api/time-entries", async (req, res) => {
    try {
      const validatedData = insertTimeEntrySchema.parse(req.body);
      const timeEntry = await storage.createTimeEntry(validatedData);
      res.status(201).json(timeEntry);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create time entry" });
      }
    }
  });

  app.put("/api/time-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      console.log(`[API DEBUG] Updating time entry ${id} with data:`, req.body);
      
      const validatedData = insertTimeEntrySchema.partial().parse(req.body);
      console.log(`[API DEBUG] Validated data:`, validatedData);
      
      const timeEntry = await storage.updateTimeEntry(id, validatedData);
      if (!timeEntry) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      
      console.log(`[API DEBUG] Updated time entry result:`, timeEntry);
      res.json(timeEntry);
    } catch (error) {
      console.error(`[API DEBUG] Error updating time entry ${req.params.id}:`, error);
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update time entry" });
      }
    }
  });

  app.delete("/api/time-entries/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteTimeEntry(id);
      if (!deleted) {
        return res.status(404).json({ message: "Time entry not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete time entry" });
    }
  });

  // Time entries filtered endpoint for analytics with complete sector info
  app.get("/api/time-entries/filtered", async (req, res) => {
    try {
      const { startDate, endDate, clientId, consultantId } = req.query;
      
      // Get time entries in date range
      let timeEntries = await storage.getTimeEntriesByDateRange(
        startDate as string || '1900-01-01',
        endDate as string || '2100-12-31'
      );
      
      // Filter by client and consultant if specified
      if (clientId && clientId !== 'all') {
        timeEntries = timeEntries.filter(entry => entry.clientId === parseInt(clientId as string));
      }
      
      if (consultantId && consultantId !== 'all') {
        timeEntries = timeEntries.filter(entry => entry.consultantId === parseInt(consultantId as string));
      }
      
      res.json(timeEntries);
    } catch (error) {
      console.error("Error fetching filtered time entries:", error);
      res.status(500).json({ message: "Failed to fetch filtered time entries" });
    }
  });

  // Projects routes
  app.get("/api/projects", async (req, res) => {
    try {
      const projects = await storage.getProjects();
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects" });
    }
  });

  app.get("/api/projects/by-client/:clientId", async (req, res) => {
    try {
      const clientId = parseInt(req.params.clientId);
      const projects = await storage.getProjectsByClient(clientId);
      res.json(projects);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch projects by client" });
    }
  });

  app.get("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const project = await storage.getProject(id);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch project" });
    }
  });

  app.post("/api/projects", async (req, res) => {
    try {
      const validatedData = insertProjectSchema.parse(req.body);
      const project = await storage.createProject(validatedData);
      res.status(201).json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to create project" });
      }
    }
  });

  app.put("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const validatedData = insertProjectSchema.partial().parse(req.body);
      const project = await storage.updateProject(id, validatedData);
      if (!project) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.json(project);
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid data", errors: error.errors });
      } else {
        res.status(500).json({ message: "Failed to update project" });
      }
    }
  });

  app.delete("/api/projects/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProject(id);
      if (!deleted) {
        return res.status(404).json({ message: "Project not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete project" });
    }
  });

  // Dashboard stats
  app.get("/api/dashboard/stats", async (req, res) => {
    try {
      const month = req.query.month ? parseInt(req.query.month as string) : undefined;
      const year = req.query.year ? parseInt(req.query.year as string) : undefined;
      const stats = await storage.getDashboardStats(month, year);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch dashboard stats" });
    }
  });

  // Reports routes
  app.get("/api/reports/data", async (req, res) => {
    try {
      const { startDate, endDate, clientId, consultantId } = req.query;
      
      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        clientId: clientId ? parseInt(clientId as string) : undefined,
        consultantId: consultantId ? parseInt(consultantId as string) : undefined,
      };
      
      const reportData = await storage.getReportData(filters);
      res.json(reportData);
    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Failed to generate report" });
    }
  });

  // Export CSV route
  app.get("/api/reports/export", async (req, res) => {
    try {
      const { startDate, endDate, clientId, consultantId } = req.query;
      
      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        clientId: clientId ? parseInt(clientId as string) : undefined,
        consultantId: consultantId ? parseInt(consultantId as string) : undefined,
      };
      
      // Get time entries data for export
      const timeEntries = await storage.getTimeEntriesByDateRange(
        filters.startDate || '1900-01-01',
        filters.endDate || '2100-12-31'
      );
      
      // Filter by client and consultant if specified
      const filteredEntries = timeEntries.filter(entry => {
        if (filters.clientId && entry.clientId !== filters.clientId) return false;
        if (filters.consultantId && entry.consultantId !== filters.consultantId) return false;
        return true;
      });

      // Generate CSV content with semicolon separator
      const csvHeader = 'Data;Cliente;Consultor;Serviço;Projeto;Descrição;Início;Fim;Pausa Início;Pausa Fim;Horas Totais;Valor Total;Atividade Concluída;Local\n';
      
      const csvRows = filteredEntries.map(entry => {
        const date = new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR');
        const fields = [
          date,
          entry.client.name,
          entry.consultant.name,
          entry.service.description,
          entry.project || '',
          `"${(entry.description || '').replace(/"/g, '""')}"`, // Escape quotes
          entry.startTime,
          entry.endTime,
          entry.breakStartTime || '',
          entry.breakEndTime || '',
          entry.totalHours,
          entry.totalValue,
          entry.activityCompleted === 'sim' ? 'Sim' : 'Não',
          entry.serviceLocation
        ];
        return fields.join(';');
      }).join('\n');

      const csvContent = csvHeader + csvRows;
      const filename = `relatorio_atividades_${Date.now()}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', Buffer.byteLength(csvContent, 'utf8').toString());
      
      // Add BOM for proper UTF-8 encoding in Excel
      res.write('\ufeff');
      res.end(csvContent);
    } catch (error) {
      console.error("Error exporting CSV:", error);
      res.status(500).json({ message: "Failed to export CSV" });
    }
  });

  // Export PDF route
  app.get("/api/reports/pdf", async (req, res) => {
    try {
      const { startDate, endDate, clientId, consultantId } = req.query;
      
      const filters = {
        startDate: startDate as string,
        endDate: endDate as string,
        clientId: clientId ? parseInt(clientId as string) : undefined,
        consultantId: consultantId ? parseInt(consultantId as string) : undefined,
      };
      
      // Get report data
      const reportData = await storage.getReportData(filters);
      
      // Get time entries data for detailed PDF
      const timeEntries = await storage.getTimeEntriesByDateRange(
        filters.startDate || '1900-01-01',
        filters.endDate || '2100-12-31'
      );
      
      // Filter by client and consultant if specified
      const filteredEntries = timeEntries.filter(entry => {
        if (filters.clientId && entry.clientId !== filters.clientId) return false;
        if (filters.consultantId && entry.consultantId !== filters.consultantId) return false;
        return true;
      });

      // Get client name for title
      const clientName = filters.clientId ? 
        (await storage.getClient(filters.clientId))?.name || 'Cliente não encontrado' :
        'Todos os clientes';
      
      const consultantName = filters.consultantId ?
        (await storage.getConsultant(filters.consultantId))?.name || 'Consultor não encontrado' :
        'Todos os consultores';

      const pdfData = {
        type: 'report',
        title: 'Relatório de Atividades',
        client: clientName,
        consultant: consultantName,
        period: `${filters.startDate ? new Date(filters.startDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Início'} a ${filters.endDate ? new Date(filters.endDate + 'T00:00:00').toLocaleDateString('pt-BR') : 'Fim'}`,
        summary: reportData,
        entries: filteredEntries.map(entry => ({
          date: new Date(entry.date + 'T00:00:00').toLocaleDateString('pt-BR'),
          client: entry.client.name,
          consultant: entry.consultant.name,
          service: entry.service.description,
          project: entry.project || '',
          description: entry.description,
          hours: entry.totalHours,
          value: entry.totalValue,
          completed: entry.activityCompleted === 'sim' ? 'Sim' : 'Não'
        })),
        totalHours: reportData.totalHours?.toFixed(2) || '0.00',
        totalValue: reportData.totalValue?.toFixed(2) || '0.00'
      };

      console.log('Generating PDF report with data:', JSON.stringify(pdfData, null, 2));
      
      const pdfBuffer = generateReportPDF(pdfData);
      
      if (!pdfBuffer || pdfBuffer.length === 0) {
        return res.status(500).json({ message: 'Erro ao gerar PDF: buffer vazio' });
      }
      
      const filename = `relatorio_${Date.now()}.pdf`;
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.setHeader('Content-Length', pdfBuffer.length.toString());
      res.send(pdfBuffer);
    } catch (error) {
      console.error("Error exporting PDF:", error);
      res.status(500).json({ message: "Failed to export PDF" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}

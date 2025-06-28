# Replit.md - Gestão de Horas (Time Management System)

## Overview

This is a full-stack time management application built with a modern React frontend and Express backend. The system allows consultants to track time entries for different clients and services, with comprehensive management features for clients, services, consultants, sectors, and service types.

## System Architecture

### Frontend Architecture
- **Framework**: React 18 with TypeScript
- **Build Tool**: Vite for fast development and optimized builds
- **UI Library**: Shadcn/ui components with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query (React Query) for server state
- **Routing**: Wouter for lightweight client-side routing
- **Forms**: React Hook Form with Zod validation

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ES modules
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: bcrypt for password hashing
- **Session Management**: Built-in session handling

## Key Components

### Database Layer
- **ORM**: Drizzle ORM with PostgreSQL dialect
- **Schema Location**: `shared/schema.ts` - centralized schema definitions
- **Database Provider**: Neon serverless PostgreSQL
- **Migrations**: Managed through Drizzle Kit

### Data Models
- **Clients**: Company information with CNPJ and contact details
- **Consultants**: User accounts with authentication
- **Services**: Billable services linked to clients with hourly rates
- **Sectors**: Optional categorization for services
- **Service Types**: Classification of service types
- **Time Entries**: Core entity tracking consultant work hours

### API Structure
- **RESTful endpoints**: `/api/*` prefix for all backend routes
- **CRUD operations**: Full create, read, update, delete for all entities
- **Authentication**: Login endpoint with session management
- **Filtering**: Advanced filtering for time entries and reports

### Frontend Pages
- **Dashboard**: Overview with statistics and charts
- **Time Entries**: Main form for logging work hours
- **Activities**: Management view for existing time entries
- **Reports**: Comprehensive data analysis with filtering, CSV export, and PDF export functionality
- **Master Data**: CRUD interfaces for clients, services, consultants, sectors, service types

## Data Flow

1. **Authentication**: Users log in with consultant code and password
2. **Time Entry Creation**: Consultants select client, service, and log hours
3. **Data Validation**: Both client and server-side validation using Zod schemas
4. **Storage**: Data persisted to PostgreSQL via Drizzle ORM
5. **Real-time Updates**: UI updates immediately via React Query cache invalidation

## External Dependencies

### Production Dependencies
- **Database**: @neondatabase/serverless for PostgreSQL connection
- **UI Components**: Extensive Radix UI component library
- **Validation**: Zod for schema validation
- **Query Management**: TanStack React Query
- **Authentication**: bcrypt for password security

### Development Dependencies
- **TypeScript**: Strong typing throughout the application
- **ESBuild**: Fast bundling for production builds
- **Vite Plugins**: Development enhancements and error handling
- **Tailwind CSS**: Utility-first styling

## Deployment Strategy

### Development
- **Command**: `npm run dev`
- **Port**: 5000 (configured in .replit)
- **Hot Reload**: Vite HMR for frontend, tsx watch for backend

### Production Build
- **Frontend**: Vite build to `dist/public`
- **Backend**: ESBuild bundle to `dist/index.js`
- **Start Command**: `npm run start`

### Environment Setup
- **PostgreSQL**: Configured via DATABASE_URL environment variable
- **Modules**: Node.js 20, Web, PostgreSQL 16
- **Deployment**: Replit autoscale deployment target

## Changelog

```
Changelog:
- June 27, 2025. Projects module fully integrated with time entries - project field added to time entry form, projects filtered by client and status (only ANDAMENTO/PLANEJADO shown), project display shows name only without status
- June 26, 2025. Enhanced Analytics Service Type chart - now displays CODE field from service_types table, includes explanatory legend showing CODE - DESCRIPTION mapping, and displays values inside each bar for better readability
- June 26, 2025. Fixed service field loading issue in edit mode - corrected timing in handleEdit function to load client services before setting serviceId, ensuring "Serviço" field is properly populated when editing activities from Manutenção page
- June 26, 2025. Updated "Cancelar Edição" button styling with red background color (bg-[#ed6d6d]) for better visual distinction
- June 26, 2025. Successfully deployed application to production
- June 26, 2025. Fixed Analytics sector visualization - corrected LEFT JOIN in getTimeEntriesByDateRange to properly relate time_entries.sector_id with sectors.id, now displays sector descriptions ("Intel", "Produção") instead of IDs
- June 26, 2025. Added Analytics module with interactive charts using Recharts - filters by client/period/consultant, visualization by project/service type/sector
- June 26, 2025. Fixed Reports CSV export to use semicolon separator and auto-fill current month dates
- June 26, 2025. Removed Billing module and enhanced Reports with CSV/PDF export functionality
- June 25, 2025. Added Billing module with invoice generation, PDF export, and activity grouping (later removed)
- June 25, 2025. Reverted /clock configuration, back to root path deployment
- June 24, 2025. Initial setup
```

## User Preferences

```
Preferred communication style: Simple, everyday language.
```
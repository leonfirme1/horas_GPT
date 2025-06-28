import { useState, useEffect, createContext, useContext } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { SidebarProvider } from "@/contexts/SidebarContext";

import Dashboard from "@/pages/dashboard";
import Clients from "@/pages/clients";
import Services from "@/pages/services";
import Consultants from "@/pages/consultants";
import Sectors from "@/pages/sectors";
import ServiceTypes from "@/pages/service-types";
import Projects from "@/pages/projects";
import TimeEntries from "@/pages/time-entries";
import Activities from "@/pages/activities";
import Reports from "@/pages/reports";
import Analytics from "@/pages/analytics";

import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

interface AuthUser {
  id: number;
  code: string;
  name: string;
}

interface AuthContextType {
  user: AuthUser | null;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>({ user: null, logout: () => {} });

export const useAuth = () => useContext(AuthContext);

function Router() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem("auth_user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        console.log("User loaded from storage:", parsedUser);
      } catch (error) {
        localStorage.removeItem("auth_user");
      }
    }
    setIsLoading(false);
  }, []);

  const handleLoginSuccess = (consultant: AuthUser) => {
    console.log("Login success, setting user:", consultant);
    
    try {
      setUser(consultant);
      localStorage.setItem("auth_user", JSON.stringify(consultant));
      
      // Force a re-render and navigation
      setTimeout(() => {
        console.log("Redirecting to dashboard");
        setLocation("/");
      }, 100);
    } catch (error) {
      console.error("Error in handleLoginSuccess:", error);
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem("auth_user");
    setLocation("/");
  };

  if (isLoading) {
    return <div className="min-h-screen flex items-center justify-center">Carregando...</div>;
  }

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  console.log("Rendering dashboard for user:", user);

  return (
    <AuthContext.Provider value={{ user, logout: handleLogout }}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/services" component={Services} />
        <Route path="/consultants" component={Consultants} />
        <Route path="/sectors" component={Sectors} />
        <Route path="/service-types" component={ServiceTypes} />
        <Route path="/projects" component={Projects} />
        <Route path="/time-entries" component={TimeEntries} />
        <Route path="/activities" component={Activities} />
        <Route path="/reports" component={Reports} />
        <Route path="/analytics" component={Analytics} />

        <Route component={NotFound} />
      </Switch>
    </AuthContext.Provider>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <SidebarProvider>
          <Router />
          <Toaster />
        </SidebarProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;

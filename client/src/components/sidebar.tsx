import { Link, useLocation } from "wouter";
import { 
  BarChart3, 
  PlusCircle, 
  CheckSquare, 
  Users, 
  Settings, 
  UserCheck, 
  Building, 
  HeadphonesIcon, 
  FolderOpen,
  FileText, 
  TrendingUp,
  LucideIcon,
  PanelLeftClose 
} from "lucide-react";
import { useSidebar } from "@/contexts/SidebarContext";
import { Button } from "@/components/ui/button";

type NavigationItem = {
  name: string;
  href: string;
  icon: LucideIcon | null;
};

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: BarChart3 },
  { name: "Lançamento", href: "/time-entries", icon: PlusCircle },
  { name: "Manutenção", href: "/activities", icon: CheckSquare },
  { name: "separator", href: "", icon: null },
  { name: "Clientes", href: "/clients", icon: Users },
  { name: "Serviços", href: "/services", icon: Settings },
  { name: "Consultores", href: "/consultants", icon: UserCheck },
  { name: "Setor", href: "/sectors", icon: Building },
  { name: "Tipo Atendimento", href: "/service-types", icon: HeadphonesIcon },
  { name: "Projetos", href: "/projects", icon: FolderOpen },
  { name: "separator", href: "", icon: null },
  { name: "Relatórios", href: "/reports", icon: FileText },
  { name: "Analytics", href: "/analytics", icon: TrendingUp },
];

export function Sidebar() {
  const [location] = useLocation();
  const { isOpen, toggle, close } = useSidebar();

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden transition-opacity duration-300"
          onClick={close}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`
        bg-white shadow-lg border-r border-gray-200 h-screen
        flex flex-col relative z-50 transition-all duration-300 ease-in-out
        ${isOpen ? 'w-64 translate-x-0' : 'w-0 -translate-x-full overflow-hidden'}
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
            </div>
            <h1 className="text-lg font-semibold text-gray-900">Gestão Horas</h1>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggle}
            className="text-gray-400 hover:text-gray-600"
          >
            <PanelLeftClose className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {navigation.map((item, index) => {
            if (item.name === "separator") {
              return <hr key={`separator-${index}`} className="my-3 border-gray-200" />;
            }

            const Icon = item.icon;
            const isActive = location === item.href;

            return (
              <Link key={item.name} href={item.href}>
                <div
                  className={`
                    flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium 
                    transition-all duration-200 cursor-pointer
                    ${isActive 
                      ? 'bg-blue-600 text-white shadow-sm' 
                      : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                    }
                  `}
                  onClick={() => {
                    // Close sidebar on mobile after navigation
                    if (window.innerWidth < 1024) {
                      toggle();
                    }
                  }}
                >
                  {Icon && (
                    <Icon className={`h-5 w-5 ${isActive ? 'text-white' : 'text-gray-500'}`} />
                  )}
                  <span className="truncate">{item.name}</span>
                </div>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
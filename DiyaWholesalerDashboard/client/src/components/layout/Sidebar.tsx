import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  ShoppingCart, 
  BookOpen, 
  Users, 
  Store, 
  BarChart3, 
  Settings,
  LogOut
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Khatabook", href: "/khatabook", icon: BookOpen },
  { name: "Retailers", href: "/retailers", icon: Users },
  { name: "My Business", href: "/business", icon: Store },
  { name: "Requests", href: "/connection-requests", icon: Link2 },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const location = window.location.pathname;

  const handleSignOut = () => {
    window.location.href = "/landing";
  };

  return (
    <div className="flex h-full w-64 flex-col bg-white border-r border-gray-200 shadow-sm">
      <div className="flex h-16 items-center px-6 border-b border-gray-100">
        <span className="text-2xl font-display font-bold text-primary flex items-center gap-2">
          <span className="text-3xl">🪔</span> DIYA
        </span>
      </div>
      
      <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                  isActive
                    ? "bg-primary/10 text-primary shadow-sm"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                )}
              >
                <item.icon
                  className={cn(
                    "h-5 w-5 transition-colors",
                    isActive ? "text-primary" : "text-gray-400 group-hover:text-gray-600"
                  )}
                />
                {item.name}
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button 
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-5 w-5" />
          Sign Out
        </button>
      </div>
    </div>
  );
}

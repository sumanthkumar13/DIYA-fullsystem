import { Link } from "wouter";
import {
  LayoutDashboard,
  ShoppingCart,
  BookOpen,
  Users,
  Store,
  BarChart3,
  Settings,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Link2 } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Orders", href: "/orders", icon: ShoppingCart },
  { name: "Khatabook", href: "/khatabook", icon: BookOpen },
  { name: "Retailers", href: "/retailers", icon: Users },
  { name: "My Business", href: "/business", icon: Store },
  { name: "Requests", href: "/connection-requests", icon: Link2 },
  { name: "Analytics", href: "/analytics", icon: BarChart3 },
  { name: "Settings", href: "/settings", icon: Settings },
];

interface SidebarProps {
  isCollapsed: boolean;
}

export function Sidebar({ isCollapsed }: SidebarProps) {
  const location = window.location.pathname;
  const diyaLogo = "\uD83E\uDE94";

  const handleSignOut = () => {
    window.location.href = "/landing";
  };

  return (
    <div
      className={cn(
        "flex h-full flex-col bg-white border-r border-gray-200 shadow-sm transition-[width] duration-300 ease-in-out",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      <div
        className={cn(
          "flex h-16 items-center border-b border-gray-100",
          isCollapsed ? "justify-center px-2" : "px-6"
        )}
      >
        <span
          className={cn(
            "text-2xl font-display font-bold text-primary flex items-center gap-2",
            isCollapsed && "justify-center"
          )}
        >
          <span className="text-3xl" aria-hidden="true">{diyaLogo}</span>
          <span className={cn(isCollapsed && "sr-only")}>DIYA</span>
        </span>
      </div>

      <div className="flex-1 flex flex-col gap-1 p-4 overflow-y-auto">
        {navigation.map((item) => {
          const isActive =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer group",
                  isCollapsed && "justify-center px-2",
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
                <span className={cn(isCollapsed && "sr-only")}>{item.name}</span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className="p-4 border-t border-gray-100">
        <button
          onClick={handleSignOut}
          className={cn(
            "flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors",
            isCollapsed && "justify-center px-2"
          )}
        >
          <LogOut className="h-5 w-5" />
          <span className={cn(isCollapsed && "sr-only")}>Sign Out</span>
        </button>
      </div>
    </div>
  );
}

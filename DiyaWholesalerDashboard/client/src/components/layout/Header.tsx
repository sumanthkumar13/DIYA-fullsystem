import { ChevronDown, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import avatarImage from "@assets/generated_images/professional_business_avatar_for_a_wholesaler.png";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { getInitials, getUserDisplayName } from "@/lib/greeting";

interface HeaderProps {
  isSidebarCollapsed: boolean;
  onToggleSidebar: () => void;
}

export function Header({ isSidebarCollapsed, onToggleSidebar }: HeaderProps) {
  const { user, logout } = useAuth();
  const displayName = getUserDisplayName(user);
  const initials = getInitials(displayName || "User");

  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleSidebar}
          aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <Menu className="h-5 w-5 text-gray-600" />
        </Button>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:bg-gray-50 p-1.5 rounded-full pr-3 transition-colors outline-none">
              <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                <AvatarImage src={avatarImage} alt="Profile" />
                <AvatarFallback>{initials}</AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-none">{displayName || "Account"}</p>
                <p className="text-xs text-gray-500 mt-1">Diya Wholesalers</p>
              </div>
              <ChevronDown className="h-4 w-4 text-gray-400 hidden sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Profile</DropdownMenuItem>
            <DropdownMenuItem>Settings</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onSelect={() => {
                logout();
                window.location.href = "/landing";
              }}
            >
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

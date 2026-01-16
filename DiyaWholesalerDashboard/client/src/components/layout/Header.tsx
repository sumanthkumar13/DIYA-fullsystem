import { Bell, Search, ChevronDown, Menu } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
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

export function Header() {
  return (
    <header className="h-16 bg-white border-b border-gray-200 px-6 flex items-center justify-between sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-4 flex-1">
        <div className="relative w-full max-w-md hidden md:block">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Search retailer, order, or invoice..." 
            className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-all rounded-full"
          />
        </div>
        <Button variant="ghost" size="icon" className="md:hidden">
          <Search className="h-5 w-5 text-gray-500" />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5 text-gray-500" />
          <span className="absolute top-2 right-2 h-2 w-2 bg-red-500 rounded-full ring-2 ring-white" />
        </Button>

        <div className="h-8 w-px bg-gray-200 mx-2" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 hover:bg-gray-50 p-1.5 rounded-full pr-3 transition-colors outline-none">
              <Avatar className="h-9 w-9 border-2 border-white shadow-sm">
                <AvatarImage src={avatarImage} alt="Profile" />
                <AvatarFallback>VK</AvatarFallback>
              </Avatar>
              <div className="text-left hidden sm:block">
                <p className="text-sm font-semibold text-gray-900 leading-none">Vijay Kumar</p>
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
            <DropdownMenuItem className="text-red-600">Log out</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

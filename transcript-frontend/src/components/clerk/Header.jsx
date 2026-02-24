import universityLogo from "../../assets/university-logo.png";
import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";

export default function Header({ pageTitle, clerkName = "Clerk", onToggleSidebar, onLogout, onOpenMobileMenu }) {
  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="outline" size="icon" className="lg:hidden" onClick={onOpenMobileMenu} aria-label="Open menu">
            <span aria-hidden="true">Menu</span>
          </Button>

          <Button variant="outline" size="icon" className="hidden lg:inline-flex" onClick={onToggleSidebar} aria-label="Toggle sidebar">
            <span aria-hidden="true">Menu</span>
          </Button>

          <div className="flex items-center gap-3 min-w-0">
            <img src={universityLogo} alt="Maharaja Sayajirao University of Baroda" className="h-9 w-9 object-contain hidden sm:block" />
            <div className="min-w-0">
              <p className="text-xs text-gray-500 truncate">Maharaja Sayajirao University of Baroda</p>
              <h1 className="text-lg font-semibold text-gray-900 truncate">{pageTitle}</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="relative" aria-label="Notifications">
            <span aria-hidden="true">Notif</span>
            <span className="absolute -top-1 -right-1">
              <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                3
              </Badge>
            </span>
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 px-2">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{String(clerkName).charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-left ml-2">
                  <span className="block text-sm font-medium text-gray-900 leading-none">{clerkName}</span>
                  <span className="block text-xs text-gray-500 mt-1 leading-none">Clerk</span>
                </span>
              </Button>
            </DropdownMenuTrigger>
            <div className="relative">
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => {}}>Profile</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-red-600 hover:bg-red-50" onClick={onLogout}>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </div>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}

import { Button } from "../ui/button";
import { Badge } from "../ui/badge";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Menu, Bell, Moon, Sun } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

export default function AppHeader({
  pageTitle,
  orgLine = "Maharaja Sayajirao University of Baroda",
  logoSrc,
  logoAlt,
  userName,
  userRoleLabel,
  notificationsCount = 0,
  onToggleSidebar,
  onOpenMobileMenu,
  onLogout,
}) {
  const { isDark, toggleTheme } = useTheme();
  const initial = String(userName || userRoleLabel || "U").trim().charAt(0).toUpperCase();

  return (
    <header className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-800 sticky top-0 z-30">
      <div className="px-4 sm:px-6 py-3 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="outline"
            size="icon"
            className="lg:hidden"
            onClick={onOpenMobileMenu}
            aria-label="Open menu"
            type="button"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            className="hidden lg:inline-flex"
            onClick={onToggleSidebar}
            aria-label="Toggle sidebar"
            type="button"
          >
            <Menu className="h-4 w-4" aria-hidden="true" />
          </Button>

          <div className="flex items-center gap-3 min-w-0">
            {logoSrc ? (
              <img
                src={logoSrc}
                alt={logoAlt || orgLine}
                className="h-9 w-9 object-contain hidden sm:block"
              />
            ) : null}
            <div className="min-w-0">
              <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{orgLine}</p>
              <h1 className="text-lg font-semibold text-gray-900 dark:text-slate-100 truncate">{pageTitle}</h1>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            className="relative"
            aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
            type="button"
            onClick={toggleTheme}
          >
            {isDark ? <Sun className="h-4 w-4" aria-hidden="true" /> : <Moon className="h-4 w-4" aria-hidden="true" />}
          </Button>

          <Button variant="outline" size="icon" className="relative" aria-label="Notifications" type="button">
            <Bell className="h-4 w-4" aria-hidden="true" />
            {notificationsCount > 0 ? (
              <span className="absolute -top-1 -right-1">
                <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                  {notificationsCount}
                </Badge>
              </span>
            ) : null}
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-10 px-2" type="button">
                <Avatar className="h-9 w-9">
                  <AvatarFallback>{initial}</AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-left ml-2">
                  <span className="block text-sm font-medium text-gray-900 dark:text-slate-100 leading-none">{userName || userRoleLabel}</span>
                  <span className="block text-xs text-gray-500 dark:text-slate-400 mt-1 leading-none">{userRoleLabel}</span>
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

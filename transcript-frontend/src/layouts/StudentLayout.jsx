import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import universityLogo from "../assets/university-logo.png";
import { Button } from "../components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "../components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Badge } from "../components/ui/badge";
import { Separator } from "../components/ui/separator";
import { Card } from "../components/ui/card";
import { Menu, Bell, LayoutDashboard, User, FilePlus, Clock, CreditCard, Download } from "lucide-react";

export default function StudentLayout() {
  const navigate = useNavigate();
  const location = useLocation();
  const { logout: authLogout, user } = useAuth();

  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifications] = useState(3);

  const studentName = user?.fullName || "Student";

  const menuItems = useMemo(
    () => [
      { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
      { name: "Profile", path: "/dashboard/profile", icon: User },
      { name: "Transcript Request", path: "/dashboard/request", icon: FilePlus },
      { name: "Request Status", path: "/dashboard/status", icon: Clock },
      { name: "Payments", path: "/dashboard/payments", icon: CreditCard },
      { name: "Downloads", path: "/dashboard/downloads", icon: Download },
    ],
    []
  );

  const pageTitle = useMemo(() => {
    const currentItem =
      menuItems.find((item) => location.pathname === item.path || location.pathname.startsWith(item.path + "/")) || menuItems[0];
    return currentItem.name;
  }, [location.pathname, menuItems]);

  const logout = () => {
    authLogout();
    navigate("/login");
  };

  const SidebarNav = ({ compact = false, onNavigate }) => (
    <nav className="space-y-1">
      {menuItems.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/dashboard"}
          onClick={() => onNavigate?.()}
          className={({ isActive }) =>
            [
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]",
              isActive ? "bg-[#1e40af] text-white" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
              compact ? "justify-center" : "",
            ].join(" ")
          }
        >
          <item.icon className="h-4 w-4 shrink-0" aria-hidden="true" />
          {compact ? null : <span className="truncate">{item.name}</span>}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      <aside className={`hidden lg:flex bg-white border-r border-gray-200 sticky top-0 h-screen ${collapsed ? "w-20" : "w-72"} transition-all`}>
        <div className="flex flex-col w-full">
          <div className="p-4 border-b border-gray-200">
            <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
              <img src={universityLogo} alt="Maharaja Sayajirao University of Baroda" className="h-10 w-10 object-contain" />
              {collapsed ? null : (
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">Maharaja Sayajirao University of Baroda</p>
                  <p className="text-xs text-gray-500">Student Transcript Portal</p>
                </div>
              )}
            </div>
          </div>

          <div className="p-3 flex-1 overflow-y-auto">
            <SidebarNav compact={collapsed} />
          </div>

          <div className="p-3 border-t border-gray-200">
            <Button variant="outline" className="w-full" onClick={() => setCollapsed((v) => !v)}>
              {collapsed ? "Expand" : "Collapse"}
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col">
        <header className="bg-white border-b border-gray-200">
          <div className="px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="lg:hidden">
                    <span className="sr-only">Open menu</span>
                    <Menu className="h-4 w-4" aria-hidden="true" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <img src={universityLogo} alt="Maharaja Sayajirao University of Baroda" className="h-10 w-10 object-contain" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">Maharaja Sayajirao University of Baroda</p>
                      <p className="text-xs text-gray-500">Student Transcript Portal</p>
                    </div>
                  </div>
                  <Separator className="mb-4" />
                  <SidebarNav onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>

              <div className="min-w-0">
                <h1 className="text-lg font-semibold text-gray-900 truncate">{pageTitle}</h1>
                <p className="text-xs text-gray-500 truncate">Maharaja Sayajirao University of Baroda</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="outline" size="icon" className="relative">
                <span className="sr-only">Notifications</span>
                <Bell className="h-4 w-4" aria-hidden="true" />
                {notifications > 0 ? (
                  <span className="absolute -top-1 -right-1">
                    <Badge variant="destructive" className="px-1.5 py-0 text-[10px]">
                      {notifications}
                    </Badge>
                  </span>
                ) : null}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-10 px-2">
                    <Avatar className="h-9 w-9">
                      <AvatarFallback>{String(studentName).charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden sm:block text-left ml-2">
                      <span className="block text-sm font-medium text-gray-900 leading-none">{studentName}</span>
                      <span className="block text-xs text-gray-500 mt-1 leading-none">Student</span>
                    </span>
                  </Button>
                </DropdownMenuTrigger>
                <div className="relative">
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      onClick={() => {
                        navigate("/dashboard/profile");
                      }}
                    >
                      Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem className="text-red-600 hover:bg-red-50" onClick={logout}>
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </div>
              </DropdownMenu>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Card className="border-0 shadow-none bg-transparent">
              <Outlet key={location.pathname} />
            </Card>
          </div>
        </main>
      </div>
    </div>
  );
}

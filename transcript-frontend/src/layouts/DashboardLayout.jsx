import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Button } from "../components/ui/button";
import { Sheet, SheetTrigger, SheetContent } from "../components/ui/sheet";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { Separator } from "../components/ui/separator";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { logout, user, userRole } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = userRole || "Admin";
  const name = user?.fullName || role;

  const items = [
    { name: "Dashboard", path: `/${role.toLowerCase()}` },
  ];

  const Nav = ({ onNavigate }) => (
    <nav className="space-y-1">
      {items.map((it) => (
        <NavLink
          key={it.path}
          to={it.path}
          onClick={() => onNavigate?.()}
          className={({ isActive }) =>
            [
              "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]",
              isActive ? "bg-blue-50 text-[#1e40af]" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
            ].join(" ")
          }
        >
          <span className="h-2.5 w-2.5 rounded-full bg-current opacity-60" aria-hidden="true" />
          <span className="truncate">{it.name}</span>
        </NavLink>
      ))}
    </nav>
  );

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      <aside className="hidden lg:flex w-72 bg-white border-r border-gray-200 sticky top-0 h-screen">
        <div className="w-full p-4">
          <p className="text-sm font-semibold text-gray-900">{role} Panel</p>
          <p className="text-xs text-gray-500 mt-0.5">Transcript System</p>
          <Separator className="my-4" />
          <Nav />
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
                    <span aria-hidden="true">≡</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-4">
                  <p className="text-sm font-semibold text-gray-900">{role} Panel</p>
                  <p className="text-xs text-gray-500 mt-0.5">Transcript System</p>
                  <Separator className="my-4" />
                  <Nav onNavigate={() => setMobileOpen(false)} />
                </SheetContent>
              </Sheet>

              <h1 className="text-lg font-semibold text-gray-900 truncate">{role} Dashboard</h1>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 px-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{String(name).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-left ml-2">
                    <span className="block text-sm font-medium text-gray-900 leading-none">{name}</span>
                    <span className="block text-xs text-gray-500 mt-1 leading-none">{role}</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <div className="relative">
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => {}}>Profile</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 hover:bg-red-50" onClick={doLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </div>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}


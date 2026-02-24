import { Outlet, NavLink, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import universityLogo from "../assets/university-logo.png";
import { Sheet, SheetTrigger, SheetContent } from "../components/ui/sheet";
import { Button } from "../components/ui/button";
import { Separator } from "../components/ui/separator";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator } from "../components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "../components/ui/avatar";
import { LayoutDashboard, Clock, CheckCircle2, XCircle, Settings, LogOut, Menu } from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/dean", icon: LayoutDashboard },
  { name: "Pending Final Approvals", path: "/dean/pending", icon: Clock },
  { name: "Approved Transcripts", path: "/dean/approved", icon: CheckCircle2 },
  { name: "Rejected Transcripts", path: "/dean/rejected", icon: XCircle },
  { name: "Settings", path: "/dean/settings", icon: Settings },
];

export default function DeanLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const name = user?.fullName || "Dean";

  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p.includes("/dean/pending")) return "Pending Final Approvals";
    if (p.includes("/dean/approved")) return "Approved Transcripts";
    if (p.includes("/dean/rejected")) return "Rejected Transcripts";
    if (p.includes("/dean/settings")) return "Settings";
    if (p.includes("/dean/review")) return "Review Transcript";
    return "Dashboard";
  }, [location.pathname]);

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  const Nav = ({ onNavigate }) => (
    <nav className="space-y-1">
      {navItems.map((it) => {
        const Icon = it.icon;
        return (
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
            <Icon className="h-4 w-4" />
            <span className="truncate">{it.name}</span>
          </NavLink>
        );
      })}
    </nav>
  );

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      <aside className="hidden lg:flex w-72 bg-white border-r border-gray-200 sticky top-0 h-screen">
        <div className="w-full p-4">
          <div className="flex items-center gap-3">
            <img src={universityLogo} alt="Maharaja Sayajirao University of Baroda" className="h-10 w-10 object-contain" />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">Dean Panel</p>
              <p className="text-xs text-gray-500 truncate">Transcript System</p>
            </div>
          </div>
          <Separator className="my-4" />
          <Nav />
          <div className="mt-4">
            <Button variant="destructive" className="w-full" onClick={doLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Logout
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
                    <Menu className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="p-4 w-[320px]">
                  <div className="flex items-center gap-3">
                    <img src={universityLogo} alt="Maharaja Sayajirao University of Baroda" className="h-10 w-10 object-contain" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">Dean Panel</p>
                      <p className="text-xs text-gray-500 truncate">Transcript System</p>
                    </div>
                  </div>
                  <Separator className="my-4" />
                  <Nav onNavigate={() => setMobileOpen(false)} />
                  <div className="mt-4">
                    <Button variant="destructive" className="w-full" onClick={doLogout}>
                      <LogOut className="h-4 w-4 mr-2" />
                      Logout
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <h1 className="text-lg font-semibold text-gray-900 truncate">{pageTitle}</h1>
            </div>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 px-2">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback>{String(name).charAt(0).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:block text-left ml-2">
                    <span className="block text-sm font-medium text-gray-900 leading-none">{name}</span>
                    <span className="block text-xs text-gray-500 mt-1 leading-none">Dean</span>
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <div className="relative">
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => navigate("/dean/settings")}>
                    <Settings className="h-4 w-4 mr-2" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="text-red-600 hover:bg-red-50" onClick={doLogout}>
                    <LogOut className="h-4 w-4 mr-2" />
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </div>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto bg-gray-100">
          <div className="p-4 sm:p-6 lg:p-8 animate-fadeIn">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}


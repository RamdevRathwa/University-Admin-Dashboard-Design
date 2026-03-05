import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { useAuth } from "../context/AuthContext";
import universityLogo from "../assets/university-logo.png";
import { Sheet, SheetContent } from "../components/ui/sheet";
import AppSidebar from "../components/shell/AppSidebar";
import AppHeader from "../components/shell/AppHeader";
import { LayoutDashboard, Clock, CheckCircle2, XCircle, Settings } from "lucide-react";

const navItems = [
  { name: "Dashboard", path: "/hod", icon: LayoutDashboard },
  { name: "Pending Approvals", path: "/hod/pending", icon: Clock },
  { name: "Approved Requests", path: "/hod/approved", icon: CheckCircle2 },
  { name: "Rejected Requests", path: "/hod/rejected", icon: XCircle },
  { name: "Settings", path: "/hod/settings", icon: Settings },
];

export default function HodLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const name = user?.fullName || "HoD";

  const pageTitle = useMemo(() => {
    const p = location.pathname;
    if (p.includes("/hod/pending")) return "Pending Approvals";
    if (p.includes("/hod/approved")) return "Approved Requests";
    if (p.includes("/hod/rejected")) return "Rejected Requests";
    if (p.includes("/hod/settings")) return "Settings";
    if (p.includes("/hod/review")) return "Review Request";
    return "Dashboard";
  }, [location.pathname]);

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100 dark:bg-slate-950 text-gray-900 dark:text-slate-100">
      <div className="hidden lg:block">
        <AppSidebar
          collapsed={collapsed}
          logoSrc={universityLogo}
          logoAlt="Maharaja Sayajirao University of Baroda"
          panelTitle="HoD Panel"
          panelSubtitle="Transcript System"
          navItems={navItems}
          onLogout={doLogout}
          ariaLabel="HoD sidebar"
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[320px]">
          <AppSidebar
            collapsed={false}
            logoSrc={universityLogo}
            logoAlt="Maharaja Sayajirao University of Baroda"
            panelTitle="HoD Panel"
            panelSubtitle="Transcript System"
            navItems={navItems}
            onLogout={doLogout}
            onNavigate={() => setMobileOpen(false)}
            ariaLabel="HoD sidebar"
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        <AppHeader
          pageTitle={pageTitle}
          logoSrc={universityLogo}
          logoAlt="Maharaja Sayajirao University of Baroda"
          userName={name}
          userRoleLabel="HoD"
          notificationsCount={0}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onLogout={doLogout}
        />

        <main className="flex-1 overflow-y-auto bg-gray-100 dark:bg-slate-950">
          <div className="p-4 sm:p-6 lg:p-8 animate-fadeIn">
            <Outlet key={location.pathname} />
          </div>
        </main>
      </div>
    </div>
  );
}

import { Outlet, useNavigate } from "react-router-dom";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";
import universityLogo from "../assets/university-logo.png";
import { Sheet, SheetContent } from "../components/ui/sheet";
import AppSidebar from "../components/shell/AppSidebar";
import AppHeader from "../components/shell/AppHeader";
import { LayoutDashboard } from "lucide-react";

export default function DashboardLayout() {
  const navigate = useNavigate();
  const { logout, user, userRole } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = userRole || "Admin";
  const name = user?.fullName || role;

  const navItems = [{ name: "Dashboard", path: "/admin", icon: LayoutDashboard, end: true }];

  const doLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="flex min-h-screen bg-gray-100 text-gray-900">
      <div className="hidden lg:block">
        <AppSidebar
          collapsed={collapsed}
          logoSrc={universityLogo}
          logoAlt="Maharaja Sayajirao University of Baroda"
          panelTitle={`${role} Panel`}
          panelSubtitle="Transcript System"
          navItems={navItems}
          onLogout={doLogout}
          ariaLabel={`${role} sidebar`}
        />
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0 w-[320px]">
          <AppSidebar
            collapsed={false}
            logoSrc={universityLogo}
            logoAlt="Maharaja Sayajirao University of Baroda"
            panelTitle={`${role} Panel`}
            panelSubtitle="Transcript System"
            navItems={navItems}
            onLogout={doLogout}
            onNavigate={() => setMobileOpen(false)}
            ariaLabel={`${role} sidebar`}
          />
        </SheetContent>
      </Sheet>

      <div className="flex-1 min-w-0 flex flex-col">
        <AppHeader
          pageTitle={role === "Admin" ? "Admin Dashboard" : `${role} Dashboard`}
          logoSrc={universityLogo}
          logoAlt="Maharaja Sayajirao University of Baroda"
          userName={name}
          userRoleLabel={role}
          notificationsCount={0}
          onToggleSidebar={() => setCollapsed((v) => !v)}
          onOpenMobileMenu={() => setMobileOpen(true)}
          onLogout={doLogout}
        />

        <main className="flex-1 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}

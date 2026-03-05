import { NavLink } from "react-router-dom";
import { Button } from "../ui/button";
import { Separator } from "../ui/separator";
import { LogOut } from "lucide-react";

export default function AppSidebar({
  collapsed = false,
  logoSrc,
  logoAlt,
  panelTitle,
  panelSubtitle,
  navItems = [],
  onLogout,
  onNavigate,
  logoutLabel = "Logout",
  ariaLabel = "Sidebar",
}) {
  return (
    <aside
      className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col sticky top-0 h-screen ${
        collapsed ? "w-20" : "w-72"
      }`}
      aria-label={ariaLabel}
    >
      <div className="p-4 border-b border-gray-200">
        <div className={`flex items-center gap-3 ${collapsed ? "justify-center" : ""}`}>
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={logoAlt || panelTitle || "Logo"}
              className="h-10 w-10 object-contain"
            />
          ) : null}
          {collapsed ? null : (
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{panelTitle}</p>
              {panelSubtitle ? <p className="text-xs text-gray-500 truncate">{panelSubtitle}</p> : null}
            </div>
          )}
        </div>
      </div>

      <div className="p-3 flex-1 overflow-y-auto">
        <nav className="space-y-1">
          {navItems.map((it) => (
            <SidebarNavItem key={it.path} item={it} collapsed={collapsed} onNavigate={onNavigate} />
          ))}
        </nav>
      </div>

      <div className="p-3 border-t border-gray-200">
        <Button
          variant="destructive"
          className={`w-full ${collapsed ? "px-0" : ""}`}
          onClick={onLogout}
          type="button"
        >
          <LogOut className={`h-4 w-4 ${collapsed ? "" : "mr-2"}`} aria-hidden="true" />
          {collapsed ? null : logoutLabel}
        </Button>
        {collapsed ? null : <Separator className="mt-3" />}
      </div>
    </aside>
  );
}

function SidebarNavItem({ item, collapsed, onNavigate }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.path}
      end={Boolean(item.end)}
      onClick={() => onNavigate?.()}
      className={({ isActive }) =>
        [
          "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1e40af]",
          isActive ? "bg-blue-50 text-[#1e40af]" : "text-gray-700 hover:bg-gray-100 hover:text-gray-900",
          collapsed ? "justify-center" : "",
        ].join(" ")
      }
      aria-label={collapsed ? item.name : undefined}
      title={collapsed ? item.name : undefined}
    >
      {Icon ? <Icon className="h-4 w-4 shrink-0" aria-hidden="true" /> : null}
      {collapsed ? null : <span className="truncate">{item.name}</span>}
    </NavLink>
  );
}


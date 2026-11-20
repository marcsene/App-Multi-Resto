
"use client";

import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Users,
  Armchair,
  ChefHat,
  BarChart3,
  WalletCards,
  Settings,
  CircleAlert,
  ChevronDown,
  X,
  LogOut,
} from "lucide-react";

const navigation = [
  {
    title: "GENERAL",
    items: [
      { label: "Dashboard", icon: LayoutDashboard },
      { label: "Pedidos", icon: ShoppingBag, count: "8" },
      { label: "Menú y productos", icon: UtensilsCrossed },
      { label: "Mesas", icon: Armchair },
    ],
  },
  {
    title: "OPERACIONES",
    items: [
      { label: "Cocina", icon: ChefHat },
      { label: "Bar", icon: UtensilsCrossed },
      { label: "Clientes", icon: Users },
    ],
  },
   {
    title: "GESTIÓN",
    items: [
      { label: "Caja", icon: WalletCards },
      { label: "Reportes", icon: BarChart3 },
      { label: "Configuración", icon: Settings },
    ],
  },
];

interface SidebarProps {
  activePage: string;
  sidebarOpen: boolean;
  restaurantName: string;
  restaurantRole: string;
  onNavigate: (page: string) => void;
  onClose: () => void;
}

export default function Sidebar({
  activePage,
  sidebarOpen,
  restaurantName,
  restaurantRole,
  onNavigate,
  onClose,
}: SidebarProps) {
  return (
    <aside className={`sidebar ${sidebarOpen ? "sidebar-open" : ""}`}>
      <div className="brand">
        <div className="brand-symbol">
          <UtensilsCrossed size={22} />
        </div>

        <div>
          <strong>App-Multi-Resto</strong>
          <span>Restaurant management</span>
        </div>

        <button
          className="mobile-close"
          onClick={onClose}
          aria-label="Cerrar menú"
        >
          <X size={20} />
        </button>
      </div>

      <div className="restaurant-switch">
        <div className="restaurant-avatar">
          {restaurantName.charAt(0).toUpperCase() || "R"}
        </div>

        <div className="restaurant-info">
          <strong>{restaurantName}</strong>
          <span>Rol: {restaurantRole}</span>
        </div>

        <ChevronDown size={16} />
      </div>

      <nav className="side-navigation">
        {navigation.map((group) => (
          <div className="nav-group" key={group.title}>
            <p className="nav-heading">{group.title}</p>

            {group.items.map((item) => {
              const Icon = item.icon;

              return (
                <button
                  key={item.label}
                  onClick={() => onNavigate(item.label)}
                  className={`nav-item ${
                    activePage === item.label ? "nav-active" : ""
                  }`}
                >
                  <Icon size={19} strokeWidth={1.8} />
                  <span>{item.label}</span>

                  {"count" in item && <small>{item.count}</small>}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-bottom">
        <div className="help-card">
          <div className="help-icon">
            <CircleAlert size={18} />
          </div>

          <strong>¿Necesitas ayuda?</strong>

          <p>
            Estamos aquí para ayudarte a gestionar tu restaurante.
          </p>

          <button onClick={() => onNavigate("Centro de ayuda")}>
            Centro de ayuda
          </button>
        </div>

        <div className="profile">
          <div className="profile-avatar">MO</div>

          <div className="profile-info">
            <strong>Administrador</strong>
            <span>Cuenta de usuario</span>
          </div>

          <button aria-label="Cerrar sesión">
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </aside>
  );
}

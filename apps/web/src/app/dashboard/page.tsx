
"use client";

import { useEffect, useState } from "react";
import TablesManagement from "@/components/dashboard/TablesManagement";
import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";
import ProductsManagement from "@/components/dashboard/ProductsManagement";
import StatsCards from "@/components/dashboard/StatsCards";
import SalesChart from "@/components/dashboard/SalesChart";
import ActivityPanel from "@/components/dashboard/ActivityPanel";
import OrdersTable from "@/components/dashboard/OrdersTable";
import TablesPanel from "@/components/dashboard/TablesPanel";

import {
  CalendarDays,
  Plus,
  Construction,
} from "lucide-react";

export default function DashboardPage() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const [restaurantName, setRestaurantName] = useState("Cargando...");
  const [restaurantRole, setRestaurantRole] = useState("...");
  const [loadingRestaurant, setLoadingRestaurant] = useState(true);

  const [currentDate, setCurrentDate] = useState("");

  useEffect(() => {
    let mounted = true;

    // Obtener la fecha en el navegador después del montaje.
    setCurrentDate(
      new Intl.DateTimeFormat("es-CL", {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date())
    );

    async function loadActiveRestaurant() {
      try {
        const response = await fetch("/api/active-restaurant", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "No fue posible cargar el restaurante."
          );
        }

        if (mounted) {
          setRestaurantName(result.restaurant.name);
          setRestaurantRole(result.role);
        }
      } catch (error) {
        console.error("Error cargando restaurante:", error);

        if (mounted) {
          setRestaurantName("Restaurante no disponible");
          setRestaurantRole("-");
        }
      } finally {
        if (mounted) {
          setLoadingRestaurant(false);
        }
      }
    }

    loadActiveRestaurant();

    return () => {
      mounted = false;
    };
  }, []);

  function renderDashboard() {
    return (
      <>
        <div className="welcome-row">
          <div>
            <p className="eyebrow">
              {loadingRestaurant
                ? "CARGANDO RESTAURANTE..."
                : `${restaurantName.toUpperCase()} · PANEL GENERAL`}
            </p>

            <h1>
              ¡Buenos días! <span>☀️</span>
            </h1>

            <p className="welcome-subtitle">
              Aquí tienes el resumen de lo que sucede hoy en tu restaurante.
            </p>
          </div>

          <div className="welcome-actions">
            <button className="date-button">
              <CalendarDays size={17} />
              {currentDate || "Cargando fecha..."}
            </button>

            <button
              className="primary-button"
              onClick={() => setActivePage("Pedidos")}
            >
              <Plus size={18} />
              Nuevo pedido
            </button>
          </div>
        </div>

        <StatsCards />

        <div className="dashboard-grid">
          <SalesChart />
          <ActivityPanel />
        </div>

        <div className="lower-grid">
          <OrdersTable
            onViewAll={() => setActivePage("Pedidos")}
          />

          <TablesPanel
            onManageTables={() => setActivePage("Mesas")}
          />
        </div>
      </>
    );
  }

  
function renderSection() {
  switch (activePage) {
    case "Dashboard":
      return renderDashboard();

    case "Menú y productos":
      return <ProductsManagement />;

    case "Pedidos":
      // Aquí conserva tu contenido actual de pedidos.
      return (
        <>
          {/* Contenido de pedidos */}
          <OrdersTable onViewAll={() => {}} showAll />
        </>
      );

    case "Mesas":
  return <TablesManagement />;

    default:
      // Aquí conserva tu contenido actual de módulo en preparación.
      return (
        <div className="welcome-row">
          <div>
            <h1>{activePage}</h1>
            <p>Estamos preparando este módulo.</p>
          </div>
        </div>
      );
  }
}
  return (
    <main className="dashboard-shell">
      {sidebarOpen && (
        <button
          className="sidebar-overlay"
          aria-label="Cerrar menú"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar
        activePage={activePage}
        sidebarOpen={sidebarOpen}
        restaurantName={restaurantName}
        restaurantRole={restaurantRole}
        onNavigate={(page) => {
          setActivePage(page);
          setSidebarOpen(false);
        }}
        onClose={() => setSidebarOpen(false)}
      />

      <section className="main-area">
        <Topbar
          activePage={activePage}
          onMenuClick={() => setSidebarOpen(true)}
        />

        <div className="page-content">
          {renderSection()}

          <footer className="dashboard-footer">
            <span>
              © 2026 App-Multi-Resto. Todo tu restaurante, en un solo lugar.
            </span>

            <span>
              <i /> Todos los sistemas operativos
            </span>
          </footer>
        </div>
      </section>
    </main>
  );
}

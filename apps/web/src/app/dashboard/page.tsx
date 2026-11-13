
"use client";

import { useState } from "react";

import Sidebar from "@/components/layout/Sidebar";
import Topbar from "@/components/layout/Topbar";

import StatsCards from "@/components/dashboard/StatsCards";
import SalesChart from "@/components/dashboard/SalesChart";
import ActivityPanel from "@/components/dashboard/ActivityPanel";
import OrdersTable from "@/components/dashboard/OrdersTable";
import TablesPanel from "@/components/dashboard/TablesPanel";

import {
  CalendarDays,
  Plus,
} from "lucide-react";

export default function DashboardPage() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
          <div className="welcome-row">
            <div>
              <p className="eyebrow">
                MI RESTAURANTE · PANEL GENERAL
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
                12 de noviembre, 2026
              </button>

              <button className="primary-button">
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


"use client";

import {
  Bell,
  Search,
  Menu,
  ChevronDown,
} from "lucide-react";

interface TopbarProps {
  activePage: string;
  onMenuClick: () => void;
}

export default function Topbar({
  activePage,
  onMenuClick,
}: TopbarProps) {
  return (
    <header className="topbar">
      <div className="topbar-left">
        <button
          className="mobile-menu"
          onClick={onMenuClick}
          aria-label="Abrir menú"
        >
          <Menu size={22} />
        </button>

        <div className="breadcrumb">
          Panel de control <span>/</span>{" "}
          <strong>{activePage}</strong>
        </div>
      </div>

      <div className="topbar-actions">
        <label className="search-box">
          <Search size={17} />
          <input
            placeholder="Buscar..."
            aria-label="Buscar"
          />
          <kbd>⌘ K</kbd>
        </label>

        <button
          className="icon-button notification-button"
          aria-label="Notificaciones"
        >
          <Bell size={19} />
          <i />
        </button>

        <div className="topbar-divider" />

        <div className="top-user">
          <div className="profile-avatar">MO</div>

          <div>
            <strong>Marcsene</strong>
            <span>Administrador</span>
          </div>

          <ChevronDown size={15} />
        </div>
      </div>
    </header>
  );
}

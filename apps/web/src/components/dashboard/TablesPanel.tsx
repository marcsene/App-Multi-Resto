
"use client";

import { Armchair, MoreHorizontal, ArrowUpRight } from "lucide-react";

interface TablesPanelProps {
  onManageTables: () => void;
}

const tables = [
  { number: "01", status: "Ocupada", color: "occupied" },
  { number: "02", status: "Ocupada", color: "occupied" },
  { number: "03", status: "Disponible", color: "available" },
  { number: "04", status: "Ocupada", color: "occupied" },
  { number: "05", status: "Disponible", color: "available" },
  { number: "06", status: "Reservada", color: "reserved" },
];

export default function TablesPanel({
  onManageTables,
}: TablesPanelProps) {
  return (
    <section className="panel tables-panel">
      <div className="panel-heading">
        <div>
          <h2>Estado de mesas</h2>
          <p>Distribución en tiempo real</p>
        </div>

        <button className="more-button" aria-label="Más opciones">
          <MoreHorizontal size={21} />
        </button>
      </div>

      <div className="table-legend">
        <span>
          <i className="legend-occupied" /> Ocupada
        </span>

        <span>
          <i className="legend-available" /> Disponible
        </span>

        <span>
          <i className="legend-reserved" /> Reservada
        </span>
      </div>

      <div className="tables-grid">
        {tables.map((table) => (
          <div
            className={`restaurant-table table-${table.color}`}
            key={table.number}
          >
            <Armchair size={19} />
            <strong>{table.number}</strong>
            <span>{table.status}</span>
          </div>
        ))}
      </div>

      <button
        className="manage-tables"
        onClick={onManageTables}
      >
        Administrar mesas <ArrowUpRight size={15} />
      </button>
    </section>
  );
}

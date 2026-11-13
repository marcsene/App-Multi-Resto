
"use client";

import {
  TrendingUp,
  ChevronDown,
} from "lucide-react";

const sales = [
  { day: "Lun", value: 42 },
  { day: "Mar", value: 66 },
  { day: "Mié", value: 52 },
  { day: "Jue", value: 82 },
  { day: "Vie", value: 61 },
  { day: "Sáb", value: 95 },
  { day: "Dom", value: 74 },
];

export default function SalesChart() {
  return (
    <section className="panel sales-panel">
      <div className="panel-heading">
        <div>
          <h2>Resumen de ventas</h2>
          <p>Rendimiento de tu restaurante esta semana</p>
        </div>

        <button className="select-button">
          Esta semana <ChevronDown size={15} />
        </button>
      </div>

      <div className="sales-total">
        <strong>$2.845.900</strong>

        <span>
          <TrendingUp size={15} />
          18,6% respecto a la semana anterior
        </span>
      </div>

      <div className="chart">
        <div className="chart-y-labels">
          <span>$500k</span>
          <span>$375k</span>
          <span>$250k</span>
          <span>$125k</span>
          <span>$0</span>
        </div>

        <div className="chart-main">
          <div className="chart-grid-lines">
            <i />
            <i />
            <i />
            <i />
            <i />
          </div>

          <div className="chart-bars">
            {sales.map((item) => (
              <div className="chart-column" key={item.day}>
                <div className="bar-track">
                  <div
                    className={`bar ${
                      item.day === "Sáb" ? "bar-highlight" : ""
                    }`}
                    style={{ height: `${item.value}%` }}
                  />
                </div>

                <span>{item.day}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

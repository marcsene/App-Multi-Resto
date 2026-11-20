
"use client";

import { useEffect, useState } from "react";
import { ArrowUpRight, RefreshCw } from "lucide-react";

import {
  getOrders,
  type Order,
  type OrderStatus,
} from "@/lib/services/orders";

interface OrdersTableProps {
  onViewAll: () => void;
  showAll?: boolean;
}

const statusConfig: Record<
  OrderStatus,
  { label: string; color: string }
> = {
  pending: { label: "Pendiente", color: "blue" },
  confirmed: { label: "Confirmado", color: "blue" },
  preparing: { label: "Preparando", color: "amber" },
  ready: { label: "Listo", color: "green" },
  delivered: { label: "Entregado", color: "green" },
  cancelled: { label: "Cancelado", color: "amber" },
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(Number(value));
  } catch {
    return `${currency} ${Number(value).toLocaleString("es-CL")}`;
  }
}

export default function OrdersTable({
  onViewAll,
  showAll = false,
}: OrdersTableProps) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  async function loadOrders(isRefresh = false) {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const data = await getOrders();
      setOrders(data);
    } catch (err) {
      console.error("Error cargando pedidos:", err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los pedidos."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    let mounted = true;

    async function initialize() {
      try {
        setLoading(true);
        setError("");

        const data = await getOrders();

        if (mounted) {
          setOrders(data);
        }
      } catch (err) {
        console.error("Error cargando pedidos:", err);

        if (mounted) {
          setError(
            err instanceof Error
              ? err.message
              : "No fue posible cargar los pedidos."
          );
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    initialize();

    return () => {
      mounted = false;
    };
  }, []);

  const visibleOrders = showAll
    ? orders
    : orders.slice(0, 4);

  return (
    <section className="panel orders-panel orders-table-enhanced">
      <div className="panel-heading">
        <div>
          <h2>
            {showAll ? "Todos los pedidos" : "Pedidos recientes"}
          </h2>

          <p>
            {loading
              ? "Cargando pedidos..."
              : `${orders.length} pedidos registrados`}
          </p>
        </div>

        <div className="orders-actions">
          <button
            className="more-button"
            aria-label="Actualizar pedidos"
            onClick={() => loadOrders(true)}
            disabled={refreshing || loading}
            title="Actualizar"
          >
            <RefreshCw
              size={20}
              className={refreshing ? "spin" : ""}
            />
          </button>

          {!showAll && (
            <button
              className="text-action"
              onClick={onViewAll}
            >
              Ver todos <ArrowUpRight size={18} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="orders-message">
          Cargando pedidos del restaurante...
        </div>
      ) : error ? (
        <div className="orders-message">
          <p className="orders-error">{error}</p>

          <button
            className="text-action"
            onClick={() => loadOrders()}
          >
            Intentar nuevamente
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div className="orders-message">
          <h3>No hay pedidos todavía</h3>
          <p>
            Cuando registres un pedido, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="table-scroll">
          <table className="orders-table">
            <thead>
              <tr>
                <th>PEDIDO</th>
                <th>CLIENTE</th>
                <th>MESA</th>
                <th>TOTAL</th>
                <th>ESTADO</th>
              </tr>
            </thead>

            <tbody>
              {visibleOrders.map((order) => {
                const status = statusConfig[order.status];
                const itemCount = order.order_items?.length ?? 0;

                return (
                  <tr key={order.id}>
                    <td>
                      <strong className="order-number">
                        #{order.order_number}
                      </strong>

                      <span className="order-item-count">
                        {itemCount}{" "}
                        {itemCount === 1 ? "producto" : "productos"}
                      </span>
                    </td>

                    <td className="order-customer">
                      {order.customer_name || "Cliente sin nombre"}
                    </td>

                    <td className="order-table-label">
                      {order.table_label || "Sin mesa"}
                    </td>

                    <td className="order-total">
                      {formatCurrency(order.total, order.currency)}
                    </td>

                    <td>
                      <span
                        className={`status-pill status-${status.color}`}
                      >
                        <i />
                        {status.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <style jsx global>{`
        .orders-table-enhanced .panel-heading h2 {
          font-size: 21px !important;
          font-weight: 700 !important;
        }

        .orders-table-enhanced .panel-heading p {
          font-size: 14px !important;
        }

        .orders-table-enhanced .orders-actions {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .orders-table-enhanced .orders-table {
          width: 100%;
          border-collapse: collapse;
        }

        .orders-table-enhanced .orders-table thead th {
          font-size: 14px !important;
          font-weight: 700 !important;
          padding: 17px 12px !important;
          letter-spacing: 0.04em;
        }

        .orders-table-enhanced .orders-table tbody td {
          font-size: 16px !important;
          padding: 19px 12px !important;
          line-height: 1.5;
        }

        .orders-table-enhanced .order-number {
          display: block;
          font-size: 17px !important;
          font-weight: 800 !important;
        }

        .orders-table-enhanced .order-item-count {
          display: block;
          margin-top: 5px;
          font-size: 14px !important;
        }

        .orders-table-enhanced .order-customer,
        .orders-table-enhanced .order-table-label {
          font-size: 16px !important;
          font-weight: 500;
        }

        .orders-table-enhanced .order-total {
          font-size: 17px !important;
          font-weight: 800 !important;
          white-space: nowrap;
        }

        .orders-table-enhanced .status-pill {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px !important;
          font-size: 14px !important;
          font-weight: 700 !important;
          border-radius: 8px;
          white-space: nowrap;
        }

        .orders-table-enhanced .status-pill i {
          width: 8px;
          height: 8px;
          flex-shrink: 0;
        }

        .orders-table-enhanced .orders-message {
          padding: 32px 20px;
          text-align: center;
          font-size: 16px;
        }

        .orders-table-enhanced .orders-message h3 {
          font-size: 19px;
          margin-bottom: 8px;
        }

        .orders-table-enhanced .orders-error {
          color: #dc2626;
          font-size: 16px;
        }

        .orders-table-enhanced .more-button svg {
          width: 20px;
          height: 20px;
        }

        .orders-table-enhanced .text-action {
          font-size: 15px;
        }

        @media (max-width: 768px) {
          .orders-table-enhanced .table-scroll {
            overflow-x: auto;
          }

          .orders-table-enhanced .orders-table {
            min-width: 650px;
          }

          .orders-table-enhanced .orders-table tbody td {
            padding: 15px 10px !important;
          }
        }
      `}</style>
    </section>
  );
}

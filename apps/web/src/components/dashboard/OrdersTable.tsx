
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
  pending: {
    label: "Pendiente",
    color: "blue",
  },
  confirmed: {
    label: "Confirmado",
    color: "blue",
  },
  preparing: {
    label: "Preparando",
    color: "amber",
  },
  ready: {
    label: "Listo",
    color: "green",
  },
  delivered: {
    label: "Entregado",
    color: "green",
  },
  cancelled: {
    label: "Cancelado",
    color: "amber",
  },
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
    <section className="panel orders-panel">
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

        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button
            className="more-button"
            aria-label="Actualizar pedidos"
            onClick={() => loadOrders(true)}
            disabled={refreshing || loading}
            title="Actualizar"
          >
            <RefreshCw
              size={17}
              className={refreshing ? "spin" : ""}
            />
          </button>

          {!showAll && (
            <button
              className="text-action"
              onClick={onViewAll}
            >
              Ver todos <ArrowUpRight size={15} />
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div style={{ padding: "32px", textAlign: "center" }}>
          Cargando pedidos del restaurante...
        </div>
      ) : error ? (
        <div style={{ padding: "24px" }}>
          <p style={{ color: "#dc2626" }}>{error}</p>

          <button
            className="text-action"
            onClick={() => loadOrders()}
          >
            Intentar nuevamente
          </button>
        </div>
      ) : orders.length === 0 ? (
        <div style={{ padding: "32px", textAlign: "center" }}>
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
                      <strong>
                        #{order.order_number}
                      </strong>

                      <span>
                        {itemCount}{" "}
                        {itemCount === 1 ? "producto" : "productos"}
                      </span>
                    </td>

                    <td>
                      {order.customer_name || "Cliente sin nombre"}
                    </td>

                    <td>
                      {order.table_label || "Sin mesa"}
                    </td>

                    <td className="order-total">
                      {formatCurrency(
                        order.total,
                        order.currency
                      )}
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
    </section>
  );
}

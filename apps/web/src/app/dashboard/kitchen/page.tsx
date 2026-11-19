
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ChefHat,
  Clock,
  RefreshCw,
  CheckCircle2,
  Play,
  AlertCircle,
  Utensils,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type OrderItem = {
  id: string;
  product_name: string;
  preparation_area: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_status: "pending" | "preparing" | "ready" | "cancelled";
  notes: string | null;
};

type Order = {
  id: string;
  order_number: number;
  customer_name: string;
  table_label: string;
  status: string;
  notes: string | null;
  created_at: string;
  order_items: OrderItem[];
};

export default function KitchenPage() {
  const [restaurantId, setRestaurantId] = useState("");
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyItem, setBusyItem] = useState<string | null>(null);

  const supabase = createClient();

  const loadOrders = useCallback(async () => {
    if (!restaurantId) return;

    const { data, error: queryError } = await supabase
      .from("orders")
      .select(`
        id,
        order_number,
        customer_name,
        table_label,
        status,
        notes,
        created_at,
        order_items!inner (
          id,
          product_name,
          preparation_area,
          quantity,
          unit_price,
          line_total,
          item_status,
          notes
        )
      `)
      .eq("restaurant_id", restaurantId)
      .eq("order_items.preparation_area", "kitchen")
      .neq("status", "cancelled")
      .order("created_at", { ascending: true });

    if (queryError) {
      setError(queryError.message);
      return;
    }

    const validOrders = ((data ?? []) as unknown as Order[])
      .map((order) => ({
        ...order,
        order_items: order.order_items.filter(
          (item) =>
            item.preparation_area === "kitchen" &&
            item.item_status !== "cancelled"
        ),
      }))
      .filter((order) => order.order_items.length > 0);

    setOrders(validOrders);
    setError("");
  }, [restaurantId, supabase]);

  useEffect(() => {
    let active = true;

    async function loadRestaurant() {
      try {
        const response = await fetch("/api/active-restaurant", {
          cache: "no-store",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.error || "No se pudo identificar el restaurante."
          );
        }

        if (active) {
          setRestaurantId(result.restaurant.id);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Error al cargar el restaurante."
          );
          setLoading(false);
        }
      }
    }

    loadRestaurant();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!restaurantId) return;

    let active = true;

    async function refresh() {
      if (active) {
        await loadOrders();
        if (active) setLoading(false);
      }
    }

    refresh();

    const channel = supabase
      .channel(`kitchen-orders-${restaurantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          refresh();
        }
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "order_items",
          filter: `restaurant_id=eq.${restaurantId}`,
        },
        () => {
          refresh();
        }
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [restaurantId, loadOrders, supabase]);

  async function updateItemStatus(
    itemId: string,
    nextStatus: "preparing" | "ready"
  ) {
    setBusyItem(itemId);
    setError("");

    try {
      const { error: rpcError } = await supabase.rpc(
        "update_order_item_status",
        {
          p_item_id: itemId,
          p_status: nextStatus,
        }
      );

      if (rpcError) throw rpcError;

      await loadOrders();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el producto."
      );
    } finally {
      setBusyItem(null);
    }
  }

  const pendingCount = orders.reduce(
    (total, order) =>
      total +
      order.order_items.filter((item) => item.item_status === "pending")
        .length,
    0
  );

  const preparingCount = orders.reduce(
    (total, order) =>
      total +
      order.order_items.filter((item) => item.item_status === "preparing")
        .length,
    0
  );

  const readyCount = orders.reduce(
    (total, order) =>
      total +
      order.order_items.filter((item) => item.item_status === "ready").length,
    0
  );

  function formatTime(value: string) {
    return new Date(value).toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <main className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <div className="rounded-xl bg-orange-100 p-3 text-orange-600">
                <ChefHat size={28} />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-slate-900 md:text-3xl">
                  Cocina
                </h1>
                <p className="text-sm text-slate-500">
                  Gestión de pedidos y preparación
                </p>
              </div>
            </div>
          </div>

          <button
            onClick={() => loadOrders()}
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100"
          >
            <RefreshCw size={17} />
            Actualizar
          </button>
        </header>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Pendientes</p>
            <p className="mt-2 text-3xl font-bold text-orange-600">
              {pendingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">En preparación</p>
            <p className="mt-2 text-3xl font-bold text-blue-600">
              {preparingCount}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">Listos</p>
            <p className="mt-2 text-3xl font-bold text-green-600">
              {readyCount}
            </p>
          </div>
        </section>

        {error && (
          <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            <AlertCircle size={20} className="shrink-0" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl bg-white p-12 text-center text-slate-500">
            Cargando pedidos de cocina...
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
            <Utensils className="mx-auto text-slate-300" size={42} />
            <h2 className="mt-4 text-lg font-semibold text-slate-800">
              No hay pedidos para Cocina
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Los nuevos productos aparecerán aquí automáticamente.
            </p>
          </div>
        ) : (
          <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {orders.map((order) => (
              <article
                key={order.id}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 p-5">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Pedido
                    </p>
                    <h2 className="text-2xl font-bold text-slate-900">
                      #{order.order_number}
                    </h2>
                    <p className="mt-1 text-sm text-slate-600">
                      {order.table_label || "Mesa sin identificar"}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center justify-end gap-1 text-sm text-slate-500">
                      <Clock size={15} />
                      {formatTime(order.created_at)}
                    </div>
                    <p className="mt-1 text-sm font-medium text-slate-700">
                      {order.customer_name}
                    </p>
                  </div>
                </div>

                <div className="space-y-3 p-5">
                  {order.notes && (
                    <div className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
                      <strong>Observación general:</strong> {order.notes}
                    </div>
                  )}

                  {order.order_items.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-xl border border-slate-200 p-4"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-lg font-bold text-slate-900">
                            {item.quantity} × {item.product_name}
                          </p>

                          {item.notes && (
                            <p className="mt-1 text-sm text-slate-500">
                              {item.notes}
                            </p>
                          )}
                        </div>

                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            item.item_status === "pending"
                              ? "bg-orange-100 text-orange-700"
                              : item.item_status === "preparing"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-green-100 text-green-700"
                          }`}
                        >
                          {item.item_status === "pending"
                            ? "Pendiente"
                            : item.item_status === "preparing"
                            ? "En preparación"
                            : "Listo"}
                        </span>
                      </div>

                      <div className="mt-4">
                        {item.item_status === "pending" && (
                          <button
                            disabled={busyItem === item.id}
                            onClick={() =>
                              updateItemStatus(item.id, "preparing")
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
                          >
                            <Play size={17} />
                            {busyItem === item.id
                              ? "Actualizando..."
                              : "Comenzar preparación"}
                          </button>
                        )}

                        {item.item_status === "preparing" && (
                          <button
                            disabled={busyItem === item.id}
                            onClick={() =>
                              updateItemStatus(item.id, "ready")
                            }
                            className="flex w-full items-center justify-center gap-2 rounded-xl bg-green-600 px-4 py-3 font-semibold text-white hover:bg-green-700 disabled:opacity-50"
                          >
                            <CheckCircle2 size={18} />
                            {busyItem === item.id
                              ? "Actualizando..."
                              : "Marcar como listo"}
                          </button>
                        )}

                        {item.item_status === "ready" && (
                          <div className="flex items-center justify-center gap-2 rounded-xl bg-green-50 px-4 py-3 font-semibold text-green-700">
                            <CheckCircle2 size={18} />
                            Producto terminado
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

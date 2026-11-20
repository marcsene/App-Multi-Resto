
"use client";

import { useCallback, useEffect, useState } from "react";
import {
  WalletCards,
  RefreshCw,
  Receipt,
  CreditCard,
  Banknote,
  ArrowLeft,
  CheckCircle2,
  Clock,
  Loader2,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";
import { getActiveRestaurantId } from "@/lib/services/restaurant";

type TableSession = {
  id: string;
  table_id: string;
  status: string;
  opened_at: string;
};

type RestaurantTable = {
  id: string;
  table_number: number;
  name: string | null;
};

type SessionOrder = {
  id: string;
  order_number: number;
  customer_name: string | null;
  total: number;
  currency: string;
  status: string;
  created_at: string;
  table_session_id: string;
};

type SessionData = {
  session: TableSession;
  table: RestaurantTable;
  orders: SessionOrder[];
  total: number;
  currency: string;
};

type Payment = {
  id: string;
  amount: number;
  payment_method: string;
  status: string;
  reference: string | null;
  created_at: string;
};

type Bill = {
  id: string;
  bill_number: number;
  total: number;
  currency: string;
  status: string;
};

function formatCurrency(value: number, currency: string) {
  try {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(value);
  } catch {
    return `${currency} ${value.toLocaleString("es-CL")}`;
  }
}

function paymentMethodLabel(method: string) {
  const methods: Record<string, string> = {
    cash: "Efectivo",
    card: "Tarjeta",
    transfer: "Transferencia",
    online: "Pago online",
    other: "Otro",
  };

  return methods[method] || method;
}

export default function CajaManagement() {
  const [sessions, setSessions] = useState<SessionData[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedSession, setSelectedSession] =
    useState<SessionData | null>(null);

  const [bill, setBill] = useState<Bill | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);

  const [loadingBill, setLoadingBill] = useState(false);
  const [savingPayment, setSavingPayment] = useState(false);

  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [paymentError, setPaymentError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const loadSessions = useCallback(async (refresh = false) => {
    try {
      if (refresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError("");

      const supabase = createClient();
      const restaurantId = await getActiveRestaurantId();

      const { data: sessionData, error: sessionError } =
        await supabase
          .from("table_sessions")
          .select("id, table_id, status, opened_at")
          .eq("restaurant_id", restaurantId)
          .in("status", ["open", "billing"])
          .order("opened_at", { ascending: false });

      if (sessionError) throw sessionError;

      const activeSessions = (sessionData ?? []) as TableSession[];

      if (activeSessions.length === 0) {
        setSessions([]);
        return;
      }

      const tableIds = [
        ...new Set(activeSessions.map((session) => session.table_id)),
      ];

      const sessionIds = activeSessions.map((session) => session.id);

      const [
        { data: tableData, error: tableError },
        { data: orderData, error: orderError },
      ] = await Promise.all([
        supabase
          .from("restaurant_tables")
          .select("id, table_number, name")
          .eq("restaurant_id", restaurantId)
          .in("id", tableIds),

        supabase
          .from("orders")
          .select(
            "id, order_number, customer_name, total, currency, status, created_at, table_session_id"
          )
          .eq("restaurant_id", restaurantId)
          .in("table_session_id", sessionIds)
          .neq("status", "cancelled")
          .order("created_at", { ascending: true }),
      ]);

      if (tableError) throw tableError;
      if (orderError) throw orderError;

      const tables = (tableData ?? []) as RestaurantTable[];
      const orders = (orderData ?? []) as SessionOrder[];

      const result = activeSessions
        .map((session) => {
          const table = tables.find(
            (item) => item.id === session.table_id
          );

          if (!table) return null;

          const sessionOrders = orders.filter(
            (order) => order.table_session_id === session.id
          );

          const currencies = [
            ...new Set(sessionOrders.map((order) => order.currency)),
          ];

          if (currencies.length > 1) {
            throw new Error(
              `La mesa ${table.table_number} tiene pedidos con monedas diferentes.`
            );
          }

          const currency = currencies[0] || "CLP";

          return {
            session,
            table,
            orders: sessionOrders,
            total: sessionOrders.reduce(
              (sum, order) => sum + Number(order.total || 0),
              0
            ),
            currency,
          };
        })
        .filter((item): item is SessionData => item !== null);

      setSessions(result);
    } catch (err) {
      console.error("Error cargando Caja:", err);
      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar las sesiones."
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  async function openBill(session: SessionData) {
    try {
      setLoadingBill(true);
      setPaymentError("");
      setSuccessMessage("");
      setSelectedSession(session);
      setBill(null);
      setPayments([]);
      setAmount("");
      setReference("");

      const supabase = createClient();

      const { data, error } = await supabase.rpc(
        "open_table_session_bill",
        {
          p_session_id: session.session.id,
        }
      );

      if (error) throw error;

      const result = data as {
        bill_id: string;
        bill_number: number;
        total: number;
        currency: string;
        status: string;
      };

      const currentBill: Bill = {
        id: result.bill_id,
        bill_number: result.bill_number,
        total: Number(result.total),
        currency: result.currency,
        status: result.status,
      };

      setBill(currentBill);

      await loadPayments(currentBill.id);
    } catch (err) {
      console.error("Error abriendo cuenta:", err);
      setPaymentError(
        err instanceof Error
          ? err.message
          : "No fue posible generar la cuenta."
      );
    } finally {
      setLoadingBill(false);
    }
  }

  async function loadPayments(billId: string) {
    const supabase = createClient();

    const { data, error } = await supabase
      .from("payment_transactions")
      .select(
        "id, amount, payment_method, status, reference, created_at"
      )
      .eq("bill_id", billId)
      .eq("status", "completed")
      .order("created_at", { ascending: false });

    if (error) throw error;

    setPayments((data ?? []) as Payment[]);
  }

  const totalPaid = payments.reduce(
    (sum, payment) => sum + Number(payment.amount),
    0
  );

  const remaining = Math.max(
    0,
    Number(bill?.total ?? 0) - totalPaid
  );

  async function registerPayment() {
    if (!bill) return;

    const paymentAmount = Number(amount);

    if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
      setPaymentError("Ingresa un importe válido.");
      return;
    }

    if (paymentAmount > remaining) {
      setPaymentError("El importe supera el saldo pendiente.");
      return;
    }

    try {
      setSavingPayment(true);
      setPaymentError("");
      setSuccessMessage("");

      const supabase = createClient();

      const { data, error } = await supabase.rpc(
        "register_restaurant_payment",
        {
          p_bill_id: bill.id,
          p_amount: paymentAmount,
          p_payment_method: paymentMethod,
          p_reference: reference.trim() || null,
          p_notes: null,
        }
      );

      if (error) throw error;

      const result = data as {
        success: boolean;
        remaining: number;
        bill_status: string;
        session_closed: boolean;
        table_released: boolean;
      };

      if (!result.success) {
        throw new Error("No se pudo confirmar el pago.");
      }

      await loadPayments(bill.id);

      setBill((current) =>
        current
          ? { ...current, status: result.bill_status }
          : current
      );

      setAmount("");
      setReference("");

      setSuccessMessage(
        result.bill_status === "paid"
          ? result.session_closed && result.table_released
            ? "¡Pago confirmado! La sesión se cerró y la mesa quedó liberada."
            : "¡Cuenta pagada correctamente!"
          : "Pago registrado correctamente."
      );

      await loadSessions(true);
    } catch (err) {
      console.error("Error registrando pago:", err);
      setPaymentError(
        err instanceof Error
          ? err.message
          : "No fue posible registrar el pago."
      );
    } finally {
      setSavingPayment(false);
    }
  }

  if (selectedSession) {
    return (
      <section className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => {
                setSelectedSession(null);
                setBill(null);
                setPayments([]);
                setPaymentError("");
                setSuccessMessage("");
              }}
              className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700 hover:bg-slate-50"
              aria-label="Volver a Caja"
            >
              <ArrowLeft size={20} />
            </button>

            <div>
              <h1 className="text-2xl font-bold text-slate-900">
                Cuenta · Mesa {selectedSession.table.table_number}
              </h1>
              <p className="text-sm text-slate-500">
                {selectedSession.table.name || "Mesa"} ·{" "}
                {selectedSession.orders.length} pedidos
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setSelectedSession(null);
              setBill(null);
              setPayments([]);
              setPaymentError("");
              setSuccessMessage("");
            }}
            className="rounded-xl border border-slate-200 bg-white p-3 text-slate-700 hover:bg-slate-50"
            aria-label="Volver a Caja"
          >
            <ArrowLeft size={20} />
          </button>
        </div>

        {loadingBill ? (
          <div className="flex items-center justify-center gap-3 rounded-2xl border bg-white p-10 text-slate-500">
            <Loader2 className="animate-spin" />
            Generando cuenta...
          </div>
        ) : paymentError && !bill ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
            {paymentError}
          </div>
        ) : bill ? (
          <div className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="mb-4 flex items-center gap-2">
                  <Receipt className="text-indigo-600" size={21} />
                  <h2 className="text-lg font-bold text-slate-900">
                    Detalle de pedidos
                  </h2>
                </div>

                <div className="divide-y divide-slate-100">
                  {selectedSession.orders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center justify-between gap-3 py-4"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          Pedido #{order.order_number}
                        </p>
                        <p className="text-sm text-slate-500">
                          {order.customer_name || "Cliente"} ·{" "}
                          {new Date(order.created_at).toLocaleString(
                            "es-CL"
                          )}
                        </p>
                      </div>

                      <strong className="whitespace-nowrap text-slate-900">
                        {formatCurrency(
                          Number(order.total),
                          order.currency
                        )}
                      </strong>
                    </div>
                  ))}
                </div>

                <div className="mt-4 flex justify-between border-t border-slate-200 pt-4">
                  <span className="font-bold text-slate-700">
                    Total de la cuenta
                  </span>
                  <strong className="text-xl text-slate-900">
                    {formatCurrency(
                      bill.total,
                      bill.currency
                    )}
                  </strong>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-4 text-lg font-bold text-slate-900">
                  Historial de pagos
                </h2>

                {payments.length === 0 ? (
                  <p className="py-5 text-center text-sm text-slate-500">
                    Todavía no hay pagos registrados.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {payments.map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <p className="font-semibold text-slate-800">
                            {paymentMethodLabel(
                              payment.payment_method
                            )}
                          </p>
                          <p className="text-xs text-slate-500">
                            {new Date(
                              payment.created_at
                            ).toLocaleString("es-CL")}
                            {payment.reference
                              ? ` · Ref. ${payment.reference}`
                              : ""}
                          </p>
                        </div>

                        <strong className="text-green-700">
                          {formatCurrency(
                            Number(payment.amount),
                            bill.currency
                          )}
                        </strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h2 className="mb-5 text-lg font-bold text-slate-900">
                  Resumen de cuenta
                </h2>

                <div className="space-y-4">
                  <div className="flex justify-between text-slate-600">
                    Total
                    <strong className="text-slate-900">
                      {formatCurrency(bill.total, bill.currency)}
                    </strong>
                  </div>

                  <div className="flex justify-between text-slate-600">
                    Pagado
                    <strong className="text-green-700">
                      {formatCurrency(totalPaid, bill.currency)}
                    </strong>
                  </div>

                  <div className="border-t border-slate-200 pt-4">
                    <p className="text-sm text-slate-500">
                      Saldo pendiente
                    </p>
                    <p className="mt-1 text-3xl font-extrabold text-slate-900">
                      {formatCurrency(remaining, bill.currency)}
                    </p>
                  </div>

                  {bill.status === "paid" ? (
                    <div className="flex items-center gap-2 rounded-xl bg-green-50 p-4 font-semibold text-green-700">
                      <CheckCircle2 size={20} />
                      Cuenta completamente pagada
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 rounded-xl bg-amber-50 p-4 font-semibold text-amber-700">
                      <Clock size={20} />
                      {bill.status === "partially_paid"
                        ? "Pago parcial"
                        : "Pendiente de pago"}
                    </div>
                  )}
                </div>
              </div>

              {remaining > 0 && bill.status !== "paid" && (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <h2 className="mb-5 text-lg font-bold text-slate-900">
                    Registrar pago
                  </h2>

                  <div className="space-y-4">
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Importe del pago
                      </label>
                      <input
                        type="number"
                        min="1"
                        max={remaining}
                        step="1"
                        value={amount}
                        onChange={(event) =>
                          setAmount(event.target.value)
                        }
                        placeholder="Ej. 10000"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Método de pago
                      </label>
                      <select
                        value={paymentMethod}
                        onChange={(event) =>
                          setPaymentMethod(event.target.value)
                        }
                        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 outline-none focus:border-indigo-500"
                      >
                        <option value="cash">Efectivo</option>
                        <option value="card">Tarjeta</option>
                        <option value="transfer">Transferencia</option>
                        <option value="other">Otro</option>
                      </select>
                    </div>

                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-700">
                        Referencia (opcional)
                      </label>
                      <input
                        type="text"
                        value={reference}
                        onChange={(event) =>
                          setReference(event.target.value)
                        }
                        placeholder="N.º de operación"
                        className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-indigo-500"
                      />
                    </div>

                    {paymentError && (
                      <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
                        {paymentError}
                      </p>
                    )}

                    {successMessage && (
                      <p className="rounded-lg bg-green-50 p-3 text-sm font-medium text-green-700">
                        {successMessage}
                      </p>
                    )}

                    <button
                      onClick={registerPayment}
                      disabled={savingPayment || !amount}
                      className="flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {savingPayment ? (
                        <Loader2 size={19} className="animate-spin" />
                      ) : (
                        <CreditCard size={19} />
                      )}
                      {savingPayment
                        ? "Registrando..."
                        : "Confirmar pago"}
                    </button>

                    <p className="text-xs leading-5 text-slate-500">
                      Confirma el pago únicamente después de recibir
                      el dinero o verificar la transferencia.
                    </p>
                  </div>
                </div>
              )}

              {successMessage && remaining === 0 && (
                <div className="rounded-xl bg-green-50 p-4 text-sm font-semibold text-green-700">
                  {successMessage}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            No fue posible cargar la cuenta.
          </div>
        )}
      </section>
    );
  }

  const totalPending = sessions.reduce(
    (sum, session) => sum + session.total,
    0
  );

  const totalOrders = sessions.reduce(
    (sum, session) => sum + session.orders.length,
    0
  );

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-wider text-indigo-600">
            Gestión financiera
          </p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Caja
          </h1>
          <p className="mt-2 text-slate-500">
            Consulta cuentas y registra los pagos de tus mesas.
          </p>
        </div>

        <button
          onClick={() => loadSessions(true)}
          disabled={refreshing || loading}
          className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-50"
        >
          <RefreshCw
            size={18}
            className={refreshing ? "animate-spin" : ""}
          />
          Actualizar
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Mesas con sesión abierta
            </p>
            <WalletCards className="text-indigo-600" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {sessions.length}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Pedidos activos
            </p>
            <Receipt className="text-blue-600" />
          </div>
          <p className="mt-3 text-3xl font-extrabold text-slate-900">
            {totalOrders}
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-slate-500">
              Consumo acumulado
            </p>
            <Banknote className="text-green-600" />
          </div>
          <p className="mt-3 text-2xl font-extrabold text-slate-900">
            {formatCurrency(totalPending, "CLP")}
          </p>
        </div>
      </div>

      <div>
        <div className="mb-4">
          <h2 className="text-xl font-bold text-slate-900">
            Cuentas por mesa
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Selecciona una mesa para consultar y cobrar sus pedidos.
          </p>
        </div>

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-slate-500">
            <Loader2 className="mx-auto mb-3 animate-spin" size={26} />
            Cargando mesas y sesiones...
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-700">
            <p>{error}</p>
            <button
              onClick={() => loadSessions()}
              className="mt-3 font-semibold underline"
            >
              Intentar nuevamente
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <WalletCards
              className="mx-auto mb-3 text-slate-400"
              size={36}
            />
            <h3 className="font-bold text-slate-800">
              No hay mesas con sesiones abiertas
            </h3>
            <p className="mt-2 text-sm text-slate-500">
              Cuando se registren nuevos pedidos, aparecerán aquí.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {sessions.map((item) => (
              <article
                key={item.session.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-indigo-300 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-500">
                      {item.table.name || "Mesa"}
                    </p>
                    <h3 className="mt-1 text-2xl font-extrabold text-slate-900">
                      Mesa {item.table.table_number}
                    </h3>
                  </div>

                  <span className="rounded-full bg-green-50 px-3 py-1 text-xs font-bold text-green-700">
                    {item.session.status === "billing"
                      ? "Por pagar"
                      : "Ocupada"}
                  </span>
                </div>

                <div className="mt-5 space-y-2 border-t border-slate-100 pt-4">
                  <div className="flex justify-between text-sm text-slate-500">
                    Pedidos
                    <strong className="text-slate-800">
                      {item.orders.length}
                    </strong>
                  </div>

                  <div className="flex justify-between text-sm text-slate-500">
                    Inicio de sesión
                    <strong className="text-right text-slate-800">
                      {new Date(
                        item.session.opened_at
                      ).toLocaleTimeString("es-CL", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </strong>
                  </div>
                </div>

                <div className="mt-5 rounded-xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">
                    Total de consumo
                  </p>
                  <p className="mt-1 text-2xl font-extrabold text-slate-900">
                    {formatCurrency(item.total, item.currency)}
                  </p>
                </div>

                <button
                  onClick={() => openBill(item)}
                  disabled={item.orders.length === 0}
                  className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Receipt size={18} />
                  {item.orders.length === 0
                    ? "Sin pedidos"
                    : "Ver cuenta y cobrar"}
                </button>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}


import { createClient } from "@/lib/supabase/client";
import { getActiveRestaurantId } from "@/lib/services/restaurant";

// ============================================================
// TYPES
// ============================================================

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "preparing"
  | "ready"
  | "delivered"
  | "cancelled";

export type OrderItemStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "cancelled";

export type PreparationArea = "kitchen" | "bar";

export interface CreateOrderItem {
  product_name: string;
  preparation_area: PreparationArea;
  quantity: number;
  unit_price: number;
  notes?: string | null;
}

export interface CreateOrderInput {
  items: CreateOrderItem[];
  customerName?: string;
  customerPhone?: string;
  tableLabel?: string;
  notes?: string;
}

export interface OrderItem {
  id: string;
  order_id: string;
  restaurant_id: string;
  product_id: string | null;
  product_name: string;
  preparation_area: PreparationArea;
  quantity: number;
  unit_price: number;
  line_total: number;
  item_status: OrderItemStatus;
  notes: string | null;
  created_at: string;
}

export interface Order {
  id: string;
  restaurant_id: string;
  order_number: number;
  created_by: string;
  customer_name: string | null;
  customer_phone: string | null;
  table_label: string | null;

  // Identificadores de mesa y sesión para el módulo Caja.
  table_id: string | null;
  table_session_id: string | null;

  source: "staff" | "qr" | "online";
  status: OrderStatus;
  currency: string;
  subtotal: number;
  discount: number;
  tax: number;
  total: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
  order_items: OrderItem[];
}

// ============================================================
// GET ORDERS
// ============================================================

export async function getOrders(): Promise<Order[]> {
  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  const { data, error } = await supabase
    .from("orders")
    .select(`
      id,
      restaurant_id,
      order_number,
      created_by,
      customer_name,
      customer_phone,
      table_label,
      table_id,
      table_session_id,
      source,
      status,
      currency,
      subtotal,
      discount,
      tax,
      total,
      notes,
      created_at,
      updated_at,
      order_items (
        id,
        order_id,
        restaurant_id,
        product_id,
        product_name,
        preparation_area,
        quantity,
        unit_price,
        line_total,
        item_status,
        notes,
        created_at
      )
    `)
    .eq("restaurant_id", restaurantId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error consultando pedidos:", error);
    throw new Error("No fue posible cargar los pedidos.");
  }

  return (data ?? []) as unknown as Order[];
}

// ============================================================
// CREATE ORDER
// ============================================================

export async function createOrder(
  input: CreateOrderInput
): Promise<string> {
  if (!input.items.length) {
    throw new Error("El pedido debe contener al menos un producto.");
  }

  if (input.items.length > 100) {
    throw new Error("El pedido supera el máximo de productos permitido.");
  }

  const supabase = createClient();
  const restaurantId = await getActiveRestaurantId();

  const { data, error } = await supabase.rpc(
    "create_restaurant_order",
    {
      p_restaurant_id: restaurantId,
      p_items: input.items,
      p_customer_name: input.customerName ?? null,
      p_customer_phone: input.customerPhone ?? null,
      p_table_label: input.tableLabel ?? null,
      p_notes: input.notes ?? null,
    }
  );

  if (error) {
    console.error("Error creando pedido:", error);
    throw new Error(error.message || "No fue posible crear el pedido.");
  }

  if (!data) {
    throw new Error("Supabase no devolvió el identificador del pedido.");
  }

  return data as string;
}

// ============================================================
// UPDATE ORDER STATUS
// ============================================================

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc(
    "update_restaurant_order_status",
    {
      p_order_id: orderId,
      p_status: status,
    }
  );

  if (error) {
    console.error("Error actualizando pedido:", error);
    throw new Error(error.message || "No fue posible actualizar el pedido.");
  }
}

// ============================================================
// UPDATE ORDER ITEM STATUS
// ============================================================

export async function updateOrderItemStatus(
  itemId: string,
  status: OrderItemStatus
): Promise<void> {
  const supabase = createClient();

  const { error } = await supabase.rpc(
    "update_order_item_status",
    {
      p_item_id: itemId,
      p_status: status,
    }
  );

  if (error) {
    console.error("Error actualizando producto:", error);
    throw new Error(
      error.message || "No fue posible actualizar el producto."
    );
  }
}

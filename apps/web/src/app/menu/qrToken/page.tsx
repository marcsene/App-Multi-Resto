"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ShoppingBag,
  Search,
  Plus,
  Minus,
  X,
  UtensilsCrossed,
  MapPin,
  LoaderCircle,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Users,
} from "lucide-react";

import { createClient } from "@/lib/supabase/client";

// =========================================================
// TIPOS
// =========================================================

type Restaurant = {
  id: string;
  name: string;
  slug: string;
  currency: string;
};

type RestaurantTable = {
  id: string;
  table_number: number;
  name: string | null;
  capacity: number;
  location: string | null;
  status: string;
};

type Category = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  sort_order: number;
};

type Product = {
  id: string;
  category_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price: number;
  preparation_area: "kitchen" | "bar";
};

type PublicMenu = {
  restaurant: Restaurant;
  table: RestaurantTable;
  categories: Category[];
  products: Product[];
};

type CartItem = {
  id: string;
  product: Product;
  quantity: number;
  notes?: string | null;
};

type ParticipantSession = {
  session_id: string;
  participant_token: string;
  is_responsible: boolean;
  display_name: string;
  table_number: number;
};

type DrawerView = "cart" | "checkout" | "success";

type OrderSuccess = {
  order_number: number;
  total: number;
  pin?: string;
  is_first_order: boolean;
};

// =========================================================
// CONFIGURACIÓN DE SESIÓN
// =========================================================

const STORAGE_PREFIX = "app-multi-resto-session:";

// =========================================================
// MANEJO SEGURO DE ERRORES
// =========================================================

function errorText(error: unknown): string {
  if (
    error &&
    typeof error === "object" &&
    "message" in error
  ) {
    return String(
      (error as { message?: unknown }).message ??
        "Error inesperado."
    );
  }

  return error instanceof Error
    ? error.message
    : "Ocurrió un error inesperado.";
}

// =========================================================
// ALMACENAMIENTO SEGURO
// Evita que SecurityError interrumpa el funcionamiento.
// =========================================================

function safeGetSession(key: string): string | null {
  try {
    if (typeof window === "undefined") return null;

    return window.sessionStorage.getItem(key);
  } catch (error) {
    console.warn(
      "No se pudo leer sessionStorage:",
      error
    );

    return null;
  }
}

function safeSetSession(
  key: string,
  value: string
): boolean {
  try {
    if (typeof window === "undefined") return false;

    window.sessionStorage.setItem(key, value);

    return true;
  } catch (error) {
    console.warn(
      "No se pudo guardar sessionStorage:",
      error
    );

    return false;
  }
}

function safeRemoveSession(key: string): void {
  try {
    if (typeof window === "undefined") return;

    window.sessionStorage.removeItem(key);
  } catch (error) {
    console.warn(
      "No se pudo limpiar sessionStorage:",
      error
    );
  }
}

// =========================================================
// COMPONENTE PRINCIPAL
// =========================================================

export default function PublicMenuPage() {
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);

  const [participant, setParticipant] =
    useState<ParticipantSession | null>(null);

  const [tableOccupied, setTableOccupied] = useState(false);
  const [cartLoading, setCartLoading] = useState(false);
  const [cartError, setCartError] = useState("");

  const [cartOpen, setCartOpen] = useState(false);
  const [drawerView, setDrawerView] =
    useState<DrawerView>("cart");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const [sendingOrder, setSendingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const [orderResult, setOrderResult] =
    useState<OrderSuccess | null>(null);

  const [joinName, setJoinName] = useState("");
  const [joinPin, setJoinPin] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState("");
  const [joinAttempts, setJoinAttempts] =
    useState<number | null>(null);

  // =========================================================
  // OBTENER TOKEN DEL QR
  // =========================================================

  const qrToken = useMemo(() => {
    if (typeof window === "undefined") return null;

    return new URLSearchParams(
      window.location.search
    ).get("table");
  }, []);

  const storageKey = qrToken
    ? `${STORAGE_PREFIX}${qrToken}`
    : null;

  // =========================================================
  // CÁLCULOS DEL CARRITO
  // =========================================================

  const cartCount = cart.reduce(
    (sum, item) => sum + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (sum, item) =>
      sum +
      Number(item.product.price) * item.quantity,
    0
  );

  // =========================================================
  // FORMATO DE PRECIOS
  // =========================================================

  const formatPrice = useCallback(
    (price: number) => {
      return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: menu?.restaurant.currency ?? "CLP",
        maximumFractionDigits:
          menu?.restaurant.currency === "CLP" ? 0 : 2,
      }).format(Number(price) || 0);
    },
    [menu?.restaurant.currency]
  );

  // =========================================================
  // OBTENER CARRITO COMPARTIDO
  // =========================================================

  const refreshSharedCart = useCallback(
    async (
      current: ParticipantSession,
      currentMenu: PublicMenu
    ) => {
      const supabase = createClient();

      const { data, error: rpcError } =
        await supabase.rpc("get_shared_cart", {
          p_session_id: current.session_id,
          p_participant_token: current.participant_token,
        });

      if (rpcError) throw rpcError;

      const response = data as {
        success?: boolean;
        error?: string;
        items?: Array<{
          id: string;
          product_id: string;
          product_name: string;
          unit_price: number;
          quantity: number;
          notes?: string | null;
        }>;
      };

      if (!response?.success) {
        throw new Error(
          response?.error ||
            "No pudimos consultar el carrito."
        );
      }

      const mapped: CartItem[] = (
        response.items ?? []
      ).map((item) => {
        const known = currentMenu.products.find(
          (product) => product.id === item.product_id
        );

        const product: Product = known ?? {
          id: item.product_id,
          category_id: "",
          name: item.product_name,
          description: null,
          image_url: null,
          price: Number(item.unit_price),
          preparation_area: "kitchen",
        };

        return {
          id: item.id,
          product: {
            ...product,
            name: item.product_name,
            price: Number(item.unit_price),
          },
          quantity: Number(item.quantity),
          notes: item.notes,
        };
      });

      setCart(mapped);
    },
    []
  );

  // =========================================================
  // CARGAR MENÚ Y RECUPERAR SESIÓN
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      if (!qrToken) {
        setError(
          "No se encontró el código QR de la mesa."
        );

        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        const { data, error: rpcError } =
          await supabase.rpc(
            "get_public_menu_by_qr",
            {
              p_qr_token: qrToken,
            }
          );

        if (rpcError) throw rpcError;

        if (!data) {
          throw new Error(
            "No encontramos el menú asociado a este QR."
          );
        }

        const loaded = data as PublicMenu;

        if (cancelled) return;

        setMenu(loaded);

        // Normalizar el estado recibido desde Supabase.
        const normalizedTableStatus = String(
          loaded.table?.status ?? ""
        )
          .trim()
          .toLocaleLowerCase("es")
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[_-]/g, " ");

        const isTableOccupied =
          normalizedTableStatus.includes("occupied") ||
          normalizedTableStatus.includes("ocupad") ||
          normalizedTableStatus.includes("billing") ||
          normalizedTableStatus.includes("por pagar") ||
          normalizedTableStatus === "busy";

        console.info(
          "Estado de la mesa recibido desde Supabase:",
          loaded.table?.status,
          "¿Está ocupada?:",
          isTableOccupied
        );

        setTableOccupied(isTableOccupied);

        // Recuperar sesión sin permitir que un error
        // de sessionStorage interrumpa la carga del menú.
        if (storageKey) {
          const saved = safeGetSession(storageKey);

          if (saved) {
            try {
              const current =
                JSON.parse(saved) as ParticipantSession;

              if (
                !current.session_id ||
                !current.participant_token ||
                !current.display_name
              ) {
                throw new Error(
                  "Los datos de la sesión están incompletos."
                );
              }

              await refreshSharedCart(current, loaded);

              if (!cancelled) {
                setParticipant(current);
                setCustomerName(current.display_name);
              }
            } catch (restoreError) {
              console.warn(
                "La sesión guardada ya no es válida:",
                restoreError
              );

              safeRemoveSession(storageKey);

              if (!cancelled) {
                setParticipant(null);
                setCart([]);
              }
            }
          }
        }
      } catch (loadError) {
        console.error(
          "ERROR AL CARGAR EL MENÚ:",
          loadError
        );

        if (!cancelled) {
          setError(errorText(loadError));
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadMenu();

    return () => {
      cancelled = true;
    };
  }, [qrToken, storageKey, refreshSharedCart]);

  // =========================================================
  // SINCRONIZACIÓN DEL CARRITO CADA 3 SEGUNDOS
  // =========================================================

  useEffect(() => {
    if (!participant || !menu) return;

    let cancelled = false;

    const sync = async () => {
      try {
        await refreshSharedCart(participant, menu);

        if (!cancelled) {
          setCartError("");
        }
      } catch (syncError) {
        if (!cancelled) {
          setCartError(errorText(syncError));
        }
      }
    };

    const timer = window.setInterval(() => {
      void sync();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [participant, menu, refreshSharedCart]);
    // =========================================================
  // FILTRAR PRODUCTOS
  // =========================================================

  const filteredProducts = useMemo(() => {
    if (!menu) return [];

    const normalized = search.trim().toLowerCase();

    return menu.products.filter((product) => {
      const matchesCategory =
        categoryId === "all" ||
        product.category_id === categoryId;

      const matchesSearch =
        !normalized ||
        product.name.toLowerCase().includes(normalized) ||
        (product.description ?? "")
          .toLowerCase()
          .includes(normalized);

      return matchesCategory && matchesSearch;
    });
  }, [menu, categoryId, search]);

  // =========================================================
  // AGREGAR PRODUCTO AL CARRITO
  // =========================================================

  async function addToCart(product: Product) {
    setCartError("");

    // Si todavía no hay participante, usamos carrito local.
    if (!participant) {
      if (tableOccupied) {
        setJoinError(
          "Esta mesa ya tiene una sesión abierta. Ingresa el PIN para participar."
        );
        return;
      }

      setCart((current) => {
        const found = current.find(
          (item) => item.product.id === product.id
        );

        if (found) {
          return current.map((item) =>
            item.product.id === product.id
              ? {
                  ...item,
                  quantity: item.quantity + 1,
                }
              : item
          );
        }

        return [
          ...current,
          {
            id: `local-${product.id}`,
            product,
            quantity: 1,
          },
        ];
      });

      return;
    }

    // Si ya existe una sesión, guardar en Supabase.
    setCartLoading(true);

    try {
      const supabase = createClient();

      const { error: rpcError } =
        await supabase.rpc("add_cart_item", {
          p_session_id: participant.session_id,
          p_participant_token:
            participant.participant_token,
          p_product_id: product.id,
          p_quantity: 1,
          p_notes: null,
        });

      if (rpcError) throw rpcError;

      if (menu) {
        await refreshSharedCart(participant, menu);
      }
    } catch (addError) {
      setCartError(errorText(addError));
    } finally {
      setCartLoading(false);
    }
  }

  // =========================================================
  // ELIMINAR PRODUCTO DEL CARRITO
  // =========================================================

  async function removeCartItem(item: CartItem) {
    // Carrito local.
    if (!participant) {
      setCart((current) =>
        current.filter((entry) => entry.id !== item.id)
      );

      return;
    }

    // Carrito compartido.
    setCartLoading(true);
    setCartError("");

    try {
      const supabase = createClient();

      const { error: rpcError } =
        await supabase.rpc("remove_cart_item", {
          p_session_id: participant.session_id,
          p_participant_token:
            participant.participant_token,
          p_item_id: item.id,
        });

      if (rpcError) throw rpcError;

      if (menu) {
        await refreshSharedCart(participant, menu);
      }
    } catch (removeError) {
      setCartError(errorText(removeError));
    } finally {
      setCartLoading(false);
    }
  }

  // =========================================================
  // MODIFICAR CANTIDAD DE PRODUCTOS
  // =========================================================

  async function changeQuantity(
    item: CartItem,
    change: number
  ) {
    const quantity = item.quantity + change;

    if (quantity < 1) {
      await removeCartItem(item);
      return;
    }

    // Carrito local.
    if (!participant) {
      setCart((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, quantity }
            : entry
        )
      );

      return;
    }

    // Carrito compartido.
    setCartLoading(true);
    setCartError("");

    try {
      const supabase = createClient();

      const { error: rpcError } =
        await supabase.rpc("update_cart_item", {
          p_session_id: participant.session_id,
          p_participant_token:
            participant.participant_token,
          p_item_id: item.id,
          p_quantity: quantity,
          p_notes: item.notes ?? null,
        });

      if (rpcError) throw rpcError;

      if (menu) {
        await refreshSharedCart(participant, menu);
      }
    } catch (updateError) {
      setCartError(errorText(updateError));
    } finally {
      setCartLoading(false);
    }
  }

  // =========================================================
  // UNIRSE A UNA SESIÓN MEDIANTE PIN
  // =========================================================

  async function joinSession(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!qrToken) {
      setJoinError(
        "No encontramos el código QR de esta mesa."
      );
      return;
    }

    if (!joinName.trim()) {
      setJoinError("Escribe tu nombre.");
      return;
    }

    if (joinPin.trim().length !== 4) {
      setJoinError("El PIN debe tener 4 dígitos.");
      return;
    }

    setJoining(true);
    setJoinError("");
    setJoinAttempts(null);

    try {
      const supabase = createClient();

      const { data, error: rpcError } =
        await supabase.rpc("join_table_session", {
          p_qr_token: qrToken,
          p_pin: joinPin.trim(),
          p_display_name: joinName.trim(),
        });

      if (rpcError) throw rpcError;

      const result = data as {
        success?: boolean;
        error?: string;
        attempts_remaining?: number;
        session_id?: string;
        participant_token?: string;
        is_responsible?: boolean;
        table_number?: number;
      };

      if (!result?.success) {
        setJoinError(
          result?.error ||
            "No fue posible validar el PIN."
        );

        if (
          typeof result?.attempts_remaining === "number"
        ) {
          setJoinAttempts(
            result.attempts_remaining
          );
        }

        return;
      }

      // Verificar que Supabase haya devuelto
      // las credenciales necesarias.
      if (
        !result.session_id ||
        !result.participant_token
      ) {
        throw new Error(
          "La sesión se creó, pero faltan los datos de acceso. Contacta a la persona responsable."
        );
      }

      const nextParticipant: ParticipantSession = {
        session_id: result.session_id,
        participant_token: result.participant_token,
        is_responsible: Boolean(
          result.is_responsible
        ),
        display_name: joinName.trim(),
        table_number: Number(
          result.table_number ??
            menu?.table.table_number ??
            0
        ),
      };

      // Guardar de forma segura. Si el navegador bloquea
      // sessionStorage, la sesión seguirá funcionando
      // mientras esta página permanezca abierta.
      if (storageKey) {
        safeSetSession(
          storageKey,
          JSON.stringify(nextParticipant)
        );
      }

      // Actualizar el estado aunque falle el almacenamiento.
      setParticipant(nextParticipant);
      setCustomerName(nextParticipant.display_name);
      setJoinPin("");
      setJoinError("");
      setTableOccupied(true);

      // Recuperar el carrito compartido.
      if (menu) {
        try {
          await refreshSharedCart(
            nextParticipant,
            menu
          );
        } catch (cartLoadError) {
          console.error(
            "No se pudo actualizar el carrito al unirse:",
            cartLoadError
          );

          setCartError(
            "Te uniste a la mesa, pero no pudimos actualizar el carrito. Se volverá a intentar automáticamente."
          );
        }
      }
    } catch (joinErrorValue) {
      console.error(
        "ERROR AL UNIRSE A LA MESA:",
        joinErrorValue
      );

      setJoinError(errorText(joinErrorValue));
    } finally {
      setJoining(false);
    }
  }

  // =========================================================
  // ABRIR CARRITO
  // =========================================================

  function openCart() {
    setDrawerView("cart");
    setCheckoutError("");
    setCartOpen(true);
  }

  // =========================================================
  // CONTINUAR AL FORMULARIO DE PEDIDO
  // =========================================================

  function beginCheckout() {
    if (!cart.length) return;

    if (
      participant &&
      !participant.is_responsible
    ) {
      setCheckoutError(
        "Solo la persona responsable puede confirmar el pedido."
      );
      return;
    }

    setCheckoutError("");
    setDrawerView("checkout");
  }
    // =========================================================
  // CONFIRMAR Y ENVIAR PEDIDO
  // =========================================================

  async function submitOrder(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!menu || !cart.length) return;

    if (!customerName.trim()) {
      setCheckoutError("Escribe tu nombre.");
      return;
    }

    // Los acompañantes no pueden confirmar pedidos.
    if (
      participant &&
      !participant.is_responsible
    ) {
      setCheckoutError(
        "Solo la persona responsable puede confirmar el pedido."
      );
      return;
    }

    // No permitir crear otra sesión en una mesa ocupada.
    if (!participant && tableOccupied) {
      setCheckoutError(
        "Esta mesa ya tiene una sesión abierta. Ingresa el PIN."
      );
      return;
    }

    if (!qrToken) {
      setCheckoutError(
        "No encontramos el QR de esta mesa."
      );
      return;
    }

    setSendingOrder(true);
    setCheckoutError("");

    try {
      const supabase = createClient();

      // =====================================================
      // PEDIDOS POSTERIORES: CARRITO COMPARTIDO
      // =====================================================

      if (
        participant &&
        participant.is_responsible
      ) {
        const { data, error: rpcError } =
          await supabase.rpc(
            "submit_shared_cart",
            {
              p_session_id: participant.session_id,
              p_participant_token:
                participant.participant_token,
            }
          );

        if (rpcError) throw rpcError;

        const result = data as {
          success?: boolean;
          order_number?: number;
          total?: number;
          error?: string;
        };

        if (!result?.success) {
          throw new Error(
            result?.error ||
              "No se pudo enviar el carrito."
          );
        }

        setOrderResult({
          order_number: Number(result.order_number),
          total: Number(result.total),
          is_first_order: false,
        });

        // La confirmación del pedido ya fue exitosa.
        // Si falla la actualización visual del carrito,
        // no debemos ocultar el comprobante del pedido.
        try {
          await refreshSharedCart(
            participant,
            menu
          );
        } catch (refreshError) {
          console.warn(
            "Pedido enviado, pero no se pudo actualizar el carrito:",
            refreshError
          );

          setCartError(
            "El pedido fue enviado correctamente. No pudimos actualizar el carrito en este momento."
          );
        }
      } else {
        // ===================================================
        // PRIMER PEDIDO: CREAR SESIÓN Y GENERAR PIN
        // ===================================================

        const { data, error: rpcError } =
          await supabase.rpc(
            "create_qr_customer_order",
            {
              p_qr_token: qrToken,
              p_customer_name: customerName.trim(),
              p_customer_phone:
                customerPhone.trim() || null,
              p_notes: orderNotes.trim() || null,
              p_items: cart.map((item) => ({
                product_id: item.product.id,
                quantity: item.quantity,
              })),
            }
          );

        if (rpcError) throw rpcError;

        if (!data) {
          throw new Error(
            "El servidor no devolvió la confirmación."
          );
        }

        const result = data as {
          order_number: number;
          total: number;
          pin: string;
          participant_token: string;
          session_id: string;
          table_number: number;
        };

        if (
          !result.session_id ||
          !result.participant_token ||
          !result.pin
        ) {
          throw new Error(
            "El servidor no devolvió todos los datos de la sesión."
          );
        }

        const nextParticipant: ParticipantSession = {
          session_id: result.session_id,
          participant_token:
            result.participant_token,
          is_responsible: true,
          display_name: customerName.trim(),
          table_number: result.table_number,
        };

        // Guardar sin permitir que un error de
        // sessionStorage interrumpa el pedido.
        if (storageKey) {
          safeSetSession(
            storageKey,
            JSON.stringify(nextParticipant)
          );
        }

        // Actualizar el estado inmediatamente.
        setParticipant(nextParticipant);
        setCustomerName(nextParticipant.display_name);
        setTableOccupied(true);

        // Mostrar siempre el PIN devuelto por Supabase.
        // Es importante no perderlo: no se puede recuperar
        // desde el hash almacenado en la base de datos.
        setOrderResult({
          order_number: Number(result.order_number),
          total: Number(result.total),
          pin: result.pin,
          is_first_order: true,
        });

        // Intentar cargar el carrito sin impedir que
        // se muestre la confirmación del pedido.
        try {
          await refreshSharedCart(
            nextParticipant,
            menu
          );
        } catch (refreshError) {
          console.warn(
            "Pedido creado, pero no se pudo cargar el carrito:",
            refreshError
          );

          setCartError(
            "El pedido fue recibido correctamente. El carrito se actualizará automáticamente."
          );
        }
      }

      // Mostrar confirmación del pedido.
      setDrawerView("success");
    } catch (submitError) {
      console.error(
        "ERROR AL ENVIAR PEDIDO:",
        submitError
      );

      setCheckoutError(errorText(submitError));
    } finally {
      setSendingOrder(false);
    }
  }

  // =========================================================
  // CERRAR CARRITO
  // =========================================================

  function closeCart() {
    setCartOpen(false);

    if (drawerView !== "success") {
      setDrawerView("cart");
    }
  }

  // =========================================================
  // ESTADO DE CARGA
  // =========================================================

  if (loading) {
    return (
      <main className="public-menu-state">
        <LoaderCircle
          className="menu-loader"
          size={42}
        />

        <p>Preparando el menú...</p>
      </main>
    );
  }

  // =========================================================
  // ESTADO DE ERROR
  // =========================================================

  if (error || !menu) {
    return (
      <main className="public-menu-state">
        <div className="menu-error-icon">
          <AlertCircle size={34} />
        </div>

        <h1>
          Ups, no podemos abrir este menú
        </h1>

        <p>
          {error || "No encontramos el restaurante."}
        </p>

        <button
          className="menu-retry-button"
          onClick={() => window.location.reload()}
        >
          Volver a intentar
        </button>
      </main>
    );
  }

  // =========================================================
  // MENÚ PRINCIPAL
  // =========================================================

  return (
    <main className="public-menu">
      {/* BARRA SUPERIOR */}

      <header className="menu-topbar">
        <div className="menu-brand">
          <div className="menu-brand-icon">
            <UtensilsCrossed size={22} />
          </div>

          <div>
            <strong>
              {menu.restaurant.name}
            </strong>

            <span>Menú digital</span>
          </div>
        </div>

        <button
          className="menu-cart-button"
          onClick={openCart}
          aria-label="Abrir carrito"
        >
          <ShoppingBag size={21} />

          {cartCount > 0 && (
            <span className="menu-cart-badge">
              {cartCount}
            </span>
          )}
        </button>
      </header>

      {/* PRESENTACIÓN DEL RESTAURANTE */}

      <section className="menu-hero">
        <div className="menu-hero-content">
          <span className="menu-hero-label">
            BIENVENIDO
          </span>

          <h1>Descubre nuestro menú</h1>

          <p>
            Preparamos cada plato pensando en ti.
          </p>

          <div className="menu-table-info">
            <MapPin size={16} />

            <span>
              Mesa {menu.table.table_number}
              {menu.table.name
                ? ` · ${menu.table.name}`
                : ""}
            </span>
          </div>
        </div>
      </section>

      {/* ===================================================
          ACCESO DE ACOMPAÑANTES
      =================================================== */}

      {!participant && tableOccupied && (
        <>
          <section className="menu-content">
            <div className="menu-checkout-summary">
              <h3>
                <Users size={18} />
                Esta mesa ya tiene una sesión abierta
              </h3>

              <p>
                Ingresa tu nombre y el PIN que te compartió
                la persona responsable para unirte al carrito.
              </p>

              <form
                className="menu-checkout-form"
                onSubmit={joinSession}
              >
                <label className="menu-checkout-field">
                  Tu nombre

                  <input
                    value={joinName}
                    onChange={(event) =>
                      setJoinName(event.target.value)
                    }
                    placeholder="Nombre"
                    required
                    maxLength={150}
                  />
                </label>

                <label className="menu-checkout-field">
                  PIN de la mesa

                  <input
                    value={joinPin}
                    onChange={(event) =>
                      setJoinPin(
                        event.target.value
                          .replace(/\D/g, "")
                          .slice(0, 4)
                      )
                    }
                    placeholder="••••"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    required
                    minLength={4}
                    maxLength={4}
                  />
                </label>

                {joinError && (
                  <div className="menu-checkout-error">
                    {joinError}

                    {joinAttempts !== null
                      ? ` Te quedan ${joinAttempts} intentos.`
                      : ""}
                  </div>
                )}

                <button
                  className="menu-checkout-button"
                  type="submit"
                  disabled={
                    joining ||
                    joinPin.length !== 4 ||
                    !joinName.trim()
                  }
                >
                  {joining
                    ? "Validando PIN..."
                    : "Unirme a la mesa"}
                </button>
              </form>
            </div>
          </section>
        </>
      )}

      {/* ===================================================
          INFORMACIÓN DEL PARTICIPANTE
      =================================================== */}

      {participant && (
        <section className="menu-content">
          <div className="menu-checkout-table-notice">
            <Users size={16} />

            {participant.is_responsible
              ? "Eres responsable de esta mesa"
              : `Participando como ${participant.display_name}`}

            <span> · Carrito compartido</span>
          </div>

          {cartError && (
            <div className="menu-checkout-error">
              {cartError}
            </div>
          )}
        </section>
      )}
            {/* ===================================================
          CONTENIDO DEL MENÚ
      =================================================== */}

      <section className="menu-content">
        <div className="menu-section-heading">
          <div>
            <span className="menu-eyebrow">
              NUESTRA CARTA
            </span>

            <h2>Explora nuestros platos</h2>
          </div>
        </div>

        {/* BUSCADOR */}

        <div className="menu-search">
          <Search size={19} />

          <input
            type="search"
            placeholder="Buscar platos o bebidas..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        {/* CATEGORÍAS */}

        <div className="menu-categories">
          <button
            className={
              categoryId === "all" ? "active" : ""
            }
            onClick={() => setCategoryId("all")}
          >
            Todos
          </button>

          {menu.categories.map((category) => (
            <button
              key={category.id}
              className={
                categoryId === category.id
                  ? "active"
                  : ""
              }
              onClick={() =>
                setCategoryId(category.id)
              }
            >
              {category.name}
            </button>
          ))}
        </div>

        {/* ENCABEZADO DE PRODUCTOS */}

        <div className="menu-products-heading">
          <h2>
            {categoryId === "all"
              ? "Todos nuestros productos"
              : menu.categories.find(
                  (category) =>
                    category.id === categoryId
                )?.name}
          </h2>

          <span>
            {filteredProducts.length} productos
          </span>
        </div>

        {/* LISTADO DE PRODUCTOS */}

        {filteredProducts.length === 0 ? (
          <div className="menu-empty">
            <ShoppingBag size={34} />

            <h3>No encontramos productos</h3>

            <p>
              Prueba con otra categoría o búsqueda.
            </p>
          </div>
        ) : (
          <div className="menu-product-grid">
            {filteredProducts.map((product) => {
              const quantity = cart
                .filter(
                  (item) =>
                    item.product.id === product.id
                )
                .reduce(
                  (sum, item) =>
                    sum + item.quantity,
                  0
                );

              const canAdd =
                Boolean(participant) || !tableOccupied;

              return (
                <article
                  className="menu-product-card"
                  key={product.id}
                >
                  <div className="menu-product-image">
                    {product.image_url ? (
                      <img
                        src={product.image_url}
                        alt={product.name}
                      />
                    ) : (
                      <div className="menu-product-placeholder">
                        <UtensilsCrossed size={35} />
                      </div>
                    )}
                  </div>

                  <div className="menu-product-info">
                    <h3>{product.name}</h3>

                    {product.description && (
                      <p>{product.description}</p>
                    )}

                    <div className="menu-product-bottom">
                      <strong>
                        {formatPrice(product.price)}
                      </strong>

                      {quantity > 0 ? (
                        <div className="menu-quantity-control">
                          <button
                            onClick={() => {
                              const last = [...cart]
                                .reverse()
                                .find(
                                  (item) =>
                                    item.product.id ===
                                    product.id
                                );

                              if (last) {
                                void changeQuantity(
                                  last,
                                  -1
                                );
                              }
                            }}
                            aria-label="Disminuir cantidad"
                            disabled={cartLoading}
                          >
                            <Minus size={16} />
                          </button>

                          <span>{quantity}</span>

                          <button
                            onClick={() =>
                              void addToCart(product)
                            }
                            aria-label="Aumentar cantidad"
                            disabled={
                              cartLoading || !canAdd
                            }
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="menu-add-button"
                          onClick={() =>
                            void addToCart(product)
                          }
                          aria-label={`Agregar ${product.name}`}
                          disabled={
                            !canAdd || cartLoading
                          }
                        >
                          <Plus size={19} />
                        </button>
                      )}
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {/* ===================================================
          CARRITO FLOTANTE
      =================================================== */}

      {cartCount > 0 && (
        <button
          className="menu-floating-cart"
          onClick={openCart}
        >
          <span>
            <ShoppingBag size={20} />
            Ver pedido ({cartCount})
          </span>

          <strong>
            {formatPrice(cartTotal)}
          </strong>
        </button>
      )}

      {/* ===================================================
          PANEL DEL CARRITO
      =================================================== */}

      {cartOpen && (
        <div
          className="menu-cart-overlay"
          onClick={closeCart}
        >
          <section
            className="menu-cart-drawer"
            onClick={(event) =>
              event.stopPropagation()
            }
          >
            {/* ENCABEZADO DEL PANEL */}

            <div className="menu-cart-header">
              <div>
                <span>
                  {drawerView === "success"
                    ? "Pedido enviado"
                    : drawerView === "checkout"
                    ? "Último paso"
                    : "Tu selección"}
                </span>

                <h2>
                  {drawerView === "success"
                    ? "¡Gracias!"
                    : drawerView === "checkout"
                    ? "Confirmar pedido"
                    : "Mi pedido"}
                </h2>
              </div>

              <button
                onClick={closeCart}
                aria-label="Cerrar carrito"
              >
                <X size={22} />
              </button>
            </div>

            {/* =================================================
                VISTA DEL CARRITO
            ================================================= */}

            {drawerView === "cart" && (
              <>
                {cart.length === 0 ? (
                  <div className="menu-cart-empty">
                    <ShoppingBag size={38} />

                    <p>Tu carrito está vacío.</p>
                  </div>
                ) : (
                  <>
                    <div className="menu-cart-items">
                      {cart.map((item) => (
                        <div
                          className="menu-cart-item"
                          key={item.id}
                        >
                          <div>
                            <strong>
                              {item.product.name}
                            </strong>

                            <span>
                              {formatPrice(
                                item.product.price
                              )}
                            </span>
                          </div>

                          <div className="menu-quantity-control">
                            <button
                              onClick={() =>
                                void changeQuantity(
                                  item,
                                  -1
                                )
                              }
                              aria-label="Disminuir"
                              disabled={cartLoading}
                            >
                              <Minus size={15} />
                            </button>

                            <span>
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                void changeQuantity(
                                  item,
                                  1
                                )
                              }
                              aria-label="Aumentar"
                              disabled={cartLoading}
                            >
                              <Plus size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* TOTAL */}

                    <div className="menu-cart-total">
                      <span>Total estimado</span>

                      <strong>
                        {formatPrice(cartTotal)}
                      </strong>
                    </div>

                    {cartError && (
                      <div className="menu-checkout-error">
                        {cartError}
                      </div>
                    )}

                    {/* PERMISOS DEL PARTICIPANTE */}

                    {participant &&
                    !participant.is_responsible ? (
                      <p className="menu-checkout-note">
                        Puedes modificar el carrito compartido.
                        La persona responsable debe confirmar y
                        enviar el pedido.
                      </p>
                    ) : (
                      <button
                        className="menu-checkout-button"
                        onClick={beginCheckout}
                      >
                        Continuar con el pedido
                      </button>
                    )}

                    <p className="menu-checkout-note">
                      Los cambios del carrito se comparten
                      con las personas de esta mesa.
                    </p>
                  </>
                )}
              </>
            )}

            {/* =================================================
                FORMULARIO DE CONFIRMACIÓN
            ================================================= */}

            {drawerView === "checkout" && (
              <form
                id="menu-checkout-form"
                className="menu-checkout-form"
                onSubmit={submitOrder}
              >
                <div className="menu-checkout-body">
                  <div className="menu-checkout-summary">
                    <h3>
                      Resumen de tu pedido
                    </h3>

                    {cart.map((item) => (
                      <div
                        key={item.id}
                        className="menu-checkout-summary-item"
                      >
                        <span>
                          {item.quantity} ×{" "}
                          {item.product.name}
                        </span>

                        <strong>
                          {formatPrice(
                            item.product.price *
                              item.quantity
                          )}
                        </strong>
                      </div>
                    ))}

                    <div className="menu-checkout-summary-total">
                      <span>Total</span>

                      <strong>
                        {formatPrice(cartTotal)}
                      </strong>
                    </div>
                  </div>

                  {/* NOMBRE */}

                  <label className="menu-checkout-field">
                    Nombre

                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) =>
                        setCustomerName(
                          event.target.value
                        )
                      }
                      placeholder="Tu nombre"
                      required
                    />
                  </label>

                  {/* TELÉFONO: SOLO PRIMER PEDIDO */}

                  {!participant && (
                    <label className="menu-checkout-field">
                      Teléfono

                      <input
                        type="tel"
                        value={customerPhone}
                        onChange={(event) =>
                          setCustomerPhone(
                            event.target.value
                          )
                        }
                        placeholder="Tu teléfono"
                      />
                    </label>
                  )}

                  {/* OBSERVACIONES: SOLO PRIMER PEDIDO */}

                  {!participant && (
                    <label className="menu-checkout-field">
                      Observaciones

                      <textarea
                        value={orderNotes}
                        onChange={(event) =>
                          setOrderNotes(
                            event.target.value
                          )
                        }
                        placeholder="Alguna observación..."
                      />
                    </label>
                  )}

                  {/* MESA */}

                  <div className="menu-checkout-table-notice">
                    <MapPin size={16} />

                    Mesa {menu.table.table_number}
                  </div>

                  {participant && (
                    <p className="menu-checkout-note">
                      Al confirmar, el carrito compartido
                      se convertirá en un nuevo pedido.
                    </p>
                  )}

                  {/* ERRORES */}

                  {checkoutError && (
                    <div className="menu-checkout-error">
                      {checkoutError}
                    </div>
                  )}
                </div>

                {/* BOTONES */}

                <div className="menu-checkout-footer">
                  <button
                    className="menu-checkout-button"
                    type="submit"
                    disabled={
                      sendingOrder || cartLoading
                    }
                  >
                    {sendingOrder
                      ? "Enviando pedido..."
                      : `Confirmar y enviar · ${formatPrice(
                          cartTotal
                        )}`}
                  </button>

                  <button
                    className="menu-checkout-back"
                    type="button"
                    onClick={() =>
                      setDrawerView("cart")
                    }
                  >
                    Volver al carrito
                  </button>
                </div>
              </form>
            )}

            {/* =================================================
                PEDIDO CONFIRMADO
            ================================================= */}

            {drawerView === "success" &&
              orderResult && (
                <div className="menu-order-success">
                  <div className="menu-order-success-icon">
                    <CheckCircle2 size={42} />
                  </div>

                  <h3>
                    ¡Pedido recibido correctamente!
                  </h3>

                  <p>
                    Tu pedido fue enviado al restaurante.
                    Guarda este número para consultar con
                    el personal.
                  </p>

                  {/* NÚMERO DEL PEDIDO */}

                  <div className="menu-order-number-card">
                    <span>Número de pedido</span>

                    <strong>
                      #{orderResult.order_number}
                    </strong>
                  </div>

                  {/* PIN DEL RESPONSABLE */}

                  {orderResult.pin && (
                    <div className="menu-order-pin-card">
                      <span>
                        <KeyRound size={17} />
                        PIN del responsable de la mesa
                      </span>

                      <strong>
                        {orderResult.pin}
                      </strong>

                      <p>
                        Comparte este PIN únicamente con
                        las personas de tu mesa.
                      </p>
                    </div>
                  )}

                  {/* TOTAL */}

                  <div className="menu-order-success-total">
                    <span>Total confirmado</span>

                    <strong>
                      {formatPrice(orderResult.total)}
                    </strong>
                  </div>

                  {orderResult.is_first_order && (
                    <p className="menu-checkout-note">
                      La sesión de la mesa ya está abierta.
                      Los acompañantes pueden unirse con el PIN.
                    </p>
                  )}

                  <button
                    className="menu-checkout-button"
                    onClick={closeCart}
                  >
                    Volver al menú
                  </button>
                </div>
              )}
          </section>
        </div>
      )}

      {/* PIE DE PÁGINA */}

      <footer className="public-menu-footer">
        Powered by App-Multi-Resto
      </footer>
    </main>
  );
}
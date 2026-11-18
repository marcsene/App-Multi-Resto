
"use client";

import { useEffect, useMemo, useState } from "react";
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
  ClipboardList,
  User,
  Phone,
  MessageSquare,
  KeyRound,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";

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
  product: Product;
  quantity: number;
};

type CustomerOrderResult = {
  order_id: string;
  order_number: number;
  total: number;
  pin: string;
  participant_token: string;
  session_id: string;
  table_number: number;
};

type DrawerView = "cart" | "checkout" | "success";

export default function PublicMenuPage() {
  const [menu, setMenu] = useState<PublicMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [categoryId, setCategoryId] = useState("all");
  const [search, setSearch] = useState("");

  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [drawerView, setDrawerView] = useState<DrawerView>("cart");

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [orderNotes, setOrderNotes] = useState("");

  const [sendingOrder, setSendingOrder] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");

  const [orderResult, setOrderResult] =
    useState<CustomerOrderResult | null>(null);

  // =========================================================
  // CARGA DEL MENÚ PÚBLICO
  // =========================================================

  useEffect(() => {
    let cancelled = false;

    async function loadMenu() {
      const qrToken = new URLSearchParams(
        window.location.search
      ).get("table");

      if (!qrToken) {
        setError("No se encontró el código QR de la mesa.");
        setLoading(false);
        return;
      }

      try {
        const supabase = createClient();

        const request = supabase.rpc(
          "get_public_menu_by_qr",
          {
            p_qr_token: qrToken,
          }
        );

        const timeout = new Promise<never>((_, reject) => {
          setTimeout(() => {
            reject(
              new Error(
                "La petición tardó demasiado. Revisa tu conexión."
              )
            );
          }, 15000);
        });

        const { data, error: rpcError } =
          await Promise.race([request, timeout]);

        if (rpcError) throw rpcError;

        if (!data) {
          throw new Error(
            "No encontramos el menú asociado a este QR."
          );
        }

        if (!cancelled) {
          setMenu(data as PublicMenu);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "No pudimos cargar el menú."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadMenu();

    return () => {
      cancelled = true;
    };
  }, []);

  // =========================================================
  // FILTRAR PRODUCTOS
  // =========================================================

  const filteredProducts = useMemo(() => {
    if (!menu) return [];

    const normalizedSearch = search.trim().toLowerCase();

    return menu.products.filter((product) => {
      const matchesCategory =
        categoryId === "all" ||
        product.category_id === categoryId;

      const matchesSearch =
        !normalizedSearch ||
        product.name.toLowerCase().includes(normalizedSearch) ||
        (product.description ?? "")
          .toLowerCase()
          .includes(normalizedSearch);

      return matchesCategory && matchesSearch;
    });
  }, [menu, categoryId, search]);

  // =========================================================
  // CARRITO Y TOTALES
  // =========================================================

  const cartCount = cart.reduce(
    (total, item) => total + item.quantity,
    0
  );

  const cartTotal = cart.reduce(
    (total, item) =>
      total + item.product.price * item.quantity,
    0
  );

  function formatPrice(price: number) {
    return new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: menu?.restaurant.currency ?? "CLP",
      maximumFractionDigits:
        menu?.restaurant.currency === "CLP" ? 0 : 2,
    }).format(price);
  }

  function addToCart(product: Product) {
    setCart((current) => {
      const existing = current.find(
        (item) => item.product.id === product.id
      );

      if (existing) {
        return current.map((item) =>
          item.product.id === product.id
            ? {
                ...item,
                quantity: item.quantity + 1,
              }
            : item
        );
      }

      return [...current, { product, quantity: 1 }];
    });
  }

  function changeQuantity(
    productId: string,
    change: number
  ) {
    setCart((current) =>
      current
        .map((item) =>
          item.product.id === productId
            ? {
                ...item,
                quantity: item.quantity + change,
              }
            : item
        )
        .filter((item) => item.quantity > 0)
    );
  }

  // =========================================================
  // ABRIR CARRITO Y CONTINUAR
  // =========================================================

  function openCart() {
    setDrawerView("cart");
    setCheckoutError("");
    setCartOpen(true);
  }

  function beginCheckout() {
    if (!cart.length) return;

    setCheckoutError("");
    setDrawerView("checkout");
  }

  // =========================================================
  // ENVIAR PEDIDO A SUPABASE
  // =========================================================

  async function submitOrder(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!menu || !cart.length) return;

    if (!customerName.trim()) {
      setCheckoutError(
        "Escribe el nombre de la persona responsable."
      );
      return;
    }

    const qrToken = new URLSearchParams(
      window.location.search
    ).get("table");

    if (!qrToken) {
      setCheckoutError(
        "No encontramos el QR de esta mesa. Escanea nuevamente."
      );
      return;
    }

    setSendingOrder(true);
    setCheckoutError("");

    try {
      const supabase = createClient();

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

      const result = data as CustomerOrderResult;

      setOrderResult(result);
      setCart([]);
      setDrawerView("success");
    } catch (err) {
      setCheckoutError(
        err instanceof Error
          ? err.message
          : "No pudimos enviar el pedido. Intenta nuevamente."
      );
    } finally {
      setSendingOrder(false);
    }
  }

  // =========================================================
  // CERRAR PANEL
  // =========================================================

  function closeCart() {
    setCartOpen(false);

    if (drawerView !== "success") {
      setDrawerView("cart");
    }
  }

  // =========================================================
  // CARGANDO
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
  // ERROR
  // =========================================================

  if (error || !menu) {
    return (
      <main className="public-menu-state">
        <div className="menu-error-icon">
          <AlertCircle size={34} />
        </div>

        <h1>Ups, no podemos abrir este menú</h1>

        <p>{error || "No encontramos el restaurante."}</p>

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

      {/* ENCABEZADO */}

      <header className="menu-topbar">
        <div className="menu-brand">
          <div className="menu-brand-icon">
            <UtensilsCrossed size={22} />
          </div>

          <div>
            <strong>{menu.restaurant.name}</strong>
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

      {/* BIENVENIDA */}

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

      {/* CONTENIDO */}

      <section className="menu-content">

        {/* TÍTULO */}

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

        {/* PRODUCTOS */}

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
              const cartItem = cart.find(
                (item) =>
                  item.product.id === product.id
              );

              return (
                <article
                  className="menu-product-card"
                  key={product.id}
                >
                  {/* IMAGEN */}

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

                  {/* INFORMACIÓN */}

                  <div className="menu-product-info">
                    <h3>{product.name}</h3>

                    {product.description && (
                      <p>{product.description}</p>
                    )}

                    {/* PRECIO Y BOTÓN */}

                    <div className="menu-product-bottom">
                      <strong>
                        {formatPrice(product.price)}
                      </strong>

                      {cartItem ? (
                        <div className="menu-quantity-control">
                          <button
                            onClick={() =>
                              changeQuantity(
                                product.id,
                                -1
                              )
                            }
                            aria-label="Disminuir cantidad"
                          >
                            <Minus size={16} />
                          </button>

                          <span>
                            {cartItem.quantity}
                          </span>

                          <button
                            onClick={() =>
                              changeQuantity(
                                product.id,
                                1
                              )
                            }
                            aria-label="Aumentar cantidad"
                          >
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <button
                          className="menu-add-button"
                          onClick={() =>
                            addToCart(product)
                          }
                          aria-label={`Agregar ${product.name}`}
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

      {/* CARRITO FLOTANTE */}

      {cartCount > 0 && (
        <button
          className="menu-floating-cart"
          onClick={openCart}
        >
          <span>
            <ShoppingBag size={20} />
            Ver pedido ({cartCount})
          </span>

          <strong>{formatPrice(cartTotal)}</strong>
        </button>
      )}

      {/* PANEL DEL CARRITO */}

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
            {/* ENCABEZADO */}

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

            {/* VISTA DEL CARRITO */}

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
                          key={item.product.id}
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
                                changeQuantity(
                                  item.product.id,
                                  -1
                                )
                              }
                              aria-label="Disminuir"
                            >
                              <Minus size={15} />
                            </button>

                            <span>
                              {item.quantity}
                            </span>

                            <button
                              onClick={() =>
                                changeQuantity(
                                  item.product.id,
                                  1
                                )
                              }
                              aria-label="Aumentar"
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

                    {/* CONTINUAR */}

                    <button
                      className="menu-checkout-button"
                      onClick={beginCheckout}
                    >
                      Continuar con el pedido
                    </button>

                    <p className="menu-checkout-note">
                      Revisa tus productos antes de confirmar.
                    </p>
                  </>
                )}
              </>
            )}

            {/* FORMULARIO DE CONFIRMACIÓN */}

            {drawerView === "checkout" && (
              <form
                className="menu-checkout-form"
                onSubmit={submitOrder}
              >
                {/* RESUMEN */}

                <div className="menu-checkout-summary">
                  <div className="menu-checkout-summary-title">
                    <ClipboardList size={20} />
                    <strong>Resumen del pedido</strong>
                  </div>

                  {cart.map((item) => (
                    <div
                      className="menu-checkout-summary-row"
                      key={item.product.id}
                    >
                      <span>
                        {item.quantity} × {item.product.name}
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

                {/* RESPONSABLE */}

                <label className="menu-checkout-field">
                  <span>
                    <User size={17} />
                    Nombre del responsable *
                  </span>

                  <input
                    value={customerName}
                    onChange={(event) =>
                      setCustomerName(event.target.value)
                    }
                    placeholder="¿Quién está a cargo?"
                    maxLength={150}
                    required
                  />
                </label>

                {/* TELÉFONO */}

                <label className="menu-checkout-field">
                  <span>
                    <Phone size={17} />
                    Teléfono (opcional)
                  </span>

                  <input
                    value={customerPhone}
                    onChange={(event) =>
                      setCustomerPhone(event.target.value)
                    }
                    placeholder="Número de contacto"
                    maxLength={30}
                    inputMode="tel"
                  />
                </label>

                {/* OBSERVACIONES */}

                <label className="menu-checkout-field">
                  <span>
                    <MessageSquare size={17} />
                    Comentarios (opcional)
                  </span>

                  <textarea
                    value={orderNotes}
                    onChange={(event) =>
                      setOrderNotes(event.target.value)
                    }
                    placeholder="Ej.: sin cebolla, alergias o indicaciones..."
                    rows={3}
                    maxLength={1000}
                  />
                </label>

                {/* MESA */}

                <div className="menu-checkout-table-notice">
                  <MapPin size={17} />

                  Pedido para Mesa{" "}
                  {menu.table.table_number}

                  {menu.table.name
                    ? ` · ${menu.table.name}`
                    : ""}
                </div>

                {/* ERROR */}

                {checkoutError && (
                  <div className="menu-checkout-error">
                    <AlertCircle size={18} />

                    <span>{checkoutError}</span>
                  </div>
                )}

                {/* ENVIAR */}

                <button
                  className="menu-checkout-button"
                  type="submit"
                  disabled={sendingOrder}
                >
                  {sendingOrder ? (
                    <>
                      <LoaderCircle
                        size={19}
                        className="menu-loader"
                      />
                      Enviando pedido...
                    </>
                  ) : (
                    `Confirmar y enviar · ${formatPrice(
                      cartTotal
                    )}`
                  )}
                </button>

                {/* VOLVER */}

                <button
                  className="menu-checkout-back"
                  type="button"
                  onClick={() => {
                    setCheckoutError("");
                    setDrawerView("cart");
                  }}
                  disabled={sendingOrder}
                >
                  Volver al carrito
                </button>
              </form>
            )}

            {/* PEDIDO CONFIRMADO */}

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

                  {/* NÚMERO */}

                  <div className="menu-order-number-card">
                    <span>Número de pedido</span>

                    <strong>
                      #{orderResult.order_number}
                    </strong>
                  </div>

                  {/* PIN */}

                  <div className="menu-order-pin-card">
                    <span>
                      <KeyRound size={17} />
                      PIN del responsable de la mesa
                    </span>

                    <strong>{orderResult.pin}</strong>

                    <p>
                      Comparte este PIN únicamente con
                      las personas de tu mesa.
                    </p>
                  </div>

                  {/* TOTAL */}

                  <div className="menu-order-success-total">
                    <span>Total confirmado</span>

                    <strong>
                      {formatPrice(orderResult.total)}
                    </strong>
                  </div>

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

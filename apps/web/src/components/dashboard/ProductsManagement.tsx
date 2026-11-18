  
  "use client";

import { useCallback, useEffect, useState } from "react";
import {
  Plus,
  Search,
  Pencil,
  Power,
  Package,
  Tags,
  RefreshCw,
  X,
  ImagePlus,
  CheckCircle2,
  AlertCircle,
  ShoppingBag,
  Layers,
} from "lucide-react";

import {
  getCategories,
  createCategory,
  updateCategory,
  deactivateCategory,
  type Category,
} from "@/lib/services/categories";

import {
  getProducts,
  createProduct,
  updateProduct,
  deactivateProduct,
  setProductAvailability,
  type Product,
} from "@/lib/services/products";

import { uploadProductImage } from "@/lib/services/storage";

type Tab = "products" | "categories";

type Confirmation = {
  title: string;
  message: string;
  action: () => Promise<void>;
};

const emptyProduct = {
  category_id: "",
  name: "",
  description: "",
  image_url: "",
  price: "",
  preparation_area: "kitchen",
  sort_order: "0",
  is_available: true,
};

const emptyCategory = {
  name: "",
  description: "",
  image_url: "",
  sort_order: "0",
};

export default function ProductsManagement() {
  const [tab, setTab] = useState<Tab>("products");

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [productModal, setProductModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);

  const [confirmation, setConfirmation] =
    useState<Confirmation | null>(null);

  const [editingProduct, setEditingProduct] =
    useState<string | null>(null);

  const [editingCategory, setEditingCategory] =
    useState<string | null>(null);

  const [productForm, setProductForm] = useState(emptyProduct);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);

  const [productImageFile, setProductImageFile] =
    useState<File | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [categoryData, productData] = await Promise.all([
        getCategories(),
        getProducts(),
      ]);

      setCategories(categoryData);
      setProducts(productData);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "No fue posible cargar los datos."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const activeCategories = categories.filter(
    (category) => category.is_active
  );

  const activeProducts = products.filter(
    (product) => product.is_active
  );

  const visibleProducts = activeProducts.filter((product) => {
    const term = search.toLowerCase().trim();

    return (
      product.name.toLowerCase().includes(term) ||
      (product.description ?? "").toLowerCase().includes(term)
    );
  });

  const availableProducts = activeProducts.filter(
    (product) => product.is_available
  );

  function openNewProduct() {
    setEditingProduct(null);
    setProductImageFile(null);

    setProductForm({
      ...emptyProduct,
      category_id: activeCategories[0]?.id ?? "",
    });

    setError("");
    setSuccess("");
    setProductModal(true);
  }

  function openEditProduct(product: Product) {
    setEditingProduct(product.id);
    setProductImageFile(null);

    setProductForm({
      category_id: product.category_id,
      name: product.name,
      description: product.description ?? "",
      image_url: product.image_url ?? "",
      price: String(product.price),
      preparation_area: product.preparation_area,
      sort_order: String(product.sort_order),
      is_available: product.is_available,
    });

    setError("");
    setSuccess("");
    setProductModal(true);
  }

  async function saveProduct(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      let imageUrl = productForm.image_url || null;

      if (productImageFile) {
        setUploadingImage(true);
        imageUrl = await uploadProductImage(productImageFile);
        setUploadingImage(false);
      }

      const payload = {
        category_id: productForm.category_id,
        name: productForm.name.trim(),
        description: productForm.description || null,
        image_url: imageUrl,
        price: Number(productForm.price),
        preparation_area: productForm.preparation_area,
        sort_order: Number(productForm.sort_order) || 0,
        is_available: productForm.is_available,
      };

      if (editingProduct) {
        await updateProduct(editingProduct, payload);
      } else {
        await createProduct(payload);
      }

      setProductModal(false);
      setProductImageFile(null);

      setSuccess(
        editingProduct
          ? "Producto actualizado correctamente."
          : "Producto creado correctamente."
      );

      await loadData();
    } catch (err: unknown) {
      let errorMessage = "No se pudo guardar el producto.";

      if (err instanceof Error) {
        errorMessage = err.message;
      } else if (typeof err === "object" && err !== null) {
        const detail = err as {
          message?: string;
          error_description?: string;
          details?: string;
          hint?: string;
        };

        errorMessage =
          detail.message ||
          detail.error_description ||
          detail.details ||
          detail.hint ||
          JSON.stringify(err);
      }

      setError(errorMessage);
    } finally {
      setSaving(false);
      setUploadingImage(false);
    }
  }

  function openNewCategory() {
    setEditingCategory(null);
    setCategoryForm(emptyCategory);
    setError("");
    setSuccess("");
    setCategoryModal(true);
  }

  function openEditCategory(category: Category) {
    setEditingCategory(category.id);

    setCategoryForm({
      name: category.name,
      description: category.description ?? "",
      image_url: category.image_url ?? "",
      sort_order: String(category.sort_order),
    });

    setError("");
    setSuccess("");
    setCategoryModal(true);
  }

  async function saveCategory(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const payload = {
        name: categoryForm.name.trim(),
        description: categoryForm.description || null,
        image_url: categoryForm.image_url || null,
        sort_order: Number(categoryForm.sort_order) || 0,
      };

      if (editingCategory) {
        await updateCategory(editingCategory, payload);
      } else {
        await createCategory(payload);
      }

      setCategoryModal(false);

      setSuccess(
        editingCategory
          ? "Categoría actualizada correctamente."
          : "Categoría creada correctamente."
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo guardar la categoría."
      );
    } finally {
      setSaving(false);
    }
  }

  async function toggleAvailability(product: Product) {
    setError("");
    setSuccess("");

    try {
      await setProductAvailability(
        product.id,
        !product.is_available
      );

      setSuccess(
        product.is_available
          ? `${product.name} ahora está agotado.`
          : `${product.name} vuelve a estar disponible.`
      );

      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cambiar la disponibilidad."
      );
    }
  }

  function requestDeactivateProduct(product: Product) {
    setConfirmation({
      title: "Desactivar producto",
      message: `¿Estás seguro de que deseas desactivar "${product.name}"? El producto dejará de aparecer en el menú.`,
      action: async () => {
        await deactivateProduct(product.id);
        setSuccess(`"${product.name}" fue desactivado.`);
        await loadData();
      },
    });
  }

  function requestDeactivateCategory(category: Category) {
    setConfirmation({
      title: "Desactivar categoría",
      message: `¿Estás seguro de que deseas desactivar "${category.name}"?`,
      action: async () => {
        await deactivateCategory(category.id);
        setSuccess(`La categoría "${category.name}" fue desactivada.`);
        await loadData();
      },
    });
  }

  async function executeConfirmation() {
    if (!confirmation) return;

    setConfirming(true);
    setError("");

    try {
      await confirmation.action();
      setConfirmation(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo completar la operación."
      );
    } finally {
      setConfirming(false);
    }
  }

  const formatPrice = (price: number | string) =>
    new Intl.NumberFormat("es-CL", {
      style: "currency",
      currency: "CLP",
      maximumFractionDigits: 0,
    }).format(Number(price));

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "12px 14px",
    border: "1px solid var(--border, #e2e8f0)",
    borderRadius: "10px",
    background: "var(--background, white)",
    color: "inherit",
    font: "inherit",
    boxSizing: "border-box",
    outline: "none",
  };

  const fieldStyle: React.CSSProperties = {
    display: "grid",
    gap: "8px",
    marginBottom: "17px",
  };

  const buttonStyle: React.CSSProperties = {
    border: "1px solid var(--border, #e2e8f0)",
    borderRadius: "10px",
    padding: "10px 13px",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "7px",
    fontWeight: 600,
    fontSize: "13px",
    transition: "all .2s ease",
  };
  return (
    <div className="products-management">
      <style>{`
        .products-management {
          width: 100%;
        }

        .pm-header {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 20px;
          margin-bottom: 25px;
          flex-wrap: wrap;
        }

        .pm-eyebrow {
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 1.5px;
          opacity: .6;
          margin: 0 0 8px;
        }

        .pm-title {
          font-size: clamp(24px, 4vw, 32px);
          font-weight: 800;
          letter-spacing: -.7px;
          margin: 0;
        }

        .pm-subtitle {
          margin-top: 9px;
          opacity: .65;
          font-size: 14px;
          line-height: 1.5;
        }

        .pm-stats {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
          margin-bottom: 24px;
        }

        .pm-stat {
          padding: 18px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 14px;
          background: var(--background, white);
          display: flex;
          gap: 14px;
          align-items: center;
        }

        .pm-stat-icon {
          width: 42px;
          height: 42px;
          border-radius: 12px;
          display: grid;
          place-items: center;
          background: rgba(37, 99, 235, .10);
          color: #2563eb;
          flex-shrink: 0;
        }

        .pm-stat-label {
          font-size: 12px;
          opacity: .65;
          margin-bottom: 4px;
        }

        .pm-stat-value {
          font-size: 23px;
          font-weight: 800;
        }

        .pm-tabs {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .pm-tab {
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 10px;
          padding: 10px 14px;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: transparent;
          cursor: pointer;
          color: inherit;
          font-weight: 600;
          font-size: 13px;
        }

        .pm-tab-active {
          background: var(--primary, #2563eb);
          border-color: var(--primary, #2563eb);
          color: white;
        }

        .pm-panel {
          padding: 20px;
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 16px;
          background: var(--background, white);
        }

        .pm-search {
          position: relative;
          max-width: 440px;
          margin-bottom: 22px;
        }

        .pm-search input {
          padding-left: 42px !important;
        }

        .pm-product-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(min(100%, 250px), 1fr)
          );
          gap: 18px;
        }

        .pm-product-card {
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 16px;
          overflow: hidden;
          background: var(--background, white);
          display: flex;
          flex-direction: column;
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .pm-product-card:hover {
          transform: translateY(-3px);
          box-shadow: 0 12px 30px rgba(0,0,0,.08);
        }

        .pm-product-image {
          height: 200px;
          background: #f1f5f9;
          position: relative;
          overflow: hidden;
        }

        .pm-product-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
          transition: transform .3s ease;
        }

        .pm-product-card:hover .pm-product-image img {
          transform: scale(1.04);
        }

        .pm-status {
          position: absolute;
          top: 12px;
          right: 12px;
          padding: 7px 11px;
          border-radius: 30px;
          font-size: 11px;
          font-weight: 800;
          backdrop-filter: blur(8px);
        }

        .pm-status-available {
          background: rgba(220, 252, 231, .95);
          color: #166534;
        }

        .pm-status-unavailable {
          background: rgba(254, 226, 226, .95);
          color: #991b1b;
        }

        .pm-product-body {
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          flex: 1;
        }

        .pm-category-label {
          display: inline-flex;
          width: fit-content;
          padding: 5px 9px;
          border-radius: 7px;
          background: rgba(100, 116, 139, .10);
          font-size: 11px;
          font-weight: 700;
          opacity: .8;
        }

        .pm-product-name {
          font-size: 17px;
          font-weight: 800;
          margin: 0;
          line-height: 1.3;
        }

        .pm-product-description {
          font-size: 13px;
          opacity: .65;
          line-height: 1.5;
          margin: 0;
          min-height: 39px;
        }

        .pm-product-details {
          font-size: 12px;
          opacity: .65;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .pm-price {
          font-size: 25px;
          font-weight: 900;
          letter-spacing: -.5px;
          color: var(--primary, #2563eb);
        }

        .pm-actions {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          margin-top: auto;
        }

        .pm-action {
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 9px;
          padding: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          cursor: pointer;
          background: transparent;
          color: inherit;
          font-size: 12px;
          font-weight: 700;
        }

        .pm-action-edit {
          background: rgba(37, 99, 235, .08);
          color: #2563eb;
          border-color: rgba(37, 99, 235, .2);
        }

        .pm-action-availability {
          background: rgba(16, 185, 129, .08);
          color: #059669;
          border-color: rgba(16, 185, 129, .2);
        }

        .pm-action-danger {
          grid-column: span 2;
          background: rgba(239, 68, 68, .06);
          color: #dc2626;
          border-color: rgba(239, 68, 68, .15);
        }

        .pm-category-grid {
          display: grid;
          grid-template-columns: repeat(
            auto-fill,
            minmax(min(100%, 260px), 1fr)
          );
          gap: 16px;
        }

        .pm-category-card {
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 15px;
          padding: 17px;
          background: var(--background, white);
          transition: transform .2s ease, box-shadow .2s ease;
        }

        .pm-category-card:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 24px rgba(0,0,0,.06);
        }

        .pm-category-header {
          display: flex;
          gap: 12px;
          align-items: center;
        }

        .pm-category-icon {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(37, 99, 235, .1);
          color: #2563eb;
          display: grid;
          place-items: center;
          flex-shrink: 0;
        }

        .pm-category-name {
          font-size: 16px;
          font-weight: 800;
          margin: 0;
        }

        .pm-category-description {
          font-size: 13px;
          opacity: .65;
          line-height: 1.5;
          margin: 10px 0;
        }

        .pm-category-count {
          display: inline-flex;
          gap: 6px;
          align-items: center;
          font-size: 12px;
          font-weight: 700;
          padding: 7px 10px;
          border-radius: 8px;
          background: rgba(100, 116, 139, .08);
          margin-bottom: 14px;
        }

        .pm-category-actions {
          display: flex;
          gap: 8px;
        }

        .pm-category-actions button {
          flex: 1;
        }

        .pm-empty {
          padding: 50px 15px;
          text-align: center;
          opacity: .75;
        }

        .pm-empty-icon {
          margin: 0 auto 14px;
          opacity: .5;
        }

        .pm-alert {
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 13px 16px;
          border-radius: 11px;
          margin-bottom: 18px;
          font-size: 14px;
        }

        .pm-alert-error {
          background: #fee2e2;
          color: #991b1b;
        }

        .pm-alert-success {
          background: #dcfce7;
          color: #166534;
        }

        .pm-primary {
          border: none;
          border-radius: 10px;
          padding: 11px 15px;
          background: var(--primary, #2563eb);
          color: white;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          font-weight: 700;
          font-size: 13px;
        }

        .pm-primary:disabled {
          opacity: .5;
          cursor: not-allowed;
        }

        .pm-modal-overlay {
          position: fixed;
          inset: 0;
          z-index: 1000;
          background: rgba(0,0,0,.55);
          display: grid;
          place-items: center;
          padding: 16px;
          backdrop-filter: blur(3px);
        }

        .pm-modal {
          width: 100%;
          max-width: 560px;
          max-height: 90vh;
          overflow-y: auto;
          background: var(--background, white);
          color: inherit;
          border-radius: 18px;
          padding: 24px;
          box-shadow: 0 25px 80px rgba(0,0,0,.2);
        }

        .pm-modal-small {
          max-width: 440px;
        }

        .pm-modal-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          margin-bottom: 22px;
        }

        .pm-modal-header h2 {
          margin: 0;
          font-size: 21px;
          font-weight: 800;
        }

        .pm-modal-footer {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
          margin-top: 22px;
          flex-wrap: wrap;
        }

        .pm-cancel {
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 10px;
          padding: 11px 15px;
          background: transparent;
          color: inherit;
          cursor: pointer;
          font-weight: 700;
        }

        @media (max-width: 700px) {
          .pm-stats {
            grid-template-columns: 1fr;
            gap: 10px;
          }

          .pm-stat {
            padding: 13px;
          }

          .pm-stat-value {
            font-size: 20px;
          }

          .pm-panel {
            padding: 13px;
          }

          .pm-product-grid {
            grid-template-columns: repeat(
              auto-fill,
              minmax(min(100%, 220px), 1fr)
            );
            gap: 12px;
          }

          .pm-product-image {
            height: 170px;
          }

          .pm-product-body {
            padding: 13px;
          }

          .pm-product-name {
            font-size: 15px;
          }

          .pm-price {
            font-size: 22px;
          }

          .pm-actions {
            gap: 6px;
          }

          .pm-action {
            padding: 9px 7px;
            font-size: 11px;
          }

          .pm-header {
            gap: 12px;
          }
        }

        @media (max-width: 480px) {
          .pm-header {
            flex-direction: column;
          }

          .pm-header > button {
            width: 100%;
          }

          .pm-tabs {
            width: 100%;
          }

          .pm-tab {
            flex: 1;
            justify-content: center;
            padding: 10px 7px;
            font-size: 11px;
          }

          .pm-product-grid {
            grid-template-columns: 1fr;
          }

          .pm-product-image {
            height: 210px;
          }

          .pm-category-grid {
            grid-template-columns: 1fr;
          }

          .pm-modal {
            padding: 18px;
          }

          .pm-modal-footer button {
            flex: 1;
          }
        }
      `}</style>

      {/* ENCABEZADO */}

      <div className="pm-header">
        <div>
          <p className="pm-eyebrow">GESTIÓN · CATÁLOGO</p>

          <h1 className="pm-title">Menú y productos</h1>

          <p className="pm-subtitle">
            Administra tus productos, categorías y disponibilidad.
          </p>
        </div>

        <button
          style={buttonStyle}
          onClick={() => void loadData()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          {loading ? "Actualizando..." : "Actualizar"}
        </button>
      </div>

      {/* ESTADÍSTICAS */}

      <div className="pm-stats">
        <div className="pm-stat">
          <div className="pm-stat-icon">
            <ShoppingBag size={20} />
          </div>

          <div>
            <div className="pm-stat-label">Productos activos</div>
            <div className="pm-stat-value">{activeProducts.length}</div>
          </div>
        </div>

        <div className="pm-stat">
          <div className="pm-stat-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <div className="pm-stat-label">Disponibles</div>
            <div className="pm-stat-value">{availableProducts.length}</div>
          </div>
        </div>

        <div className="pm-stat">
          <div className="pm-stat-icon">
            <Layers size={20} />
          </div>

          <div>
            <div className="pm-stat-label">Categorías activas</div>
            <div className="pm-stat-value">{activeCategories.length}</div>
          </div>
        </div>
      </div>

      {/* ALERTAS */}

      {error && (
        <div className="pm-alert pm-alert-error" role="alert">
          <AlertCircle size={18} />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="pm-alert pm-alert-success" role="status">
          <CheckCircle2 size={18} />
          <span>{success}</span>
        </div>
      )}

      {/* PESTAÑAS */}

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div className="pm-tabs">
          <button
            className={`pm-tab ${
              tab === "products" ? "pm-tab-active" : ""
            }`}
            onClick={() => setTab("products")}
          >
            <Package size={16} />
            Productos ({activeProducts.length})
          </button>

          <button
            className={`pm-tab ${
              tab === "categories" ? "pm-tab-active" : ""
            }`}
            onClick={() => setTab("categories")}
          >
            <Tags size={16} />
            Categorías ({activeCategories.length})
          </button>
        </div>

        <button
          className="pm-primary"
          onClick={
            tab === "products"
              ? openNewProduct
              : openNewCategory
          }
        >
          <Plus size={17} />
          {tab === "products" ? "Nuevo producto" : "Nueva categoría"}
        </button>
      </div>

      {/* PRODUCTOS */}

      {tab === "products" && (
        <section className="pm-panel">
          <div className="pm-search">
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "13px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.5,
              }}
            />

            <input
              style={inputStyle}
              placeholder="Buscar por nombre o descripción..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading ? (
            <div className="pm-empty">
              <RefreshCw
                size={30}
                className="pm-empty-icon"
              />
              <p>Cargando productos...</p>
            </div>
          ) : visibleProducts.length === 0 ? (
            <div className="pm-empty">
              <Package
                size={42}
                className="pm-empty-icon"
              />

              <h3>
                {search
                  ? "No encontramos productos"
                  : "Todavía no tienes productos"}
              </h3>

              <p>
                {search
                  ? "Prueba con otro nombre o descripción."
                  : "Agrega tu primer producto para comenzar."}
              </p>
            </div>
          ) : (
            <div className="pm-product-grid">
              {visibleProducts.map((product) => {
                const categoryName =
                  categories.find(
                    (category) =>
                      category.id === product.category_id
                  )?.name ?? "Sin categoría";

                return (
                  <article
                    key={product.id}
                    className="pm-product-card"
                  >
                    <div className="pm-product-image">
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                        />
                      ) : (
                        <div
                          style={{
                            height: "100%",
                            display: "grid",
                            placeItems: "center",
                            color: "#64748b",
                          }}
                        >
                          <ImagePlus size={45} />
                        </div>
                      )}

                      <span
                        className={`pm-status ${
                          product.is_available
                            ? "pm-status-available"
                            : "pm-status-unavailable"
                        }`}
                      >
                        {product.is_available
                          ? "● Disponible"
                          : "● Agotado"}
                      </span>
                    </div>

                    <div className="pm-product-body">
                      <span className="pm-category-label">
                        {categoryName}
                      </span>

                      <h3 className="pm-product-name">
                        {product.name}
                      </h3>

                      <p className="pm-product-description">
                        {product.description ||
                          "Sin descripción disponible."}
                      </p>

                      <div className="pm-product-details">
                        <span>
                          {product.preparation_area === "bar"
                            ? "🍹 Bar"
                            : "🍳 Cocina"}
                        </span>
                      </div>

                      <div className="pm-price">
                        {formatPrice(product.price)}
                      </div>

                      <div className="pm-actions">
                        <button
                          type="button"
                          className="pm-action pm-action-edit"
                          onClick={() =>
                            openEditProduct(product)
                          }
                        >
                          <Pencil size={14} />
                          Editar
                        </button>

                        <button
                          type="button"
                          className="pm-action pm-action-availability"
                          onClick={() =>
                            void toggleAvailability(product)
                          }
                        >
                          {product.is_available
                            ? "Agotar"
                            : "Activar"}
                        </button>

                        <button
                          type="button"
                          className="pm-action pm-action-danger"
                          onClick={() =>
                            requestDeactivateProduct(product)
                          }
                        >
                          <Power size={14} />
                          Desactivar producto
                        </button>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* CATEGORÍAS */}

      {tab === "categories" && (
        <section className="pm-panel">
          {loading ? (
            <div className="pm-empty">
              <RefreshCw size={30} className="pm-empty-icon" />
              <p>Cargando categorías...</p>
            </div>
          ) : activeCategories.length === 0 ? (
            <div className="pm-empty">
              <Tags size={42} className="pm-empty-icon" />
              <h3>No hay categorías creadas</h3>
              <p>Crea categorías para organizar tu menú.</p>
            </div>
          ) : (
            <div className="pm-category-grid">
              {activeCategories.map((category) => {
                const categoryProducts = products.filter(
                  (product) =>
                    product.category_id === category.id &&
                    product.is_active
                );

                return (
                  <article
                    key={category.id}
                    className="pm-category-card"
                  >
                    <div className="pm-category-header">
                      <div className="pm-category-icon">
                        <Tags size={21} />
                      </div>

                      <div>
                        <h3 className="pm-category-name">
                          {category.name}
                        </h3>
                      </div>
                    </div>

                    <p className="pm-category-description">
                      {category.description ||
                        "Sin descripción disponible."}
                    </p>

                    <div className="pm-category-count">
                      <Package size={14} />
                      {categoryProducts.length} productos
                    </div>

                    <div className="pm-category-actions">
                      <button
                        className="pm-action pm-action-edit"
                        onClick={() =>
                          openEditCategory(category)
                        }
                      >
                        <Pencil size={14} />
                        Editar
                      </button>

                      <button
                        className="pm-action pm-action-danger"
                        style={{ gridColumn: "unset" }}
                        onClick={() =>
                          requestDeactivateCategory(category)
                        }
                      >
                        <Power size={14} />
                        Desactivar
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      )}
            {/* MODAL DE PRODUCTO */}

      {productModal && (
        <div className="pm-modal-overlay">
          <form
            onSubmit={saveProduct}
            className="pm-modal"
          >
            <div className="pm-modal-header">
              <h2>
                {editingProduct
                  ? "Editar producto"
                  : "Nuevo producto"}
              </h2>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => setProductModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <label style={fieldStyle}>
              Nombre del producto *
              <input
                required
                style={inputStyle}
                value={productForm.name}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    name: e.target.value,
                  })
                }
                placeholder="Ej: Hamburguesa especial"
              />
            </label>

            <label style={fieldStyle}>
              Categoría *
              <select
                required
                style={inputStyle}
                value={productForm.category_id}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    category_id: e.target.value,
                  })
                }
              >
                <option value="">
                  Seleccionar categoría
                </option>

                {activeCategories.map((category) => (
                  <option
                    key={category.id}
                    value={category.id}
                  >
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label style={fieldStyle}>
              Descripción
              <textarea
                rows={3}
                style={inputStyle}
                value={productForm.description}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    description: e.target.value,
                  })
                }
                placeholder="Describe brevemente el producto..."
              />
            </label>

            <label style={fieldStyle}>
              Precio (CLP) *
              <input
                required
                type="number"
                min="0"
                step="1"
                style={inputStyle}
                value={productForm.price}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    price: e.target.value,
                  })
                }
                placeholder="Ej: 8500"
              />
            </label>

            <label style={fieldStyle}>
              Área de preparación *
              <select
                required
                style={inputStyle}
                value={productForm.preparation_area}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    preparation_area: e.target.value,
                  })
                }
              >
                <option value="kitchen">Cocina</option>
                <option value="bar">Bar</option>
              </select>
            </label>

            <label style={fieldStyle}>
              Fotografía del producto

              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                style={inputStyle}
                onChange={(e) => {
                  const file =
                    e.target.files?.[0] ?? null;

                  setProductImageFile(file);
                }}
              />

              <span style={{ fontSize: "12px", opacity: 0.65 }}>
                JPG, PNG o WebP. Máximo 5 MB.
              </span>
            </label>

            {productImageFile && (
              <div
                style={{
                  padding: "12px",
                  borderRadius: "10px",
                  background: "rgba(37,99,235,.08)",
                  marginBottom: "16px",
                  fontSize: "13px",
                }}
              >
                <ImagePlus
                  size={16}
                  style={{
                    display: "inline",
                    marginRight: "6px",
                  }}
                />

                Imagen seleccionada:
                <strong style={{ marginLeft: "5px" }}>
                  {productImageFile.name}
                </strong>
              </div>
            )}

            {!productImageFile &&
              productForm.image_url && (
                <div style={{ marginBottom: "17px" }}>
                  <p style={{ fontSize: "13px" }}>
                    Imagen actual:
                  </p>

                  <img
                    src={productForm.image_url}
                    alt="Imagen actual del producto"
                    width={120}
                    height={120}
                    style={{
                      objectFit: "cover",
                      borderRadius: "12px",
                      border: "1px solid var(--border, #ddd)",
                    }}
                  />
                </div>
              )}

            <label style={fieldStyle}>
              Orden de visualización
              <input
                type="number"
                style={inputStyle}
                value={productForm.sort_order}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    sort_order: e.target.value,
                  })
                }
              />
            </label>

            <label
              style={{
                display: "flex",
                gap: "10px",
                alignItems: "center",
                marginBottom: "20px",
              }}
            >
              <input
                type="checkbox"
                checked={productForm.is_available}
                onChange={(e) =>
                  setProductForm({
                    ...productForm,
                    is_available: e.target.checked,
                  })
                }
              />

              Producto disponible para pedidos
            </label>

            <div className="pm-modal-footer">
              <button
                type="button"
                className="pm-cancel"
                onClick={() => setProductModal(false)}
              >
                Cancelar
              </button>

              <button
                className="pm-primary"
                type="submit"
                disabled={
                  saving ||
                  activeCategories.length === 0
                }
              >
                {uploadingImage
                  ? "Subiendo fotografía..."
                  : saving
                    ? "Guardando..."
                    : editingProduct
                      ? "Guardar cambios"
                      : "Crear producto"}
              </button>
            </div>

            {activeCategories.length === 0 && (
              <p
                style={{
                  color: "#dc2626",
                  fontSize: "13px",
                  marginTop: "15px",
                }}
              >
                Primero debes crear una categoría activa.
              </p>
            )}
          </form>
        </div>
      )}

      {/* MODAL DE CATEGORÍA */}

      {categoryModal && (
        <div className="pm-modal-overlay">
          <form
            onSubmit={saveCategory}
            className="pm-modal pm-modal-small"
          >
            <div className="pm-modal-header">
              <h2>
                {editingCategory
                  ? "Editar categoría"
                  : "Nueva categoría"}
              </h2>

              <button
                type="button"
                style={buttonStyle}
                onClick={() => setCategoryModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <label style={fieldStyle}>
              Nombre *
              <input
                required
                style={inputStyle}
                value={categoryForm.name}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    name: e.target.value,
                  })
                }
                placeholder="Ej: Bebidas"
              />
            </label>

            <label style={fieldStyle}>
              Descripción
              <textarea
                rows={3}
                style={inputStyle}
                value={categoryForm.description}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    description: e.target.value,
                  })
                }
                placeholder="Descripción de la categoría..."
              />
            </label>

            <label style={fieldStyle}>
              URL de imagen (opcional)
              <input
                type="url"
                style={inputStyle}
                value={categoryForm.image_url}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    image_url: e.target.value,
                  })
                }
                placeholder="https://..."
              />
            </label>

            <label style={fieldStyle}>
              Orden de visualización
              <input
                type="number"
                style={inputStyle}
                value={categoryForm.sort_order}
                onChange={(e) =>
                  setCategoryForm({
                    ...categoryForm,
                    sort_order: e.target.value,
                  })
                }
              />
            </label>

            <div className="pm-modal-footer">
              <button
                type="button"
                className="pm-cancel"
                onClick={() => setCategoryModal(false)}
              >
                Cancelar
              </button>

              <button
                className="pm-primary"
                type="submit"
                disabled={saving}
              >
                {saving
                  ? "Guardando..."
                  : editingCategory
                    ? "Guardar cambios"
                    : "Crear categoría"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CONFIRMACIÓN VISUAL DE DESACTIVACIÓN */}

      {confirmation && (
        <div className="pm-modal-overlay">
          <div className="pm-modal pm-modal-small">
            <div
              style={{
                width: "52px",
                height: "52px",
                borderRadius: "15px",
                display: "grid",
                placeItems: "center",
                background: "rgba(239,68,68,.10)",
                color: "#dc2626",
                marginBottom: "18px",
              }}
            >
              <Power size={24} />
            </div>

            <h2
              style={{
                margin: "0 0 10px",
                fontSize: "21px",
                fontWeight: 800,
              }}
            >
              {confirmation.title}
            </h2>

            <p
              style={{
                margin: 0,
                lineHeight: 1.6,
                opacity: 0.7,
                fontSize: "14px",
              }}
            >
              {confirmation.message}
            </p>

            <div className="pm-modal-footer">
              <button
                type="button"
                className="pm-cancel"
                disabled={confirming}
                onClick={() => setConfirmation(null)}
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={() =>
                  void executeConfirmation()
                }
                disabled={confirming}
                style={{
                  border: "none",
                  borderRadius: "10px",
                  padding: "11px 15px",
                  background: "#dc2626",
                  color: "white",
                  cursor: confirming
                    ? "not-allowed"
                    : "pointer",
                  fontWeight: 700,
                  opacity: confirming ? 0.7 : 1,
                }}
              >
                {confirming
                  ? "Procesando..."
                  : "Sí, desactivar"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
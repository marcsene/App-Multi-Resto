
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

  const [search, setSearch] = useState("");
  const [error, setError] = useState("");

  const [productModal, setProductModal] = useState(false);
  const [categoryModal, setCategoryModal] = useState(false);

  const [editingProduct, setEditingProduct] = useState<string | null>(null);
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  const [productForm, setProductForm] = useState(emptyProduct);
  const [categoryForm, setCategoryForm] = useState(emptyCategory);

  const [productImageFile, setProductImageFile] = useState<File | null>(null);

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

  const visibleProducts = products.filter((product) => {
    const term = search.toLowerCase();

    return (
      product.name.toLowerCase().includes(term) ||
      (product.description ?? "").toLowerCase().includes(term)
    );
  });

  function openNewProduct() {
    setEditingProduct(null);
    setProductImageFile(null);

    setProductForm({
      ...emptyProduct,
      category_id: activeCategories[0]?.id ?? "",
    });

    setError("");
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
    setProductModal(true);
  }

  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

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
    setCategoryModal(true);
  }

  async function saveCategory(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setSaving(true);
    setError("");

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
    try {
      await setProductAvailability(
        product.id,
        !product.is_available
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

  async function handleDeactivateProduct(product: Product) {
    if (!window.confirm(`¿Desactivar el producto "${product.name}"?`)) {
      return;
    }

    try {
      await deactivateProduct(product.id);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo desactivar el producto."
      );
    }
  }

  async function handleDeactivateCategory(category: Category) {
    if (!window.confirm(`¿Desactivar la categoría "${category.name}"?`)) {
      return;
    }

    try {
      await deactivateCategory(category.id);
      await loadData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo desactivar la categoría."
      );
    }
  }

  const inputStyle: React.CSSProperties = {
    width: "100%",
    padding: "11px 12px",
    border: "1px solid var(--border, #ddd)",
    borderRadius: "8px",
    background: "var(--background, white)",
    color: "inherit",
    font: "inherit",
  };

  const fieldStyle: React.CSSProperties = {
    display: "grid",
    gap: "7px",
    marginBottom: "15px",
  };

  const buttonStyle: React.CSSProperties = {
    border: "1px solid var(--border, #ddd)",
    borderRadius: "8px",
    padding: "9px 12px",
    background: "transparent",
    color: "inherit",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    gap: "7px",
  };

  return (
    <div>
      {/* ENCABEZADO */}

      <div className="welcome-row">
        <div>
          <p className="eyebrow">GESTIÓN · CATÁLOGO</p>

          <h1>Menú y productos</h1>

          <p className="welcome-subtitle">
            Administra las categorías, productos y disponibilidad de tu restaurante.
          </p>
        </div>

        <button
          style={buttonStyle}
          onClick={() => void loadData()}
          disabled={loading}
        >
          <RefreshCw size={16} />
          Actualizar
        </button>
      </div>

      {/* MENSAJE DE ERROR */}

      {error && (
        <div
          role="alert"
          style={{
            padding: "12px 16px",
            marginBottom: "18px",
            borderRadius: "8px",
            background: "#fee2e2",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}

      {/* PESTAÑAS Y BOTÓN */}

      <div
        style={{
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          justifyContent: "space-between",
          marginBottom: "20px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            style={{
              ...buttonStyle,
              background:
                tab === "products"
                  ? "var(--primary, #2563eb)"
                  : "transparent",
              color: tab === "products" ? "white" : "inherit",
            }}
            onClick={() => setTab("products")}
          >
            <Package size={17} />
            Productos ({products.filter((p) => p.is_active).length})
          </button>

          <button
            style={{
              ...buttonStyle,
              background:
                tab === "categories"
                  ? "var(--primary, #2563eb)"
                  : "transparent",
              color: tab === "categories" ? "white" : "inherit",
            }}
            onClick={() => setTab("categories")}
          >
            <Tags size={17} />
            Categorías ({activeCategories.length})
          </button>
        </div>

        <button
          className="primary-button"
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
        <section className="panel" style={{ padding: "20px" }}>
          <div
            style={{
              position: "relative",
              maxWidth: "420px",
              marginBottom: "20px",
            }}
          >
            <Search
              size={18}
              style={{
                position: "absolute",
                left: "12px",
                top: "50%",
                transform: "translateY(-50%)",
                opacity: 0.55,
              }}
            />

            <input
              style={{ ...inputStyle, paddingLeft: "40px" }}
              placeholder="Buscar productos..."
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {loading ? (
            <p>Cargando productos...</p>
          ) : visibleProducts.filter((p) => p.is_active).length === 0 ? (
            <div style={{ padding: "35px 10px", textAlign: "center" }}>
              <Package size={34} />
              <h3>No hay productos para mostrar</h3>
              <p>Agrega tu primer producto para comenzar.</p>
            </div>
          ) : (
          <div
  style={{
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(min(100%, 260px), 1fr))",
    gap: "18px",
  }}
>
  {visibleProducts
    .filter((product) => product.is_active)
    .map((product) => {
      const categoryName =
        categories.find((category) => category.id === product.category_id)
          ?.name ?? "Sin categoría";

      return (
        <article
          key={product.id}
          style={{
            overflow: "hidden",
            border: "1px solid var(--border, #ddd)",
            borderRadius: "14px",
            background: "var(--background, white)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              height: "190px",
              background: "#f1f5f9",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {product.image_url ? (
              <img
                src={product.image_url}
                alt={product.name}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
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
                <ImagePlus size={42} />
              </div>
            )}

            <span
              style={{
                position: "absolute",
                top: "12px",
                right: "12px",
                padding: "6px 10px",
                borderRadius: "20px",
                fontSize: "12px",
                fontWeight: 600,
                background: product.is_available ? "#dcfce7" : "#fee2e2",
                color: product.is_available ? "#166534" : "#991b1b",
              }}
            >
              {product.is_available ? "Disponible" : "Agotado"}
            </span>
          </div>

          <div
            style={{
              padding: "16px",
              display: "flex",
              flexDirection: "column",
              flex: 1,
              gap: "10px",
            }}
          >
            <div>
              <h3 style={{ margin: 0, fontSize: "17px", fontWeight: 700 }}>
                {product.name}
              </h3>

              <p
                style={{
                  margin: "6px 0 0",
                  fontSize: "13px",
                  opacity: 0.7,
                  minHeight: "36px",
                }}
              >
                {product.description || "Sin descripción"}
              </p>
            </div>

            <div style={{ fontSize: "12px", opacity: 0.7 }}>
              <div>Categoría: {categoryName}</div>
              <div>
                Preparación:{" "}
                {product.preparation_area === "bar" ? "Bar" : "Cocina"}
              </div>
            </div>

            <div
              style={{
                fontSize: "23px",
                fontWeight: 800,
                color: "var(--primary, #2563eb)",
                marginTop: "4px",
              }}
            >
              {new Intl.NumberFormat("es-CL", {
                style: "currency",
                currency: "CLP",
                maximumFractionDigits: 0,
              }).format(Number(product.price))}
            </div>

            <div
              style={{
                display: "flex",
                gap: "8px",
                flexWrap: "wrap",
                marginTop: "auto",
                paddingTop: "8px",
              }}
            >
              <button
                type="button"
                style={{ ...buttonStyle, flex: 1, justifyContent: "center" }}
                onClick={() => openEditProduct(product)}
              >
                <Pencil size={15} />
                Editar
              </button>

              <button
                type="button"
                style={{
                  ...buttonStyle,
                  flex: 1,
                  justifyContent: "center",
                }}
                onClick={() => void toggleAvailability(product)}
              >
                {product.is_available ? "Agotar" : "Activar"}
              </button>

              <button
                type="button"
                title="Desactivar producto"
                style={{
                  ...buttonStyle,
                  color: "#dc2626",
                  justifyContent: "center",
                }}
                onClick={() => void handleDeactivateProduct(product)}
              >
                <Power size={16} />
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
        <section className="panel" style={{ padding: "20px" }}>
          {loading ? (
            <p>Cargando categorías...</p>
          ) : activeCategories.length === 0 ? (
            <div style={{ padding: "35px 10px", textAlign: "center" }}>
              <Tags size={34} />
              <h3>No hay categorías creadas</h3>
              <p>Crea categorías para organizar tu menú.</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fill, minmax(230px, 1fr))",
                gap: "14px",
              }}
            >
              {activeCategories.map((category) => (
                <article
                  key={category.id}
                  style={{
                    border: "1px solid var(--border, #ddd)",
                    borderRadius: "10px",
                    padding: "16px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: "10px",
                    }}
                  >
                    <div>
                      <strong>{category.name}</strong>

                      <p style={{ fontSize: "13px", opacity: 0.7 }}>
                        {category.description || "Sin descripción"}
                      </p>
                    </div>

                    <Tags size={22} />
                  </div>

                  <p style={{ fontSize: "12px", opacity: 0.7 }}>
                    {
                      products.filter(
                        (p) =>
                          p.category_id === category.id &&
                          p.is_active
                      ).length
                    }{" "}
                    productos
                  </p>

                  <div style={{ display: "flex", gap: "8px" }}>
                    <button
                      style={buttonStyle}
                      onClick={() => openEditCategory(category)}
                    >
                      <Pencil size={15} />
                      Editar
                    </button>

                    <button
                      style={buttonStyle}
                      onClick={() =>
                        void handleDeactivateCategory(category)
                      }
                    >
                      <Power size={15} />
                      Desactivar
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}

      {/* MODAL DE PRODUCTO */}

      {productModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.55)",
            display: "grid",
            placeItems: "center",
            padding: "16px",
          }}
        >
          <form
            onSubmit={saveProduct}
            style={{
              width: "100%",
              maxWidth: "560px",
              maxHeight: "90vh",
              overflowY: "auto",
              background: "var(--background, white)",
              color: "inherit",
              borderRadius: "14px",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2>
                {editingProduct ? "Editar producto" : "Nuevo producto"}
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
                <option value="">Seleccionar categoría</option>

                {activeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
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
                  const file = e.target.files?.[0] ?? null;
                  setProductImageFile(file);
                }}
              />

              <span style={{ fontSize: "12px", opacity: 0.7 }}>
                JPG, PNG o WebP. Máximo 5 MB.
              </span>
            </label>

            {productImageFile && (
              <p style={{ fontSize: "13px", marginBottom: "15px" }}>
                Imagen seleccionada: <strong>{productImageFile.name}</strong>
              </p>
            )}

            {!productImageFile && productForm.image_url && (
              <div style={{ marginBottom: "15px" }}>
                <p style={{ fontSize: "13px" }}>Imagen actual:</p>
                <img
                  src={productForm.image_url}
                  alt="Imagen actual del producto"
                  width={100}
                  height={100}
                  style={{
                    objectFit: "cover",
                    borderRadius: "8px",
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
                gap: "9px",
                marginBottom: "18px",
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

            <button
              className="primary-button"
              type="submit"
              disabled={
                saving ||
                activeCategories.length === 0
              }
            >
              {uploadingImage
                ? "Subiendo fotografía..."
                : saving
                  ? "Guardando producto..."
                  : editingProduct
                    ? "Guardar cambios"
                    : "Crear producto"}
            </button>

            {activeCategories.length === 0 && (
              <p>Primero debes crear una categoría activa.</p>
            )}
          </form>
        </div>
      )}

      {/* MODAL DE CATEGORÍA */}

      {categoryModal && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 1000,
            background: "rgba(0,0,0,.55)",
            display: "grid",
            placeItems: "center",
            padding: "16px",
          }}
        >
          <form
            onSubmit={saveCategory}
            style={{
              width: "100%",
              maxWidth: "480px",
              background: "var(--background, white)",
              color: "inherit",
              borderRadius: "14px",
              padding: "24px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "20px",
              }}
            >
              <h2>
                {editingCategory ? "Editar categoría" : "Nueva categoría"}
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

            <button
              className="primary-button"
              type="submit"
              disabled={saving}
            >
              {saving
                ? "Guardando..."
                : editingCategory
                  ? "Guardar cambios"
                  : "Crear categoría"}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

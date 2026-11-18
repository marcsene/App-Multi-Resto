
"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  RefreshCw,
  Pencil,
  Trash2,
  QrCode,
  Download,
  Printer,
  X,
  Armchair,
  Users,
  MapPin,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import QRCode from "qrcode";
import { createClient } from "@/lib/supabase/client";

type TableStatus =
  | "available"
  | "occupied"
  | "reserved"
  | "billing"
  | "disabled";

interface RestaurantTable {
  id: string;
  restaurant_id: string;
  table_number: number;
  name: string | null;
  capacity: number;
  location: string | null;
  status: TableStatus;
  qr_token: string;
  is_active: boolean;
  created_at?: string;
}

interface TableForm {
  table_number: string;
  name: string;
  capacity: string;
  location: string;
  status: TableStatus;
}

const EMPTY_FORM: TableForm = {
  table_number: "",
  name: "",
  capacity: "4",
  location: "",
  status: "available",
};

const STATUS_LABELS: Record<TableStatus, string> = {
  available: "Disponible",
  occupied: "Ocupada",
  reserved: "Reservada",
  billing: "Por pagar",
  disabled: "Deshabilitada",
};

export default function TablesManagement() {
  const supabase = createClient();

  const [restaurantId, setRestaurantId] = useState<string | null>(null);
  const [tables, setTables] = useState<RestaurantTable[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTable, setEditingTable] =
    useState<RestaurantTable | null>(null);
  const [form, setForm] = useState<TableForm>(EMPTY_FORM);

  const [qrTable, setQrTable] = useState<RestaurantTable | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // Obtener restaurante activo
  useEffect(() => {
    async function loadActiveRestaurant() {
      try {
        const response = await fetch("/api/active-restaurant", {
          cache: "no-store",
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.error || "No se pudo obtener el restaurante activo."
          );
        }

        const id =
          data.restaurant?.id ??
          data.restaurant_id ??
          data.id;

        if (!id) {
          throw new Error("No se encontró un restaurante activo.");
        }

        setRestaurantId(id);
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Error al cargar el restaurante."
        );
        setLoading(false);
      }
    }

    loadActiveRestaurant();
  }, []);

  // Cargar mesas
  useEffect(() => {
    if (!restaurantId) return;

    loadTables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId]);

  async function loadTables() {
    if (!restaurantId) return;

    setLoading(true);
    setError("");

    try {
      const { data, error: supabaseError } = await supabase
        .from("restaurant_tables")
        .select("*")
        .eq("restaurant_id", restaurantId)
        .order("table_number", { ascending: true });

      if (supabaseError) throw supabaseError;

      setTables(data ?? []);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las mesas."
      );
    } finally {
      setLoading(false);
    }
  }

  // Estadísticas
  const stats = useMemo(() => {
    return {
      total: tables.length,
      available: tables.filter((t) => t.status === "available").length,
      occupied: tables.filter((t) => t.status === "occupied").length,
      reserved: tables.filter((t) => t.status === "reserved").length,
      billing: tables.filter((t) => t.status === "billing").length,
      disabled: tables.filter((t) => t.status === "disabled").length,
    };
  }, [tables]);

  // Búsqueda y filtros
  const filteredTables = useMemo(() => {
    return tables.filter((table) => {
      const searchText = search.toLowerCase();

      const matchesSearch =
        table.table_number.toString().includes(searchText) ||
        (table.name ?? "").toLowerCase().includes(searchText) ||
        (table.location ?? "").toLowerCase().includes(searchText);

      const matchesStatus =
        statusFilter === "all" || table.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [tables, search, statusFilter]);

  function openCreateModal() {
    setEditingTable(null);
    setForm(EMPTY_FORM);
    setError("");
    setModalOpen(true);
  }

  function openEditModal(table: RestaurantTable) {
    setEditingTable(table);

    setForm({
      table_number: String(table.table_number),
      name: table.name ?? "",
      capacity: String(table.capacity),
      location: table.location ?? "",
      status: table.status,
    });

    setError("");
    setModalOpen(true);
  }

 function closeModal() {
  setModalOpen(false);
  setEditingTable(null);
  setForm(EMPTY_FORM);
  setError("");
}

  async function saveTable(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    if (!restaurantId) {
      setError("No se encontró el restaurante activo.");
      return;
    }

    const tableNumber = Number(form.table_number);
    const capacity = Number(form.capacity);

    if (!Number.isInteger(tableNumber) || tableNumber <= 0) {
      setError("El número de mesa debe ser un entero mayor a cero.");
      return;
    }

    if (!Number.isInteger(capacity) || capacity < 1 || capacity > 100) {
      setError("La capacidad debe estar entre 1 y 100 personas.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      if (editingTable) {
        const { error: updateError } = await supabase
          .from("restaurant_tables")
          .update({
            table_number: tableNumber,
            name: form.name.trim() || null,
            capacity,
            location: form.location.trim() || null,
            status: form.status,
          })
          .eq("id", editingTable.id)
          .eq("restaurant_id", restaurantId);

        if (updateError) throw updateError;

        setMessage("Mesa actualizada correctamente.");
      } else {
        const { error: insertError } = await supabase
          .from("restaurant_tables")
          .insert({
            restaurant_id: restaurantId,
            table_number: tableNumber,
            name: form.name.trim() || null,
            capacity,
            location: form.location.trim() || null,
            status: form.status,
          });

        if (insertError) throw insertError;

        setMessage("Mesa creada correctamente.");
      }

      closeModal();
      await loadTables();
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Error al guardar la mesa.";

      if (errorMessage.toLowerCase().includes("duplicate")) {
        setError("Ya existe una mesa con ese número.");
      } else {
        setError(errorMessage);
      }
    } finally {
      setSaving(false);
    }
  }

  async function deleteTable(table: RestaurantTable) {
    const confirmed = window.confirm(
      `¿Seguro que deseas eliminar la mesa ${table.table_number}?\n\nSi tiene pedidos asociados, la base de datos podría impedir eliminarla. En ese caso puedes deshabilitarla.`
    );

    if (!confirmed || !restaurantId) return;

    setError("");
    setMessage("");

    try {
      const { error: deleteError } = await supabase
        .from("restaurant_tables")
        .delete()
        .eq("id", table.id)
        .eq("restaurant_id", restaurantId);

      if (deleteError) throw deleteError;

      setMessage(`Mesa ${table.table_number} eliminada.`);
      await loadTables();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo eliminar la mesa."
      );
    }
  }

  async function changeStatus(
    table: RestaurantTable,
    newStatus: TableStatus
  ) {
    if (!restaurantId) return;

    try {
      const { error: updateError } = await supabase
        .from("restaurant_tables")
        .update({ status: newStatus })
        .eq("id", table.id)
        .eq("restaurant_id", restaurantId);

      if (updateError) throw updateError;

      await loadTables();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo actualizar el estado."
      );
    }
  }

  // Crear QR
  async function openQR(table: RestaurantTable) {
    setQrTable(table);
    setQrImage("");
    setError("");

    try {
      const baseUrl =
        typeof window !== "undefined"
          ? window.location.origin
          : "";

      // URL destinada al acceso del cliente por QR
      const qrUrl = `${baseUrl}/menu?table=${table.qr_token}`;

      const image = await QRCode.toDataURL(qrUrl, {
        width: 500,
        margin: 2,
        errorCorrectionLevel: "H",
        color: {
          dark: "#17243a",
          light: "#ffffff",
        },
      });

      setQrImage(image);
    } catch {
      setError("No se pudo generar el código QR.");
    }
  }

  function downloadQR() {
    if (!qrImage || !qrTable) return;

    const link = document.createElement("a");
    link.href = qrImage;
    link.download = `QR-Mesa-${qrTable.table_number}.png`;
    link.click();
  }

  function printQR() {
    if (!qrImage || !qrTable) return;

    const printWindow = window.open("", "_blank");

    if (!printWindow) {
      setError("Permite las ventanas emergentes para imprimir el QR.");
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Mesa ${qrTable.table_number}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              text-align: center;
              padding: 30px;
              color: #17243a;
            }
            .card {
              border: 2px solid #e5eaf2;
              border-radius: 18px;
              max-width: 360px;
              margin: auto;
              padding: 25px;
            }
            h1 { margin: 0 0 8px; }
            h2 { margin: 10px 0; }
            p { color: #66758b; }
            img { width: 260px; height: 260px; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>Menú del restaurante</h1>
            <h2>Mesa ${qrTable.table_number}</h2>
            ${
              qrTable.name
                ? `<p>${qrTable.name}</p>`
                : ""
            }
            <img src="${qrImage}" />
            <p>Escanea el código QR para acceder al menú</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
  }

  function getStatusClass(status: TableStatus) {
    return `tm-status tm-status-${status}`;
  }

  return (
    <section className="tables-management">
      {/* Encabezado */}
      <div className="tm-header">
        <div>
          <p className="tm-eyebrow">ADMINISTRACIÓN</p>
          <h1>Gestión de mesas</h1>
          <p className="tm-subtitle">
            Administra tus mesas, estados, capacidad y códigos QR.
          </p>
        </div>

        <div className="tm-header-actions">
          <button
            className="tm-secondary-button"
            onClick={loadTables}
            disabled={loading}
          >
            <RefreshCw size={16} />
            Actualizar
          </button>

          <button
            className="tm-primary-button"
            onClick={openCreateModal}
          >
            <Plus size={17} />
            Nueva mesa
          </button>
        </div>
      </div>

      {/* Mensajes */}
      {message && (
        <div className="tm-message tm-success-message">
          <CheckCircle2 size={17} />
          {message}
          <button onClick={() => setMessage("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {error && !modalOpen && (
        <div className="tm-message tm-error-message">
          <AlertCircle size={17} />
          {error}
          <button onClick={() => setError("")}>
            <X size={15} />
          </button>
        </div>
      )}

      {/* Estadísticas */}
      <div className="tm-stats">
        <div className="tm-stat-card">
          <div className="tm-stat-icon tm-stat-blue">
            <Armchair size={19} />
          </div>
          <div>
            <span>Total de mesas</span>
            <strong>{stats.total}</strong>
          </div>
        </div>

        <div className="tm-stat-card">
          <div className="tm-stat-icon tm-stat-green">
            <CheckCircle2 size={19} />
          </div>
          <div>
            <span>Disponibles</span>
            <strong>{stats.available}</strong>
          </div>
        </div>

        <div className="tm-stat-card">
          <div className="tm-stat-icon tm-stat-orange">
            <Users size={19} />
          </div>
          <div>
            <span>Ocupadas</span>
            <strong>{stats.occupied}</strong>
          </div>
        </div>

        <div className="tm-stat-card">
          <div className="tm-stat-icon tm-stat-purple">
            <QrCode size={19} />
          </div>
          <div>
            <span>Reservadas</span>
            <strong>{stats.reserved}</strong>
          </div>
        </div>
      </div>

      {/* Filtros */}
      <div className="tm-toolbar">
        <div className="tm-search">
          <Search size={17} />
          <input
            type="text"
            placeholder="Buscar mesa, nombre o ubicación..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="tm-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Todos los estados</option>
          <option value="available">Disponible</option>
          <option value="occupied">Ocupada</option>
          <option value="reserved">Reservada</option>
          <option value="billing">Por pagar</option>
          <option value="disabled">Deshabilitada</option>
        </select>
      </div>

      {/* Mesas */}
      <div className="tm-table-container">
        <div className="tm-table-heading">
          <div>
            <h2>Mesas del restaurante</h2>
            <p>
              {filteredTables.length} mesa(s) encontradas
            </p>
          </div>
        </div>

        {loading ? (
          <div className="tm-loading">
            <RefreshCw size={22} className="tm-spin" />
            <p>Cargando mesas...</p>
          </div>
        ) : filteredTables.length === 0 ? (
          <div className="tm-empty">
            <Armchair size={38} />
            <h3>No hay mesas para mostrar</h3>
            <p>
              {tables.length === 0
                ? "Crea tu primera mesa para comenzar."
                : "Prueba con otro filtro de búsqueda."}
            </p>

            {tables.length === 0 && (
              <button
                className="tm-primary-button"
                onClick={openCreateModal}
              >
                <Plus size={16} />
                Crear primera mesa
              </button>
            )}
          </div>
        ) : (
          <div className="tm-table-scroll">
            <table className="tm-table">
              <thead>
                <tr>
                  <th>MESA</th>
                  <th>NOMBRE</th>
                  <th>CAPACIDAD</th>
                  <th>UBICACIÓN</th>
                  <th>ESTADO</th>
                  <th>QR</th>
                  <th>ACCIONES</th>
                </tr>
              </thead>

              <tbody>
                {filteredTables.map((table) => (
                  <tr key={table.id}>
                    <td>
                      <strong className="tm-table-number">
                        {String(table.table_number).padStart(2, "0")}
                      </strong>
                    </td>

                    <td>
                      {table.name || (
                        <span className="tm-muted">Sin nombre</span>
                      )}
                    </td>

                    <td>
                      <span className="tm-capacity">
                        <Users size={14} />
                        {table.capacity}
                      </span>
                    </td>

                    <td>
                      {table.location ? (
                        <span className="tm-location">
                          <MapPin size={13} />
                          {table.location}
                        </span>
                      ) : (
                        <span className="tm-muted">—</span>
                      )}
                    </td>

                    <td>
                      <select
                        className={getStatusClass(table.status)}
                        value={table.status}
                        onChange={(e) =>
                          changeStatus(
                            table,
                            e.target.value as TableStatus
                          )
                        }
                      >
                        {Object.entries(STATUS_LABELS).map(
                          ([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          )
                        )}
                      </select>
                    </td>

                    <td>
                      <button
                        className="tm-qr-button"
                        onClick={() => openQR(table)}
                        title="Ver QR"
                      >
                        <QrCode size={16} />
                        QR
                      </button>
                    </td>

                    <td>
                      <div className="tm-actions">
                        <button
                          className="tm-action-button"
                          title="Editar mesa"
                          onClick={() => openEditModal(table)}
                        >
                          <Pencil size={15} />
                        </button>

                        <button
                          className="tm-action-button tm-delete-button"
                          title="Eliminar mesa"
                          onClick={() => deleteTable(table)}
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal crear / editar */}
      {modalOpen && (
        <div
          className="tm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div className="tm-modal">
            <div className="tm-modal-header">
              <div>
                <h2>
                  {editingTable ? "Editar mesa" : "Crear nueva mesa"}
                </h2>
                <p>
                  Completa la información de la mesa.
                </p>
              </div>

              <button
                className="tm-close-button"
                onClick={closeModal}
                disabled={saving}
              >
                <X size={19} />
              </button>
            </div>

            {error && (
              <div className="tm-message tm-error-message">
                <AlertCircle size={16} />
                {error}
              </div>
            )}

            <form onSubmit={saveTable}>
              <div className="tm-form-grid">
                <div className="tm-form-group">
                  <label>Número de mesa *</label>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    required
                    value={form.table_number}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        table_number: e.target.value,
                      })
                    }
                    placeholder="Ej: 1"
                  />
                </div>

                <div className="tm-form-group">
                  <label>Capacidad *</label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    required
                    value={form.capacity}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        capacity: e.target.value,
                      })
                    }
                    placeholder="Ej: 4"
                  />
                </div>

                <div className="tm-form-group tm-form-full">
                  <label>Nombre (opcional)</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        name: e.target.value,
                      })
                    }
                    placeholder="Ej: Terraza, VIP, Ventana..."
                  />
                </div>

                <div className="tm-form-group tm-form-full">
                  <label>Ubicación (opcional)</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        location: e.target.value,
                      })
                    }
                    placeholder="Ej: Terraza, segundo piso..."
                  />
                </div>

                <div className="tm-form-group tm-form-full">
                  <label>Estado</label>
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        status: e.target.value as TableStatus,
                      })
                    }
                  >
                    {Object.entries(STATUS_LABELS).map(
                      ([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="tm-modal-footer">
                <button
                  type="button"
                  className="tm-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  className="tm-primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <RefreshCw size={15} className="tm-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      {editingTable ? "Guardar cambios" : "Crear mesa"}
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal QR */}
      {qrTable && (
        <div
          className="tm-modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setQrTable(null);
            }
          }}
        >
          <div className="tm-qr-modal">
            <button
              className="tm-close-button tm-qr-close"
              onClick={() => setQrTable(null)}
            >
              <X size={19} />
            </button>

            <div className="tm-qr-content">
              <div className="tm-qr-icon">
                <QrCode size={22} />
              </div>

              <p className="tm-eyebrow">CÓDIGO DE ACCESO</p>

              <h2>Mesa {qrTable.table_number}</h2>

              {qrTable.name && (
                <p className="tm-qr-name">{qrTable.name}</p>
              )}

              <p className="tm-qr-description">
                Escanea este código para acceder al menú de esta mesa.
              </p>

              {qrImage ? (
                <div className="tm-qr-image-container">
                  <img src={qrImage} alt={`QR Mesa ${qrTable.table_number}`} />
                </div>
              ) : (
                <div className="tm-qr-loading">
                  <RefreshCw size={22} className="tm-spin" />
                  Generando QR...
                </div>
              )}

              <div className="tm-qr-actions">
                <button
                  className="tm-secondary-button"
                  onClick={downloadQR}
                  disabled={!qrImage}
                >
                  <Download size={16} />
                  Descargar
                </button>

                <button
                  className="tm-primary-button"
                  onClick={printQR}
                  disabled={!qrImage}
                >
                  <Printer size={16} />
                  Imprimir
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

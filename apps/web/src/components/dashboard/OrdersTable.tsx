
import { ArrowUpRight } from "lucide-react";

interface Order {
  id: string;
  customer: string;
  items: string;
  table: string;
  total: string;
  status: string;
  color: string;
}

interface OrdersTableProps {
  onViewAll: () => void;
}

const orders: Order[] = [
  {
    id: "#ORD-1048",
    customer: "Camila Rodríguez",
    items: "2 productos",
    table: "Mesa 04",
    total: "$24.500",
    status: "Preparando",
    color: "amber",
  },
  {
    id: "#ORD-1047",
    customer: "Matías González",
    items: "3 productos",
    table: "Mesa 02",
    total: "$18.900",
    status: "Listo",
    color: "green",
  },
  {
    id: "#ORD-1046",
    customer: "Sofía Martínez",
    items: "1 producto",
    table: "Mesa 07",
    total: "$12.000",
    status: "Pendiente",
    color: "blue",
  },
  {
    id: "#ORD-1045",
    customer: "Diego Pérez",
    items: "4 productos",
    table: "Mesa 01",
    total: "$32.800",
    status: "Preparando",
    color: "amber",
  },
];

export default function OrdersTable({
  onViewAll,
}: OrdersTableProps) {
  return (
    <section className="panel orders-panel">
      <div className="panel-heading">
        <div>
          <h2>Pedidos recientes</h2>
          <p>Seguimiento de los últimos pedidos</p>
        </div>

        <button
          className="text-action"
          onClick={onViewAll}
        >
          Ver todos <ArrowUpRight size={15} />
        </button>
      </div>

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
            {orders.map((order) => (
              <tr key={order.id}>
                <td>
                  <strong>{order.id}</strong>
                  <span>{order.items}</span>
                </td>

                <td>{order.customer}</td>
                <td>{order.table}</td>
                <td className="order-total">{order.total}</td>

                <td>
                  <span
                    className={`status-pill status-${order.color}`}
                  >
                    <i />
                    {order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}


import {
  ShoppingBag,
  CircleCheck,
  Clock3,
  Users,
  MoreHorizontal,
} from "lucide-react";

export default function ActivityPanel() {
  return (
    <section className="panel quick-panel">
      <div className="panel-heading">
        <div>
          <h2>Actividad de hoy</h2>
          <p>Estado de las operaciones</p>
        </div>

        <button className="more-button" aria-label="Más opciones">
          <MoreHorizontal size={21} />
        </button>
      </div>

      <div className="activity-list">
        <div className="activity-item">
          <div className="activity-icon activity-purple">
            <ShoppingBag size={18} />
          </div>

          <div>
            <strong>48 pedidos</strong>
            <span>Pedidos registrados hoy</span>
          </div>

          <b>+8,2%</b>
        </div>

        <div className="activity-item">
          <div className="activity-icon activity-green">
            <CircleCheck size={18} />
          </div>

          <div>
            <strong>32 completados</strong>
            <span>Pedidos entregados</span>
          </div>

          <b>66,7%</b>
        </div>

        <div className="activity-item">
          <div className="activity-icon activity-orange">
            <Clock3 size={18} />
          </div>

          <div>
            <strong>8 en preparación</strong>
            <span>En cocina y bar</span>
          </div>

          <b>En curso</b>
        </div>

        <div className="activity-item">
          <div className="activity-icon activity-blue">
            <Users size={18} />
          </div>

          <div>
            <strong>26 clientes</strong>
            <span>Atendidos durante el día</span>
          </div>

          <b>+4</b>
        </div>
      </div>

      <div className="activity-footer">
        <span>Última actualización</span>
        <strong>Hace un momento</strong>
      </div>
    </section>
  );
}

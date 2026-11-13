
import {
  ShoppingBag,
  Armchair,
  BarChart3,
  Wallet,
  TrendingUp,
} from "lucide-react";

export default function StatsCards() {
  return (
    <div className="stats-grid">
      <article className="stat-card">
        <div className="stat-top">
          <span>Ventas del día</span>

          <div className="stat-icon purple">
            <Wallet size={19} />
          </div>
        </div>

        <strong className="stat-value">$486.500</strong>

        <div className="stat-foot">
          <span className="trend-positive">
            <TrendingUp size={14} /> +12,8%
          </span>
          <span>vs. ayer</span>
        </div>
      </article>

      <article className="stat-card">
        <div className="stat-top">
          <span>Pedidos recibidos</span>

          <div className="stat-icon blue">
            <ShoppingBag size={19} />
          </div>
        </div>

        <strong className="stat-value">48</strong>

        <div className="stat-foot">
          <span className="trend-positive">
            <TrendingUp size={14} /> +8,2%
          </span>
          <span>vs. ayer</span>
        </div>
      </article>

      <article className="stat-card">
        <div className="stat-top">
          <span>Mesas ocupadas</span>

          <div className="stat-icon orange">
            <Armchair size={19} />
          </div>
        </div>

        <strong className="stat-value">
          12 <small>/ 18</small>
        </strong>

        <div className="stat-foot">
          <span className="stat-neutral">66,7%</span>
          <span>de ocupación</span>
        </div>
      </article>

      <article className="stat-card">
        <div className="stat-top">
          <span>Ticket promedio</span>

          <div className="stat-icon green">
            <BarChart3 size={19} />
          </div>
        </div>

        <strong className="stat-value">$10.135</strong>

        <div className="stat-foot">
          <span className="trend-positive">
            <TrendingUp size={14} /> +5,4%
          </span>
          <span>vs. ayer</span>
        </div>
      </article>
    </div>
  );
}

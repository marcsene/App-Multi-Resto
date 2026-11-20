
"use client";

import OrdersTable from "@/components/dashboard/OrdersTable";

export default function OrdersPage() {
  return (
    <div className="orders-page">
      <OrdersTable onViewAll={() => {}} showAll />

      <style jsx global>{`
        .orders-page {
          width: 100%;
        }

        .orders-page table {
          width: 100%;
        }

        .orders-page th {
          font-size: 14px !important;
          font-weight: 700 !important;
          letter-spacing: 0.03em;
        }

        .orders-page td {
          font-size: 16px !important;
          line-height: 1.6;
        }

        .orders-page td span,
        .orders-page td p,
        .orders-page td div {
          font-size: inherit;
        }

        .orders-page td small {
          font-size: 13px !important;
        }

        .orders-page button {
          font-size: 15px;
        }
      `}</style>
    </div>
  );
}

"use client";

import { useState } from "react";
import { formatPrice } from "@/lib/utils";

type Day = { date: string; revenue: number; orders: number };

const dayLabel = (date: string) =>
  new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short" }).format(new Date(`${date}T00:00:00`));

/** Single-series bar chart of daily paid revenue with hover/focus tooltips. */
export function RevenueChart({ days }: { days: Day[] }) {
  const [active, setActive] = useState<number | null>(null);
  const max = Math.max(...days.map((d) => Number(d.revenue)), 0);
  const top = max > 0 ? niceCeiling(max) : 1;
  const total = days.reduce((sum, d) => sum + Number(d.revenue), 0);

  return (
    <figure>
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="font-medium">Revenue, last 14 days</span>
        <span className="text-sm text-muted">{formatPrice(total)} total</span>
      </figcaption>

      <div className="relative mt-6 h-48" onMouseLeave={() => setActive(null)}>
        {/* Recessive gridlines at 0, 50% and 100% of the scale */}
        {[1, 0.5, 0].map((f) => (
          <div key={f} className="absolute inset-x-0 border-t border-line" style={{ bottom: `${f * 100}%` }} aria-hidden>
            <span className="absolute -top-2.5 left-0 bg-surface pr-2 text-[11px] text-muted">
              {f === 0 ? "₦0" : compact(top * f)}
            </span>
          </div>
        ))}

        <div className="absolute inset-0 left-12 flex items-end gap-[2px]" aria-hidden>
          {days.map((day, i) => {
            const value = Number(day.revenue);
            const height = value > 0 ? Math.max((value / top) * 100, 1.5) : 0;
            return (
              <div
                key={day.date}
                className="relative flex h-full flex-1 items-end"
                onMouseEnter={() => setActive(i)}
              >
                <div
                  className="w-full rounded-t-[4px] transition-opacity"
                  style={{
                    height: `${height}%`,
                    background: "var(--color-chart)",
                    opacity: active === null || active === i ? 1 : 0.45,
                  }}
                />
                {active === i && (
                  <div
                    className={`pointer-events-none absolute bottom-full z-10 mb-2 w-max rounded-lg bg-ink px-3 py-2 text-xs text-white shadow-lg ${
                      i > days.length / 2 ? "right-0" : "left-0"
                    }`}
                  >
                    <p className="font-medium">{dayLabel(day.date)}</p>
                    <p>{formatPrice(value)}</p>
                    <p className="text-white/70">
                      {day.orders} {day.orders === 1 ? "order" : "orders"}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="ml-12 mt-2 flex justify-between text-[11px] text-muted" aria-hidden>
        <span>{days[0] && dayLabel(days[0].date)}</span>
        <span>{days.at(-1) && dayLabel(days.at(-1)!.date)}</span>
      </div>

      {/* Table view for screen readers */}
      <table className="sr-only">
        <caption>Daily revenue for the last 14 days</caption>
        <thead>
          <tr>
            <th scope="col">Date</th>
            <th scope="col">Revenue</th>
            <th scope="col">Orders</th>
          </tr>
        </thead>
        <tbody>
          {days.map((d) => (
            <tr key={d.date}>
              <td>{dayLabel(d.date)}</td>
              <td>{formatPrice(d.revenue)}</td>
              <td>{d.orders}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

function niceCeiling(value: number) {
  const magnitude = 10 ** Math.floor(Math.log10(value));
  return Math.ceil(value / magnitude) * magnitude;
}

function compact(value: number) {
  return `₦${new Intl.NumberFormat("en-NG", { notation: "compact", maximumFractionDigits: 1 }).format(value)}`;
}

import "server-only";
import { assertNoError } from "@/lib/api";
import { createClient } from "@/lib/supabase/server";
import type { AdminStats, Order, OrderStatus, OrderWithItems, Paginated } from "@/lib/types";

const ORDER_WITH_ITEMS = "*, items:order_items(*)";

/** Orders visible to the current user (own orders, or all for admins via RLS). */
export async function listOrders(options: {
  userId?: string;
  status?: OrderStatus;
  q?: string;
  page?: number;
  pageSize?: number;
}): Promise<Paginated<Order>> {
  const { userId, status, q, page = 1, pageSize = 20 } = options;
  const supabase = await createClient();

  let request = supabase.from("orders").select("*", { count: "exact" });
  if (userId) request = request.eq("user_id", userId);
  if (status) request = request.eq("status", status);
  if (q) {
    const term = q.replace(/[^a-zA-Z0-9@.\-\s]/g, "").trim();
    if (term) request = request.or(`order_number.ilike.%${term}%,email.ilike.%${term}%,shipping_name.ilike.%${term}%`);
  }

  const from = (page - 1) * pageSize;
  const { data, count, error } = await request
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);
  if (error?.code === "PGRST103") return { items: [], total: count ?? 0, page, pageSize, pageCount: 0 };
  assertNoError(error);

  const total = count ?? 0;
  return { items: (data ?? []) as Order[], total, page, pageSize, pageCount: Math.ceil(total / pageSize) };
}

export async function getOrder(id: string): Promise<OrderWithItems | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.from("orders").select(ORDER_WITH_ITEMS).eq("id", id).maybeSingle();
  assertNoError(error);
  return data as OrderWithItems | null;
}

export async function getAdminStats(): Promise<AdminStats> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("admin_stats");
  assertNoError(error);
  return data as AdminStats;
}

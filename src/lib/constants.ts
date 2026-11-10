import type { OrderStatus, PaymentStatus } from "@/lib/types";

export const STORE_NAME = "Velora";

// Display-only mirror of the delivery rule in the create_order() SQL function.
// The server is the source of truth for every total that is charged.
export const FREE_SHIPPING_THRESHOLD = 50000;
export const FLAT_SHIPPING_FEE = 2500;

export function estimateShipping(subtotal: number) {
  return subtotal >= FREE_SHIPPING_THRESHOLD || subtotal === 0 ? 0 : FLAT_SHIPPING_FEE;
}

export const PRODUCTS_PAGE_SIZE = 12;
export const LOW_STOCK_THRESHOLD = 5;
export const MAX_CART_QUANTITY = 99;

export const PRODUCT_SORTS = {
  newest: "Newest",
  price_asc: "Price: low to high",
  price_desc: "Price: high to low",
} as const;
export type ProductSort = keyof typeof PRODUCT_SORTS;

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Awaiting payment",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  unpaid: "Unpaid",
  paid: "Paid",
  failed: "Failed",
};

export const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa", "Benue", "Borno",
  "Cross River", "Delta", "Ebonyi", "Edo", "Ekiti", "Enugu", "FCT - Abuja", "Gombe",
  "Imo", "Jigawa", "Kaduna", "Kano", "Katsina", "Kebbi", "Kogi", "Kwara", "Lagos",
  "Nasarawa", "Niger", "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers", "Sokoto",
  "Taraba", "Yobe", "Zamfara",
] as const;

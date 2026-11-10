export type UserRole = "customer" | "admin";
export type OrderStatus = "pending" | "processing" | "shipped" | "delivered" | "cancelled";
export type PaymentStatus = "unpaid" | "paid" | "failed";

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  role: UserRole;
  created_at: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  created_at: string;
};

export type Product = {
  id: string;
  category_id: string | null;
  name: string;
  slug: string;
  description: string;
  price: number;
  stock: number;
  images: string[];
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: Pick<Category, "id" | "name" | "slug"> | null;
};

export type CartLine = {
  productId: string;
  quantity: number;
  name: string;
  slug: string;
  price: number;
  stock: number;
  image: string | null;
  isActive: boolean;
};

export type Order = {
  id: string;
  order_number: string;
  user_id: string | null;
  status: OrderStatus;
  payment_status: PaymentStatus;
  subtotal: number;
  shipping_fee: number;
  total: number;
  currency: string;
  email: string;
  shipping_name: string;
  shipping_phone: string;
  shipping_address: string;
  shipping_city: string;
  shipping_state: string;
  shipping_postal_code: string | null;
  delivery_notes: string | null;
  payment_reference: string | null;
  paid_at: string | null;
  admin_note: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  product_slug: string | null;
  product_image: string | null;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type OrderWithItems = Order & { items: OrderItem[] };

export type AdminStats = {
  revenue: number;
  paid_orders: number;
  total_orders: number;
  awaiting_fulfilment: number;
  customers: number;
  products: number;
  low_stock: number;
  daily_revenue: { date: string; revenue: number; orders: number }[];
};

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
};

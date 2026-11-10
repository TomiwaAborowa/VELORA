import { z } from "zod";
import { MAX_CART_QUANTITY, PRODUCT_SORTS } from "@/lib/constants";

const trimmed = (min: number, max: number, label: string) =>
  z
    .string({ error: `${label} is required` })
    .trim()
    .min(min, min <= 1 ? `${label} is required` : `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max, `Must be at most ${max} characters`)
    .optional()
    .transform((v) => (v ? v : undefined));

const email = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email address"));

const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/[0-9]/, "Password must contain a number");

const phone = z
  .string()
  .trim()
  .regex(/^\+?[0-9\s-]{7,20}$/, "Enter a valid phone number");

const slug = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Use lowercase letters, numbers and hyphens only")
  .max(80);

// ----- Auth -----------------------------------------------------------------
export const registerSchema = z.object({
  fullName: trimmed(2, 100, "Full name"),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ password });

export const profileSchema = z.object({
  fullName: trimmed(2, 100, "Full name"),
  phone: z.union([phone, z.literal("")]).optional().transform((v) => v || null),
});

// ----- Catalogue --------------------------------------------------------------
export const productQuerySchema = z.object({
  q: z.string().trim().max(100).optional().catch(undefined),
  category: slug.optional().catch(undefined),
  sort: z.enum(Object.keys(PRODUCT_SORTS) as [keyof typeof PRODUCT_SORTS]).catch("newest"),
  page: z.coerce.number().int().min(1).max(1000).catch(1),
  pageSize: z.coerce.number().int().min(1).max(48).catch(12),
});

// Treat blank form inputs as missing rather than letting coercion turn "" into 0.
const blankToUndefined = (v: unknown) => (typeof v === "string" && v.trim() === "" ? undefined : v);

export const productSchema = z.object({
  name: trimmed(2, 120, "Name"),
  slug: z.union([slug, z.literal("")]).optional(),
  description: z.string().trim().max(5000, "Description must be at most 5000 characters").default(""),
  price: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: "Price must be a number" })
      .min(0, "Price cannot be negative")
      .max(100_000_000, "Price is too high")
      .refine((n) => Number.isInteger(Math.round(n * 100 * 1e6) / 1e6), "Price can have at most 2 decimal places"),
  ),
  stock: z.preprocess(
    blankToUndefined,
    z.coerce
      .number({ error: "Stock must be a number" })
      .int("Stock must be a whole number")
      .min(0, "Stock cannot be negative")
      .max(1_000_000),
  ),
  categoryId: z.union([z.uuid(), z.literal(""), z.null()]).optional().transform((v) => v || null),
  images: z.array(z.url("Invalid image URL")).max(6, "Up to 6 images").default([]),
  isActive: z.boolean().default(true),
});

export const categorySchema = z.object({
  name: trimmed(2, 60, "Name"),
  slug: z.union([slug, z.literal("")]).optional(),
  description: optionalText(500),
});

// ----- Cart -----------------------------------------------------------------
const quantity = z.coerce
  .number()
  .int("Quantity must be a whole number")
  .min(1, "Quantity must be at least 1")
  .max(MAX_CART_QUANTITY, `Quantity cannot exceed ${MAX_CART_QUANTITY}`);

export const addToCartSchema = z.object({ productId: z.uuid(), quantity: quantity.default(1) });
export const updateCartSchema = z.object({ quantity });
export const mergeCartSchema = z.object({
  items: z.array(z.object({ productId: z.uuid(), quantity })).max(100),
});

// ----- Checkout & orders ------------------------------------------------------
export const checkoutSchema = z.object({
  fullName: trimmed(2, 100, "Full name"),
  phone,
  address: trimmed(5, 200, "Address"),
  city: trimmed(2, 80, "City"),
  state: trimmed(2, 40, "State"),
  postalCode: z
    .string()
    .trim()
    .regex(/^[0-9A-Za-z\s-]{0,10}$/, "Enter a valid postal code")
    .optional()
    .transform((v) => v || undefined),
  notes: optionalText(300),
});

export const orderStatusSchema = z.object({
  status: z.enum(["processing", "shipped", "delivered", "cancelled"]),
});

export const uuidParam = z.uuid("Invalid id");

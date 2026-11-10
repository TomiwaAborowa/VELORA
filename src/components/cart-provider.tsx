"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { api, ApiClientError } from "@/lib/client-api";
import { MAX_CART_QUANTITY } from "@/lib/constants";
import type { CartLine } from "@/lib/types";

const STORAGE_KEY = "velora.cart";

type CartContextValue = {
  lines: CartLine[];
  count: number;
  subtotal: number;
  ready: boolean;
  isAuthenticated: boolean;
  add: (product: Omit<CartLine, "quantity">, quantity: number) => Promise<void>;
  setQuantity: (productId: string, quantity: number) => Promise<void>;
  remove: (productId: string) => Promise<void>;
  reload: () => Promise<void>;
};

const CartContext = createContext<CartContextValue | null>(null);

function readLocal(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as CartLine[]) : [];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocal(lines: CartLine[]) {
  try {
    if (lines.length) localStorage.setItem(STORAGE_KEY, JSON.stringify(lines));
    else localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage unavailable (private mode) — the cart lives in memory only.
  }
}

/** Load the cart; on first load after sign-in, merges the guest cart into the account. */
async function loadLines(userId: string | null): Promise<CartLine[]> {
  const local = readLocal();
  if (!userId) return local;
  if (!local.length) return api<CartLine[]>("/api/cart");
  const merged = await api<CartLine[]>("/api/cart/merge", {
    method: "POST",
    json: { items: local.map(({ productId, quantity }) => ({ productId, quantity })) },
  });
  writeLocal([]);
  return merged;
}

function stockError(line: Pick<CartLine, "name" | "stock">) {
  return new ApiClientError(
    409,
    "insufficient_stock",
    line.stock === 0 ? `${line.name} is out of stock.` : `Only ${line.stock} of ${line.name} available.`,
  );
}

/**
 * Guests keep their cart in localStorage; signed-in customers' carts are
 * persisted through the REST API. On sign-in, the guest cart is merged.
 */
export function CartProvider({ userId, children }: { userId: string | null; children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const isAuthenticated = Boolean(userId);

  const reload = useCallback(async () => {
    setLines(await loadLines(userId));
  }, [userId]);

  useEffect(() => {
    let cancelled = false;
    loadLines(userId)
      .then((loaded) => {
        if (!cancelled) setLines(loaded);
      })
      .catch(() => {
        if (!cancelled) setLines([]);
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const add = useCallback<CartContextValue["add"]>(
    async (product, quantity) => {
      if (userId) {
        setLines(await api<CartLine[]>("/api/cart", { method: "POST", json: { productId: product.productId, quantity } }));
        return;
      }
      const current = readLocal();
      const existing = current.find((l) => l.productId === product.productId);
      const next = (existing?.quantity ?? 0) + quantity;
      if (next > product.stock) throw stockError(product);
      if (next > MAX_CART_QUANTITY) throw new ApiClientError(422, "too_many", `You can add up to ${MAX_CART_QUANTITY}.`);
      const updated = existing
        ? current.map((l) => (l.productId === product.productId ? { ...product, quantity: next } : l))
        : [...current, { ...product, quantity }];
      writeLocal(updated);
      setLines(updated);
    },
    [userId],
  );

  const setQuantity = useCallback<CartContextValue["setQuantity"]>(
    async (productId, quantity) => {
      if (userId) {
        setLines(await api<CartLine[]>(`/api/cart/${productId}`, { method: "PATCH", json: { quantity } }));
        return;
      }
      const current = readLocal();
      const line = current.find((l) => l.productId === productId);
      if (!line) return;
      if (quantity > line.stock) throw stockError(line);
      const updated = current.map((l) => (l.productId === productId ? { ...l, quantity } : l));
      writeLocal(updated);
      setLines(updated);
    },
    [userId],
  );

  const remove = useCallback<CartContextValue["remove"]>(
    async (productId) => {
      if (userId) {
        setLines(await api<CartLine[]>(`/api/cart/${productId}`, { method: "DELETE" }));
        return;
      }
      const updated = readLocal().filter((l) => l.productId !== productId);
      writeLocal(updated);
      setLines(updated);
    },
    [userId],
  );

  const value = useMemo<CartContextValue>(
    () => ({
      lines,
      count: lines.reduce((sum, l) => sum + l.quantity, 0),
      subtotal: lines.reduce((sum, l) => sum + l.price * l.quantity, 0),
      ready,
      isAuthenticated,
      add,
      setQuantity,
      remove,
      reload,
    }),
    [lines, ready, isAuthenticated, add, setQuantity, remove, reload],
  );

  return <CartContext value={value}>{children}</CartContext>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used within a CartProvider");
  return context;
}

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Product } from "./products";

export type CartItem = { product: Product; qty: number };

type CartCtx = {
  items: CartItem[];
  add: (p: Product) => void;
  remove: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const Ctx = createContext<CartCtx | null>(null);
const KEY = "patinhas-cart-v1";

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem(KEY) : null;
      if (raw) setItems(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") localStorage.setItem(KEY, JSON.stringify(items));
  }, [items]);

  const add = (p: Product) =>
    setItems((cur) => {
      const ex = cur.find((i) => i.product.id === p.id);
      if (ex) return cur.map((i) => (i.product.id === p.id ? { ...i, qty: i.qty + 1 } : i));
      return [...cur, { product: p, qty: 1 }];
    });
  const remove = (id: string) => setItems((cur) => cur.filter((i) => i.product.id !== id));
  const setQty = (id: string, qty: number) =>
    setItems((cur) => (qty <= 0 ? cur.filter((i) => i.product.id !== id) : cur.map((i) => (i.product.id === id ? { ...i, qty } : i))));
  const clear = () => setItems([]);

  const count = items.reduce((a, i) => a + i.qty, 0);
  const subtotal = items.reduce((a, i) => a + i.qty * i.product.price, 0);

  return <Ctx.Provider value={{ items, add, remove, setQty, clear, count, subtotal }}>{children}</Ctx.Provider>;
}

export function useCart() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useCart must be inside CartProvider");
  return c;
}

export const formatBRL = (n: number) =>
  n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

// Transient checkout state stored in sessionStorage across the multi-step flow.
export type PaymentMethod = "pix" | "boleto" | "credito" | "debito";

export type CheckoutShipping = {
  cep: string;
  uf: string;
  city: string;
  shipping: number;
};

export type CardData = {
  number: string; // last 4 only
  holder: string;
  installments?: number;
};

export type PaymentDetails =
  | { method: "pix"; pixCode: string }
  | { method: "boleto"; boletoCode: string; dueDate: string }
  | { method: "credito"; card: CardData }
  | { method: "debito"; card: CardData };

export type CheckoutState = {
  shipping: CheckoutShipping | null;
  payment: PaymentMethod;
  paymentDetails?: PaymentDetails;
};

const KEY = "patinhas-checkout-v1";

export function loadCheckout(): CheckoutState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as CheckoutState) : null;
  } catch {
    return null;
  }
}

export function saveCheckout(state: CheckoutState) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(state));
}

export function clearCheckout() {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}

export function genPixCode(amount: number): string {
  // Simulated PIX "copia e cola" payload
  const rand = Math.random().toString(36).slice(2, 10).toUpperCase();
  const value = amount.toFixed(2);
  return `00020126360014BR.GOV.BCB.PIX0114PATINHAS${rand}5204000053039865406${value}5802BR5916PATINHAS FELIZES6009SAO PAULO62100506${rand}6304ABCD`;
}

export function genBoletoCode(): { code: string; dueDate: string } {
  const blocks = [
    Math.floor(10000 + Math.random() * 89999).toString(),
    Math.floor(10000 + Math.random() * 89999).toString(),
    Math.floor(10000 + Math.random() * 89999).toString(),
    Math.floor(10000 + Math.random() * 89999).toString(),
    Math.floor(100000000000 + Math.random() * 899999999999).toString(),
  ];
  const code = `${blocks[0]}.${blocks[1]} ${blocks[2]}.${blocks[3]} ${blocks[4].slice(0, 5)}.${blocks[4].slice(5)} ${Math.floor(1 + Math.random() * 8)} ${Date.now()}`;
  const due = new Date();
  due.setDate(due.getDate() + 3);
  return { code, dueDate: due.toISOString().slice(0, 10) };
}

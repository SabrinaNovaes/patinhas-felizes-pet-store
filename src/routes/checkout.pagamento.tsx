import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { QrCode, FileText, CreditCard, Banknote, Copy, Check, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SiteNav } from "@/components/site-nav";
import { useCart, formatBRL } from "@/lib/cart-context";
import {
  loadCheckout, saveCheckout, genPixCode, genBoletoCode,
  type PaymentMethod, type PaymentDetails,
} from "@/lib/checkout-state";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout/pagamento")({
  head: () => ({
    meta: [
      { title: "Pagamento — Patinhas Felizes" },
      { name: "description", content: "Escolha a forma de pagamento e confirme." },
    ],
  }),
  component: PaymentPage,
});

const cardSchema = z.object({
  number: z.string().trim().regex(/^\d{13,19}$/, "Número de cartão inválido"),
  holder: z.string().trim().min(3, "Nome do titular").max(60),
  expiry: z.string().trim().regex(/^\d{2}\/\d{2}$/, "Validade MM/AA"),
  cvv: z.string().trim().regex(/^\d{3,4}$/, "CVV inválido"),
});

function PaymentPage() {
  const navigate = useNavigate();
  const { subtotal } = useCart();
  const [payment, setPayment] = useState<PaymentMethod>("pix");
  const [shippingValue, setShippingValue] = useState(0);
  const [pixCode, setPixCode] = useState("");
  const [boleto, setBoleto] = useState<{ code: string; dueDate: string } | null>(null);
  const [installments, setInstallments] = useState(1);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const st = loadCheckout();
    if (!st || !st.shipping) {
      toast.error("Calcule o frete no carrinho primeiro");
      navigate({ to: "/carrinho" });
      return;
    }
    setPayment(st.payment);
    setShippingValue(st.shipping.shipping);
  }, [navigate]);

  const total = subtotal + shippingValue;

  // Regenerate code when needed
  useEffect(() => {
    if (payment === "pix" && !pixCode) setPixCode(genPixCode(total));
    if (payment === "boleto" && !boleto) setBoleto(genBoletoCode());
  }, [payment, total, pixCode, boleto]);

  const handlePaymentChange = (v: string) => {
    const p = v as PaymentMethod;
    setPayment(p);
    if (p === "pix") setPixCode(genPixCode(total));
    if (p === "boleto") setBoleto(genBoletoCode());
  };

  const copyToClipboard = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    toast.success("Copiado!");
    setTimeout(() => setCopied(false), 1500);
  };

  const confirm = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const st = loadCheckout();
    if (!st) return navigate({ to: "/carrinho" });

    let details: PaymentDetails;
    if (payment === "pix") {
      details = { method: "pix", pixCode: pixCode || genPixCode(total) };
    } else if (payment === "boleto") {
      const b = boleto ?? genBoletoCode();
      details = { method: "boleto", boletoCode: b.code, dueDate: b.dueDate };
    } else {
      const fd = new FormData(e.currentTarget);
      const parsed = cardSchema.safeParse(Object.fromEntries(fd.entries()));
      if (!parsed.success) return toast.error(parsed.error.issues[0].message);
      const last4 = parsed.data.number.slice(-4);
      details = {
        method: payment,
        card: {
          number: `•••• •••• •••• ${last4}`,
          holder: parsed.data.holder,
          installments: payment === "credito" ? installments : undefined,
        },
      };
    }

    saveCheckout({ ...st, payment, paymentDetails: details });
    navigate({ to: "/checkout/endereco" });
  };

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/carrinho" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao carrinho
        </Link>
        <h1 className="mb-2 font-display text-4xl font-semibold">Pagamento</h1>
        <p className="mb-8 text-muted-foreground">Etapa 1 de 2 — confirme a forma de pagamento.</p>

        <form onSubmit={confirm} className="space-y-6">
          <Card className="p-6">
            <h2 className="font-display text-lg font-semibold">Forma de pagamento</h2>
            <RadioGroup value={payment} onValueChange={handlePaymentChange} className="mt-4 grid gap-2 sm:grid-cols-2">
              {[
                { v: "pix", label: "Pix", icon: QrCode },
                { v: "boleto", label: "Boleto", icon: FileText },
                { v: "credito", label: "Crédito", icon: CreditCard },
                { v: "debito", label: "Débito", icon: Banknote },
              ].map((o) => (
                <Label
                  key={o.v}
                  htmlFor={`pm-${o.v}`}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${payment === o.v ? "border-primary bg-secondary/40" : "border-border"}`}
                >
                  <RadioGroupItem value={o.v} id={`pm-${o.v}`} />
                  <o.icon className="h-5 w-5 text-primary" />
                  <span className="text-sm font-medium">{o.label}</span>
                </Label>
              ))}
            </RadioGroup>
          </Card>

          {/* PIX */}
          {payment === "pix" && (
            <Card className="p-6">
              <h3 className="font-display font-semibold">Pague com Pix</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Escaneie o QR code ou copie o código abaixo no seu app bancário.
              </p>
              <div className="mt-4 flex flex-col items-center gap-4 sm:flex-row">
                <div className="flex h-44 w-44 items-center justify-center rounded-lg border bg-white p-3">
                  <img
                    alt="QR Code Pix"
                    width={160}
                    height={160}
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(pixCode)}`}
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <Label>Código Pix copia e cola</Label>
                  <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs break-all">
                    {pixCode}
                  </div>
                  <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(pixCode)}>
                    {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                    Copiar código
                  </Button>
                  <p className="text-xs text-muted-foreground">Valor: <span className="font-semibold text-foreground">{formatBRL(total)}</span></p>
                </div>
              </div>
            </Card>
          )}

          {/* Boleto */}
          {payment === "boleto" && boleto && (
            <Card className="p-6">
              <h3 className="font-display font-semibold">Boleto bancário</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Vencimento em <span className="font-medium text-foreground">{new Date(boleto.dueDate).toLocaleDateString("pt-BR")}</span>. Após o pagamento, a compensação pode levar até 2 dias úteis.
              </p>
              <div className="mt-4 space-y-2">
                <Label>Linha digitável</Label>
                <div className="rounded-lg border bg-muted/30 p-3 font-mono text-xs break-all">{boleto.code}</div>
                <Button type="button" variant="outline" size="sm" onClick={() => copyToClipboard(boleto.code)}>
                  {copied ? <Check className="mr-1 h-4 w-4" /> : <Copy className="mr-1 h-4 w-4" />}
                  Copiar linha
                </Button>
                <p className="text-xs text-muted-foreground">Valor: <span className="font-semibold text-foreground">{formatBRL(total)}</span></p>
              </div>
            </Card>
          )}

          {/* Card */}
          {(payment === "credito" || payment === "debito") && (
            <Card className="space-y-4 p-6">
              <h3 className="font-display font-semibold">Dados do cartão</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="number">Número do cartão</Label>
                  <Input id="number" name="number" placeholder="0000 0000 0000 0000" inputMode="numeric" required maxLength={19} />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label htmlFor="holder">Nome do titular</Label>
                  <Input id="holder" name="holder" placeholder="Como impresso no cartão" required maxLength={60} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="expiry">Validade</Label>
                  <Input id="expiry" name="expiry" placeholder="MM/AA" required maxLength={5} />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="cvv">CVV</Label>
                  <Input id="cvv" name="cvv" placeholder="000" inputMode="numeric" required maxLength={4} />
                </div>
                {payment === "credito" && (
                  <div className="space-y-1 sm:col-span-2">
                    <Label htmlFor="installments">Parcelas</Label>
                    <select
                      id="installments"
                      value={installments}
                      onChange={(e) => setInstallments(Number(e.target.value))}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    >
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>
                          {n}x de {formatBRL(total / n)} sem juros
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </Card>
          )}

          <Card className="p-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Total a pagar</span>
              <span className="font-display text-2xl font-semibold text-primary">{formatBRL(total)}</span>
            </div>
            <Button type="submit" size="lg" className="mt-4 w-full">
              Confirmar pagamento e ir para endereço
            </Button>
          </Card>
        </form>
      </section>
    </div>
  );
}

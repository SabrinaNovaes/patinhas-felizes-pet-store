import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import {
  Minus, Plus, Trash2, ShoppingBag, Truck, QrCode, FileText, CreditCard, Banknote, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SiteNav } from "@/components/site-nav";
import { useCart, formatBRL } from "@/lib/cart-context";
import { calcShipping, fetchCep } from "@/lib/shipping";
import { saveCheckout, type PaymentMethod } from "@/lib/checkout-state";
import { toast } from "sonner";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Patinhas Felizes" },
      { name: "description", content: "Revise seus produtos, calcule o frete e finalize a compra." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();
  const navigate = useNavigate();

  const [cep, setCep] = useState("");
  const [uf, setUf] = useState<string | null>(null);
  const [city, setCity] = useState<string | null>(null);
  const [loadingCep, setLoadingCep] = useState(false);
  const [payment, setPayment] = useState<PaymentMethod>("pix");

  const shipping = uf ? calcShipping(uf, subtotal) : 0;
  const total = subtotal + shipping;

  const handleCep = async () => {
    if (cep.replace(/\D/g, "").length !== 8) return toast.error("Informe um CEP válido");
    setLoadingCep(true);
    const data = await fetchCep(cep);
    setLoadingCep(false);
    if (!data) return toast.error("CEP não encontrado");
    setUf((data.uf ?? "").toUpperCase());
    setCity(data.localidade ?? null);
    toast.success("Frete calculado!");
  };

  const goToPayment = () => {
    if (items.length === 0) return toast.error("Carrinho vazio");
    if (!uf || !city) return toast.error("Calcule o frete antes de continuar");
    saveCheckout({
      shipping: { cep, uf, city, shipping },
      payment,
    });
    navigate({ to: "/checkout/pagamento" });
  };

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <ShoppingBag className="mx-auto h-20 w-20 text-muted-foreground" />
          <h1 className="mt-6 font-display text-3xl font-semibold">Seu carrinho está vazio</h1>
          <p className="mt-3 text-muted-foreground">Explore nossa loja e encontre tudo para o seu pet.</p>
          <Link to="/produtos"><Button className="mt-8">Ver produtos</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="mb-8 font-display text-4xl font-semibold">Seu carrinho</h1>
        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            {/* Items */}
            <div className="space-y-4">
              {items.map(({ product, qty }) => (
                <Card key={product.id} className="flex gap-4 p-4">
                  <img src={product.image} alt={product.name} width={120} height={120} loading="lazy" className="h-28 w-28 rounded-lg object-cover" />
                  <div className="flex flex-1 flex-col">
                    <div className="flex justify-between gap-3">
                      <div>
                        <Badge variant="secondary" className="mb-1 rounded-full text-[10px]">{product.category}</Badge>
                        <h3 className="font-display font-semibold leading-tight">{product.name}</h3>
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => remove(product.id)} aria-label="Remover">
                        <Trash2 className="h-4 w-4 text-muted-foreground" />
                      </Button>
                    </div>
                    <div className="mt-auto flex items-center justify-between">
                      <div className="flex items-center gap-2 rounded-full border border-border p-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setQty(product.id, qty - 1)}>
                          <Minus className="h-3 w-3" />
                        </Button>
                        <span className="min-w-6 text-center text-sm font-medium">{qty}</span>
                        <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full" onClick={() => setQty(product.id, qty + 1)}>
                          <Plus className="h-3 w-3" />
                        </Button>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">{formatBRL(product.price)} cada</div>
                        <div className="font-display text-lg font-semibold text-primary">{formatBRL(product.price * qty)}</div>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </div>


          {/* Summary */}
          <Card className="h-fit space-y-6 p-6">
            <div>
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Truck className="h-5 w-5 text-primary" /> Calcular frete
              </h2>
              <div className="mt-3 flex items-end gap-2">
                <div className="flex-1 space-y-1">
                  <Label htmlFor="cep">CEP</Label>
                  <Input
                    id="cep"
                    value={cep}
                    onChange={(e) => setCep(e.target.value)}
                    placeholder="00000-000"
                    maxLength={9}
                  />
                </div>
                <Button type="button" onClick={handleCep} disabled={loadingCep}>
                  {loadingCep ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular"}
                </Button>
              </div>
              {uf && city && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Entrega para <span className="font-medium text-foreground">{city}/{uf}</span>
                </p>
              )}
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold">Forma de pagamento</h2>
              <RadioGroup value={payment} onValueChange={(v) => setPayment(v as PaymentMethod)} className="mt-3 space-y-2">
                {[
                  { v: "pix", label: "Pix", icon: QrCode, desc: "Aprovação imediata" },
                  { v: "boleto", label: "Boleto", icon: FileText, desc: "Vence em 3 dias úteis" },
                  { v: "credito", label: "Cartão de Crédito", icon: CreditCard, desc: "Em até 6x sem juros" },
                  { v: "debito", label: "Cartão de Débito", icon: Banknote, desc: "À vista no débito" },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`p-${o.v}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-2.5 transition-colors ${payment === o.v ? "border-primary bg-secondary/40" : "border-border"}`}
                  >
                    <RadioGroupItem value={o.v} id={`p-${o.v}`} />
                    <o.icon className="h-4 w-4 text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{o.label}</div>
                      <div className="text-[11px] text-muted-foreground">{o.desc}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </div>

            <div>
              <h2 className="font-display text-lg font-semibold">Resumo</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBRL(subtotal)}</span></div>
                <div className="flex justify-between">
                  <span className="flex items-center gap-1 text-muted-foreground"><Truck className="h-3.5 w-3.5" />Frete</span>
                  <span>
                    {uf
                      ? shipping === 0
                        ? <span className="font-medium text-primary">Grátis</span>
                        : formatBRL(shipping)
                      : "Informe o CEP"}
                  </span>
                </div>
                {subtotal < 299 && (
                  <p className="text-xs text-muted-foreground">Frete grátis acima de {formatBRL(299)}</p>
                )}
                <div className="my-3 border-t border-border" />
                <div className="flex justify-between text-base">
                  <span className="font-semibold">Total</span>
                  <span className="font-display text-2xl font-semibold text-primary">{formatBRL(total)}</span>
                </div>
              </div>

              <Button className="mt-5 w-full" size="lg" onClick={goToPayment} disabled={!uf}>
                Finalizar compra
              </Button>

              <Link to="/produtos">
                <Button variant="outline" className="mt-2 w-full">Continuar comprando</Button>
              </Link>
            </div>
          </Card>
        </div>
      </section>
    </div>
  );
}

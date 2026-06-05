import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Minus, Plus, Trash2, ShoppingBag, Truck, CreditCard, QrCode, FileText, Banknote, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SiteNav } from "@/components/site-nav";
import { useCart, formatBRL } from "@/lib/cart-context";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Patinhas Felizes" },
      { name: "description", content: "Revise seus produtos, calcule o frete e finalize o pedido." },
    ],
  }),
  component: CartPage,
});

type CepData = { logradouro: string; bairro: string; localidade: string; uf: string };

const SHIPPING_BY_REGION: Record<string, number> = {
  SP: 18.9, RJ: 22.5, MG: 22.5, ES: 24.9,
  PR: 26.9, SC: 28.9, RS: 32.9,
  BA: 36.9, PE: 39.9, CE: 39.9, RN: 42.9, PB: 42.9, AL: 42.9, SE: 42.9, MA: 44.9, PI: 44.9,
  GO: 32.9, DF: 32.9, MT: 38.9, MS: 36.9,
  AM: 54.9, PA: 49.9, RO: 52.9, AC: 56.9, RR: 58.9, AP: 56.9, TO: 44.9,
};

function calcShipping(uf: string, subtotal: number): number {
  if (subtotal >= 299) return 0;
  return SHIPPING_BY_REGION[uf] ?? 39.9;
}

function CartPage() {
  const { items, setQty, remove, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [cep, setCep] = useState("");
  const [cepLoading, setCepLoading] = useState(false);
  const [cepData, setCepData] = useState<CepData | null>(null);
  const [payment, setPayment] = useState<"pix" | "boleto" | "credito" | "debito">("pix");
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  const shipping = cepData ? calcShipping(cepData.uf, subtotal) : 0;
  const total = subtotal + shipping;

  const handleCep = async () => {
    const clean = cep.replace(/\D/g, "");
    if (clean.length !== 8) {
      toast.error("CEP deve ter 8 dígitos");
      return;
    }
    setCepLoading(true);
    try {
      const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
      const data = await res.json();
      if (data.erro) {
        toast.error("CEP não encontrado");
        setCepData(null);
        return;
      }
      setCepData(data);
      toast.success(`Frete calculado para ${data.localidade}/${data.uf}`);
    } catch {
      toast.error("Erro ao buscar CEP");
    } finally {
      setCepLoading(false);
    }
  };

  const handleCheckout = () => {
    if (!authed) {
      toast.error("Faça login para finalizar o pedido");
      navigate({ to: "/auth" });
      return;
    }
    if (!cepData) {
      toast.error("Calcule o frete antes de continuar");
      return;
    }
    setSuccess(true);
    clear();
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <CheckCircle2 className="mx-auto h-20 w-20 text-primary" />
          <h1 className="mt-6 font-display text-4xl font-semibold">Pedido confirmado!</h1>
          <p className="mt-4 text-muted-foreground">
            Recebemos seu pedido e em breve você receberá um e-mail com os detalhes. Obrigado por confiar na Patinhas Felizes 🐾
          </p>
          <Link to="/produtos"><Button className="mt-8">Continuar comprando</Button></Link>
        </div>
      </div>
    );
  }

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

          {/* Summary */}
          <div className="space-y-4">
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Calcular frete</h2>
              <div className="mt-3 flex gap-2">
                <Input
                  placeholder="00000-000"
                  value={cep}
                  onChange={(e) => setCep(e.target.value)}
                  maxLength={9}
                />
                <Button onClick={handleCep} disabled={cepLoading} variant="outline">
                  <Truck className="mr-1.5 h-4 w-4" />
                  {cepLoading ? "..." : "OK"}
                </Button>
              </div>
              {cepData && (
                <p className="mt-3 text-sm text-muted-foreground">
                  {cepData.logradouro && `${cepData.logradouro}, `}{cepData.bairro && `${cepData.bairro} — `}
                  {cepData.localidade}/{cepData.uf}
                </p>
              )}
              <a
                href="https://buscacepinter.correios.com.br/app/endereco/index.php"
                target="_blank"
                rel="noreferrer"
                className="mt-2 inline-block text-xs text-primary underline"
              >
                Não sei meu CEP
              </a>
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Forma de pagamento</h2>
              <RadioGroup value={payment} onValueChange={(v) => setPayment(v as typeof payment)} className="mt-4 space-y-2">
                {[
                  { v: "pix", label: "Pix", icon: QrCode, desc: "Aprovação imediata" },
                  { v: "boleto", label: "Boleto", icon: FileText, desc: "Vence em 3 dias úteis" },
                  { v: "credito", label: "Cartão de Crédito", icon: CreditCard, desc: "Em até 6x sem juros" },
                  { v: "debito", label: "Cartão de Débito", icon: Banknote, desc: "À vista no débito" },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={o.v}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${payment === o.v ? "border-primary bg-secondary/40" : "border-border"}`}
                  >
                    <RadioGroupItem value={o.v} id={o.v} />
                    <o.icon className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{o.label}</div>
                      <div className="text-xs text-muted-foreground">{o.desc}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </Card>

            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Resumo</h2>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBRL(subtotal)}</span></div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Frete</span>
                  <span>{cepData ? (shipping === 0 ? <span className="text-primary font-medium">Grátis</span> : formatBRL(shipping)) : "—"}</span>
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
              <Button className="mt-5 w-full" size="lg" onClick={handleCheckout}>
                Finalizar pedido
              </Button>
              {authed === false && (
                <p className="mt-3 text-center text-xs text-muted-foreground">
                  É preciso <Link to="/auth" className="text-primary underline">entrar</Link> para finalizar.
                </p>
              )}
            </Card>
          </div>
        </div>
      </section>
    </div>
  );
}

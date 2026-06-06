import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Truck, CreditCard, QrCode, FileText, Banknote, CheckCircle2, MapPin, ShoppingBag, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SiteNav } from "@/components/site-nav";
import { useCart, formatBRL } from "@/lib/cart-context";
import { supabase } from "@/integrations/supabase/client";
import { calcShipping, fetchCep } from "@/lib/shipping";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout — Patinhas Felizes" },
      { name: "description", content: "Finalize sua compra: endereço, frete e pagamento." },
    ],
  }),
  component: CheckoutPage,
});

type Address = {
  id: string;
  label: string;
  recipient: string;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  neighborhood: string;
  city: string;
  uf: string;
  is_default: boolean;
};

type Payment = "pix" | "boleto" | "credito" | "debito";

const addressSchema = z.object({
  label: z.string().trim().min(1, "Informe um rótulo").max(40),
  recipient: z.string().trim().min(2, "Nome do destinatário").max(100),
  cep: z.string().trim().min(8, "CEP inválido").max(9),
  street: z.string().trim().min(2).max(120),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(60).optional().or(z.literal("")),
  neighborhood: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  uf: z.string().trim().length(2),
});

function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [payment, setPayment] = useState<Payment>("pix");
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState<{ id: string } | null>(null);
  const [cepLookup, setCepLookup] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setAuthed(!!data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => setAuthed(!!s));
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      const { data, error } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      if (error) return;
      const list = (data ?? []) as Address[];
      setAddresses(list);
      if (list.length > 0) setSelectedId((cur) => cur ?? list[0].id);
      else setShowForm(true);
    })();
  }, [authed]);

  const selected = addresses.find((a) => a.id === selectedId) ?? null;
  const shipping = selected ? calcShipping(selected.uf, subtotal) : 0;
  const total = subtotal + shipping;

  const handleCepLookup = async (cep: string, form: HTMLFormElement) => {
    setCepLookup(true);
    const data = await fetchCep(cep);
    setCepLookup(false);
    if (!data) {
      toast.error("CEP não encontrado");
      return;
    }
    (form.elements.namedItem("street") as HTMLInputElement).value = data.logradouro ?? "";
    (form.elements.namedItem("neighborhood") as HTMLInputElement).value = data.bairro ?? "";
    (form.elements.namedItem("city") as HTMLInputElement).value = data.localidade ?? "";
    (form.elements.namedItem("uf") as HTMLInputElement).value = (data.uf ?? "").toUpperCase();
  };

  const handleAddressSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = addressSchema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSavingAddr(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSavingAddr(false);
      toast.error("Faça login");
      return navigate({ to: "/auth" });
    }
    const payload = {
      ...parsed.data,
      complement: parsed.data.complement || null,
      uf: parsed.data.uf.toUpperCase(),
      user_id: user.id,
      is_default: addresses.length === 0,
    };
    const { data, error } = await supabase.from("addresses").insert(payload).select().single();
    setSavingAddr(false);
    if (error) return toast.error(error.message);
    setAddresses((cur) => [data as Address, ...cur]);
    setSelectedId((data as Address).id);
    setShowForm(false);
    toast.success("Endereço cadastrado!");
  };

  const placeOrder = async () => {
    if (!authed) {
      toast.error("Faça login para finalizar");
      return navigate({ to: "/auth" });
    }
    if (!selected) return toast.error("Selecione um endereço");
    if (items.length === 0) return toast.error("Carrinho vazio");
    setPlacing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPlacing(false); return navigate({ to: "/auth" }); }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        subtotal,
        shipping,
        total,
        payment_method: payment,
        address: selected,
        status: "confirmado",
      })
      .select()
      .single();
    if (error || !order) {
      setPlacing(false);
      return toast.error(error?.message ?? "Erro ao criar pedido");
    }
    const itemsRows = items.map((i) => ({
      order_id: order.id,
      user_id: user.id,
      product_id: i.product.id,
      product_name: i.product.name,
      product_image: i.product.image,
      category: i.product.category,
      unit_price: i.product.price,
      qty: i.qty,
    }));
    const { error: itemsErr } = await supabase.from("order_items").insert(itemsRows);
    setPlacing(false);
    if (itemsErr) return toast.error(itemsErr.message);
    clear();
    setSuccess({ id: order.id });
  };

  if (success) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <CheckCircle2 className="mx-auto h-20 w-20 text-primary" />
          <h1 className="mt-6 font-display text-4xl font-semibold">Pedido confirmado!</h1>
          <p className="mt-4 text-muted-foreground">
            Recebemos seu pedido <span className="font-mono text-foreground">#{success.id.slice(0, 8)}</span>. Acompanhe os detalhes no seu perfil. Obrigado por confiar na Patinhas Felizes 🐾
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link to="/perfil"><Button>Ver meus pedidos</Button></Link>
            <Link to="/produtos"><Button variant="outline">Continuar comprando</Button></Link>
          </div>
        </div>
      </div>
    );
  }

  if (authed === false) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="mx-auto max-w-2xl px-6 py-24 text-center">
          <h1 className="font-display text-3xl font-semibold">Entre para finalizar</h1>
          <p className="mt-3 text-muted-foreground">Você precisa de uma conta para concluir o checkout.</p>
          <Link to="/auth"><Button className="mt-6">Entrar ou cadastrar</Button></Link>
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
          <h1 className="mt-6 font-display text-3xl font-semibold">Carrinho vazio</h1>
          <Link to="/produtos"><Button className="mt-8">Ver produtos</Button></Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="mx-auto max-w-7xl px-6 py-12">
        <h1 className="mb-8 font-display text-4xl font-semibold">Checkout</h1>

        <div className="grid gap-8 lg:grid-cols-[1fr_400px]">
          <div className="space-y-6">
            {/* Address */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <MapPin className="h-5 w-5 text-primary" /> Endereço de entrega
                </h2>
                {addresses.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowForm((s) => !s)}>
                    {showForm ? "Cancelar" : "Novo endereço"}
                  </Button>
                )}
              </div>

              {addresses.length > 0 && !showForm && (
                <RadioGroup value={selectedId ?? ""} onValueChange={setSelectedId} className="space-y-2">
                  {addresses.map((a) => (
                    <Label
                      key={a.id}
                      htmlFor={`a-${a.id}`}
                      className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${selectedId === a.id ? "border-primary bg-secondary/40" : "border-border"}`}
                    >
                      <RadioGroupItem value={a.id} id={`a-${a.id}`} className="mt-1" />
                      <div className="text-sm">
                        <div className="font-medium">
                          {a.label} {a.is_default && <Badge variant="secondary" className="ml-1 text-[10px]">Padrão</Badge>}
                        </div>
                        <div className="text-muted-foreground">
                          {a.recipient} — {a.street}, {a.number}
                          {a.complement ? `, ${a.complement}` : ""} — {a.neighborhood}, {a.city}/{a.uf} — CEP {a.cep}
                        </div>
                      </div>
                    </Label>
                  ))}
                </RadioGroup>
              )}

              {showForm && (
                <form onSubmit={handleAddressSubmit} className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Rótulo (ex: Casa, Trabalho)</Label>
                    <Input name="label" required maxLength={40} />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Destinatário</Label>
                    <Input name="recipient" required maxLength={100} />
                  </div>
                  <div className="space-y-1">
                    <Label>CEP</Label>
                    <div className="flex gap-2">
                      <Input
                        name="cep"
                        required
                        maxLength={9}
                        onBlur={(e) => {
                          if (e.target.value.replace(/\D/g, "").length === 8)
                            handleCepLookup(e.target.value, e.target.form!);
                        }}
                      />
                      {cepLookup && <Loader2 className="my-auto h-4 w-4 animate-spin text-muted-foreground" />}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label>UF</Label>
                    <Input name="uf" required maxLength={2} className="uppercase" />
                  </div>
                  <div className="space-y-1 sm:col-span-2">
                    <Label>Rua / Logradouro</Label>
                    <Input name="street" required maxLength={120} />
                  </div>
                  <div className="space-y-1">
                    <Label>Número</Label>
                    <Input name="number" required maxLength={20} />
                  </div>
                  <div className="space-y-1">
                    <Label>Complemento</Label>
                    <Input name="complement" maxLength={60} />
                  </div>
                  <div className="space-y-1">
                    <Label>Bairro</Label>
                    <Input name="neighborhood" required maxLength={80} />
                  </div>
                  <div className="space-y-1">
                    <Label>Cidade</Label>
                    <Input name="city" required maxLength={80} />
                  </div>
                  <div className="sm:col-span-2">
                    <Button type="submit" disabled={savingAddr}>
                      {savingAddr ? "Salvando..." : "Salvar endereço"}
                    </Button>
                  </div>
                </form>
              )}
            </Card>

            {/* Payment */}
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Forma de pagamento</h2>
              <RadioGroup value={payment} onValueChange={(v) => setPayment(v as Payment)} className="mt-4 space-y-2">
                {[
                  { v: "pix", label: "Pix", icon: QrCode, desc: "Aprovação imediata" },
                  { v: "boleto", label: "Boleto", icon: FileText, desc: "Vence em 3 dias úteis" },
                  { v: "credito", label: "Cartão de Crédito", icon: CreditCard, desc: "Em até 6x sem juros" },
                  { v: "debito", label: "Cartão de Débito", icon: Banknote, desc: "À vista no débito" },
                ].map((o) => (
                  <Label
                    key={o.v}
                    htmlFor={`p-${o.v}`}
                    className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${payment === o.v ? "border-primary bg-secondary/40" : "border-border"}`}
                  >
                    <RadioGroupItem value={o.v} id={`p-${o.v}`} />
                    <o.icon className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="text-sm font-medium">{o.label}</div>
                      <div className="text-xs text-muted-foreground">{o.desc}</div>
                    </div>
                  </Label>
                ))}
              </RadioGroup>
            </Card>

            {/* Items summary */}
            <Card className="p-6">
              <h2 className="font-display text-lg font-semibold">Itens do pedido</h2>
              <div className="mt-4 space-y-3">
                {items.map(({ product, qty }) => (
                  <div key={product.id} className="flex items-center gap-3">
                    <img src={product.image} alt={product.name} className="h-14 w-14 rounded-md object-cover" />
                    <div className="flex-1 text-sm">
                      <div className="font-medium">{product.name}</div>
                      <div className="text-xs text-muted-foreground">{qty}x {formatBRL(product.price)}</div>
                    </div>
                    <div className="text-sm font-semibold">{formatBRL(product.price * qty)}</div>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          {/* Summary */}
          <Card className="h-fit p-6">
            <h2 className="font-display text-lg font-semibold">Resumo</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBRL(subtotal)}</span></div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-muted-foreground"><Truck className="h-3.5 w-3.5" />Frete</span>
                <span>{selected ? (shipping === 0 ? <span className="font-medium text-primary">Grátis</span> : formatBRL(shipping)) : "—"}</span>
              </div>
              {selected && (
                <p className="text-xs text-muted-foreground">Entrega para {selected.city}/{selected.uf}</p>
              )}
              {subtotal < 299 && (
                <p className="text-xs text-muted-foreground">Frete grátis acima de {formatBRL(299)}</p>
              )}
              <div className="my-3 border-t border-border" />
              <div className="flex justify-between text-base">
                <span className="font-semibold">Total</span>
                <span className="font-display text-2xl font-semibold text-primary">{formatBRL(total)}</span>
              </div>
            </div>
            <Button className="mt-5 w-full" size="lg" onClick={placeOrder} disabled={placing || !selected}>
              {placing ? "Processando..." : "Confirmar pedido"}
            </Button>
            <Link to="/carrinho">
              <Button variant="outline" className="mt-2 w-full">Voltar ao carrinho</Button>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}

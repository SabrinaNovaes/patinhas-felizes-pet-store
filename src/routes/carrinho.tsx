import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import {
  Minus, Plus, Trash2, ShoppingBag, MapPin, Truck, QrCode, FileText, CreditCard,
  Banknote, CheckCircle2, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SiteNav } from "@/components/site-nav";
import { useCart, formatBRL } from "@/lib/cart-context";
import { supabase } from "@/integrations/supabase/client";
import { calcShipping, fetchCep } from "@/lib/shipping";
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

function CartPage() {
  const { items, setQty, remove, subtotal, clear } = useCart();
  const navigate = useNavigate();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [savingAddr, setSavingAddr] = useState(false);
  const [cepLookup, setCepLookup] = useState(false);

  // Guest CEP-only shipping estimate
  const [guestCep, setGuestCep] = useState("");
  const [guestUf, setGuestUf] = useState<string | null>(null);
  const [guestCity, setGuestCity] = useState<string | null>(null);
  const [guestLoading, setGuestLoading] = useState(false);

  const [payment, setPayment] = useState<Payment>("pix");
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState<{ id: string } | null>(null);

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
  const ufForShipping = selected?.uf ?? guestUf ?? null;
  const cityForShipping = selected?.city ?? guestCity ?? null;
  const shipping = ufForShipping ? calcShipping(ufForShipping, subtotal) : 0;
  const total = subtotal + shipping;

  const handleGuestCep = async () => {
    if (guestCep.replace(/\D/g, "").length !== 8) {
      toast.error("Informe um CEP válido");
      return;
    }
    setGuestLoading(true);
    const data = await fetchCep(guestCep);
    setGuestLoading(false);
    if (!data) return toast.error("CEP não encontrado");
    setGuestUf((data.uf ?? "").toUpperCase());
    setGuestCity(data.localidade ?? null);
    toast.success("Frete calculado!");
  };

  const handleCepLookup = async (cep: string, form: HTMLFormElement) => {
    setCepLookup(true);
    const data = await fetchCep(cep);
    setCepLookup(false);
    if (!data) return toast.error("CEP não encontrado");
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
      toast.error("Faça login para cadastrar o endereço");
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

  const finalize = async () => {
    if (items.length === 0) return toast.error("Carrinho vazio");
    if (!authed) {
      toast.message("Faça login para finalizar a compra");
      return navigate({ to: "/auth" });
    }
    if (!selected) {
      toast.error("Confirme ou cadastre um endereço de entrega");
      setShowForm(true);
      return;
    }
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

            {/* Address / CEP */}
            <Card className="p-6">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                  <MapPin className="h-5 w-5 text-primary" /> Endereço de entrega
                </h2>
                {authed && addresses.length > 0 && (
                  <Button variant="outline" size="sm" onClick={() => setShowForm((s) => !s)}>
                    {showForm ? "Cancelar" : "Novo endereço"}
                  </Button>
                )}
              </div>

              {!authed && (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Informe seu CEP para calcular o frete. Para finalizar a compra você precisa entrar na sua conta.
                  </p>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="space-y-1">
                      <Label>CEP</Label>
                      <Input
                        value={guestCep}
                        onChange={(e) => setGuestCep(e.target.value)}
                        placeholder="00000-000"
                        maxLength={9}
                        className="w-40"
                      />
                    </div>
                    <Button type="button" onClick={handleGuestCep} disabled={guestLoading}>
                      {guestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Calcular frete"}
                    </Button>
                    {guestUf && (
                      <p className="text-sm text-muted-foreground">
                        Entrega para <span className="font-medium text-foreground">{cityForShipping}/{guestUf}</span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {authed && addresses.length > 0 && !showForm && (
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

              {authed && showForm && (
                <>
                  {addresses.length === 0 && (
                    <p className="mb-3 text-sm text-muted-foreground">
                      Você ainda não tem endereços. Cadastre um para receber seu pedido.
                    </p>
                  )}
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
                </>
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
          </div>

          {/* Summary */}
          <Card className="h-fit p-6">
            <h2 className="font-display text-lg font-semibold">Resumo</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBRL(subtotal)}</span></div>
              <div className="flex justify-between">
                <span className="flex items-center gap-1 text-muted-foreground"><Truck className="h-3.5 w-3.5" />Frete</span>
                <span>
                  {ufForShipping
                    ? shipping === 0
                      ? <span className="font-medium text-primary">Grátis</span>
                      : formatBRL(shipping)
                    : "Informe o CEP"}
                </span>
              </div>
              {cityForShipping && ufForShipping && (
                <p className="text-xs text-muted-foreground">Entrega para {cityForShipping}/{ufForShipping}</p>
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

            <Button
              className="mt-5 w-full"
              size="lg"
              onClick={finalize}
              disabled={placing}
            >
              {placing ? "Processando..." : authed ? "Finalizar compra" : "Entrar para finalizar"}
            </Button>

            <Link to="/produtos">
              <Button variant="outline" className="mt-2 w-full">Continuar comprando</Button>
            </Link>

            {authed && !selected && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                Confirme ou cadastre um endereço de entrega para finalizar.
              </p>
            )}
          </Card>
        </div>
      </section>
    </div>
  );
}

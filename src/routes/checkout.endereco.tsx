import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { MapPin, ArrowLeft, CheckCircle2, Loader2, Plus, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { SiteNav } from "@/components/site-nav";
import { useCart, formatBRL } from "@/lib/cart-context";
import { supabase } from "@/integrations/supabase/client";
import { fetchCep } from "@/lib/shipping";
import { loadCheckout, clearCheckout } from "@/lib/checkout-state";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout/endereco")({
  head: () => ({
    meta: [
      { title: "Endereço — Patinhas Felizes" },
      { name: "description", content: "Confirme o endereço de entrega e finalize sua compra." },
    ],
  }),
  component: AddressStep,
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

function AddressStep() {
  const navigate = useNavigate();
  const { items, subtotal, clear } = useCart();

  const [authed, setAuthed] = useState<boolean | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cepLookup, setCepLookup] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [success, setSuccess] = useState<{ id: string } | null>(null);

  const checkout = typeof window !== "undefined" ? loadCheckout() : null;
  const shippingValue = checkout?.shipping?.shipping ?? 0;
  const total = subtotal + shippingValue;

  useEffect(() => {
    if (!checkout?.paymentDetails) {
      toast.error("Confirme o pagamento antes do endereço");
      navigate({ to: "/checkout/pagamento" });
    }
  }, [checkout, navigate]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setAuthed(!!data.session);
      setUserEmail(data.session?.user?.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setAuthed(!!s);
      setUserEmail(s?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!authed) return;
    (async () => {
      const { data } = await supabase
        .from("addresses")
        .select("*")
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });
      const list = (data ?? []) as Address[];
      setAddresses(list);
      if (list.length > 0) setSelectedId((cur) => cur ?? list[0].id);
    })();
  }, [authed]);

  const selected = addresses.find((a) => a.id === selectedId) ?? null;

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

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = addressSchema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setSaving(false);
      return navigate({ to: "/auth" });
    }
    const { data, error } = await supabase.from("addresses").insert({
      ...parsed.data,
      complement: parsed.data.complement || null,
      uf: parsed.data.uf.toUpperCase(),
      user_id: user.id,
      is_default: addresses.length === 0,
    }).select().single();
    setSaving(false);
    if (error) return toast.error(error.message);
    setAddresses((cur) => [data as Address, ...cur]);
    setSelectedId((data as Address).id);
    setShowForm(false);
    toast.success("Endereço cadastrado!");
  };

  const finalize = async () => {
    if (!authed) return navigate({ to: "/auth" });
    if (!selected) return toast.error("Selecione ou cadastre um endereço");
    if (!checkout?.paymentDetails) return navigate({ to: "/checkout/pagamento" });
    if (items.length === 0) return toast.error("Carrinho vazio");

    setPlacing(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setPlacing(false); return navigate({ to: "/auth" }); }

    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        user_id: user.id,
        subtotal,
        shipping: shippingValue,
        total,
        payment_method: checkout.payment,
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

    // Simulated email confirmation
    toast.success(`Confirmação enviada para ${userEmail ?? "seu e-mail"} ✉️`, { duration: 4000 });

    clear();
    clearCheckout();
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
            Pedido <span className="font-mono text-foreground">#{success.id.slice(0, 8)}</span> registrado com sucesso.
          </p>
          {userEmail && (
            <p className="mt-2 inline-flex items-center gap-2 text-sm text-muted-foreground">
              <Mail className="h-4 w-4" /> Um resumo foi enviado para <span className="font-medium text-foreground">{userEmail}</span>
            </p>
          )}
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

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="mx-auto max-w-3xl px-6 py-12">
        <Link to="/checkout/pagamento" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar ao pagamento
        </Link>
        <h1 className="mb-2 font-display text-4xl font-semibold">Endereço de entrega</h1>
        <p className="mb-8 text-muted-foreground">Etapa 2 de 2 — confirme onde devemos entregar.</p>

        <Card className="p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
              <MapPin className="h-5 w-5 text-primary" /> Seus endereços
            </h2>
            {addresses.length > 0 && !showForm && (
              <Button variant="outline" size="sm" onClick={() => setShowForm(true)}>
                <Plus className="mr-1 h-4 w-4" /> Novo endereço
              </Button>
            )}
          </div>

          {addresses.length === 0 && !showForm && (
            <div className="rounded-lg border border-dashed p-6 text-center">
              <p className="text-sm text-muted-foreground">Você ainda não tem nenhum endereço cadastrado.</p>
              <Button className="mt-4" onClick={() => setShowForm(true)}>
                <Plus className="mr-1 h-4 w-4" /> Cadastrar endereço
              </Button>
            </div>
          )}

          {addresses.length > 0 && !showForm && (
            <RadioGroup value={selectedId ?? ""} onValueChange={setSelectedId} className="space-y-2">
              {addresses.map((a) => (
                <Label
                  key={a.id}
                  htmlFor={`addr-${a.id}`}
                  className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${selectedId === a.id ? "border-primary bg-secondary/40" : "border-border"}`}
                >
                  <RadioGroupItem value={a.id} id={`addr-${a.id}`} className="mt-1" />
                  <div className="text-sm">
                    <div className="font-medium">
                      {a.label} {a.is_default && <Badge variant="secondary" className="ml-1 text-[10px]">Padrão</Badge>}
                    </div>
                    <div className="text-muted-foreground">
                      {a.recipient} — {a.street}, {a.number}{a.complement ? `, ${a.complement}` : ""} — {a.neighborhood}, {a.city}/{a.uf} — CEP {a.cep}
                    </div>
                  </div>
                </Label>
              ))}
            </RadioGroup>
          )}

          {showForm && (
            <form onSubmit={handleSave} className="grid gap-3 sm:grid-cols-2">
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
              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" disabled={saving}>
                  {saving ? "Salvando..." : "Salvar endereço"}
                </Button>
                {addresses.length > 0 && (
                  <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          )}
        </Card>

        <Card className="mt-6 p-6">
          <h2 className="font-display text-lg font-semibold">Resumo do pedido</h2>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBRL(subtotal)}</span></div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Frete</span>
              <span>{shippingValue === 0 ? <span className="font-medium text-primary">Grátis</span> : formatBRL(shippingValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Pagamento</span>
              <span className="font-medium capitalize">{checkout?.payment}</span>
            </div>
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
            disabled={placing || !selected}
          >
            {placing ? "Processando..." : "Finalizar compra"}
          </Button>
          {!selected && (
            <p className="mt-2 text-center text-xs text-muted-foreground">
              Selecione ou cadastre um endereço para finalizar.
            </p>
          )}
        </Card>
      </section>
    </div>
  );
}

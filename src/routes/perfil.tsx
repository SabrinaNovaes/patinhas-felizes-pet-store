import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { z } from "zod";
import {
  User as UserIcon, Package, Repeat, MapPin, Plus, Pencil, Trash2, Star, Loader2, ShoppingCart,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { SiteNav } from "@/components/site-nav";
import { supabase } from "@/integrations/supabase/client";
import { useCart, formatBRL } from "@/lib/cart-context";
import { fetchCep } from "@/lib/shipping";
import { toast } from "sonner";

export const Route = createFileRoute("/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil — Patinhas Felizes" },
      { name: "description", content: "Gerencie pedidos, produtos frequentes e endereços." },
    ],
  }),
  component: ProfilePage,
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

type OrderRow = {
  id: string;
  total: number;
  shipping: number;
  subtotal: number;
  status: string;
  payment_method: string;
  created_at: string;
  address: Address;
};

type OrderItem = {
  id: string;
  order_id: string;
  product_id: string;
  product_name: string;
  product_image: string;
  category: string;
  unit_price: number;
  qty: number;
};

const addressSchema = z.object({
  label: z.string().trim().min(1).max(40),
  recipient: z.string().trim().min(2).max(100),
  cep: z.string().trim().min(8).max(9),
  street: z.string().trim().min(2).max(120),
  number: z.string().trim().min(1).max(20),
  complement: z.string().trim().max(60).optional().or(z.literal("")),
  neighborhood: z.string().trim().min(2).max(80),
  city: z.string().trim().min(2).max(80),
  uf: z.string().trim().length(2),
});

function ProfilePage() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate({ to: "/auth" }); return; }
      setUserEmail(user.email ?? null);
      setUserName((user.user_metadata?.name as string) ?? user.email ?? "");

      const [{ data: o }, { data: it }, { data: ad }] = await Promise.all([
        supabase.from("orders").select("*").order("created_at", { ascending: false }),
        supabase.from("order_items").select("*").order("created_at", { ascending: false }),
        supabase.from("addresses").select("*").order("is_default", { ascending: false }).order("created_at", { ascending: false }),
      ]);
      setOrders((o ?? []) as unknown as OrderRow[]);
      setItems((it ?? []) as OrderItem[]);
      setAddresses((ad ?? []) as Address[]);
      setLoading(false);
    })();
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <SiteNav />
        <div className="grid place-items-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="mb-8 flex items-center gap-4">
          <span className="grid h-16 w-16 place-items-center rounded-full bg-primary/10 text-primary">
            <UserIcon className="h-7 w-7" />
          </span>
          <div>
            <h1 className="font-display text-3xl font-semibold">{userName || "Meu perfil"}</h1>
            <p className="text-sm text-muted-foreground">{userEmail}</p>
          </div>
        </div>

        <Tabs defaultValue="pedidos">
          <TabsList>
            <TabsTrigger value="pedidos"><Package className="mr-1.5 h-4 w-4" />Pedidos</TabsTrigger>
            <TabsTrigger value="frequentes"><Repeat className="mr-1.5 h-4 w-4" />Frequentes</TabsTrigger>
            <TabsTrigger value="enderecos"><MapPin className="mr-1.5 h-4 w-4" />Endereços</TabsTrigger>
          </TabsList>

          <TabsContent value="pedidos" className="mt-6">
            <OrdersTab orders={orders} items={items} />
          </TabsContent>
          <TabsContent value="frequentes" className="mt-6">
            <FrequentTab items={items} />
          </TabsContent>
          <TabsContent value="enderecos" className="mt-6">
            <AddressesTab addresses={addresses} setAddresses={setAddresses} />
          </TabsContent>
        </Tabs>
      </section>
    </div>
  );
}

function OrdersTab({ orders, items }: { orders: OrderRow[]; items: OrderItem[] }) {
  if (orders.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Package className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Você ainda não tem pedidos.</p>
        <Link to="/produtos"><Button className="mt-6">Ver produtos</Button></Link>
      </Card>
    );
  }
  return (
    <div className="space-y-4">
      {orders.map((o) => {
        const oi = items.filter((i) => i.order_id === o.id);
        return (
          <Card key={o.id} className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-xs text-muted-foreground">Pedido</div>
                <div className="font-mono text-sm font-semibold">#{o.id.slice(0, 8)}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Data</div>
                <div className="text-sm">{new Date(o.created_at).toLocaleDateString("pt-BR")}</div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground">Pagamento</div>
                <div className="text-sm capitalize">{o.payment_method}</div>
              </div>
              <div>
                <Badge className="capitalize">{o.status}</Badge>
              </div>
              <div className="text-right">
                <div className="text-xs text-muted-foreground">Total</div>
                <div className="font-display text-lg font-semibold text-primary">{formatBRL(Number(o.total))}</div>
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {oi.map((i) => (
                <div key={i.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                  <img src={i.product_image} alt={i.product_name} className="h-14 w-14 rounded-md object-cover" />
                  <div className="flex-1 text-sm">
                    <div className="font-medium leading-tight">{i.product_name}</div>
                    <div className="text-xs text-muted-foreground">{i.qty}x {formatBRL(Number(i.unit_price))}</div>
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">
              Entrega: {o.address.street}, {o.address.number} — {o.address.city}/{o.address.uf}
            </p>
          </Card>
        );
      })}
    </div>
  );
}

function FrequentTab({ items }: { items: OrderItem[] }) {
  const { add } = useCart();
  const aggregated = useMemo(() => {
    const map = new Map<string, { item: OrderItem; total: number; orders: Set<string> }>();
    for (const it of items) {
      const ex = map.get(it.product_id);
      if (ex) {
        ex.total += it.qty;
        ex.orders.add(it.order_id);
      } else {
        map.set(it.product_id, { item: it, total: it.qty, orders: new Set([it.order_id]) });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.orders.size - a.orders.size || b.total - a.total);
  }, [items]);

  if (aggregated.length === 0) {
    return (
      <Card className="p-10 text-center">
        <Repeat className="mx-auto h-12 w-12 text-muted-foreground" />
        <p className="mt-4 text-muted-foreground">Compre produtos para ver suas recompras favoritas aqui.</p>
      </Card>
    );
  }
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {aggregated.map(({ item, total, orders }, idx) => (
        <Card key={item.product_id} className="overflow-hidden p-0">
          <div className="relative">
            <img src={item.product_image} alt={item.product_name} className="h-40 w-full object-cover" />
            {idx === 0 && (
              <Badge className="absolute left-3 top-3 gap-1"><Star className="h-3 w-3 fill-current" />Favorito</Badge>
            )}
          </div>
          <div className="p-4">
            <Badge variant="secondary" className="rounded-full text-[10px]">{item.category}</Badge>
            <h3 className="mt-1 font-display font-semibold leading-tight">{item.product_name}</h3>
            <p className="mt-2 text-xs text-muted-foreground">
              Comprado em {orders.size} {orders.size === 1 ? "pedido" : "pedidos"} · {total} unid. no total
            </p>
            <div className="mt-3 flex items-center justify-between">
              <span className="font-display text-lg font-semibold text-primary">{formatBRL(Number(item.unit_price))}</span>
              <Button
                size="sm"
                onClick={() => {
                  add({
                    id: item.product_id,
                    name: item.product_name,
                    category: item.category as never,
                    price: Number(item.unit_price),
                    image: item.product_image,
                    description: "",
                  });
                  toast.success("Adicionado ao carrinho");
                }}
              >
                <ShoppingCart className="mr-1.5 h-3.5 w-3.5" />Comprar
              </Button>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function AddressesTab({
  addresses,
  setAddresses,
}: {
  addresses: Address[];
  setAddresses: React.Dispatch<React.SetStateAction<Address[]>>;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Address | null>(null);
  const [saving, setSaving] = useState(false);
  const [cepLookup, setCepLookup] = useState(false);

  const onLookup = async (cep: string, form: HTMLFormElement) => {
    setCepLookup(true);
    const data = await fetchCep(cep);
    setCepLookup(false);
    if (!data) return toast.error("CEP não encontrado");
    (form.elements.namedItem("street") as HTMLInputElement).value = data.logradouro ?? "";
    (form.elements.namedItem("neighborhood") as HTMLInputElement).value = data.bairro ?? "";
    (form.elements.namedItem("city") as HTMLInputElement).value = data.localidade ?? "";
    (form.elements.namedItem("uf") as HTMLInputElement).value = (data.uf ?? "").toUpperCase();
  };

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = addressSchema.safeParse(Object.fromEntries(fd.entries()));
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setSaving(true);
    const payload = {
      ...parsed.data,
      complement: parsed.data.complement || null,
      uf: parsed.data.uf.toUpperCase(),
    };
    if (editing) {
      const { data, error } = await supabase
        .from("addresses")
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq("id", editing.id)
        .select()
        .single();
      setSaving(false);
      if (error) return toast.error(error.message);
      setAddresses((cur) => cur.map((a) => (a.id === editing.id ? (data as Address) : a)));
      toast.success("Endereço atualizado");
    } else {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSaving(false); return; }
      const { data, error } = await supabase
        .from("addresses")
        .insert({ ...payload, user_id: user.id, is_default: addresses.length === 0 })
        .select()
        .single();
      setSaving(false);
      if (error) return toast.error(error.message);
      setAddresses((cur) => [data as Address, ...cur]);
      toast.success("Endereço cadastrado");
    }
    setOpen(false);
    setEditing(null);
  };

  const remove = async (id: string) => {
    if (!confirm("Remover este endereço?")) return;
    const { error } = await supabase.from("addresses").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setAddresses((cur) => cur.filter((a) => a.id !== id));
    toast.success("Endereço removido");
  };

  const setDefault = async (id: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from("addresses").update({ is_default: false }).eq("user_id", user.id);
    const { error } = await supabase.from("addresses").update({ is_default: true }).eq("id", id);
    if (error) return toast.error(error.message);
    setAddresses((cur) => cur.map((a) => ({ ...a, is_default: a.id === id })));
    toast.success("Endereço padrão atualizado");
  };

  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Button onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="mr-1.5 h-4 w-4" />Novo endereço
        </Button>
      </div>

      {addresses.length === 0 ? (
        <Card className="p-10 text-center">
          <MapPin className="mx-auto h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-muted-foreground">Nenhum endereço cadastrado.</p>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {addresses.map((a) => (
            <Card key={a.id} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-semibold">{a.label}</h3>
                    {a.is_default && <Badge variant="secondary" className="text-[10px]">Padrão</Badge>}
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{a.recipient}</p>
                </div>
                <div className="flex gap-1">
                  <Button size="icon" variant="ghost" onClick={() => { setEditing(a); setOpen(true); }} aria-label="Editar">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button size="icon" variant="ghost" onClick={() => remove(a.id)} aria-label="Remover">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <p className="mt-3 text-sm">
                {a.street}, {a.number}{a.complement ? `, ${a.complement}` : ""}<br />
                {a.neighborhood} — {a.city}/{a.uf}<br />
                CEP {a.cep}
              </p>
              {!a.is_default && (
                <Button variant="outline" size="sm" className="mt-4" onClick={() => setDefault(a.id)}>
                  Tornar padrão
                </Button>
              )}
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar endereço" : "Novo endereço"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={submit} className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <Label>Rótulo</Label>
              <Input name="label" defaultValue={editing?.label ?? ""} required maxLength={40} />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Destinatário</Label>
              <Input name="recipient" defaultValue={editing?.recipient ?? ""} required maxLength={100} />
            </div>
            <div className="space-y-1">
              <Label>CEP</Label>
              <div className="flex gap-2">
                <Input
                  name="cep"
                  defaultValue={editing?.cep ?? ""}
                  required
                  maxLength={9}
                  onBlur={(e) => {
                    if (e.target.value.replace(/\D/g, "").length === 8) onLookup(e.target.value, e.target.form!);
                  }}
                />
                {cepLookup && <Loader2 className="my-auto h-4 w-4 animate-spin text-muted-foreground" />}
              </div>
            </div>
            <div className="space-y-1">
              <Label>UF</Label>
              <Input name="uf" defaultValue={editing?.uf ?? ""} required maxLength={2} className="uppercase" />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label>Rua</Label>
              <Input name="street" defaultValue={editing?.street ?? ""} required maxLength={120} />
            </div>
            <div className="space-y-1">
              <Label>Número</Label>
              <Input name="number" defaultValue={editing?.number ?? ""} required maxLength={20} />
            </div>
            <div className="space-y-1">
              <Label>Complemento</Label>
              <Input name="complement" defaultValue={editing?.complement ?? ""} maxLength={60} />
            </div>
            <div className="space-y-1">
              <Label>Bairro</Label>
              <Input name="neighborhood" defaultValue={editing?.neighborhood ?? ""} required maxLength={80} />
            </div>
            <div className="space-y-1">
              <Label>Cidade</Label>
              <Input name="city" defaultValue={editing?.city ?? ""} required maxLength={80} />
            </div>
            <DialogFooter className="sm:col-span-2">
              <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditing(null); }}>
                Cancelar
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? "Salvando..." : "Salvar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

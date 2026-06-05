import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, ShoppingCart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { PRODUCTS, CATEGORIES, type Category } from "@/lib/products";
import { useCart, formatBRL } from "@/lib/cart-context";
import { toast } from "sonner";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — Patinhas Felizes Pet Shop" },
      { name: "description", content: "Rações, brinquedos, remédios, higiene e acessórios para cães e gatos com entrega para todo o Brasil." },
      { property: "og:title", content: "Loja Patinhas Felizes" },
      { property: "og:description", content: "Tudo para o seu pet com preços especiais." },
    ],
  }),
  component: ProductsPage,
});

function ProductsPage() {
  const { add } = useCart();
  const [filter, setFilter] = useState<Category | "Todos">("Todos");

  const list = filter === "Todos" ? PRODUCTS : PRODUCTS.filter((p) => p.category === filter);

  return (
    <div className="min-h-screen bg-background">
      <SiteNav />
      <section className="border-b border-border bg-secondary/30 py-12">
        <div className="mx-auto max-w-7xl px-6">
          <Badge variant="secondary" className="mb-3 rounded-full bg-background">Loja</Badge>
          <h1 className="font-display text-4xl font-semibold md:text-5xl">Produtos para o seu pet</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Rações, brinquedos, remédios e acessórios selecionados com carinho. Adicione ao carrinho e calcule o frete na hora.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-8 flex flex-wrap gap-2">
          {(["Todos", ...CATEGORIES] as const).map((c) => (
            <Button
              key={c}
              variant={filter === c ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(c)}
              className="rounded-full"
            >
              {c}
            </Button>
          ))}
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((p) => (
            <Card key={p.id} className="overflow-hidden border-0 p-0 transition-all hover:-translate-y-1" style={{ boxShadow: "var(--shadow-card)" }}>
              <div className="aspect-square overflow-hidden bg-secondary/40">
                <img src={p.image} alt={p.name} width={768} height={768} loading="lazy" className="h-full w-full object-cover" />
              </div>
              <div className="space-y-3 p-5">
                <Badge variant="secondary" className="rounded-full">{p.category}</Badge>
                <h3 className="font-display text-lg font-semibold leading-tight">{p.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>
                <div className="flex items-center justify-between pt-2">
                  <span className="font-display text-2xl font-semibold text-primary">{formatBRL(p.price)}</span>
                  <Button
                    size="sm"
                    onClick={() => {
                      add(p);
                      toast.success(`${p.name} adicionado!`, { icon: <ShoppingCart className="h-4 w-4" /> });
                    }}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Comprar
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}

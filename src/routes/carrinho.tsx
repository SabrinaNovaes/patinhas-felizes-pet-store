import { createFileRoute, Link } from "@tanstack/react-router";
import { Minus, Plus, Trash2, ShoppingBag, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { SiteNav } from "@/components/site-nav";
import { useCart, formatBRL } from "@/lib/cart-context";

export const Route = createFileRoute("/carrinho")({
  head: () => ({
    meta: [
      { title: "Carrinho — Patinhas Felizes" },
      { name: "description", content: "Revise seus produtos antes de finalizar a compra." },
    ],
  }),
  component: CartPage,
});

function CartPage() {
  const { items, setQty, remove, subtotal } = useCart();

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
        <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
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

          <Card className="h-fit p-6">
            <h2 className="font-display text-lg font-semibold">Resumo</h2>
            <div className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Subtotal</span><span>{formatBRL(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Frete</span><span>Calculado no checkout</span></div>
              {subtotal < 299 && (
                <p className="text-xs text-muted-foreground">Frete grátis acima de {formatBRL(299)}</p>
              )}
            </div>
            <Link to="/checkout">
              <Button className="mt-5 w-full" size="lg">
                Ir para o checkout <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/produtos">
              <Button variant="outline" className="mt-2 w-full">Continuar comprando</Button>
            </Link>
          </Card>
        </div>
      </section>
    </div>
  );
}

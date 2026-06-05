import { Link, useNavigate } from "@tanstack/react-router";
import { PawPrint, ShoppingCart, User, LogOut, Menu, X } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useCart } from "@/lib/cart-context";
import { toast } from "sonner";

const links = [
  { to: "/", label: "Início" },
  { to: "/produtos", label: "Produtos" },
  { to: "/#servicos", label: "Serviços" },
  { to: "/#planos", label: "Planos" },
  { to: "/#contato", label: "Contato" },
];

export function SiteNav() {
  const { count } = useCart();
  const navigate = useNavigate();
  const [email, setEmail] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setEmail(data.session?.user?.email ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      setEmail(session?.user?.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabase.auth.signOut();
    toast.success("Você saiu da conta");
    navigate({ to: "/" });
  };

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <PawPrint className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold">Patinhas Felizes</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) =>
            l.to.includes("#") ? (
              <a key={l.to} href={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {l.label}
              </a>
            ) : (
              <Link key={l.to} to={l.to} className="text-sm text-muted-foreground transition-colors hover:text-foreground [&.active]:text-foreground">
                {l.label}
              </Link>
            ),
          )}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Link to="/carrinho">
            <Button variant="ghost" size="icon" className="relative" aria-label="Carrinho">
              <ShoppingCart className="h-5 w-5" />
              {count > 0 && (
                <Badge className="absolute -right-1 -top-1 h-5 min-w-5 rounded-full px-1 text-[10px]">
                  {count}
                </Badge>
              )}
            </Button>
          </Link>
          {email ? (
            <>
              <span className="hidden max-w-[160px] truncate text-xs text-muted-foreground lg:inline">{email}</span>
              <Button variant="outline" size="sm" onClick={logout}>
                <LogOut className="mr-1.5 h-3.5 w-3.5" /> Sair
              </Button>
            </>
          ) : (
            <Link to="/auth">
              <Button size="sm"><User className="mr-1.5 h-3.5 w-3.5" /> Entrar</Button>
            </Link>
          )}
        </div>

        <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-background md:hidden">
          <div className="flex flex-col gap-3 px-6 py-4">
            {links.map((l) =>
              l.to.includes("#") ? (
                <a key={l.to} href={l.to} onClick={() => setOpen(false)} className="text-sm text-muted-foreground">
                  {l.label}
                </a>
              ) : (
                <Link key={l.to} to={l.to} onClick={() => setOpen(false)} className="text-sm text-muted-foreground">
                  {l.label}
                </Link>
              ),
            )}
            <Link to="/carrinho" onClick={() => setOpen(false)} className="text-sm text-muted-foreground">
              Carrinho ({count})
            </Link>
            {email ? (
              <Button variant="outline" size="sm" onClick={logout}>Sair</Button>
            ) : (
              <Link to="/auth" onClick={() => setOpen(false)}>
                <Button size="sm" className="w-full">Entrar / Cadastrar</Button>
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

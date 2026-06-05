import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { PawPrint, Scissors, Stethoscope, ShoppingBag, Heart, MapPin, Phone, Clock, Check, Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import hero from "@/assets/hero-petshop.jpg";
import grooming from "@/assets/grooming.jpg";
import vet from "@/assets/vet.jpg";
import store from "@/assets/store.jpg";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Patinhas Felizes — Pet Shop Moderno em sua cidade" },
      { name: "description", content: "Banho, tosa, veterinária e produtos premium. Planos mensais e anuais para o cuidado completo do seu pet." },
      { property: "og:title", content: "Patinhas Felizes — Pet Shop" },
      { property: "og:description", content: "Cuidado completo para o seu pet: banho, tosa, veterinária, produtos e planos." },
    ],
  }),
  component: Index,
});

const nav = [
  { href: "#inicio", label: "Início" },
  { href: "#espaco", label: "Nosso Espaço" },
  { href: "#servicos", label: "Serviços" },
  { href: "#produtos", label: "Produtos" },
  { href: "#planos", label: "Planos" },
  { href: "#contato", label: "Contato" },
];

function Index() {
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-background">
      {/* NAV */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-lg">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <a href="#inicio" className="flex items-center gap-2">
            <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
              <PawPrint className="h-5 w-5" />
            </span>
            <span className="font-display text-xl font-semibold">Patinhas Felizes</span>
          </a>
          <nav className="hidden items-center gap-8 md:flex">
            {nav.map((n) => (
              <a key={n.href} href={n.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                {n.label}
              </a>
            ))}
          </nav>
          <div className="hidden md:block">
            <Button asChild><a href="#contato">Agendar visita</a></Button>
          </div>
          <button className="md:hidden" onClick={() => setOpen(!open)} aria-label="Menu">
            {open ? <X /> : <Menu />}
          </button>
        </div>
        {open && (
          <div className="border-t border-border bg-background md:hidden">
            <div className="flex flex-col gap-3 px-6 py-4">
              {nav.map((n) => (
                <a key={n.href} href={n.href} onClick={() => setOpen(false)} className="text-sm text-muted-foreground">
                  {n.label}
                </a>
              ))}
              <Button asChild className="mt-2"><a href="#contato">Agendar visita</a></Button>
            </div>
          </div>
        )}
      </header>

      {/* HERO */}
      <section id="inicio" className="relative overflow-hidden" style={{ background: "var(--gradient-soft)" }}>
        <div className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2 lg:py-28">
          <div>
            <Badge variant="secondary" className="mb-6 rounded-full px-4 py-1.5">
              <Heart className="mr-1.5 h-3.5 w-3.5" /> Cuidado feito com amor
            </Badge>
            <h1 className="font-display text-5xl leading-[1.05] font-semibold tracking-tight text-foreground md:text-7xl">
              Um lar de carinho<br />para o seu <span style={{ background: "var(--gradient-warm)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>melhor amigo</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              Banho, tosa, veterinária e os melhores produtos em um espaço pensado para o bem-estar do seu pet. Venha nos conhecer e sentir a diferença.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button size="lg" asChild><a href="#contato">Visite a loja</a></Button>
              <Button size="lg" variant="outline" asChild><a href="#planos">Conheça os planos</a></Button>
            </div>
            <div className="mt-10 flex flex-wrap gap-8 text-sm">
              <div><div className="font-display text-2xl font-semibold">+8 anos</div><div className="text-muted-foreground">no mercado</div></div>
              <div><div className="font-display text-2xl font-semibold">12k+</div><div className="text-muted-foreground">pets felizes</div></div>
              <div><div className="font-display text-2xl font-semibold">4.9★</div><div className="text-muted-foreground">avaliação</div></div>
            </div>
          </div>
          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl" style={{ background: "var(--gradient-warm)", opacity: 0.15, filter: "blur(40px)" }} />
            <img src={hero} alt="Cachorro feliz no pet shop" width={1536} height={1024} className="relative rounded-3xl object-cover shadow-2xl" style={{ boxShadow: "var(--shadow-soft)" }} />
          </div>
        </div>
      </section>

      {/* ESPAÇO */}
      <section id="espaco" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 max-w-2xl">
          <Badge variant="secondary" className="mb-4 rounded-full">Nosso Espaço</Badge>
          <h2 className="font-display text-4xl font-semibold md:text-5xl">Um ambiente acolhedor, pensado pra eles</h2>
          <p className="mt-4 text-muted-foreground">Salas iluminadas, equipamentos modernos e profissionais apaixonados. Cada cantinho da Patinhas Felizes foi feito para o conforto do seu pet.</p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            { img: grooming, title: "Salão de Banho & Tosa", desc: "Espaço climatizado e produtos hipoalergênicos." },
            { img: vet, title: "Clínica Veterinária", desc: "Consultas, vacinas e exames com carinho." },
            { img: store, title: "Loja Completa", desc: "Rações premium, brinquedos e acessórios." },
          ].map((c) => (
            <Card key={c.title} className="overflow-hidden border-0 p-0" style={{ boxShadow: "var(--shadow-card)" }}>
              <img src={c.img} alt={c.title} width={1024} height={768} loading="lazy" className="h-64 w-full object-cover" />
              <div className="p-6">
                <h3 className="font-display text-xl font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.desc}</p>
              </div>
            </Card>
          ))}
        </div>
      </section>

      {/* CONVITE */}
      <section className="relative overflow-hidden py-24" style={{ background: "var(--gradient-warm)" }}>
        <div className="mx-auto max-w-4xl px-6 text-center text-primary-foreground">
          <PawPrint className="mx-auto mb-6 h-12 w-12 opacity-90" />
          <h2 className="font-display text-4xl font-semibold md:text-5xl">Venha nos conhecer pessoalmente</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg opacity-90">
            Convidamos você e seu pet para uma visita guiada gratuita. Conheça nossas instalações, tome um café e veja de perto o cuidado que oferecemos.
          </p>
          <Button size="lg" variant="secondary" className="mt-8" asChild>
            <a href="#contato">Agendar minha visita</a>
          </Button>
        </div>
      </section>

      {/* SERVIÇOS */}
      <section id="servicos" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 max-w-2xl">
          <Badge variant="secondary" className="mb-4 rounded-full">Serviços</Badge>
          <h2 className="font-display text-4xl font-semibold md:text-5xl">Tudo que seu pet precisa</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Scissors, title: "Banho & Tosa", desc: "Higiene, tosa higiênica, tesoura e na máquina." },
            { icon: Stethoscope, title: "Veterinária", desc: "Consultas, vacinação, vermifugação e exames." },
            { icon: Heart, title: "Hotelzinho", desc: "Diárias e pernoites com supervisão 24h." },
            { icon: PawPrint, title: "Adestramento", desc: "Sessões individuais com etólogos certificados." },
          ].map((s) => (
            <Card key={s.title} className="border-border/60 p-6 transition-all hover:-translate-y-1 hover:shadow-lg">
              <div className="mb-4 grid h-12 w-12 place-items-center rounded-xl bg-secondary text-secondary-foreground">
                <s.icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
            </Card>
          ))}
        </div>
      </section>

      {/* PRODUTOS */}
      <section id="produtos" className="bg-secondary/40 py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 flex items-end justify-between gap-6">
            <div className="max-w-2xl">
              <Badge variant="secondary" className="mb-4 rounded-full bg-background">Produtos</Badge>
              <h2 className="font-display text-4xl font-semibold md:text-5xl">Marcas premium selecionadas</h2>
              <p className="mt-4 text-muted-foreground">Nutrição, brinquedos, acessórios e conforto — tudo testado e aprovado pelos nossos especialistas.</p>
            </div>
            <ShoppingBag className="hidden h-16 w-16 text-primary md:block" />
          </div>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { tag: "Alimentação", title: "Rações Super Premium", items: "Golden, Royal Canin, N&D" },
              { tag: "Higiene", title: "Shampoos & Cosméticos", items: "Linhas hipoalergênicas" },
              { tag: "Brinquedos", title: "Diversão Garantida", items: "Mordedores, bolas e cordas" },
              { tag: "Conforto", title: "Camas & Acessórios", items: "Caminhas, coleiras, roupinhas" },
            ].map((p) => (
              <Card key={p.title} className="border-0 bg-background p-6" style={{ boxShadow: "var(--shadow-card)" }}>
                <Badge className="mb-3 rounded-full bg-accent text-accent-foreground">{p.tag}</Badge>
                <h3 className="font-display text-lg font-semibold">{p.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{p.items}</p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* PLANOS */}
      <section id="planos" className="mx-auto max-w-7xl px-6 py-24">
        <div className="mb-14 text-center">
          <Badge variant="secondary" className="mb-4 rounded-full">Diferenciais</Badge>
          <h2 className="font-display text-4xl font-semibold md:text-5xl">Planos que cuidam de verdade</h2>
          <p className="mx-auto mt-4 max-w-2xl text-muted-foreground">Escolha o ritmo que combina com seu pet — ou pegue serviços avulsos quando precisar.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {[
            {
              name: "Avulso", price: "R$ 80", period: "/serviço", popular: false,
              features: ["Banho ou tosa sob demanda", "Consulta veterinária pontual", "Sem mensalidade", "Agendamento flexível"],
            },
            {
              name: "Mensal", price: "R$ 189", period: "/mês", popular: true,
              features: ["4 banhos por mês", "1 tosa higiênica", "10% off em produtos", "Tele-orientação veterinária"],
            },
            {
              name: "Anual", price: "R$ 1.890", period: "/ano", popular: false,
              features: ["Tudo do plano Mensal", "2 consultas veterinárias", "Vacinas anuais inclusas", "20% off em produtos", "Hotelzinho com desconto"],
            },
          ].map((p) => (
            <Card
              key={p.name}
              className={`relative p-8 ${p.popular ? "border-primary" : "border-border/60"}`}
              style={p.popular ? { boxShadow: "var(--shadow-soft)" } : undefined}
            >
              {p.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary text-primary-foreground">
                  Mais escolhido
                </Badge>
              )}
              <h3 className="font-display text-2xl font-semibold">{p.name}</h3>
              <div className="mt-4 flex items-baseline gap-1">
                <span className="font-display text-5xl font-semibold">{p.price}</span>
                <span className="text-muted-foreground">{p.period}</span>
              </div>
              <ul className="mt-8 space-y-3">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-3 text-sm">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Button className="mt-8 w-full" variant={p.popular ? "default" : "outline"} asChild>
                <a href="#contato">Assinar {p.name}</a>
              </Button>
            </Card>
          ))}
        </div>
      </section>

      {/* CONTATO / FOOTER */}
      <footer id="contato" className="border-t border-border bg-secondary/30">
        <div className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
                <PawPrint className="h-5 w-5" />
              </span>
              <span className="font-display text-xl font-semibold">Patinhas Felizes</span>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">Cuidado, carinho e profissionalismo para o seu melhor amigo.</p>
          </div>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-3"><MapPin className="mt-0.5 h-4 w-4 text-primary" /><span>Rua das Acácias, 123 — Centro</span></div>
            <div className="flex items-start gap-3"><Phone className="mt-0.5 h-4 w-4 text-primary" /><span>(11) 99999-9999</span></div>
            <div className="flex items-start gap-3"><Clock className="mt-0.5 h-4 w-4 text-primary" /><span>Seg a Sáb · 8h às 19h</span></div>
          </div>
          <div>
            <h4 className="font-display text-lg font-semibold">Agende uma visita</h4>
            <p className="mt-2 text-sm text-muted-foreground">Estamos prontos para receber você e seu pet.</p>
            <Button className="mt-4" asChild>
              <a href="https://wa.me/5511999999999" target="_blank" rel="noreferrer">Falar no WhatsApp</a>
            </Button>
          </div>
        </div>
        <div className="border-t border-border py-6 text-center text-xs text-muted-foreground">
          © {new Date().getFullYear()} Patinhas Felizes. Todos os direitos reservados.
        </div>
      </footer>
    </div>
  );
}

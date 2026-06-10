import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PawPrint, X, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar ou Cadastrar — Patinhas Felizes" },
      { name: "description", content: "Acesse sua conta para comprar produtos e gerenciar pedidos." },
    ],
  }),
  component: AuthPage,
});

const signupSchema = z.object({
  name: z.string().trim().min(2, "Nome muito curto").max(100),
  email: z.string().trim().email("E-mail inválido").max(255),
  password: z.string().min(6, "Mínimo 6 caracteres").max(72),
});
const loginSchema = z.object({
  email: z.string().trim().email("E-mail inválido"),
  password: z.string().min(1, "Informe a senha"),
});
const forgotSchema = z.object({ email: z.string().trim().email("E-mail inválido") });

function PasswordInput(props: React.ComponentProps<typeof Input>) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button
        type="button"
        onClick={() => setShow((s) => !s)}
        aria-label={show ? "Ocultar senha" : "Mostrar senha"}
        className="absolute right-2 top-1/2 -translate-y-1/2 grid h-7 w-7 place-items-center rounded text-muted-foreground hover:text-foreground"
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function AuthPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<"auth" | "forgot">("auth");

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/" });
    });
  }, [navigate]);

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = signupSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      password: fd.get("password"),
    });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: { emailRedirectTo: window.location.origin, data: { name: parsed.data.name } },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Conta criada! Você já pode comprar.");
    navigate({ to: "/" });
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = loginSchema.safeParse({ email: fd.get("email"), password: fd.get("password") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword(parsed.data);
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Bem-vindo de volta!");
    navigate({ to: "/" });
  };

  const handleGoogle = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) {
      setLoading(false);
      toast.error("Falha ao entrar com Google");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/" });
  };

  const handleForgot = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = forgotSchema.safeParse({ email: fd.get("email") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("E-mail enviado! Verifique sua caixa de entrada.");
    setMode("auth");
  };

  return (
    <div className="min-h-screen bg-secondary/30 px-4 py-12">
      <div className="mx-auto max-w-md">
        <Link to="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground">
            <PawPrint className="h-5 w-5" />
          </span>
          <span className="font-display text-xl font-semibold">Patinhas Felizes</span>
        </Link>
        <Card className="relative p-8">
          <Link
            to="/"
            aria-label="Fechar"
            className="absolute right-3 top-3 grid h-8 w-8 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Link>

          {mode === "forgot" ? (
            <div>
              <h2 className="font-display text-2xl font-semibold">Esqueci minha senha</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Informe seu e-mail para receber o link de redefinição.
              </p>
              <form onSubmit={handleForgot} className="mt-6 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="forgot-email">E-mail</Label>
                  <Input id="forgot-email" name="email" type="email" required autoComplete="email" />
                </div>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Enviando..." : "Enviar link"}
                </Button>
                <button
                  type="button"
                  onClick={() => setMode("auth")}
                  className="block w-full text-center text-sm text-muted-foreground hover:text-foreground"
                >
                  Voltar para o login
                </button>
              </form>
            </div>
          ) : (
            <>
              <Tabs defaultValue="login">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="login">Entrar</TabsTrigger>
                  <TabsTrigger value="signup">Cadastrar</TabsTrigger>
                </TabsList>

                <TabsContent value="login" className="mt-6">
                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="login-email">E-mail</Label>
                      <Input id="login-email" name="email" type="email" required autoComplete="email" />
                    </div>
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="login-password">Senha</Label>
                        <button
                          type="button"
                          onClick={() => setMode("forgot")}
                          className="text-xs text-primary hover:underline"
                        >
                          Esqueci minha senha
                        </button>
                      </div>
                      <PasswordInput id="login-password" name="password" required autoComplete="current-password" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Entrando..." : "Entrar"}
                    </Button>
                  </form>
                </TabsContent>

                <TabsContent value="signup" className="mt-6">
                  <form onSubmit={handleSignup} className="space-y-4">
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-name">Nome</Label>
                      <Input id="signup-name" name="name" required maxLength={100} />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-email">E-mail</Label>
                      <Input id="signup-email" name="email" type="email" required autoComplete="email" />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="signup-password">Senha</Label>
                      <PasswordInput id="signup-password" name="password" required minLength={6} autoComplete="new-password" />
                    </div>
                    <Button type="submit" className="w-full" disabled={loading}>
                      {loading ? "Criando..." : "Criar conta"}
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">ou continue com</span>
                </div>
              </div>

              <Button variant="outline" className="w-full" onClick={handleGoogle} disabled={loading}>
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.83z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84C6.71 7.31 9.14 5.38 12 5.38z"/>
                </svg>
                Entrar com Google
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}

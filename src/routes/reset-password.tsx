import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { z } from "zod";
import { PawPrint } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Redefinir senha — Patinhas Felizes" },
      { name: "description", content: "Defina uma nova senha para sua conta." },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // Supabase auto-processes the recovery hash; we just listen for it.
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const parsed = z
      .object({
        password: z.string().min(6, "Mínimo 6 caracteres").max(72),
        confirm: z.string(),
      })
      .refine((d) => d.password === d.confirm, { message: "As senhas não coincidem", path: ["confirm"] })
      .safeParse({ password: fd.get("password"), confirm: fd.get("confirm") });
    if (!parsed.success) return toast.error(parsed.error.issues[0].message);
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Senha atualizada!");
    navigate({ to: "/" });
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
        <Card className="p-8">
          <h1 className="font-display text-2xl font-semibold">Redefinir senha</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {ready ? "Crie uma nova senha para acessar sua conta." : "Validando link..."}
          </p>
          {ready && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="password">Nova senha</Label>
                <Input id="password" name="password" type="password" required minLength={6} autoComplete="new-password" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="confirm">Confirmar senha</Label>
                <Input id="confirm" name="confirm" type="password" required minLength={6} autoComplete="new-password" />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Salvando..." : "Salvar nova senha"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

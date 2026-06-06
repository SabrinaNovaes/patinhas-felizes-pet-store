export const SHIPPING_BY_REGION: Record<string, number> = {
  SP: 18.9, RJ: 22.5, MG: 22.5, ES: 24.9,
  PR: 26.9, SC: 28.9, RS: 32.9,
  BA: 36.9, PE: 39.9, CE: 39.9, RN: 42.9, PB: 42.9, AL: 42.9, SE: 42.9, MA: 44.9, PI: 44.9,
  GO: 32.9, DF: 32.9, MT: 38.9, MS: 36.9,
  AM: 54.9, PA: 49.9, RO: 52.9, AC: 56.9, RR: 58.9, AP: 56.9, TO: 44.9,
};

export function calcShipping(uf: string, subtotal: number): number {
  if (subtotal >= 299) return 0;
  return SHIPPING_BY_REGION[uf?.toUpperCase()] ?? 39.9;
}

export type ViaCep = {
  logradouro?: string;
  bairro?: string;
  localidade?: string;
  uf?: string;
  erro?: boolean;
};

export async function fetchCep(cep: string): Promise<ViaCep | null> {
  const clean = cep.replace(/\D/g, "");
  if (clean.length !== 8) return null;
  try {
    const res = await fetch(`https://viacep.com.br/ws/${clean}/json/`);
    const data = (await res.json()) as ViaCep;
    if (data.erro) return null;
    return data;
  } catch {
    return null;
  }
}

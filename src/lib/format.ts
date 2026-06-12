const brl = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
});

const brlPreciso = new Intl.NumberFormat("pt-BR", {
  style: "currency",
  currency: "BRL",
  minimumFractionDigits: 2,
  maximumFractionDigits: 4,
});

export function formatBRL(valor: number): string {
  return brl.format(valor);
}

/** Para câmbio (R$ 5,4230). */
export function formatCambio(valor: number): string {
  return brlPreciso.format(valor);
}

export function formatPct(valor: number, casas = 1): string {
  const sinal = valor > 0 ? "+" : "";
  return `${sinal}${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  })}%`;
}

export function formatData(iso: string): string {
  // Datas "YYYY-MM-DD" (ex.: relatorios.semana) precisam ser lidas no fuso
  // local; new Date("YYYY-MM-DD") assume UTC e recua um dia em fusos negativos
  // como America/São_Paulo. Timestamps completos (com hora) seguem normais.
  const data = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : new Date(iso);
  return data.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatDataHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** "há 12 min", "há 3 h", "há 2 d" — frescor dos dados no dashboard. */
export function tempoRelativo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60_000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

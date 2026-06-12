/**
 * Design tokens AgroDecision — fonte da verdade da identidade visual.
 * Espelhados em src/index.css (CSS vars) e tailwind.config.ts.
 * As cores primária/accent podem ser sobrescritas em runtime pelo branding
 * co-branded da cooperativa (CoopThemeProvider).
 */
export const designTokens = {
  cores: {
    verdeCampo: "#1A5C38", // primária — confiança, campo
    verdeClaro: "#E8F5EC", // fundos suaves
    laranjaColheita: "#F59E0B", // accent — colheita, AGUARDAR
    atencao: "#DC2626", // sinal ATENÇÃO
  },
  radiusPx: 12,
  fontFamily: "Inter",
} as const;

/** Converte #RRGGBB em "h s% l%" (formato das CSS vars shadcn). */
export function hexToHslVar(hex: string): string | null {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return null;
  const int = parseInt(m[1], 16);
  const r = ((int >> 16) & 255) / 255;
  const g = ((int >> 8) & 255) / 255;
  const b = (int & 255) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  let h = 0;
  let s = 0;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      default:
        h = (r - g) / d + 4;
    }
    h /= 6;
  }
  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
}

/** Luminância aproximada para decidir foreground branco/escuro sobre a cor. */
export function isDarkColor(hex: string): boolean {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return true;
  const int = parseInt(m[1], 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return 0.299 * r + 0.587 * g + 0.114 * b < 150;
}

# AgroDecision · Design System

Identidade visual do produto, consolidada em código. Veja a **página viva** em `/design-system`
(`npm run dev` → http://localhost:8080/design-system).

## Fonte da verdade

| Camada | Arquivo | Papel |
| --- | --- | --- |
| Valores de marca | `src/lib/design-tokens.ts` | hex, raio, fonte + helpers (`hexToHslVar`, `isDarkColor`) |
| Tema (CSS vars) | `src/index.css` | variáveis shadcn (`--primary`, `--campo`, `--sinal-*`, …) |
| Utilitários | `tailwind.config.ts` | mapeia as vars para classes (`bg-campo`, `text-colheita`, …) |

> As vars `--primary` e `--accent` podem ser sobrescritas em runtime pelo co-branding da
> cooperativa (`CoopThemeProvider`). Os tokens de marca `--campo`, `--colheita` e `--sinal-*`
> permanecem fixos.

## Cores

| Token | Hex | Uso |
| --- | --- | --- |
| `campo` | `#1A5C38` | Primária — confiança, campo |
| `campo-claro` | `#E8F5EC` | Fundos suaves |
| `colheita` | `#F59E0B` | Accent — colheita, AGUARDAR |
| `sinal-atencao` | `#DC2626` | Sinal ATENÇÃO |

### Sinais de decisão

- `VENDER` → verde-campo (`--sinal-vender`)
- `AGUARDAR` → laranja-colheita (`--sinal-aguardar`)
- `ATENCAO` → vermelho (`--sinal-atencao`)

Componente: `SinalBadge` (`src/components/SinalBadge.tsx`).

## Tipografia

- Família: **Inter** (fallback `system-ui`).

## Raio

- Base **12px** (`--radius`); `sm`/`md`/`lg` derivam dele.

## Componentes

- **Base (shadcn/ui)** em `src/components/ui/`: button, card, badge, input, label, select, switch,
  tabs, dialog, dropdown-menu, separator, skeleton, sonner.
- **De produto**: `SinalBadge`, `SinalCard`, `PrecoChart`, `AppLayout`.

## Como alterar a identidade

1. Ajuste o valor em `src/lib/design-tokens.ts`.
2. Reflita a CSS var correspondente em `src/index.css`.
3. (Se for cor nova) mapeie em `tailwind.config.ts`.
4. Confira na página `/design-system`.

import { useEffect, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { useAuth } from '@/hooks/use-auth';

// Fontes (Outfit / Plus Jakarta Sans / DM Serif Display) carregadas em index.html.
const FONT_DISPLAY = `'DM Serif Display',serif`;
const FONT_HEAD = `'Outfit',sans-serif`;
const FONT_BODY = `'Plus Jakarta Sans',system-ui,sans-serif`;

// ============================================================
// CO-BRANDED CONFIG — troque por cooperativa
// ============================================================
type CoopInfo = { name: string; region: string; cooperados: string; sede: string; color: string };

const COOPS: Record<string, CoopInfo> = {
  coopercitrus: { name: 'Coopercitrus', region: 'São Paulo', cooperados: '38.000+', sede: 'Bebedouro/SP', color: '#0066B3' },
  coamo: { name: 'Coamo', region: 'Paraná', cooperados: '32.000+', sede: 'Campo Mourão/PR', color: '#00843D' },
  integrada: { name: 'Integrada', region: 'Paraná', cooperados: '9.000+', sede: 'Londrina/PR', color: '#E31937' },
};

// ============================================================
// ANIMATED COUNTER
// ============================================================
function Counter({ end, duration = 2000, prefix = '', suffix = '' }: { end: number; duration?: number; prefix?: string; suffix?: string }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStarted(true); }, { threshold: 0.3 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!started) return;
    let start = 0;
    const step = end / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= end) { setCount(end); clearInterval(timer); }
      else setCount(Math.floor(start));
    }, 16);
    return () => clearInterval(timer);
  }, [started, end, duration]);

  return <span ref={ref}>{prefix}{count.toLocaleString('pt-BR')}{suffix}</span>;
}

// ============================================================
// MINI SPARKLINE
// ============================================================
function Spark({ data, color = '#F59E0B', w = 80, h = 24 }: { data: number[]; color?: string; w?: number; h?: number }) {
  const mn = Math.min(...data);
  const mx = Math.max(...data);
  const r = mx - mn || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - mn) / r) * (h - 3) - 1.5}`).join(' ');
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: 'block' }}>
      <polyline points={pts} fill='none' stroke={color} strokeWidth='1.5' strokeLinecap='round' />
    </svg>
  );
}

// ============================================================
// MOCK DASHBOARD PREVIEW
// ============================================================
function DashboardPreview() {
  const commodities = [
    { name: 'Soja', price: '139,80', pct: '+1.70%', signal: 'VENDER', data: [128, 131, 133, 135, 134, 137, 136, 139, 138, 139.8] },
    { name: 'Milho', price: '72,50', pct: '-1.16%', signal: 'AGUARDAR', data: [70, 72, 74, 73, 75, 74, 73, 74, 73, 72.5] },
    { name: 'Café', price: '1.420', pct: '+2.53%', signal: 'VENDER', data: [1300, 1330, 1350, 1370, 1380, 1390, 1400, 1390, 1410, 1420] },
    { name: 'Boi', price: '312,50', pct: '+1.56%', signal: 'VENDER', data: [298, 302, 304, 306, 305, 307, 308, 309, 310, 312.5] },
  ];
  const signalBg: Record<string, string> = { VENDER: '#1A5C38', AGUARDAR: '#2563EB' };

  return (
    <div style={{ background: 'linear-gradient(145deg,#0c1a10 0%,#0a120e 100%)', borderRadius: 20, padding: '20px 24px', position: 'relative', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)', boxShadow: '0 40px 80px rgba(0,0,0,0.5)' }}>
      <div style={{ position: 'absolute', top: -60, right: -40, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(26,92,56,0.15),transparent 70%)' }} />
      <div style={{ position: 'absolute', bottom: -40, left: '20%', width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,0.08),transparent 70%)' }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, position: 'relative', zIndex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#1A5C38,#2d8a5e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🌱</div>
          <div>
            <div style={{ fontFamily: FONT_HEAD, fontSize: 13, fontWeight: 800, color: '#fff', letterSpacing: -0.3 }}>AgroDecision</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.3)', letterSpacing: 1, textTransform: 'uppercase' }}>Coopercitrus</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {['Dashboard', 'Simulador', 'Alertas'].map((t, i) => (
            <div key={t} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 9, fontWeight: 600, fontFamily: FONT_HEAD, background: i === 0 ? '#1A5C38' : 'transparent', color: i === 0 ? '#fff' : 'rgba(255,255,255,0.4)' }}>{t}</div>
          ))}
        </div>
      </div>

      <div style={{ background: 'linear-gradient(135deg,rgba(26,92,56,0.3),rgba(26,92,56,0.1))', borderRadius: 14, padding: '14px 16px', marginBottom: 14, border: '1px solid rgba(26,92,56,0.2)', position: 'relative', zIndex: 1 }}>
        <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', letterSpacing: 1.5, textTransform: 'uppercase', fontFamily: FONT_HEAD }}>🤖 SINAL IA — SOJA</div>
        <div style={{ fontSize: 26, fontWeight: 900, color: '#F59E0B', fontFamily: FONT_HEAD, letterSpacing: 2, marginTop: 4, textShadow: '0 0 30px rgba(245,158,11,0.3)' }}>VENDER</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginTop: 6, lineHeight: 1.5, fontFamily: FONT_BODY }}>Preço 8% acima da média sazonal. Fundos reduzindo posição comprada. Fixe 30% da produção.</div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, position: 'relative', zIndex: 1 }}>
        {commodities.map((c) => (
          <div key={c.name} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontFamily: FONT_HEAD, fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{c.name}</div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', fontFamily: FONT_HEAD, marginTop: 1 }}>R$ {c.price}</div>
              </div>
              <div style={{ background: signalBg[c.signal], color: '#fff', fontSize: 7, fontWeight: 700, padding: '2px 6px', borderRadius: 4, letterSpacing: 0.5 }}>{c.signal}</div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 8 }}>
              <Spark data={c.data} color={c.pct.startsWith('+') ? '#4ade80' : '#ef4444'} />
              <div style={{ fontSize: 11, fontWeight: 700, fontFamily: FONT_HEAD, color: c.pct.startsWith('+') ? '#4ade80' : '#ef4444' }}>{c.pct}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN LANDING PAGE
// ============================================================
export default function Landing() {
  const { session, loading } = useAuth();
  const [activeCoop, setActiveCoop] = useState<string>('coopercitrus');
  const [formData, setFormData] = useState<Record<'nome' | 'cargo' | 'email' | 'telefone' | 'cooperativa', string>>({ nome: '', cargo: '', email: '', telefone: '', cooperativa: '' });
  const [submitted, setSubmitted] = useState(false);
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const h = () => setScrollY(window.scrollY);
    window.addEventListener('scroll', h, { passive: true });
    return () => window.removeEventListener('scroll', h);
  }, []);

  if (!loading && session) {
    return <Navigate to='/app' replace />;
  }

  const coop = COOPS[activeCoop];
  const formFields: { key: 'nome' | 'cargo' | 'email' | 'telefone' | 'cooperativa'; label: string; placeholder: string; type: string }[] = [
    { key: 'nome', label: 'Seu nome', placeholder: 'João Silva', type: 'text' },
    { key: 'cargo', label: 'Cargo', placeholder: 'Diretor de TI / Gerente de Negócios', type: 'text' },
    { key: 'cooperativa', label: 'Cooperativa', placeholder: 'Nome da cooperativa', type: 'text' },
    { key: 'email', label: 'Email corporativo', placeholder: 'joao@cooperativa.com.br', type: 'email' },
    { key: 'telefone', label: 'WhatsApp', placeholder: '(XX) 9XXXX-XXXX', type: 'tel' },
  ];

  return (
    <div style={{ fontFamily: FONT_BODY, color: '#1a1a1a', overflowX: 'hidden' }}>
      {/* ============ HERO ============ */}
      <section style={{ minHeight: '100vh', position: 'relative', background: 'linear-gradient(170deg, #050a07 0%, #0a1a0f 40%, #0f1f12 70%, #1A5C38 150%)', display: 'flex', flexDirection: 'column' }}>
        <div style={{ position: 'absolute', top: '10%', right: '5%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle,rgba(26,92,56,0.12),transparent 60%)', filter: 'blur(60px)', transform: `translateY(${scrollY * 0.1}px)` }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '-5%', width: 400, height: 400, borderRadius: '50%', background: 'radial-gradient(circle,rgba(245,158,11,0.06),transparent 60%)', filter: 'blur(40px)' }} />

        <nav style={{ padding: '20px 32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'relative', zIndex: 10, maxWidth: 1200, margin: '0 auto', width: '100%' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: 'linear-gradient(135deg,#1A5C38,#2d8a5e)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, boxShadow: '0 4px 20px rgba(26,92,56,0.3)' }}>🌱</div>
            <div>
              <div style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: -0.5 }}>AgroDecision</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT_HEAD }}>INTELIGÊNCIA DE MERCADO</div>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <Link to='/entrar' style={{ color: 'rgba(255,255,255,0.6)', fontSize: 13, fontWeight: 600, fontFamily: FONT_HEAD, textDecoration: 'none' }}>Entrar</Link>
            <a href='#agendar' style={{ padding: '10px 24px', background: 'rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 12, color: '#F59E0B', fontSize: 13, fontWeight: 700, fontFamily: FONT_HEAD, textDecoration: 'none', letterSpacing: 0.3 }}>Agendar Demonstração</a>
          </div>
        </nav>

        <div style={{ flex: 1, display: 'flex', alignItems: 'center', maxWidth: 1200, margin: '0 auto', padding: '0 32px', width: '100%', gap: 60, flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 420px', position: 'relative', zIndex: 2 }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '6px 16px', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.15)', borderRadius: 100, marginBottom: 28 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#F59E0B', animation: 'pulse 2s ease-in-out infinite' }} />
              <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, fontFamily: FONT_HEAD, letterSpacing: 1.5, textTransform: 'uppercase' }}>Piloto Gratuito — 90 Dias</span>
            </div>

            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.08, color: '#fff', margin: '0 0 8px', letterSpacing: -1 }}>
              Seu cooperado usa<br /><span style={{ color: 'rgba(255,255,255,0.3)', fontStyle: 'italic' }}>WhatsApp</span> para cotação.
            </h1>
            <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(36px,5vw,58px)', lineHeight: 1.08, margin: '0 0 28px', letterSpacing: -1 }}>
              <span style={{ background: 'linear-gradient(135deg,#F59E0B,#FBBF24)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Nós entregamos isso com IA.</span>
            </h1>

            <p style={{ fontSize: 17, lineHeight: 1.7, color: 'rgba(255,255,255,0.45)', maxWidth: 480, margin: '0 0 36px' }}>
              Dashboard de preços, câmbio, margem e recomendações de venda por inteligência artificial — no app da sua cooperativa, em 4 semanas. <strong style={{ color: 'rgba(255,255,255,0.7)' }}>Piloto gratuito por 90 dias.</strong>
            </p>

            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              <a href='#agendar' style={{ padding: '14px 32px', background: 'linear-gradient(135deg,#F59E0B,#D97706)', borderRadius: 14, color: '#000', fontSize: 15, fontWeight: 800, fontFamily: FONT_HEAD, textDecoration: 'none', boxShadow: '0 8px 30px rgba(245,158,11,0.25)', letterSpacing: 0.3 }}>Agendar Demonstração →</a>
              <a href='#como-funciona' style={{ padding: '14px 32px', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 14, color: 'rgba(255,255,255,0.5)', fontSize: 15, fontWeight: 600, fontFamily: FONT_HEAD, textDecoration: 'none' }}>Como funciona</a>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 48, paddingTop: 28, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
              {[{ n: 'R$ 160k–300k', sub: 'margem recuperada/ano por produtor' }, { n: '< 30s', sub: 'para a primeira decisão informada' }, { n: '5', sub: 'commodities monitoradas com IA' }].map((s) => (
                <div key={s.sub} style={{ flex: 1 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#F59E0B', fontFamily: FONT_HEAD }}>{s.n}</div>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', lineHeight: 1.4, marginTop: 2 }}>{s.sub}</div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ flex: '1 1 360px', maxWidth: 480, position: 'relative', transform: `translateY(${scrollY * -0.05}px)` }}>
            <DashboardPreview />
            <div style={{ position: 'absolute', bottom: -20, left: '50%', transform: 'translateX(-50%)', fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: FONT_HEAD, whiteSpace: 'nowrap' }}>Dashboard real • Dados atualizados a cada 15 min</div>
          </div>
        </div>

        <div style={{ textAlign: 'center', paddingBottom: 32, position: 'relative', zIndex: 2 }}>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT_HEAD }}>↓ SCROLL</div>
        </div>
      </section>

      {/* ============ PROBLEM ============ */}
      <section id='como-funciona' style={{ padding: '100px 32px', background: '#fafbfa', position: 'relative' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT_HEAD, marginBottom: 12 }}>O PROBLEMA</div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(28px,3.5vw,44px)', color: '#1a1a1a', margin: 0, lineHeight: 1.15 }}>Produtores perdem <span style={{ color: '#EF4444' }}>8–15% de margem</span><br />por decisões baseadas em instinto.</h2>
            <p style={{ fontSize: 16, color: '#888', maxWidth: 560, margin: '20px auto 0', lineHeight: 1.7 }}>Em uma safra de R$ 2 milhões, isso são R$ 160k–300k de valor destruído por falta de informação integrada. (Conab, 2024)</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 20 }}>
            {[{ icon: '📱', title: 'WhatsApp como fonte', desc: 'Cotações espalhadas em grupos, sem padronização, sem histórico, sem contexto de decisão.' }, { icon: '📊', title: 'Planilhas desconexas', desc: 'Cada produtor mantém sua planilha. Sem câmbio, sem margem automática, sem alertas.' }, { icon: '🎯', title: 'Timing por instinto', desc: 'Quando vender? Quando travar câmbio? Sem dados consolidados, a decisão é emocional.' }].map((p) => (
              <div key={p.title} style={{ background: '#fff', borderRadius: 20, padding: 28, border: '1px solid #eee', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 16, right: 16, fontSize: 8, fontWeight: 700, color: '#EF4444', letterSpacing: 1, textTransform: 'uppercase', fontFamily: FONT_HEAD, padding: '3px 8px', background: 'rgba(239,68,68,0.06)', borderRadius: 6 }}>HOJE</div>
                <div style={{ fontSize: 32, marginBottom: 12 }}>{p.icon}</div>
                <h3 style={{ fontFamily: FONT_HEAD, fontSize: 17, fontWeight: 800, color: '#1a1a1a', margin: '0 0 8px' }}>{p.title}</h3>
                <p style={{ fontSize: 14, color: '#888', lineHeight: 1.6, margin: 0 }}>{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ SOLUTION ============ */}
      <section style={{ padding: '100px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <div style={{ fontSize: 11, color: '#1A5C38', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT_HEAD, marginBottom: 12 }}>A SOLUÇÃO</div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(28px,3.5vw,44px)', color: '#1a1a1a', margin: 0, lineHeight: 1.15 }}>Um dashboard. 30 segundos.<br /><span style={{ color: '#1A5C38' }}>Decisão informada.</span></h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 16 }}>
            {[{ icon: '📊', title: 'Dashboard Integrado', desc: 'Soja, milho, café, algodão, boi gordo — preço, variação e sparkline 30 dias numa tela.', tag: 'F01' }, { icon: '🤖', title: 'Sinal de IA', desc: 'VENDER, AGUARDAR ou ATENÇÃO com justificativa em linguagem do campo. Atualizado a cada hora.', tag: 'F06' }, { icon: '🧮', title: 'Calculadora de Margem', desc: `'Se eu vender 1.000 sacas hoje, qual meu lucro?' — com break-even automático.`, tag: 'F03' }, { icon: '⚡', title: 'Alertas por WhatsApp', desc: 'Notificação quando preço, margem ou sinal IA atingir seu target. Push + WhatsApp.', tag: 'F04' }, { icon: '💱', title: 'Câmbio + Impacto', desc: 'USD/BRL em tempo real com cálculo automático do impacto no preço da soja exportação.', tag: 'F05' }, { icon: '📄', title: 'Relatório Semanal', desc: 'PDF gerado toda segunda com resumo de preços, sinais IA e ações recomendadas.', tag: 'F08' }].map((f) => (
              <div key={f.title} style={{ padding: 24, borderRadius: 16, border: '1px solid #eee', display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                <div style={{ fontSize: 28, flexShrink: 0 }}>{f.icon}</div>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <h3 style={{ fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 800, color: '#1a1a1a', margin: 0 }}>{f.title}</h3>
                    <span style={{ fontSize: 9, fontWeight: 700, color: '#1A5C38', background: 'rgba(26,92,56,0.06)', padding: '2px 6px', borderRadius: 4, fontFamily: FONT_HEAD }}>{f.tag}</span>
                  </div>
                  <p style={{ fontSize: 13, color: '#888', lineHeight: 1.6, margin: '6px 0 0' }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ PITCH COOPERATIVA ============ */}
      <section style={{ padding: '100px 32px', background: 'linear-gradient(170deg,#050a07,#0f1f12)' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT_HEAD, marginBottom: 16 }}>PROPOSTA PARA SUA COOPERATIVA</div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(26px,3.5vw,40px)', color: '#fff', margin: '0 0 24px', lineHeight: 1.2 }}>Não vendemos software para produtor.<br />Vendemos <span style={{ color: '#F59E0B' }}>diferenciação competitiva</span> para você.</h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,0.4)', maxWidth: 620, margin: '0 auto 48px', lineHeight: 1.7 }}>Enquanto outras cooperativas oferecem o mesmo serviço de sempre, vocês passam a oferecer inteligência de mercado com IA como benefício exclusivo. Isso fideliza cooperado e reduz evasão para tradings concorrentes.</p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
            {[{ n: <Counter end={8} suffix='–15%' />, label: 'de margem recuperada', sub: 'por cooperado/ano' }, { n: <Counter end={4} suffix=' sem' />, label: 'para implementar', sub: 'do zero ao dashboard' }, { n: <Counter end={90} suffix=' dias' />, label: 'piloto gratuito', sub: 'sem compromisso' }, { n: <Counter end={0} prefix='R$ ' />, label: 'custo no piloto', sub: 'zero, nada, grátis' }].map((s, i) => (
              <div key={i} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 16, padding: 24, border: '1px solid rgba(255,255,255,0.06)' }}>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#F59E0B', fontFamily: FONT_HEAD }}>{s.n}</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', fontWeight: 600, fontFamily: FONT_HEAD, marginTop: 4 }}>{s.label}</div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)', marginTop: 2 }}>{s.sub}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ CO-BRANDING ============ */}
      <section style={{ padding: '100px 32px', background: '#fafbfa' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <div style={{ fontSize: 11, color: '#1A5C38', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT_HEAD, marginBottom: 12 }}>CO-BRANDING</div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(26px,3vw,38px)', color: '#1a1a1a', margin: 0, lineHeight: 1.15 }}>Sua marca. Nossa tecnologia.</h2>
            <p style={{ fontSize: 15, color: '#888', maxWidth: 500, margin: '16px auto 0', lineHeight: 1.6 }}>O cooperado vê a marca da cooperativa. Logo, cores e link personalizados.</p>
          </div>

          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 32, flexWrap: 'wrap' }}>
            {Object.entries(COOPS).map(([key, c]) => (
              <button key={key} onClick={() => setActiveCoop(key)} style={{ padding: '10px 20px', borderRadius: 12, border: activeCoop === key ? `2px solid ${c.color}` : '2px solid #eee', background: activeCoop === key ? `${c.color}10` : '#fff', fontSize: 13, fontWeight: 700, fontFamily: FONT_HEAD, cursor: 'pointer', color: activeCoop === key ? c.color : '#888' }}>{c.name}</button>
            ))}
          </div>

          <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.08)', border: '1px solid #eee', maxWidth: 700, margin: '0 auto' }}>
            <div style={{ background: `linear-gradient(135deg,${coop.color},${coop.color}dd)`, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: FONT_HEAD, fontSize: 16, fontWeight: 900, color: '#fff' }}>{coop.name.charAt(0)}</div>
              <div>
                <div style={{ fontFamily: FONT_HEAD, fontSize: 15, fontWeight: 800, color: '#fff' }}>{coop.name}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.6)', letterSpacing: 1, textTransform: 'uppercase' }}>powered by AgroDecision</div>
              </div>
            </div>
            <div style={{ padding: 20, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 10 }}>
              {[{ label: 'Cooperados', value: coop.cooperados, icon: '👥' }, { label: 'Região', value: coop.region, icon: '📍' }, { label: 'Sede', value: coop.sede, icon: '🏢' }].map((s) => (
                <div key={s.label} style={{ textAlign: 'center', padding: 16, background: '#fafbfa', borderRadius: 12 }}>
                  <div style={{ fontSize: 20, marginBottom: 4 }}>{s.icon}</div>
                  <div style={{ fontSize: 16, fontWeight: 800, fontFamily: FONT_HEAD, color: '#1a1a1a' }}>{s.value}</div>
                  <div style={{ fontSize: 10, color: '#aaa', fontFamily: FONT_HEAD }}>{s.label}</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '0 20px 20px', textAlign: 'center' }}>
              <div style={{ padding: 12, background: `${coop.color}08`, border: `1px solid ${coop.color}20`, borderRadius: 12, fontSize: 12, color: '#555', lineHeight: 1.6 }}>URL exclusiva: <strong style={{ color: coop.color }}>agrodecision.com.br/{activeCoop}</strong></div>
            </div>
          </div>
        </div>
      </section>

      {/* ============ PRICING ============ */}
      <section style={{ padding: '100px 32px', background: '#fff' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <div style={{ fontSize: 11, color: '#1A5C38', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT_HEAD, marginBottom: 12 }}>INVESTIMENTO</div>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(26px,3vw,38px)', color: '#1a1a1a', margin: '0 0 48px' }}>Comece com zero risco.</h2>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 16, textAlign: 'left' }}>
            {[{ plan: 'Piloto', price: 'Grátis', period: '90 dias', features: ['Até 500 cooperados', 'Dashboard completo', 'Sinais de IA', 'Alertas push', 'Relatórios semanais', 'Co-branding completo'], highlight: true, cta: 'Solicitar Piloto' }, { plan: 'Starter', price: 'R$ 1.500', period: '/mês', features: ['Até 500 cooperados', 'Tudo do Piloto', 'Portal admin', 'Relatórios mensais', 'Suporte email'], highlight: false, cta: 'Após o piloto' }, { plan: 'Pro', price: 'R$ 3.500', period: '/mês', features: ['Até 2.000 cooperados', 'Tudo do Starter', 'API básica', 'Suporte prioritário', 'Revenue share 20%'], highlight: false, cta: 'Após o piloto' }].map((p) => (
              <div key={p.plan} style={{ borderRadius: 20, padding: 28, position: 'relative', background: p.highlight ? 'linear-gradient(170deg,#050a07,#1A5C38)' : '#fafbfa', border: p.highlight ? '1px solid rgba(245,158,11,0.3)' : '1px solid #eee', color: p.highlight ? '#fff' : '#1a1a1a' }}>
                {p.highlight ? <div style={{ position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)', fontSize: 10, fontWeight: 800, color: '#000', background: '#F59E0B', padding: '4px 14px', borderRadius: 100, fontFamily: FONT_HEAD, letterSpacing: 1 }}>RECOMENDADO</div> : null}
                <div style={{ fontSize: 12, fontWeight: 700, fontFamily: FONT_HEAD, opacity: p.highlight ? 0.6 : 0.4, letterSpacing: 1, textTransform: 'uppercase' }}>{p.plan}</div>
                <div style={{ fontSize: 36, fontWeight: 900, fontFamily: FONT_HEAD, marginTop: 8 }}>{p.price}<span style={{ fontSize: 14, fontWeight: 500, opacity: 0.5 }}>{p.period}</span></div>
                <ul style={{ listStyle: 'none', padding: 0, margin: '20px 0' }}>
                  {p.features.map((f) => (
                    <li key={f} style={{ fontSize: 13, padding: '5px 0', display: 'flex', alignItems: 'center', gap: 8, opacity: p.highlight ? 0.8 : 0.6 }}><span style={{ color: p.highlight ? '#F59E0B' : '#1A5C38', fontSize: 14 }}>✓</span> {f}</li>
                  ))}
                </ul>
                <a href='#agendar' style={{ display: 'block', textAlign: 'center', padding: '12px 0', borderRadius: 12, background: p.highlight ? 'linear-gradient(135deg,#F59E0B,#D97706)' : 'transparent', border: p.highlight ? 'none' : '1px solid #ddd', color: p.highlight ? '#000' : '#888', fontWeight: 700, fontSize: 13, fontFamily: FONT_HEAD, textDecoration: 'none', letterSpacing: 0.3 }}>{p.cta}</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============ FORM ============ */}
      <section id='agendar' style={{ padding: '100px 32px', background: 'linear-gradient(170deg,#050a07,#0f1f12)' }}>
        <div style={{ maxWidth: 560, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{ fontSize: 11, color: '#F59E0B', fontWeight: 700, letterSpacing: 2, textTransform: 'uppercase', fontFamily: FONT_HEAD, marginBottom: 12 }}>AGENDAR DEMONSTRAÇÃO</div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 'clamp(26px,3.5vw,38px)', color: '#fff', margin: 0, lineHeight: 1.2 }}>Vamos mostrar o dashboard<br />com os dados da sua cooperativa.</h2>
            <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.35)', marginTop: 12 }}>Demonstração de 20 min. Sem compromisso.</p>
          </div>

          {submitted ? (
            <div style={{ textAlign: 'center', padding: 40, background: 'rgba(26,92,56,0.1)', borderRadius: 20, border: '1px solid rgba(26,92,56,0.2)' }}>
              <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
              <h3 style={{ fontFamily: FONT_HEAD, fontSize: 20, fontWeight: 800, color: '#fff', margin: '0 0 8px' }}>Recebemos seu contato!</h3>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>Nosso time entra em contato em até 24h para agendar a demonstração.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {formFields.map((f) => (
                <div key={f.key}>
                  <label style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.4)', fontFamily: FONT_HEAD, letterSpacing: 0.5, textTransform: 'uppercase', display: 'block', marginBottom: 4 }}>{f.label}</label>
                  <input type={f.type} placeholder={f.placeholder} value={formData[f.key]} onChange={(e) => setFormData((p) => ({ ...p, [f.key]: e.target.value }))} style={{ width: '100%', padding: '12px 16px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.08)', background: 'rgba(255,255,255,0.04)', color: '#fff', fontSize: 14, fontFamily: FONT_BODY, outline: 'none', boxSizing: 'border-box' }} />
                </div>
              ))}
              <button onClick={() => setSubmitted(true)} style={{ marginTop: 8, padding: '16px 0', borderRadius: 14, border: 'none', cursor: 'pointer', background: 'linear-gradient(135deg,#F59E0B,#D97706)', color: '#000', fontSize: 16, fontWeight: 800, fontFamily: FONT_HEAD, letterSpacing: 0.3, boxShadow: '0 8px 30px rgba(245,158,11,0.2)' }}>Solicitar Demonstração Gratuita →</button>
              <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', textAlign: 'center', marginTop: 4 }}>Respondemos em até 24h. Sem spam, sem robocall.</p>
            </div>
          )}
        </div>
      </section>

      {/* ============ FOOTER ============ */}
      <footer style={{ padding: 32, background: '#050a07', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.04)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <span style={{ fontSize: 16 }}>🌱</span>
          <span style={{ fontFamily: FONT_HEAD, fontSize: 14, fontWeight: 800, color: 'rgba(255,255,255,0.5)' }}>AgroDecision</span>
        </div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.2)', fontFamily: FONT_HEAD }}>Yamazing Corp © 2026 • Dados: CEPEA / B3 / BCB • Inteligência artificial: Claude by Anthropic</div>
      </footer>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} } #agendar input:focus { border-color: rgba(245,158,11,0.4) !important; background: rgba(255,255,255,0.06) !important; }`}</style>
    </div>
  );
}

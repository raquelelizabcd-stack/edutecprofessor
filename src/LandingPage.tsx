import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronRight,
  CheckCircle2,
  ArrowRight,
  Menu,
  X,
  Star,
  Zap,
  FileText,
  Calendar,
  ClipboardList,
  BookOpen,
  Sparkles,
  Users,
  Accessibility,
  FileDown,
  LayoutDashboard,
  MessageSquare,
  ShieldCheck,
  Loader2
} from 'lucide-react';
import { cn } from './lib/utils';
import { UserProfile } from './types';
import LandingNavbar from './components/layout/LandingNavbar';
import { supabase } from './lib/supabase';

interface LandingPageProps {
  onLogin: (role: UserProfile) => void;
  onGoToLogin: (planIntent?: 'free' | 'pro') => void;
  onGoToPayment: () => void;
  onGoToDashboard: () => void;
  role?: string;
  statusPagamento?: string | null;
  userEmail?: string;
  userId?: string;
}

export default function LandingPage({ onLogin, onGoToLogin, onGoToPayment, onGoToDashboard, role, statusPagamento, userEmail, userId }: LandingPageProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [selectedPlanView, setSelectedPlanView] = useState<'none' | 'free' | 'pro'>('none');
  const [isCreatingPortalSession, setIsCreatingPortalSession] = useState(false);

  const handleCancelSubscription = async () => {
    setIsCreatingPortalSession(true);
    try {
        const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
        const apiUrl = isLocal
            ? 'http://localhost:3001/api/create-portal-session'
            : '/api/create-portal-session';

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
                email: userEmail,
                userId: userId
            })
        });

        if (!response.ok) throw new Error('Erro ao abrir portal');
        const { url } = await response.json();
        if (url) window.location.href = url;
    } catch (err) {
        console.error(err);
        alert('Não foi possível acessar o portal agora.');
    } finally {
        setIsCreatingPortalSession(false);
    }
  };

  const features = [
    { title: 'Planejamentos Prontos', desc: 'Planejamentos semanais, mensais e diários prontos em minutos.', icon: Calendar },
    { title: 'Relatórios Automáticos', desc: 'Relatórios ilimitados e automáticos, sem retrabalho, exportáveis em PDF e CSV.', icon: FileText },
    { title: 'BNCC Integrada', desc: 'Atividades alinhadas à BNCC sem esforço e com precisão.', icon: Zap },
    { title: 'Portfólio Digital', desc: 'Portfólio digital completo para acompanhar sua evolução pedagógica.', icon: LayoutDashboard },
  ];

  const handleStartProTrial = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        onGoToLogin('pro');
        return;
      }

      const { data: userRecord, error } = await supabase
        .from('users')
        .select('status_pagamento')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') throw error;

      if (!userRecord || (userRecord.status_pagamento !== 'aprovado' && userRecord.status_pagamento !== 'pendente')) {
        const trialEnd = new Date();
        trialEnd.setDate(trialEnd.getDate() + 7);
        await supabase.from('users').upsert({
          id: session.user.id,
          plano: 'pro',
          status_pagamento: 'pendente',
          data_expiracao: trialEnd.toISOString().split('T')[0]
        });
      }
      onGoToDashboard();
    } catch (err) {
      console.error(err);
      onGoToLogin();
    }
  };

  const handleUpgradeClick = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Not logged in -> Go to payment, then it redirects to login if needed
        onGoToPayment();
        return;
      }

      const { data: userRecord, error } = await supabase
        .from('users')
        .select('status_pagamento')
        .eq('id', session.user.id)
        .maybeSingle();

      if (error) throw error;

      if (userRecord?.status_pagamento !== 'ativo' && userRecord?.status_pagamento !== 'aprovado') {
        onGoToPayment();
      } else {
        // Active -> let it flow to dashboard
        onGoToDashboard();
      }
    } catch (err) {
      console.error(err);
      onGoToLogin();
    }
  };

  if (selectedPlanView !== 'none') {
    const isFree = selectedPlanView === 'free';
    const planFeatures = isFree ? [
      { label: 'Planejamento Semanal (1/semana)', icon: Calendar },
      { label: 'Planejamento Mensal (1/mês)', icon: ClipboardList },
      { label: 'Planejamento Diário (1/dia)', icon: BookOpen },
      { label: 'Relatório Individual (1/dia)', icon: FileText },
      { label: 'Exportação PDF bloqueada', icon: X },
      { label: 'Dados apagados após 3 dias', icon: Zap },
    ] : [
      { label: 'Todos os recursos Pro (limite: 3 cada)', icon: Star },
      { label: 'Exportação de até 3 PDFs', icon: FileDown },
      { label: 'Sem anúncios e interrupções', icon: ShieldCheck },
      { label: '7 dias grátis para testar', icon: Zap },
    ];

    return (
      <div className="min-h-screen bg-[#FDFCFB] py-12 px-6">
        <div className="max-w-4xl mx-auto">
          <button
            onClick={() => setSelectedPlanView('none')}
            className="flex items-center gap-2 text-black/40 hover:text-black transition-colors mb-8 font-medium"
          >
            <ArrowRight className="rotate-180" size={20} />
            Voltar para planos
          </button>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-[40px] border border-black/5 p-8 md:p-16 shadow-xl"
          >
            <div className="text-center mb-12">
              <div className={cn(
                "w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6",
                isFree ? "bg-[#00A859]/10 text-[#00A859]" : "bg-black text-white"
              )}>
                {isFree ? <Star size={40} /> : <Zap size={40} />}
              </div>
              <h2 className="text-4xl font-bold mb-4">Plano {isFree ? 'Free' : 'Pro'}</h2>
              <p className="text-black/60 text-lg max-w-md mx-auto">
                {isFree
                  ? 'Ideal para quem está começando e quer organizar sua rotina pedagógica básica.'
                  : 'A solução completa para professores que buscam máxima produtividade e recursos avançados.'}
              </p>
            </div>

            <div className={cn(
              "grid gap-4 mb-12",
              isFree ? "max-w-md mx-auto" : "md:grid-cols-2"
            )}>
              {planFeatures.map((f, i) => (
                <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-[#FDFCFB] border border-black/5">
                  <div className="w-10 h-10 bg-[#00A859]/10 rounded-xl flex items-center justify-center text-[#00A859]">
                    <f.icon size={20} />
                  </div>
                  <span className="font-medium text-black/80">{f.label}</span>
                </div>
              ))}
            </div>

            {/* Início dos Avisos Estratégicos Pro */}
            {!isFree && (
              <div className="mb-10 text-center space-y-3">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 text-[#00A859] rounded-full border border-emerald-100 shadow-sm">
                   <Zap size={16} fill="currentColor" />
                   <span className="font-black text-sm uppercase tracking-tight">Teste grátis disponível por até 7 dias</span>
                </div>
                <div className="flex items-center justify-center gap-2 text-black/40">
                   <ShieldCheck size={16} />
                   <p className="text-sm font-medium">Cancele sua assinatura quando quiser, sem burocracia</p>
                </div>

                {/* Botão de Cancelamento para quem já é assinante */}
                {role === 'pro' && (statusPagamento === 'aprovado' || statusPagamento === 'cancelado') && (
                  <motion.button
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={handleCancelSubscription}
                    disabled={isCreatingPortalSession}
                    className="mt-4 px-6 py-2.5 border-2 border-red-500/20 text-red-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-50 transition-all flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                  >
                    {isCreatingPortalSession ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />}
                    Cancelar Plano Pro
                  </motion.button>
                )}
              </div>
            )}

            <div className="text-center">
              <button
                onClick={() => isFree ? onGoToLogin('free') : handleUpgradeClick()}
                className="px-12 py-5 bg-[#00A859] text-white rounded-full font-bold text-lg hover:bg-[#008F4C] transition-all shadow-xl shadow-[#00A859]/20"
              >
                {isFree ? 'Começar agora' : 'Finalizar Assinatura Pro'}
              </button>
              {!isFree && (
                <p className="mt-6 text-black/40 text-sm">
                  Pagamento seguro via cartão de crédito ou boleto.
                </p>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] font-sans">
      <LandingNavbar onGoToLogin={onGoToLogin} />

      {/* Hero Section */}
      <section id="home" className="pt-32 md:pt-40 pb-12 md:pb-20 px-6">
        <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center md:text-left"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00A859]/10 text-[#00A859] text-xs font-bold uppercase tracking-wider mb-6">
              <Star size={14} fill="currentColor" />
              Para Professores Individuais
            </div>
            <h1 className="text-5xl md:text-7xl font-bold leading-[1.1] md:leading-[0.9] tracking-tighter mb-8">
              EduTecProfessor — A revolução definitiva na <span className="text-[#00A859]">gestão pedagógica</span>.
            </h1>
            <p className="text-lg md:text-xl text-black/60 max-w-lg mx-auto md:mx-0 mb-6 leading-relaxed">
              Chega de perder noites preparando relatórios e planejamentos. Nosso sistema automatiza tarefas, organiza sua rotina e gera relatórios alinhados à BNCC em segundos. Você ganha tempo, reduz estresse e foca no que realmente importa: ensinar com qualidade. <br /><br />
              <span className="font-bold text-black/80 italic">Todos os arquivos podem ser baixados e salvos em PDF e CSV.</span>
            </p>
            <div className="bg-[#00A859]/5 border border-[#00A859]/20 p-6 rounded-3xl mb-8">
              <div className="flex items-center gap-3 mb-4">
                <Sparkles size={20} className="text-[#00A859] shrink-0" />
                <p className="text-sm font-medium text-[#00A859]">
                  Experimente o <span className="font-bold">Plano Pro gratuitamente por 7 dias</span> agora mesmo.
                </p>
              </div>
              <div className="space-y-2 pt-2 border-t border-[#00A859]/10">
                <p className="text-[10px] font-bold text-[#00A859] uppercase tracking-widest mb-2">Recursos do Plano Pro</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
                  {[
                    '✔ Calendário de presença dos alunos',
                    '✔ Exportação de PDF diário e completo',
                    '✔ Gestão detalhada de alunos',
                    '✔ Controle de validade da assinatura',
                    '✔ Portfólio digital e relatórios avançados',
                    '✔ Diário de reflexões sem limitações'
                  ].map((item, i) => (
                    <div key={i} className="flex items-center gap-2 text-[11px] text-[#00A859]/80 font-medium">
                      <CheckCircle2 size={12} className="shrink-0" />
                      {item.replace('✔ ', '')}
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row items-center justify-center md:justify-start gap-4">
              <button
                onClick={handleStartProTrial}
                className="w-full sm:w-auto px-8 py-4 bg-[#00A859] text-white rounded-full font-semibold hover:bg-[#008F4C] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00A859]/20"
              >
                Experimentar Plano Pro por 7 dias grátis
                <ChevronRight size={20} />
              </button>
              <button
                onClick={() => {
                  const el = document.getElementById('planos');
                  el?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full sm:w-auto px-8 py-4 border border-black/10 rounded-full font-semibold hover:bg-black/5 transition-all text-center flex items-center justify-center"
              >
                Ver Planos
              </button>
            </div>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative h-[400px] md:h-[500px] w-full flex items-center justify-center pt-8 md:pt-0"
          >
            {/* Background glowing orb */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-[#00A859]/20 rounded-full blur-[100px]" />

            {/* Dashboard Image Container */}
            <motion.div
              animate={{ y: [-10, 10, -10] }}
              transition={{ repeat: Infinity, duration: 6, ease: "easeInOut" }}
              className="relative z-10 w-full max-w-[550px]"
            >
              <div className="bg-white/40 backdrop-blur-xl border border-white/60 rounded-[32px] shadow-2xl overflow-hidden p-2">
                <img 
                  src="/assets/dashboard-pro.png" 
                  alt="Dashboard EduTecProfessor" 
                  className="w-full h-auto rounded-[24px] shadow-lg"
                />
              </div>
              
              {/* Floating badges for extra premium feel */}
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1 }}
                className="absolute -right-4 -top-4 bg-white p-4 rounded-2xl shadow-xl border border-black/5 flex items-center gap-3 hidden md:flex"
              >
                <div className="w-10 h-10 bg-[#00A859]/10 rounded-xl flex items-center justify-center text-[#00A859]">
                  <LayoutDashboard size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-black/40 font-bold uppercase tracking-wider">Interface</p>
                  <p className="text-sm font-bold">Moderna & Intuitiva</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.2 }}
                className="absolute -left-6 -bottom-6 bg-white p-4 rounded-2xl shadow-xl border border-black/5 flex items-center gap-3 hidden md:flex"
              >
                <div className="w-10 h-10 bg-[#00A859]/10 rounded-xl flex items-center justify-center text-[#00A859]">
                  <Sparkles size={20} />
                </div>
                <div>
                  <p className="text-[10px] text-black/40 font-bold uppercase tracking-wider">Resultados</p>
                  <p className="text-sm font-bold">100% Pedagógicos</p>
                </div>
              </motion.div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features */}
      <section id="funcionalidades" className="py-16 md:py-24 bg-white border-y border-black/5">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Poder total para o professor — menos burocracia, mais tempo para ensinar.</h2>
            <p className="text-black/60">Ferramentas desenhadas para simplificar sua vida acadêmica. Todos os documentos podem ser exportados em PDF e CSV.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 md:gap-8">
            {features.map((f, i) => (
              <motion.div
                key={i}
                whileHover={{ y: -10 }}
                className="p-6 md:p-8 rounded-3xl bg-[#FDFCFB] border border-black/5 hover:border-[#00A859]/30 transition-all"
              >
                <div className="w-12 h-12 md:w-14 md:h-14 bg-[#00A859]/10 rounded-2xl flex items-center justify-center text-[#00A859] mb-6">
                  <f.icon size={24} className="md:w-7 md:h-7" />
                </div>
                <h3 className="text-lg md:text-xl font-bold mb-3">{f.title}</h3>
                <p className="text-black/60 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Plans */}
      <section id="planos" className="py-16 md:py-24 bg-[#FDFCFB]">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center max-w-2xl mx-auto mb-16 md:mb-20">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight mb-4">Escolha seu plano</h2>
            <p className="text-black/60">Comece grátis ou experimente o Pro por 7 dias.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8 max-w-4xl mx-auto">
            {/* Plano Free */}
            <div className="p-8 md:p-10 rounded-[24px] md:rounded-[32px] bg-white border border-black/5 flex flex-col shadow-sm">
              <div className="mb-6 md:mb-8">
                <h3 className="text-xl md:text-2xl font-bold mb-2">Plano Free</h3>
                <p className="text-black/60 text-sm">Grátis para professores individuais.</p>
              </div>
              <div className="mb-6 md:mb-8">
                <span className="text-3xl md:text-4xl font-bold">R$ 0</span>
                <span className="text-black/40">/sempre</span>
              </div>
              <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10 flex-1">
                {[
                  'Planejamento Semanal (1/semana)',
                  'Planejamento Mensal (1/mês)',
                  'Planejamento Diário (1/dia)',
                  'Relatório Individual (1/dia)',
                  '❌ Exportação em PDF bloqueada',
                  '⚠️ Dados apagados após 3 dias',
                  'Ads discretos no sistema'
                ].map((item, i) => (
                  <li key={i} className="flex items-center gap-3 text-sm text-black/70">
                    <CheckCircle2 size={16} className={cn("shrink-0", item.startsWith('❌') || item.startsWith('⚠️') ? "text-red-400" : "text-[#00A859]")} />
                    {item.replace('❌ ', '').replace('⚠️ ', '')}
                  </li>
                ))}
              </ul>
              <button
                onClick={async () => {
                  const { data: { session } } = await supabase.auth.getSession();
                  if (!session) {
                    onGoToLogin('free');
                  } else {
                    onGoToDashboard();
                  }
                }}
                className="w-full py-3.5 md:py-4 border border-black/10 rounded-full font-semibold hover:bg-black hover:text-white transition-all"
              >
                Começar agora
              </button>
            </div>

            {/* Plano Pro */}
            <div className="p-8 md:p-10 rounded-[24px] md:rounded-[32px] bg-white border-2 border-[#00A859] flex flex-col relative shadow-xl shadow-[#00A859]/5">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 bg-[#00A859] text-white px-4 py-1 rounded-full text-[10px] md:text-xs font-bold uppercase tracking-widest">
                Recomendado
              </div>
              <div className="mb-6 md:mb-8">
                <h3 className="text-xl md:text-2xl font-bold mb-2">Plano Pro</h3>
                <p className="text-black/60 text-sm">Poder total para o professor.</p>
              </div>
              <div className="mb-6 md:mb-8">
                <span className="text-3xl md:text-4xl font-bold">R$ 29,90</span>
                <span className="text-black/40">/mês</span>
              </div>
              <div className="mb-4">
                <p className="text-xs font-bold text-[#00A859] uppercase tracking-wider mb-3">Recursos do Plano Pro</p>
                <ul className="space-y-3 md:space-y-4 mb-8 md:mb-10 flex-1">
                  {[
                    '✔ Recursos Pro ilimitados',
                    '✔ Exportação PDF Ilimitada',
                    '✔ Gestão completa de alunos',
                    '✔ Portfólio e Reflexões sem limites',
                    '✔ Calendário de presença',
                    '✔ Experiência sem anúncios'
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-black/70">
                      <CheckCircle2 size={16} className="text-[#00A859] shrink-0" />
                      {item.replace('✔ ', '')}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={handleStartProTrial}
                className="w-full py-3.5 md:py-4 bg-[#00A859] text-white rounded-full font-semibold hover:bg-[#008F4C] transition-all shadow-lg shadow-[#00A859]/20"
              >
                Experimentar Pro Grátis
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6">
        <div className="max-w-5xl mx-auto bg-[#1A1A1A] rounded-[40px] p-12 md:p-20 text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight mb-6">Teste o EduTecProfessor gratuitamente</h2>
            <p className="text-white/60 text-lg mb-6">
              Ao se cadastrar, você recebe <span className="text-[#00A859] font-bold">7 dias de acesso completo</span> ao Plano Pro para experimentar todas as funcionalidades.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 mb-10 p-6 bg-white/5 rounded-3xl border border-white/5">
              <p className="col-span-full text-[10px] font-bold text-[#00A859] uppercase tracking-widest mb-1">Recursos do Plano Pro</p>
              {[
                '✔ Calendário de presença dos alunos',
                '✔ Exportação de PDF diário e completo',
                '✔ Gestão detalhada de alunos (cadastro, edição, histórico)',
                '✔ Controle de validade da assinatura',
                '✔ Portfólio digital e relatórios avançados',
                '✔ Diário de reflexões pedagógicas sem limitações'
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                  <CheckCircle2 size={14} className="text-[#00A859] shrink-0" />
                  {item.replace('✔ ', '')}
                </div>
              ))}
            </div>
            <button
              onClick={handleStartProTrial}
              className="px-8 py-4 bg-[#00A859] text-white rounded-full font-semibold hover:bg-[#008F4C] transition-all flex items-center gap-2"
            >
              Experimentar Plano Pro por 7 dias grátis
              <ArrowRight size={20} />
            </button>
          </div>
          <div className="absolute top-0 right-0 w-1/2 h-full opacity-20 hidden md:block">
            <div className="absolute inset-0 bg-gradient-to-l from-[#1A1A1A] to-transparent z-10" />
            <img
              src="https://picsum.photos/seed/try/600/600"
              alt="Try it"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-black/5 text-center text-black/40 text-sm">
        <p>© 2024 EduTecProfessor - Professores Avulsos. Todos os direitos reservados.</p>
      </footer>
    </div>
  );
}

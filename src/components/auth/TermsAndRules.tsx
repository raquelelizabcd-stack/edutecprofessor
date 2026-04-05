import React from 'react';
import * as Icons from 'lucide-react';

interface TermsAndRulesProps {
  onAccept: () => void;
  onBack: () => void;
}

const TermsAndRules: React.FC<TermsAndRulesProps> = ({ onAccept, onBack }) => {
  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-4xl w-full bg-white rounded-[32px] shadow-2xl overflow-hidden border border-neutral-100">
        
        {/* Header */}
        <div className="p-8 bg-gradient-to-br from-[#00A859] to-[#008F4C] text-white text-center relative">
          <button 
            onClick={onBack}
            className="absolute left-6 top-6 p-2 bg-white/10 rounded-full hover:bg-white/20 transition-all"
          >
            <Icons.ChevronLeft size={20} />
          </button>
          <Icons.ShieldCheck size={48} className="mx-auto mb-4 opacity-90" />
          <h1 className="text-3xl font-black mb-2">Regras de Uso e Termos de Aceitação</h1>
          <p className="text-emerald-50 text-sm font-medium">Leia com atenção antes de entrar no sistema EduTecPro</p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 p-8 bg-neutral-50/50">
          
          {/* Plano Free */}
          <div className="bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
            <h3 className="font-black text-neutral-400 uppercase text-[10px] mb-4 tracking-widest">Plano Free (R$ 0)</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-xs text-neutral-600">
                <Icons.Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>Planejamento Diário / Relatório: 1/dia</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-neutral-600">
                <Icons.Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>Planejamento Semanal: 1/semana</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-neutral-600">
                <Icons.Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>Planejamento Mensal: 1/mês</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-neutral-600">
                <Icons.Check size={14} className="text-emerald-500 mt-0.5 shrink-0" />
                <span>1 PDF por semana</span>
              </li>
              <li className="flex items-start gap-2 text-orange-500 font-bold text-[10px] uppercase mt-2">
                <Icons.AlertCircle size={12} className="shrink-0" />
                <span>Alunos Bloqueados no Free</span>
              </li>
            </ul>
          </div>

          {/* Plano Teste Pro */}
          <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-200 shadow-sm relative">
            <h3 className="font-black text-emerald-700 uppercase text-[10px] mb-4 tracking-widest">Teste Pro (7 Dias)</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-xs text-emerald-900">
                <Icons.Zap size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <span>Até 4 PDFs totais</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-emerald-900">
                <Icons.Zap size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <span>Até 10 Portfólios</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-emerald-900">
                <Icons.Zap size={14} className="text-emerald-600 mt-0.5 shrink-0" />
                <span>5 Alunos cadastrados</span>
              </li>
              <li className="flex items-start gap-2 text-emerald-600 font-bold text-[10px] uppercase mt-2">
                <Icons.Clock size={12} className="shrink-0" />
                <span>Válido por 7 dias corridos</span>
              </li>
            </ul>
          </div>

          {/* Plano Pro Pago */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl text-white relative">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-400 text-black text-[9px] font-black px-3 py-1 rounded-full uppercase">Melhor Escolha</div>
            <h3 className="font-black text-white/40 uppercase text-[10px] mb-4 tracking-widest">Pro Pago (R$ 29,90)</h3>
            <ul className="space-y-3">
              <li className="flex items-start gap-2 text-xs text-slate-300">
                <Icons.Crown size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <span>PDFs e Relatórios Ilimitados*</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-slate-300">
                <Icons.Crown size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <span>Até 170 Alunos</span>
              </li>
              <li className="flex items-start gap-2 text-xs text-slate-300">
                <Icons.Crown size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <span>500MB p/ arquivos</span>
              </li>
              <li className="flex items-start gap-2 text-amber-400 font-bold text-[10px] uppercase mt-2">
                <Icons.Infinity size={12} className="shrink-0" />
                <span>Uso Completo e Ilimitado</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Termos LGPD */}
        <div className="p-8 border-t border-neutral-100">
          <h4 className="text-sm font-black text-neutral-800 mb-4 flex items-center gap-2">
            <Icons.Lock size={16} className="text-emerald-600" />
            Termos de Aceitação de Dados (LGPD)
          </h4>
          <div className="bg-neutral-50 p-4 rounded-xl text-[13px] text-neutral-600 leading-relaxed overflow-y-auto max-h-[150px] custom-scrollbar mb-6">
            <p className="mb-3">Ao utilizar o EduTecPro, você concorda com o tratamento de seus dados conforme as regras abaixo:</p>
            <ul className="list-disc pl-5 space-y-2">
              <li><strong>Coleta:</strong> Coletamos nome, e-mail e dados pedagógicos exclusivamente para o funcionamento do sistema.</li>
              <li><strong>Privacidade:</strong> Nenhum dado é vendido ou compartilhado com terceiros. Suas informações são transmitidas apenas para nossos parceiros tecnológicos e processadores de dados seguindo rigorosamente os padrões da LGPD.</li>
              <li><strong>Segurança de Pagamento:</strong> Todas as transações financeiras são processadas por gateways de pagamento globais altamente seguros, com criptografia de ponta a ponta. Nenhum dado do seu cartão é armazenado em nossos servidores locais.</li>
              <li><strong>Direitos:</strong> Você possui controle total sobre suas informações, podendo solicitar a exclusão total de seus dados pedagógicos a qualquer momento via suporte.</li>
            </ul>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-[11px] text-neutral-400 text-center sm:text-left">
              Ao clicar no botão ao lado, você confirma que leu e concorda com todos os termos listados acima.
            </p>
            <button
              onClick={onAccept}
              className="w-full sm:w-auto px-8 py-4 bg-[#00A859] text-white rounded-2xl font-black text-sm transition-all hover:bg-[#008F4C] hover:scale-105 active:scale-95 shadow-lg shadow-emerald-500/20"
            >
              Aceito e Quero Entrar
            </button>
          </div>
        </div>

      </div>
      <p className="mt-8 text-[11px] text-neutral-400 font-medium">EduTecPro © 2026 - Segurança e Privacidade em Primeiro Lugar</p>
    </div>
  );
};

export default TermsAndRules;

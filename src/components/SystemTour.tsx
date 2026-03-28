import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';

interface TourStep {
  target: string;
  title: string;
  content: string;
  id: string;
}

interface SystemTourProps {
  onSetActiveTab: (tabId: string) => void;
  onFinish: () => void;
  onOpenSidebar: (open: boolean) => void;
}

const STEPS: TourStep[] = [
  { target: '#nav-dashboard-evolucao', id: 'dashboard-evolucao', title: 'Dashboard de Evolução', content: 'Aqui você tem uma visão panorâmica do progresso da sua turma e indicadores pedagógicos em tempo real.' },
  { target: '#nav-planejamento-semanal', id: 'planejamento-semanal', title: 'Planejamento Semanal', content: 'Organize suas semanas de aula com integração automática aos códigos BNCC e objetivos de aprendizagem.' },
  { target: '#nav-planejamento-mensal', id: 'planejamento-mensal', title: 'Planejamento Mensal', content: 'Projete suas metas e conteúdos para o mês de forma estruturada e eficiente.' },
  { target: '#nav-planejamento-diario', id: 'planejamento-diario', title: 'Planejamento Diário', content: 'Registre o detalhamento de cada aula, atividades e recursos utilizados no dia.' },
  { target: '#nav-relatorio-individual', id: 'relatorio-individual', title: 'Relatório Individual', content: 'Gere avaliações descritivas e relatórios completos com o apoio das nossas ferramentas de automação pedagógica.' },
  { target: '#nav-presenca', id: 'presenca', title: 'Presença do Aluno', content: 'Controle a frequência da turma com agilidade e mantenha o histórico de faltas organizado.' },
  { target: '#nav-portfolio', id: 'portfolio', title: 'Portfólio Digital', content: 'Documente a jornada de cada aluno com fotos, vídeos e observações contínuas.' },
  { target: '#nav-reflexoes', id: 'reflexoes', title: 'Diário de Reflexões', content: 'Seu espaço para autoavaliação e insights sobre os desafios e conquistas da prática docente.' },
];

export default function SystemTour({ onSetActiveTab, onFinish, onOpenSidebar }: SystemTourProps) {
  const [currentStep, setCurrentStep] = useState(-1); // -1 is Welcome screen
  const [rect, setRect] = useState<DOMRect | null>(null);

  const updateHighlight = useCallback(() => {
    if (currentStep >= 0 && currentStep < STEPS.length) {
      const element = document.querySelector(STEPS[currentStep].target);
      if (element) {
        setRect(element.getBoundingClientRect());
        onSetActiveTab(STEPS[currentStep].id);
      }
    } else {
      setRect(null);
    }
  }, [currentStep, onSetActiveTab]);

  useEffect(() => {
    // Small delay to ensure tab content or sidebar is rendered
    const timer = setTimeout(updateHighlight, 100);
    return () => clearTimeout(timer);
  }, [currentStep, updateHighlight]);

  useEffect(() => {
    window.addEventListener('resize', updateHighlight);
    return () => window.removeEventListener('resize', updateHighlight);
  }, [updateHighlight]);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setCurrentStep(99); // 99 is Finish screen
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    } else if (currentStep === 0) {
      setCurrentStep(-1);
    }
  };

  const finishTour = () => {
    localStorage.setItem('hasSeenTour', 'true');
    onFinish();
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <AnimatePresence>
        {/* Dark Overlay with Hole */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 pointer-events-auto"
          style={{
            clipPath: rect 
              ? `polygon(0% 0%, 0% 100%, ${rect.left}px 100%, ${rect.left}px ${rect.top}px, ${rect.right}px ${rect.top}px, ${rect.right}px ${rect.bottom}px, ${rect.left}px ${rect.bottom}px, ${rect.left}px 100%, 100% 100%, 100% 0%)`
              : 'none'
          }}
        />
      </AnimatePresence>

      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <AnimatePresence mode="wait">
          {currentStep === -1 && (
            <motion.div
              key="welcome"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl pointer-events-auto text-center border border-black/5"
            >
              <div className="w-20 h-20 bg-[#00A859]/10 rounded-3xl flex items-center justify-center text-[#00A859] mx-auto mb-6">
                <Icons.Sparkles size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-4">Bem-vindo(a) ao EduTecProfessor!</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Vamos fazer um tour rápido pelas principais ferramentas que vão transformar sua gestão pedagógica?
              </p>
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => {
                    onOpenSidebar(true);
                    setCurrentStep(0);
                  }}
                  className="w-full py-4 bg-[#00A859] text-white rounded-2xl font-bold hover:bg-[#008F4C] transition-all shadow-lg shadow-[#00A859]/20"
                >
                  Começar Tour
                </button>
                <button
                  onClick={finishTour}
                  className="w-full py-3 text-gray-400 font-bold hover:text-gray-600 transition-colors"
                >
                  Pular por enquanto
                </button>
              </div>
            </motion.div>
          )}

          {currentStep >= 0 && currentStep < STEPS.length && (
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="absolute bg-white rounded-3xl p-8 shadow-2xl pointer-events-auto w-[350px] border border-black/5"
              style={{
                left: rect ? rect.right + 20 : '50%',
                top: rect ? Math.max(20, Math.min(rect.top, window.innerHeight - 300)) : '50%',
                transform: rect ? 'none' : 'translate(-50%, -50%)',
              }}
            >
               {/* Small arrow pointing to the highlight */}
               {rect && (
                <div 
                  className="absolute top-10 -left-2 w-4 h-4 bg-white rotate-45 border-l border-b border-black/5"
                  style={{ top: '2rem' }}
                />
               )}

              <div className="flex items-center gap-3 mb-4">
                <div className="w-8 h-8 bg-[#00A859]/10 rounded-lg flex items-center justify-center text-[#00A859]">
                  <span className="text-xs font-black">{currentStep + 1}</span>
                </div>
                <h3 className="font-bold text-gray-800">{STEPS[currentStep].title}</h3>
              </div>
              <p className="text-sm text-gray-500 mb-6 leading-relaxed">
                {STEPS[currentStep].content}
              </p>
              <div className="flex items-center justify-between gap-4">
                <div className="flex gap-1">
                  {STEPS.map((_, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all",
                        i === currentStep ? "bg-[#00A859] w-4" : "bg-gray-200"
                      )} 
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleBack}
                    className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <Icons.ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={handleNext}
                    className="px-6 py-2 bg-[#00A859] text-white rounded-xl font-bold hover:bg-[#008F4C] transition-all shadow-md shadow-[#00A859]/10"
                  >
                    {currentStep === STEPS.length - 1 ? 'Finalizar' : 'Próximo'}
                  </button>
                </div>
              </div>
            </motion.div>
          )}

          {currentStep === 99 && (
            <motion.div
              key="finish"
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white rounded-[32px] p-10 max-w-md w-full shadow-2xl pointer-events-auto text-center border border-black/5"
            >
              <div className="w-20 h-20 bg-amber-400/10 rounded-3xl flex items-center justify-center text-amber-500 mx-auto mb-6">
                <Icons.Trophy size={40} />
              </div>
              <h2 className="text-2xl font-black text-gray-800 mb-4">Tour Concluído!</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                Parabéns! Você já conhece o caminho para uma rotina docente muito mais produtiva.
              </p>
              <div className="bg-gray-50 p-4 rounded-2xl mb-8 flex items-center gap-3 text-left">
                <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-[#00A859] shadow-sm">
                  <Icons.HelpCircle size={20} />
                </div>
                <p className="text-xs font-medium text-gray-500 leading-snug">
                  Dica: Você pode reabrir este tour a qualquer momento clicando no ícone de ajuda <span className="font-bold text-[#00A859] underline">?</span> no topo da tela.
                </p>
              </div>
              <button
                onClick={finishTour}
                className="w-full py-4 bg-[#00A859] text-white rounded-2xl font-bold hover:bg-[#008F4C] transition-all shadow-lg shadow-[#00A859]/20"
              >
                Começar a usar agora
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

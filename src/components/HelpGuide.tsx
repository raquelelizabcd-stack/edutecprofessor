import React from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';

interface HelpGuideProps {
  onNavigate?: (tabId: string) => void;
}

export default function HelpGuide({ onNavigate }: HelpGuideProps) {
  const sections = [
    {
      id: 'visao-geral',
      title: 'Visão Geral',
      icon: 'Info',
      content: 'O EduTecProfessor é uma plataforma inteligente desenvolvida para simplificar a rotina pedagógica dos professores. Nosso objetivo é automatizar tarefas burocráticas, como o preenchimento de planejamentos e relatórios, permitindo que você foque no que realmente importa: o processo de ensino e aprendizagem.'
    },
    {
      id: 'funcionalidades',
      title: 'Passo a Passo das Funcionalidades',
      icon: 'Zap',
      items: [
        { id: 'dashboard-evolucao', label: 'Dashboard', desc: 'Sua central de controle. Acompanhe o progresso da turma, indicadores de evolução e acesse atalhos rápidos.', icon: 'LayoutDashboard' },
        { id: 'planejamento-semanal', label: 'Planejamento', desc: 'Crie planos Diários, Semanais e Mensais. O sistema integra automaticamente códigos BNCC relevantes.', icon: 'Calendar' },
        { id: 'relatorio-individual', label: 'Relatórios', desc: 'Gere relatórios individuais detalhados com suporte de nossas ferramentas de automação pedagógica.', icon: 'FileText' },
        { id: 'portfolio', label: 'Portfólio Digital', desc: 'Registre evidências, fotos e observações contínuas para documentar a trajetória de cada aluno.', icon: 'History' },
        { id: 'reflexoes', label: 'Diário de Reflexões', desc: 'Um espaço pessoal para autoavaliação, registro de desafios e metas para sua prática docente.', icon: 'BookOpen' },
        { id: 'alunos', label: 'Alunos', desc: 'Gerencie sua lista de alunos, edite perfis e visualize o histórico pedagógico de cada um.', icon: 'Users' },
        { id: 'presenca', label: 'Presença', desc: 'Marque a frequência diária com um clique e mantenha um histórico organizado de faltas e presenças.', icon: 'CheckSquare' },
      ]
    },
    {
      id: 'dicas',
      title: 'Dicas Rápidas',
      icon: 'Lightbulb',
      list: [
        'Use o "Assistente BNCC" para encontrar códigos por palavras-chave em segundos.',
        'Exportação em PDF: Todos os seus registros podem ser baixados individualmente no topo de cada lista.',
        'Aproveite a automação: O sistema sugere conteúdos para relatórios com base nos seus planejamentos salvos.',
        'Mantenha o Portfólio atualizado para facilitar a reunião de pais e conselhos de classe.',
        'No Plano Pro, todos os seus recursos são ilimitados e os dados permanecem salvos permanentemente.'
      ]
    },
    {
      id: 'faq',
      title: 'FAQ - Perguntas Frequentes',
      icon: 'HelpCircle',
      faqs: [
        { q: 'Como exportar meus dados?', a: 'Dentro de cada módulo, existe um ícone de "Download" ou "Exportar" no topo da lista de registros.' },
        { q: 'O sistema salva automaticamente?', a: 'Sim, sempre que você clica em "Salvar", os dados são sincronizados com segurança na nuvem.' },
        { q: 'Quais os limites do Plano Free?', a: 'O Plano Free permite 1 registro por período (dia/semana) e os dados são mantidos por 3 dias.' },
        { q: 'Posso usar no celular?', a: 'Sim! O sistema é totalmente responsivo e funciona perfeitamente em tablets e smartphones.' },
        { q: 'Como funciona o teste gratuito?', a: 'Ao se cadastrar, você ganha 7 dias de Plano Pro com todos os recursos liberados para testar.' },
      ]
    }
  ];

  const renderIcon = (name: string, size = 24, className = "") => {
    const IconComponent = (Icons as any)[name];
    if (!IconComponent) return null;
    return <IconComponent size={size} className={className} />;
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-8 space-y-12 pb-24">
      <div className="text-center space-y-4">
        <motion.div
           initial={{ opacity: 0, scale: 0.9 }}
           animate={{ opacity: 1, scale: 1 }}
           className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#00A859]/10 text-[#00A859] text-sm font-bold uppercase tracking-wider mb-2"
        >
          Central de Ajuda
        </motion.div>
        <h1 className="text-3xl md:text-5xl font-extrabold text-[#1A1A1A] tracking-tight">
          Como usar o <span className="text-[#00A859]">EduTecProfessor</span>
        </h1>
        <p className="text-gray-500 max-w-2xl mx-auto text-lg">
          Tudo o que você precisa saber para transformar sua gestão pedagógica e ganhar mais tempo livre.
        </p>
      </div>

      <div className="grid gap-8">
        {sections.map((section, idx) => (
          <motion.section
            key={section.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className="bg-white rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 hover:shadow-md transition-all group"
          >
            <div className="flex items-center gap-5 mb-8">
              <div className="p-4 bg-[#00A859]/10 rounded-2xl text-[#00A859] group-hover:bg-[#00A859] group-hover:text-white transition-colors">
                {renderIcon(section.icon, 28)}
              </div>
              <h2 className="text-2xl md:text-3xl font-bold text-gray-800 tracking-tight">{section.title}</h2>
            </div>

            {section.content && (
              <div className="relative p-6 bg-gray-50 rounded-2xl border-l-4 border-[#00A859]">
                 <p className="text-gray-600 leading-relaxed text-lg italic">
                  "{section.content}"
                </p>
              </div>
            )}

            {section.items && (
              <div className="grid sm:grid-cols-2 gap-4">
                {section.items.map((item, i) => (
                  <button 
                    key={i} 
                    onClick={() => onNavigate && onNavigate(item.id)}
                    className="flex text-left w-full gap-4 p-5 rounded-2xl bg-[#F9FAFB] border border-gray-100 hover:border-[#00A859] hover:bg-white hover:shadow-lg hover:shadow-[#00A859]/5 transition-all group/item"
                  >
                    <div className="text-[#00A859] shrink-0 group-hover/item:scale-110 transition-transform">
                      {renderIcon(item.icon, 22)}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-800 mb-1 flex items-center gap-2">
                        {item.label}
                        <Icons.ArrowRight size={14} className="opacity-0 group-hover/item:opacity-100 -translate-x-2 group-hover/item:translate-x-0 transition-all text-[#00A859]" />
                      </h3>
                      <p className="text-sm text-gray-500 leading-snug">{item.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {section.list && (
              <div className="grid gap-3">
                {section.list.map((tip, i) => (
                  <div key={i} className="flex gap-4 items-start p-4 rounded-xl bg-green-50/30 border border-green-100/50">
                    <div className="w-6 h-6 rounded-full bg-[#00A859] flex items-center justify-center text-white text-[10px] font-bold shrink-0 mt-0.5">
                      {i + 1}
                    </div>
                    <span className="text-gray-700 font-medium">{tip}</span>
                  </div>
                ))}
              </div>
            )}

            {section.faqs && (
              <div className="grid gap-4">
                {section.faqs.map((faq, i) => (
                  <div key={i} className="p-5 border border-gray-100 rounded-2xl hover:bg-gray-50 transition-all">
                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                       <span className="w-2 h-2 rounded-full bg-[#00A859]" />
                       {faq.q}
                    </h3>
                    <p className="text-gray-600 text-sm leading-relaxed pl-4 border-l-2 border-gray-100 ml-1">{faq.a}</p>
                  </div>
                ))}
              </div>
            )}
          </motion.section>
        ))}
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-gradient-to-br from-[#00A859] to-[#008F4C] rounded-[2.5rem] p-10 md:p-16 text-center text-white space-y-8 shadow-2xl shadow-[#00A859]/30 relative overflow-hidden"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-black/10 rounded-full -ml-32 -mb-32 blur-3xl" />
        
        <div className="relative z-10 space-y-4">
            <h2 className="text-3xl md:text-4xl font-black">Ainda precisa de suporte?</h2>
            <p className="text-white/80 max-w-lg mx-auto text-lg font-medium">
              Nossa equipe técnica e pedagógica está pronta para te atender. Envie um e-mail para darmos todo o suporte necessário.
            </p>
        </div>
        
        <div className="relative z-10">
            <a
            href="mailto:edutecprof1@gmail.com"
            className="inline-flex items-center gap-3 px-10 py-5 bg-white text-[#00A859] font-black rounded-2xl hover:bg-gray-50 transition-all shadow-xl hover:scale-105 active:scale-95 group"
            >
            {renderIcon('Mail', 24, "group-hover:rotate-12 transition-transform")}
            Suporte por E-mail
            </a>
            <p className="mt-6 text-white/50 text-xs font-bold uppercase tracking-widest">Atendimento de Segunda a Sexta: 08h às 18h</p>
        </div>
      </motion.div>
    </div>
  );
}

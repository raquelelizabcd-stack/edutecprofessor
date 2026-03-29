import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';
import { supabase } from '../lib/supabase';

// ─── Tipos ──────────────────────────────────────────────────────────────────────

interface QuickButton {
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
  action: () => void;
}

interface Message {
  id: string;
  type: 'text' | 'buttons' | 'context-tips';
  text?: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestions?: any[];
  buttons?: QuickButton[][];
}

interface EduBotProps {
  onInsertCode: (code: string) => void;
  onNavigate: (tabId: string) => void;
  onStartTour: () => void;
  isOpen: boolean;
  onClose: () => void;
  activeTab?: string;
  robotName?: string;
}

// ─── Base de Conhecimento e Mapeamentos ──────────────────────────────────────────

const KNOWLEDGE_BASE = [
  {
    category: 'Planejamento',
    keywords: ['planejamento', 'aula', 'bncc', 'semanal', 'mensal', 'diário', 'plano'],
    response: 'Você pode criar planejamentos Diários, Semanais e Mensais na seção "Registros Pedagógicos". O sistema integra códigos BNCC oficiais automaticamente.',
    tabId: 'planejamento-semanal'
  },
  {
    category: 'Relatórios',
    keywords: ['relatório', 'individual', 'descritivo', 'avaliação', 'aluno'],
    response: 'O módulo de Relatório Individual permite gerar avaliações completas. Use os dados salvos durante o ano para facilitar o preenchimento.',
    tabId: 'relatorio-individual'
  },
  {
    category: 'Presença',
    keywords: ['presença', 'falta', 'frequência', 'chamada'],
    response: 'No módulo de Presença, você pode marcar a frequência diária da turma com um clique e visualizar o histórico de faltas.',
    tabId: 'presenca'
  },
  {
    category: 'Portfólio',
    keywords: ['portfólio', 'fotos', 'evidências', 'fotos', 'registro'],
    response: 'O Portfólio Digital serve para documentar a jornada do aluno com fotos e observações. É ideal para compartilhar com as famílias.',
    tabId: 'portfolio'
  },
  {
    category: 'Configurações',
    keywords: ['configuração', 'perfil', 'senha', 'dados', 'editar'],
    response: 'Você pode editar seu perfil e senha clicando no seu nome no topo direito e acessando "Configurações da Conta".',
    action: 'open-settings'
  },
  {
    category: 'Assinatura/Teste',
    keywords: ['assinatura', 'plano', 'pro', 'grátis', 'pagamento', 'teste'],
    response: 'Oferecemos o Plano Pro Platinum por R$29,90/mês. Novos usuários ganham 7 dias de teste grátis com todos os recursos liberados.',
    tabId: 'dashboard-evolucao'
  },
  {
    category: 'Dashboard',
    keywords: ['dashboard', 'evolução', 'visão', 'gráfico', 'progresso'],
    response: 'O Dashboard de Evolução centraliza o progresso da turma, mostrando métricas pedagógicas e alertas importantes.',
    tabId: 'dashboard-evolucao'
  },
  {
    category: 'Diário de Reflexões',
    keywords: ['reflexão', 'diário', 'autoavaliação', 'professor'],
    response: 'O Diário de Reflexões é seu espaço pessoal para registrar desafios, conquistas e planejar melhorias em sua prática.',
    tabId: 'reflexoes'
  },
  {
    category: 'Gestão de Alunos',
    keywords: ['alunos', 'turma', 'cadastrar', 'estudante', 'perfil aluno'],
    response: 'Na aba "Alunos", você gerencia sua lista de estudantes, edita perfis e acessa o histórico individual de cada um.',
    tabId: 'alunos'
  },
  {
    category: 'Suporte',
    keywords: ['suporte', 'ajuda', 'contato', 'email', 'e-mail', 'problema'],
    response: 'Para suporte direto, acesse a aba "Ajuda" ou envie um e-mail para edutecprof1@gmail.com. Nossa equipe está pronta para te atender.',
    tabId: 'ajuda'
  }
];

const SCREEN_TIPS: Record<string, { title: string; tips: string[] }> = {
  'dashboard-evolucao': {
    title: 'Dicas do Dashboard',
    tips: [
      'Acompanhe o gráfico de evolução de notas e competências da turma.',
      'Fique atento aos alertas de alunos com baixo desempenho.',
      'Acesse atalhos rápidos para as funções mais usadas no centro da tela.'
    ]
  },
  'planejamento-semanal': {
    title: 'Dicas de Planejamento',
    tips: [
      'Selecione os códigos BNCC clicando no botão "Consultar BNCC" no assistente.',
      'Você pode duplicar planos anteriores para economizar tempo.',
      'Os planos são salvos automaticamente ao clicar em Salvar Registro.'
    ]
  },
  'relatorio-individual': {
    title: 'Dicas de Relatórios',
    tips: [
      'Use os filtros para encontrar alunos específicos rapidamente.',
      'Relatórios baseados na BNCC facilitam a conformidade com o MEC.',
      'Exporte o relatório completo em PDF para entregar aos pais.'
    ]
  }
};

const EI_FAIXAS = [
  { id: 'EI01', label: 'EI01', sublabel: 'Bebês (0 a 1a 6m)', search: 'Bebês (0 a 1 ano e 6 meses)' },
  { id: 'EI02', label: 'EI02', sublabel: 'Crianças bem pequenas', search: 'Crianças bem pequenas (1 ano e 7 meses a 3 anos e 11 meses)' },
  { id: 'EI03', label: 'EI03', sublabel: 'Crianças pequenas', search: 'Crianças pequenas (4 anos a 5 anos e 11 meses)' },
];

const EF_ANOS = [
  { label: '1º Ano', value: '1º Ano' },
  { label: '2º Ano', value: '2º Ano' },
  { label: '3º Ano', value: '3º Ano' },
  { label: '4º Ano', value: '4º Ano' },
  { label: '5º Ano', value: '5º Ano' },
];

const EF_COMPONENTES_MAP: Record<string, { label: string; code: string }[]> = {
  '1º Ano': [{ label: 'Língua Portuguesa', code: 'LP' }, { label: 'Matemática', code: 'MA' }],
  '2º Ano': [{ label: 'Língua Portuguesa', code: 'LP' }, { label: 'Matemática', code: 'MA' }],
  '3º Ano': [{ label: 'Língua Portuguesa', code: 'LP' }, { label: 'Matemática', code: 'MA' }],
  '4º Ano': [{ label: 'Língua Portuguesa', code: 'LP' }, { label: 'Matemática', code: 'MA' }, { label: 'Ciências', code: 'CI' }],
  '5º Ano': [{ label: 'História', code: 'HI' }],
};

const CAMPO_EXPERIENCIA_LABELS: Record<string, string> = {
  EO: 'O Eu, o Outro e o Nós', CG: 'Corpo, Gestos e Momentos', TS: 'Traços, Sons, Cores e Formas',
  EF: 'Escuta, Fala, Pensamento e Imaginação', ET: 'Espaços, Tempos, Quantidades e Transformações',
  LP: 'Língua Portuguesa', MA: 'Matemática', CI: 'Ciências', HI: 'História', GE: 'Geografia',
  ER: 'Ensino Religioso', AR: 'Artes', ED: 'Educação Física',
};

// ─── Componente Principal ────────────────────────────────────────────────────────

export default function EduBot({ onInsertCode, onNavigate, onStartTour, isOpen, onClose, activeTab = 'dashboard-evolucao', robotName = 'EduBot' }: EduBotProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messages.length === 0) {
      showWelcome();
    }
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // Se o robô for aberto via ícone de ajuda "?", mostrar contexto da tela
  useEffect(() => {
    if (isOpen && messages.length > 0) {
       // Se o ícone "?" foi usado, mostramos dicas específicas
       // (Podemos detectar isso se não houver mensagens recentes ou gatilho específico)
    }
  }, [isOpen]);

  const showWelcome = () => {
    setMessages([
      {
        id: 'welcome',
        type: 'text',
        text: `👋 Olá, Professor(a)! Sou o **${robotName}**, seu Consultor de Apoio Pedagógico.\n\nComo posso ajudar hoje? Escolha uma categoria abaixo ou digite sua dúvida.`,
        sender: 'bot',
        timestamp: new Date(),
      },
      {
        id: 'main-menu',
        type: 'buttons',
        sender: 'bot',
        timestamp: new Date(),
        buttons: [
          [
            { label: '📋 Consultar BNCC', sublabel: 'Auxílio em planos', action: showBnccMenu },
            { label: '💡 Dicas da Tela', sublabel: 'Explicando esta página', action: showContextTips },
          ],
          [
             { label: '🚀 Iniciar Tour', sublabel: 'Guia visual completo', action: onStartTour },
             { label: '⚙️ Configurações', action: () => handleKnowledgeResult(KNOWLEDGE_BASE[4]) },
          ]
        ],
      },
    ]);
  };

  const showBnccMenu = () => {
    addMessage({ type: 'text', text: '📋 Consultar BNCC', sender: 'user' });
    addMessage({
      type: 'buttons',
      text: 'Selecione a etapa de ensino:',
      sender: 'bot',
      buttons: [
        [
          { label: '🍼 Infantil', action: () => handleEtapaSelection('EI') },
          { label: '📚 Fundamental', action: () => handleEtapaSelection('EF') },
        ],
      ],
    });
  };

  const showContextTips = () => {
    const tips = SCREEN_TIPS[activeTab];
    addMessage({ type: 'text', text: '💡 Dicas da Tela', sender: 'user' });
    if (tips) {
      addMessage({
        type: 'text',
        text: `### ${tips.title}\n\n${tips.tips.map(t => `- ${t}`).join('\n')}`,
        sender: 'bot',
      });
    } else {
      addMessage({
        type: 'text',
        text: 'Não tenho dicas específicas para esta tela no momento, mas posso te ajudar com as funções gerais!',
        sender: 'bot',
      });
    }
  };

  const handleEtapaSelection = (etapa: 'EI' | 'EF') => {
    addMessage({ type: 'text', text: etapa === 'EI' ? '🍼 Educação Infantil' : '📚 Ensino Fundamental', sender: 'user' });
    if (etapa === 'EI') {
      addMessage({
        type: 'buttons',
        text: 'Selecione a **faixa etária**:',
        sender: 'bot',
        buttons: [EI_FAIXAS.map(f => ({ label: f.label, sublabel: f.sublabel, action: () => fetchBNCCData({ etapa: 'EI', search: f.search, label: f.label }) }))],
      });
    } else {
      addMessage({
        type: 'buttons',
        text: 'Selecione o **ano escolar**:',
        sender: 'bot',
        buttons: [
          EF_ANOS.slice(0, 3).map(a => ({ label: a.label, action: () => handleEFYearSelection(a.value) })),
          EF_ANOS.slice(3).map(a => ({ label: a.label, action: () => handleEFYearSelection(a.value) })),
        ],
      });
    }
  };

  const handleEFYearSelection = (year: string) => {
    addMessage({ type: 'text', text: `📅 ${year}`, sender: 'user' });
    const components = EF_COMPONENTES_MAP[year] || [];
    addMessage({
      type: 'buttons',
      text: `Entendido. Para o **${year}**, qual componente curricular deseja consultar?`,
      sender: 'bot',
      buttons: [components.map(c => ({ label: c.label, action: () => fetchBNCCData({ etapa: 'EF', year, component: c.code, label: `${c.label} (${year})` }) }))],
    });
  };

  const fetchBNCCData = async (filter: any) => {
    addMessage({ type: 'text', text: `Consultar: ${filter.label}`, sender: 'user' });
    setIsTyping(true);
    try {
      let query = supabase.from('bncc_codes').select('*');
      if (filter.etapa === 'EI') {
        query = query.eq('etapa', 'EI').ilike('faixa_etaria', `%${filter.search?.substring(0, 15)}%`);
      } else {
        query = query.eq('etapa', 'EF').eq('faixa_etaria', filter.year).eq('campo_experiencia', filter.component);
      }
      const { data, error } = await query.order('codigo', { ascending: true });
      if (error) throw error;

      let text = `### 📋 BNCC - ${filter.label}\n\nObjetivos encontrados:\n\n`;
      if (data && data.length > 0) {
        data.forEach(item => {
          text += `- **${item.codigo}**: ${item.objetivo_aprendizagem || item.descricao}\n`;
        });
      } else {
        text += "_Nenhum objetivo encontrado._";
      }
      addMessage({ type: 'text', text, sender: 'bot', suggestions: data || [] });
    } catch (err) {
      addMessage({ type: 'text', text: '⚠️ Erro ao consultar banco de dados.', sender: 'bot' });
    } finally {
      setIsTyping(false);
    }
  };

  const handleManualSend = async () => {
    if (!input.trim()) return;
    const q = input.trim().toLowerCase();
    addMessage({ type: 'text', text: input, sender: 'user' });
    setInput('');

    // Busca na base de conhecimento local
    const found = KNOWLEDGE_BASE.find(k => k.keywords.some(word => q.includes(word)));
    if (found) {
      handleKnowledgeResult(found);
    } else {
      // Busca no banco BNCC se não achar na conversa geral
      handleSearchBNCC(q);
    }
  };

  const handleKnowledgeResult = (item: any) => {
    setIsTyping(true);
    setTimeout(() => {
      addMessage({
        id: Math.random().toString(),
        type: 'text',
        text: item.response,
        sender: 'bot',
        timestamp: new Date(),
      });
      if (item.tabId) {
        addMessage({
          type: 'buttons',
          text: `Deseja ir para esta tela agora?`,
          sender: 'bot',
          buttons: [[{ label: `Ir para ${item.category}`, action: () => { onNavigate(item.tabId); onClose(); } }]]
        });
      }
      setIsTyping(false);
    }, 500);
  };

  const handleSearchBNCC = async (q: string) => {
    setIsTyping(true);
    try {
      const { data, error } = await supabase.from('bncc_codes').select('*').or(`codigo.ilike.%${q}%,objetivo_aprendizagem.ilike.%${q}%,descricao.ilike.%${q}%`).limit(10);
      if (error) throw error;
      let text = data && data.length > 0 ? `Encontrei alguns códigos BNCC relacionados:\n\n` : 'Não entendi sua dúvida ou o termo não está no banco. Tente palavras como "relatório", "planejamento" ou códigos como "EI02".';
      if (data) data.forEach(item => text += `- **${item.codigo}**: ${item.objetivo_aprendizagem || item.descricao}\n`);
      addMessage({ type: 'text', text, sender: 'bot', suggestions: data || [] });
    } catch (err) {
      addMessage({ type: 'text', text: '⚠️ Erro na busca.', sender: 'bot' });
    } finally {
      setIsTyping(false);
    }
  };

  const addMessage = (msg: Partial<Message>) => {
    setMessages(prev => [...prev, { id: Math.random().toString(36).substring(7), timestamp: new Date(), type: 'text', sender: 'bot', ...msg } as Message]);
  };

  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) return <h4 key={i} className="text-[#00A859] font-black text-sm mb-2 mt-1 uppercase">{line.replace('### ', '')}</h4>;
      if (line.startsWith('- **')) {
        const parts = line.replace('- **', '').split('**: ');
        return <p key={i} className="text-[11px] leading-relaxed mb-2 pl-2 border-l-2 border-[#00A859]/20 ml-1"><span className="font-black text-[#00A859] mr-1">{parts[0]}</span><span className="text-slate-600">{parts[1]}</span></p>;
      }
      const boldParts = line.split(/\*\*(.*?)\*\*/g);
      return <p key={i} className="text-xs leading-relaxed mb-1 text-slate-700">{boldParts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-slate-900">{p}</strong> : p)}</p>;
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-2xl z-[9999] border-l border-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-[#00A859] to-[#008F4C] text-white flex items-center justify-between shadow-xl">
             <div className="flex items-center gap-4">
               <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center border border-white/30 shadow-inner">
                 <Icons.Bot size={28} className="text-white animate-pulse" />
               </div>
               <div>
                 <h2 className="font-black text-lg">{robotName}</h2>
                 <p className="text-[9px] font-bold text-white/70 uppercase tracking-widest mt-0.5">Assistente Inteligente</p>
               </div>
             </div>
             <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-all"><Icons.X size={24} /></button>
          </div>

          {/* Chat Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC]">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex flex-col gap-2", msg.sender === 'user' ? "items-end ml-12" : "items-start mr-4")}>
                {msg.text && (
                  <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                    className={cn("p-4 rounded-3xl shadow-sm max-w-full", msg.sender === 'user' ? "bg-[#00A859] text-white rounded-tr-none" : "bg-white text-slate-700 border border-slate-200 rounded-tl-none")}>
                    {msg.sender === 'user' ? <span className="text-sm">{msg.text}</span> : formatText(msg.text)}
                  </motion.div>
                )}
                {msg.type === 'buttons' && msg.buttons && (
                  <div className="w-full space-y-3 mt-1">
                    {msg.buttons.map((row, rIdx) => (
                      <div key={rIdx} className="flex flex-wrap gap-2">
                        {row.map((btn, bIdx) => (
                          <button key={bIdx} onClick={btn.action} className="flex-1 min-w-[140px] bg-white border-2 border-slate-100 hover:border-[#00A859] p-3 rounded-[20px] shadow-sm text-left group transition-all">
                             <div className="text-xs font-black text-slate-800 group-hover:text-[#00A859]">{btn.label}</div>
                             {btn.sublabel && <p className="text-[10px] text-slate-400 font-medium leading-tight">{btn.sublabel}</p>}
                          </button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}
                {msg.suggestions && msg.suggestions.length > 0 && (
                   <div className="w-full mt-2 grid gap-2 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
                     {msg.suggestions.map((item, idx) => (
                       <div key={idx} className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm flex flex-col gap-2">
                          <span className="px-2 py-0.5 bg-[#00A859]/10 text-[#00A859] text-[10px] font-bold rounded-lg w-fit">{item.codigo}</span>
                          <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">{item.objetivo_aprendizagem || item.descricao}</p>
                          <button onClick={() => onInsertCode(item.codigo)} className="bg-slate-100 p-2 rounded-xl text-[10px] font-black hover:bg-slate-200 transition-all">Inserir código</button>
                       </div>
                     ))}
                   </div>
                )}
              </div>
            ))}
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="px-6 py-3 bg-white border-t flex gap-2 overflow-x-auto no-scrollbar">
             <button onClick={showWelcome} className="shrink-0 p-2 px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-[#00A859] text-[10px] font-bold"><Icons.RotateCcw size={14} /></button>
             {KNOWLEDGE_BASE.slice(0, 5).map(k => (
               <button key={k.category} onClick={() => handleKnowledgeResult(k)} className="shrink-0 bg-slate-50 p-2 px-3 rounded-xl text-[10px] font-bold hover:bg-emerald-50 hover:text-[#00A859] transition-all">{k.category}</button>
             ))}
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t">
             <div className="relative flex items-center">
                <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && handleManualSend()}
                  placeholder="Pergunte qualquer coisa... ex: como fazer o plano?" className="w-full bg-slate-50 border-2 border-transparent focus:border-[#008F4C]/20 focus:bg-white rounded-[24px] pl-6 pr-14 py-4 text-sm font-medium outline-none transition-all placeholder:text-slate-300" />
                <button onClick={handleManualSend} disabled={!input.trim()} className="absolute right-2 p-3 bg-[#00A859] text-white rounded-full shadow-lg hover:scale-105 transition-all disabled:opacity-30"><Icons.Send size={20} /></button>
             </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

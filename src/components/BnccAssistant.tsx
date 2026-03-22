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
  type: 'text' | 'buttons';
  text?: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  suggestions?: any[];
  buttons?: QuickButton[][]; // Matriz de botões (linhas e colunas)
}

interface BnccAssistantProps {
  onInsertCode: (code: string) => void;
  isOpen: boolean;
  onClose: () => void;
  robotName?: string;
}

// ─── Mapeamentos e Constantes ───────────────────────────────────────────────────

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
  '1º Ano': [
    { label: 'Língua Portuguesa', code: 'LP' },
    { label: 'Matemática', code: 'MA' },
  ],
  '2º Ano': [
    { label: 'Língua Portuguesa', code: 'LP' },
    { label: 'Matemática', code: 'MA' },
  ],
  '3º Ano': [
    { label: 'Língua Portuguesa', code: 'LP' },
    { label: 'Matemática', code: 'MA' },
  ],
  '4º Ano': [
    { label: 'Língua Portuguesa', code: 'LP' },
    { label: 'Matemática', code: 'MA' },
    { label: 'Ciências', code: 'CI' },
  ],
  '5º Ano': [
    { label: 'História', code: 'HI' },
  ],
};

const CAMPO_EXPERIENCIA_LABELS: Record<string, string> = {
  EO: 'O Eu, o Outro e o Nós',
  CG: 'Corpo, Gestos e Momentos',
  TS: 'Traços, Sons, Cores e Formas',
  EF: 'Escuta, Fala, Pensamento e Imaginação',
  ET: 'Espaços, Tempos, Quantidades e Transformações',
  LP: 'Língua Portuguesa',
  MA: 'Matemática',
  CI: 'Ciências',
  HI: 'História',
  GE: 'Geografia',
  ER: 'Ensino Religioso',
  AR: 'Artes',
  ED: 'Educação Física',
};

// ─── Componente Principal ────────────────────────────────────────────────────────

export default function BnccAssistant({ onInsertCode, isOpen, onClose, robotName = 'EduBot' }: BnccAssistantProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Inicializa o chat
  useEffect(() => {
    if (messages.length === 0) {
      showWelcome();
    }
  }, []);

  // Scroll automático
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  // ─── Fluxos de Conversa ───────────────────────────────────────────────────────

  const showWelcome = () => {
    setMessages([
      {
        id: 'welcome',
        type: 'text',
        text: `👋 Olá, Professor(a)! Sou o **${robotName}**, seu Consultor de Planejamento.\n\nComo posso ajudar hoje? Escolha uma opção ou digite sua dúvida.`,
        sender: 'bot',
        timestamp: new Date(),
      },
      {
        id: 'start-layer',
        type: 'buttons',
        sender: 'bot',
        timestamp: new Date(),
        buttons: [
          [
            {
              label: '🍼 Educação Infantil',
              sublabel: 'BNCC Etapa Inicial',
              action: () => handleStartSelection('EI'),
            },
            {
              label: '📚 Ensino Fundamental',
              sublabel: 'Anos Iniciais',
              action: () => handleStartSelection('EF'),
            },
          ],
        ],
      },
    ]);
  };

  const handleStartSelection = (etapa: 'EI' | 'EF') => {
    addMessage({
      type: 'text',
      text: etapa === 'EI' ? '🍼 Educação Infantil' : '📚 Ensino Fundamental',
      sender: 'user',
    });

    if (etapa === 'EI') {
      addMessage({
        type: 'buttons',
        text: 'Ótimo! Selecione a **faixa etária**:',
        sender: 'bot',
        buttons: [
          EI_FAIXAS.map(f => ({
            label: f.label,
            sublabel: f.sublabel,
            action: () => fetchBNCCData({ etapa: 'EI', search: f.search, label: f.label }),
          })),
        ],
      });
    } else {
      addMessage({
        type: 'buttons',
        text: 'Selecione o **ano escolar**:',
        sender: 'bot',
        buttons: [
          EF_ANOS.slice(0, 3).map(a => ({
            label: a.label,
            action: () => handleEFYearSelection(a.value),
          })),
          EF_ANOS.slice(3).map(a => ({
            label: a.label,
            action: () => handleEFYearSelection(a.value),
          })),
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
      buttons: [
        components.map(c => ({
          label: c.label,
          action: () => fetchBNCCData({ etapa: 'EF', year, component: c.code, label: `${c.label} (${year})` }),
        })),
      ],
    });
  };

  const fetchBNCCData = async (filter: { etapa: string; search?: string; year?: string; component?: string; label: string }) => {
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

      let responseText = `### 📋 BNCC - ${filter.label}\n\n`;
      responseText += `Aqui estão os objetivos de aprendizagem para **${filter.label}**:\n\n`;

      if (data && data.length > 0) {
        let currentSubGroup = "";
        data.forEach(item => {
           // No EF agrupamos por componente se vier mais de um, no EI por campo
           const groupHeader = item.etapa === 'EI' ? item.campo_experiencia : item.faixa_etaria;
           if (groupHeader !== currentSubGroup && item.etapa === 'EI') {
             currentSubGroup = groupHeader;
             const label = CAMPO_EXPERIENCIA_LABELS[groupHeader] || groupHeader;
             responseText += `\n**${groupHeader} – ${label}**\n`;
           }
           responseText += `- **${item.codigo}**: ${item.objetivo_aprendizagem || item.descricao}\n`;
        });
      } else {
        responseText += "_Nenhum objetivo encontrado para esta seleção._";
      }

      addMessage({
        type: 'text',
        text: responseText,
        sender: 'bot',
        suggestions: data || [],
      });
    } catch (err) {
      console.error(err);
      addMessage({ type: 'text', text: '⚠️ Erro ao consultar o banco de dados. Tente novamente.', sender: 'bot' });
    } finally {
      setIsTyping(false);
    }
  };

  // ─── Busca Manual ─────────────────────────────────────────────────────────────

  const handleManualSend = async () => {
    if (!input.trim()) return;
    const q = input.trim();
    addMessage({ type: 'text', text: q, sender: 'user' });
    setInput('');
    setIsTyping(true);

    try {
      const { data, error } = await supabase
        .from('bncc_codes')
        .select('*')
        .or(`codigo.ilike.%${q}%,objetivo_aprendizagem.ilike.%${q}%,descricao.ilike.%${q}%`)
        .order('codigo', { ascending: true })
        .limit(20);

      if (error) throw error;

      let text = '';
      if (data && data.length > 0) {
        text = `Encontrei ${data.length} resultados para sua busca:\n\n`;
        data.forEach(item => {
          text += `- **${item.codigo}**: ${item.objetivo_aprendizagem || item.descricao}\n`;
        });
      } else {
        text = '❌ Não encontrei resultados específicos para esse termo.\n\nTente usar os botões de atalho ou termos como "EI02", "Português 1º ano" ou "Artes".';
      }

      addMessage({
        type: 'text',
        text: text,
        sender: 'bot',
        suggestions: data || [],
      });
    } catch (err) {
      console.error(err);
      addMessage({ type: 'text', text: '⚠️ Erro na busca.', sender: 'bot' });
    } finally {
      setIsTyping(false);
    }
  };

  const addMessage = (msg: Partial<Message>) => {
    setMessages(prev => [...prev, {
      id: Math.random().toString(36).substring(7),
      timestamp: new Date(),
      type: 'text',
      sender: 'bot',
      ...msg,
    } as Message]);
  };

  // ─── Render Helpers ───────────────────────────────────────────────────────────

  const formatText = (text: string) => {
    return text.split('\n').map((line, i) => {
      if (line.startsWith('### ')) {
        return <h4 key={i} className="text-[#00A859] font-black text-sm mb-2 mt-1 uppercase tracking-wider">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('**') && line.endsWith('**') && !line.includes(':')) {
        return <p key={i} className="text-slate-800 font-black text-[10px] uppercase tracking-widest mt-4 mb-1 border-b border-slate-100 pb-1">{line.replace(/\*\*/g, '')}</p>;
      }
      if (line.startsWith('- **')) {
        const parts = line.replace('- **', '').split('**: ');
        return (
          <p key={i} className="text-[11px] leading-relaxed mb-2 pl-2 border-l-2 border-[#00A859]/20 ml-1">
            <span className="font-black text-[#00A859] mr-1">{parts[0]}</span>
            <span className="text-slate-600">{parts[1]}</span>
          </p>
        );
      }
      if (line.trim() === '') return <div key={i} className="h-2" />;
      
      const boldParts = line.split(/\*\*(.*?)\*\*/g);
      return (
        <p key={i} className="text-xs leading-relaxed mb-1 text-slate-700">
          {boldParts.map((p, j) => j % 2 === 1 ? <strong key={j} className="font-bold text-slate-900">{p}</strong> : p)}
        </p>
      );
    });
  };

  // ─── Render Interface ─────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ x: '100%', opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: '100%', opacity: 0 }}
          transition={{ type: 'spring', damping: 25, stiffness: 200 }}
          className="fixed inset-y-0 right-0 w-full max-w-md bg-white shadow-[0_0_50px_rgba(0,0,0,0.1)] z-[100] border-l border-slate-100 flex flex-col"
        >
          {/* Header */}
          <div className="p-6 bg-gradient-to-br from-[#00A859] to-[#008F4C] text-white flex items-center justify-between shadow-xl relative overflow-hidden">
             <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-3xl" />
             <div className="flex items-center gap-4 relative z-10">
               <div className="w-12 h-12 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center border border-white/30 shadow-inner">
                 <Icons.Bot size={28} className="text-white animate-pulse" />
               </div>
               <div>
                 <h2 className="font-black text-lg tracking-tight leading-tight">{robotName}</h2>
                 <p className="text-[9px] font-bold text-white/80 uppercase tracking-[0.2em] mt-0.5">Consultoria Inteligente EduTecProfessor</p>
               </div>
             </div>
             <button onClick={onClose} className="p-2.5 hover:bg-white/20 rounded-xl transition-all relative z-10 group">
               <Icons.X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
             </button>
          </div>

          {/* Chat Area */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-6 bg-[#F8FAFC] scroll-smooth">
            {messages.map((msg) => (
              <div key={msg.id} className={cn("flex flex-col gap-2", msg.sender === 'user' ? "items-end ml-12" : "items-start mr-4")}>
                {msg.text && (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className={cn(
                      "p-4 rounded-3xl shadow-sm max-w-full",
                      msg.sender === 'user' 
                        ? "bg-[#00A859] text-white rounded-tr-none font-medium" 
                        : "bg-white text-slate-700 border border-slate-200 rounded-tl-none"
                    )}
                  >
                    {msg.sender === 'user' ? <span className="text-sm">{msg.text}</span> : formatText(msg.text)}
                  </motion.div>
                )}

                {/* Layered Buttons */}
                {msg.type === 'buttons' && msg.buttons && (
                  <div className="w-full space-y-3 mt-1">
                    {msg.buttons.map((row, rIdx) => (
                      <div key={rIdx} className="flex flex-wrap gap-2">
                        {row.map((btn, bIdx) => (
                          <motion.button
                            key={bIdx}
                            whileHover={{ y: -2, scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={btn.action}
                            className="flex-1 min-w-[140px] bg-white border-2 border-slate-100 hover:border-[#00A859] p-3.5 rounded-[20px] shadow-sm hover:shadow-md transition-all text-left group"
                          >
                            <div className="flex items-center gap-2 mb-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-[#00A859]" />
                               <span className="text-xs font-black text-slate-800 group-hover:text-[#00A859]">{btn.label}</span>
                            </div>
                            {btn.sublabel && <p className="text-[10px] text-slate-400 font-medium leading-tight">{btn.sublabel}</p>}
                          </motion.button>
                        ))}
                      </div>
                    ))}
                  </div>
                )}

                {/* Result Suggestions (Insert Card) */}
                {msg.suggestions && msg.suggestions.length > 0 && (
                   <div className="w-full mt-2 space-y-2">
                     <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-3">
                       <Icons.ChevronDown size={12} /> Sugestões para inclusão rápida:
                     </p>
                     <div className="grid gap-2 overflow-y-auto max-h-[300px] pr-2 pb-2 custom-scrollbar">
                       {msg.suggestions.map((item, idx) => (
                         <div key={idx} className="bg-white border border-slate-100 p-3 rounded-2xl shadow-sm hover:border-[#00A859]/30 transition-all flex flex-col gap-3">
                            <div className="flex items-center justify-between gap-2 border-b border-slate-50 pb-2">
                               <span className="px-2 py-0.5 bg-[#00A859]/10 text-[#00A859] text-[10px] font-bold rounded-lg">{item.codigo}</span>
                               <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter truncate max-w-[150px]">
                                 {item.campo_experiencia || item.faixa_etaria}
                               </span>
                            </div>
                            <p className="text-[11px] text-slate-600 line-clamp-3 leading-relaxed">
                               {item.objetivo_aprendizagem || item.descricao}
                            </p>
                            <div className="flex gap-2">
                               <a 
                                 href="/docs/BNCC_EI_EF_110518_versaofinal_site.pdf"
                                 target="_blank"
                                 className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 py-2 rounded-xl text-[10px] font-black flex items-center justify-center gap-2 transition-all"
                               >
                                 <Icons.FileText size={14} /> PDF
                               </a>
                            </div>
                         </div>
                       ))}
                     </div>
                   </div>
                )}
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2 text-[#00A859] p-2 ml-2">
                 <div className="flex gap-1">
                   <div className="w-1.5 h-1.5 bg-[#00A859] rounded-full animate-bounce" />
                   <div className="w-1.5 h-1.5 bg-[#00A859] rounded-full animate-bounce [animation-delay:0.2s]" />
                   <div className="w-1.5 h-1.5 bg-[#00A859] rounded-full animate-bounce [animation-delay:0.4s]" />
                 </div>
                 <span className="text-[10px] font-bold uppercase tracking-widest opacity-50">Consultando BNCC...</span>
              </div>
            )}
          </div>

          {/* Quick Shortcuts Bar */}
          <div className="px-6 py-3 bg-white border-t border-slate-50 flex gap-2">
             <button 
               onClick={showWelcome}
               className="p-2 px-3 rounded-xl border border-slate-200 text-slate-400 hover:text-[#00A859] hover:border-[#00A859] transition-all flex items-center gap-2 text-[10px] font-bold uppercase"
             >
               <Icons.RotateCcw size={14} /> Reiniciar
             </button>
             <button 
               onClick={() => handleStartSelection('EI')}
               className="flex-1 bg-emerald-50 text-emerald-600 border border-emerald-100 p-2 rounded-xl text-[10px] font-black uppercase hover:bg-emerald-100 transition-all flex items-center justify-center gap-2"
             >
                🍼 Infantil
             </button>
             <button 
               onClick={() => handleStartSelection('EF')}
               className="flex-1 bg-blue-50 text-blue-600 border border-blue-100 p-2 rounded-xl text-[10px] font-black uppercase hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
             >
                📚 Fundamental
             </button>
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white border-t border-slate-100">
             <div className="relative flex items-center">
                <input 
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleManualSend()}
                  placeholder="Ou pesquise aqui... ex: Português 1º ano"
                  className="w-full bg-slate-50 border-2 border-transparent focus:border-[#00A859]/20 focus:bg-white rounded-[24px] pl-6 pr-14 py-4 text-sm font-medium outline-none transition-all placeholder:text-slate-300"
                />
                <button 
                   onClick={handleManualSend}
                   disabled={!input.trim()}
                   className="absolute right-2 p-3 bg-[#00A859] text-white rounded-full shadow-lg hover:scale-105 active:scale-95 transition-all disabled:opacity-30 disabled:grayscale"
                >
                   <Icons.Send size={20} />
                </button>
             </div>
             <p className="text-center text-[9px] font-bold text-slate-300 uppercase tracking-widest mt-4 flex items-center justify-center gap-2">
                <Icons.ShieldCheck size={12} className="text-[#00A859]" /> 
                Garantia de conformidade oficial MEC/BNCC 2024
             </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

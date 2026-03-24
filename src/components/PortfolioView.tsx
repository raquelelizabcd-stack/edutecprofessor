import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { PedagogicalRecord, NAV_ITEMS } from '../types';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface PortfolioViewProps {
  records: PedagogicalRecord[];
  onOpenRecord: (record: PedagogicalRecord) => void;
}

export default function PortfolioView({ records, onOpenRecord }: PortfolioViewProps) {
  const handleExportAll = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;

    const sorted = [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    sorted.forEach((record, index) => {
      if (index > 0) doc.addPage();
      
      // Header
      doc.setFillColor(0, 168, 89);
      doc.rect(0, 0, pageWidth, 40, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(22);
      doc.setFont("helvetica", "bold");
      doc.text("Currículo Pedagógico Consolidado", 14, 25);
      
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(14);
      doc.text(record.title, 14, 50);
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Data: ${new Date(record.date).toLocaleDateString('pt-BR')}`, 14, 58);
      const navItem = NAV_ITEMS.find(item => item.id === record.moduleId);
      doc.text(`Módulo: ${navItem?.label || record.moduleId}`, 14, 64);
      if (record.alunoNome) doc.text(`Aluno: ${record.alunoNome}`, 14, 70);

      doc.setFont("helvetica", "bold");
      doc.text("Descrição / Conteúdo:", 14, 85);
      doc.setFont("helvetica", "normal");
      const splitText = doc.splitTextToSize(record.description || record.content || 'Sem descrição.', pageWidth - 28);
      doc.text(splitText, 14, 92);
    });

    doc.save(`Curriculo_Pedagogico_${new Date().getTime()}.pdf`);
  };
  const sortedRecords = useMemo(() => {
    return [...records].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [records]);

  const stats = useMemo(() => {
    const total = records.length;
    const weekly = records.filter(r => r.moduleId === 'planejamento-semanal').length;
    const monthly = records.filter(r => r.moduleId === 'planejamento-mensal').length;
    const daily = records.filter(r => r.moduleId === 'planejamento-diario').length;
    const reports = records.filter(r => ['relatorio-individual', 'parecer-pcd'].includes(r.moduleId)).length;
    const reflections = records.filter(r => r.moduleId === 'reflexoes').length;

    return { total, weekly, monthly, daily, reports, reflections };
  }, [records]);

  return (
    <div className="space-y-8">
      {/* Portfolio Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-[#00A859]/10 rounded-2xl flex items-center justify-center text-[#00A859]">
            <Icons.History size={32} />
          </div>
          <div>
            <h2 className="text-2xl font-black text-slate-800">Currículo Pedagógico</h2>
            <p className="text-sm text-slate-400 font-medium">Histórico consolidado de sua prática docente</p>
          </div>
        </div>
        <button
          onClick={handleExportAll}
          className="flex items-center gap-2 px-6 py-3 bg-black text-white rounded-2xl font-bold hover:bg-black/80 transition-all shadow-lg active:scale-95"
        >
          <Icons.FileDown size={20} />
          Baixar Currículo (PDF)
        </button>
      </div>

      {/* Quick Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Total Registros', value: stats.total, icon: Icons.FileText, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Planej. Semanais', value: stats.weekly, icon: Icons.Calendar, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Planej. Mensais', value: stats.monthly, icon: Icons.CalendarDays, color: 'text-cyan-600', bg: 'bg-cyan-50' },
          { label: 'Planej. Diários', value: stats.daily, icon: Icons.FileEdit, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Relatórios', value: stats.reports, icon: Icons.FileSignature, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Reflexões', value: stats.reflections, icon: Icons.BookOpen, color: 'text-pink-600', bg: 'bg-pink-50' },
        ].map((stat, idx) => (
          <div key={idx} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-3", stat.bg, stat.color)}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{stat.label}</p>
            <p className="text-2xl font-black text-slate-700 mt-1">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Timeline List */}
      <div className="space-y-4">
        <h3 className="text-lg font-black text-slate-700 flex items-center gap-2 px-2">
          <Icons.Clock size={22} className="text-slate-300" />
          Linha do Tempo Pedagógica
        </h3>
        
        <div className="relative border-l-2 border-slate-100 ml-6 pl-8 space-y-6 pb-12">
          {sortedRecords.length > 0 ? (
            sortedRecords.map((record, idx) => {
              const navItem = NAV_ITEMS.find(item => item.id === record.moduleId);
              const Icon = (Icons as any)[navItem?.icon || 'FileText'];
              
              return (
                <motion.div 
                  key={record.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  className="relative group"
                >
                  {/* Dot */}
                  <div className="absolute -left-[41px] top-4 w-4 h-4 rounded-full border-4 border-white bg-[#00A859] shadow-sm ring-4 ring-slate-50" />
                  
                  <div className="bg-white p-6 rounded-[24px] border border-slate-100 shadow-sm hover:border-[#00A859] transition-all hover:shadow-md cursor-pointer group" onClick={() => onOpenRecord(record)}>
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:bg-[#00A859]/10 group-hover:text-[#00A859] transition-colors">
                          <Icon size={24} />
                        </div>
                        <div>
                          <div className="flex items-center gap-3">
                            <span className="text-[10px] font-black uppercase tracking-widest text-[#00A859] bg-[#00A859]/5 px-2 py-0.5 rounded-full">
                              {navItem?.label || record.moduleId}
                            </span>
                            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                              {new Date(record.date).toLocaleDateString('pt-BR')}
                            </span>
                          </div>
                          <h4 className="font-bold text-slate-700 mt-1 group-hover:text-slate-900">{record.title}</h4>
                          <p className="text-xs text-slate-400 mt-1 font-medium line-clamp-1">{record.description || record.content || 'Sem descrição'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button type="button" className="px-4 py-2 bg-slate-50 text-slate-500 rounded-xl text-xs font-bold hover:bg-[#00A859] hover:text-white transition-all">
                          Visualizar
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })
          ) : (
            <div className="bg-white p-12 rounded-[32px] border border-slate-100 text-center space-y-4">
              <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200">
                <Icons.Search size={40} />
              </div>
              <p className="text-slate-400 font-bold">Nenhum registro encontrado no seu portfólio ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

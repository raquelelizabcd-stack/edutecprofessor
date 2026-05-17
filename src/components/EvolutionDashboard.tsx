import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { TrendingUp, Users, CheckCircle, AlertCircle, ChevronRight, FileText, Calendar, ClipboardList, Accessibility, GraduationCap, School, Book, Megaphone, HelpCircle, DollarSign, FileBox, ShieldCheck, Settings, LayoutDashboard, FileEdit, Search, ArrowLeft, User, Clock, History, BookOpen, BarChart2 } from 'lucide-react';
import { cn } from '../lib/utils';
import * as Icons from 'lucide-react';
import PedagogicalIndicators from './PedagogicalIndicators';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie
} from 'recharts';

const performanceData = [
  { month: 'Jan', grade: 7.2 },
  { month: 'Fev', grade: 7.5 },
  { month: 'Mar', grade: 7.1 },
  { month: 'Abr', grade: 8.0 },
  { month: 'Mai', grade: 8.4 },
  { month: 'Jun', grade: 8.2 },
];

const studentPerformanceData = [
  { period: '1º Bim', grade: 8.5 },
  { period: '2º Bim', grade: 7.8 },
  { period: '3º Bim', grade: 9.2 },
  { period: '4º Bim', grade: 8.8 },
];

const distributionData = [
  { name: 'Abaixo de 5', value: 5, color: '#94A3B8' }, // Slate
  { name: '5 a 7', value: 15, color: '#CBD5E1' },    // Light Slate
  { name: '7 a 9', value: 45, color: '#3B82F6' },    // Blue
  { name: 'Acima de 9', value: 35, color: '#10B981' }, // Green
];

import { PedagogicalRecord } from '../types';
import { supabase } from '../lib/supabase';

interface EvolutionDashboardProps {
  onNavigate: (tabId: string) => void;
  records: PedagogicalRecord[];
  userId?: string;
  professorNome?: string;
}

export default function EvolutionDashboard({ onNavigate, records, userId, professorNome }: EvolutionDashboardProps) {
  const [view, setView] = useState<'general' | 'select' | 'individual'>('general');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<any | null>(null);
  const [relatoriosAluno, setRelatoriosAluno] = useState<any[]>([]);
  const [dbStats, setDbStats] = useState({
    planejamentoSemanal: 0,
    planejamentoDiario: 0,
    planejamentoMensal: 0,
    relatorios: 0,
    reflexoes: 0,
  });

  // Busca contagens reais das tabelas do Supabase
  useEffect(() => {
    const fetchStats = async () => {
      if (!userId) return;
      try {
        const [planejamentosRes, relRes, reflexRes] = await Promise.all([
          supabase.from('planejamentos').select('tipo_planejamento').eq('professor_id', userId),
          supabase.from('relatorios').select('id', { count: 'exact', head: true }),
          supabase.from('diario_reflexoes').select('id', { count: 'exact', head: true }).eq('professor_id', userId),
        ]);
        
        const planos = planejamentosRes.data || [];
        setDbStats({
          planejamentoSemanal: planos.filter(p => p.tipo_planejamento === 'Semanal').length,
          planejamentoDiario: planos.filter(p => p.tipo_planejamento === 'Diário').length,
          planejamentoMensal: planos.filter(p => p.tipo_planejamento === 'Mensal').length,
          relatorios: relRes.count || 0,
          reflexoes: reflexRes.count || 0,
        });
      } catch (err) {
        console.error('Erro ao buscar estatísticas:', err);
      }
    };
    fetchStats();
  }, [userId]);

  // Busca alunos com notas bimestrais do professor logado
  const [boletimAlunos, setBoletimAlunos] = useState<any[]>([]);
  useEffect(() => {
    const fetchBoletim = async () => {
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('alunos')
          .select('id, nome, serie, nota_bimestre1, nota_bimestre2, nota_bimestre3, nota_bimestre4')
          .eq('professor_id', userId)
          .eq('status', 'ativo')
          .order('nome');
        if (data) setBoletimAlunos(data);
      } catch (err) {
        console.error('Erro ao buscar boletim:', err);
      }
    };
    fetchBoletim();
  }, [userId]);

  // Busca relatórios do aluno selecionado
  useEffect(() => {
    const fetchRelatorios = async () => {
      if (!selectedStudent) { setRelatoriosAluno([]); return; }
      try {
        const { data } = await supabase
          .from('relatorios')
          .select('id, tipo, conteudo, created_at, aluno_id')
          .eq('aluno_id', selectedStudent.id)
          .order('created_at', { ascending: false })
          .limit(10);
        setRelatoriosAluno(data || []);
      } catch (err) {
        console.error('Erro ao buscar relatórios:', err);
      }
    };
    fetchRelatorios();
  }, [selectedStudent]);

  const teachingStats = useMemo(() => {
    let bnccCount = 0;
    const reflections = records.filter(r => r.moduleId === 'reflexoes').length;
    
    records.forEach(r => {
      if (r.bnccCodes) bnccCount += r.bnccCodes.length;
      if (r.weeklyData) {
        Object.values(r.weeklyData).forEach(day => {
          if (day.bnccCodes) bnccCount += day.bnccCodes.length;
        });
      }
    });

    return { bnccCount, reflections };
  }, [records]);

  const totalPlanejamentos = dbStats.planejamentoSemanal + dbStats.planejamentoDiario + dbStats.planejamentoMensal;
  const totalRegistros = totalPlanejamentos + dbStats.relatorios + dbStats.reflexoes;

  const indicators = [
    { label: 'Total de Registros', value: totalRegistros.toString(), icon: TrendingUp, color: 'text-blue-600', bg: 'bg-blue-50/50', border: 'border-blue-100' },
    { label: 'Planejamentos', value: totalPlanejamentos.toString(), icon: GraduationCap, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100' },
    { label: 'Reflexões Salvas', value: dbStats.reflexoes.toString(), icon: BookOpen, color: 'text-[#00A859]', bg: 'bg-[#00A859]/5', border: 'border-[#00A859]/10' },
  ];

  const shortcutCategories = [
    {
      title: 'Registros Pedagógicos',
      items: [
        { id: 'planejamento-semanal', label: 'Planejamento Semanal', icon: Calendar },
        { id: 'registro-mensal', label: 'Registro Mensal', icon: ClipboardList },
        { id: 'planejamento-diario', label: 'Planejamento Diário', icon: FileEdit },
      ]
    },
    {
      title: 'Relatórios',
      items: [
        { id: 'relatorio-individual', label: 'Relatório Individual', icon: FileText },
        { id: 'parecer-pcd', label: 'Parecer PCD', icon: Accessibility },
      ]
    },
    {
      title: 'Prática Autônoma',
      items: [
        { id: 'portfolio', label: 'Portfólio Digital', icon: History },
        { id: 'reflexoes', label: 'Diário de Reflexões', icon: BookOpen },
      ]
    },
    {
      title: 'Gestão de Alunos',
      items: [
        { id: 'alunos', label: 'Alunos', icon: Users },
      ]
    }
  ];

  // — VIEW: SELEÇÃO DE ALUNO —
  if (view === 'select') {
    const filtered = boletimAlunos.filter(a =>
      a.nome.toLowerCase().includes(searchQuery.toLowerCase())
    );
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setView('general'); setSearchQuery(''); }}
            className="flex items-center gap-2 text-black/60 hover:text-black transition-colors font-bold"
          >
            <ArrowLeft size={20} />
            Voltar
          </button>
          <h2 className="text-2xl font-black tracking-tight">Selecionar Aluno</h2>
        </div>
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-black/30" />
          <input
            type="text"
            placeholder="Buscar por nome..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/10 outline-none font-medium"
          />
        </div>
        {filtered.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-black/5 p-12 text-center">
            <p className="text-slate-400 font-medium">Nenhum aluno cadastrado. Adicione alunos na aba "Alunos".</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map((aluno) => {
              const notas = [aluno.nota_bimestre1, aluno.nota_bimestre2, aluno.nota_bimestre3, aluno.nota_bimestre4].filter((n: any) => n != null);
              const media = notas.length > 0 ? (notas.reduce((a: number, b: number) => a + b, 0) / notas.length) : null;
              return (
                <button
                  key={aluno.id}
                  onClick={() => { setSelectedStudent(aluno); setView('individual'); }}
                  className="bg-white p-6 rounded-[24px] border border-black/5 hover:border-[#00A859] hover:shadow-lg transition-all text-left group"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 bg-[#00A859]/10 rounded-full flex items-center justify-center text-[#00A859] group-hover:bg-[#00A859] group-hover:text-white transition-colors">
                      <User size={18} />
                    </div>
                    <div>
                      <p className="font-bold text-slate-800">{aluno.nome}</p>
                      <p className="text-xs text-slate-400">{aluno.serie || 'Sem série'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {[aluno.nota_bimestre1, aluno.nota_bimestre2, aluno.nota_bimestre3, aluno.nota_bimestre4].map((n: any, i: number) => (
                      <div key={i} className={`flex-1 text-center py-1 px-1 rounded-lg text-xs font-bold ${
                        n == null ? 'bg-slate-50 text-slate-300' :
                        n >= 7 ? 'bg-emerald-50 text-emerald-600' :
                        n >= 5 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'
                      }`}>
                        {n != null ? Number(n).toFixed(1) : '—'}
                      </div>
                    ))}
                  </div>
                  {media != null && (
                    <p className={`text-xs font-bold mt-3 ${ media >= 7 ? 'text-emerald-600' : media >= 5 ? 'text-amber-500' : 'text-red-500' }`}>
                      Média: {media.toFixed(1)}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // — VIEW: EVOLUÇÃO INDIVIDUAL —
  if (view === 'individual' && selectedStudent) {
    const notas = [
      { period: '1º Bimestre', grade: selectedStudent.nota_bimestre1 },
      { period: '2º Bimestre', grade: selectedStudent.nota_bimestre2 },
      { period: '3º Bimestre', grade: selectedStudent.nota_bimestre3 },
      { period: '4º Bimestre', grade: selectedStudent.nota_bimestre4 },
    ].filter(n => n.grade != null);

    const tipoLabel: Record<string, string> = {
      'relatorio-individual': 'Relatório Individual',
      'parecer-pcd': 'Parecer PCD',
      'registro-mensal': 'Registro Mensal',
    };

    return (
      <div className="space-y-8">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <button
            onClick={() => { setView('select'); }}
            className="flex items-center gap-2 text-black/60 hover:text-black transition-colors font-bold"
          >
            <ArrowLeft size={20} />
            Voltar à seleção
          </button>
          <div className="flex items-center gap-4 bg-white px-6 py-3 rounded-full border border-black/5 shadow-sm">
            <div className="w-10 h-10 bg-[#00A859]/10 rounded-full flex items-center justify-center text-[#00A859]">
              <User size={20} />
            </div>
            <div>
              <p className="text-xs font-bold text-black/40 uppercase tracking-wider">Aluno Selecionado</p>
              <p className="font-black">{selectedStudent.nome}</p>
            </div>
          </div>
        </div>

        {/* Gráfico de notas reais */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-6 flex items-center gap-2">
            <TrendingUp size={20} className="text-[#00A859]" />
            Evolução de Notas por Período
          </h3>
          {notas.length === 0 ? (
            <div className="h-[200px] flex items-center justify-center">
              <p className="text-slate-400 font-medium text-sm">Nenhuma nota lançada ainda para este aluno.</p>
            </div>
          ) : (
            <div className="h-[300px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={notas}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="period" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} domain={[0, 10]} />
                  <Tooltip
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                    formatter={(v: any) => [Number(v).toFixed(1), 'Nota']}
                  />
                  <Line
                    type="monotone"
                    dataKey="grade"
                    stroke="#00A859"
                    strokeWidth={4}
                    dot={{ r: 6, fill: '#00A859', strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, strokeWidth: 0 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        {/* Relatórios reais */}
        <div className="space-y-4">
          <h3 className="text-xl font-black tracking-tight flex items-center gap-2">
            <History size={24} className="text-black/40" />
            Histórico de Relatórios
          </h3>
          {relatoriosAluno.length === 0 ? (
            <div className="bg-white p-8 rounded-[32px] border border-black/5 text-center">
              <p className="text-slate-400 text-sm font-medium">Nenhum relatório cadastrado para este aluno.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {relatoriosAluno.map((rel) => (
                <div key={rel.id} className="bg-white p-5 rounded-2xl border border-black/5 flex items-center justify-between group hover:border-[#00A859] transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center text-black/40 group-hover:bg-[#00A859]/10 group-hover:text-[#00A859]">
                      <FileText size={20} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-black/40 uppercase tracking-wider">
                        {tipoLabel[rel.tipo] || rel.tipo} • {new Date(rel.created_at).toLocaleDateString('pt-BR')}
                      </p>
                      <h4 className="font-bold text-sm line-clamp-1">{rel.conteudo?.substring(0, 80) || 'Sem conteúdo'}</h4>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header with Individual Evolution Button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="text-xs font-bold text-black/30 uppercase tracking-widest mb-1">Bem-vindo(a)</p>
          <h2 className="text-3xl font-black tracking-tight">
            {professorNome ? professorNome : 'Dashboard de Evolução'}
          </h2>
          <p className="text-black/40 font-medium mt-1">
            Visão geral do desempenho — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <button
          onClick={() => setView('select')}
          className="px-8 py-4 bg-black text-white rounded-full font-bold hover:bg-black/80 transition-all flex items-center justify-center gap-3 shadow-xl"
        >
          <TrendingUp size={20} />
          Ver Evolução Individual
        </button>
      </div>

      {/* Indicators */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {indicators.map((indicator, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.1 }}
            className={cn(
              "bg-white p-6 rounded-3xl border shadow-sm transition-all hover:shadow-md",
              indicator.border
            )}
          >
            <div className="flex items-center gap-4">
              <div className={cn(
                "w-12 h-12 rounded-2xl flex items-center justify-center transition-colors",
                indicator.bg,
                indicator.color
              )}>
                <indicator.icon size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">{indicator.label}</p>
                <p className="text-2xl font-black text-slate-800">{indicator.value}</p>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 gap-8">
        {/* Evolution Grade Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-6">Evolução de Notas</h3>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={performanceData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#999' }} domain={[0, 10]} />
                <Tooltip
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Line
                  type="monotone"
                  dataKey="grade"
                  stroke="#3B82F6"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#3B82F6', strokeWidth: 2, stroke: '#fff' }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Distribution Chart */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm"
        >
          <h3 className="text-lg font-bold mb-6">Distribuição de Notas</h3>
          <div className="flex flex-col md:flex-row items-center gap-8">
            <div className="h-[250px] w-full md:w-1/2">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={distributionData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {distributionData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-4 w-full md:w-1/2">
              {distributionData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-3 p-4 rounded-2xl bg-black/5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: item.color }} />
                  <div>
                    <p className="text-xs font-bold text-black/40 uppercase tracking-wider">{item.name}</p>
                    <p className="text-lg font-black">{item.value}%</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      </div>

      {/* Teacher Content Analysis */}
      <div className="space-y-8 mt-12">
        <h2 className="text-2xl font-black tracking-tight">Análise da Prática Pedagógica</h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Reflections Feed */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white p-8 rounded-[32px] border border-black/5 shadow-sm space-y-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Últimas Reflexões</h3>
              <button 
                onClick={() => onNavigate('reflexoes')}
                className="text-xs font-black text-[#00A859] uppercase tracking-widest hover:underline"
              >
                Ver Todas
              </button>
            </div>
            <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
              {records.filter(r => r.moduleId === 'reflexoes').length > 0 ? (
                records
                  .filter(r => r.moduleId === 'reflexoes')
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 3)
                  .map((reflection, idx) => (
                    <div key={idx} className="p-5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {new Date(reflection.date).toLocaleDateString('pt-BR')}
                        </span>
                        <div className="flex gap-1">
                          <Icons.Star size={12} className="text-amber-400 fill-amber-400" />
                        </div>
                      </div>
                      <h4 className="text-sm font-bold text-slate-800 line-clamp-1">{reflection.title}</h4>
                      <p className="text-xs text-slate-500 italic line-clamp-2">"{reflection.percepcoes}"</p>
                    </div>
                  ))
              ) : (
                <div className="py-12 text-center space-y-3">
                  <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
                    <Icons.BookOpen className="text-slate-300" />
                  </div>
                  <p className="text-xs font-medium text-slate-400">Nenhuma reflexão registrada ainda.</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Pedagogy Coverage (Mock analysis based on records) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-8 rounded-[32px] border border-slate-100 shadow-sm relative overflow-hidden text-slate-800"
          >
            <div className="relative z-10 space-y-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Icons.Target size={20} className="text-[#00A859]" />
                Cobertura Pedagógica
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed font-medium">
                Análise baseada nos Campos de Experiência e Componentes Curriculares registrados nos seus planejamentos.
              </p>
              
              <div className="space-y-5">
                {[
                  { label: 'Matemática / Espaços & Tempos', value: 85, color: 'bg-[#10B981]' },
                  { label: 'Língua Port. / Escuta & Fala', value: 70, color: 'bg-[#3B82F6]' },
                  { label: 'Sociais / O Eu, o Outro...', value: 45, color: 'bg-slate-300' },
                ].map((item, idx) => (
                  <div key={idx} className="space-y-2">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase tracking-widest text-slate-500">
                      <span>{item.label}</span>
                      <span>{item.value}%</span>
                    </div>
                    <div className="h-2 bg-slate-50 rounded-full overflow-hidden border border-slate-100">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.value}%` }}
                        transition={{ duration: 1, delay: 0.5 + (idx * 0.2) }}
                        className={`h-full ${item.color} rounded-full`} 
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Boletim Bimestral */}
      <div className="space-y-4 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
            <ClipboardList size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Boletim Bimestral</h2>
            <p className="text-xs text-black/40 font-medium">Notas dos seus alunos por bimestre</p>
          </div>
        </div>

        {boletimAlunos.length === 0 ? (
          <div className="bg-white rounded-[32px] border border-black/5 p-10 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto">
              <ClipboardList className="text-slate-300" size={24} />
            </div>
            <p className="text-sm text-slate-400 font-medium">Nenhum aluno cadastrado ainda. Cadastre alunos e lance as notas na aba "Alunos".</p>
          </div>
        ) : (
          <div className="bg-white rounded-[32px] border border-black/5 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-black/5 bg-slate-50/50">
                    <th className="text-left font-black text-[11px] uppercase tracking-widest text-slate-400 py-4 px-6">Aluno</th>
                    <th className="text-left font-black text-[11px] uppercase tracking-widest text-slate-400 py-4 px-4">Série</th>
                    {['1º Bim','2º Bim','3º Bim','4º Bim'].map(b => (
                      <th key={b} className="text-center font-black text-[11px] uppercase tracking-widest text-slate-400 py-4 px-4">{b}</th>
                    ))}
                    <th className="text-center font-black text-[11px] uppercase tracking-widest text-slate-400 py-4 px-4">Média</th>
                  </tr>
                </thead>
                <tbody>
                  {boletimAlunos.map((aluno, idx) => {
                    const notas = [aluno.nota_bimestre1, aluno.nota_bimestre2, aluno.nota_bimestre3, aluno.nota_bimestre4];
                    const notasValidas = notas.filter(n => n != null);
                    const media = notasValidas.length > 0 ? notasValidas.reduce((a: number, b: number) => a + b, 0) / notasValidas.length : null;
                    const getColor = (n: number | null) => n == null ? 'text-slate-300' : n >= 7 ? 'text-emerald-600 font-bold' : n >= 5 ? 'text-amber-500 font-bold' : 'text-red-500 font-bold';
                    return (
                      <tr key={aluno.id} className="border-b border-black/5 last:border-0 hover:bg-slate-50/50 transition-colors">
                        <td className="py-4 px-6 font-semibold text-slate-800">{aluno.nome}</td>
                        <td className="py-4 px-4 text-sm text-slate-500">{aluno.serie || '—'}</td>
                        {notas.map((nota, i) => (
                          <td key={i} className={`py-4 px-4 text-center text-sm ${getColor(nota)}`}>
                            {nota != null ? Number(nota).toFixed(1) : <span className="text-slate-200">—</span>}
                          </td>
                        ))}
                        <td className={`py-4 px-4 text-center text-sm ${getColor(media)}`}>
                          {media != null ? (
                            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-full text-sm font-black ${media >= 7 ? 'bg-emerald-50 text-emerald-600' : media >= 5 ? 'bg-amber-50 text-amber-600' : 'bg-red-50 text-red-500'}`}>
                              {media.toFixed(1)}
                            </span>
                          ) : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Indicadores de Prática — incorporado dentro do Dashboard */}
      <div className="space-y-4 mt-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-[#00A859]/10 rounded-2xl flex items-center justify-center text-[#00A859]">
            <BarChart2 size={20} />
          </div>
          <div>
            <h2 className="text-2xl font-black tracking-tight">Indicadores de Prática</h2>
            <p className="text-xs text-black/40 font-medium">Visão analítica da sua prática pedagógica</p>
          </div>
        </div>
        <PedagogicalIndicators records={records} />
      </div>

      {/* Shortcuts */}
      <div className="space-y-8 pb-12">
        <h2 className="text-2xl font-black tracking-tight">Atalhos Rápidos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {shortcutCategories.map((category, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="space-y-4"
            >
              <h3 className="text-sm font-black uppercase tracking-[0.2em] text-black/30 px-2">
                {category.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {category.items.map((item, itemIdx) => (
                  <button
                    key={itemIdx}
                    onClick={() => onNavigate(item.id)}
                    className="flex items-center justify-between p-4 bg-white rounded-2xl border border-black/5 hover:border-[#00A859] hover:shadow-md transition-all group text-left"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-black/5 rounded-xl flex items-center justify-center text-black/40 group-hover:bg-[#00A859]/10 group-hover:text-[#00A859] transition-colors">
                        <item.icon size={20} />
                      </div>
                      <span className="font-semibold text-sm">{item.label}</span>
                    </div>
                    <ChevronRight size={16} className="text-black/20 group-hover:text-[#00A859] group-hover:translate-x-1 transition-all" />
                  </button>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import * as Icons from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { PedagogicalRecord } from '../types';

interface PedagogicalIndicatorsProps {
  records: PedagogicalRecord[];
}

export default function PedagogicalIndicators({ records }: PedagogicalIndicatorsProps) {
  const chartData = useMemo(() => {
    const counts: Record<string, number> = {};
    
    records.forEach(record => {
      // For Weekly Planning
      if (record.weeklyData) {
        Object.values(record.weeklyData).forEach(day => {
          const key = day.campoExperiencia || day.componenteCurricular;
          if (key) counts[key] = (counts[key] || 0) + 1;
        });
      }
      // For Single Component Records
      const key = record.curricularComponent || record.discipline;
      if (key) counts[key] = (counts[key] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
  }, [records]);

  const bnccStats = useMemo(() => {
    let totalCodes = 0;
    records.forEach(record => {
      if (record.bnccCodes) totalCodes += record.bnccCodes.length;
      if (record.weeklyData) {
        Object.values(record.weeklyData).forEach(day => {
          if (day.bnccCodes) totalCodes += day.bnccCodes.length;
        });
      }
    });
    return totalCodes;
  }, [records]);

  const COLORS = ['#00A859', '#3B82F6', '#8B5CF6', '#EC4899', '#F59E0B', '#10B981'];

  return (
    <div className="space-y-8">
      {/* Indicators Header */}
      <div className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm flex items-center gap-6">
        <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600">
          <Icons.BarChart2 size={32} />
        </div>
        <div>
          <h2 className="text-2xl font-black text-slate-800">Indicadores de Prática</h2>
          <p className="text-sm text-slate-400 font-medium">Análise de cobertura pedagógica e impacto BNCC</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Chart */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="lg:col-span-2 bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm"
        >
          <div className="flex items-center justify-between mb-8">
            <h3 className="font-black text-slate-700 uppercase tracking-widest text-xs flex items-center gap-2">
              <Icons.Target size={16} className="text-[#00A859]" />
              Frequência de Componentes / Campos
            </h3>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} stroke="#f1f5f9" />
                <XAxis type="number" hide />
                <YAxis 
                  dataKey="name" 
                  type="category" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fontSize: 10, fontWeight: 700, fill: '#64748b' }}
                  width={150}
                />
                <Tooltip 
                  cursor={{ fill: '#f8fafc' }}
                  contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Bar dataKey="value" radius={[0, 8, 8, 0]} barSize={24}>
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Info Cards */}
        <div className="space-y-6">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gradient-to-br from-[#00A859] to-[#008F4C] p-8 rounded-[32px] text-white shadow-lg shadow-[#00A859]/20"
          >
            <Icons.Zap size={32} className="mb-4 opacity-50" />
            <p className="text-sm font-bold uppercase tracking-[0.2em] opacity-80">Impacto BNCC</p>
            <h4 className="text-4xl font-black mt-2">{bnccStats}</h4>
            <p className="text-xs font-medium mt-2 opacity-90 leading-relaxed">
              Objetivos de aprendizagem e desenvolvimento trabalhados em seus planejamentos.
            </p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1 }}
            className="bg-white p-8 rounded-[32px] border border-slate-200 shadow-sm"
          >
            <div className="flex items-center gap-2 mb-4 text-amber-500">
              <Icons.AlertCircle size={20} />
              <h4 className="font-bold text-slate-700">Alertas de Cobertura</h4>
            </div>
            {chartData.length < 3 ? (
              <p className="text-xs text-slate-400 font-medium leading-relaxed">
                Continue registrando para receber alertas sobre componentes pouco explorados em sua prática.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                  Você está explorando bem <strong>{chartData[0].name}</strong>!
                </p>
                <div className="p-3 bg-amber-50 rounded-xl border border-amber-100">
                  <p className="text-[10px] text-amber-700 font-bold leading-relaxed">
                    DICA: Tente integrar mais atividades de outros campos para garantir uma formação integral.
                  </p>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

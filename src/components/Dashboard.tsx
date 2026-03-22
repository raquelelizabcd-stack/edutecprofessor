import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';
import { NAV_ITEMS, NavItem, UserProfile, PedagogicalRecord, Student } from '../types';
import DashboardLayout from './layout/DashboardLayout';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import EvolutionDashboard from './EvolutionDashboard';
import StudentManager from './StudentManager';
import PortfolioView from './PortfolioView';
import PedagogicalIndicators from './PedagogicalIndicators';
import { supabase } from '../lib/supabase';
import { bnccCodesList } from '../lib/bnccCodes';
import DataRetentionBanner from './DataRetentionBanner';
import { useBncc } from '../hooks/useBncc';
import { getSuggestionByCode } from '../lib/bnccSuggestions';
import BnccAssistant from './BnccAssistant';

interface DashboardProps {
  userId: string;
  userEmail: string;
  role: UserProfile;
  userCreatedAt?: string | null;
  userDataExpiracao?: string | null;
  statusPagamento?: string | null;
  onLogout: () => void;
  onGoToPayment: () => void;
}

const CAMPOS_EXPLICACAO: Record<string, string> = {
  "O eu, o outro e o nós": "EO: O eu, o outro e o nós – Desenvolvimento socioemocional e convivência.",
  "Corpo, gestos e movimentos": "CG: Corpo, gestos e movimentos – Expressão corporal e coordenação motora.",
  "Traços, sons, cores e formas": "TS: Traços, sons, cores e formas – Artes visuais, música e exploração de sons.",
  "Escuta, fala, pensamento e imaginação": "EF: Escuta, fala, pensamento e imaginação – Linguagem oral, comunicação e criatividade.",
  "Espaços, tempos, quantidades, relações e transformações": "ET: Espaços, tempos, quantidades, relações e transformações – Matemática inicial e noções de tempo/espaço."
};

export default function Dashboard({ 
  userId, 
  userEmail, 
  role, 
  userCreatedAt, 
  userDataExpiracao, 
  statusPagamento,
  onLogout, 
  onGoToPayment 
}: DashboardProps) {
  // Initialize restoring the last active tab from localStorage (validated against the current role)
  const getInitialTab = () => {
    const authorizedTabs = NAV_ITEMS.filter(item => item.roles.includes(role as any));
    const defaultTab = authorizedTabs.length > 0 ? authorizedTabs[0].id : NAV_ITEMS[0].id;
    try {
      const saved = localStorage.getItem('edutec_activeTab');
      if (saved && authorizedTabs.some(item => item.id === saved)) {
        return saved;
      }
    } catch (_) {}
    return defaultTab;
  };

  const [activeTab, setActiveTab] = useState(getInitialTab());
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [records, setRecords] = useState<PedagogicalRecord[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<PedagogicalRecord | null>(null);

  // Supabase dynamic students for forms
  const [supabaseStudents, setSupabaseStudents] = useState<Student[]>([]);
  const [manualBnccInput, setManualBnccInput] = useState('');
  const [directBnccInput, setDirectBnccInput] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [recordForExport, setRecordForExport] = useState<PedagogicalRecord | null>(null);
  const [wizardStep, setWizardStep] = useState(1);
  const { bnccStructure, bnccCodes: dbBnccCodes, isLoading: isBnccLoading } = useBncc();
  const [showBnccPicker, setShowBnccPicker] = useState(false);
  const [activePickerContext, setActivePickerContext] = useState<'global' | string>('global');
  const [professorNome, setProfessorNome] = useState<string>('');

  useEffect(() => {
    const fetchStudents = async () => {
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('alunos')
          .select('*')
          .eq('professor_id', userId)
          .eq('status', 'ativo')
          .order('nome');
        if (data) setSupabaseStudents(data);
      } catch (err) {
        console.error('Erro ao buscar alunos:', err);
      }
    };
    fetchStudents();
  }, [userId]);

  // Busca o nome do professor logado na tabela public.users
  useEffect(() => {
    const fetchProfessorNome = async () => {
      if (!userId) return;
      try {
        const { data } = await supabase
          .from('users')
          .select('nome')
          .eq('id', userId)
          .single();
        if (data?.nome) setProfessorNome(data.nome);
      } catch (err) {
        console.error('Erro ao buscar nome do professor:', err);
      }
    };
    fetchProfessorNome();
  }, [userId]);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    date: new Date().toISOString().split('T')[0],
    alunoId: '',
    alunoNome: '',
    yearGrade: '',
    curricularComponent: '',
    period: '',
    tone: 'Formal',
    bnccCodes: [] as string[],
    objectives: '',
    content: '',
    resources: '',
    evaluation: '',
    // New Monthly Record fields
    professorName: '',
    discipline: '',
    schoolUnit: '',
    totalAulasDadas: '',
    aulasPrevistas: '',
    aulasPendentes: '',
    apdHours: '',
    metodologias: '',
    materiaisDidaticos: '',
    frequenciaDiaria: '',
    justificativasFaltas: '',
    obsComportamento: '',
    comunicacaoResponsaveis: '',
    participacaoConselhos: '',
    atividadesColetivas: '',
    formacaoContinuada: '',
    autoavaliacao: '',
    feedbackCoordenacao: '',
    conquistas: '',
    weeklyData: null as any,
    exportFormat: 'pdf' as 'pdf' | 'csv'
  });

  // Load records from localStorage on mount
  useEffect(() => {
    try {
      const savedRecords = localStorage.getItem(`edutec_records_${role}`);
      if (savedRecords) {
        const parsed = JSON.parse(savedRecords);
        if (Array.isArray(parsed)) {
          setRecords(parsed);
        } else {
          setRecords([]);
        }
      }
    } catch (err) {
      console.error('Failed to load local records:', err);
      setRecords([]);
    }
  }, [role]);

  // Save records to localStorage whenever they change
  useEffect(() => {
    if (records && Array.isArray(records)) {
      localStorage.setItem(`edutec_records_${role}`, JSON.stringify(records));
    }
  }, [records, role]);

  // Persist active tab in localStorage so the user returns to the same page
  useEffect(() => {
    try {
      localStorage.setItem('edutec_activeTab', activeTab);
    } catch (_) {}
  }, [activeTab]);

  // Ensure activeTab is valid when role changes
  useEffect(() => {
    const authorizedTabs = NAV_ITEMS.filter(item => item.roles.includes(role as any));
    const isTabAuthorized = authorizedTabs.some(item => item.id === activeTab);

    if (!isTabAuthorized && authorizedTabs.length > 0) {
      setActiveTab(authorizedTabs[0].id);
    }
  }, [role]);

  // Reset form when changing tabs
  useEffect(() => {
    setIsFormOpen(false);
    setEditingRecord(null);
  }, [activeTab]);

  const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(role as any));
  const categories = Array.from(new Set(filteredNav.map(item => item.category)));
  const activeItem = NAV_ITEMS.find(item => item.id === activeTab);

  const renderIcon = (iconName: string, className?: string) => {
    const IconComponent = (Icons as any)[iconName];
    return IconComponent ? <IconComponent className={className} size={18} /> : null;
  };

  const handleOpenForm = (record?: PedagogicalRecord) => {
    if (record) {
      setEditingRecord(record);
      setFormData({
        title: record.title,
        description: record.description,
        date: record.date,
        alunoId: record.alunoId || '',
        alunoNome: record.alunoNome || '',
        yearGrade: record.yearGrade || '',
        curricularComponent: record.curricularComponent || '',
        period: record.period || '',
        tone: record.tone || 'Formal',
        bnccCodes: Array.isArray(record.bnccCodes) ? record.bnccCodes : [],
        objectives: record.objectives || '',
        content: record.content || '',
        resources: record.resources || '',
        evaluation: record.evaluation || '',
        professorName: record.professorName || '',
        discipline: record.discipline || '',
        schoolUnit: record.schoolUnit || '',
        totalAulasDadas: record.totalAulasDadas || '',
        aulasPrevistas: record.aulasPrevistas || '',
        aulasPendentes: record.aulasPendentes || '',
        apdHours: record.apdHours || '',
        metodologias: record.metodologias || '',
        materiaisDidaticos: record.materiaisDidaticos || '',
        frequenciaDiaria: record.frequenciaDiaria || '',
        justificativasFaltas: record.justificativasFaltas || '',
        obsComportamento: record.obsComportamento || '',
        comunicacaoResponsaveis: record.comunicacaoResponsaveis || '',
        participacaoConselhos: record.participacaoConselhos || '',
        atividadesColetivas: record.atividadesColetivas || '',
        formacaoContinuada: record.formacaoContinuada || '',
        autoavaliacao: record.autoavaliacao || '',
        feedbackCoordenacao: record.feedbackCoordenacao || '',
        conquistas: record.conquistas || '',
        weeklyData: record.weeklyData || {
          'Segunda-feira': { bnccCodes: [], objetivo_aprendizagem: '' },
          'Terça-feira': { bnccCodes: [], objetivo_aprendizagem: '' },
          'Quarta-feira': { bnccCodes: [], objetivo_aprendizagem: '' },
          'Quinta-feira': { bnccCodes: [], objetivo_aprendizagem: '' },
          'Sexta-feira': { bnccCodes: [], objetivo_aprendizagem: '' }
        },
        exportFormat: 'pdf' as 'pdf' | 'csv'
      });
    } else {
      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        alunoId: '',
        alunoNome: '',
        yearGrade: '',
        curricularComponent: '',
        period: '',
        tone: 'Formal',
        bnccCodes: [],
        objectives: '',
        content: '',
        resources: '',
        evaluation: '',
        professorName: '',
        discipline: '',
        schoolUnit: '',
        totalAulasDadas: '',
        aulasPrevistas: '',
        aulasPendentes: '',
        apdHours: '',
        metodologias: '',
        materiaisDidaticos: '',
        frequenciaDiaria: '',
        justificativasFaltas: '',
        obsComportamento: '',
        comunicacaoResponsaveis: '',
        participacaoConselhos: '',
        atividadesColetivas: '',
        formacaoContinuada: '',
        autoavaliacao: '',
        feedbackCoordenacao: '',
        conquistas: '',
        weeklyData: null as any,
        exportFormat: 'pdf' as 'pdf' | 'csv'
      });
      // Check limits for Free plan
      if (role === 'free') {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay())).getTime();

        const moduleRecords = records.filter(r => r.moduleId === activeTab);

        if (activeTab === 'relatorio-individual' || activeTab === 'planejamento-diario') {
          const todayRecords = moduleRecords.filter(r => new Date(r.createdAt).getTime() >= startOfDay);
          if (todayRecords.length >= 1) {
            alert(`Limite do Plano Free: 1 ${activeItem?.label} por dia. Mude para o Pro para ilimitado!`);
            return;
          }
        } else if (['planejamento-semanal', 'registro-mensal', 'plano-aula', 'relatorios-aluno'].includes(activeTab)) {
          const weekRecords = moduleRecords.filter(r => new Date(r.createdAt).getTime() >= startOfWeek);
          if (weekRecords.length >= 1) {
            alert("Limite do Plano Free: 1 registro por semana neste módulo. Mude para o Pro para ilimitado!");
            return;
          }
        } else {
          // Default limit for other modules in Free plan
          if (moduleRecords.length >= 1) {
            alert("Limite do Plano Free atingido para este módulo. Mude para o Pro para ilimitado!");
            return;
          }
        }
      }

      setEditingRecord(null);
      setFormData({
        title: '',
        description: '',
        date: new Date().toISOString().split('T')[0],
        alunoId: '',
        alunoNome: '',
        yearGrade: '',
        curricularComponent: '',
        period: '',
        tone: 'Formal',
        bnccCodes: [],
        objectives: '',
        content: '',
        resources: '',
        evaluation: '',
        weeklyData: {
          'Segunda-feira': { bnccCodes: [], objetivo_aprendizagem: '' },
          'Terça-feira': { bnccCodes: [], objetivo_aprendizagem: '' },
          'Quarta-feira': { bnccCodes: [], objetivo_aprendizagem: '' },
          'Quinta-feira': { bnccCodes: [], objetivo_aprendizagem: '' },
          'Sexta-feira': { bnccCodes: [], objetivo_aprendizagem: '' }
        },
        exportFormat: 'pdf'
      });
    }
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Basic and Mandatory Validation
    if (!formData.title || !formData.date) {
      alert("Por favor, preencha os campos obrigatórios (Título e Data).");
      return;
    }

    // 2. Module specific validation
    if (activeTab === 'planejamento-diario') {
      if (!formData.objectives || !formData.content || !formData.resources || !formData.evaluation) {
        alert("Por favor, preencha os campos obrigatórios do planejamento (Objetivos, Conteúdo, Recursos e Avaliação).");
        return;
      }
    } else if (activeTab === 'planejamento-mensal') {
      if (!formData.mesPlanejamento || !formData.anoPlanejamento) {
        alert("Por favor, preencha o Mês e o Ano do planejamento.");
        return;
      }
    } else if (activeTab === 'planejamento-semanal') {
      if (!formData.title || !formData.date) {
        alert("Por favor, preencha o título e a data da semana.");
        return;
      }
    } else if (activeTab === 'reflexoes') {
      if (!formData.description) {
        alert("Por favor, registre suas reflexões pedagógicas.");
        return;
      }
    } else {
      if (!formData.description) {
        alert("Por favor, preencha a descrição do registro.");
        return;
      }
    }

    let recordIdToSave = editingRecord ? editingRecord.id : crypto.randomUUID();

    // SUPABASE INTEGRAÇÃO PARA CÓDIGOS BNCC E REGISTROS
    try {
      // Identificar tabela e dados principais
      let targetTable = '';
      let recordData: any = {
        id: recordIdToSave,
        professor_id: userId,
        created_at: new Date().toISOString()
      };

      if (activeTab === 'planejamento-diario') {
        targetTable = 'planejamento_diario';
        recordData = {
          ...recordData,
          titulo: formData.title,
          data: formData.date,
          aluno_id: formData.alunoId || null,
          componente: formData.curricularComponent,
          objetivos: formData.objectives,
          conteudo: formData.content,
          recursos: formData.resources,
          avaliacao: formData.evaluation
        };
      } else if (activeTab === 'planejamento-semanal') {
        const days = Object.keys(formData.weeklyData || {});
        for (const dia of days) {
          const dayData = formData.weeklyData![dia];
          const dayId = dayData.id || crypto.randomUUID();
          
          const firstBnccCode = dayData.bnccCodes?.[0];
          const firstBnccId = firstBnccCode ? dbBnccCodes.find(b => b.codigo === firstBnccCode)?.id : null;

          const recordDataDay = {
            id: dayId,
            professor_id: userId,
            aluno_id: formData.alunoId || null,
            dia_semana: dia,
            turno: dayData.turno || '',
            horario: dayData.horario || '',
            componente_curricular: dayData.componenteCurricular || '',
            bncc_code_id: firstBnccId,
            atividade: dayData.atividade || '',
            objetivo_aprendizagem: dayData.objetivo_aprendizagem || '',
            acompanhamento: dayData.acompanhamento || '',
            observacoes: dayData.observacoes || '',
            created_at: new Date().toISOString()
          };

          const { error: dayError } = await supabase.from('planejamento_semanal').upsert(recordDataDay);
          if (dayError) throw dayError;

          if (dayData.bnccCodes && dayData.bnccCodes.length > 0) {
            const selectedBnccIds = dbBnccCodes
              .filter(b => dayData.bnccCodes!.includes(b.codigo))
              .map(b => b.id);

            if (selectedBnccIds.length > 0) {
              await supabase.from('documentos_bncc').delete().eq('documento_id', dayId);
              const links = selectedBnccIds.map(bnccId => ({ documento_id: dayId, documento_tipo: 'planejamento_semanal', bncc_id: bnccId }));
              await supabase.from('documentos_bncc').insert(links);
            }
          }
        }
        targetTable = ''; 
      } else if (['relatorio-individual', 'parecer-pcd', 'registro-mensal'].includes(activeTab)) {
        targetTable = 'relatorios';
        
        let bundledContent = formData.description || formData.content;
        if (activeTab === 'registro-mensal') {
          bundledContent = `
            Metodologias: ${formData.metodologias || ''}
            Materiais: ${formData.materiaisDidaticos || ''}
            Obs Comportamento: ${formData.obsComportamento || ''}
            Comunicação Responsaveis: ${formData.comunicacaoResponsaveis || ''}
            Descrição Geral: ${formData.description || ''}
          `.trim();
        }

        recordData = {
          ...recordData,
          aluno_id: formData.alunoId || null,
          tipo: activeTab,
          conteudo: bundledContent
        };
      } else if (activeTab === 'planejamento-mensal') {
        targetTable = 'planejamento_mensal';
        recordData = {
          id: recordIdToSave,
          professor_id: userId,
          aluno_id: formData.alunoId || null,
          mes: formData.mesPlanejamento || '',
          ano: parseInt(formData.anoPlanejamento || new Date().getFullYear().toString()),
          componente_curricular: formData.curricularComponent || '',
          objetivos: formData.objectives || '',
          atividades: formData.atividades || '',
          recursos: formData.resources || '',
          avaliacao: formData.evaluation || '',
          observacoes: formData.description || '',
          created_at: new Date().toISOString()
        };
      } else if (activeTab === 'reflexoes') {
        targetTable = 'diario_reflexoes';
        recordData = {
          id: recordIdToSave,
          professor_id: userId,
          aluno_id: formData.alunoId || null,
          titulo: formData.title || `Reflexão - ${new Date(formData.date).toLocaleDateString('pt-BR')}`,
          data: formData.date,
          percepcoes: `
            REFLEXÃO: ${formData.description || ''}
            FOCO/METAS: ${formData.objectives || ''}
            CONQUISTAS: ${formData.conquistas || ''}
          `.trim(),
          created_at: new Date().toISOString()
        };
      }

      if (targetTable) {
        const { error: mainError } = await supabase
          .from(targetTable)
          .upsert(recordData);

        if (mainError) throw mainError;

        if (formData.bnccCodes.length > 0) {
          const selectedBnccIds = dbBnccCodes
            .filter(b => formData.bnccCodes.includes(b.codigo))
            .map(b => b.id);

          if (selectedBnccIds.length > 0) {
            let docType: 'planejamento_diario' | 'planejamento_mensal' | 'relatorio' | 'avaliacao' = 'relatorio';
            if (targetTable === 'planejamento_diario') docType = 'planejamento_diario';
            else if (targetTable === 'planejamento_mensal') docType = 'planejamento_mensal';
            else if (targetTable === 'avaliacoes_alunos') docType = 'avaliacao';
            
            await supabase.from('documentos_bncc').delete().eq('documento_id', recordIdToSave);
            const links = selectedBnccIds.map(bnccId => ({ documento_id: recordIdToSave, documento_tipo: docType, bncc_id: bnccId }));
            await supabase.from('documentos_bncc').insert(links);
          }
        }
      }

      // 3. Update Local State ONLY after successful Supabase save
      if (editingRecord) {
        setRecords(records.map(r => r.id === editingRecord.id ? { ...r, ...formData } : r));
      } else {
        const newRecord: PedagogicalRecord = {
          id: recordIdToSave,
          moduleId: activeTab,
          ...formData,
          createdAt: new Date().toISOString()
        };
        setRecords([...records, newRecord]);
      }

      alert("Alterações salvas com sucesso!");
      setIsFormOpen(false);
      setEditingRecord(null);
      setWizardStep(1); // Reset wizard if applicable
    } catch (err: any) {
      console.error("Erro ao salvar no Supabase:", err);
      alert("Ocorreu um erro ao salvar no servidor. Suas alterações não foram perdidas no formulário, tente novamente. Detalhes: " + err.message);
      // We don't close the form or reset state here so the user can try again
    }
  };


  const handleExport = async (recordToExport: PedagogicalRecord | null = null) => {
    const targetData = recordToExport || formData;
    const format = targetData.exportFormat || 'pdf';

    if (!targetData.title || !targetData.date) {
      alert("Por favor, preencha os campos obrigatórios (Título e Data) antes de exportar.");
      return;
    }

    try {
      if (format === 'csv') {
        // Generate CSV
        const headers = ['Título', 'Data', 'Módulo', 'Aluno', 'Componente Curricular', 'Período', 'Descrição'];
        const row = [
          targetData.title,
          targetData.date,
          activeItem?.label || activeTab,
          targetData.alunoNome || '',
          targetData.curricularComponent || '',
          targetData.period || '',
          targetData.description || targetData.content || ''
        ];

        // Add module-specific fields to CSV if needed
        if (activeTab === 'registro-mensal') {
          headers.push('Professor', 'Disciplina', 'Escola', 'Aulas Dadas', 'Aulas Previstas', 'Aulas Pendentes');
          row.push(targetData.professorName || '', targetData.discipline || '', targetData.schoolUnit || '', targetData.totalAulasDadas || '', targetData.aulasPrevistas || '', targetData.aulasPendentes || '');
        }

        const csvContent = [headers.join(','), row.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')].join('\n');

        // Download CSV
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `EduTecProfessor_${activeItem?.label.replace(/ /g, '_')}_${new Date().getTime()}.csv`;
        link.click();

        // Send Email
        await supabase.functions.invoke('sendExportEmail', {
          body: { csvContent, format: 'csv' }
        });

      } else {
        // Generate PDF
        const isWeekly = activeTab === 'planejamento-semanal';
        const doc = new jsPDF({
          orientation: isWeekly ? 'landscape' : 'portrait'
        });
        const pageWidth = doc.internal.pageSize.width;

        // Header
        doc.setFillColor(0, 168, 89);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont("helvetica", "bold");
        doc.text("EduTecProfessor", 14, 25);
        doc.setFontSize(12);
        doc.setFont("helvetica", "normal");
        doc.text(activeItem?.label || 'Documento Pedagógico', pageWidth - 14, 25, { align: 'right' });

        // Document Info
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(16);
        doc.setFont("helvetica", "bold");
        doc.text(targetData.title, 14, 55);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 100, 100);
        doc.text(`Data: ${new Date(targetData.date).toLocaleDateString('pt-BR')} `, 14, 65);

        const infoData: string[][] = [];
        // Nome do professor: prioriza o buscado do banco, depois o salvo no registro
        const nomeProfessor = professorNome || targetData.professorName || '';
        if (nomeProfessor) infoData.push(['Professor(a)', nomeProfessor]);
        if (targetData.alunoNome) infoData.push(['Aluno', targetData.alunoNome || '-']);
        if (targetData.curricularComponent) infoData.push(['Comp. Curricular (Geral)', targetData.curricularComponent]);
        if (targetData.period) infoData.push(['Período', targetData.period]);
        
        if (!isWeekly && targetData.bnccCodes && targetData.bnccCodes.length > 0) {
          const bnccInfoRows = targetData.bnccCodes.map(code => {
            const dbRef = dbBnccCodes.find(b => b.codigo === code);
            if (!dbRef) return code;
            
            let info = `Código: ${code}`;
            if (dbRef.campo_experiencia) info += `\nCampo: ${dbRef.campo_experiencia}`;
            info += `\nObjetivo: ${dbRef.objetivo_aprendizagem || dbRef.descricao}`;
            return info;
          });
          infoData.push(['BNCC', bnccInfoRows.join('\n\n')]);
        }

        autoTable(doc, {
          startY: 75,
          body: infoData,
          theme: 'plain',
          styles: { fontSize: 11, cellPadding: 2 },
          columnStyles: { 0: { fontStyle: 'bold', textColor: [0, 0, 0], cellWidth: 50 }, 1: { textColor: [80, 80, 80] } }
        });

        let currentY = (doc as any).lastAutoTable.finalY + 15;

        if (isWeekly && targetData.weeklyData) {
          const tableHeaders = [['Dia', 'Turno', 'Horário', 'Campo/Comp', 'BNCC', 'Atividade', 'Objetivo', 'Acomp.', 'Obs.']];
          const tableBody = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'].map(day => {
            const dayData = targetData.weeklyData?.[day] || {};
            // Faixa/Bloco is already in PDF header infoData
            const campoComp = targetData.etapa === 'EF' ? (dayData.componenteCurricular || targetData.componenteCurricular || '-') : (dayData.campoExperiencia || '-');

            return [
              day,
              dayData.turno || '-',
              dayData.horario || '-',
              campoComp,
              (dayData.bnccCodes || []).join(', ') || '-',
              dayData.atividade || '-',
              dayData.objetivo_aprendizagem || '-',
              dayData.acompanhamento || '-',
              dayData.observacoes || '-'
            ];
          });

          autoTable(doc, {
            startY: currentY,
            head: tableHeaders,
            body: tableBody,
            theme: 'grid',
            headStyles: { fillColor: [0, 168, 89], textColor: [255, 255, 255], fontSize: 8 },
            styles: { fontSize: 7, cellPadding: 2, overflow: 'linebreak' },
            columnStyles: {
              0: { fontStyle: 'bold', cellWidth: 20 },
              1: { cellWidth: 15 },
              2: { cellWidth: 20 },
              3: { cellWidth: 25 },
              4: { cellWidth: 25 },
              5: { cellWidth: 25 },
              6: { cellWidth: 35 },
              7: { cellWidth: 35 },
              8: { cellWidth: 25 },
              9: { cellWidth: 25 }
            }
          });
        } else {
          const addPDFSection = (title: string, content: string) => {
            if (!content) return;
            if (currentY > 250) { doc.addPage(); currentY = 20; }
            doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(0, 168, 89);
            doc.text(title, 14, currentY); currentY += 8;
            doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
            const splitText = doc.splitTextToSize(content, pageWidth - 28);
            doc.text(splitText, 14, currentY); currentY += (splitText.length * 5) + 10;
          };

          if (activeTab === 'planejamento-mensal') {
            addPDFSection("Objetivos de Aprendizagem", targetData.objectives || '');
            addPDFSection("Atividades Planejadas", targetData.atividades || '');
            addPDFSection("Recursos Didáticos", targetData.resources || '');
            addPDFSection("Avaliação e Acompanhamento", targetData.evaluation || '');
            addPDFSection("Observações Adicionais", targetData.description || '');
          } else if (activeTab === 'planejamento-diario') {
            addPDFSection("Objetivos da Aula", targetData.objectives);
            addPDFSection("Conteúdo / Atividades Planejadas", targetData.content);
            addPDFSection("Recursos Didáticos", targetData.resources);
            addPDFSection("Avaliação / Observações", targetData.evaluation);
          } else if (activeTab === 'registro-mensal') {
            addPDFSection("1. Identificação e Carga Horária", `Professor: ${targetData.professorName}\nDisciplina: ${targetData.discipline}\nUnidade: ${targetData.schoolUnit}\nTotal Aulas Dadas: ${targetData.totalAulasDadas}\nAulas Previstas: ${targetData.aulasPrevistas}\nAulas Pendentes: ${targetData.aulasPendentes}\nHoras APD: ${targetData.apdHours}`);
            addPDFSection("2. Conteúdos e Metodologias", `Conteúdos: ${targetData.content}\nMetodologias: ${targetData.metodologias}`);
            addPDFSection("3. Avaliações e Materiais", `Avaliações: ${targetData.evaluation}\nMateriais: ${targetData.materiaisDidaticos}`);
            addPDFSection("4. Frequência e Comportamento", `Frequência: ${targetData.frequenciaDiaria}\nJustificativas: ${targetData.justificativasFaltas}\nComportamento: ${targetData.obsComportamento}`);
            addPDFSection("5. Relacionamento Escola-Comunidade", `Comunicação: ${targetData.comunicacaoResponsaveis}\nConselhos: ${targetData.participacaoConselhos}\nAtividades Coletivas: ${targetData.atividadesColetivas}`);
            addPDFSection("6. Reflexão e Desenvolvimento", `Formação: ${targetData.formacaoContinuada}\nAutoavaliação: ${targetData.autoavaliacao}\nFeedback: ${targetData.feedbackCoordenacao}`);
          } else {
            addPDFSection("Observações do Professor", targetData.description);
            addPDFSection("Tom do Texto", targetData.tone);
          }
        }

        // Footer
        const pageCount = doc.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
          doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
          doc.text(`EduTecProfessor - Gerador de Relatórios Pedagógicos • Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
        }

        const pdfBase64 = doc.output('datauristring').split(',')[1];
        doc.save(`EduTecProfessor_${activeItem?.label.replace(/ /g, '_')}_${new Date().getTime()}.pdf`);

        // Send Email
        await supabase.functions.invoke('sendExportEmail', {
          body: { pdfContent: pdfBase64, format: 'pdf' }
        });
      }

      alert(`Documento gerado e enviado para ${userEmail} com sucesso!`);
      setIsExportModalOpen(false);
      setRecordForExport(null);
    } catch (err: any) {
      console.error("Erro na exportação:", err);
      alert("O documento foi baixado, mas houve um erro ao enviar por e-mail: " + (err.message || "Verifique as configurações das Edge Functions."));
    }
  };

  const handleDelete = (id: string) => {
    if (window.confirm("Tem certeza que deseja excluir este registro?")) {
      setRecords(records.filter(r => r.id !== id));
    }
  };

  const currentModuleRecords = records.filter(r => r.moduleId === activeTab);

  const headerSubtitle = isFormOpen
    ? (editingRecord ? 'Editar Registro' : 'Novo Registro')
    : undefined;

  return (
    <DashboardLayout
      role={role}
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      onLogout={onLogout}
      onGoToPayment={onGoToPayment}
      userDataExpiracao={userDataExpiracao}
      statusPagamento={statusPagamento}
      subtitle={headerSubtitle}
    >
      <motion.div
        key={activeTab + (isFormOpen ? '-form' : '-list')}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="max-w-6xl mx-auto"
      >
        <DataRetentionBanner
          role={role}
          userCreatedAt={userCreatedAt || null}
          userDataExpiracao={userDataExpiracao || null}
          records={records}
          students={supabaseStudents.length > 0 ? supabaseStudents : []}
        />

        {activeTab === 'alunos' ? (
          <StudentManager professorId={userId} />
        ) : isFormOpen ? (
          /* Form View */
          <div className="bg-white rounded-[24px] md:rounded-[32px] border border-black/5 p-6 md:p-10 shadow-sm">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">
                {editingRecord ? `Editando: ${activeItem?.label}` : activeItem?.label}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-2 hover:bg-black/5 rounded-full transition-colors"
              >
                <Icons.X size={24} />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-6">
              <>
                <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-3xl space-y-8 relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-2 h-full bg-[#00A859] opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                    <div className="bg-[#00A859]/10 p-2.5 rounded-2xl text-[#00A859]">
                      <Icons.FileText size={22} />
                    </div>
                    <div>
                      <h4 className="text-lg font-bold text-slate-800 tracking-tight">Informações Básicas</h4>
                      <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-0.5">Identificação do Registro</p>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Título do Registro *</label>
                      <input
                        type="text"
                        required
                        value={formData.title}
                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                        placeholder="Ex: Registro do Aluno - João Silva"
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-[#00A859] focus:ring-4 focus:ring-[#00A859]/5 outline-none transition-all placeholder:text-slate-300 font-medium"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Data *</label>
                      <input
                        type="date"
                        required
                        value={formData.date}
                        onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-[#00A859] focus:ring-4 focus:ring-[#00A859]/5 outline-none transition-all font-medium text-slate-600"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Professor(a) *</label>
                      <input
                        type="text"
                        required
                        value={formData.professorName}
                        onChange={(e) => setFormData({ ...formData, professorName: e.target.value })}
                        placeholder="Nome completo do docente"
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-[#00A859] focus:ring-4 focus:ring-[#00A859]/5 outline-none transition-all placeholder:text-slate-300 font-medium"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-3 gap-8 pt-2">
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Aluno (Opcional)</label>
                      <select
                        value={formData.alunoId}
                        onChange={(e) => {
                          const selected = supabaseStudents.find(s => s.id === e.target.value);
                          setFormData({ ...formData, alunoId: e.target.value, alunoNome: selected?.nome || '' });
                        }}
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-[#00A859] focus:ring-4 focus:ring-[#00A859]/5 outline-none transition-all font-semibold text-slate-700 appearance-none cursor-pointer"
                      >
                        <option value="">Selecione o Aluno</option>
                        {supabaseStudents.map((s) => (
                          <option key={s.id} value={s.id}>{s.nome}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Componente Curricular</label>
                      <input
                        type="text"
                        value={formData.curricularComponent}
                        onChange={(e) => setFormData({ ...formData, curricularComponent: e.target.value })}
                        placeholder="Ex: Língua Portuguesa"
                        className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-[#00A859] focus:ring-4 focus:ring-[#00A859]/5 outline-none transition-all placeholder:text-slate-300 font-medium"
                      />
                    </div>
                    <div className="space-y-2.5">
                      <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest pl-1">Período</label>
                      <div className="relative">
                        <select
                          value={formData.period}
                          onChange={(e) => setFormData({ ...formData, period: e.target.value })}
                          className="w-full px-5 py-3.5 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-[#00A859] focus:ring-4 focus:ring-[#00A859]/5 outline-none transition-all font-semibold text-slate-700 appearance-none cursor-pointer"
                        >
                          <option value="">Selecione o período</option>
                          {activeTab === 'planejamento-diario' ? (
                            <>
                              <option value="Manhã">Manhã</option>
                              <option value="Tarde">Tarde</option>
                              <option value="Noite">Noite</option>
                            </>
                          ) : (
                            <>
                              <option value="1º Bimestre">1º Bimestre</option>
                              <option value="2º Bimestre">2º Bimestre</option>
                              <option value="3º Bimestre">3º Bimestre</option>
                              <option value="4º Bimestre">4º Bimestre</option>
                              <option value="1º Semestre">1º Semestre</option>
                              <option value="2º Semestre">2º Semestre</option>
                              <option value="Anual">Anual</option>
                            </>
                          )}
                        </select>
                        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                          <Icons.ChevronDown size={18} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>



                {activeTab === 'portfolio' ? (
                  <PortfolioView 
                    records={records}
                    onOpenRecord={(record) => {
                      setActiveTab(record.moduleId);
                      setFormData({
                        ...formData,
                        ...record,
                        date: record.date.split('T')[0]
                      });
                    }}
                    onExportAll={(format) => {
                      if (format === 'pdf') {
                        alert("Preparando exportação completa do seu Portfólio Digital...");
                      }
                    }}
                  />
                ) : activeTab === 'indicadores' ? (
                  <PedagogicalIndicators records={records} />
                ) : activeTab === 'planejamento-mensal' ? (
                  <div className="space-y-6">
                    <div className="bg-white border border-slate-200 shadow-sm p-8 rounded-3xl space-y-6">
                      <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                        <div className="bg-[#00A859]/10 p-2.5 rounded-2xl text-[#00A859]">
                          <Icons.CalendarDays size={22} />
                        </div>
                        <div>
                          <h4 className="text-lg font-bold text-slate-800">Planejamento Mensal</h4>
                          <p className="text-xs text-slate-400 font-medium uppercase tracking-widest mt-0.5">Período e Identificação</p>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Mês *</label>
                          <select
                            required
                            value={formData.mesPlanejamento || ''}
                            onChange={(e) => setFormData({ ...formData, mesPlanejamento: e.target.value })}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-[#00A859] outline-none transition-all font-semibold text-slate-700 appearance-none"
                          >
                            <option value="">Selecione</option>
                            {['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'].map(m => (
                              <option key={m} value={m}>{m}</option>
                            ))}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Ano *</label>
                          <input
                            type="number"
                            required
                            min="2020"
                            max="2035"
                            value={formData.anoPlanejamento || new Date().getFullYear()}
                            onChange={(e) => setFormData({ ...formData, anoPlanejamento: e.target.value })}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-[#00A859] outline-none transition-all font-semibold text-slate-700"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Aluno (Opcional)</label>
                          <select
                            value={formData.alunoId}
                            onChange={(e) => {
                              const selected = supabaseStudents.find(s => s.id === e.target.value);
                              setFormData({ ...formData, alunoId: e.target.value, alunoNome: selected?.nome || '' });
                            }}
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-[#00A859] outline-none transition-all font-semibold text-slate-700 appearance-none"
                          >
                            <option value="">Selecione o Aluno</option>
                            {supabaseStudents.map(s => <option key={s.id} value={s.id}>{s.nome}</option>)}
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Componente Curricular</label>
                          <input
                            type="text"
                            value={formData.curricularComponent || ''}
                            onChange={(e) => setFormData({ ...formData, curricularComponent: e.target.value })}
                            placeholder="Ex: Matemática"
                            className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/30 focus:bg-white focus:border-[#00A859] outline-none transition-all font-medium placeholder:text-slate-300"
                          />
                        </div>
                      </div>
                    </div>
                    <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-black/30">Conteúdo do Mês</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Objetivos de Aprendizagem</label>
                        <textarea rows={3} value={formData.objectives || ''} onChange={(e) => setFormData({ ...formData, objectives: e.target.value })} placeholder="Descreva os objetivos que os alunos devem atingir no mês..." className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Atividades Planejadas</label>
                        <textarea rows={4} value={formData.atividades || ''} onChange={(e) => setFormData({ ...formData, atividades: e.target.value })} placeholder="Descreva as atividades e metodologias previstas para o mês..." className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none" />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Recursos Didáticos</label>
                          <textarea rows={3} value={formData.resources || ''} onChange={(e) => setFormData({ ...formData, resources: e.target.value })} placeholder="Livros, vídeos, materiais digitais..." className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none" />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Avaliação e Acompanhamento</label>
                          <textarea rows={3} value={formData.evaluation || ''} onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })} placeholder="Critérios e instrumentos de avaliação..." className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none" />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Observações Adicionais</label>
                        <textarea rows={2} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} placeholder="Anotações livres, eventos do mês, datas importantes..." className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none" />
                      </div>
                    </div>

                    {/* BNCC Section Standardized */}
                    <div className="bg-black/5 p-6 rounded-2xl space-y-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Icons.BookOpen size={16} className="text-emerald-600" />
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-black/30">Códigos BNCC <span className="text-[9px] text-emerald-600 font-bold normal-case tracking-normal bg-emerald-50 px-2 py-0.5 rounded-full ml-1">Opcional</span></h4>
                            <p className="text-[10px] text-black/40 mt-0.5">Use os botões abaixo para consultar o PDF oficial ou buscar e selecionar até 2 códigos.</p>
                          </div>
                        </div>
                        {formData.bnccCodes.length > 0 && (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">{formData.bnccCodes.length}/2 selecionados</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <a 
                          href="/docs/BNCC_EI_EF_110518_versaofinal_site.pdf" 
                          target="_blank"
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-all border border-red-100 shadow-sm"
                        >
                          <Icons.FileText size={14} /> Abrir PDF BNCC
                        </a>
                        <button
                          type="button"
                          onClick={() => { setShowBnccPicker(!showBnccPicker || activePickerContext !== 'global'); setActivePickerContext('global'); }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
                        >
                          <Icons.Search size={14} /> Códigos BNCC
                        </button>
                      </div>

                      {showBnccPicker && activePickerContext === 'global' && (
                        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                          <div className="relative">
                            <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Buscar por código ou descrição..."
                              value={manualBnccInput}
                              onChange={(e) => setManualBnccInput(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#00A859] outline-none text-xs font-semibold"
                            />
                          </div>

{/* Digitação manual de código */}
                           <div className="flex gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 animate-in fade-in slide-in-from-top-1">
                             <input 
                               type="text" 
                               placeholder="Ou digite o código direto (ex: EI02TS01)..."
                               value={directBnccInput}
                               onChange={(e) => setDirectBnccInput(e.target.value.toUpperCase())}
                               className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-[#00A859] outline-none text-[11px] font-bold uppercase tracking-wider h-9 shadow-sm"
                             />
                             <button
                               type="button"
                               onClick={() => {
                                 const val = directBnccInput.trim();
                                 if (!val) return;
                                 if (formData.bnccCodes.includes(val)) {
                                   alert("Código já selecionado.");
                                   return;
                                 }
                                 if (formData.bnccCodes.length < 2) {
                                   setFormData({ ...formData, bnccCodes: [...formData.bnccCodes, val] });
                                   setDirectBnccInput('');
                                 } else {
                                   alert("Máximo de 2 códigos.");
                                 }
                               }}
                               className="px-4 py-2 rounded-lg bg-[#00A859] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#008f4c] active:scale-95 transition-all h-9 whitespace-nowrap shadow-sm shadow-[#00A859]/10"
                             >
                               Adicionar
                             </button>
                           </div>

<div className="grid gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {dbBnccCodes
                              .filter(b => !manualBnccInput || b.codigo.toLowerCase().includes(manualBnccInput.toLowerCase()) || (b.objetivo_aprendizagem || b.descricao || '').toLowerCase().includes(manualBnccInput.toLowerCase()))
                              .slice(0, 50)
                              .map((bncc) => {
                                const isSelected = formData.bnccCodes.includes(bncc.codigo);
                                return (
                                  <button
                                    key={bncc.id}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setFormData({ ...formData, bnccCodes: formData.bnccCodes.filter(c => c !== bncc.codigo) });
                                      } else if (formData.bnccCodes.length < 2) {
                                        setFormData({ ...formData, bnccCodes: [...formData.bnccCodes, bncc.codigo] });
                                      } else {
                                        alert("Máximo de 2 códigos.");
                                      }
                                    }}
                                    className={cn(
                                      "p-3 rounded-xl border text-left flex items-start gap-3 transition-all",
                                      isSelected ? "border-[#00A859] bg-[#00A859]/5" : "border-slate-50 bg-white hover:border-slate-200"
                                    )}
                                  >
                                    <div className={cn("w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center", isSelected ? "bg-emerald-500 border-emerald-500" : "border-slate-200")}>
                                      {isSelected && <Icons.Check size={10} className="text-white" />}
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-black text-slate-700">{bncc.codigo}</span>
                                      <p className="text-[9px] text-slate-500 font-medium leading-tight line-clamp-2">{bncc.objetivo_aprendizagem || bncc.descricao}</p>
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        {formData.bnccCodes.map(code => (
                          <div key={code} className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-[9px] font-black flex items-center gap-2">
                             {code}
                             <button type="button" onClick={() => setFormData({ ...formData, bnccCodes: formData.bnccCodes.filter(c => c !== code) })} className="hover:text-red-400">
                               <Icons.X size={10} />
                             </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'planejamento-diario' ? (
                  /* Planejamento Diário Specific Fields */
                  <div className="space-y-6">
                    <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-black/30">Conteúdo Pedagógico</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Objetivos da Aula *</label>
                        <textarea
                          required
                          rows={3}
                          value={formData.objectives}
                          onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                          placeholder="Quais são os objetivos principais desta aula?"
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Conteúdo / Atividades Planejadas *</label>
                        <textarea
                          required
                          rows={4}
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          placeholder="Descreva as atividades e o conteúdo que será abordado..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* BNCC Section Standardized */}
                    <div className="bg-black/5 p-6 rounded-2xl space-y-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Icons.BookOpen size={16} className="text-emerald-600" />
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-black/30">Códigos BNCC <span className="text-[9px] text-emerald-600 font-bold normal-case tracking-normal bg-emerald-50 px-2 py-0.5 rounded-full ml-1">Opcional</span></h4>
                            <p className="text-[10px] text-black/40 mt-0.5">Use os botões abaixo para consultar o PDF oficial ou buscar e selecionar até 2 códigos.</p>
                          </div>
                        </div>
                        {formData.bnccCodes.length > 0 && (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">{formData.bnccCodes.length}/2 selecionados</span>
                        )}
                      </div>
                      <div className="flex flex-wrap gap-3">
                        <a 
                          href="/docs/BNCC_EI_EF_110518_versaofinal_site.pdf" 
                          target="_blank"
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-all border border-red-100 shadow-sm"
                        >
                          <Icons.FileText size={14} /> Abrir PDF BNCC
                        </a>
                        <button
                          type="button"
                          onClick={() => { setShowBnccPicker(!showBnccPicker || activePickerContext !== 'global'); setActivePickerContext('global'); }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
                        >
                          <Icons.Search size={14} /> Códigos BNCC
                        </button>
                      </div>

                      {showBnccPicker && activePickerContext === 'global' && (
                        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                          <div className="relative">
                            <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input 
                              type="text" 
                              placeholder="Buscar por código ou descrição..."
                              value={manualBnccInput}
                              onChange={(e) => setManualBnccInput(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#00A859] outline-none text-xs font-semibold"
                            />
                          </div>

{/* Digitação manual de código */}
                           <div className="flex gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 animate-in fade-in slide-in-from-top-1">
                             <input 
                               type="text" 
                               placeholder="Ou digite o código direto (ex: EI02TS01)..."
                               value={directBnccInput}
                               onChange={(e) => setDirectBnccInput(e.target.value.toUpperCase())}
                               className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-[#00A859] outline-none text-[11px] font-bold uppercase tracking-wider h-9 shadow-sm"
                             />
                             <button
                               type="button"
                               onClick={() => {
                                 const val = directBnccInput.trim();
                                 if (!val) return;
                                 if (formData.bnccCodes.includes(val)) {
                                   alert("Código já selecionado.");
                                   return;
                                 }
                                 if (formData.bnccCodes.length < 2) {
                                   setFormData({ ...formData, bnccCodes: [...formData.bnccCodes, val] });
                                   setDirectBnccInput('');
                                 } else {
                                   alert("Máximo de 2 códigos.");
                                 }
                               }}
                               className="px-4 py-2 rounded-lg bg-[#00A859] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#008f4c] active:scale-95 transition-all h-9 whitespace-nowrap shadow-sm shadow-[#00A859]/10"
                             >
                               Adicionar
                             </button>
                           </div>

<div className="grid gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {dbBnccCodes
                              .filter(b => !manualBnccInput || b.codigo.toLowerCase().includes(manualBnccInput.toLowerCase()) || (b.objetivo_aprendizagem || b.descricao || '').toLowerCase().includes(manualBnccInput.toLowerCase()))
                              .slice(0, 50)
                              .map((bncc) => {
                                const isSelected = formData.bnccCodes.includes(bncc.codigo);
                                return (
                                  <button
                                    key={bncc.id}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setFormData({ ...formData, bnccCodes: formData.bnccCodes.filter(c => c !== bncc.codigo) });
                                      } else if (formData.bnccCodes.length < 2) {
                                        setFormData({ ...formData, bnccCodes: [...formData.bnccCodes, bncc.codigo] });
                                      } else {
                                        alert("Máximo de 2 códigos.");
                                      }
                                    }}
                                    className={cn(
                                      "p-3 rounded-xl border text-left flex items-start gap-3 transition-all",
                                      isSelected ? "border-[#00A859] bg-[#00A859]/5" : "border-slate-50 bg-white hover:border-slate-200"
                                    )}
                                  >
                                    <div className={cn("w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center", isSelected ? "bg-emerald-500 border-emerald-500" : "border-slate-200")}>
                                      {isSelected && <Icons.Check size={10} className="text-white" />}
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-black text-slate-700">{bncc.codigo}</span>
                                      <p className="text-[9px] text-slate-500 font-medium leading-tight line-clamp-2">{bncc.objetivo_aprendizagem || bncc.descricao}</p>
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 mt-4">
                        {formData.bnccCodes.map(code => (
                          <div key={code} className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-[9px] font-black flex items-center gap-2">
                             {code}
                             <button type="button" onClick={() => setFormData({ ...formData, bnccCodes: formData.bnccCodes.filter(c => c !== code) })} className="hover:text-red-400">
                               <Icons.X size={10} />
                             </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-black/30">Recursos e Avaliação</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Recursos Didáticos *</label>
                        <textarea
                          required
                          rows={3}
                          value={formData.resources}
                          onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                          placeholder="Ex: Livro didático, projetor, cartolinas..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Avaliação / Observações *</label>
                        <textarea
                          required
                          rows={3}
                          value={formData.evaluation}
                          onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
                          placeholder="Como será a avaliação ou observações relevantes..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'planejamento-semanal' ? (
                  /* Planejamento Semanal - Vertical Wizard Grid */
                  <div className="space-y-6">



                    {/* ── Bloco: Conteúdo Pedagógico Semanal ──────────────── */}
                    <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-black/30">Conteúdo da Semana</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Objetivos de Aprendizagem</label>
                        <textarea
                          rows={3}
                          value={formData.objectives || ''}
                          onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                          placeholder="Descreva os objetivos que os alunos devem atingir na semana..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Atividades Planejadas</label>
                        <textarea
                          rows={4}
                          value={formData.atividades || ''}
                          onChange={(e) => setFormData({ ...formData, atividades: e.target.value })}
                          placeholder="Descreva as atividades e metodologias previstas para a semana..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Recursos Didáticos</label>
                          <textarea
                            rows={3}
                            value={formData.resources || ''}
                            onChange={(e) => setFormData({ ...formData, resources: e.target.value })}
                            placeholder="Livros, vídeos, materiais digitais..."
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Avaliação e Acompanhamento</label>
                          <textarea
                            rows={3}
                            value={formData.evaluation || ''}
                            onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
                            placeholder="Critérios e instrumentos de avaliação para a semana..."
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Observações Adicionais</label>
                        <textarea
                          rows={2}
                          value={formData.description || ''}
                          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                          placeholder="Anotações livres, eventos da semana, datas importantes..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>
                    {/* ── fim Conteúdo Pedagógico ──────────────────────────── */}

                    {/* ── Bloco: Códigos BNCC (Opcional) ──────────────────── */}
                    <div className="bg-black/5 p-6 rounded-2xl space-y-4">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <Icons.BookOpen size={16} className="text-emerald-600" />
                          <div>
                            <h4 className="text-sm font-black uppercase tracking-widest text-black/30">
                              Códigos BNCC{' '}
                              <span className="text-[9px] text-emerald-600 font-bold normal-case tracking-normal bg-emerald-50 px-2 py-0.5 rounded-full ml-1">
                                Opcional
                              </span>
                            </h4>
                            <p className="text-[10px] text-black/40 mt-0.5">
                              Use os botões abaixo para consultar o PDF oficial ou buscar e selecionar até 2 códigos.
                            </p>
                          </div>
                        </div>
                        {formData.bnccCodes.length > 0 && (
                          <span className="text-[9px] font-black text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">
                            {formData.bnccCodes.length}/2 selecionados
                          </span>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-3">
                        <a
                          href="/docs/BNCC_EI_EF_110518_versaofinal_site.pdf"
                          target="_blank"
                          className="flex items-center gap-2 px-4 py-2.5 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-red-100 transition-all border border-red-100 shadow-sm"
                        >
                          <Icons.FileText size={14} /> Abrir PDF BNCC
                        </a>
                        <button
                          type="button"
                          onClick={() => {
                            setShowBnccPicker(!showBnccPicker || activePickerContext !== 'global');
                            setActivePickerContext('global');
                          }}
                          className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-wider hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm"
                        >
                          <Icons.Search size={14} /> Códigos BNCC
                        </button>
                      </div>

                      {showBnccPicker && activePickerContext === 'global' && (
                        <div className="bg-white border border-slate-100 p-4 rounded-2xl shadow-sm space-y-4 mt-4 animate-in fade-in slide-in-from-top-2">
                          <div className="relative">
                            <Icons.Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                              type="text"
                              placeholder="Buscar por código ou descrição..."
                              value={manualBnccInput}
                              onChange={(e) => setManualBnccInput(e.target.value)}
                              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-100 focus:bg-white focus:border-[#00A859] outline-none text-xs font-semibold"
                            />
                          </div>

{/* Digitação manual de código */}
                           <div className="flex gap-2 bg-slate-50/50 p-2 rounded-xl border border-slate-100/50 animate-in fade-in slide-in-from-top-1">
                             <input 
                               type="text" 
                               placeholder="Ou digite o código direto (ex: EI02TS01)..."
                               value={directBnccInput}
                               onChange={(e) => setDirectBnccInput(e.target.value.toUpperCase())}
                               className="flex-1 px-3 py-2 rounded-lg bg-white border border-slate-200 focus:border-[#00A859] outline-none text-[11px] font-bold uppercase tracking-wider h-9 shadow-sm"
                             />
                             <button
                               type="button"
                               onClick={() => {
                                 const val = directBnccInput.trim();
                                 if (!val) return;
                                 if (formData.bnccCodes.includes(val)) {
                                   alert("Código já selecionado.");
                                   return;
                                 }
                                 if (formData.bnccCodes.length < 2) {
                                   setFormData({ ...formData, bnccCodes: [...formData.bnccCodes, val] });
                                   setDirectBnccInput('');
                                 } else {
                                   alert("Máximo de 2 códigos.");
                                 }
                               }}
                               className="px-4 py-2 rounded-lg bg-[#00A859] text-white text-[10px] font-black uppercase tracking-widest hover:bg-[#008f4c] active:scale-95 transition-all h-9 whitespace-nowrap shadow-sm shadow-[#00A859]/10"
                             >
                               Adicionar
                             </button>
                           </div>

<div className="grid gap-2 max-h-[250px] overflow-y-auto pr-2 custom-scrollbar">
                            {dbBnccCodes
                              .filter(
                                (b) =>
                                  !manualBnccInput ||
                                  b.codigo.toLowerCase().includes(manualBnccInput.toLowerCase()) ||
                                  (b.objetivo_aprendizagem || b.descricao || '')
                                    .toLowerCase()
                                    .includes(manualBnccInput.toLowerCase())
                              )
                              .slice(0, 50)
                              .map((bncc) => {
                                const isSelected = formData.bnccCodes.includes(bncc.codigo);
                                return (
                                  <button
                                    key={bncc.id}
                                    type="button"
                                    onClick={() => {
                                      if (isSelected) {
                                        setFormData({
                                          ...formData,
                                          bnccCodes: formData.bnccCodes.filter((c) => c !== bncc.codigo),
                                        });
                                      } else if (formData.bnccCodes.length < 2) {
                                        setFormData({
                                          ...formData,
                                          bnccCodes: [...formData.bnccCodes, bncc.codigo],
                                        });
                                      } else {
                                        alert('Máximo de 2 códigos.');
                                      }
                                    }}
                                    className={cn(
                                      'p-3 rounded-xl border text-left flex items-start gap-3 transition-all',
                                      isSelected
                                        ? 'border-[#00A859] bg-[#00A859]/5'
                                        : 'border-slate-50 bg-white hover:border-slate-200'
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'w-4 h-4 rounded-full border shrink-0 mt-0.5 flex items-center justify-center',
                                        isSelected ? 'bg-emerald-500 border-emerald-500' : 'border-slate-200'
                                      )}
                                    >
                                      {isSelected && <Icons.Check size={10} className="text-white" />}
                                    </div>
                                    <div className="space-y-0.5">
                                      <span className="text-[10px] font-black text-slate-700">{bncc.codigo}</span>
                                      <p className="text-[9px] text-slate-500 font-medium leading-tight line-clamp-2">
                                        {bncc.objetivo_aprendizagem || bncc.descricao}
                                      </p>
                                    </div>
                                  </button>
                                );
                              })}
                          </div>
                        </div>
                      )}

                      {/* Tags dos códigos selecionados */}
                      <div className="flex flex-wrap gap-2 mt-4">
                        {formData.bnccCodes.map((code) => (
                          <div
                            key={code}
                            className="px-3 py-1.5 bg-slate-800 text-white rounded-xl text-[9px] font-black flex items-center gap-2"
                          >
                            {code}
                            <button
                              type="button"
                              onClick={() =>
                                setFormData({
                                  ...formData,
                                  bnccCodes: formData.bnccCodes.filter((c) => c !== code),
                                })
                              }
                              className="hover:text-red-400"
                            >
                              <Icons.X size={10} />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                    {/* ── fim BNCC ─────────────────────────────────────────── */}

                    {/* ── Botão: Finalizar e Ver Grade ────────────────────── */}
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          const days = ['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'];
                          const initialWeeklyData = days.reduce(
                            (acc, day) => ({
                              ...acc,
                              [day]: {
                                bnccCodes: [],
                                objetivo_aprendizagem: '',
                                campoExperiencia: '',
                                componenteCurricular: formData.curricularComponent || '',
                              },
                            }),
                            {}
                          );
                          setFormData({ ...formData, weeklyData: initialWeeklyData });
                          setWizardStep(5);
                        }}
                        className="w-full py-4 bg-emerald-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 active:scale-[0.99] transition-all shadow-lg shadow-emerald-600/20"
                      >
                        <Icons.LayoutDashboard size={20} />
                        Finalizar Configuração e Ver Grade Semanal
                      </button>
                    </div>
                    {/* ── fim Botão ────────────────────────────────────────── */}


                    {/* Weekly table only shown after wizard (Step 5) */}
                    {wizardStep === 5 && (
                      <motion.div 
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white border border-slate-200 shadow-sm rounded-3xl overflow-hidden"
                      >
                         <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <div className="flex items-center gap-3">
                              <div className="bg-slate-800 p-2 rounded-xl text-white">
                                <Icons.Table size={18} />
                              </div>
                              <h4 className="text-sm font-black uppercase tracking-widest text-slate-700">Grade Semanal Detalhada</h4>
                            </div>
                            <button 
                              type="button" 
                              onClick={() => setWizardStep(4)}
                              className="text-[10px] font-black uppercase tracking-widest text-[#00A859] hover:underline"
                            >
                              Editar Configuração BNCC
                            </button>
                         </div>

                        <div className="overflow-x-auto">
                          <table className="w-full min-w-[1200px] border-collapse">
                            <thead>
                              <tr className="text-left bg-slate-50/30">
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 w-32">Dia</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 w-32">Turno</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 w-32">Horário</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 w-48">{formData.etapa === 'EF' ? 'Comp. Curricular' : 'Campo de Experiência'}</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 w-56">Código BNCC</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 w-64">Atividade</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 w-64">Objetivo</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 w-64">Acompanhamento</th>
                                <th className="p-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 w-64">Observações</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {['Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira'].map((day) => (
                                <tr key={day} className="group even:bg-slate-50/30 hover:bg-[#00A859]/5 transition-colors">
                                  <td className="p-5 align-top">
                                    <span className="text-xs font-black text-slate-700 block mt-3">{day}</span>
                                  </td>
                                  <td className="p-5 align-top">
                                    <select
                                      value={formData.weeklyData?.[day]?.turno || ''}
                                      onChange={(e) => setFormData({
                                        ...formData,
                                        weeklyData: {
                                          ...formData.weeklyData,
                                          [day]: { ...(formData.weeklyData?.[day] || {}), turno: e.target.value }
                                        }
                                      })}
                                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[11px] focus:border-[#00A859] outline-none font-bold text-slate-600 appearance-none shadow-sm"
                                    >
                                      <option value="">Selecione</option>
                                      <option value="Manhã">Manhã</option>
                                      <option value="Tarde">Tarde</option>
                                      <option value="Noite">Noite</option>
                                    </select>
                                  </td>
                                  <td className="p-5 align-top">
                                    <input
                                      type="text"
                                      placeholder="Ex: 08:00 - 10:00"
                                      value={formData.weeklyData?.[day]?.horario || ''}
                                      onChange={(e) => setFormData({
                                        ...formData,
                                        weeklyData: {
                                          ...formData.weeklyData,
                                          [day]: { ...(formData.weeklyData?.[day] || {}), horario: e.target.value }
                                        }
                                      })}
                                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] focus:border-[#00A859] outline-none font-medium text-slate-600 shadow-sm"
                                    />
                                  </td>
                                  <td className="p-5 align-top">
                                    {formData.etapa === 'EF' ? (
                                      <select
                                        value={formData.weeklyData?.[day]?.componenteCurricular || ''}
                                        onChange={(e) => setFormData({
                                          ...formData,
                                          weeklyData: {
                                            ...formData.weeklyData,
                                            [day]: { ...(formData.weeklyData?.[day] || {}), componenteCurricular: e.target.value }
                                          }
                                        })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] focus:border-[#00A859] outline-none font-bold text-slate-600 appearance-none shadow-sm"
                                      >
                                        <option value="">Selecione</option>
                                        <option value="LP">Língua Portuguesa</option>
                                        <option value="MA">Matemática</option>
                                        <option value="CI">Ciências</option>
                                        <option value="EF">Educação Física</option>
                                        <option value="AR">Arte</option>
                                        <option value="ER">Ensino Religioso</option>
                                        <option value="GE">Geografia</option>
                                        <option value="HI">História</option>
                                        <option value="LI">Língua Inglesa</option>
                                      </select>
                                    ) : (
                                      <select
                                        value={formData.weeklyData?.[day]?.campoExperiencia || ''}
                                        onChange={(e) => setFormData({
                                          ...formData,
                                          weeklyData: {
                                            ...formData.weeklyData,
                                            [day]: { ...(formData.weeklyData?.[day] || {}), campoExperiencia: e.target.value }
                                          }
                                        })}
                                        className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] focus:border-[#00A859] outline-none font-bold text-slate-600 appearance-none shadow-sm"
                                      >
                                        <option value="">Selecione</option>
                                        <option value="O eu, o outro e o nós" title="EO: O eu, o outro e o nós – Desenvolvimento socioemocional e convivência.">O eu, o outro e o nós</option>
                                        <option value="Corpo, gestos e movimentos" title="CG: Corpo, gestos e movimentos – Expressão corporal e coordenação motora.">Corpo, gestos e movimentos</option>
                                        <option value="Traços, sons, cores e formas" title="TS: Traços, sons, cores e formas – Artes visuais, música e exploração de sons.">Traços, sons, cores e formas</option>
                                        <option value="Escuta, fala, pensamento e imaginação" title="EF: Escuta, fala, pensamento e imaginação – Linguagem oral, comunicação e criatividade.">Escuta, fala, pensamento e imaginação</option>
                                        <option value="Espaços, tempos, quantidades, relações e transformações" title="ET: Espaços, tempos, quantidades, relações e transformações – Matemática inicial e noções de tempo/espaço.">Espaços, tempos, quantidades, relações e transformações</option>
                                      </select>
                                    )}
                                  </td>
                                  <td className="p-5 align-top relative">
                                    <div className="space-y-3">
                                      <div className="flex gap-2">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setActivePickerContext(day);
                                            setShowBnccPicker(activePickerContext === day ? !showBnccPicker : true);
                                          }}
                                          className="p-2.5 bg-emerald-50 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-all border border-emerald-100 shadow-sm flex items-center justify-center gap-2"
                                          title="Códigos BNCC"
                                        >
                                          <Icons.Search size={14} />
                                          <span className="text-[9px] font-black uppercase tracking-widest">Códigos</span>
                                        </button>
                                        <a 
                                          href="/docs/BNCC_EI_EF_110518_versaofinal_site.pdf" 
                                          target="_blank"
                                          className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all border border-red-100 shadow-sm flex items-center justify-center"
                                          title="Abrir PDF BNCC"
                                        >
                                          <Icons.FileText size={14} />
                                        </a>
                                      </div>

                                      {showBnccPicker && activePickerContext === day && (
                                        <div className="absolute z-[95] p-4 bg-white border border-slate-200 shadow-2xl rounded-2xl w-[280px] mt-2 animate-in fade-in slide-in-from-top-2">
                                           <div className="flex items-center justify-between mb-3">
                                              <span className="text-[10px] font-black text-slate-400 uppercase">Seleção ({formData.weeklyData?.[day]?.bnccCodes?.length || 0}/2)</span>
                                              <button type="button" onClick={() => setShowBnccPicker(false)} className="text-slate-400 hover:text-slate-600">
                                                <Icons.X size={14} />
                                              </button>
                                           </div>
                                           <div className="grid gap-2 max-h-[200px] overflow-y-auto custom-scrollbar">
                                              {(() => {
                                                  const dayData = formData.weeklyData?.[day] || {};
                                                  let codesToShow: any[] = [];
                                                  if (bnccStructure) {
                                                    if (formData.etapa === 'EI' && formData.faixaEtaria && dayData.campoExperiencia) {
                                                      codesToShow = bnccStructure.BNCC.EI[formData.faixaEtaria].campos[dayData.campoExperiencia] || [];
                                                    } else if (formData.etapa === 'EF' && formData.blocoAnos && dayData.componenteCurricular) {
                                                      codesToShow = bnccStructure.BNCC.EF[formData.blocoAnos].componentes[dayData.componenteCurricular] || [];
                                                    }
                                                  }
                                                  if (codesToShow.length === 0) return <p className="text-[9px] text-slate-400 italic p-4 text-center">Inicie com os passos 1, 2 e 3 ou selecione Campo/Comp na linha.</p>;
                                                  
                                                  return codesToShow.map(bncc => {
                                                    const isSelected = (formData.weeklyData?.[day]?.bnccCodes || []).includes(bncc.codigo);
                                                    return (
                                                      <button
                                                        key={bncc.codigo}
                                                        type="button"
                                                        onClick={() => {
                                                           const currentCodes = formData.weeklyData?.[day]?.bnccCodes || [];
                                                           let nextCodes = [];
                                                           if (isSelected) {
                                                              nextCodes = currentCodes.filter((c: string) => c !== bncc.codigo);
                                                           } else if (currentCodes.length < 2) {
                                                              nextCodes = [...currentCodes, bncc.codigo];
                                                           } else {
                                                              alert("O máximo é de 2 códigos por dia.");
                                                              return;
                                                           }

                                                           // Update objectives
                                                           const objectives = nextCodes.map((code: string) => codesToShow.find(b => b.codigo === code)?.objetivo || '').filter(Boolean).join('; ');

                                                           setFormData({
                                                            ...formData,
                                                            weeklyData: {
                                                              ...formData.weeklyData,
                                                              [day]: { 
                                                                ...dayData, 
                                                                bnccCodes: nextCodes,
                                                                objetivo_aprendizagem: objectives
                                                              }
                                                            }
                                                          });
                                                        }}
                                                        className={cn(
                                                          "p-2.5 rounded-xl border text-left flex items-start gap-2.5 transition-all",
                                                          isSelected ? "bg-[#00A859]/10 border-[#00A859]" : "bg-white border-slate-100 hover:border-slate-300"
                                                        )}
                                                      >
                                                        <div className={cn("w-3.5 h-3.5 rounded-full border shrink-0 mt-0.5 flex items-center justify-center", isSelected ? "bg-[#00A859] border-[#00A859]" : "border-slate-200")}>
                                                           {isSelected && <Icons.Check size={10} className="text-white" />}
                                                        </div>
                                                        <div className="space-y-0.5">
                                                           <span className="text-[9px] font-black text-slate-700">{bncc.codigo}</span>
                                                           <p className="text-[8px] text-slate-500 leading-tight line-clamp-2">{bncc.objetivo}</p>
                                                        </div>
                                                      </button>
                                                    );
                                                  });
                                              })()}
                                           </div>
                                        </div>
                                      )}

                                      <div className="flex flex-wrap gap-1">
                                        {(formData.weeklyData?.[day]?.bnccCodes || []).map((code: string) => (
                                          <span key={code} className="px-1.5 py-0.5 bg-slate-800 text-white rounded text-[8px] font-black">{code}</span>
                                        ))}
                                      </div>
                                    </div>
                                  </td>
                                  <td className="p-5 align-top">
                                    <textarea
                                      rows={4}
                                      value={formData.weeklyData?.[day]?.atividade || ''}
                                      onChange={(e) => setFormData({
                                        ...formData,
                                        weeklyData: {
                                          ...formData.weeklyData,
                                          [day]: { ...(formData.weeklyData?.[day] || {}), atividade: e.target.value }
                                        }
                                      })}
                                      placeholder="Descreva a atividade..."
                                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] focus:border-[#00A859] outline-none font-medium text-slate-600 resize-none shadow-sm"
                                    />
                                  </td>
                                  <td className="p-5 align-top">
                                    <textarea
                                      rows={4}
                                      value={formData.weeklyData?.[day]?.objetivo_aprendizagem || ''}
                                      onChange={(e) => setFormData({
                                        ...formData,
                                        weeklyData: {
                                          ...formData.weeklyData,
                                          [day]: { ...(formData.weeklyData?.[day] || {}), objetivo_aprendizagem: e.target.value }
                                        }
                                      })}
                                      placeholder="Objetivo vinculado aos códigos..."
                                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[10px] focus:border-[#00A859] outline-none font-medium text-slate-500 resize-none shadow-sm"
                                    />
                                  </td>
                                  <td className="p-5 align-top">
                                    <textarea
                                      rows={4}
                                      value={formData.weeklyData?.[day]?.acompanhamento || ''}
                                      onChange={(e) => setFormData({
                                        ...formData,
                                        weeklyData: {
                                          ...formData.weeklyData,
                                          [day]: { ...(formData.weeklyData?.[day] || {}), acompanhamento: e.target.value }
                                        }
                                      })}
                                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] focus:border-[#00A859] outline-none font-medium text-slate-600 resize-none shadow-sm"
                                    />
                                  </td>
                                  <td className="p-5 align-top">
                                    <textarea
                                      rows={4}
                                      value={formData.weeklyData?.[day]?.observacoes || ''}
                                      onChange={(e) => setFormData({
                                        ...formData,
                                        weeklyData: {
                                          ...formData.weeklyData,
                                          [day]: { ...(formData.weeklyData?.[day] || {}), observacoes: e.target.value }
                                        }
                                      })}
                                      className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-[10px] focus:border-[#00A859] outline-none font-medium text-slate-600 resize-none shadow-sm"
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </motion.div>
                    )}
                     </div>
                 ) : activeTab === 'registro-mensal' ? (
                  /* Registro Mensal Specific Fields - 6 Sections */
                  <div className="space-y-8">
                    {/* Section 1: Identificação e Carga Horária */}
                    <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-black/30">1. Identificação e Carga Horária</h4>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Nome do Professor</label>
                          <input
                            type="text"
                            value={formData.professorName}
                            onChange={(e) => setFormData({ ...formData, professorName: e.target.value })}
                            placeholder="Nome completo"
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Disciplina</label>
                          <input
                            type="text"
                            value={formData.discipline}
                            onChange={(e) => setFormData({ ...formData, discipline: e.target.value })}
                            placeholder="Ex: Língua Portuguesa"
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Unidade Escolar</label>
                          <input
                            type="text"
                            value={formData.schoolUnit}
                            onChange={(e) => setFormData({ ...formData, schoolUnit: e.target.value })}
                            placeholder="Nome da Escola"
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Turma / Ano / Série</label>
                          <input
                            type="text"
                            value={formData.yearGrade}
                            onChange={(e) => setFormData({ ...formData, yearGrade: e.target.value })}
                            placeholder="Ex: 1º Ano Ensino Fundamental"
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all"
                          />
                        </div>
                      </div>

                      <div className="grid md:grid-cols-4 gap-6 pt-2">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider text-xs">Total Aulas Dadas</label>
                          <input
                            type="number"
                            value={formData.totalAulasDadas}
                            onChange={(e) => setFormData({ ...formData, totalAulasDadas: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider text-xs">Aulas Previstas</label>
                          <input
                            type="number"
                            value={formData.aulasPrevistas}
                            onChange={(e) => setFormData({ ...formData, aulasPrevistas: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider text-xs">Aulas Pendentes</label>
                          <input
                            type="number"
                            value={formData.aulasPendentes}
                            onChange={(e) => setFormData({ ...formData, aulasPendentes: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider text-xs">Horas APD</label>
                          <input
                            type="text"
                            value={formData.apdHours}
                            onChange={(e) => setFormData({ ...formData, apdHours: e.target.value })}
                            placeholder="Planejamento/APD"
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 2: Conteúdos e Metodologias */}
                    <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-black/30">2. Conteúdos e Metodologias</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Conteúdos Ministrados no Mês</label>
                        <textarea
                          rows={3}
                          value={formData.content}
                          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                          placeholder="Resumo dos conteúdos trabalhados..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Metodologias e Tecnologias</label>
                        <textarea
                          rows={3}
                          value={formData.metodologias}
                          onChange={(e) => setFormData({ ...formData, metodologias: e.target.value })}
                          placeholder="Metodologias ativas, Sala do Futuro, CMSP, etc..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Section 3: Avaliações e Materiais */}
                    <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-black/30">3. Avaliações e Materiais</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Registro de Avaliações e Recuperação</label>
                        <textarea
                          rows={3}
                          value={formData.evaluation}
                          onChange={(e) => setFormData({ ...formData, evaluation: e.target.value })}
                          placeholder="Provas, trabalhos, recuperação contínua..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Materiais Didáticos Utilizados</label>
                        <textarea
                          rows={2}
                          value={formData.materiaisDidaticos}
                          onChange={(e) => setFormData({ ...formData, materiaisDidaticos: e.target.value })}
                          placeholder="Livros, vídeos, ferramentas digitais..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                    </div>

                    {/* Section 4: Frequência e Comportamento */}
                    <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-black/30">4. Frequência e Comportamento</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Resumo da Frequência Diária</label>
                        <textarea
                          rows={2}
                          value={formData.frequenciaDiaria}
                          onChange={(e) => setFormData({ ...formData, frequenciaDiaria: e.target.value })}
                          placeholder="Observações sobre faltas e pontualidade..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Justificativa de Faltas</label>
                          <textarea
                            rows={2}
                            value={formData.justificativasFaltas}
                            onChange={(e) => setFormData({ ...formData, justificativasFaltas: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Obs. de Comportamento</label>
                          <textarea
                            rows={2}
                            value={formData.obsComportamento}
                            onChange={(e) => setFormData({ ...formData, obsComportamento: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 5: Relacionamento Escola-Comunidade */}
                    <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-black/30">5. Relacionamento Escola-Comunidade</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Comunicação com Responsáveis</label>
                        <textarea
                          rows={2}
                          value={formData.comunicacaoResponsaveis}
                          onChange={(e) => setFormData({ ...formData, comunicacaoResponsaveis: e.target.value })}
                          placeholder="Reuniões, comunicados, atendimentos..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Conselhos e Reuniões</label>
                          <textarea
                            rows={2}
                            value={formData.participacaoConselhos}
                            onChange={(e) => setFormData({ ...formData, participacaoConselhos: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Atividades Coletivas</label>
                          <textarea
                            rows={2}
                            value={formData.atividadesColetivas}
                            onChange={(e) => setFormData({ ...formData, atividadesColetivas: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Section 6: Reflexão e Desenvolvimento */}
                    <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                      <h4 className="text-sm font-black uppercase tracking-widest text-black/30">6. Reflexão e Desenvolvimento</h4>
                      <div className="space-y-2">
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Formação Continuada</label>
                        <textarea
                          rows={2}
                          value={formData.formacaoContinuada}
                          onChange={(e) => setFormData({ ...formData, formacaoContinuada: e.target.value })}
                          placeholder="Cursos, HTPCs, formações específicas..."
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                        />
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Autoavaliação do Mês</label>
                          <textarea
                            rows={2}
                            value={formData.autoavaliacao}
                            onChange={(e) => setFormData({ ...formData, autoavaliacao: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Feedback da Coordenação</label>
                          <textarea
                            rows={2}
                            value={formData.feedbackCoordenacao}
                            onChange={(e) => setFormData({ ...formData, feedbackCoordenacao: e.target.value })}
                            className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : activeTab === 'reflexoes' ? (
                  /* Diário de Reflexões */
                  <div className="space-y-8">
                    <div className="relative overflow-hidden bg-white border border-slate-200 shadow-xl rounded-[40px] transition-all duration-500 hover:shadow-2xl hover:shadow-purple-500/10 active:scale-[0.99]">
                      {/* Decorative Gradient Header */}
                      <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-purple-500 via-pink-500 to-amber-500" />
                      
                      <div className="p-8 md:p-10 space-y-10">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 border-b border-slate-100 pb-8">
                          <div className="flex items-center gap-5">
                            <div className="relative">
                              <div className="absolute -inset-2 bg-gradient-to-tr from-purple-500 to-pink-500 rounded-3xl blur-lg opacity-30 animate-pulse" />
                              <div className="relative bg-gradient-to-tr from-purple-600 to-pink-600 p-4 rounded-3xl text-white shadow-xl">
                                <Icons.BookOpen size={28} />
                              </div>
                            </div>
                            <div>
                              <h4 className="text-2xl font-black text-slate-800 tracking-tight">Diário de Reflexões Pedagógicas</h4>
                              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-1 flex items-center gap-2">
                                <span className="w-2 h-2 rounded-full bg-purple-500" />
                                Espaço de Prática Reflexiva e Autoconhecimento
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-8">
                          <div className="relative group">
                            <label className="absolute -top-3 left-6 px-3 bg-white text-[11px] font-black text-purple-600 uppercase tracking-widest z-10 transition-colors group-focus-within:text-pink-600">
                              O que aprendi hoje? Reflexões e Insights *
                            </label>
                            <textarea
                              required
                              rows={12}
                              value={formData.description}
                              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                              placeholder="Este é o seu espaço sagrado. Descreva suas percepções, os desafios enfrentados, as pequenas vitórias do dia e como você se sentiu. Como essa experiência molda sua prática futura?"
                              className="w-full px-8 py-10 rounded-[32px] border-2 border-slate-100 bg-slate-50/20 focus:bg-white focus:border-purple-400 focus:ring-[12px] focus:ring-purple-500/5 outline-none transition-all resize-none font-medium text-slate-700 leading-relaxed text-base placeholder:text-slate-300 shadow-inner"
                            />
                            <div className="absolute bottom-6 right-8 text-slate-300 pointer-events-none">
                              <Icons.Sparkles size={24} className="opacity-20 translate-x-2 translate-y-2 group-focus-within:opacity-100 transition-all duration-700 group-focus-within:translate-x-0 group-focus-within:translate-y-0 text-purple-400" />
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-8">
                            <div className="bg-gradient-to-br from-amber-50 to-orange-50/30 p-8 rounded-[32px] border border-amber-100/50 space-y-4 transition-all hover:shadow-lg hover:shadow-amber-500/5 group">
                              <div className="flex items-center gap-3">
                                <div className="bg-amber-500 p-2 rounded-xl text-white">
                                  <Icons.Target size={18} />
                                </div>
                                <h5 className="text-[11px] font-black text-amber-700 uppercase tracking-widest">Foco Próximo Ciclo</h5>
                              </div>
                              <textarea
                                rows={3}
                                value={formData.objectives}
                                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                                placeholder="Uma meta clara para as próximas aulas..."
                                className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-medium text-amber-900/70 placeholder:text-amber-300 resize-none h-24"
                              />
                            </div>

                            <div className="bg-gradient-to-br from-emerald-50 to-teal-50/30 p-8 rounded-[32px] border border-emerald-100/50 space-y-4 transition-all hover:shadow-lg hover:shadow-emerald-500/5 group">
                              <div className="flex items-center gap-3">
                                <div className="bg-emerald-500 p-2 rounded-xl text-white">
                                  <Icons.Trophy size={18} />
                                </div>
                                <h5 className="text-[11px] font-black text-emerald-700 uppercase tracking-widest">Maiores Conquistas</h5>
                              </div>
                              <textarea
                                rows={3}
                                value={formData.conquistas}
                                onChange={(e) => setFormData({ ...formData, conquistas: e.target.value })}
                                placeholder="Celebre seus avanços e do aluno..."
                                className="w-full bg-transparent border-none focus:ring-0 outline-none p-0 text-sm font-medium text-emerald-900/70 placeholder:text-emerald-300 resize-none h-24"
                              />
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* General Module Fields */
                  <div className="bg-black/5 p-6 rounded-2xl space-y-6">
                    <h4 className="text-sm font-black uppercase tracking-widest text-black/30">Detalhes do Registro</h4>
                    <div className="grid md:grid-cols-2 gap-6">
                      {activeTab !== 'relatorios-turma' && activeTab !== 'planejamento-semanal' && (
                        <div className="space-y-2">
                          <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Aluno (Opcional)</label>
                          {formData.turma ? (
                            <select
                              value={formData.studentName}
                              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                              className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all bg-white"
                            >
                              <option value="">Selecione o Aluno (Opcional)</option>
                              {supabaseStudents.filter(s => s.turma === formData.turma).map((s) => (
                                <option key={s.id} value={s.nome}>{s.nome}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="text"
                              value={formData.studentName}
                              onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                              placeholder="Selecione a Turma primeiro ou digite aqui"
                              className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all"
                            />
                          )}
                        </div>
                      )}
                      <div className={cn("space-y-2", activeTab === 'relatorios-turma' && "md:col-start-2")}>
                        <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Ano / Série</label>
                        <input
                          type="text"
                          value={formData.yearGrade}
                          onChange={(e) => setFormData({ ...formData, yearGrade: e.target.value })}
                          placeholder="Ex: 1º Ano Ensino Fundamental"
                          className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Tom do Texto</label>
                      <select
                        value={formData.tone}
                        onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                        className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all bg-white"
                      >
                        <option value="Formal">Formal</option>
                        <option value="Acolhedor">Acolhedor</option>
                        <option value="Técnico">Técnico</option>
                        <option value="Incentivador">Incentivador</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Observações do Professor *</label>
                      <textarea
                        required
                        rows={6}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Descreva detalhadamente o registro pedagógico..."
                        className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all resize-none"
                      />
                    </div>
                  </div>
                )}
              </>

              <div className="bg-black/5 p-6 rounded-2xl space-y-4 mb-6">
                <h4 className="text-sm font-black uppercase tracking-widest text-black/30">Configurações de Exportação</h4>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Formato de Exportação</label>
                  <select
                    value={formData.exportFormat}
                    onChange={(e) => setFormData({ ...formData, exportFormat: e.target.value as 'pdf' | 'csv' })}
                    className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all bg-white"
                  >
                    <option value="pdf">PDF (Documento Estruturado)</option>
                    <option value="csv">CSV (Planilha Excel)</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <button
                  type="submit"
                  disabled={
                    !formData.title || 
                    !formData.date || 
                    !formData.professorName ||
                    (activeTab === 'planejamento-diario' && (!formData.objectives || !formData.content || !formData.resources || !formData.evaluation)) ||
                    (activeTab === 'reflexoes' && !formData.description)
                  }
                  className="flex-1 py-4 bg-[#00A859] text-white rounded-full font-bold hover:bg-[#008F4C] transition-all shadow-lg shadow-[#00A859]/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:grayscale"
                >
                  {['planejamento-diario', 'planejamento-semanal', 'planejamento-mensal'].includes(activeTab) ? 'Salvar Registro' : 'Salvar Alterações'}
                </button>
                <button
                  type="button"
                  onClick={() => handleExport()}
                  className="flex-1 py-4 bg-black text-white rounded-full font-bold hover:bg-black/80 transition-all shadow-lg"
                >
                  Gerar Documento
                </button>
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="flex-1 py-4 bg-black/5 text-black/60 rounded-full font-bold hover:bg-black/10 transition-all"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        ) : activeTab === 'dashboard-evolucao' ? (
          <EvolutionDashboard 
            onNavigate={(id) => setActiveTab(id)} 
            records={records}
            userId={userId}
            professorNome={professorNome}
          />
        ) : currentModuleRecords.length > 0 ? (
          /* List View */
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-8">
              <h3 className="text-2xl font-bold">
                {`Registros em ${activeItem?.label}`}
              </h3>
              <button
                onClick={() => handleOpenForm()}
                className="px-6 py-2.5 bg-[#00A859] text-white rounded-full font-bold hover:bg-[#008F4C] transition-all flex items-center gap-2 shadow-lg shadow-[#00A859]/20"
              >
                <Icons.Plus size={18} />
                Novo Registro
              </button>
            </div>

            <div className="grid gap-4">
              {currentModuleRecords.map(record => (
                <div
                  key={record.id}
                  className="bg-white p-6 rounded-2xl border border-black/5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:shadow-md transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 bg-[#00A859]/10 rounded-xl flex items-center justify-center text-[#00A859] shrink-0">
                      {renderIcon(activeItem?.icon || 'FileText')}
                    </div>
                    <div>
                      <h4 className="font-bold text-lg">{record.title}</h4>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1">
                        <p className="text-xs text-black/40 flex items-center gap-1">
                          <Icons.Calendar size={12} />
                          {new Date(record.date).toLocaleDateString('pt-BR')}
                        </p>
                        {record.turma && (
                          <p className="text-xs text-black/40 flex items-center gap-1">
                            <Icons.Users size={12} />
                            {record.turma}
                          </p>
                        )}
                        {record.studentName && (
                          <p className="text-xs text-black/40 flex items-center gap-1">
                            <Icons.User size={12} />
                            {record.studentName}
                          </p>
                        )}
                        {record.period && (
                          <p className="text-xs text-black/40 flex items-center gap-1">
                            <Icons.Clock size={12} />
                            {record.period}
                          </p>
                        )}
                      </div>
                      <p className="text-sm text-black/60 mt-3 line-clamp-2">{record.description}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      onClick={() => {
                        setRecordForExport(record);
                        setIsExportModalOpen(true);
                      }}
                      className="p-2.5 bg-black/5 rounded-lg text-black/40 hover:text-[#00A859] hover:bg-[#00A859]/10 transition-all"
                      title="Gerar Documento"
                    >
                      <Icons.FileDown size={18} />
                    </button>
                    <button
                      onClick={() => handleOpenForm(record)}
                      className="p-2.5 bg-black/5 rounded-lg text-black/40 hover:text-[#00A859] hover:bg-[#00A859]/10 transition-all"
                      title="Editar"
                    >
                      <Icons.Edit3 size={18} />
                    </button>
                    <button
                      onClick={() => handleDelete(record.id)}
                      className="p-2.5 bg-black/5 rounded-lg text-black/40 hover:text-red-500 hover:bg-red-50 transition-all"
                      title="Excluir"
                    >
                      <Icons.Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          /* Empty State */
          <div className="bg-white rounded-[24px] md:rounded-[32px] border border-black/5 p-6 md:p-12 min-h-[400px] md:min-h-[500px] flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 md:w-24 md:h-24 bg-black/5 rounded-full flex items-center justify-center text-black/10 mb-6 md:mb-8">
              {renderIcon(activeItem?.icon || 'Search', 'w-8 h-8 md:w-12 md:h-12')}
            </div>
            <h3 className="text-xl md:text-2xl font-bold mb-3">Nenhum registro encontrado</h3>
            <p className="text-sm md:text-base text-black/40 max-w-sm mb-8 md:mb-10">
              Ainda não existem dados cadastrados no módulo de <span className="font-bold text-black/60">{activeItem?.label}</span>.
            </p>

            <div className="flex flex-col sm:flex-row gap-3 md:gap-4 w-full sm:w-auto">
              <button
                onClick={() => handleOpenForm()}
                className="w-full sm:w-auto px-8 py-3.5 bg-[#00A859] text-white rounded-full font-bold hover:bg-[#008F4C] transition-all flex items-center justify-center gap-2 shadow-lg shadow-[#00A859]/20"
              >
                <Icons.Plus size={18} />
                Novo Registro
              </button>
              {role === 'diretor' && (
                <button className="w-full sm:w-auto px-8 py-3.5 border border-black/10 rounded-full font-bold hover:bg-black hover:text-white transition-all text-center">
                  Importar Dados
                </button>
              )}
            </div>
          </div>
        )}
      </motion.div>
      {/* Export Selection Modal */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[32px] p-8 max-w-md w-full shadow-2xl space-y-6"
          >
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 bg-[#00A859]/10 rounded-2xl flex items-center justify-center text-[#00A859]">
                <Icons.FileDown size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold">Exportar Registro</h3>
                <p className="text-sm text-black/40">Escolha o formato do documento</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-bold text-black/60 uppercase tracking-wider">Formato de Exportação</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setRecordForExport(prev => prev ? { ...prev, exportFormat: 'pdf' } : null)}
                    className={`py-4 rounded-2xl border-2 font-bold transition-all flex flex-col items-center gap-2 ${(recordForExport?.exportFormat || 'pdf') === 'pdf'
                      ? 'border-[#00A859] bg-[#00A859]/5 text-[#00A859]'
                      : 'border-black/5 hover:border-black/10 text-black/40'
                      }`}
                  >
                    <Icons.FileText size={20} />
                    PDF
                  </button>
                  <button
                    onClick={() => setRecordForExport(prev => prev ? { ...prev, exportFormat: 'csv' } : null)}
                    className={`py-4 rounded-2xl border-2 font-bold transition-all flex flex-col items-center gap-2 ${recordForExport?.exportFormat === 'csv'
                      ? 'border-[#00A859] bg-[#00A859]/5 text-[#00A859]'
                      : 'border-black/5 hover:border-black/10 text-black/40'
                      }`}
                  >
                    <Icons.Table size={20} />
                    CSV
                  </button>
                </div>
              </div>

              <div className="p-4 bg-black/5 rounded-2xl">
                <p className="text-xs text-black/40 leading-relaxed">
                  O documento será baixado localmente e uma cópia será enviada automaticamente para seu e-mail cadastrado.
                </p>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => handleExport(recordForExport)}
                className="flex-1 py-4 bg-[#00A859] text-white rounded-full font-bold hover:bg-[#008F4C] transition-all shadow-lg shadow-[#00A859]/20"
              >
                Exportar agora
              </button>
              <button
                onClick={() => {
                  setIsExportModalOpen(false);
                  setRecordForExport(null);
                }}
                className="flex-1 py-4 bg-black/5 text-black/60 rounded-full font-bold hover:bg-black/10 transition-all font-bold"
              >
                Cancelar
              </button>
            </div>
          </motion.div>
        </div>
      )}
      {/* BNCC Assistant Component */}
      <BnccAssistant 
        isOpen={isAssistantOpen}
        onClose={() => setIsAssistantOpen(false)}
        onInsertCode={(code) => {
          if (!formData.bnccCodes.includes(code)) {
            if (formData.bnccCodes.length < 2) {
              setFormData({ ...formData, bnccCodes: [...formData.bnccCodes, code] });
              alert(`Código ${code} inserido no assistente global!`);
            } else {
              alert("Limite de 3 códigos atingido.");
            }
          } else {
            alert("Este código já foi adicionado.");
          }
        }}
      />

      {/* Floating Action Button for Assistant (Global in Dashboard) */}
      <motion.button
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        onClick={() => setIsAssistantOpen(!isAssistantOpen)}
        className={cn(
          "fixed bottom-8 right-8 w-14 h-14 rounded-full flex items-center justify-center shadow-2xl transition-all z-[90]",
          isAssistantOpen ? "bg-red-500 text-white" : "bg-emerald-600 text-white"
        )}
      >
        {isAssistantOpen ? <Icons.X size={24} /> : <Icons.Bot size={28} />}
        <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 border-2 border-white rounded-full flex items-center justify-center text-[8px] font-black">
          AI
        </div>
      </motion.button>
    </DashboardLayout>
  );
}

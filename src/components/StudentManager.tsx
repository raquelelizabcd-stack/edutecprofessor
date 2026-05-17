import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Student } from '../types';
import { Plus, Edit2, Trash2, Search, X, Accessibility, ClipboardList, FileDown, Check } from 'lucide-react';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface StudentManagerProps {
    professorId: string;
    role: string;
    statusPagamento: string;
}

export default function StudentManager({ professorId, role, statusPagamento }: StudentManagerProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState<Partial<Student>>({
        necessidades_especiais: false,
        presenca: 'Presente'
    });
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);
    const [newAttendanceDate, setNewAttendanceDate] = useState(new Date().toISOString().split('T')[0]);
    const [newAttendanceStatus, setNewAttendanceStatus] = useState<'Presente' | 'Faltou'>('Presente');
    const [isPresenceModalOpen, setIsPresenceModalOpen] = useState(false);

    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
    const [studentHistoryData, setStudentHistoryData] = useState<{ attendances: any[], planejamentos: any[], relatorios: any[] }>({ attendances: [], planejamentos: [], relatorios: [] });
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);
    const [activeHistoryTab, setActiveHistoryTab] = useState<'profile' | 'academic' | 'plans' | 'presences'>('profile');

    const handleViewHistory = async (student: Student) => {
        setSelectedStudent(student);
        setIsHistoryModalOpen(true);
        setIsHistoryLoading(true);
        setActiveHistoryTab('profile');
        try {
            const { data: attendData } = await supabase
                .from('presenca_alunos')
                .select('id, data, status')
                .eq('aluno_id', student.id)
                .order('data', { ascending: false });

            const { data: planejamentos } = await supabase
                .from('planejamentos')
                .select('tipo_planejamento, titulo_registro, data, atividades_planejadas, objetivos_aprendizagem, recursos_didaticos, avaliacao_acompanhamento, observacoes_professor, componente_curricular, ano_serie, bncc_codes')
                .eq('aluno', student.nome)
                .order('data', { ascending: false });

            const { data: relatorios } = await supabase
                .from('relatorios')
                .select('tipo, titulo_registro, created_at, conteudo, componente_curricular, periodo, tom_texto, ano_serie')
                .eq('aluno_nome', student.nome)
                .order('created_at', { ascending: false });

            setStudentHistoryData({
                attendances: attendData || [],
                planejamentos: planejamentos || [],
                relatorios: relatorios || []
            });
        } catch (err) {
            console.error("Erro ao buscar histórico do aluno:", err);
        } finally {
            setIsHistoryLoading(false);
        }
    };



    useEffect(() => {
        fetchStudents();
    }, [professorId]);

    const fetchStudents = async () => {
        try {
            setIsLoading(true);
            const { data, error } = await supabase
                .from('alunos')
                .select('*')
                .eq('professor_id', professorId)
                .order('nome');

            if (error) throw error;
            setStudents(data || []);
        } catch (error) {
            console.error('Erro ao buscar alunos:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Converte notas bimestrais para numeric ou null (nunca string vazia)
            const toNumeric = (v: any) => (v === '' || v === undefined || v === null) ? null : Number(v);

            const dataToSave = {
                nome: formData.nome,
                data_nascimento: formData.data_nascimento || null,
                serie: formData.serie || null,
                status: formData.status || 'ativo',
                necessidades_especiais: formData.necessidades_especiais || false,
                nota: formData.nota || null,
                responsavel1_nome: formData.responsavel1_nome || null,
                responsavel1_telefone: formData.responsavel1_telefone || null,
                responsavel2_nome: formData.responsavel2_nome || null,
                responsavel2_telefone: formData.responsavel2_telefone || null,
                nota_bimestre1: toNumeric(formData.nota_bimestre1),
                nota_bimestre2: toNumeric(formData.nota_bimestre2),
                nota_bimestre3: toNumeric(formData.nota_bimestre3),
                nota_bimestre4: toNumeric(formData.nota_bimestre4),
                limitacoes_pcd: formData.necessidades_especiais ? (formData.limitacoes_pcd || null) : null,
                professor_id: professorId,
            };

            const isFree = role === 'free';
            const isTrial = statusPagamento === 'trial';
            const isPro = role === 'pro' && statusPagamento === 'paid';

            if (!editingStudent) {
                if (isFree) {
                    alert("Atenção: O cadastro de alunos está disponível apenas para os planos Trial (5 alunos) ou Pro Pago (170 alunos). Faça o upgrade para prosseguir!");
                    return;
                }
                if (isTrial && students.length >= 5) {
                    alert("Limite de Alunos atingido para o Período de Teste (Máximo 5). Assine o Plano Pro Pago para cadastrar até 170 alunos!");
                    return;
                }
                if (isPro && students.length >= 170) {
                    alert("Atenção: O limite máximo de 170 alunos para o Plano Pro Pago foi atingido.");
                    return;
                }
            }

            let savedStudentId = editingStudent?.id;

            if (editingStudent) {
                const { error } = await supabase
                    .from('alunos')
                    .update(dataToSave)
                    .eq('id', editingStudent.id);
                if (error) throw error;
            } else {
                const { data: newData, error } = await supabase
                    .from('alunos')
                    .insert([dataToSave])
                    .select();
                if (error) throw error;
                if (newData && newData.length > 0) savedStudentId = newData[0].id;
            }

            // Automação: Gerar relatório automático de Nota/Observação
            if (savedStudentId) {
                try {
                    await supabase.from('relatorios_alunos').insert({
                        aluno_id: savedStudentId,
                        professor_id: professorId,
                        tipo_registro: 'nota',
                        conteudo: {
                            observacao: dataToSave.nota,
                            bimestres: {
                                b1: dataToSave.nota_bimestre1,
                                b2: dataToSave.nota_bimestre2,
                                b3: dataToSave.nota_bimestre3,
                                b4: dataToSave.nota_bimestre4
                            }
                        }
                    });
                } catch (autoErr) {
                    console.error("Erro na automação do relatório:", autoErr);
                }
            }

            setIsModalOpen(false);
            fetchStudents();
        } catch (err: any) {
            console.error('Erro ao salvar aluno:', err);
            alert(`Erro ao salvar aluno: ${err?.message || 'Verifique sua conexão e tente novamente.'}`);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm('Tem certeza que deseja excluir esse aluno?')) return;

        try {
            const { error } = await supabase
                .from('alunos')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setStudents(students.filter(s => s.id !== id));
        } catch (error) {
            console.error('Erro ao deletar aluno:', error);
            alert('Erro ao excluir aluno.');
        }
    };

    const openModal = async (student?: Student) => {
        if (student) {
            setEditingStudent(student);
            setFormData(student);
            fetchAttendanceHistory(student.id);
        } else {
            setEditingStudent(null);
            setFormData({ status: 'ativo', necessidades_especiais: false, limitacoes_pcd: '' });
            setAttendanceHistory([]);
        }
        setIsModalOpen(true);
    };

    const openPresenceModal = async (student: Student) => {
        setEditingStudent(student);
        setFormData(student);
        fetchAttendanceHistory(student.id);
        setIsPresenceModalOpen(true);
    };

    const fetchAttendanceHistory = async (alunoId: string) => {
        try {
            const { data, error } = await supabase
                .from('presenca_alunos')
                .select('*')
                .eq('aluno_id', alunoId)
                .order('data', { ascending: false });
            if (error) throw error;
            setAttendanceHistory(data || []);
        } catch (error) {
            console.error('Erro ao buscar histórico:', error);
        }
    };

    const handleAddHistoryPresence = async () => {
        if (!editingStudent) return;
        try {
            const { error } = await supabase
                .from('presenca_alunos')
                .insert([{
                    aluno_id: editingStudent.id,
                    professor_id: professorId,
                    data: newAttendanceDate,
                    status: newAttendanceStatus
                }]);
            if (error) throw error;

            // Sincronizar o status principal do aluno se a data for hoje
            const hoje = new Date().toISOString().split('T')[0];
            if (newAttendanceDate === hoje) {
                await supabase
                    .from('alunos')
                    .update({ presenca: newAttendanceStatus })
                    .eq('id', editingStudent.id);
                fetchStudents(); // Atualiza a lista principal
            }

            fetchAttendanceHistory(editingStudent.id);
        } catch (error) {
            console.error('Erro ao adicionar presença:', error);
        }
    };

    const handleDeleteHistoryPresence = async (id: string) => {
        if (!window.confirm('Excluir este registro de presença?')) return;
        try {
            const { error } = await supabase
                .from('presenca_alunos')
                .delete()
                .eq('id', id);
            if (error) throw error;
            setAttendanceHistory(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error('Erro ao excluir presença:', error);
        }
    };

    const gerarPDFAlunos = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        // Header do PDF
        doc.setFillColor(0, 168, 89);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Relatório de Alunos — EduTecPro", 14, 25);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Data de Geração: ${new Date().toLocaleString('pt-BR')}`, 14, 50);
        doc.text(`Total de Alunos: ${filteredStudents.length}`, 14, 56);

        const headers = [['Nome', 'Série/Nível', '1º Bim', '2º Bim', '3º Bim', '4º Bim', 'Status', 'Recursos']];
        const data = filteredStudents.map(s => [
            s.nome,
            s.serie || '-',
            s.nota_bimestre1 != null ? s.nota_bimestre1.toFixed(1) : '-',
            s.nota_bimestre2 != null ? s.nota_bimestre2.toFixed(1) : '-',
            s.nota_bimestre3 != null ? s.nota_bimestre3.toFixed(1) : '-',
            s.nota_bimestre4 != null ? s.nota_bimestre4.toFixed(1) : '-',
            s.status === 'ativo' ? 'Ativo' : 'Inativo',
            s.necessidades_especiais ? 'Sim' : 'Não'
        ]);

        autoTable(doc, {
            startY: 65,
            head: headers,
            body: data,
            theme: 'striped',
            headStyles: { fillColor: [0, 168, 89], textColor: [255, 255, 255] },
            styles: { fontSize: 9, cellPadding: 3 },
            columnStyles: {
                2: { halign: 'center' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
                6: { halign: 'center' },
                7: { halign: 'center' }
            }
        });

        doc.save(`Alunos_EduTecPro_${new Date().getTime()}.pdf`);
    };

    const exportarPDFAluno = async (student?: Student) => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        const data = student || formData;

        // Header
        doc.setFillColor(0, 168, 89);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("Ficha do Aluno — EduTecPro", 14, 25);

        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.setFont("helvetica", "bold");
        doc.text(data.nome || 'Aluno Sem Nome', 14, 55);

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        doc.text(`Data de Nascimento: ${data.data_nascimento ? new Date(data.data_nascimento).toLocaleDateString('pt-BR') : '-'}`, 14, 65);
        doc.text(`Série/Nível: ${data.serie || '-'}`, 14, 71);
        doc.text(`Status: ${data.status === 'ativo' ? 'Ativo' : 'Inativo'}`, 14, 77);

        doc.setFont("helvetica", "bold");
        doc.text("Contatos dos Responsáveis:", 14, 90);
        doc.setFont("helvetica", "normal");
        doc.text(`Resp. 1: ${data.responsavel1_nome || '-'} (${data.responsavel1_telefone || '-'})`, 14, 97);
        doc.text(`Resp. 2: ${data.responsavel2_nome || '-'} (${data.responsavel2_telefone || '-'})`, 14, 103);

        doc.setFont("helvetica", "bold");
        doc.text("Observações Gerais:", 14, 115);
        doc.setFont("helvetica", "normal");
        const obsSplit = doc.splitTextToSize(data.nota || '-', pageWidth - 28);
        doc.text(obsSplit, 14, 122);

        doc.setFont("helvetica", "bold");
        doc.text("Histórico de Notas (Bimestrais):", 14, 140);
        autoTable(doc, {
            startY: 145,
            head: [['1º Bim', '2º Bim', '3º Bim', '4º Bim']],
            body: [[
                data.nota_bimestre1 != null ? data.nota_bimestre1.toFixed(1) : '-',
                data.nota_bimestre2 != null ? data.nota_bimestre2.toFixed(1) : '-',
                data.nota_bimestre3 != null ? data.nota_bimestre3.toFixed(1) : '-',
                data.nota_bimestre4 != null ? data.nota_bimestre4.toFixed(1) : '-'
            ]],
            theme: 'grid',
            headStyles: { fillColor: [0, 168, 89] },
            styles: { halign: 'center' }
        });

        let nextY = (doc as any).lastAutoTable.finalY + 15;

        // Histórico de Presença
        // Histórico de Presença e Registros Vinculados
        if (data.id) {
            const { data: attendData } = await supabase
                .from('presenca_alunos')
                .select('data, status')
                .eq('aluno_id', data.id)
                .order('data', { ascending: false });

            const { data: planejamentos } = await supabase
                .from('planejamentos')
                .select('tipo_planejamento, titulo_registro, data, atividades_planejadas')
                .eq('aluno', data.nome)
                .order('data', { ascending: false });

            const { data: relatorios } = await supabase
                .from('relatorios')
                .select('tipo, titulo_registro, created_at, conteudo')
                .eq('aluno_nome', data.nome)
                .order('created_at', { ascending: false });

            // Seção de Presença
            if (nextY > 270) { doc.addPage(); nextY = 20; }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Histórico de Presença Permanente:", 14, nextY);

            if (attendData && attendData.length > 0) {
                autoTable(doc, {
                    startY: nextY + 5,
                    head: [['Data do Registro', 'Status de Presença']],
                    body: attendData.map(r => [
                        new Date(r.data).toLocaleDateString('pt-BR'),
                        r.status
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [51, 51, 51] },
                    styles: { fontSize: 9 }
                });
                nextY = (doc as any).lastAutoTable.finalY + 15;
            } else {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.text("Nenhum registro de presença encontrado.", 14, nextY + 7);
                nextY += 20;
            }

            // Seção de Planejamentos
            if (nextY > 270) { doc.addPage(); nextY = 20; }
            doc.setFont("helvetica", "bold");
            doc.text("Planejamentos Pedagógicos Vinculados:", 14, nextY);

            if (planejamentos && planejamentos.length > 0) {
                autoTable(doc, {
                    startY: nextY + 5,
                    head: [['Data', 'Tipo', 'Título', 'Atividades / Conteúdo']],
                    body: planejamentos.map(r => [
                        r.data ? new Date(r.data).toLocaleDateString('pt-BR') : '-',
                        r.tipo_planejamento || '-',
                        r.titulo_registro || '-',
                        (r.atividades_planejadas || '').substring(0, 150) + ((r.atividades_planejadas || '').length > 150 ? '...' : '')
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [0, 168, 89] },
                    styles: { fontSize: 8 }
                });
                nextY = (doc as any).lastAutoTable.finalY + 15;
            } else {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.text("Nenhum planejamento vinculado encontrado para este aluno.", 14, nextY + 7);
                nextY += 20;
            }

            // Seção de Relatórios
            if (nextY > 270) { doc.addPage(); nextY = 20; }
            doc.setFont("helvetica", "bold");
            doc.text("Relatórios e Pareceres:", 14, nextY);

            if (relatorios && relatorios.length > 0) {
                autoTable(doc, {
                    startY: nextY + 5,
                    head: [['Data', 'Tipo', 'Título', 'Conteúdo']],
                    body: relatorios.map(r => [
                        new Date(r.created_at).toLocaleDateString('pt-BR'),
                        r.tipo === 'relatorio-individual' ? 'Relatório Individual' : (r.tipo || '-'),
                        r.titulo_registro || '-',
                        (r.conteudo || '').substring(0, 150) + ((r.conteudo || '').length > 150 ? '...' : '')
                    ]),
                    theme: 'striped',
                    headStyles: { fillColor: [59, 130, 246] },
                    styles: { fontSize: 8 }
                });
                nextY = (doc as any).lastAutoTable.finalY + 15;
            } else {
                doc.setFont("helvetica", "normal");
                doc.setFontSize(9);
                doc.text("Nenhum relatório ou parecer vinculado encontrado.", 14, nextY + 7);
                nextY += 20;
            }
        }

        if (data.necessidades_especiais) {
            if (nextY > 270) {
                doc.addPage();
                nextY = 20;
            }
            doc.setFont("helvetica", "bold");
            doc.setFontSize(10);
            doc.text("Educação Inclusiva (PCD) — Limitações:", 14, nextY);
            doc.setFont("helvetica", "normal");
            const limitSplit = doc.splitTextToSize(data.limitacoes_pcd || 'Não informadas.', pageWidth - 28);
            doc.text(limitSplit, 14, nextY + 7);
        }

        doc.save(`Ficha_${data.nome}_${new Date().getTime()}.pdf`);
    };



    const filteredStudents = students.filter(s =>
        s.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="w-8 h-8 border-4 border-[#00A859] border-t-transparent rounded-full animate-spin"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                <h2 className="text-2xl font-bold text-left">Meus Alunos</h2>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:w-auto">
                    <button
                        onClick={gerarPDFAlunos}
                        className="w-full sm:w-auto justify-center bg-black text-white px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-black/80 transition-colors shadow-lg active:scale-95 text-sm font-bold"
                    >
                        <FileDown size={18} />
                        <span>Baixar PDF</span>
                    </button>
                    <button
                        onClick={() => openModal()}
                        className="w-full sm:w-auto justify-center bg-[#00A859] text-white px-4 py-3 rounded-xl flex items-center gap-2 hover:bg-[#008F4C] transition-colors text-sm font-bold"
                    >
                        <Plus size={18} />
                        <span>Novo Aluno</span>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-black/5 overflow-hidden p-4 md:p-6">
                <div className="mb-6 relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-black/40" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nome..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 rounded-xl bg-black/5 border-none focus:ring-2 focus:ring-[#00A859]/20 transition-all font-medium"
                    />
                </div>

                {/* Tabela Responsiva - Visível Apenas no Desktop */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-black/5">
                                <th className="text-left font-semibold text-black/60 pb-4 px-4 min-w-[150px]">Nome</th>
                                <th className="text-left font-semibold text-black/60 pb-4 px-4 min-w-[120px]">Série/Nível</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4 min-w-[70px]">1º Bim</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4 min-w-[70px]">2º Bim</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4 min-w-[70px]">3º Bim</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4 min-w-[70px]">4º Bim</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4 min-w-[85px]">Status</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4 min-w-[95px]">Presença</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4 min-w-[85px]">Recursos</th>
                                <th className="text-right font-semibold text-black/60 pb-4 px-4 min-w-[110px]">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={10} className="text-center py-8 text-black/40">
                                        Nenhum aluno encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr key={student.id} className="border-b border-black/5 last:border-0 hover:bg-black/5 transition-colors">
                                        <td className="py-4 px-4 font-semibold text-black/80 min-w-[150px]">
                                            <button
                                                onClick={() => handleViewHistory(student)}
                                                className="text-[#00A859] hover:text-[#008F4C] hover:underline font-bold text-left focus:outline-none transition-colors"
                                                title="Clique para ver todo o histórico pedagógico e registros do aluno"
                                            >
                                                {student.nome}
                                            </button>
                                        </td>
                                        <td className="py-4 px-4 text-black/60 min-w-[120px]">{student.serie || '-'}</td>
                                        {/* Notas bimestrais */}
                                        {(['nota_bimestre1', 'nota_bimestre2', 'nota_bimestre3', 'nota_bimestre4'] as const).map((campo, idx) => {
                                            const nota = (student as any)[campo];
                                            const cor = nota == null ? 'text-black/30' : nota >= 7 ? 'text-emerald-600 font-bold' : nota >= 5 ? 'text-amber-600 font-bold' : 'text-red-500 font-bold';
                                            return (
                                                <td key={campo} className={`py-4 px-4 text-center text-sm ${cor} min-w-[70px]`}>
                                                    {nota != null ? Number(nota).toFixed(1) : <span className="text-black/20">—</span>}
                                                </td>
                                            );
                                        })}
                                        <td className="py-4 px-4 text-center min-w-[85px]">
                                            <span className={`inline-flex px-2 !py-1 text-xs font-semibold rounded-full ${student.status === 'ativo' ? 'bg-[#00A859]/10 text-[#00A859]' : 'bg-red-100 text-red-600'}`}>
                                                {student.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center min-w-[95px]">
                                            <button
                                                onClick={() => openPresenceModal(student)}
                                                className={`inline-flex px-3 py-1 text-xs font-bold rounded-full transition-all hover:scale-110 active:scale-95 cursor-pointer shadow-sm hover:shadow-md ${student.presenca === 'Presente' ? 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                                                title="Clique para abrir o Histórico de Presença / Calendário"
                                            >
                                                {student.presenca || 'Presente'}
                                            </button>
                                        </td>
                                        <td className="py-4 px-4 text-center min-w-[85px]">
                                            {student.necessidades_especiais ? (
                                                <div className="flex justify-center" title="Educação Inclusiva">
                                                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center">
                                                        <Accessibility size={16} />
                                                    </div>
                                                </div>
                                            ) : (
                                                <span className="text-black/30">-</span>
                                            )}
                                        </td>
                                        <td className="py-4 px-4 text-right min-w-[110px]">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => exportarPDFAluno(student)}
                                                    className="p-2 hover:bg-black/5 rounded-lg text-black/60 hover:text-black transition-colors"
                                                    title="Baixar Ficha PDF"
                                                >
                                                    <FileDown size={18} />
                                                </button>
                                                <button
                                                    onClick={() => openModal(student)}
                                                    className="p-2 hover:bg-black/5 rounded-lg text-black/60 hover:text-black transition-colors"
                                                >
                                                    <Edit2 size={18} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(student.id)}
                                                    className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Visualização em Cards Empilhados - Visível Apenas no Mobile */}
                <div className="block md:hidden space-y-4">
                    {filteredStudents.length === 0 ? (
                        <div className="text-center py-8 text-black/40 bg-black/5 rounded-2xl">
                            Nenhum aluno encontrado.
                        </div>
                    ) : (
                        filteredStudents.map((student) => (
                            <div key={student.id} className="p-4 bg-black/[0.02] border border-black/5 rounded-2xl space-y-4">
                                <div className="flex justify-between items-start gap-2">
                                    <div className="space-y-1">
                                        <button
                                            onClick={() => handleViewHistory(student)}
                                            className="text-[#00A859] hover:text-[#008F4C] hover:underline font-bold text-left text-base focus:outline-none transition-colors"
                                            title="Clique para ver todo o histórico pedagógico e registros do aluno"
                                        >
                                            {student.nome}
                                        </button>
                                        <div className="flex flex-wrap items-center gap-2">
                                            <span className={`inline-flex px-2 py-0.5 text-[10px] font-semibold rounded-full ${student.status === 'ativo' ? 'bg-[#00A859]/10 text-[#00A859]' : 'bg-red-100 text-red-600'}`}>
                                                {student.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                            </span>
                                            {student.necessidades_especiais && (
                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold rounded-full bg-blue-50 text-blue-600">
                                                    <Accessibility size={10} />
                                                    PCD
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => exportarPDFAluno(student)}
                                            className="p-2 hover:bg-black/5 rounded-lg text-black/60 hover:text-black transition-colors"
                                            title="Baixar Ficha PDF"
                                        >
                                            <FileDown size={18} />
                                        </button>
                                        <button
                                            onClick={() => openModal(student)}
                                            className="p-2 hover:bg-black/5 rounded-lg text-black/60 hover:text-black transition-colors"
                                        >
                                            <Edit2 size={18} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(student.id)}
                                            className="p-2 hover:bg-red-50 rounded-lg text-red-400 hover:text-red-600 transition-colors"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-3 text-sm border-t border-black/5 pt-3">
                                    <div>
                                        <span className="block text-xs text-black/40 font-medium">Série/Nível</span>
                                        <span className="font-semibold text-black/80">{student.serie || '-'}</span>
                                    </div>
                                    <div>
                                        <span className="block text-xs text-black/40 font-medium">Presença</span>
                                        <button
                                            onClick={() => openPresenceModal(student)}
                                            className={`mt-0.5 inline-flex px-3 py-1 text-xs font-bold rounded-full transition-all hover:scale-105 active:scale-95 cursor-pointer shadow-sm ${student.presenca === 'Presente' ? 'bg-emerald-100 text-emerald-600' : 'bg-red-100 text-red-600'}`}
                                        >
                                            {student.presenca || 'Presente'}
                                        </button>
                                    </div>
                                </div>

                                <div className="border-t border-black/5 pt-3">
                                    <span className="block text-xs text-black/40 font-medium mb-1.5">Notas Bimestrais</span>
                                    <div className="grid grid-cols-4 gap-2">
                                        {(['nota_bimestre1', 'nota_bimestre2', 'nota_bimestre3', 'nota_bimestre4'] as const).map((campo, idx) => {
                                            const nota = (student as any)[campo];
                                            const cor = nota == null ? 'text-black/30 bg-black/5' : nota >= 7 ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : nota >= 5 ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-red-600 bg-red-50 border-red-200';
                                            return (
                                                <div key={campo} className={`py-1.5 text-center rounded-xl border border-transparent text-xs font-bold ${cor}`}>
                                                    <span className="block text-[8px] text-black/40 uppercase font-medium">{idx + 1}º B</span>
                                                    {nota != null ? Number(nota).toFixed(1) : '—'}
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                </div>

                <div className="mt-6 flex justify-end border-t border-black/5 pt-6 w-full">
                    <button
                        onClick={gerarPDFAlunos}
                        className="w-full sm:w-auto justify-center flex items-center gap-2 px-6 py-3 bg-black text-white rounded-xl font-bold hover:bg-black/80 transition-all shadow-lg active:scale-95"
                    >
                        <FileDown size={20} />
                        Baixar PDF
                    </button>
                </div>
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-start justify-center z-50 p-4 overflow-y-auto pt-10 pb-10">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl flex flex-col min-h-fit overflow-hidden"
                    >
                        {/* Header Fixo */}
                        <div className="px-8 py-5 border-b border-black/5 flex justify-between items-center bg-[#FDFCFB] shrink-0">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-[#00A859]/10 flex items-center justify-center text-[#00A859]">
                                    <Icons.User size={22} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-xl text-black/80">{editingStudent ? 'Editar Aluno' : 'Novo Aluno'}</h3>
                                    <p className="text-xs text-black/40 font-medium">Preencha todos os dados pedagógicos</p>
                                </div>
                            </div>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2.5 hover:bg-black/5 rounded-full transition-colors text-black/40 hover:text-black/80"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Conteúdo com Scroll Interno - Garantindo visibilidade total */}
                        <div className="p-0 overflow-y-auto flex-1 custom-scrollbar" style={{ minHeight: '100%' }}>
                            <form onSubmit={handleSubmit} className="p-8 space-y-8">

                                {/* Seção 1: Informações Básicas */}
                                <section className="space-y-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-4 bg-[#00A859] rounded-full"></div>
                                        <h4 className="text-sm font-black text-black/40 uppercase tracking-widest">Informações Básicas</h4>
                                    </div>

                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-black text-black/50 mb-2 uppercase tracking-tighter">Nome Completo do Aluno *</label>
                                            <input
                                                type="text"
                                                required
                                                value={formData.nome || ''}
                                                onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                                className="w-full px-5 py-4 bg-black/5 border-2 border-transparent rounded-2xl focus:border-[#00A859]/20 focus:bg-white focus:ring-0 outline-none transition-all font-bold text-lg"
                                                placeholder="Digite o nome completo..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-xs font-black text-black/50 mb-2 uppercase tracking-tighter">Data de Nascimento</label>
                                                <input
                                                    type="date"
                                                    value={formData.data_nascimento || ''}
                                                    onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                                                    className="w-full px-5 py-4 bg-black/5 border-2 border-transparent rounded-2xl focus:border-[#00A859]/20 focus:bg-white outline-none transition-all font-medium"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-black text-black/50 mb-2 uppercase tracking-tighter">Status no Sistema</label>
                                                <select
                                                    value={formData.status || 'ativo'}
                                                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                                    className="w-full px-5 py-4 bg-black/5 border-2 border-transparent rounded-2xl focus:border-[#00A859]/20 focus:bg-white outline-none transition-all font-bold"
                                                >
                                                    <option value="ativo">✅ Ativo</option>
                                                    <option value="inativo">❌ Inativo</option>
                                                </select>
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-black/50 mb-2 uppercase tracking-tighter">Série / Nível</label>
                                            <input
                                                type="text"
                                                value={formData.serie || ''}
                                                onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                                                className="w-full px-5 py-4 bg-black/5 border-2 border-transparent rounded-2xl focus:border-[#00A859]/20 focus:bg-white outline-none transition-all font-medium"
                                                placeholder="Ex: 5º Ano A"
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Seção 2: Responsáveis e Contatos */}
                                <section className="space-y-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-4 bg-blue-500 rounded-full"></div>
                                        <h4 className="text-sm font-black text-black/40 uppercase tracking-widest">Responsáveis e Contatos</h4>
                                    </div>

                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-slate-50/50 p-6 rounded-[24px] border border-slate-100">
                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Responsável Principal</label>
                                                <input
                                                    type="text"
                                                    value={formData.responsavel1_nome || ''}
                                                    onChange={(e) => setFormData({ ...formData, responsavel1_nome: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500/30 focus:ring-0 outline-none transition-all font-medium"
                                                    placeholder="Nome do Responsável 1"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    value={formData.responsavel1_telefone || ''}
                                                    onChange={(e) => setFormData({ ...formData, responsavel1_telefone: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500/30 focus:ring-0 outline-none transition-all font-medium"
                                                    placeholder="(00) 00000-0000"
                                                />
                                            </div>
                                        </div>

                                        <div className="space-y-4">
                                            <div>
                                                <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 px-1">Responsável Secundário</label>
                                                <input
                                                    type="text"
                                                    value={formData.responsavel2_nome || ''}
                                                    onChange={(e) => setFormData({ ...formData, responsavel2_nome: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500/30 focus:ring-0 outline-none transition-all font-medium"
                                                    placeholder="Nome do Responsável 2"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="text"
                                                    value={formData.responsavel2_telefone || ''}
                                                    onChange={(e) => setFormData({ ...formData, responsavel2_telefone: e.target.value })}
                                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl focus:border-blue-500/30 focus:ring-0 outline-none transition-all font-medium"
                                                    placeholder="(00) 00000-0000"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Seção 3: Desempenho Pedagógico */}
                                <section className="space-y-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-4 bg-amber-500 rounded-full"></div>
                                        <h4 className="text-sm font-black text-black/40 uppercase tracking-widest">Notas e Observações</h4>
                                    </div>

                                    <div className="bg-amber-50/30 p-6 rounded-[24px] border border-amber-100/50 space-y-6">
                                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                                            {([1, 2, 3, 4] as const).map(bim => (
                                                <div key={bim}>
                                                    <label className="block text-[10px] font-black text-amber-600/60 mb-2 uppercase text-center">{bim}º Bimestre</label>
                                                    <input
                                                        type="number" min="0" max="10" step="0.1"
                                                        value={(formData as any)[`nota_bimestre${bim}`] ?? ''}
                                                        onChange={(e) => setFormData({ ...formData, [`nota_bimestre${bim}`]: e.target.value !== '' ? parseFloat(e.target.value) : null })}
                                                        className="w-full px-2 py-4 bg-white border-2 border-amber-100 rounded-2xl focus:border-amber-400 outline-none transition-all font-black text-center text-xl shadow-sm"
                                                        placeholder="—"
                                                    />
                                                </div>
                                            ))}
                                        </div>

                                        <div>
                                            <label className="block text-xs font-black text-black/50 mb-2 uppercase tracking-tighter">Observações Curtas (Perfil do Aluno)</label>
                                            <textarea
                                                value={formData.nota || ''}
                                                onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                                                className="w-full px-5 py-4 bg-white border border-amber-100 rounded-2xl focus:border-amber-400 outline-none transition-all font-medium min-h-[80px] resize-none"
                                                placeholder="Ex: Aluno dedicado, dificuldade em interpretação de texto..."
                                            />
                                        </div>
                                    </div>
                                </section>

                                {/* Seção 4: Educação Inclusiva */}
                                <section className="space-y-5">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-4 bg-blue-600 rounded-full"></div>
                                        <h4 className="text-sm font-black text-black/40 uppercase tracking-widest">Educação Inclusiva</h4>
                                    </div>

                                    <div className={cn(
                                        "p-6 rounded-[24px] border-2 transition-all cursor-pointer",
                                        formData.necessidades_especiais ? "bg-blue-50/50 border-blue-500/20" : "bg-slate-50/50 border-transparent"
                                    )} onClick={() => setFormData({ ...formData, necessidades_especiais: !formData.necessidades_especiais })}>
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "w-12 h-12 rounded-2xl flex items-center justify-center transition-all shadow-sm",
                                                formData.necessidades_especiais ? "bg-blue-600 text-white" : "bg-white text-slate-400"
                                            )}>
                                                <Accessibility size={24} />
                                            </div>
                                            <div className="flex-1">
                                                <h5 className="font-black text-slate-700">Aluno com NEE / PCD</h5>
                                                <p className="text-xs text-slate-500 font-medium">{formData.necessidades_especiais ? "Recursos de inclusão ativados" : "Clique para ativar recursos de inclusão"}</p>
                                            </div>
                                            <div className={cn(
                                                "w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all",
                                                formData.necessidades_especiais ? "bg-blue-600 border-blue-600" : "bg-white border-slate-300"
                                            )}>
                                                {formData.necessidades_especiais && <Check size={14} className="text-white" />}
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {formData.necessidades_especiais && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: 'auto', opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="mt-6 space-y-2">
                                                        <label className="text-[10px] font-black text-blue-600/60 uppercase tracking-widest ml-1">Descrição das Limitações e Adaptações</label>
                                                        <textarea
                                                            onClick={(e) => e.stopPropagation()}
                                                            value={formData.limitacoes_pcd || ''}
                                                            onChange={(e) => setFormData({ ...formData, limitacoes_pcd: e.target.value })}
                                                            placeholder="Descreva as adaptações curriculares e limitações..."
                                                            className="w-full px-5 py-4 bg-white border border-blue-200 rounded-2xl focus:border-blue-400 outline-none transition-all min-h-[120px] resize-none text-sm font-medium"
                                                        />
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                </section>

                                {/* Seção 5: Histórico de Presença (Apenas na Edição) */}
                                {editingStudent && (
                                    <section className="space-y-5">
                                        <div className="flex items-center gap-2 mb-2">
                                            <div className="w-1.5 h-4 bg-slate-700 rounded-full"></div>
                                            <h4 className="text-sm font-black text-black/40 uppercase tracking-widest">Histórico de Presença</h4>
                                        </div>

                                        <div className="bg-slate-50 p-6 rounded-[24px] border border-slate-200 space-y-6">
                                            {/* Add New Quick Entry */}
                                            <div className="flex items-end gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Data</label>
                                                    <input
                                                        type="date"
                                                        value={newAttendanceDate}
                                                        onChange={(e) => setNewAttendanceDate(e.target.value)}
                                                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-[#00A859]/20"
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-1.5">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                                                    <select
                                                        value={newAttendanceStatus}
                                                        onChange={(e) => setNewAttendanceStatus(e.target.value as any)}
                                                        className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-black text-[#00A859] outline-none focus:ring-2 focus:ring-[#00A859]/20"
                                                    >
                                                        <option value="Presente">Presente</option>
                                                        <option value="Faltou">Faltou</option>
                                                    </select>
                                                </div>
                                                <button
                                                    type="button"
                                                    onClick={handleAddHistoryPresence}
                                                    className="bg-[#00A859] text-white p-3.5 rounded-xl hover:bg-[#008F4C] transition-colors shadow-lg shadow-[#00A859]/20 flex items-center justify-center active:scale-95"
                                                >
                                                    <Plus size={20} />
                                                </button>
                                            </div>

                                            {/* History Table */}
                                            <div className="max-h-60 overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                                {attendanceHistory.length === 0 ? (
                                                    <div className="text-center py-10 bg-white/50 rounded-2xl border border-dashed border-slate-300">
                                                        <Icons.History size={32} className="mx-auto text-slate-300 mb-2" />
                                                        <p className="text-xs font-bold text-slate-400">Nenhum registro histórico.</p>
                                                    </div>
                                                ) : (
                                                    attendanceHistory.map(record => (
                                                        <div key={record.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-[#00A859]/30 transition-all group shadow-sm">
                                                            <div className="flex items-center gap-4">
                                                                <div className={cn(
                                                                    "w-3 h-3 rounded-full shadow-sm",
                                                                    record.status === 'Presente' ? "bg-emerald-500" : "bg-red-500"
                                                                )} />
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-700">{new Date(record.data).toLocaleDateString('pt-BR')}</p>
                                                                    <span className={cn(
                                                                        "text-[10px] font-black uppercase tracking-widest",
                                                                        record.status === 'Presente' ? "text-emerald-500" : "text-red-500"
                                                                    )}>
                                                                        {record.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDeleteHistoryPresence(record.id)}
                                                                className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-xl opacity-0 group-hover:opacity-100 transition-all"
                                                            >
                                                                <Trash2 size={18} />
                                                            </button>
                                                        </div>
                                                    ))
                                                )}
                                            </div>
                                        </div>
                                    </section>
                                )}

                                {/* Espaçador para não grudar no rodapé */}
                                <div className="h-4"></div>
                            </form>
                        </div>

                        {/* Footer Fixo */}
                        <div className="px-8 py-6 border-t border-black/5 flex flex-wrap gap-4 bg-[#FDFCFB] shrink-0">
                            <button
                                type="button"
                                onClick={() => setIsModalOpen(false)}
                                className="flex-1 min-w-[120px] py-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black rounded-2xl transition-all active:scale-95 uppercase tracking-widest text-xs"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleSubmit}
                                className="flex-[2] min-w-[200px] py-4 bg-[#00A859] hover:bg-[#008F4C] text-white font-black rounded-2xl shadow-xl shadow-[#00A859]/30 transition-all active:scale-95 uppercase tracking-widest text-xs flex items-center justify-center gap-2"
                            >
                                {editingStudent ? 'Salvar Alterações' : 'Confirmar Cadastro'}
                                <Check size={18} />
                            </button>
                            {editingStudent && (
                                <button
                                    type="button"
                                    onClick={() => exportarPDFAluno(editingStudent)}
                                    className="w-14 h-14 bg-black text-white rounded-2xl shadow-xl hover:bg-black/80 transition-all flex items-center justify-center active:scale-95 shrink-0"
                                    title="Exportar Aluno para PDF"
                                >
                                    <FileDown size={24} />
                                </button>
                            )}
                        </div>
                    </motion.div>
                </div>
            )}

            {/* NOVO: Modal de Presença Rápida (Apenas Calendário e Histórico) */}
            <AnimatePresence>
                {isPresenceModalOpen && editingStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsPresenceModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-white w-full max-w-md rounded-[32px] shadow-2xl relative z-10 overflow-hidden"
                        >
                            <div className="p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center shadow-sm">
                                            <Icons.Calendar size={24} />
                                        </div>
                                        <div>
                                            <h3 className="text-xl font-black text-slate-800 leading-tight">{editingStudent.nome}</h3>
                                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Frequência e Calendário</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setIsPresenceModalOpen(false)}
                                        className="w-10 h-10 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center hover:bg-slate-200 hover:text-slate-600 transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    {/* Marcador de Nova Presença */}
                                    <div className="bg-slate-50 p-5 rounded-3xl border border-slate-100 space-y-4">
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data</label>
                                                <input
                                                    type="date"
                                                    value={newAttendanceDate}
                                                    onChange={(e) => setNewAttendanceDate(e.target.value)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                />
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                                <select
                                                    value={newAttendanceStatus}
                                                    onChange={(e) => setNewAttendanceStatus(e.target.value as any)}
                                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500/20"
                                                >
                                                    <option value="Presente">Presente</option>
                                                    <option value="Faltou">Faltou</option>
                                                </select>
                                            </div>
                                        </div>
                                        <button
                                            onClick={handleAddHistoryPresence}
                                            className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 active:scale-95"
                                        >
                                            <Plus size={20} />
                                            Registrar Frequência
                                        </button>
                                    </div>

                                    {/* Lista Histórica */}
                                    <div className="space-y-3">
                                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Histórico Recente</h4>
                                        <div className="max-h-[280px] overflow-y-auto pr-2 custom-scrollbar space-y-2">
                                            {attendanceHistory.length === 0 ? (
                                                <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                                                    <p className="text-xs font-bold text-slate-400">Nenhuma data marcada.</p>
                                                </div>
                                            ) : (
                                                attendanceHistory.map(record => (
                                                    <div key={record.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-emerald-500/30 transition-all group shadow-sm">
                                                        <div className="flex items-center gap-4">
                                                            <div className={cn(
                                                                "w-3 h-3 rounded-full",
                                                                record.status === 'Presente' ? "bg-emerald-500" : "bg-red-500"
                                                            )} />
                                                            <div>
                                                                <p className="text-sm font-bold text-slate-700">{new Date(record.data).toLocaleDateString('pt-BR')}</p>
                                                                <span className={cn(
                                                                    "text-[10px] font-black uppercase tracking-widest",
                                                                    record.status === 'Presente' ? "text-emerald-500" : "text-red-500"
                                                                )}>
                                                                    {record.status}
                                                                </span>
                                                            </div>
                                                        </div>
                                                        <button
                                                            onClick={() => handleDeleteHistoryPresence(record.id)}
                                                            className="w-8 h-8 flex items-center justify-center text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* NOVO: Modal de Histórico Integral do Aluno */}
            <AnimatePresence>
                {isHistoryModalOpen && selectedStudent && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsHistoryModalOpen(false)}
                            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                        />

                        <motion.div
                            initial={{ scale: 0.95, opacity: 0, y: 20 }}
                            animate={{ scale: 1, opacity: 1, y: 0 }}
                            exit={{ scale: 0.95, opacity: 0, y: 20 }}
                            className="bg-[#FDFCFB] w-full max-w-4xl rounded-[40px] shadow-2xl relative z-10 overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Top header with gradient */}
                            <div className="relative shrink-0 bg-gradient-to-r from-emerald-600 to-[#00A859] p-8 text-white">
                                <div className="absolute top-4 right-4 flex items-center gap-2">
                                    <button
                                        onClick={() => exportarPDFAluno(selectedStudent)}
                                        className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all active:scale-95"
                                        title="Exportar Dossiê Completo em PDF"
                                    >
                                        <FileDown size={20} />
                                    </button>
                                    <button
                                        onClick={() => setIsHistoryModalOpen(false)}
                                        className="w-10 h-10 bg-white/10 hover:bg-white/20 text-white rounded-full flex items-center justify-center transition-all"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3 flex-wrap">
                                            <h3 className="text-3xl font-black tracking-tight">{selectedStudent.nome}</h3>
                                            <span className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${selectedStudent.status === 'ativo' ? 'bg-white/20 text-white' : 'bg-red-500/20 text-red-100'}`}>
                                                {selectedStudent.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                            </span>
                                            {selectedStudent.necessidades_especiais && (
                                                <span className="px-3 py-1 bg-blue-500/20 text-blue-100 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1">
                                                    <Accessibility size={12} /> Inclusão PCD
                                                </span>
                                            )}
                                        </div>
                                        <p className="text-sm text-emerald-100/90 font-medium flex items-center gap-2">
                                            <span>Série: <strong>{selectedStudent.serie || 'Não informada'}</strong></span>
                                            <span>•</span>
                                            <span>Nascimento: <strong>{selectedStudent.data_nascimento ? new Date(selectedStudent.data_nascimento).toLocaleDateString('pt-BR') : '-'}</strong></span>
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {/* Tabs Navigation */}
                            <div className="bg-white border-b border-black/5 flex overflow-x-auto shrink-0 scrollbar-none">
                                {[
                                    { id: 'profile', label: 'Cadastro e Responsáveis', icon: Icons.User },
                                    { id: 'academic', label: 'Notas e Pareceres', icon: Icons.GraduationCap },
                                    { id: 'plans', label: 'Planejamentos Pedagógicos', icon: Icons.ClipboardList },
                                    { id: 'presences', label: 'Frequência Recente', icon: Icons.Calendar }
                                ].map((tab) => {
                                    const TabIcon = tab.icon;
                                    const isActive = activeHistoryTab === tab.id;
                                    return (
                                        <button
                                            key={tab.id}
                                            type="button"
                                            onClick={() => setActiveHistoryTab(tab.id as any)}
                                            className={cn(
                                                "flex items-center gap-2 px-6 py-4 text-sm font-bold border-b-2 whitespace-nowrap transition-all outline-none",
                                                isActive 
                                                    ? "border-[#00A859] text-[#00A859] bg-[#00A859]/5" 
                                                    : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50"
                                            )}
                                        >
                                            <TabIcon size={16} />
                                            {tab.label}
                                        </button>
                                    );
                                })}
                            </div>

                            {/* Content Area with scroll */}
                            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                                {isHistoryLoading ? (
                                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                                        <div className="w-12 h-12 border-4 border-[#00A859] border-t-transparent rounded-full animate-spin"></div>
                                        <p className="text-sm font-medium text-slate-400">Compilando dossiê do estudante...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        {activeHistoryTab === 'profile' && (
                                            <div className="grid md:grid-cols-2 gap-8">
                                                {/* Left Column: Responsibles & Info */}
                                                <div className="space-y-6">
                                                    <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
                                                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                            <Icons.Users size={16} className="text-[#00A859]" />
                                                            Responsáveis pelo Aluno
                                                        </h4>
                                                        <div className="space-y-3 divide-y divide-slate-100">
                                                            <div className="pt-1">
                                                                <p className="text-xs text-slate-400 font-bold">Responsável Principal</p>
                                                                <p className="text-sm font-bold text-slate-700 mt-0.5">{selectedStudent.responsavel1_nome || 'Não cadastrado'}</p>
                                                                {selectedStudent.responsavel1_telefone && (
                                                                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">{selectedStudent.responsavel1_telefone}</p>
                                                                )}
                                                            </div>
                                                            <div className="pt-3">
                                                                <p className="text-xs text-slate-400 font-bold">Responsável Secundário</p>
                                                                <p className="text-sm font-bold text-slate-700 mt-0.5">{selectedStudent.responsavel2_nome || 'Não cadastrado'}</p>
                                                                {selectedStudent.responsavel2_telefone && (
                                                                    <p className="text-xs text-emerald-600 font-semibold mt-0.5">{selectedStudent.responsavel2_telefone}</p>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {selectedStudent.necessidades_especiais && (
                                                        <div className="bg-blue-50/50 border border-blue-100 p-6 rounded-3xl space-y-3">
                                                            <h4 className="text-xs font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                                                <Accessibility size={16} />
                                                                Educação Especial (Inclusão)
                                                            </h4>
                                                            <div>
                                                                <p className="text-xs text-blue-500 font-bold">Limitações / Acompanhamento Pedagógico PCD</p>
                                                                <p className="text-sm font-semibold text-blue-900 mt-1 leading-relaxed whitespace-pre-line">
                                                                    {selectedStudent.limitacoes_pcd || 'Não detalhadas.'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Right Column: Observations */}
                                                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-4">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                        <Icons.MessageSquare size={16} className="text-[#00A859]" />
                                                        Observações e Notas Gerais do Professor
                                                    </h4>
                                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line bg-slate-50/50 p-4 rounded-2xl border border-slate-100 min-h-[150px]">
                                                        {selectedStudent.nota || 'Nenhuma observação geral registrada para este aluno.'}
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {activeHistoryTab === 'academic' && (
                                            <div className="space-y-8">
                                                {/* Bimestrais Grade Grid */}
                                                <div className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm space-y-6">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                        <Icons.BarChart2 size={16} className="text-[#00A859]" />
                                                        Aproveitamento Escolar (Notas Bimestrais)
                                                    </h4>
                                                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                                                        {[
                                                            { label: '1º Bimestre', val: selectedStudent.nota_bimestre1 },
                                                            { label: '2º Bimestre', val: selectedStudent.nota_bimestre2 },
                                                            { label: '3º Bimestre', val: selectedStudent.nota_bimestre3 },
                                                            { label: '4º Bimestre', val: selectedStudent.nota_bimestre4 }
                                                        ].map((item, index) => {
                                                            const isSet = item.val != null;
                                                            const colorClass = !isSet ? "bg-slate-50 border-slate-100 text-slate-300" :
                                                                               item.val! >= 7 ? "bg-emerald-50 border-emerald-100 text-emerald-700" :
                                                                               item.val! >= 5 ? "bg-amber-50 border-amber-100 text-amber-700" :
                                                                               "bg-red-50 border-red-100 text-red-700";
                                                            return (
                                                                <div key={index} className={cn("p-4 rounded-2xl border text-center space-y-1.5 transition-all shadow-sm", colorClass)}>
                                                                    <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{item.label}</p>
                                                                    <p className="text-2xl font-black">
                                                                        {isSet ? Number(item.val).toFixed(1) : '—'}
                                                                    </p>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>

                                                {/* Relatorios list */}
                                                <div className="space-y-4">
                                                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                                                        <ClipboardList size={16} className="text-[#00A859]" />
                                                        Histórico de Relatórios e Pareceres ({studentHistoryData.relatorios.length})
                                                    </h4>
                                                    {studentHistoryData.relatorios.length === 0 ? (
                                                        <div className="text-center py-12 bg-white rounded-3xl border border-black/5 shadow-sm text-slate-400">
                                                            <Icons.FileText size={40} className="mx-auto mb-3 opacity-20" />
                                                            <p className="text-sm font-bold">Nenhum parecer ou relatório pedagógico registrado para este aluno.</p>
                                                        </div>
                                                    ) : (
                                                        <div className="grid gap-4">
                                                            {studentHistoryData.relatorios.map((r, idx) => (
                                                                <div key={idx} className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:border-[#00A859]/30 transition-all space-y-3">
                                                                    <div className="flex flex-wrap items-start justify-between gap-2">
                                                                        <div>
                                                                            <h5 className="font-bold text-slate-800 text-base">{r.titulo_registro}</h5>
                                                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] font-semibold text-slate-400">
                                                                                <span className="flex items-center gap-1"><Icons.Calendar size={12} /> {new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
                                                                                {r.componente_curricular && <span>• Comp. Curricular: <strong>{r.componente_curricular}</strong></span>}
                                                                                {r.periodo && <span>• Período: <strong>{r.periodo}</strong></span>}
                                                                            </div>
                                                                        </div>
                                                                        <span className="px-2.5 py-1 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-black uppercase tracking-wider">{r.tom_texto || 'Formal'}</span>
                                                                    </div>
                                                                    <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-line border-t border-slate-50 pt-3">
                                                                        {r.conteudo}
                                                                    </p>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {activeHistoryTab === 'plans' && (
                                            <div className="space-y-4">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2 ml-1">
                                                    <Icons.BookOpen size={16} className="text-[#00A859]" />
                                                    Planejamentos Pedagógicos Vinculados ({studentHistoryData.planejamentos.length})
                                                </h4>
                                                {studentHistoryData.planejamentos.length === 0 ? (
                                                    <div className="text-center py-12 bg-white rounded-3xl border border-black/5 shadow-sm text-slate-400">
                                                        <Icons.BookOpen size={40} className="mx-auto mb-3 opacity-20" />
                                                        <p className="text-sm font-bold">Nenhum planejamento vinculado encontrado para este aluno.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-4">
                                                        {studentHistoryData.planejamentos.map((p, idx) => (
                                                            <div key={idx} className="bg-white p-6 rounded-3xl border border-black/5 shadow-sm hover:border-[#00A859]/30 transition-all space-y-4">
                                                                <div className="flex flex-wrap items-start justify-between gap-2 border-b border-slate-50 pb-3">
                                                                    <div>
                                                                        <h5 className="font-bold text-slate-800 text-base">{p.titulo_registro || `Planejamento ${p.tipo_planejamento}`}</h5>
                                                                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-[11px] font-semibold text-slate-400">
                                                                            <span className="flex items-center gap-1"><Icons.Calendar size={12} /> {p.data ? new Date(p.data).toLocaleDateString('pt-BR') : '-'}</span>
                                                                            {p.componente_curricular && <span>• Componente: <strong>{p.componente_curricular}</strong></span>}
                                                                            {p.ano_serie && <span>• Série: <strong>{p.ano_serie}</strong></span>}
                                                                        </div>
                                                                    </div>
                                                                    <span className="px-3 py-1 bg-emerald-50 text-[#00A859] rounded-xl text-[10px] font-black uppercase tracking-wider">{p.tipo_planejamento}</span>
                                                                </div>

                                                                {/* Plan details */}
                                                                <div className="grid sm:grid-cols-2 gap-6 text-sm">
                                                                    <div className="space-y-1.5">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Objetivos de Aprendizagem</p>
                                                                        <p className="text-slate-700 leading-relaxed bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/50 font-medium whitespace-pre-line">{p.objetivos_aprendizagem || '-'}</p>
                                                                    </div>
                                                                    <div className="space-y-1.5">
                                                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Atividades Planejadas</p>
                                                                        <p className="text-slate-700 leading-relaxed bg-slate-50/50 p-3.5 rounded-2xl border border-slate-100/50 font-medium whitespace-pre-line">{p.atividades_planejadas || '-'}</p>
                                                                    </div>
                                                                </div>

                                                                {(p.recursos_didaticos || p.avaliacao_acompanhamento) && (
                                                                    <div className="grid sm:grid-cols-2 gap-6 text-sm border-t border-slate-50/50 pt-3">
                                                                        {p.recursos_didaticos && (
                                                                            <div className="space-y-1">
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Recursos Didáticos</p>
                                                                                <p className="text-xs text-slate-600 font-medium">{p.recursos_didaticos}</p>
                                                                            </div>
                                                                        )}
                                                                        {p.avaliacao_acompanhamento && (
                                                                            <div className="space-y-1">
                                                                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Avaliação e Acompanhamento</p>
                                                                                <p className="text-xs text-slate-600 font-medium">{p.avaliacao_acompanhamento}</p>
                                                                            </div>
                                                                        )}
                                                                    </div>
                                                                )}

                                                                {p.bncc_codes && Array.isArray(p.bncc_codes) && p.bncc_codes.length > 0 && (
                                                                    <div className="flex flex-wrap items-center gap-1.5 pt-1">
                                                                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1.5">BNCC:</span>
                                                                        {p.bncc_codes.map((code: string) => (
                                                                            <span key={code} className="px-2.5 py-1 bg-slate-800 text-white rounded-lg text-[9px] font-black tracking-wider">{code}</span>
                                                                        ))}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {activeHistoryTab === 'presences' && (
                                            <div className="space-y-6 bg-white p-6 rounded-3xl border border-black/5 shadow-sm">
                                                <h4 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                                                    <Icons.Calendar size={16} className="text-[#00A859]" />
                                                    Histórico Consolidado de Presenças
                                                </h4>
                                                {studentHistoryData.attendances.length === 0 ? (
                                                    <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200 text-slate-400">
                                                        <p className="text-xs font-bold">Nenhum registro de presença encontrado para este aluno.</p>
                                                    </div>
                                                ) : (
                                                    <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                                                        {studentHistoryData.attendances.map((record, index) => (
                                                            <div key={record.id || index} className="flex items-center gap-3 p-4 bg-slate-50/50 border border-slate-100 rounded-2xl">
                                                                <div className={cn(
                                                                    "w-3 h-3 rounded-full shrink-0",
                                                                    record.status === 'Presente' ? "bg-emerald-500" : "bg-red-500"
                                                                )} />
                                                                <div>
                                                                    <p className="text-sm font-bold text-slate-700">{new Date(record.data).toLocaleDateString('pt-BR')}</p>
                                                                    <span className={cn(
                                                                        "text-[9px] font-black uppercase tracking-widest",
                                                                        record.status === 'Presente' ? "text-emerald-500" : "text-red-500"
                                                                    )}>
                                                                        {record.status}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="px-8 py-5 border-t border-black/5 bg-[#FDFCFB] flex justify-between items-center shrink-0">
                                <button
                                    onClick={() => exportarPDFAluno(selectedStudent)}
                                    className="flex items-center gap-2 px-5 py-3 bg-black hover:bg-black/80 text-white font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95 shadow-lg"
                                >
                                    <FileDown size={18} />
                                    Baixar PDF
                                </button>
                                <button
                                    onClick={() => setIsHistoryModalOpen(false)}
                                    className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs uppercase tracking-widest rounded-2xl transition-all active:scale-95"
                                >
                                    Fechar Ficha
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

        </div>
    );
}

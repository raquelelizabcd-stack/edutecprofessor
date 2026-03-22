import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Student } from '../types';
import { Plus, Edit2, Trash2, Search, X, Accessibility, ClipboardList } from 'lucide-react';

interface StudentManagerProps {
    professorId: string;
}

export default function StudentManager({ professorId }: StudentManagerProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [formData, setFormData] = useState<Partial<Student>>({
        status: 'ativo',
        necessidades_especiais: false,
    });

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
                professor_id: professorId,
            };

            if (editingStudent) {
                const { error } = await supabase
                    .from('alunos')
                    .update(dataToSave)
                    .eq('id', editingStudent.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('alunos')
                    .insert([dataToSave]);
                if (error) throw error;
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

    const openModal = (student?: Student) => {
        if (student) {
            setEditingStudent(student);
            setFormData(student);
        } else {
            setEditingStudent(null);
            setFormData({ status: 'ativo', necessidades_especiais: false });
        }
        setIsModalOpen(true);
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
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <h2 className="text-2xl font-bold">Meus Alunos</h2>
                <button
                    onClick={() => openModal()}
                    className="bg-[#00A859] text-white px-4 py-2 rounded-xl flex items-center gap-2 hover:bg-[#008F4C] transition-colors"
                >
                    <Plus size={20} />
                    <span>Novo Aluno</span>
                </button>
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

                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-black/5">
                                <th className="text-left font-semibold text-black/60 pb-4 px-4">Nome</th>
                                <th className="text-left font-semibold text-black/60 pb-4 px-4">Série/Nível</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4">1º Bim</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4">2º Bim</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4">3º Bim</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4">4º Bim</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4">Status</th>
                                <th className="text-center font-semibold text-black/60 pb-4 px-4">Recursos</th>
                                <th className="text-right font-semibold text-black/60 pb-4 px-4">Ações</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredStudents.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="text-center py-8 text-black/40">
                                        Nenhum aluno encontrado.
                                    </td>
                                </tr>
                            ) : (
                                filteredStudents.map((student) => (
                                    <tr key={student.id} className="border-b border-black/5 last:border-0 hover:bg-black/5 transition-colors">
                                        <td className="py-4 px-4 font-medium text-black/80">{student.nome}</td>
                                        <td className="py-4 px-4 text-black/60">{student.serie || '-'}</td>
                                        {/* Notas bimestrais */}
                                        {(['nota_bimestre1','nota_bimestre2','nota_bimestre3','nota_bimestre4'] as const).map((campo, idx) => {
                                          const nota = (student as any)[campo];
                                          const cor = nota == null ? 'text-black/30' : nota >= 7 ? 'text-emerald-600 font-bold' : nota >= 5 ? 'text-amber-600 font-bold' : 'text-red-500 font-bold';
                                          return (
                                            <td key={campo} className={`py-4 px-4 text-center text-sm ${cor}`}>
                                              {nota != null ? Number(nota).toFixed(1) : <span className="text-black/20">—</span>}
                                            </td>
                                          );
                                        })}
                                        <td className="py-4 px-4 text-center">
                                            <span className={`inline-flex px-2 !py-1 text-xs font-semibold rounded-full ${student.status === 'ativo' ? 'bg-[#00A859]/10 text-[#00A859]' : 'bg-red-100 text-red-600'}`}>
                                                {student.status === 'ativo' ? 'Ativo' : 'Inativo'}
                                            </span>
                                        </td>
                                        <td className="py-4 px-4 text-center">
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
                                        <td className="py-4 px-4 text-right">
                                            <div className="flex justify-end gap-2">
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
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 font-sans">
                    <div className="bg-white rounded-[24px] w-full max-w-lg overflow-hidden shadow-2xl">
                        <div className="px-6 py-4 border-b border-black/5 flex justify-between items-center bg-[#FDFCFB]">
                            <h3 className="font-bold text-lg">{editingStudent ? 'Editar Aluno' : 'Cadastrar Aluno'}</h3>
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="p-2 hover:bg-black/5 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-5">
                            <div>
                                <label className="block text-sm font-semibold text-black/70 mb-1.5 focus-within:text-[#00A859]">Nome Completo *</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.nome || ''}
                                    onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                                    className="w-full px-4 py-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all font-medium"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-black/70 mb-1.5 focus-within:text-[#00A859]">Data de Nascimento</label>
                                    <input
                                        type="date"
                                        value={formData.data_nascimento || ''}
                                        onChange={(e) => setFormData({ ...formData, data_nascimento: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all font-medium text-black/80"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-black/70 mb-1.5 focus-within:text-[#00A859]">Status</label>
                                    <select
                                        value={formData.status || 'ativo'}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all font-medium appearance-none"
                                    >
                                        <option value="ativo">Ativo</option>
                                        <option value="inativo">Inativo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-black/70 mb-1.5 focus-within:text-[#00A859]">Série/Nível (Ex: 5º Ano / Intermediário)</label>
                                    <input
                                        type="text"
                                        value={formData.serie || ''}
                                        onChange={(e) => setFormData({ ...formData, serie: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all font-medium"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-black/70 mb-1.5 focus-within:text-[#00A859]">Nota/Observação Curta</label>
                                    <input
                                        type="text"
                                        value={formData.nota || ''}
                                        onChange={(e) => setFormData({ ...formData, nota: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all font-medium"
                                        placeholder="Ex: Aluno dedicado, dificuldade em matemática"
                                    />
                                </div>
                            </div>
                            
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-black/70 mb-1.5 focus-within:text-[#00A859]">Responsável 1</label>
                                    <input
                                        type="text"
                                        value={formData.responsavel1_nome || ''}
                                        onChange={(e) => setFormData({ ...formData, responsavel1_nome: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all font-medium"
                                        placeholder="Nome"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-black/70 mb-1.5 focus-within:text-[#00A859]">Telefone (Resp. 1)</label>
                                    <input
                                        type="text"
                                        value={formData.responsavel1_telefone || ''}
                                        onChange={(e) => setFormData({ ...formData, responsavel1_telefone: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all font-medium"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-semibold text-black/70 mb-1.5 focus-within:text-[#00A859]">Responsável 2</label>
                                    <input
                                        type="text"
                                        value={formData.responsavel2_nome || ''}
                                        onChange={(e) => setFormData({ ...formData, responsavel2_nome: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all font-medium"
                                        placeholder="Nome"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-black/70 mb-1.5 focus-within:text-[#00A859]">Telefone (Resp. 2)</label>
                                    <input
                                        type="text"
                                        value={formData.responsavel2_telefone || ''}
                                        onChange={(e) => setFormData({ ...formData, responsavel2_telefone: e.target.value })}
                                        className="w-full px-4 py-3 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all font-medium"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                            </div>

                            {/* Notas Bimestrais */}
                            <div className="pt-2">
                                <div className="flex items-center gap-2 mb-3">
                                    <ClipboardList size={16} className="text-[#00A859]" />
                                    <span className="text-sm font-bold text-black/70">Notas Bimestrais</span>
                                </div>
                                <div className="grid grid-cols-4 gap-3">
                                    {([1,2,3,4] as const).map(bim => (
                                        <div key={bim}>
                                            <label className="block text-xs font-semibold text-black/50 mb-1.5">{bim}º Bimestre</label>
                                            <input
                                                type="number"
                                                min="0"
                                                max="10"
                                                step="0.1"
                                                value={(formData as any)[`nota_bimestre${bim}`] ?? ''}
                                                onChange={(e) => setFormData({ ...formData, [`nota_bimestre${bim}`]: e.target.value !== '' ? parseFloat(e.target.value) : null })}
                                                className="w-full px-3 py-2.5 bg-black/5 border-none rounded-xl focus:ring-2 focus:ring-[#00A859]/20 outline-none transition-all font-bold text-center text-lg"
                                                placeholder="—"
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="pt-2">
                                <label className="flex items-center gap-3 p-4 border border-black/10 rounded-xl cursor-pointer hover:bg-black/5 transition-colors">
                                    <div className={`w-6 h-6 rounded flex items-center justify-center border transition-colors ${formData.necessidades_especiais ? 'bg-[#00A859] border-[#00A859]' : 'border-black/20 bg-white'}`}>
                                        {formData.necessidades_especiais && <Check size={14} className="text-white" />}
                                    </div>
                                    <input
                                        type="checkbox"
                                        checked={formData.necessidades_especiais || false}
                                        onChange={(e) => setFormData({ ...formData, necessidades_especiais: e.target.checked })}
                                        className="hidden"
                                    />
                                    <div>
                                        <span className="font-semibold block">Educação Inclusiva (PCD)</span>
                                        <span className="text-xs text-black/60">Marcação para habilitar o uso do Parecer PCD Automático.</span>
                                    </div>
                                </label>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-3.5 bg-black/5 hover:bg-black/10 text-black font-semibold rounded-full transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-3.5 bg-[#00A859] hover:bg-[#008F4C] text-white font-semibold rounded-full shadow-lg shadow-[#00A859]/20 transition-all"
                                >
                                    {editingStudent ? 'Salvar Edição' : 'Cadastrar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}

// Inline Check Icon since we might not have it from lucide right away
const Check = ({ size, className }: { size: number, className: string }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

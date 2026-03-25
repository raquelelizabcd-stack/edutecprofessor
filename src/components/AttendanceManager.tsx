
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { Student } from '../types';
import * as Icons from 'lucide-react';
import { cn } from '../lib/utils';
import jsPDF from 'jspdf';

interface AttendanceManagerProps {
    professorId: string;
    professorNome: string;
}

export default function AttendanceManager({ professorId, professorNome }: AttendanceManagerProps) {
    const [students, setStudents] = useState<Student[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [attendance, setAttendance] = useState<Record<string, 'Presente' | 'Faltou'>>({});
    const [isSaving, setIsSaving] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());

    const dateString = selectedDate.toISOString().split('T')[0];

    useEffect(() => {
        fetchStudentsAndAttendance();
    }, [professorId, dateString]);

    const fetchStudentsAndAttendance = async () => {
        try {
            setIsLoading(true);
            // 1. Fetch Students
            const { data: studentsData, error: studentsError } = await supabase
                .from('alunos')
                .select('*')
                .eq('professor_id', professorId)
                .eq('status', 'ativo')
                .order('nome');

            if (studentsError) throw studentsError;
            setStudents(studentsData || []);

            // 2. Fetch Attendance for selected date from NEW table 'presenca_alunos'
            const { data: attendData, error: attendError } = await supabase
                .from('presenca_alunos')
                .select('*')
                .eq('professor_id', professorId)
                .eq('data', dateString);

            if (attendError) throw attendError;

            const initialAttendance: Record<string, 'Presente' | 'Faltou'> = {};
            attendData?.forEach(record => {
                if (record.aluno_id) {
                    initialAttendance[record.aluno_id] = record.status as 'Presente' | 'Faltou';
                }
            });
            setAttendance(initialAttendance);

        } catch (error) {
            console.error('Erro ao buscar dados de presença:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleToggleAttendance = (studentId: string) => {
        setAttendance(prev => ({
            ...prev,
            [studentId]: prev[studentId] === 'Presente' ? 'Faltou' : 'Presente'
        }));
    };

    const handleSaveAll = async () => {
        try {
            setIsSaving(true);
            
            const recordsToSave = students.map(student => ({
                professor_id: professorId,
                aluno_id: student.id,
                data: dateString,
                status: attendance[student.id] || 'Presente',
            }));

            // Delete existing for this date/professor to avoid duplicates
            const { error: deleteError } = await supabase
                .from('presenca_alunos')
                .delete()
                .eq('professor_id', professorId)
                .eq('data', dateString);

            if (deleteError) throw deleteError;

            if (recordsToSave.length > 0) {
                const { error: insertError } = await supabase
                    .from('presenca_alunos')
                    .insert(recordsToSave);

                if (insertError) throw insertError;
            }

            alert("Presença salva com sucesso para todos os alunos!");
        } catch (error: any) {
            console.error('Erro ao salvar presença:', error);
            alert("Erro ao salvar presença: " + error.message);
        } finally {
            setIsSaving(false);
        }
    };

    const handleExportPDF = () => {
        const doc = new jsPDF();
        const pageWidth = doc.internal.pageSize.width;

        doc.setFillColor(0, 168, 89);
        doc.rect(0, 0, pageWidth, 40, 'F');
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(22);
        doc.setFont("helvetica", "bold");
        doc.text("EduTecPro — Diário de Presença", 14, 25);
        
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(14);
        doc.text(`Professor: ${professorNome}`, 14, 50);
        doc.text(`Data: ${selectedDate.toLocaleDateString('pt-BR')}`, 14, 58);

        doc.setFillColor(240, 240, 240);
        doc.rect(14, 70, pageWidth - 28, 10, 'F');
        doc.setFontSize(10);
        doc.text("Nome do Aluno", 16, 76.5);
        doc.text("Status", pageWidth - 45, 76.5);

        let y = 88;
        students.forEach((student, index) => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            const status = attendance[student.id] || 'N/A';
            doc.text(`${index + 1}. ${student.nome}`, 16, y);
            
            if (status === 'Presente') doc.setTextColor(0, 150, 0);
            else if (status === 'Faltou') doc.setTextColor(200, 0, 0);
            
            doc.text(status, pageWidth - 45, y);
            doc.setTextColor(0, 0, 0);
            
            doc.setDrawColor(240, 240, 240);
            doc.line(14, y + 2, pageWidth - 14, y + 2);
            y += 10;
        });

        doc.save(`Presenca_${dateString}.pdf`);
    };

    // --- CALENDAR LOGIC ---
    const daysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const firstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const totalDays = daysInMonth(year, month);
        const startDay = firstDayOfMonth(year, month);
        
        const days = [];
        // Empty slots for previous month
        for (let i = 0; i < startDay; i++) {
            days.push(<div key={`empty-${i}`} className="h-10 w-10 md:h-12 md:w-12" />);
        }
        
        // Days of the month
        for (let day = 1; day <= totalDays; day++) {
            const date = new Date(year, month, day);
            const isSelected = date.toISOString().split('T')[0] === dateString;
            const isToday = date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0];
            
            days.push(
                <button
                    key={day}
                    onClick={() => setSelectedDate(date)}
                    className={cn(
                        "h-10 w-10 md:h-12 md:w-12 rounded-2xl flex items-center justify-center text-sm font-bold transition-all transform active:scale-95",
                        isSelected 
                            ? "bg-[#00A859] text-white shadow-lg shadow-[#00A859]/20 scale-110 z-10" 
                            : isToday 
                                ? "bg-emerald-50 text-[#00A859] border border-emerald-200" 
                                : "hover:bg-slate-50 text-slate-600"
                    )}
                >
                    {day}
                </button>
            );
        }
        return days;
    };

    const monthNames = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];
    
    const nextMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1));
    const prevMonth = () => setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1));

    // --- END CALENDAR LOGIC ---

    const filteredStudents = students.filter(s => 
        s.nome.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const presentCount = students.filter(s => attendance[s.id] === 'Presente').length;
    const absentCount = students.filter(s => attendance[s.id] === 'Faltou').length;

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Calendar Section */}
            <div className="bg-white rounded-[40px] border border-slate-200 shadow-xl overflow-hidden p-6 md:p-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Compact Interactive Calendar */}
                    <div className="flex-shrink-0 w-full lg:w-80">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-black text-slate-800 tracking-tight flex items-center gap-2">
                                <Icons.Calendar className="text-[#00A859]" size={20} />
                                {monthNames[currentMonth.getMonth()]} {currentMonth.getFullYear()}
                            </h3>
                            <div className="flex gap-1">
                                <button onClick={prevMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                                    <Icons.ChevronLeft size={20} />
                                </button>
                                <button onClick={nextMonth} className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-slate-400">
                                    <Icons.ChevronRight size={20} />
                                </button>
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-7 gap-1 mb-2">
                            {["D", "S", "T", "Q", "Q", "S", "S"].map(day => (
                                <div key={day} className="h-8 w-10 md:w-12 flex items-center justify-center text-[10px] font-black text-slate-300 uppercase letter tracking-widest">{day}</div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {renderCalendar()}
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-slate-100">
                            <div className="flex items-center justify-between mb-4">
                                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Data Selecionada</span>
                                <span className="text-sm font-black text-[#00A859]">{selectedDate.toLocaleDateString('pt-BR')}</span>
                            </div>
                            <button 
                                onClick={handleExportPDF}
                                className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-lg active:scale-95"
                            >
                                <Icons.FileDown size={18} />
                                Exportar PDF do Dia
                            </button>
                        </div>
                    </div>

                    {/* Stats and Search */}
                    <div className="flex-1 flex flex-col gap-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 group hover:border-[#00A859]/30 transition-colors">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 group-hover:text-[#00A859] transition-colors">Alunos Ativos</p>
                                <h4 className="text-3xl font-black mt-1 text-slate-800">{students.length}</h4>
                            </div>
                            <div className="bg-emerald-50/50 rounded-3xl p-6 border border-emerald-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">Presentes</p>
                                <h4 className="text-3xl font-black mt-1 text-emerald-700">{presentCount}</h4>
                            </div>
                            <div className="bg-red-50/50 rounded-3xl p-6 border border-red-100">
                                <p className="text-[10px] font-black uppercase tracking-widest text-red-600">Faltas</p>
                                <h4 className="text-3xl font-black mt-1 text-red-700">{absentCount}</h4>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 relative group">
                                <Icons.Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 transition-colors group-focus-within:text-[#00A859]" size={20} />
                                <input 
                                    type="text"
                                    placeholder="Localizar aluno..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="w-full pl-14 pr-8 py-4 bg-slate-50 border-2 border-slate-100 rounded-[28px] outline-none focus:bg-white focus:border-[#00A859]/30 transition-all font-medium text-slate-600"
                                />
                            </div>
                            <button 
                                onClick={() => {
                                    const newAttendance: Record<string, 'Presente' | 'Faltou'> = {};
                                    students.forEach(s => newAttendance[s.id] = 'Presente');
                                    setAttendance(newAttendance);
                                }}
                                className="px-8 py-4 bg-[#00A859]/10 text-[#00A859] rounded-[28px] font-black uppercase tracking-widest text-[10px] hover:bg-[#00A859] hover:text-white transition-all shadow-sm"
                            >
                                Todos Presentes
                            </button>
                        </div>

                        <div className="flex-1 min-h-[400px]">
                            {isLoading ? (
                                <div className="flex flex-col items-center justify-center h-full gap-4">
                                    <div className="w-12 h-12 border-4 border-[#00A859]/20 border-t-[#00A859] rounded-full animate-spin" />
                                    <p className="text-slate-400 font-bold text-sm uppercase tracking-widest">Carregando chamada...</p>
                                </div>
                            ) : filteredStudents.length === 0 ? (
                                <div className="flex flex-col items-center justify-center h-full text-center py-10 bg-slate-50/50 rounded-[40px] border-2 border-dashed border-slate-200">
                                    <Icons.Users className="text-slate-200 mb-4" size={64} />
                                    <h3 className="text-xl font-black text-slate-400">Nenhum aluno encontrado</h3>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
                                    <AnimatePresence mode="popLayout">
                                        {filteredStudents.map((student) => {
                                            const status = attendance[student.id] || 'Presente';
                                            const isPresent = status === 'Presente';

                                            return (
                                                <motion.div
                                                    key={student.id}
                                                    layout
                                                    initial={{ opacity: 0, scale: 0.9 }}
                                                    animate={{ opacity: 1, scale: 1 }}
                                                    exit={{ opacity: 0, scale: 0.9 }}
                                                    onClick={() => handleToggleAttendance(student.id)}
                                                    className={cn(
                                                        "p-4 rounded-[28px] border-2 transition-all cursor-pointer group select-none flex items-center gap-4",
                                                        isPresent 
                                                            ? "bg-emerald-50/20 border-emerald-100/30 hover:bg-emerald-50 hover:border-emerald-200" 
                                                            : "bg-red-50/20 border-red-100/30 hover:bg-red-50 hover:border-red-200"
                                                    )}
                                                >
                                                    <div className={cn(
                                                        "w-12 h-12 rounded-[20px] flex items-center justify-center text-lg font-black shadow-sm transition-transform group-active:scale-90",
                                                        isPresent ? "bg-[#00A859] text-white" : "bg-red-500 text-white"
                                                    )}>
                                                        {student.nome.charAt(0)}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <h4 className="font-black text-slate-700 truncate text-sm">{student.nome}</h4>
                                                        <span className={cn(
                                                            "text-[9px] font-black uppercase tracking-widest",
                                                            isPresent ? "text-emerald-600" : "text-red-600"
                                                        )}>
                                                            {status}
                                                        </span>
                                                    </div>
                                                    <div className={cn(
                                                        "w-7 h-7 rounded-full flex items-center justify-center transition-all",
                                                        isPresent ? "bg-emerald-100 text-[#00A859]" : "bg-red-100 text-red-600"
                                                    )}>
                                                        {isPresent ? <Icons.Check size={16} /> : <Icons.Minus size={16} />}
                                                    </div>
                                                </motion.div>
                                            );
                                        })}
                                    </AnimatePresence>
                                </div>
                            )}
                        </div>
                        
                        <div className="pt-6 border-t border-slate-100 flex justify-end">
                            <button
                                onClick={handleSaveAll}
                                disabled={isSaving || students.length === 0}
                                className="bg-[#00A859] hover:bg-[#008F4C] text-white px-10 py-4 rounded-3xl font-black uppercase tracking-widest text-[11px] shadow-xl shadow-[#00A859]/30 transition-all active:scale-95 disabled:opacity-50 flex items-center gap-3"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <Icons.Save size={18} />
                                )}
                                Salvar Atendimento do Aluno
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}



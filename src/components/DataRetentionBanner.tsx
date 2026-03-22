import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { UserProfile, PedagogicalRecord, Student } from '../types';
import { supabase } from '../lib/supabase';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

interface DataRetentionBannerProps {
    role: UserProfile;
    userCreatedAt: string | null;
    userDataExpiracao: string | null;
    records: PedagogicalRecord[];
    students: Student[];
}

export default function DataRetentionBanner({
    role,
    userCreatedAt,
    userDataExpiracao,
    records,
    students
}: DataRetentionBannerProps) {
    const [isDismissed, setIsDismissed] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [sendEmail, setSendEmail] = useState(false);
    const [exportFormat, setExportFormat] = useState<'pdf' | 'csv'>('pdf');

    if (role === 'diretor' || role === 'public' || isDismissed) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysPassed = 0;
    let daysLeft = 0;
    let showExportButton = false;
    let showWarningUI = false;
    let message = '';
    let title = '';
    let expirationDateStr = '';

    if (role === 'free') {
        if (!userCreatedAt) return null;
        const createdDate = new Date(userCreatedAt);
        createdDate.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today.getTime() - createdDate.getTime());
        daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        daysLeft = Math.max(0, 15 - daysPassed);

        const expDate = new Date(createdDate);
        expDate.setDate(expDate.getDate() + 15);
        expirationDateStr = expDate.toLocaleDateString('pt-BR');

        title = 'Aviso de Retenção de Dados (Plano Free)';
        message = `Os dados ficam armazenados por até 15 dias. Exportação disponível a partir do dia 10 e exclusão automática de todos os dados do professor no dia 15. Faltam ${daysLeft} dias para expirar.`;

        if (daysLeft <= 1) { // day 14 and 15
            showWarningUI = true;
            message = `ALERTA: Os dados ficam armazenados por até 15 dias. Exportação disponível a partir do dia 10 e exclusão automática de todos os dados do professor no dia 15. Faltam ${daysLeft} dias para expirar.`;
        }

        // Botão sempre disponível para o Plano Free conforme solicitado
        showExportButton = true;

        // Se a pessoa passou os 15 dias, a conta será deletada, mas enquanto a session ta ativa mostramos:
        if (daysLeft === 0) {
            message = `O tempo limite de retenção dos seus dados foi atingido (${expirationDateStr}). Eles podem ser excluídos a qualquer momento pelo sistema.`;
            showWarningUI = true;
        }

    } else if (role === 'pro') {
        if (!userDataExpiracao || new Date(userDataExpiracao) >= today) {
            const expDateStr = userDataExpiracao ? new Date(userDataExpiracao).toLocaleDateString('pt-BR') : 'Indeterminado';
            showExportButton = true; // Always available for active Pro
            return (
                <div className="bg-[#00A859]/10 border border-[#00A859]/20 p-4 rounded-xl flex items-start gap-4 mb-6 relative">
                    <button onClick={() => setIsDismissed(true)} className="absolute top-4 right-4 text-black/40 hover:text-black">
                        <Icons.X size={18} />
                    </button>
                    <Icons.ShieldCheck className="text-[#00A859] shrink-0 mt-0.5" size={24} />
                    <div className="pr-6 flex-1">
                        <h4 className="font-bold text-[#00A859] text-sm">Assinatura Ativa (Válida até {expDateStr})</h4>
                        <p className="text-sm text-black/70 mt-1 mb-3">
                            Sua assinatura está ativa. Os dados permanecem armazenados sem prazo de exclusão. Mantenha o pagamento em dia para continuar com os dados armazenados de forma segura.
                        </p>
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm text-black/70 select-none cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={sendEmail}
                                        onChange={(e) => setSendEmail(e.target.checked)}
                                        className="rounded border-gray-300 text-[#00A859] focus:ring-[#00A859]"
                                    />
                                    Enviar cópia por e-mail também
                                </label>
                                <select
                                    value={exportFormat}
                                    onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'csv')}
                                    className="text-xs font-bold border-black/10 rounded-lg py-1 px-2 bg-white outline-none focus:ring-1 focus:ring-[#00A859]"
                                >
                                    <option value="pdf">PDF</option>
                                    <option value="csv">CSV</option>
                                </select>
                            </div>
                            <button
                                onClick={() => exportData()}
                                disabled={isExporting}
                                className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors bg-[#00A859] hover:bg-[#008F4C] w-fit ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <Icons.Download size={16} />
                                {isExporting ? 'Exportando...' : 'Exportar Meus Registros'}
                            </button>
                        </div>
                    </div>
                </div>
            );
        } else {
            // Pro Vencido
            const expDate = new Date(userDataExpiracao);
            expDate.setHours(0, 0, 0, 0);

            const diffTime = Math.abs(today.getTime() - expDate.getTime());
            daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            daysLeft = Math.max(0, 30 - daysPassed);

            const exclusionDate = new Date(expDate);
            exclusionDate.setDate(exclusionDate.getDate() + 30);
            expirationDateStr = exclusionDate.toLocaleDateString('pt-BR');

            title = 'Aviso de Retenção de Dados (Assinatura Vencida)';
            message = `Os dados ficam armazenados até 30 dias após o vencimento da assinatura. Sendo excluídos automaticamente em ${expirationDateStr}.`;

            if (daysLeft <= 1) { // day 29 and 30
                showWarningUI = true;
                message = `ALERTA: Faltam ${daysLeft} dias para seus dados expirarem e serem excluídos automaticamente em ${expirationDateStr}.`;
            }

            if (daysPassed >= 20) {
                showExportButton = true;
            }

            if (daysLeft === 0) {
                message = `O tempo limite de retenção dos seus dados foi atingido (${expirationDateStr}). Eles podem ser excluídos a qualquer momento pelo sistema.`;
                showWarningUI = true;
            }
        }
    }

    // Only display the banner if there's a warning UI or an export button to show. Otherwise, it's just silence (or dismissal).
    if (!showWarningUI && !showExportButton && role !== 'free') return null; // free is always showing

    const exportData = async () => {
        setIsExporting(true);
        try {
            const allowedModules = ['planejamento-semanal', 'registro-mensal', 'planejamento-diario', 'relatorio-individual', 'relatorios-turma', 'parecer-pcd'];
            const recordsToExport = records.filter(r => allowedModules.includes(r.moduleId));

            if (recordsToExport.length === 0) {
                alert("Você ainda não possui registros pedagógicos para exportar.");
                setIsExporting(false);
                return;
            }

            if (exportFormat === 'csv') {
                // Generate CSV
                let csvContent = "Título,Data,Turma/Ano/Série,Componente Curricular,Detalhes do Registro\n";
                recordsToExport.forEach(r => {
                    const titulo = (r.title || '').replace(/"/g, '""');
                    const data = new Date(r.date + 'T00:00:00').toLocaleDateString('pt-BR');
                    const turmaSerie = `${r.turma || ''} ${r.yearGrade ? '/ ' + r.yearGrade : ''}`.trim().replace(/"/g, '""');
                    const componente = (r.curricularComponent || '').replace(/"/g, '""');
                    const detalhes = (r.description || r.objectives || '').replace(/"/g, '""');
                    csvContent += `"${titulo}","${data}","${turmaSerie}","${componente}","${detalhes}"\n`;
                });

                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
                const link = document.createElement("a");
                link.href = URL.createObjectURL(blob);
                link.download = `EduTecProfessor_Registros_${new Date().getTime()}.csv`;
                link.click();

                if (sendEmail) {
                    await supabase.functions.invoke('sendExportEmail', {
                        body: { csvContent, format: 'csv' }
                    });
                }
            } else {
                // Generate PDF
                const doc = new jsPDF();
                const pageWidth = doc.internal.pageSize.width;

                doc.setFillColor(0, 168, 89);
                doc.rect(0, 0, pageWidth, 40, 'F');
                doc.setTextColor(255, 255, 255);
                doc.setFontSize(24);
                doc.setFont("helvetica", "bold");
                doc.text("EduTecProfessor", 14, 25);
                doc.setFontSize(12);
                doc.setFont("helvetica", "normal");
                doc.text("Exportação de Registros Pedagógicos", pageWidth - 14, 25, { align: 'right' });

                let currentY = 50;
                recordsToExport.forEach((record, index) => {
                    if (currentY > 250) { doc.addPage(); currentY = 20; }
                    doc.setTextColor(50, 50, 50); doc.setFontSize(14); doc.setFont("helvetica", "bold");
                    doc.text(record.title, 14, currentY); currentY += 8;
                    const dataStr = new Date(record.date + 'T00:00:00').toLocaleDateString('pt-BR');
                    const turmaSerie = `${record.turma || ''} ${record.yearGrade ? '/ ' + record.yearGrade : ''}`.trim();
                    const infoData = [['Data', dataStr]];
                    if (turmaSerie) infoData.push(['Turma/Ano/Série', turmaSerie]);
                    if (record.curricularComponent) infoData.push(['Componente Curricular', record.curricularComponent]);

                    autoTable(doc, {
                        startY: currentY, body: infoData, theme: 'plain',
                        styles: { fontSize: 10, cellPadding: 1 },
                        columnStyles: { 0: { fontStyle: 'bold', textColor: [0, 0, 0], cellWidth: 50 }, 1: { textColor: [80, 80, 80] } }
                    });

                    currentY = (doc as any).lastAutoTable.finalY + 10;
                    doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(0, 168, 89);
                    doc.text("Detalhes do Registro", 14, currentY); currentY += 6;
                    doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(60, 60, 60);
                    const detailsText = record.description || record.objectives || 'Sem descrição detalhada.';
                    const splitText = doc.splitTextToSize(detailsText, pageWidth - 28);
                    doc.text(splitText, 14, currentY); currentY += (splitText.length * 5) + 15;

                    if (index < recordsToExport.length - 1) {
                        doc.setDrawColor(200, 200, 200);
                        doc.line(14, currentY - 5, pageWidth - 14, currentY - 5);
                    }
                });

                const pageCount = doc.getNumberOfPages();
                for (let i = 1; i <= pageCount; i++) {
                    doc.setPage(i); doc.setFontSize(8); doc.setTextColor(150, 150, 150);
                    doc.text(`EduTecProfessor • Página ${i} de ${pageCount}`, pageWidth / 2, doc.internal.pageSize.height - 10, { align: 'center' });
                }

                const pdfBase64 = doc.output('datauristring').split(',')[1];
                doc.save(`EduTecProfessor_Registros_${new Date().getTime()}.pdf`);

                if (sendEmail) {
                    await supabase.functions.invoke('sendExportEmail', {
                        body: { pdfContent: pdfBase64, format: 'pdf' }
                    });
                }
            }

            alert(sendEmail ? "Download iniciado! Uma cópia também foi enviada para o seu e-mail cadastrado." : "Download exportado com sucesso no seu navegador.");
        } catch (err: any) {
            console.error(err);
            alert("Houve um erro na exportação: " + (err.message || 'Verifique as configurações.'));
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <div className={`border p-4 rounded-xl flex items-start gap-4 mb-6 relative ${showWarningUI ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
            <button onClick={() => setIsDismissed(true)} className="absolute top-4 right-4 text-black/40 hover:text-black">
                <Icons.X size={18} />
            </button>
            <Icons.AlertTriangle className={`shrink-0 mt-0.5 ${showWarningUI ? 'text-red-500' : 'text-orange-500'}`} size={24} />
            <div className="flex-1 pr-6">
                <h4 className={`font-bold text-sm ${showWarningUI ? 'text-red-800' : 'text-orange-800'}`}>{title}</h4>
                <p className={`text-sm mt-1 ${showWarningUI ? 'text-red-700' : 'text-orange-700'}`}>
                    {message}
                </p>

                {showExportButton && (
                    <div className="mt-4 flex flex-col gap-3">
                        <div className="flex items-center gap-4">
                            <label className={`flex items-center gap-2 text-sm select-none cursor-pointer ${showWarningUI ? 'text-red-800' : 'text-orange-800'}`}>
                                <input
                                    type="checkbox"
                                    checked={sendEmail}
                                    onChange={(e) => setSendEmail(e.target.checked)}
                                    className={`rounded border-gray-300 focus:ring-opacity-50 ${showWarningUI ? 'text-red-600 focus:ring-red-500' : 'text-orange-600 focus:ring-orange-500'}`}
                                />
                                Enviar cópia por e-mail também
                            </label>
                            <select
                                value={exportFormat}
                                onChange={(e) => setExportFormat(e.target.value as 'pdf' | 'csv')}
                                className={`text-xs font-bold border rounded-lg py-1 px-2 bg-white outline-none focus:ring-1 ${showWarningUI ? 'border-red-200 focus:ring-red-500' : 'border-orange-200 focus:ring-orange-500'}`}
                            >
                                <option value="pdf">PDF</option>
                                <option value="csv">CSV</option>
                            </select>
                        </div>
                        <button
                            onClick={exportData}
                            disabled={isExporting}
                            className={`flex items-center gap-2 px-4 py-2 text-sm font-bold text-white rounded-lg transition-colors w-fit ${showWarningUI ? 'bg-red-600 hover:bg-red-700' : 'bg-orange-600 hover:bg-orange-700'} ${isExporting ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            <Icons.Download size={16} />
                            {isExporting ? 'Exportando e Enviando...' : 'Exportar Meus Registros'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

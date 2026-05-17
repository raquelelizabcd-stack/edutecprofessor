import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { UserProfile, NAV_ITEMS } from '../../types';

interface DashboardLayoutProps {
    role: UserProfile;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    onLogout: () => void;
    onGoToPayment: () => void;
    onStartTour?: () => void;
    userDataExpiracao?: string | null;
    statusPagamento?: string | null;
    userName?: string;
    robotName?: string;
    onSaveRobotName?: (name: string) => Promise<void>;
    subtitle?: string;
    userEmail?: string;
    userPassword?: string;
    userWhatsapp?: string;
    children: React.ReactNode;
}

export default function DashboardLayout({
    role,
    activeTab,
    setActiveTab,
    onLogout,
    onGoToPayment,
    onStartTour,
    userDataExpiracao,
    statusPagamento,
    userName,
    robotName,
    onSaveRobotName,
    subtitle,
    userEmail,
    userPassword,
    userWhatsapp,
    children
}: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const activeItem = NAV_ITEMS.find(item => item.id === activeTab) || {
        id: activeTab,
        label: activeTab === 'planejamento-diario' ? 'Planejamento Diário' :
               activeTab === 'planejamento-semanal' ? 'Planejamento Semanal' :
               activeTab === 'planejamento-mensal' ? 'Planejamento Mensal' :
               activeTab === 'relatorios-turma' ? 'Relatório de Turma' :
               activeTab === 'parecer-pcd' ? 'Parecer PCD' : 'Registro Pedagógico',
        icon: 'FileText',
        category: 'Registros Pedagógicos',
        roles: []
    };

    return (
        <div className="flex h-screen bg-[#AFEEEE] text-[#1A1A1A] font-sans overflow-hidden relative">
            <Sidebar
                role={role}
                statusPagamento={statusPagamento}
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                isSidebarOpen={isSidebarOpen}
                setIsSidebarOpen={setIsSidebarOpen}
                onLogout={onLogout}
                onGoToPayment={onGoToPayment}
            />
            <main className="flex-1 flex flex-col h-full overflow-hidden">
                <Header
                    role={role}
                    activeItem={activeItem}
                    subtitle={subtitle}
                    setIsSidebarOpen={setIsSidebarOpen}
                    onLogout={onLogout}
                    onGoToPayment={onGoToPayment}
                    onStartTour={onStartTour}
                    userDataExpiracao={userDataExpiracao}
                    statusPagamento={statusPagamento}
                    userName={userName}
                    robotName={robotName}
                    onSaveRobotName={onSaveRobotName}
                    userEmail={userEmail}
                    userPassword={userPassword}
                    userWhatsapp={userWhatsapp}
                />
                <div className="flex-1 overflow-y-scroll p-4 md:p-8 custom-scrollbar">
                    {children}
                    
                    {role === 'free' && ['dashboard-evolucao', 'reflexoes'].includes(activeTab) && (
                        <div className="mt-12 pt-8 border-t border-black/5">
                            <div className="max-w-4xl mx-auto bg-white/50 backdrop-blur-sm rounded-2xl p-4 flex flex-col items-center justify-center text-center opacity-70">
                                <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest mb-2">Publicidade Google AdSense</p>
                                <div className="w-full h-24 bg-black/[0.03] border border-dashed border-black/10 rounded-xl flex items-center justify-center">
                                    <span className="text-[11px] text-black/30 font-medium italic">Anúncio discreto no rodapé</span>
                                </div>
                                <p className="text-[9px] text-black/20 mt-2">Remova os anúncios assinando o Plano Pro por apenas R$29,90/mês</p>
                            </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}

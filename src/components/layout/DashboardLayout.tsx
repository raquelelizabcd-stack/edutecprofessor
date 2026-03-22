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
    userDataExpiracao?: string | null;
    statusPagamento?: string | null;
    robotName?: string;
    onSaveRobotName?: (name: string) => Promise<void>;
    subtitle?: string;
    userEmail?: string;
    userPassword?: string;
    children: React.ReactNode;
}

export default function DashboardLayout({
    role,
    activeTab,
    setActiveTab,
    onLogout,
    onGoToPayment,
    userDataExpiracao,
    statusPagamento,
    robotName,
    onSaveRobotName,
    subtitle,
    userEmail,
    userPassword,
    children
}: DashboardLayoutProps) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    const activeItem = NAV_ITEMS.find(item => item.id === activeTab);

    return (
        <div className="flex h-screen bg-[#AFEEEE] text-[#1A1A1A] font-sans overflow-hidden relative">
            <Sidebar
                role={role}
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
                    userDataExpiracao={userDataExpiracao}
                    statusPagamento={statusPagamento}
                    robotName={robotName}
                    onSaveRobotName={onSaveRobotName}
                    userEmail={userEmail}
                    userPassword={userPassword}
                />
                <div className="flex-1 overflow-y-scroll p-4 md:p-8 custom-scrollbar">
                    {children}
                </div>
            </main>
        </div>
    );
}

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { cn } from '../../lib/utils';
import { NAV_ITEMS, UserProfile } from '../../types';

interface SidebarProps {
    role: UserProfile;
    activeTab: string;
    setActiveTab: (tab: string) => void;
    isSidebarOpen: boolean;
    setIsSidebarOpen: (isOpen: boolean) => void;
    onLogout: () => void;
    onGoToPayment?: () => void;
    statusPagamento?: string | null;
}

export default function Sidebar({
    role,
    activeTab,
    setActiveTab,
    isSidebarOpen,
    setIsSidebarOpen,
    onLogout,
    onGoToPayment,
    statusPagamento
}: SidebarProps) {
    const filteredNav = NAV_ITEMS.filter(item => item.roles.includes(role as any));
    const categories = Array.from(new Set(filteredNav.map(item => item.category)));

    const renderIcon = (iconName: string, className?: string) => {
        const IconComponent = (Icons as any)[iconName];
        return IconComponent ? <IconComponent className={className} size={18} /> : null;
    };

    return (
        <>
            {/* Mobile Sidebar Overlay */}
            <AnimatePresence>
                {isSidebarOpen && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setIsSidebarOpen(false)}
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-30 lg:hidden"
                    />
                )}
            </AnimatePresence>

            <aside className={cn(
                "fixed lg:relative w-72 bg-[#4682B4] border-r border-black/5 flex flex-col h-full z-40 transition-transform duration-300 lg:translate-x-0 text-white",
                isSidebarOpen ? "translate-x-0" : "-translate-x-full"
            )}>
                <div className="p-8 border-b border-white/10">
                    <div className="flex items-center justify-between mb-8">
                        <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#4682B4] font-bold text-lg">
                                E
                            </div>
                            <span className="text-xl font-bold tracking-tight text-white">EduTec<span className="text-white/80">Professor</span></span>
                        </div>
                        <button
                            onClick={() => setIsSidebarOpen(false)}
                            className="lg:hidden p-2 hover:bg-white/10 rounded-lg text-white"
                        >
                            <Icons.X size={20} />
                        </button>
                    </div>

                    <div className="p-4 bg-white/10 rounded-2xl">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center border border-white/10 shrink-0">
                                <Icons.User size={20} className="text-white/80" />
                            </div>
                            <div className="min-w-0 flex-1">
                                <p className="text-[10px] font-bold uppercase tracking-wider text-white/60">Perfil Ativo</p>
                                <p className="text-sm font-semibold capitalize truncate text-white">
                                    {role === 'diretor' ? 'Diretor da Escola' :
                                        role === 'professor' ? 'Professor da Escola' :
                                            role === 'pro' ? (statusPagamento === 'pendente' ? 'Teste Pro' : 'Conta Pro') : 'Conta Free'}
                                </p>
                            </div>
                            {role === 'free' && (
                                <button
                                    onClick={onGoToPayment}
                                    className="p-1.5 bg-white text-[#4682B4] rounded-lg hover:bg-white/90 transition-all font-bold"
                                    title="Mudar para o Pro"
                                >
                                    <Icons.Zap size={14} />
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                <nav className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
                    {categories.map(category => (
                        <div key={category}>
                            {category && (
                                <h3 className="px-4 text-[10px] font-black uppercase tracking-[0.2em] text-white/50 mb-4 mt-6 first:mt-0">
                                    {category}
                                </h3>
                            )}
                            <div className="space-y-1">
                                {filteredNav
                                    .filter(item => item.category === category)
                                    .map(item => (
                                        <button
                                            key={item.id}
                                            id={`nav-${item.id}`}
                                            onClick={() => {
                                                setActiveTab(item.id);
                                                setIsSidebarOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group",
                                                activeTab === item.id
                                                    ? "bg-white/20 text-white shadow-sm border-l-4 border-white"
                                                    : "text-white/70 hover:bg-[#5A9BD5] hover:text-white"
                                            )}
                                        >
                                            {renderIcon(item.icon, activeTab === item.id ? "text-white" : "text-white/60 group-hover:text-white")}
                                            {item.label}
                                        </button>
                                    ))}
                            </div>
                        </div>
                    ))}
                </nav>

                {role === 'free' && ['planejamento-semanal', 'planejamento-mensal', 'planejamento-diario', 'relatorio-individual'].includes(activeTab) && (
                    <div className="mx-4 mb-4 p-4 bg-white/5 rounded-2xl border border-white/10 text-center">
                        <p className="text-[9px] font-bold text-white/30 uppercase tracking-[0.2em] mb-2">Publicidade AdSense</p>
                        <div className="w-full h-24 bg-white/5 border border-dashed border-white/10 rounded-xl flex items-center justify-center overflow-hidden">
                            <span className="text-[10px] text-white/20 italic">Bloco de Anúncios Google</span>
                        </div>
                        <p className="text-[8px] text-white/20 mt-2">Remova os anúncios com o Plano Pro</p>
                    </div>
                )}

                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={onLogout}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-white/80 hover:bg-red-500/20 hover:text-white transition-all"
                    >
                        <Icons.LogOut size={18} />
                        Sair do Sistema
                    </button>
                </div>
            </aside>
        </>
    );
}

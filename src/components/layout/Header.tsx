import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import * as Icons from 'lucide-react';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { UserProfile, NavItem } from '../../types';

interface HeaderProps {
    role: UserProfile;
    activeItem?: NavItem;
    subtitle?: string;
    setIsSidebarOpen: (isOpen: boolean) => void;
    onLogout?: () => void;
    onGoToPayment?: () => void;
    onStartTour?: () => void;
    userDataExpiracao?: string | null;
    statusPagamento?: string | null;
    robotName?: string;
    onSaveRobotName?: (name: string) => Promise<void>;
    userEmail?: string;
    userPassword?: string;
}

export default function Header({ role, activeItem, subtitle, setIsSidebarOpen, onLogout, onGoToPayment, onStartTour, userDataExpiracao, statusPagamento, robotName, onSaveRobotName, userEmail, userPassword }: HeaderProps) {
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
    const [isCreatingSession, setIsCreatingSession] = useState(false);

    const dropdownRef = useRef<HTMLDivElement>(null);

    const getDaysRemaining = () => {
        if (!userDataExpiracao) return null;
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const expDate = new Date(userDataExpiracao);
        expDate.setHours(0, 0, 0, 0);
        const diffTime = expDate.getTime() - today.getTime();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays > 0 ? diffDays : 0;
    };

    const daysLeft = getDaysRemaining();

    // Redirecionamento se expirar
    useEffect(() => {
        if (role === 'pro' && daysLeft !== null && daysLeft <= 0 && onGoToPayment) {
            onGoToPayment();
        }
    }, [daysLeft, role, onGoToPayment]);

    // Close dropdown on click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsProfileOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleCreateStripeSession = async () => {
        setIsCreatingSession(true);
        try {
            const { data } = await supabase.auth.getUser();
            const userId = data?.user?.id;
            const uemail = data?.user?.email;

            // Link oficial de produção
            const stripeLink = import.meta.env.VITE_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/eVq7sLa4f3hj1Ih57V6EU00";
            
            // Adicionamos parâmetros para o Stripe reconhecer o usuário no Webhook
            const separator = stripeLink.includes('?') ? '&' : '?';
            const finalUrl = `${stripeLink}${separator}client_reference_id=${userId || ''}${uemail ? `&prefilled_email=${encodeURIComponent(uemail)}` : ''}`;
            
            window.location.href = finalUrl;
        } catch (err) {
            console.error('Erro no checkout:', err);
            // Fallback para o link puro em caso de erro crítico
            window.location.href = import.meta.env.VITE_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/eVq7sLa4f3hj1Ih57V6EU00";
        } finally {
            setIsCreatingSession(false);
        }
    };

    const handleManageBilling = async () => {
        setIsCreatingSession(true); // Reutilizando o loading
        try {
            // Busca o ID do usuário logado na sessão autêntica do Supabase
            const { data: { session } } = await supabase.auth.getSession();
            const currentUserId = session?.user?.id;

            if (!userEmail && !currentUserId) {
                alert('E-mail ou Sessão não identificados. Recarregue a página.');
                return;
            }

            const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
            const apiUrl = isLocal
                ? 'http://localhost:3001/api/create-portal-session'
                : '/api/create-portal-session';

            const response = await fetch(apiUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: userEmail,
                    userId: currentUserId
                })
            });

            if (!response.ok) {
                const errData = await response.json();
                throw new Error(errData.error || 'Erro ao abrir o portal de faturamento');
            }

            const result = await response.json();
            if (result.url) {
                window.location.href = result.url;
            }
        } catch (err: any) {
            console.error('Erro no portal de faturamento:', err);
            alert(err?.message || 'Não foi possível acessar o portal de faturamento agora.');
        } finally {
            setIsCreatingSession(false);
        }
    };

    const profileMenuItems = [
        { id: 'edit-profile', label: 'Editar Dados Pessoais', icon: Icons.User, onClick: () => setIsEditProfileOpen(true) },
        { id: 'account-settings', label: 'Configurações da Conta', icon: Icons.Settings, onClick: () => setIsSettingsOpen(true) },
        { id: 'logout', label: 'Sair do Sistema', icon: Icons.LogOut, onClick: onLogout, className: 'text-red-500 hover:bg-red-50' },
    ];

    const Modal = ({ isOpen, onClose, title, children }: { isOpen: boolean, onClose: () => void, title: string, children: React.ReactNode }) => (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="bg-white rounded-[32px] w-full max-w-md p-8 shadow-2xl relative z-10 border border-black/5"
                    >
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="text-xl font-bold">{title}</h3>
                            <button onClick={onClose} className="p-2 hover:bg-black/5 rounded-full transition-colors">
                                <Icons.X size={20} />
                            </button>
                        </div>
                        {children}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );

    return (
        <header className="h-20 bg-white border-b border-black/5 px-4 md:px-8 flex items-center justify-between shrink-0 relative z-20">
            <div className="flex items-center gap-4">
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="lg:hidden p-2 hover:bg-black/5 rounded-lg"
                >
                    <Icons.Menu size={24} />
                </button>
                <div className="min-w-0">
                    <h2 className="text-lg md:text-xl font-bold tracking-tight truncate">
                        {activeItem?.label}
                        {subtitle && (
                            <span className="text-black/40 font-normal"> – {subtitle}</span>
                        )}
                    </h2>
                    <p className="text-[10px] md:text-xs text-black/40 font-medium">{activeItem?.category}</p>
                </div>
            </div>

            <div className="flex items-center gap-2 md:gap-4">
                <button
                    onClick={onStartTour}
                    className="p-2 md:p-2.5 bg-black/5 rounded-full text-black/40 hover:text-[#00A859] hover:bg-[#00A859]/10 transition-colors"
                    title="Centro de Ajuda e Dicas"
                >
                    <Icons.HelpCircle size={20} />
                </button>
                <button className="p-2 md:p-2.5 bg-black/5 rounded-full text-black/40 hover:text-black transition-colors relative">
                    <Icons.Bell size={20} />
                    <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
                </button>
                <div className="h-8 w-[1px] bg-black/5 mx-1 md:mx-2" />
                <div className="relative" ref={dropdownRef}>
                    <button
                        onClick={() => setIsProfileOpen(!isProfileOpen)}
                        className="flex items-center gap-2 md:gap-3 p-1.5 hover:bg-black/5 rounded-2xl transition-all"
                    >
                        <div className="text-right hidden sm:block">
                            <p className="text-sm font-bold">Raquel Duarte</p>
                            <p className="text-[10px] text-black/40 font-bold uppercase tracking-wider">
                                {role === 'diretor' || role === 'professor' ? 'Escola EduTec Matriz' : (
                                    <span className="flex items-center gap-1">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[10px] font-black mt-1 flex items-center gap-1",
                                            role === 'pro' ? (daysLeft !== null && daysLeft <= 0 ? "bg-red-500 text-white" : "bg-[#00A859] text-white") : "bg-black/10 text-black/60"
                                        )}>
                                            {role === 'pro' ? (
                                                <>
                                                    CONTA PRO
                                                    {daysLeft !== null && statusPagamento === 'trial' && (
                                                        <span className="opacity-80">
                                                            — {daysLeft > 0 ? `${daysLeft} dias restantes do teste grátis` : 'Teste encerrado, faça o pagamento'}
                                                        </span>
                                                    )}
                                                </>
                                            ) : 'CONTA FREE'}
                                        </span>
                                        {role === 'free' && (
                                            <button
                                                onClick={(e) => { e.stopPropagation(); setIsUpgradeModalOpen(true); }}
                                                className="mt-1 px-2.5 py-1 bg-gradient-to-r from-teal-500 to-[#00A859] hover:from-teal-400 hover:to-[#00A859] text-white rounded text-[10px] font-black uppercase tracking-wider transition-all shadow-md shadow-[#00A859]/20 flex items-center gap-1.5 ml-1 transform hover:scale-105"
                                            >
                                                <Icons.Crown size={12} className="text-yellow-200" />
                                                Migrar para Pro
                                            </button>
                                        )}
                                    </span>
                                )}
                            </p>
                        </div>
                        <div className="w-8 h-8 md:w-10 md:h-10 bg-gradient-to-br from-[#00A859] to-[#008F4C] rounded-lg md:rounded-xl flex items-center justify-center text-white font-bold text-sm md:text-base shadow-sm group-hover:shadow-md transition-all">
                            RD
                        </div>
                    </button>

                    <AnimatePresence>
                        {isProfileOpen && (
                            <motion.div
                                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                                className="absolute right-0 mt-2 w-64 bg-white rounded-2xl border border-black/5 shadow-xl p-2 z-50 overflow-hidden"
                            >
                                <div className="p-3 mb-2 border-b border-black/5 sm:hidden">
                                    <p className="text-sm font-bold">Raquel Duarte</p>
                                    <p className="text-[10px] text-black/40 font-bold uppercase tracking-wider">Perfil do Usuário</p>
                                </div>
                                <div className="space-y-1">
                                    {profileMenuItems.map((item) => (
                                        <button
                                            key={item.id}
                                            onClick={() => {
                                                item.onClick?.();
                                                setIsProfileOpen(false);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all hover:bg-black/5 text-black/70 hover:text-black",
                                                item.className
                                            )}
                                        >
                                            <item.icon size={18} />
                                            {item.label}
                                        </button>
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Modals */}
            <Modal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                title="Editar Dados Pessoais"
            >
                <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); alert('Dados salvos com sucesso!'); setIsEditProfileOpen(false); }}>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-black/40 uppercase tracking-wider">Nome Completo</label>
                        <input type="text" defaultValue="Raquel Duarte" className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-black/40 uppercase tracking-wider">E-mail</label>
                        <input type="email" defaultValue={userEmail || "contato@raquelduarte.com"} className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-black/40 uppercase tracking-wider">Telefone de Contato</label>
                        <input type="text" placeholder="Ex: (21) 99999-9999" className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] outline-none transition-all" />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-black/40 uppercase tracking-wider">Nova Senha</label>
                        <input type="password" defaultValue={userPassword || ""} placeholder="••••••••" className="w-full px-4 py-3 rounded-xl border border-black/10 focus:border-[#00A859] outline-none transition-all" />
                    </div>
                    <button type="submit" className="w-full py-4 bg-[#00A859] text-white rounded-xl font-bold mt-4 hover:bg-[#008F4C] transition-all shadow-lg shadow-[#00A859]/20">
                        Salvar Alterações
                    </button>
                </form>
            </Modal>


            <Modal
                isOpen={isSettingsOpen}
                onClose={() => setIsSettingsOpen(false)}
                title="Configurações da Conta"
            >
                <div className="space-y-6 pb-2 max-h-[70vh] overflow-y-auto px-1 custom-scrollbar">
                    {/* Plano Atual Section */}
                    <div className="p-4 bg-black/5 rounded-2xl flex items-center justify-between">
                        <div>
                            <p className="text-xs font-bold text-black/40 uppercase tracking-wider">Plano Atual</p>
                            <p className="font-bold flex items-center gap-2">
                                {role === 'pro' ? 'EduTec Pro Platinum' : 'EduTec Gratuito'}
                                <span className="px-2 py-0.5 bg-[#00A859] text-white text-[10px] rounded animate-pulse">Ativo</span>
                            </p>
                        </div>
                        {role === 'free' && (
                            <button className="px-4 py-2 bg-[#00A859] text-white text-xs font-bold rounded-lg transition-all hover:bg-[#008F4C] shadow-sm">
                                Fazer Upgrade
                            </button>
                        )}
                    </div>

                    {/* Dados de Pagamento Section */}
                    <div className="space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30 px-1">Dados de Pagamento</h4>
                        <PaymentSection 
                            handleManageBilling={handleManageBilling} 
                            isCreatingSession={isCreatingSession}
                            statusPagamento={statusPagamento}
                            userDataExpiracao={userDataExpiracao}
                        />
                    </div>

                    {/* Segurança e Notificações Section */}
                    <div className="space-y-4 pt-2">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-black/30 px-1">Segurança e Notificações</h4>
                        <div className="space-y-2">
                            <div className="flex items-center justify-between p-3 bg-black/5 rounded-2xl">
                                <div className="flex items-center gap-3 text-black/60">
                                    <Icons.Bell size={18} />
                                    <span className="text-sm font-medium">Notificações por E-mail</span>
                                </div>
                                <button className="w-10 h-5 bg-[#00A859] rounded-full relative transition-all">
                                    <div className="absolute right-0.5 top-0.5 w-4 h-4 bg-white rounded-full shadow-sm" />
                                </button>
                            </div>

                        </div>
                    </div>
                </div>
            </Modal>

            {/* Modal de Upgrade Pro com Integração Stripe */}
            <Modal
                isOpen={isUpgradeModalOpen}
                onClose={() => setIsUpgradeModalOpen(false)}
                title="Desbloqueie o Poder Total"
            >
                <div className="space-y-6">
                    {/* Hero Banner inside modal */}
                    <div className="p-5 bg-gradient-to-br from-[#00A859] to-[#008F4C] rounded-2xl text-white shadow-lg relative overflow-hidden">
                        <div className="absolute top-0 right-[-10px] p-4 opacity-10">
                            <Icons.Zap size={100} className="transform rotate-12" />
                        </div>
                        <h4 className="text-xl font-black mb-1 relative z-10 flex items-center gap-2">
                            <Icons.Crown size={22} className="text-yellow-300" />
                            Plano Pro EduTec
                        </h4>
                        <p className="text-sm text-emerald-50 relative z-10 font-medium leading-relaxed max-w-[90%]">
                            Potencialize sua gestão educacional com recursos ilimitados criados para simplificar o seu dia a dia.
                        </p>
                    </div>

                    <div className="space-y-5 px-2">
                        <div className="flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-100 to-teal-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                <Icons.Database size={24} className="text-emerald-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[15px] text-gray-800">Armazenamento Vitalício</h4>
                                <p className="text-[13px] text-gray-500 leading-snug mt-0.5">Seu histórico de aulas, avaliações e alunos guardados com segurança militar para sempre.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                <Icons.BarChart3 size={24} className="text-amber-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[15px] text-gray-800">Relatórios Inteligentes</h4>
                                <p className="text-[13px] text-gray-500 leading-snug mt-0.5">Gere diários de classe automatizados, cálculo de médias e consolidação de chamadas em 1 clique.</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4 group">
                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-100 to-indigo-100 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform shadow-sm">
                                <Icons.Headset size={24} className="text-blue-700" />
                            </div>
                            <div>
                                <h4 className="font-bold text-[15px] text-gray-800">Suporte Dedicado</h4>
                                <p className="text-[13px] text-gray-500 leading-snug mt-0.5">Nossa equipe especialista sempre alerta para te ajudar via e-mail e chat com prioridade.</p>
                            </div>
                        </div>
                    </div>

                    <div className="pt-6 border-t border-black/5 mt-2">
                        <button
                            onClick={handleCreateStripeSession}
                            disabled={isCreatingSession}
                            className="w-full relative group overflow-hidden py-4 bg-gradient-to-r from-zinc-900 to-black text-white rounded-2xl font-black text-[15px] hover:shadow-2xl hover:shadow-black/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed transform hover:-translate-y-0.5"
                        >
                            <div className="absolute inset-0 w-full h-full bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative z-10 flex items-center justify-center gap-3">
                                {isCreatingSession ? (
                                    <>
                                        <div className="w-5 h-5 border-3 border-white/20 border-t-white rounded-full animate-spin" />
                                        <span>Preparando o ambiente seguro...</span>
                                    </>
                                ) : (
                                    <>
                                        <span className="text-[#00A859]">★</span>
                                        <span>Assinar agora por R$ 29,90 / mês</span>
                                    </>
                                )}
                            </div>
                        </button>

                        <div className="flex items-center justify-center gap-2 mt-4">
                            <Icons.ShieldCheck size={16} className="text-[#00A859]" />
                            <p className="text-xs text-black/40 font-bold uppercase tracking-wider">
                                Checkout Seguro via Stripe
                            </p>
                        </div>
                        <div className="flex justify-center gap-2 mt-2 opacity-50">
                            {/* Ícones de pagamento puramente visuais */}
                            <div className="px-2 py-0.5 border border-black/20 rounded text-[10px] font-bold">CARTÃO</div>
                            <div className="px-2 py-0.5 border border-black/20 rounded text-[10px] font-bold">BOLETO</div>
                        </div>
                    </div>
                </div>
            </Modal>
        </header>
    );
}

// Sub-componente para gerenciar a lógica de pagamento dentro do modal
function PaymentSection({ handleManageBilling, isCreatingSession, statusPagamento, userDataExpiracao }: { handleManageBilling: () => Promise<void>, isCreatingSession: boolean, statusPagamento?: string | null, userDataExpiracao?: string | null }) {
    const [card, setCard] = useState<{ number: string, name: string, expiry: string } | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [tempFormData, setTempFormData] = useState({ number: '', name: '', expiry: '', cvv: '' });

    const maskCardNumber = (num: string) => `**** **** **** ${num.slice(-4)}`;

    const handleSaveCard = (e: React.FormEvent) => {
        e.preventDefault();
        setCard({
            number: tempFormData.number,
            name: tempFormData.name.toUpperCase(),
            expiry: tempFormData.expiry
        });
        setIsEditing(false);
        alert('Dados de pagamento atualizados com sucesso!');
    };

    const handleRemoveCard = () => {
        if (window.confirm('Tem certeza que deseja remover este cartão?')) {
            setCard(null);
            setIsEditing(false);
        }
    };

    if (isEditing) {
        return (
            <motion.form
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                onSubmit={handleSaveCard}
                className="p-5 bg-black/5 border border-[#00A859]/20 rounded-[24px] space-y-4 shadow-inner"
            >
                <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-black text-[#00A859] uppercase tracking-wider">Novo Cartão de Crédito</p>
                    <button type="button" onClick={() => setIsEditing(false)} className="text-xs font-bold text-black/40 hover:text-black">Cancelar</button>
                </div>
                <div className="space-y-3">
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-black/40 uppercase px-1">Número do Cartão</label>
                        <input
                            required
                            placeholder="0000 0000 0000 0000"
                            className="w-full px-4 py-2.5 rounded-xl border border-black/5 focus:border-[#00A859] outline-none text-sm font-medium"
                            value={tempFormData.number}
                            onChange={(e) => setTempFormData({ ...tempFormData, number: e.target.value.replace(/\D/g, '') })}
                            maxLength={16}
                        />
                    </div>
                    <div className="space-y-1">
                        <label className="text-[10px] font-bold text-black/40 uppercase px-1">Nome do Titular</label>
                        <input
                            required
                            placeholder="COMO IMPRESSO NO CARTÃO"
                            className="w-full px-4 py-2.5 rounded-xl border border-black/5 focus:border-[#00A859] outline-none text-sm font-medium"
                            value={tempFormData.name}
                            onChange={(e) => setTempFormData({ ...tempFormData, name: e.target.value })}
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-black/40 uppercase px-1">Validade (MM/AA)</label>
                            <input
                                required
                                placeholder="MM/AA"
                                className="w-full px-4 py-2.5 rounded-xl border border-black/5 focus:border-[#00A859] outline-none text-sm font-medium"
                                value={tempFormData.expiry}
                                onChange={(e) => setTempFormData({ ...tempFormData, expiry: e.target.value })}
                                maxLength={5}
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-[10px] font-bold text-black/40 uppercase px-1">CVV</label>
                            <input
                                required
                                placeholder="000"
                                className="w-full px-4 py-2.5 rounded-xl border border-black/5 focus:border-[#00A859] outline-none text-sm font-medium"
                                value={tempFormData.cvv}
                                onChange={(e) => setTempFormData({ ...tempFormData, cvv: e.target.value.replace(/\D/g, '') })}
                                maxLength={4}
                            />
                        </div>
                    </div>
                </div>
                <button type="submit" className="w-full py-3.5 bg-[#00A859] text-white rounded-xl font-bold text-sm shadow-md shadow-[#00A859]/20 hover:bg-[#008F4C] transition-all">
                    Confirmar e Salvar
                </button>
            </motion.form>
        );
    }

    if (statusPagamento === 'ativo' || statusPagamento === 'teste' || card) {
        return (
            <div className="space-y-4">
                {/* Billing Summary Card */}
                <div className="p-6 bg-gradient-to-br from-slate-900 to-slate-800 rounded-[24px] shadow-xl border border-white/5 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 p-8 opacity-5">
                        <Icons.Zap size={140} className="transform rotate-12 translate-x-12 translate-y-[-20px]" />
                    </div>

                    <div className="relative z-10 space-y-5">
                        <div className="flex items-center justify-between">
                            <span className={cn(
                                "px-3 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border",
                                statusPagamento === 'teste' 
                                    ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            )}>
                                {statusPagamento === 'teste' ? 'Período de Teste (7 dias)' : 'Assinatura Ativa'}
                            </span>
                            {statusPagamento === 'ativo' && <Icons.ShieldCheck className="text-emerald-400" size={20} />}
                            {statusPagamento === 'teste' && <Icons.Zap className="text-amber-400" size={20} />}
                        </div>

                        <div>
                            <p className="text-[10px] text-white/40 font-black uppercase tracking-tighter mb-1">
                                {statusPagamento === 'teste' ? 'Data de Expiração' : 'Próxima Renovação'}
                            </p>
                            <p className="text-lg font-bold text-white">
                                {userDataExpiracao 
                                    ? new Date(userDataExpiracao).toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                                    : 'Aguardando Confirmação'}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2 border-t border-white/10 pt-4">
                            <div className="flex items-center gap-2 text-white/70">
                                <Icons.Check size={14} className="text-emerald-400" />
                                <span className="text-xs font-medium">Relatórios e PDFs Ilimitados</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/70">
                                <Icons.Check size={14} className="text-emerald-400" />
                                <span className="text-xs font-medium">Suporte Pedagógico Prioritário</span>
                            </div>
                            <div className="flex items-center gap-2 text-white/70">
                                <Icons.Check size={14} className="text-emerald-400" />
                                <span className="text-xs font-medium">Inteligência Artificial EduBot</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-2 mt-2">
                            <button
                                onClick={handleManageBilling}
                                disabled={isCreatingSession}
                                className="flex-1 py-3 bg-white text-black text-[12px] font-black rounded-xl transition-all hover:bg-emerald-50 dynamic-shadow active:scale-95 disabled:opacity-50"
                            >
                                {isCreatingSession ? 'Conectando...' : 'Gerenciar Pagamentos'}
                            </button>
                            <button
                                onClick={handleRemoveCard}
                                className="p-3 bg-white/10 text-white/40 hover:text-red-400 hover:bg-red-400/10 rounded-xl transition-all"
                                title="Cancelar Renovação"
                            >
                                <Icons.Power size={18} />
                            </button>
                        </div>
                    </div>
                </div>

                <p className="text-[10px] text-center text-black/30 font-bold px-4">
                    Suas transações são protegidas por criptografia de ponta a ponta via Stripe.
                </p>
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsEditing(true)}
            className="w-full p-8 border-2 border-dashed border-black/10 rounded-[24px] text-black/40 font-bold flex flex-col items-center justify-center gap-3 hover:border-[#00A859] hover:bg-[#00A859]/5 hover:text-[#00A859] transition-all group"
        >
            <div className="w-12 h-12 rounded-full bg-black/5 flex items-center justify-center group-hover:bg-[#00A859]/10 transition-colors">
                <Icons.Plus size={24} />
            </div>
            <span>Adicionar Cartão de Crédito</span>
        </button>
    );
}

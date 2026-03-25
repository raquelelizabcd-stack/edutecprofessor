import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, QrCode, ArrowLeft, CheckCircle2, ShieldCheck, Loader2, Star, Zap, Clock, Gift } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface PaymentPageProps {
    onBack: () => void;
    onSuccess: (role: UserProfile) => void;
    onUnauthenticated: () => void;
    userEmail: string;
    monthlyPrice?: number;
    trialDays?: number;
}

export default function PaymentPage({
    onBack,
    onSuccess,
    onUnauthenticated,
    userEmail,
    monthlyPrice = 29.90,
    trialDays = 7
}: PaymentPageProps) {
    const [paymentMethod, setPaymentMethod] = useState<'credit_card' | 'pix'>('credit_card');
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);

    // Form states (Simulated)
    const [cardNumber, setCardNumber] = useState('');
    const [expiry, setExpiry] = useState('');
    const [cvc, setCvc] = useState('');
    const [name, setCardName] = useState('');

    // Account form fields for non-authenticated users
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const [installments, setInstallments] = useState(1);
    const [isDowngrading, setIsDowngrading] = useState(false);

    const handleDowngradeToFree = async () => {
        setIsDowngrading(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) {
                onBack();
                return;
            }

            const { error } = await supabase
                .from('users')
                .update({
                    plano: 'free',
                    status_pagamento: 'pendente'
                })
                .eq('id', session.user.id);

            if (error) throw error;

            onSuccess('free');
        } catch (err) {
            console.error('Downgrade error:', err);
            alert('Erro ao processar alteração de plano.');
        } finally {
            setIsDowngrading(false);
        }
    };

    const handleStartTrial = async () => {
        setIsProcessing(true);
        try {
            let activeUserId = '';
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                if (!email || !password) {
                    alert('Por favor, informe um E-mail e Senha para criar sua conta e iniciar o teste grátis.');
                    setIsProcessing(false);
                    return;
                }

                let { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (authError) {
                    if (authError.message.includes('User already registered') || authError.status === 400) {
                        const loginResp = await supabase.auth.signInWithPassword({ email, password });
                        if (loginResp.error) throw loginResp.error;
                        authData = loginResp.data;
                    } else {
                        throw authError;
                    }
                }

                if (!authData.user) throw new Error("Não foi possível autenticar a conta.");
                activeUserId = authData.user.id;

                await supabase.from('users').upsert({
                    id: activeUserId,
                    nome: email.split('@')[0],
                    email: email,
                    senha: 'auth_managed_by_supabase',
                    plano: 'free',
                    status_pagamento: 'pendente',
                    data_expiracao: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString()
                }, { onConflict: 'id' });
            } else {
                activeUserId = session.user.id;
            }

            const trialExpiration = new Date();
            trialExpiration.setDate(trialExpiration.getDate() + 7);

            const { error } = await supabase
                .from('users')
                .update({
                    status_pagamento: 'trial',
                    plano: 'pro',
                    data_expiracao: trialExpiration.toISOString().split('T')[0]
                })
                .eq('id', activeUserId);

            if (error) throw error;

            alert('Seu período de teste grátis de 7 dias foi ativado com sucesso!');
            setShowSuccess(true);
            setTimeout(() => {
                onSuccess('pro');
            }, 3000);

        } catch (err: any) {
            console.error('Trial error:', err);
            alert(err.message || 'Erro ao iniciar período de teste.');
            setIsProcessing(false);
        }
    };

    const handlePayment = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsProcessing(true);

        try {
            let activeUserId = '';
            const { data: { session } } = await supabase.auth.getSession();

            // If not logged in, we need to create the account OR login
            if (!session) {
                if (!email || !password) {
                    alert('Por favor, informe um E-mail e Senha para criar ou acessar sua conta.');
                    setIsProcessing(false);
                    return;
                }

                // Attempt to sign up
                let { data: authData, error: authError } = await supabase.auth.signUp({
                    email,
                    password,
                });

                if (authError) {
                    // Se o usuário já existe, tentar fazer login
                    if (authError.message.includes('User already registered') || authError.status === 400) {
                        const loginResp = await supabase.auth.signInWithPassword({
                            email,
                            password
                        });

                        if (loginResp.error) {
                            throw loginResp.error;
                        }

                        authData = loginResp.data;
                    } else {
                        throw authError; // Some other error
                    }
                }

                if (!authData.user) {
                    throw new Error("Não foi possível autenticar a conta.");
                }

                activeUserId = authData.user.id;

                // Sync with public.users table just in case they are brand new
                await supabase.from('users').upsert({
                    id: activeUserId,
                    nome: name || email.split('@')[0],
                    email: email,
                    senha: 'auth_managed_by_supabase',
                    plano: 'free',
                    status_pagamento: 'pendente',
                    data_expiracao: new Date().toISOString().split('T')[0],
                    created_at: new Date().toISOString()
                }, { onConflict: 'id' });

            } else {
                activeUserId = session.user.id;
            }

            // Simulate payment processing time
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Calculate new expiration date (30 days for PIX and Card as per new monthly requirement)
            const expirationDate = new Date();
            expirationDate.setDate(expirationDate.getDate() + 30);

            // Update users table in Supabase
            // Somente após o pagamento ser "aprovado" (simulado aqui)
            const { error } = await supabase
                .from('users')
                .update({
                    status_pagamento: 'aprovado',
                    plano: 'pro',
                    data_expiracao: expirationDate.toISOString().split('T')[0] // Format as YYYY-MM-DD
                })
                .eq('id', activeUserId);

            if (error) throw error;

            setShowSuccess(true);

            // Auto redirect after success message
            setTimeout(() => {
                onSuccess('pro');
            }, 3000);

        } catch (err: any) {
            console.error('Payment error:', err);

            let errMsg = 'Ocorreu um erro ao processar o pagamento. Tente novamente.';
            if (err.message === 'Invalid login credentials') {
                errMsg = 'A conta já existe, mas a senha está incorreta.';
            } else if (err.message.includes('Password should be at least')) {
                errMsg = 'A senha deve ter pelo menos 6 caracteres.';
            }

            alert(errMsg);
            setIsProcessing(false);
        }
    };

    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans flex flex-col items-center py-12 px-6">
            <div className="w-full max-w-5xl mb-8 flex justify-between items-center">
                <button
                    onClick={onBack}
                    className="flex items-center gap-2 text-black/40 hover:text-black transition-colors font-medium text-sm"
                >
                    <ArrowLeft size={18} />
                    Voltar
                </button>
            </div>

            <div className="w-full max-w-5xl grid lg:grid-cols-12 gap-8 items-start">

                {/* Left Column - Form */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-black/[0.03] relative overflow-hidden">
                        <AnimatePresence>
                            {showSuccess && (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="absolute inset-0 bg-white z-20 flex flex-col items-center justify-center text-center p-8"
                                >
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: "spring", delay: 0.2 }}
                                        className="w-20 h-20 bg-[#00A859]/10 rounded-full flex items-center justify-center text-[#00A859] mb-6"
                                    >
                                        <CheckCircle2 size={40} />
                                    </motion.div>
                                    <h3 className="text-2xl font-bold mb-3">Pagamento Aprovado!</h3>
                                    <p className="text-black/60 mb-8 max-w-xs">
                                        Sua conta PRO foi ativada. Bem-vindo ao próximo nível da gestão pedagógica!
                                    </p>
                                    <div className="flex items-center gap-2 text-[#00A859] font-medium text-sm">
                                        <Loader2 className="animate-spin" size={18} />
                                        Redirecionando...
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        <div className="mb-10">
                            <h2 className="text-2xl font-bold tracking-tight mb-2">Configure sua Assinatura</h2>
                            <p className="text-black/40 text-sm">Preencha os dados abaixo para ativar o Plano Pro.</p>
                        </div>

                        <div className="space-y-10">
                            {/* 1. Seus Dados de Acesso */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-black/[0.03] pb-4">
                                    <div className="w-8 h-8 bg-black/5 rounded-lg flex items-center justify-center text-black/60">
                                        <ShieldCheck size={18} />
                                    </div>
                                    <h3 className="font-bold text-lg text-black/80">1. Seus Dados de Acesso</h3>
                                </div>

                                {userEmail ? (
                                    <div className="p-4 bg-gray-50 rounded-2xl border border-black/[0.03]">
                                        <p className="text-black/50 text-sm">
                                            Logado como: <span className="text-black font-semibold">{userEmail}</span>
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-black/40 ml-1">E-mail</label>
                                            <input
                                                type="email"
                                                required
                                                value={email}
                                                onChange={(e) => setEmail(e.target.value)}
                                                placeholder="seu@email.com"
                                                className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-[#00A859] focus:ring-4 focus:ring-[#00A859]/5 outline-none transition-all text-sm"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[11px] font-bold uppercase tracking-wider text-black/40 ml-1">Senha</label>
                                            <input
                                                type="password"
                                                required
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                placeholder="Mínimo 6 caracteres"
                                                minLength={6}
                                                className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-[#00A859] focus:ring-4 focus:ring-[#00A859]/5 outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 2. Oferta de Teste */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-black/[0.03] pb-4">
                                    <div className="w-8 h-8 bg-[#00A859]/10 rounded-lg flex items-center justify-center text-[#00A859]">
                                        <Clock size={18} />
                                    </div>
                                    <h3 className="font-bold text-lg text-black/80">2. Experimente Grátis</h3>
                                </div>

                                <div className="bg-[#00A859]/[0.02] border border-[#00A859]/10 rounded-3xl p-6 md:p-8 relative overflow-hidden">
                                    <div className="relative z-10 flex flex-col md:flex-row items-center gap-6">
                                        <div className="flex-1 text-center md:text-left">
                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00A859] text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-3">
                                                <Zap size={10} fill="currentColor" />
                                                7 Dias de Teste
                                            </div>
                                            <h4 className="text-xl font-bold text-black mb-2">Começar sem pagar nada hoje</h4>
                                            <p className="text-sm text-black/50 leading-relaxed">
                                                Tenha acesso ilimitado a todas as ferramentas Pro. Se não gostar, cancele em um clique.
                                            </p>
                                        </div>
                                        <button
                                            type="button"
                                            onClick={handleStartTrial}
                                            disabled={isProcessing}
                                            className="w-full md:w-auto px-8 py-4 bg-[#00A859] text-white rounded-xl font-bold text-base hover:bg-[#008F4C] transition-all shadow-lg shadow-[#00A859]/20 flex items-center justify-center gap-2"
                                        >
                                            {isProcessing ? <Loader2 className="animate-spin" size={20} /> : "Ativar Teste Grátis"}
                                        </button>
                                    </div>
                                </div>
                            </section>

                            {/* 3. Pagamento Direto */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-black/[0.03] pb-4">
                                    <div className="w-8 h-8 bg-black/5 rounded-lg flex items-center justify-center text-black/60">
                                        <CreditCard size={18} />
                                    </div>
                                    <h3 className="font-bold text-lg text-black/80">3. Ou finalize sua assinatura</h3>
                                </div>

                                <div className="grid grid-cols-2 gap-3 mb-6">
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('credit_card')}
                                        className={`py-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${paymentMethod === 'credit_card'
                                            ? 'border-[#00A859] bg-[#00A859]/5 text-[#00A859] shadow-sm'
                                            : 'border-black/[0.05] bg-white text-black/40 hover:border-black/10'
                                            }`}
                                    >
                                        <CreditCard size={18} />
                                        <span className="font-bold text-xs uppercase tracking-wider">Cartão de Crédito</span>
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => setPaymentMethod('pix')}
                                        className={`py-4 rounded-xl border flex items-center justify-center gap-3 transition-all ${paymentMethod === 'pix'
                                            ? 'border-[#00A859] bg-[#00A859]/5 text-[#00A859] shadow-sm'
                                            : 'border-black/[0.05] bg-white text-black/40 hover:border-black/10'
                                            }`}
                                    >
                                        <QrCode size={18} />
                                        <span className="font-bold text-xs uppercase tracking-wider">Pix Instantâneo</span>
                                    </button>
                                </div>

                                <form onSubmit={handlePayment} className="space-y-6">
                                    <AnimatePresence mode="wait">
                                        {paymentMethod === 'credit_card' ? (
                                            <motion.div
                                                key="credit_card"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="grid grid-cols-1 md:grid-cols-2 gap-4"
                                            >
                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-black/40 ml-1">Número do Cartão</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={cardNumber}
                                                        onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, '').replace(/(\d{4})/g, '$1 ').trim())}
                                                        maxLength={19}
                                                        placeholder="0000 0000 0000 0000"
                                                        className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-[#00A859] outline-none transition-all text-sm font-mono"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-black/40 ml-1">Validade (MM/AA)</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={expiry}
                                                        onChange={(e) => setExpiry(e.target.value.replace(/\D/g, '').replace(/(\d{2})(\d{2})/, '$1/$2').substr(0, 5))}
                                                        placeholder="12/28"
                                                        className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-[#00A859] outline-none transition-all text-sm"
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-black/40 ml-1">CVC</label>
                                                    <input
                                                        type="text"
                                                        required
                                                        value={cvc}
                                                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').substr(0, 4))}
                                                        placeholder="123"
                                                        className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-[#00A859] outline-none transition-all text-sm"
                                                    />
                                                </div>
                                                <div className="md:col-span-2 space-y-2">
                                                    <label className="text-[11px] font-bold uppercase tracking-wider text-black/40 ml-1">Parcelamento</label>
                                                    <select
                                                        value={installments}
                                                        onChange={(e) => setInstallments(Number(e.target.value))}
                                                        className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-[#00A859] outline-none transition-all text-sm cursor-pointer"
                                                    >
                                                        <option value={1}>1x de R$ 29,90/mês</option>
                                                        {[2, 3, 4, 5, 6, 7, 8, 9, 10].map(n => (
                                                            <option key={n} value={n}>{n}x de R$ 29,90 (Sem juros)</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </motion.div>
                                        ) : (
                                            <motion.div
                                                key="pix"
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -10 }}
                                                className="bg-gray-50 border border-black/[0.03] rounded-2xl p-6 text-center"
                                            >
                                                <div className="bg-white p-4 rounded-xl inline-block border border-black/[0.05] shadow-sm mb-4">
                                                    <QrCode size={120} className="text-[#00A859]" />
                                                </div>
                                                <h5 className="font-bold text-black mb-1">Pagamento via Pix</h5>
                                                <p className="text-xs text-black/40 mb-4 px-8">
                                                    A liberação é imediata. Aponte a câmera ou use o código Pix Copia e Cola.
                                                </p>
                                                <button
                                                    type="button"
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-black/[0.05] rounded-full text-[11px] font-bold uppercase tracking-wider text-black/60 hover:text-black hover:border-black/20 transition-all"
                                                    onClick={() => navigator.clipboard.writeText('chave-pix-fake-123')}
                                                >
                                                    Copiar Código Pix
                                                </button>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    <button
                                        type="submit"
                                        disabled={isProcessing}
                                        className={`w-full py-5 text-white rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 shadow-lg ${isProcessing
                                            ? 'bg-black/20 cursor-not-allowed shadow-none'
                                            : 'bg-[#1A1A1A] hover:bg-black shadow-black/10 transform active:scale-[0.98]'
                                            }`}
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={20} />
                                                Processando...
                                            </>
                                        ) : (
                                            "Finalizar Assinatura"
                                        )}
                                    </button>

                                    <p className="text-center text-[11px] text-black/30 font-medium flex items-center justify-center gap-1.5 uppercase tracking-widest">
                                        <ShieldCheck size={14} /> Pagamento 100% criptografado e seguro
                                    </p>
                                </form>
                            </section>
                        </div>
                    </div>
                </div>

                {/* Right Column - Summary */}
                <div className="lg:col-span-5 sticky top-8">
                    <div className="bg-[#1A1A1A] text-white rounded-3xl p-8 md:p-10 shadow-2xl relative overflow-hidden">
                        <div className="relative z-10">
                            <div className="flex items-center gap-4 mb-8">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center">
                                    <Star size={24} className="text-yellow-400 fill-yellow-400" />
                                </div>
                                <div>
                                    <h3 className="text-xl font-bold">Plano Pro</h3>
                                    <p className="text-white/40 text-xs uppercase tracking-widest">Assinatura Individual</p>
                                </div>
                            </div>

                            <div className="space-y-4 mb-8">
                                <div className="flex items-center justify-between text-sm py-3 border-b border-white/5">
                                    <span className="text-white/60">Ciclo de faturamento</span>
                                    <span className="font-medium text-white/80">Mensal</span>
                                </div>
                                <div className="flex items-center justify-between text-sm py-3 border-b border-white/5">
                                    <span className="text-white/60">Status do teste</span>
                                    <span className="font-semibold text-[#00A859]">7 Dias Grátis</span>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Total Hoje</span>
                                            <p className="text-[#00A859] text-xs font-semibold">Início do Teste Grátis</p>
                                        </div>
                                        <span className="text-3xl font-bold">R$ 0,00</span>
                                    </div>

                                    <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Após {trialDays} dias</span>
                                            <p className="text-white/60 text-xs">Assinatura Mensal</p>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold">R$ {monthlyPrice.toFixed(2).replace('.', ',')}</span>
                                            <span className="text-white/40 text-[10px] block">/mês</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Benefits List */}
                            <div className="space-y-4 mb-10">
                                <p className="text-[10px] font-bold text-[#00A859] uppercase tracking-widest mb-4">Recursos do Plano Pro</p>
                                {[
                                    '✔ Recursos Pro ilimitados',
                                    '✔ Exportação PDF Ilimitada',
                                    '✔ Gestão completa de alunos',
                                    '✔ Portfólio e Reflexões sem limites',
                                    '✔ Calendário de presença',
                                    '✔ Experiência sem anúncios'
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-white/70">
                                        <CheckCircle2 size={14} className="text-[#00A859]" />
                                        {item.replace('✔ ', '')}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleDowngradeToFree}
                                disabled={isDowngrading}
                                className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                            >
                                {isDowngrading ? 'Processando...' : 'Voltar para o Plano Free'}
                            </button>
                        </div>

                        {/* Decoration */}
                        <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-[#00A859]/5 rounded-full blur-3xl pointer-events-none" />
                    </div>
                </div>
            </div>
        </div>
    );
}

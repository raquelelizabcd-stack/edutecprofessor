import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ArrowLeft, CheckCircle2, ShieldCheck, Loader2, Star, Zap, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

interface PaymentPageProps {
    onBack: () => void;
    onSuccess: (role: UserProfile) => void;
    onUnauthenticated: () => void;
    userEmail: string;
    monthlyPrice?: number;
    trialDays?: number;
    statusPagamento?: string | null;
    role?: string;
}

export default function PaymentPage({
    onBack,
    onSuccess,
    onUnauthenticated,
    userEmail,
    monthlyPrice = 29.90,
    trialDays = 7,
    statusPagamento,
    role
}: PaymentPageProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    
    // Verificamos se o usuário já é um "experimental" ou já está no trial para esconder as frases de teste
    const isAlreadyInTrial = statusPagamento === 'teste' || statusPagamento === 'trial';
    
    // Auth states for non-authenticated users
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isDowngrading, setIsDowngrading] = useState(false);

    const handleCreateStripeSession = async () => {
        setIsProcessing(true);
        try {
            let activeUserId = '';
            let activeEmail = userEmail;
            const { data: { session } } = await supabase.auth.getSession();

            if (!session) {
                if (!email || !password) {
                    alert('Por favor, informe um E-mail e Senha para criar ou acessar sua conta.');
                    setIsProcessing(false);
                    return;
                }

                // Tenta Login ou Cadastro
                let { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
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
                activeEmail = email;
            } else {
                activeUserId = session.user.id;
                activeEmail = session.user.email || userEmail;
            }

            // Link oficial de produção — se já estava em trial, o Stripe deve processar conforme link padrão, mas a UI foca no pagamento agora
            const stripeLink = (import.meta as any).env.VITE_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/eVq7sLa4f3hj1Ih57V6EU00";
            
            // Adicionamos parâmetros para o Stripe reconhecer o usuário no Webhook
            const separator = stripeLink.includes('?') ? '&' : '?';
            const finalUrl = `${stripeLink}${separator}client_reference_id=${activeUserId || ''}${activeEmail ? `&prefilled_email=${encodeURIComponent(activeEmail)}` : ''}`;
            
            window.location.href = finalUrl;

        } catch (err: any) {
            console.error('Checkout error:', err);
            // Fallback para o link puro em caso de erro crítico
            window.location.href = (import.meta as any).env.VITE_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/eVq7sLa4f3hj1Ih57V6EU00";
        } finally {
            setIsProcessing(false);
        }
    };

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
                .update({ plano: 'free', status_pagamento: 'pendente' })
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

                {/* Left Column - Benefits & Selection */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-black/[0.03] relative overflow-hidden">
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold tracking-tight mb-2">Configure sua Assinatura</h2>
                            <p className="text-black/40 text-sm">Acesse o ambiente seguro do Stripe para finalizar sua conta Pro.</p>
                        </div>

                        <div className="space-y-10">
                            {/* 1. Dados de Acesso */}
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
                                                className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-[#00A859] outline-none transition-all text-sm"
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
                                                className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-[#00A859] outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                )}
                            </section>

                            {/* 2. Ação de Checkout */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-black/[0.03] pb-4">
                                    <div className="w-8 h-8 bg-[#00A859]/10 rounded-lg flex items-center justify-center text-[#00A859]">
                                        <Zap size={18} />
                                    </div>
                                    <h3 className="font-bold text-lg text-black/80">2. Finalizar no Stripe</h3>
                                </div>

                                <div className="bg-[#00A859]/[0.02] border border-[#00A859]/10 rounded-3xl p-6 md:p-8 text-center">
                                    {!isAlreadyInTrial && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#00A859] text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-4">
                                            <Clock size={10} fill="currentColor" />
                                            7 Dias de Teste Grátis Incluso
                                        </div>
                                    )}
                                    <h4 className="text-xl font-bold text-black mb-4">Ambiente 100% Seguro</h4>
                                    <p className="text-sm text-black/50 leading-relaxed max-w-md mx-auto mb-8">
                                        {isAlreadyInTrial 
                                            ? "Você será redirecionado para o checkout oficial do Stripe para ativar sua assinatura mensal ilimitada."
                                            : "Você será redirecionado para o checkout oficial do Stripe. Não cobraremos nada durante os primeiros 7 dias. Você pode cancelar a qualquer momento."}
                                    </p>
                                    
                                    <button
                                        onClick={handleCreateStripeSession}
                                        disabled={isProcessing}
                                        className="w-full py-5 bg-[#00A859] text-white rounded-2xl font-black text-lg hover:bg-[#008F4C] transition-all shadow-xl shadow-[#00A859]/20 flex items-center justify-center gap-3"
                                    >
                                        {isProcessing ? (
                                            <>
                                                <Loader2 className="animate-spin" size={24} />
                                                <span>Aguarde um momento...</span>
                                            </>
                                        ) : (
                                            <>
                                                <CreditCard size={24} />
                                                <span>Ir para Pagamento Seguro</span>
                                            </>
                                        )}
                                    </button>
                                </div>
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

                            <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Total Hoje</span>
                                            <p className={isAlreadyInTrial ? "text-white text-xs font-semibold" : "text-[#00A859] text-xs font-semibold"}>
                                                {isAlreadyInTrial ? "Ativação Instantânea Pro" : "Início do Teste Grátis"}
                                            </p>
                                        </div>
                                        <span className="text-3xl font-bold">R$ {isAlreadyInTrial ? monthlyPrice.toFixed(2).replace('.', ',') : '0,00'}</span>
                                    </div>

                                    {!isAlreadyInTrial && (
                                        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                                            <div className="space-y-0.5">
                                                <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Após {trialDays} dias</span>
                                                <p className="text-white/60 text-xs">Mensalidade Recorrente</p>
                                            </div>
                                            <div className="text-right">
                                                <span className="text-xl font-bold">R$ {monthlyPrice.toFixed(2).replace('.', ',')}</span>
                                                <span className="text-white/40 text-[10px] block">/mês</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-4 mb-10">
                                <p className="text-[10px] font-bold text-[#00A859] uppercase tracking-widest mb-4">TUDO LIBERADO NO PRO</p>
                                {[
                                    'Exportação PDF Ilimitada',
                                    'Gestão de todas as turmas',
                                    'Diários e Relatórios Automáticos',
                                    'Histórico Vitalício de Alunos',
                                    'Inteligência Artificial EduBot',
                                    'Sem anúncios ou limites'
                                ].map((item, i) => (
                                    <div key={i} className="flex items-center gap-2 text-xs text-white/70">
                                        <CheckCircle2 size={14} className="text-[#00A859]" />
                                        {item}
                                    </div>
                                ))}
                            </div>

                            <button
                                onClick={handleDowngradeToFree}
                                disabled={isDowngrading}
                                className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-white/60 text-sm font-semibold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                            >
                                {isDowngrading ? 'Processando...' : 'Manter Plano Free'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

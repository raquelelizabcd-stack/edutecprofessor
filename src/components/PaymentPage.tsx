import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CreditCard, ArrowLeft, CheckCircle2, ShieldCheck, Loader2, Star, Zap, Clock, QrCode, Copy, Check } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { UserProfile } from '../types';

const API_URL = (import.meta as any).env.VITE_API_URL || '';

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
    const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'pix' | 'mercadopago'>('stripe');
    const [cpf, setCpf] = useState('');
    const [pixData, setPixData] = useState<{ qrCode: string, qrCodeText: string, chargeId: string } | null>(null);
    const [copied, setCopied] = useState(false);
    
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

            // Link oficial de produção — novo link de hoje 05/04
            const stripeLink = (import.meta as any).env.VITE_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/28E14ngsDg454UtcAn6EU01";
            
            // Adicionamos parâmetros para o Stripe reconhecer o usuário no Webhook
            const separator = stripeLink.includes('?') ? '&' : '?';
            const finalUrl = `${stripeLink}${separator}client_reference_id=${activeUserId || ''}${activeEmail ? `&prefilled_email=${encodeURIComponent(activeEmail)}` : ''}`;
            
            window.location.href = finalUrl;

        } catch (err: any) {
            console.error('Checkout error:', err);
            // Fallback para o link puro em caso de erro crítico
            window.location.href = (import.meta as any).env.VITE_STRIPE_PAYMENT_LINK || "https://buy.stripe.com/28E14ngsDg454UtcAn6EU01";
        } finally {
            setIsProcessing(false);
        }
    };


    const handleCreateMercadoPagoPix = async () => {
        setIsProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let activeUserId = session?.user?.id;
            let activeEmail = session?.user?.email || email;

            if (!activeUserId) {
                if (!email || !password) {
                    alert('Por favor, informe seu e-mail para gerar o PIX.');
                    setIsProcessing(false);
                    return;
                }
                // Tenta Login ou Cadastro
                let { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
                if (authError && (authError.message.includes('User already registered') || authError.status === 400)) {
                    const loginResp = await supabase.auth.signInWithPassword({ email, password });
                    if (loginResp.error) throw loginResp.error;
                    authData = loginResp.data;
                } else if (authError) {
                    throw authError;
                }
                activeUserId = authData.user?.id;
                activeEmail = email;
            }

            const response = await fetch(`${API_URL}/api/pagamentos/pix`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: activeUserId,
                    email: activeEmail,
                    amount: 29.90,
                    description: 'Assinatura EduTec Pro'
                })
            });

            let data;
            try {
                data = await response.json();
            } catch (e) {
                console.error('Erro ao processar JSON da resposta:', e);
                throw new Error('O servidor não respondeu corretamente. Verifique se o backend está rodando.');
            }

            if (!response.ok) {
                throw new Error(data.details || data.error || data.message || 'Falha ao gerar PIX');
            }
            
            setPixData(data);
        } catch (err: any) {
            console.error('Mercado Pago PIX error:', err);
            alert('Falha ao gerar PIX: ' + err.message);
        } finally {
            setIsProcessing(false);
        }
    };

    const copyToClipboard = () => {
        if (pixData) {
            navigator.clipboard.writeText(pixData.qrCodeText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
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

            console.log('[PaymentPage] Realizando downgrade para FREE para o usuário:', session.user.id);
            const { error } = await supabase
                .from('users')
                .update({ plano: 'free', status_pagamento: 'gratis' })
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
                            <p className="text-black/40 text-sm">Escolha o melhor método para você e ative sua conta Pro.</p>
                        </div>

                        {/* Seleção de Método de Pagamento */}
                        {/* Seleção de Método de Pagamento */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
                            <button
                                onClick={() => setPaymentMethod('stripe')}
                                className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-4 ${paymentMethod === 'stripe' ? 'border-black bg-black text-white' : 'border-black/[0.05] hover:border-black/10'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'stripe' ? 'bg-white text-black' : 'bg-black/5 text-black/40'}`}>
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <h4 className={`font-bold ${paymentMethod === 'stripe' ? 'text-white' : 'text-black/60'}`}>Pagamento via Cartão e Boleto (Stripe)</h4>
                                    <p className={`text-xs mt-1 ${paymentMethod === 'stripe' ? 'text-white/60' : 'text-black/40'}`}>Gateway Seguro • Acesso Imediato</p>
                                </div>
                            </button>

                            <button
                                onClick={() => setPaymentMethod('mercadopago')}
                                className={`p-6 rounded-2xl border-2 transition-all text-left flex flex-col gap-4 ${paymentMethod === 'mercadopago' ? 'border-[#009EE3] bg-[#009EE3]/[0.02]' : 'border-black/[0.05] hover:border-black/10'}`}
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${paymentMethod === 'mercadopago' ? 'bg-[#009EE3] text-white' : 'bg-black/5 text-black/40'}`}>
                                    <QrCode size={20} />
                                </div>
                                <div>
                                    <h4 className={`font-bold ${paymentMethod === 'mercadopago' ? 'text-[#009EE3]' : 'text-black/60'}`}>Pagar com PIX</h4>
                                    <p className="text-xs text-black/40 mt-1">Mercado Pago • Sem necessidade de CPF</p>
                                </div>
                            </button>
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
                                                className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-black outline-none transition-all text-sm"
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
                                                className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-black outline-none transition-all text-sm"
                                            />
                                        </div>
                                    </div>
                                )}

                                {paymentMethod === 'pix' && (
                                    <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                                        <label className="text-[11px] font-bold uppercase tracking-wider text-black/40 ml-1">CPF (Necessário para o PIX)</label>
                                        <input
                                            type="text"
                                            required
                                            value={cpf}
                                            onChange={(e) => setCpf(e.target.value.replace(/\D/g, '').slice(0, 11))}
                                            placeholder="000.000.000-00"
                                            className="w-full px-5 py-4 bg-[#F9FAFB] rounded-xl border border-black/[0.05] focus:bg-white focus:border-[#00A859] outline-none transition-all text-sm"
                                        />
                                    </div>
                                )}
                            </section>

                            {/* 2. Ação de Checkout */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-black/[0.03] pb-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${paymentMethod === 'stripe' ? 'bg-[#0080FF]/10 text-[#0080FF]' : 'bg-[#00A859]/10 text-[#00A859]'}`}>
                                        {paymentMethod === 'stripe' ? <ShieldCheck size={18} /> : <Zap size={18} />}
                                    </div>
                                    <h3 className="font-bold text-lg text-black/80">
                                        {paymentMethod === 'stripe' ? '2. Finalizar no Stripe' : 
                                         paymentMethod === 'pix' ? '2. Gerar QR Code PIX' : '2. Gerar QR Code Mercado Pago'}
                                    </h3>
                                </div>

                                <div className={`border rounded-3xl p-6 md:p-8 text-center ${
                                    paymentMethod === 'stripe' ? 'bg-[#0080FF]/[0.02] border-[#0080FF]/10' : 
                                    paymentMethod === 'pix' ? 'bg-[#00A859]/[0.02] border-[#00A859]/10' : 
                                    'bg-[#009EE3]/[0.02] border-[#009EE3]/10'
                                }`}>
                                    {pixData ? (
                                        <div className="space-y-6 animate-in zoom-in duration-500">
                                            <div className="bg-white p-6 rounded-3xl shadow-lg border border-black/[0.05] inline-block mx-auto mb-4">
                                                <img src={pixData.qrCode} alt="QR Code PIX" className="w-48 h-48 mx-auto" />
                                            </div>
                                            
                                            <div className="space-y-4">
                                                <div className="p-4 bg-white/50 rounded-2xl border border-black/[0.05] text-left">
                                                    <p className="text-[10px] uppercase font-bold text-black/40 mb-2">Código Copia e Cola</p>
                                                    <div className="flex items-center gap-3">
                                                        <div className="flex-1 truncate text-xs font-mono text-black/60 bg-[#F9FAFB] p-3 rounded-lg border border-black/[0.03]">
                                                            {pixData.qrCodeText}
                                                        </div>
                                                        <button
                                                            onClick={copyToClipboard}
                                                            className="p-3 bg-black text-white rounded-xl hover:bg-black/80 transition-all shrink-0"
                                                        >
                                                            {copied ? <Check size={18} /> : <Copy size={18} />}
                                                        </button>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex items-start gap-3 text-left p-4 bg-[#00A859]/5 rounded-2xl border border-[#00A859]/10">
                                                    <Clock size={16} className="text-[#00A859] mt-0.5 shrink-0" />
                                                    <div>
                                                        <p className="text-xs font-bold text-black/70">Aguardando Pagamento</p>
                                                        <p className="text-[10px] text-black/40 mt-0.5">O sistema detectará o pagamento automaticamente em poucos segundos após a confirmação do seu banco.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <>

                                            
                                            <h4 className="text-xl font-bold text-black mb-4">
                                                {paymentMethod === 'stripe' ? 'Ambiente 100% Seguro' : 'Pagamento Instantâneo'}
                                            </h4>
                                            
                                            <p className="text-sm text-black/50 leading-relaxed max-w-md mx-auto mb-8">
                                                {paymentMethod === 'stripe' 
                                                    ? "Você será redirecionado para o checkout oficial do Stripe para processar sua assinatura do Plano Pro com total segurança."
                                                    : "O PIX é a forma mais rápida de ativar sua conta. O QR Code será gerado instantaneamente e seu acesso liberado assim que aprovado."}
                                            </p>
                                            
                                            <button
                                                onClick={
                                                    paymentMethod === 'stripe' ? handleCreateStripeSession : handleCreateMercadoPagoPix
                                                }
                                                disabled={isProcessing}
                                                className={`w-full py-5 text-white rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 ${
                                                    paymentMethod === 'stripe' ? 'bg-black hover:bg-zinc-800 shadow-black/20' : 
                                                    'bg-[#009EE3] hover:bg-[#0086C3] shadow-[#009EE3]/20'
                                                }`}
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={24} />
                                                        <span>Processando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        {paymentMethod === 'stripe' ? <CreditCard size={24} /> : <QrCode size={24} />}
                                                        <span>
                                                            {paymentMethod === 'stripe' ? 'Ir para Pagamento Seguro' : 'Gerar PIX Agora'}
                                                        </span>
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}
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
                                            <p className="text-[#00A859] text-xs font-semibold">
                                                {paymentMethod === 'mercadopago' ? "Pagamento Único PIX" : "Assinatura Plano Pro"}
                                            </p>
                                        </div>
                                        <span className="text-3xl font-bold">R$ {monthlyPrice.toFixed(2).replace('.', ',')}</span>
                                    </div>



                                    {paymentMethod === 'mercadopago' && (
                                        <div className="pt-4 border-t border-white/5">
                                            <div className="flex items-center gap-2 text-[#00A859]">
                                                <CheckCircle2 size={14} />
                                                <span className="text-[10px] font-bold uppercase tracking-wider">Acesso imediato por 30 dias</span>
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

                            <div className="space-y-4">
                                <button
                                    onClick={
                                        paymentMethod === 'stripe' ? handleCreateStripeSession : handleCreateMercadoPagoPix
                                    }
                                    disabled={isProcessing || isDowngrading || (paymentMethod === 'mercadopago' && !!pixData)}
                                    className={`w-full py-5 text-white rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 ${
                                        paymentMethod === 'stripe' ? 'bg-black hover:bg-zinc-800 shadow-black/20' : 
                                        'bg-[#009EE3] hover:bg-[#0086C3] shadow-[#009EE3]/20'
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                >
                                    {isProcessing ? (
                                        <Loader2 className="animate-spin" size={24} />
                                    ) : (
                                        <>
                                            {paymentMethod === 'stripe' ? <CreditCard size={20} /> : <QrCode size={20} />}
                                            <span>
                                                {paymentMethod === 'stripe' ? 'Assinar Agora' : 
                                                 pixData ? 'QR Code Gerado' : 'Gerar PIX Agora'}
                                            </span>
                                        </>
                                    )}
                                </button>

                                <button
                                    onClick={handleDowngradeToFree}
                                    disabled={isDowngrading || isProcessing}
                                    className="w-full py-4 bg-white/5 border border-white/10 rounded-xl text-white/40 text-xs font-semibold hover:bg-white/10 hover:text-white transition-all disabled:opacity-50"
                                >
                                    {isDowngrading ? 'Processando...' : 'Não, prefiro continuar no Plano Free'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle2, ShieldCheck, Loader2, Star, Zap, Clock, QrCode, Copy, Check, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

const API_URL = (import.meta as any).env.VITE_API_URL || '';

interface PaymentPixPageProps {
    onBack: () => void;
    onSuccess: () => void;
    onUnauthenticated: () => void;
    userEmail: string;
}

export default function PaymentPixPage({
    onBack,
    onSuccess,
    onUnauthenticated,
    userEmail
}: PaymentPixPageProps) {
    const [isProcessing, setIsProcessing] = useState(false);
    const [pixData, setPixData] = useState<{ qrCode: string, qrCodeText: string, chargeId: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const [price] = useState(9.90);
    
    // Auth states for non-authenticated users
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Monitorar pagamento em tempo real
    React.useEffect(() => {
        if (!pixData) return;

        let channel: any;
        const listenToPayment = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const activeUserId = session?.user?.id;
            if (!activeUserId) return;

            channel = supabase
                .channel(`payment-status-${activeUserId}`)
                .on(
                    'postgres_changes',
                    {
                        event: 'UPDATE',
                        schema: 'public',
                        table: 'users',
                        filter: `id=eq.${activeUserId}`
                    },
                    (payload: any) => {
                        const newStatus = payload.new?.status_pagamento;
                        if (newStatus === 'aprovado' || newStatus === 'ativo') {
                            onSuccess();
                        }
                    }
                )
                .subscribe();
        };

        listenToPayment();

        // Polling de fallback a cada 3 segundos
        const interval = setInterval(async () => {
            const { data: { session } } = await supabase.auth.getSession();
            const activeUserId = session?.user?.id;
            if (!activeUserId) return;

            const { data } = await supabase
                .from('users')
                .select('status_pagamento')
                .eq('id', activeUserId)
                .maybeSingle();

            if (data?.status_pagamento === 'aprovado' || data?.status_pagamento === 'ativo') {
                clearInterval(interval);
                onSuccess();
            }
        }, 3000);

        return () => {
            if (channel) supabase.removeChannel(channel);
            clearInterval(interval);
        };
    }, [pixData, onSuccess]);

    const handleCreateMercadoPagoPix = async () => {
        setIsProcessing(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            let activeUserId = session?.user?.id;
            let activeEmail = session?.user?.email || email;

            if (!activeUserId) {
                if (!email || !password) {
                    alert('Por favor, informe seu e-mail e senha para gerar o PIX.');
                    setIsProcessing(false);
                    return;
                }
                // Tenta Login ou Cadastro
                console.log('[PaymentPixPage PIX] Iniciando signUp para:', email);
                let { data: authData, error: authError } = await supabase.auth.signUp({ 
                    email, 
                    password,
                    options: {
                        emailRedirectTo: window.location.origin + '/login'
                    }
                });
                console.log('[PaymentPixPage PIX] Resultado do signUp:', { authData, authError });
                if (authError && (authError.message.includes('User already registered') || authError.status === 400)) {
                    const loginResp = await supabase.auth.signInWithPassword({ email, password });
                    if (loginResp.error) throw loginResp.error;
                    authData = loginResp.data;
                } else if (authError) {
                    throw authError;
                } else {
                    setToast({
                        message: '✅ Sucesso! E-mail de confirmação enviado. Verifique sua caixa de entrada ou spam.',
                        type: 'success'
                    });
                    setTimeout(() => setToast(null), 8000);
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
                    amount: price,
                    description: 'Assinatura EduTec Lançamento Pix'
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
            setToast({
                message: err.message || 'Falha ao gerar PIX.',
                type: 'error'
            });
            setTimeout(() => setToast(null), 6000);
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
                {/* Left Column - Checkout */}
                <div className="lg:col-span-7 space-y-6">
                    <div className="bg-white rounded-3xl p-8 md:p-10 shadow-sm border border-black/[0.03] relative overflow-hidden">
                        <div className="mb-10">
                            <h2 className="text-2xl font-bold tracking-tight mb-2">Finalize sua assinatura de lançamento via Pix</h2>
                            <p className="text-black/40 text-sm">Escaneie o QR Code ou copie o código Pix para ter acesso imediato.</p>
                            <div className="mt-4 p-4 bg-teal-50 border border-teal-100 rounded-2xl flex items-center gap-3 text-teal-800">
                                <Zap className="text-teal-600 shrink-0" size={20} />
                                <p className="text-xs font-semibold leading-normal">
                                    Oferta exclusiva de lançamento disponível apenas para pagamento via Pix. Todos os recursos do plano Pro por um preço promocional limitado.
                                </p>
                            </div>
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
                            </section>

                            {/* 2. Pagar com Pix */}
                            <section className="space-y-6">
                                <div className="flex items-center gap-3 border-b border-black/[0.03] pb-4">
                                    <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#00A859]/10 text-[#00A859]">
                                        <QrCode size={18} />
                                    </div>
                                    <h3 className="font-bold text-lg text-black/80">2. Gerar Código de Pagamento</h3>
                                </div>

                                <div className="border rounded-3xl p-6 md:p-8 text-center bg-[#009EE3]/[0.02] border-[#009EE3]/10">
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
                                            <h4 className="text-xl font-bold text-black mb-4">Pagamento Instantâneo via Pix</h4>
                                            <p className="text-sm text-black/50 leading-relaxed max-w-md mx-auto mb-8">
                                                O Pix é a forma mais rápida de ativar sua assinatura. O QR Code será gerado instantaneamente e sua conta será atualizada assim que o pagamento for concluído.
                                            </p>
                                            
                                            <button
                                                onClick={handleCreateMercadoPagoPix}
                                                disabled={isProcessing}
                                                className="w-full py-5 text-white rounded-2xl font-black text-lg transition-all shadow-xl flex items-center justify-center gap-3 bg-[#009EE3] hover:bg-[#0086C3] shadow-[#009EE3]/20"
                                            >
                                                {isProcessing ? (
                                                    <>
                                                        <Loader2 className="animate-spin" size={24} />
                                                        <span>Processando...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <QrCode size={24} />
                                                        <span>Pagar com Pix</span>
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center justify-center gap-2 text-black/40 text-xs">
                                    <ShieldCheck size={16} className="text-[#00A86B]" />
                                    <span>Pagamento 100% seguro via Mercado Pago</span>
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
                                    <h3 className="text-xl font-bold">Plano Lançamento</h3>
                                    <p className="text-white/40 text-xs uppercase tracking-widest">Assinatura Promocional Pix</p>
                                </div>
                            </div>

                            <div className="bg-white/5 rounded-2xl p-6 mb-8 border border-white/5">
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                            <span className="text-white/40 text-[10px] font-bold uppercase tracking-wider">Total Hoje</span>
                                            <p className="text-[#00A859] text-xs font-semibold">Pagamento Único PIX</p>
                                        </div>
                                        <span className="text-3xl font-bold">R$ 9,90</span>
                                    </div>
                                    <div className="pt-4 border-t border-white/5">
                                        <div className="flex items-center gap-2 text-[#00A859]">
                                            <CheckCircle2 size={14} />
                                            <span className="text-[10px] font-bold uppercase tracking-wider">Acesso imediato ao plano Pro</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4 mb-10">
                                <p className="text-[10px] font-bold text-[#00A859] uppercase tracking-widest mb-4">TUDO LIBERADO DO PLANO PRO</p>
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
                        </div>
                    </div>
                </div>
            </div>

            <AnimatePresence>
                {toast && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.9 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.9 }}
                        className={`fixed top-6 right-6 z-50 max-w-md p-4 rounded-2xl shadow-xl border flex items-start gap-3 ${
                            toast.type === 'success' 
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-800' 
                                : 'bg-red-50 border-red-100 text-red-800'
                        }`}
                    >
                        <div className={`p-1.5 rounded-xl shrink-0 ${toast.type === 'success' ? 'bg-[#00A859] text-white' : 'bg-red-500 text-white'}`}>
                            {toast.type === 'success' ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        </div>
                        <div className="flex-1 space-y-1 pr-2">
                            <p className="text-sm font-bold leading-none">{toast.type === 'success' ? 'Sucesso!' : 'Ocorreu um Erro'}</p>
                            <p className="text-xs opacity-90 leading-relaxed">{toast.message}</p>
                        </div>
                        <button 
                            onClick={() => setToast(null)} 
                            className="text-black/20 hover:text-black/40 transition-colors p-1"
                        >
                            <X size={16} />
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

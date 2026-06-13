import React from 'react';
import { CheckCircle2, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

interface SuccessPixPageProps {
    onGoToDashboard: () => void;
}

export default function SuccessPixPage({ onGoToDashboard }: SuccessPixPageProps) {
    return (
        <div className="min-h-screen bg-[#F8F9FA] text-[#1A1A1A] font-sans flex items-center justify-center py-12 px-6">
            <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.4 }}
                className="w-full max-w-md bg-white rounded-[40px] p-8 md:p-12 shadow-xl border border-black/[0.03] text-center space-y-8"
            >
                <div className="w-20 h-20 bg-emerald-50 rounded-full flex items-center justify-center mx-auto border border-emerald-100 text-[#00A859]">
                    <CheckCircle2 size={44} className="animate-bounce" />
                </div>

                <div className="space-y-3">
                    <h1 className="text-3xl font-black tracking-tight text-black">Assinatura Ativada!</h1>
                    <p className="text-black/50 text-sm leading-relaxed">
                        Sua assinatura de lançamento via Pix foi recebida e ativada com sucesso. Você agora possui acesso completo a todos os recursos do Plano Pro.
                    </p>
                </div>

                <div className="bg-emerald-50/50 border border-emerald-100/50 rounded-2xl p-4 text-left space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Resumo da Compra</p>
                    <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-black/60">Plano:</span>
                        <span className="text-black">Plano Lançamento Pro (Pix)</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-black/60">Valor:</span>
                        <span className="text-emerald-700">R$ 9,90/mês</span>
                    </div>
                    <div className="flex justify-between items-center text-xs font-semibold">
                        <span className="text-black/60">Status:</span>
                        <span className="text-emerald-700 flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full inline-block"></span>
                            Ativo
                        </span>
                    </div>
                </div>

                <button
                    onClick={onGoToDashboard}
                    className="w-full py-4 bg-[#00A859] hover:bg-[#008F4C] text-white rounded-full font-bold transition-all shadow-lg shadow-[#00A859]/20 flex items-center justify-center gap-2 group"
                >
                    <span>Ir para o Painel</span>
                    <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                </button>
            </motion.div>
        </div>
    );
}

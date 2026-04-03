import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Lock, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface PrivacyModalProps {
  userId: string;
  onAccept: () => void;
}

export default function PrivacyModal({ userId, onAccept }: PrivacyModalProps) {
  const [isAccepting, setIsAccepting] = useState(false);

  const handleAccept = async () => {
    setIsAccepting(true);
    try {
      const { error } = await supabase
        .from('users')
        .update({
          aceitou_privacidade: true,
          data_aceite: new Date().toISOString()
        })
        .eq('id', userId);

      if (error) throw error;
      onAccept();
    } catch (err) {
      console.error('Erro ao aceitar privacidade:', err);
      alert('Ocorreu um erro ao registrar seu aceite. Tente novamente.');
    } finally {
      setIsAccepting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="w-full max-w-lg bg-white rounded-[40px] shadow-2xl overflow-hidden border border-black/5"
      >
        <div className="p-8 md:p-12 text-center">
          <div className="w-16 h-16 bg-[#00A859]/10 rounded-2xl flex items-center justify-center text-[#00A859] mx-auto mb-8">
            <ShieldCheck size={32} />
          </div>
          
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-6 flex items-center justify-center gap-3">
            🔒 Aviso de Privacidade
          </h2>
          
          <div className="text-left space-y-4 mb-10 overflow-y-auto max-h-[300px] pr-2 custom-scrollbar">
            <p className="text-black/70 leading-relaxed text-sm md:text-base">
              O <strong>EduTecProfessor</strong> utiliza seus dados pessoais (nome, e-mail, registros pedagógicos e informações de assinatura) exclusivamente para oferecer os serviços dos planos Free e Pro.
            </p>
            <p className="text-black/70 leading-relaxed text-sm md:text-base">
              Esses dados são usados para gerenciar sua assinatura e pagamentos via Stripe, garantir retenção e segurança dos registros pedagógicos e cumprir requisitos legais (LGPD).
            </p>
            <p className="text-black/70 leading-relaxed text-sm md:text-base font-medium">
              Você pode migrar de plano, cancelar ou solicitar exclusão dos seus dados a qualquer momento.
            </p>
          </div>

          <button
            onClick={handleAccept}
            disabled={isAccepting}
            className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg shadow-black/10 disabled:opacity-50"
          >
            {isAccepting ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle size={20} />
                Aceitar e Continuar
              </>
            )}
          </button>
          
          <p className="mt-6 text-[10px] text-black/40 font-medium uppercase tracking-widest flex items-center justify-center gap-2">
            <Lock size={12} /> Compliance LGPD EduTecPro
          </p>
        </div>
      </motion.div>
    </div>
  );
}

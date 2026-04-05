import React, { useState } from 'react';
import * as Icons from 'lucide-react';
import { UserProfile, PedagogicalRecord, Student } from '../types';
import { supabase } from '../lib/supabase';


interface DataRetentionBannerProps {
    role: UserProfile;
    userCreatedAt: string | null;
    userDataExpiracao: string | null;
    records: PedagogicalRecord[];
    students: Student[];
}

export default function DataRetentionBanner({
    role,
    userCreatedAt,
    userDataExpiracao,
    records,
    students
}: DataRetentionBannerProps) {
    const [isDismissed, setIsDismissed] = useState(false);



    if (role === 'diretor' || role === 'public' || isDismissed) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let daysPassed = 0;
    let daysLeft = 0;
    let showExportButton = false;
    let showWarningUI = false;
    let message = '';
    let title = '';
    let expirationDateStr = '';

    if (role === 'free') {
        if (!userCreatedAt) return null;
        const createdDate = new Date(userCreatedAt);
        createdDate.setHours(0, 0, 0, 0);

        const diffTime = Math.abs(today.getTime() - createdDate.getTime());
        daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        daysLeft = Math.max(0, 3 - daysPassed); // Novo limite: 3 dias

        const expDate = new Date(createdDate);
        expDate.setDate(expDate.getDate() + 3);
        expirationDateStr = expDate.toLocaleDateString('pt-BR');

        title = 'Aviso de Retenção de Dados (Plano Free)';
        const baseMsg = 'No Plano Free seus dados ficam armazenados por apenas 3 dias para fins de teste rápido. Após esse período os dados são excluídos permanentemente.';
        message = `${baseMsg} Faltam ${daysLeft} dias para expirar.`;

        if (daysLeft <= 1) { 
            showWarningUI = true;
            message = `ALERTA: Seus dados serão removidos em ${daysLeft} dia(s). Faça upgrade para o Pro para mantê-los seguros!`;
        }

        // Botão sempre disponível para o Plano Free conforme solicitado
        showExportButton = true;

        // Se a pessoa passou os 15 dias, a conta será deletada, mas enquanto a session ta ativa mostramos:
        if (daysLeft === 0) {
            message = `O tempo limite de retenção de 3 dias foi atingido. Seus dados podem ser excluídos a qualquer momento.`;
            showWarningUI = true;
        }

    } else if (role === 'pro') {
        if (!userDataExpiracao) return null; // Wait for profile sync
        if (new Date(userDataExpiracao) >= today) {
            const expDateStr = userDataExpiracao ? new Date(userDataExpiracao).toLocaleDateString('pt-BR') : 'Indeterminado';
            showExportButton = true; // Always available for active Pro
            return (
                <div className="bg-[#00A859]/10 border border-[#00A859]/20 p-4 rounded-xl flex items-start gap-4 mb-6 relative">
                    <button onClick={() => setIsDismissed(true)} className="absolute top-4 right-4 text-black/40 hover:text-black">
                        <Icons.X size={18} />
                    </button>
                    <Icons.ShieldCheck className="text-[#00A859] shrink-0 mt-0.5" size={24} />
                    <div className="pr-6 flex-1">
                        <h4 className="font-bold text-[#00A859] text-sm">Período de Teste Grátis (Válida até {expDateStr})</h4>
                        <p className="text-sm text-black/70 mt-1 mb-3">
                            Você está no período de 7 dias grátis. Após este prazo, se não houver assinatura ativa, todos os dados salvos serão excluídos permanentemente por segurança.
                        </p>
                    </div>
                </div>
            );
        } else {
            // Pro Vencido
            const expDate = new Date(userDataExpiracao);
            expDate.setHours(0, 0, 0, 0);

            const diffTime = Math.abs(today.getTime() - expDate.getTime());
            daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            daysLeft = Math.max(0, 30 - daysPassed);

            const exclusionDate = new Date(expDate);
            exclusionDate.setDate(exclusionDate.getDate() + 30);
            expirationDateStr = exclusionDate.toLocaleDateString('pt-BR');

            title = 'Aviso de Retenção de Dados (Assinatura Vencida)';
            message = `Os dados ficam armazenados até 30 dias após o vencimento da assinatura. Sendo excluídos automaticamente em ${expirationDateStr}.`;

            if (daysLeft <= 1) { // day 29 and 30
                showWarningUI = true;
                message = `ALERTA: Faltam ${daysLeft} dias para seus dados expirarem e serem excluídos automaticamente em ${expirationDateStr}.`;
            }

            if (daysPassed >= 20) {
                showExportButton = true;
            }

            if (daysLeft === 0) {
                message = `O tempo limite de retenção dos seus dados foi atingido (${expirationDateStr}). Eles podem ser excluídos a qualquer momento pelo sistema.`;
                showWarningUI = true;
            }
        }
    }

    // Only display the banner if there's a warning UI or an export button to show. Otherwise, it's just silence (or dismissal).
    if (!showWarningUI && !showExportButton && role !== 'free') return null; // free is always showing



    return (
        <div className={`border p-4 rounded-xl flex items-start gap-4 mb-6 relative ${showWarningUI ? 'bg-red-50 border-red-200' : 'bg-orange-50 border-orange-200'}`}>
            <button onClick={() => setIsDismissed(true)} className="absolute top-4 right-4 text-black/40 hover:text-black">
                <Icons.X size={18} />
            </button>
            <Icons.AlertTriangle className={`shrink-0 mt-0.5 ${showWarningUI ? 'text-red-500' : 'text-orange-500'}`} size={24} />
            <div className="flex-1 pr-6">
                <h4 className={`font-bold text-sm ${showWarningUI ? 'text-red-800' : 'text-orange-800'}`}>{title}</h4>
                <p className={`text-sm mt-1 ${showWarningUI ? 'text-red-700' : 'text-orange-700'}`}>
                    {message}
                </p>


            </div>
        </div>
    );
}

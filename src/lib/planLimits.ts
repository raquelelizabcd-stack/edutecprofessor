import { supabase } from './supabase';
import { UserProfile } from '../types';

export interface PlanLimits {
  canCreatePlanning: boolean;
  canExportPDF: boolean;
  canCreateStudent: boolean;
  canCreatePortfolio: boolean;
  message?: string;
}

export const checkPlanLimits = async (
  userId: string, 
  role: UserProfile, 
  action: 'planning' | 'pdf' | 'student' | 'portfolio' | 'reflection'
): Promise<{ allowed: boolean; message?: string }> => {
  
  if (role === 'pro') {
    // Pro tem limites diários altos para segurança
    return { allowed: true };
  }

  // Busca contagens atuais no Supabase para validar limites
  if (role === 'free') {
    if (action === 'pdf') {
      return { allowed: false, message: "No Plano Free você pode exportar apenas 1 PDF por semana. Faça upgrade para ilimitado!" };
    }
    if (action === 'planning') {
       // Lógica simplificada: No Free, permitimos apenas 1 de cada por período
       return { allowed: false, message: "Limite do Plano Free atingido. Migre para o Pro para planejar sem limites!" };
    }
  }

  if (role === 'teste_pro') {
    if (action === 'pdf') {
      const { count } = await supabase.from('pedagogical_records').select('*', { count: 'exact', head: true }).eq('professor_id', userId);
      if ((count || 0) >= 4) return { allowed: false, message: "Você atingiu o limite de 4 PDFs totais do período de teste." };
    }
    if (action === 'student') {
      const { count } = await supabase.from('students').select('*', { count: 'exact', head: true }).eq('professor_id', userId);
      if ((count || 0) >= 5) return { allowed: false, message: "No período de teste você pode cadastrar até 5 alunos." };
    }
    if (action === 'portfolio') {
      const { count } = await supabase.from('pedagogical_records').select('*', { count: 'exact', head: true }).eq('professor_id', userId).eq('moduleId', 'portfolio');
      if ((count || 0) >= 10) return { allowed: false, message: "Limite de 10 registros de portfólio atingido no teste." };
    }
    if (action === 'reflection') {
      const { count } = await supabase.from('pedagogical_records').select('*', { count: 'exact', head: true }).eq('professor_id', userId).eq('moduleId', 'reflexoes');
      if ((count || 0) >= 5) return { allowed: false, message: "Limite de 5 entradas de reflexões atingido no teste." };
    }
    if (action === 'planning') {
       // Checa se já existe pelo menos um planejamento mensal e semanal
       const { count: weeklyCount } = await supabase.from('pedagogical_records').select('*', { count: 'exact', head: true }).eq('professor_id', userId).eq('moduleId', 'semanal');
       const { count: monthlyCount } = await supabase.from('pedagogical_records').select('*', { count: 'exact', head: true }).eq('professor_id', userId).eq('moduleId', 'mensal');
       
       if ((weeklyCount || 0) >= 1 || (monthlyCount || 0) >= 1) {
          return { allowed: false, message: "No período de teste é permitido apenas 1 planejamento de cada tipo." };
       }
    }
  }

  return { allowed: true };
};

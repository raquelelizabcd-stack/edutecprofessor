export type UserProfile = 'diretor' | 'professor' | 'free' | 'pro' | 'public';

export interface NavItem {
  id: string;
  label: string;
  icon: string;
  category: '' | 'Registros Pedagógicos' | 'Relatórios' | 'Gestão Pedagógica' | 'Prática Autônoma';
  roles: ('diretor' | 'professor' | 'free' | 'pro')[];
}

export interface Student {
  id: string;
  nome: string;
  data_nascimento?: string;
  serie?: string;
  status?: string;
  necessidades_especiais?: boolean;
  professor_id?: string;
  nota?: string;
  responsavel1_nome?: string;
  responsavel1_telefone?: string;
  responsavel2_nome?: string;
  responsavel2_telefone?: string;
  nota_bimestre1?: number | null;
  nota_bimestre2?: number | null;
  nota_bimestre3?: number | null;
  nota_bimestre4?: number | null;
  limitacoes_pcd?: string;
  created_at?: string;
}

export interface PedagogicalRecord {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  date: string;
  createdAt: string;
  alunoId?: string;
  alunoNome?: string;
  yearGrade?: string;
  curricularComponent?: string;
  period?: string;
  tone?: string;
  bnccCodes?: string[];
  bnccCodeText?: string;
  objectives?: string;
  content?: string;
  resources?: string;
  evaluation?: string;
  // New Monthly Record fields
  professorName?: string;
  discipline?: string;
  schoolUnit?: string;
  metodologias?: string;
  materiaisDidaticos?: string;
  obsComportamento?: string;
  comunicacaoResponsaveis?: string;
  participacaoConselhos?: string;
  atividadesColetivas?: string;
  formacaoContinuada?: string;
  autoavaliacao?: string;
  feedbackCoordenacao?: string;
  // Workload related (used in Registro Mensal)
  totalAulasDadas?: string;
  aulasPrevistas?: string;
  aulasPendentes?: string;
  apdHours?: string;
  frequenciaDiaria?: string;
  justificativasFaltas?: string;
  etapa?: 'EI' | 'EF';
  faixaEtaria?: string;
  blocoAnos?: string;
  componenteCurricular?: string;
  // Reflexões e Prática Autônoma
  percepcoes?: string;
  dificuldades?: string;
  conquistas?: string;
  // Weekly Grid Data
  weeklyData?: {
    [key: string]: {
      id?: string;
      turno?: string;
      horario?: string;
      etapa?: 'EI' | 'EF';
      faixaEtaria?: string;
      blocoAnos?: string;
      campoExperiencia?: string;
      componenteCurricular?: string;
      bnccCodes?: string[];
      atividade?: string;
      objetivo_aprendizagem?: string;
      acompanhamento?: string;
      observacoes?: string;
    };
  };
  // Planejamento Mensal
  mesPlanejamento?: string;
  anoPlanejamento?: string;
  atividades?: string;
}

export const NAV_ITEMS: NavItem[] = [
  // Dashboard isolated
  { id: 'dashboard-evolucao', label: 'Dashboard de Evolução', icon: 'LayoutDashboard', category: '', roles: ['diretor', 'professor', 'pro'] },

  // Registros Pedagógicos
  { id: 'planejamento-semanal', label: 'Planejamento Semanal', icon: 'Calendar', category: 'Registros Pedagógicos', roles: ['diretor', 'professor', 'free', 'pro'] },
  { id: 'planejamento-mensal', label: 'Planejamento Mensal', icon: 'CalendarDays', category: 'Registros Pedagógicos', roles: ['diretor', 'professor', 'free', 'pro'] },

  { id: 'planejamento-diario', label: 'Planejamento Diário', icon: 'FileEdit', category: 'Registros Pedagógicos', roles: ['diretor', 'professor', 'free', 'pro'] },

  // Relatórios
  { id: 'relatorio-individual', label: 'Relatório Individual', icon: 'FileText', category: 'Relatórios', roles: ['diretor', 'professor', 'free', 'pro'] },


  // Prática Autônoma
  { id: 'portfolio', label: 'Portfólio Digital', icon: 'History', category: 'Prática Autônoma', roles: ['professor', 'pro'] },
  { id: 'reflexoes', label: 'Diário de Reflexões', icon: 'BookOpen', category: 'Prática Autônoma', roles: ['professor', 'pro'] },

  // Gestão (Teacher centric)
  { id: 'alunos', label: 'Alunos', icon: 'Users', category: 'Gestão Pedagógica', roles: ['diretor', 'professor', 'pro'] },
];

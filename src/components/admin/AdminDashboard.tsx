import React, { useState, useEffect } from 'react';
import { 
  Users, 
  LayoutDashboard, 
  Settings, 
  Search, 
  Filter, 
  Download,
  MoreVertical,
  CheckCircle2,
  XCircle,
  Clock,
  LogOut,
  Check,
  Lock,
  LockKeyhole,
  Key,
  FileText,
  UserCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Menu,
  X,
  CreditCard,
  Zap,
  GraduationCap,
  BookOpen,
  Calendar,
  Activity,
  History,
  QrCode,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Plus,
  CheckSquare,
  Book,
  BarChart2,
  ChevronDown,
  ChevronUp,
  Target,
  LifeBuoy,
  Send,
  Mail,
  Inbox,
  Archive,
  Bell,
  Trash2,
  MessageSquare,
  Reply,
  Volume2,
  Music,
  BellRing,
  Play
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { UserProfile } from '../../types';

interface AdminStats {
  totalProfessors: number;
  proProfessors: number;
  totalAlunos: number;
  totalPlanejamentos: number;
  totalPresencas: number;
  recentPayments: any[];
}

interface AdminUser {
  id: string;
  nome: string;
  email: string;
  plano: string;
  status_pagamento: string;
  created_at: string;
  role: string;
  is_blocked?: boolean;
}

interface AuthUser {
  id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string;
}

interface SupportMessage {
  id: string;
  remetente_email: string;
  remetente_nome: string;
  assunto: string;
  mensagem: string;
  status: 'aberto' | 'respondido' | 'resolvido';
  lido: boolean;
  user_id?: string;
  created_at: string;
  resposta?: string;
  respondido_em?: string;
}

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'pedagogia' | 'payments' | 'logs' | 'settings' | 'support'>('dashboard');
  const [stats, setStats] = useState<AdminStats>({ 
    totalProfessors: 0, 
    proProfessors: 0, 
    totalAlunos: 0,
    totalPlanejamentos: 0,
    totalPresencas: 0,
    recentPayments: [] 
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [modalType, setModalType] = useState<'edit' | 'history' | 'logs' | 'userDetails' | null>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  
  // Efeito para ajustar sidebar no resize
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        setIsSidebarOpen(false);
      } else {
        setIsSidebarOpen(true);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [userDetailedData, setUserDetailedData] = useState<{
    planejamentoDiario: any[];
    planejamentoSemanal: any[];
    planejamentoMensal: any[];
    relatorios: any[];
    diarioReflexoes: any[];
    portfolioDigital: any[];
    alunos: any[];
    presencaAlunos: any[];
    loading: boolean;
  }>({
    planejamentoDiario: [],
    planejamentoSemanal: [],
    planejamentoMensal: [],
    relatorios: [],
    diarioReflexoes: [],
    portfolioDigital: [],
    alunos: [],
    presencaAlunos: [],
    loading: false
  });
  const [userDetailedActiveTab, setUserDetailedActiveTab] = useState('resumo');
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});
  
  // Estados de Pagamentos
  const [stripePayments, setStripePayments] = useState<any[]>([]);
  const [pixPayments, setPixPayments] = useState<any[]>([]);
  const [paymentsLoading, setPaymentsLoading] = useState(false);
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'stripe' | 'pix'>('all');
  const [stripeFinancials, setStripeFinancials] = useState<any>(null);
  const [financialsLoading, setFinancialsLoading] = useState(false);
  const [mpFinancials, setMpFinancials] = useState<any>(null);
  const [mpLoading, setMpLoading] = useState(false);

  const [revenueStats, setRevenueStats] = useState({
    monthly: 0,
    accumulated: 0,
    history: [] as { label: string, value: number }[]
  });
  
  const [layoutConfig, setLayoutConfig] = useState({
    theme: 'light',
    bgColor: '#F8FAFC',
    accentColor: '#2563EB',
    bgImage: ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [limitFree, setLimitFree] = useState(1);
  const [limitPro, setLimitPro] = useState(10);
  const [limitsSuccess, setLimitsSuccess] = useState(false);
  const [trialDays, setTrialDays] = useState(7);
  const [promoStart, setPromoStart] = useState('');
  const [promoEnd, setPromoEnd] = useState('');
  const [promoStatus, setPromoStatus] = useState<'standard' | 'promo' | 'auto'>('standard');
  const [promoSuccess, setPromoSuccess] = useState(false);
  const [pixPromoStart, setPixPromoStart] = useState('');
  const [pixPromoEnd, setPixPromoEnd] = useState('');
  const [pixPromoStatus, setPixPromoStatus] = useState<'standard' | 'promo' | 'auto'>('standard');
  const [pixPromoSuccess, setPixPromoSuccess] = useState(false);
  const [showCredentialsModal, setShowCredentialsModal] = useState(false);
  const [showAdminPassword, setShowAdminPassword] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState('raquelduarteadmin@gmail.com');
  const [newAdminPassword, setNewAdminPassword] = useState('Jean@21220300');
  const [isSavingAdminCreds, setIsSavingAdminCreds] = useState(false);
  const [saveCredsSuccess, setSaveCredsSuccess] = useState(false);
  
  // Estados de Suporte
  const [supportMessages, setSupportMessages] = useState<SupportMessage[]>([]);
  const [selectedSupportMessage, setSelectedSupportMessage] = useState<SupportMessage | null>(null);
  const [showSupportReplyModal, setShowSupportReplyModal] = useState(false);
  const [supportReplyText, setSupportReplyText] = useState('');
  const [supportLoading, setSupportLoading] = useState(false);
  const unreadSupportCount = supportMessages.filter(m => !m.lido).length;
  const [supportViewTab, setSupportViewTab] = useState<'inbox' | 'compose'>('inbox');
  const [supportSearch, setSupportSearch] = useState('');
  const [newEmailData, setNewEmailData] = useState({ to: '', subject: '', message: '' });
  
  const isPromoActive = (() => {
    const now = new Date();
    if (promoStatus === 'promo') return true;
    if (promoStatus === 'standard') return false;
    if (promoStart && promoEnd) {
      const start = new Date(promoStart);
      const end = new Date(promoEnd);
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    }
    return false;
  })();

  const isPixPromoActive = (() => {
    const now = new Date();
    if (pixPromoStatus === 'promo') return true;
    if (pixPromoStatus === 'standard') return false;
    if (pixPromoStart && pixPromoEnd) {
      const start = new Date(pixPromoStart);
      const end = new Date(pixPromoEnd);
      end.setHours(23, 59, 59, 999);
      return now >= start && now <= end;
    }
    return false;
  })();

  // Notificações Sonoras
  const [soundConfig, setSoundConfig] = useState(() => {
    const saved = localStorage.getItem('edutec_sound_config');
    return saved ? JSON.parse(saved) : {
      support: { enabled: true, sound: 'bell', customUrl: '' },
      payments: { enabled: true, sound: 'soft', customUrl: '' },
      students: { enabled: true, sound: 'notify', customUrl: '' },
      planning: { enabled: false, sound: 'soft', customUrl: '' },
    };
  });

  const soundUrls = {
    bell: 'https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3',
    soft: 'https://assets.mixkit.co/active_storage/sfx/2354/2354-preview.mp3',
    notify: 'https://assets.mixkit.co/active_storage/sfx/2218/2218-preview.mp3'
  };

  const playEventSound = (type: keyof typeof soundConfig) => {
    const config = soundConfig[type];
    if (!config.enabled) return;

    const url = config.customUrl || soundUrls[config.sound as keyof typeof soundUrls];
    if (url) {
      const audio = new Audio(url);
      audio.volume = 0.6;
      audio.play().catch(e => console.warn("Erro ao reproduzir som:", e));
    }
  };
  const [showNotificationDropdown, setShowNotificationDropdown] = useState(false);

  useEffect(() => {
    // Carregar preferências salvas
    const saved = localStorage.getItem('admin_layout_config');
    if (saved) {
      setLayoutConfig(JSON.parse(saved));
    }
    fetchData();
    if (activeTab === 'settings') {
      fetchLimits();
    }
    if (activeTab === 'payments') {
      fetchStripeFinancials();
      fetchMpFinancials();
    }
  }, [activeTab]);

  useEffect(() => {
    if (showCredentialsModal) {
      const fetchAdminEmail = async () => {
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (user && user.email) {
            setNewAdminEmail(user.email);
          }
        } catch (e) {
          console.error(e);
        }
      };
      fetchAdminEmail();
    }
  }, [showCredentialsModal]);

  // Suporte Realtime
  useEffect(() => {
    fetchSupportMessages();

    // Ouvinte Suporte
    const supportChannel = supabase
      .channel('suporte_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'suporte_mensagens' }, () => {
        fetchSupportMessages();
        playEventSound('support');
      })
      .subscribe();

    // Ouvinte Pagamentos
    const paymentChannel = supabase
      .channel('payments_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pagamentos_stripe' }, () => {
        playEventSound('payments');
        fetchData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pagamentos_pix' }, () => {
        playEventSound('payments');
        fetchData();
      })
      .subscribe();

    // Ouvinte Alunos e Presença
    const studentsChannel = supabase
      .channel('students_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'alunos' }, () => {
        playEventSound('students');
        fetchData();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'presenca_alunos' }, () => {
        playEventSound('students');
      })
      .subscribe();

    // Ouvinte Planejamentos
    const planningChannel = supabase
      .channel('planning_realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'planejamentos' }, () => playEventSound('planning'))
      .subscribe();

    return () => {
      supabase.removeChannel(supportChannel);
      supabase.removeChannel(paymentChannel);
      supabase.removeChannel(studentsChannel);
      supabase.removeChannel(planningChannel);
    };
  }, [soundConfig]);

  const fetchStripeFinancials = async () => {
    setFinancialsLoading(true);
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/stripe-financials`);
      const data = await response.json();
      setStripeFinancials(data);
    } catch (err) {
      console.error("Erro ao carregar dados financeiros do Stripe:", err);
    } finally {
      setFinancialsLoading(false);
    }
  };

  const fetchMpFinancials = async () => {
    setMpLoading(true);
    try {
      const apiUrl = (import.meta as any).env.VITE_API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/api/admin/mp-financials`);
      const data = await response.json();
      setMpFinancials(data);
    } catch (err) {
      console.error("Erro ao carregar dados financeiros do Mercado Pago:", err);
    } finally {
      setMpLoading(false);
    }
  };

  const fetchLimits = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('nome')
        .eq('email', 'system_settings@edutec.com')
        .maybeSingle();

      if (data && data.nome) {
        const parsed = JSON.parse(data.nome);
        if (parsed.limit_free !== undefined) setLimitFree(parsed.limit_free);
        if (parsed.limit_pro !== undefined) setLimitPro(parsed.limit_pro);
        if (parsed.trial_days !== undefined) setTrialDays(parsed.trial_days);
        if (parsed.promo_start !== undefined) setPromoStart(parsed.promo_start);
        if (parsed.promo_end !== undefined) setPromoEnd(parsed.promo_end);
        if (parsed.promo_status !== undefined) setPromoStatus(parsed.promo_status);
        if (parsed.pix_promo_start !== undefined) setPixPromoStart(parsed.pix_promo_start);
        if (parsed.pix_promo_end !== undefined) setPixPromoEnd(parsed.pix_promo_end);
        if (parsed.pix_promo_status !== undefined) setPixPromoStatus(parsed.pix_promo_status);
      }
    } catch (e) {
      console.error("Erro ao carregar limites:", e);
    }
  };

  const saveLimits = async () => {
    try {
      const { data } = await supabase
        .from('users')
        .select('nome')
        .eq('email', 'system_settings@edutec.com')
        .maybeSingle();

      let existing = {};
      if (data && data.nome) {
        existing = JSON.parse(data.nome);
      }

      const updated = {
        ...existing,
        limit_free: limitFree,
        limit_pro: limitPro,
        trial_days: trialDays
      };

      const { error } = await supabase
        .from('users')
        .upsert({
          id: '00000000-0000-0000-0000-000000000000',
          email: 'system_settings@edutec.com',
          nome: JSON.stringify(updated),
          plano: 'pro',
          status_pagamento: 'active',
          role: 'admin'
        });

      if (error) throw error;

      setLimitsSuccess(true);
      setTimeout(() => setLimitsSuccess(false), 3000);
    } catch (e) {
      console.error("Erro ao salvar limites:", e);
      alert("Erro ao salvar limites diários.");
    }
  };

  const savePromoSettings = async (status: 'standard' | 'promo' | 'auto', startVal?: string, endVal?: string) => {
    try {
      const start = startVal !== undefined ? startVal : promoStart;
      const end = endVal !== undefined ? endVal : promoEnd;
      const finalStatus = status;

      const { data } = await supabase
        .from('users')
        .select('nome')
        .eq('email', 'system_settings@edutec.com')
        .maybeSingle();

      let existing = {};
      if (data && data.nome) {
        existing = JSON.parse(data.nome);
      }

      const updated = {
        ...existing,
        promo_start: start,
        promo_end: end,
        promo_status: finalStatus
      };

      const { error } = await supabase
        .from('users')
        .upsert({
          id: '00000000-0000-0000-0000-000000000000',
          email: 'system_settings@edutec.com',
          nome: JSON.stringify(updated),
          plano: 'pro',
          status_pagamento: 'active',
          role: 'admin'
        });

      if (error) throw error;

      setPromoStatus(finalStatus);
      setPromoStart(start);
      setPromoEnd(end);
      setPromoSuccess(true);
      setTimeout(() => setPromoSuccess(false), 3000);
    } catch (e) {
      console.error("Erro ao salvar configurações de promoção:", e);
      alert("Erro ao salvar configurações de promoção.");
    }
  };

  const getPromoStatusDescription = () => {
    const now = new Date();
    
    if (promoStatus === 'promo') {
      return { text: 'Promoção ativa (Forçada Manualmente)', color: 'text-green-600 bg-green-50 border border-green-200' };
    }
    
    if (promoStatus === 'standard') {
      return { text: 'Preço padrão ativo', color: 'text-slate-600 bg-slate-50 border border-slate-200' };
    }
    
    if (promoStart && promoEnd) {
      const start = new Date(promoStart);
      const end = new Date(promoEnd);
      end.setHours(23, 59, 59, 999);
      
      if (now >= start && now <= end) {
        return { text: `Promoção ativa até ${new Date(promoEnd).toLocaleDateString('pt-BR')}`, color: 'text-green-600 bg-green-50 border border-green-200' };
      } else if (now < start) {
        return { text: `Agendada: Promoção inicia em ${new Date(promoStart).toLocaleDateString('pt-BR')}`, color: 'text-amber-600 bg-amber-50 border border-amber-200' };
      } else {
        return { text: 'Preço padrão ativo (Promoção expirada)', color: 'text-slate-600 bg-slate-50 border border-slate-200' };
      }
    }
    
    return { text: 'Preço padrão ativo', color: 'text-slate-600 bg-slate-50 border border-slate-200' };
  };

  const savePixPromoSettings = async (status: 'standard' | 'promo' | 'auto', startVal?: string, endVal?: string) => {
    try {
      const start = startVal !== undefined ? startVal : pixPromoStart;
      const end = endVal !== undefined ? endVal : pixPromoEnd;
      const finalStatus = status;

      const { data } = await supabase
        .from('users')
        .select('nome')
        .eq('email', 'system_settings@edutec.com')
        .maybeSingle();

      let existing = {};
      if (data && data.nome) {
        existing = JSON.parse(data.nome);
      }

      const updated = {
        ...existing,
        pix_promo_start: start,
        pix_promo_end: end,
        pix_promo_status: finalStatus
      };

      const { error } = await supabase
        .from('users')
        .upsert({
          id: '00000000-0000-0000-0000-000000000000',
          email: 'system_settings@edutec.com',
          nome: JSON.stringify(updated),
          plano: 'pro',
          status_pagamento: 'active',
          role: 'admin'
        });

      if (error) throw error;

      setPixPromoStatus(finalStatus);
      setPixPromoStart(start);
      setPixPromoEnd(end);
      setPixPromoSuccess(true);
      setTimeout(() => setPixPromoSuccess(false), 3000);
    } catch (e) {
      console.error("Erro ao salvar configurações de promoção Pix:", e);
      alert("Erro ao salvar configurações de promoção Pix.");
    }
  };

  const getPixPromoStatusDescription = () => {
    const now = new Date();
    
    if (pixPromoStatus === 'promo') {
      return { text: 'Promoção ativa (Forçada Manualmente)', color: 'text-green-600 bg-green-50 border border-green-200' };
    }
    
    if (pixPromoStatus === 'standard') {
      return { text: 'Preço padrão ativo', color: 'text-slate-600 bg-slate-50 border border-slate-200' };
    }
    
    if (pixPromoStart && pixPromoEnd) {
      const start = new Date(pixPromoStart);
      const end = new Date(pixPromoEnd);
      end.setHours(23, 59, 59, 999);
      
      if (now >= start && now <= end) {
        return { text: `Promoção ativa até ${new Date(pixPromoEnd).toLocaleDateString('pt-BR')}`, color: 'text-green-600 bg-green-50 border border-green-200' };
      } else if (now < start) {
        return { text: `Agendada: Promoção inicia em ${new Date(pixPromoStart).toLocaleDateString('pt-BR')}`, color: 'text-amber-600 bg-amber-50 border border-amber-200' };
      } else {
        return { text: 'Preço padrão ativo (Promoção expirada)', color: 'text-slate-600 bg-slate-50 border border-slate-200' };
      }
    }
    
    return { text: 'Preço padrão ativo', color: 'text-slate-600 bg-slate-50 border border-slate-200' };
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      if (activeTab === 'dashboard' || activeTab === 'users') {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .order('created_at', { ascending: false });
        
        if (userError) throw userError;
        if (userData) {
          setUsers(userData);
          const proCount = userData.filter(u => u.plano === 'pro').length;
          setStats(prev => ({ 
            ...prev, 
            totalProfessors: userData.length, 
            proProfessors: proCount 
          }));
        }

        // Buscar todos os pagamentos para cálculo de faturamento no Dashboard
        const [stripeAll, pixAll] = await Promise.all([
          supabase
            .from('pagamentos_stripe')
            .select('valor, status, created_at'),
          supabase
            .from('pagamentos_pix')
            .select('valor, status, created_at')
        ]);

        const stripeData = stripeAll.data || [];
        const pixData = pixAll.data || [];

        // Combinar todos os registros de pagamentos pagos/aprovados/ativos/sucedidos
        const paidRecords = [
          ...stripeData.map(p => ({ ...p, valor: parseFloat(p.valor) || 0 })),
          ...pixData.map(p => ({ ...p, valor: parseFloat(p.valor) || 0 }))
        ].filter(p => 
          p.status === 'PAID' || 
          p.status === 'active' || 
          p.status === 'succeeded' || 
          p.status === 'aprovado'
        );

        // Faturamento Acumulado
        const accumulated = paidRecords.reduce((sum, p) => sum + p.valor, 0);

        // Faturamento Mensal Atual
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        const monthly = paidRecords
          .filter(p => {
            const date = new Date(p.created_at);
            return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
          })
          .reduce((sum, p) => sum + p.valor, 0);

        // Evolução dos últimos 3 meses
        const monthNames = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
        const history: { label: string, value: number }[] = [];
        
        for (let i = 2; i >= 0; i--) {
          const d = new Date();
          d.setMonth(now.getMonth() - i);
          const m = d.getMonth();
          const y = d.getFullYear();
          
          const total = paidRecords
            .filter(p => {
              const date = new Date(p.created_at);
              return date.getMonth() === m && date.getFullYear() === y;
            })
            .reduce((sum, p) => sum + p.valor, 0);

          history.push({
            label: `${monthNames[m]}/${String(y).slice(-2)}`,
            value: total
          });
        }

        setRevenueStats({
          monthly,
          accumulated,
          history
        });

        // Buscar usuários do Schema AUTH via RPC
        const { data: authData, error: authError } = await supabase
          .rpc('get_auth_users');
        
        if (authError) {
          console.error("Erro ao buscar usuários Auth:", authError);
        } else if (authData) {
          setAuthUsers(authData);
        }
      }

      if (activeTab === 'payments') {
        setPaymentsLoading(true);
        const [stripeRes, pixRes] = await Promise.all([
          supabase
            .from('pagamentos_stripe')
            .select('*, users(nome, email)')
            .order('created_at', { ascending: false }),
          supabase
            .from('pagamentos_pix')
            .select('*, users(nome, email)')
            .order('created_at', { ascending: false })
        ]);
        
        if (stripeRes.data) setStripePayments(stripeRes.data);
        if (pixRes.data) setPixPayments(pixRes.data);
        setPaymentsLoading(false);
      }

      
      // Estatísticas Pedagógicas Globais
      const [
        { count: alunosCount },
        { count: planejamentosCount },
        { count: presencaCount }
      ] = await Promise.all([
        supabase.from('alunos').select('*', { count: 'exact', head: true }),
        supabase.from('planejamentos').select('*', { count: 'exact', head: true }),
        supabase.from('presenca_alunos').select('*', { count: 'exact', head: true })
      ]);

      setStats(prev => ({
        ...prev,
        totalAlunos: alunosCount || 0,
        totalPlanejamentos: planejamentosCount || 0,
        totalPresencas: presencaCount || 0
      }));

      // Buscar Alunos Recentes (Global)
      const { data: studentData } = await supabase
        .from('alunos')
        .select('*, users(nome)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (studentData) setRecentStudents(studentData);

      // Buscar Planejamentos Recentes (Global)
      const { data: planData } = await supabase
        .from('planejamentos')
        .select('*, users(nome)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (planData) setRecentPlans(planData);

      // Buscar Pagamentos Recentes (Global - Combinado)
      const [stripeRecent, pixRecent] = await Promise.all([
        supabase
          .from('pagamentos_stripe')
          .select('*, users(nome, email)')
          .order('created_at', { ascending: false })
          .limit(5),
        supabase
          .from('pagamentos_pix')
          .select('*, users(nome, email)')
          .order('created_at', { ascending: false })
          .limit(5)
      ]);

      const combinedRecent = [
        ...(stripeRecent.data || []).map(p => ({ ...p, metodo: 'Stripe', data_pagamento: p.created_at })),
        ...(pixRecent.data || []).map(p => ({ ...p, metodo: 'PIX', data_pagamento: p.created_at }))
      ].sort((a, b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime())
      .slice(0, 10);

      setStats(prev => ({ ...prev, recentPayments: combinedRecent }));
    } finally {
      setLoading(false);
    }
  };

  const fetchSupportMessages = async () => {
    try {
      const { data, error } = await supabase
        .from('suporte_mensagens')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      if (data) {
        setSupportMessages(data);
      }
    } catch (err) {
      console.error("Erro ao buscar suporte:", err);
    }
  };

  const markMessageAsRead = async (id: string) => {
    try {
      const { error } = await supabase
        .from('suporte_mensagens')
        .update({ lido: true })
        .eq('id', id);
      if (error) throw error;
      setSupportMessages(prev => prev.map(m => m.id === id ? { ...m, lido: true } : m));
    } catch (err) {
      console.error("Erro ao marcar como lida:", err);
    }
  };

  const handleSupportMessageAction = async (id: string, newStatus: SupportMessage['status']) => {
    try {
      const { error } = await supabase
        .from('suporte_mensagens')
        .update({ status: newStatus })
        .eq('id', id);
      if (error) throw error;
      setSupportMessages(prev => prev.map(m => m.id === id ? { ...m, status: newStatus } : m));
    } catch (err) {
      alert("Erro ao atualizar status");
    }
  };

  const handleSendSupportReply = async () => {
    if (!selectedSupportMessage || !supportReplyText) return;
    setSupportLoading(true);
    try {
      // Chamar backend para enviar e-mail real
      const response = await fetch('http://localhost:3001/api/support/reply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messageId: selectedSupportMessage.id,
          email: selectedSupportMessage.remetente_email,
          subject: selectedSupportMessage.assunto,
          replyText: supportReplyText
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);
      
      setSupportMessages(prev => prev.map(m => 
        m.id === selectedSupportMessage.id 
          ? { ...m, resposta: supportReplyText, status: 'respondido', respondido_em: new Date().toISOString() } 
          : m
      ));
      
      setSupportReplyText('');
      setShowSupportReplyModal(false);
      alert("E-mail enviado e resposta registrada!");
    } catch (err) {
      alert("Erro ao enviar resposta via backend.");
    } finally {
      setSupportLoading(false);
    }
  };

  const handleSendNewEmail = async () => {
    if (!newEmailData.to || !newEmailData.message) return;
    setSupportLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/support/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: newEmailData.to,
          subject: newEmailData.subject,
          message: newEmailData.message
        })
      });

      const data = await response.json();
      if (!data.success) throw new Error(data.error);

      setNewEmailData({ to: '', subject: '', message: '' });
      setSupportViewTab('inbox');
      fetchSupportMessages();
      alert("E-mail enviado com sucesso!");
    } catch (err: any) {
      alert("Erro ao enviar e-mail: " + err.message);
    } finally {
      setSupportLoading(false);
    }
  };

  const syncMessages = async () => {
    setSupportLoading(true);
    try {
      const response = await fetch('http://localhost:3001/api/support/sync');
      const data = await response.json();
      if (data.success) {
        if (data.synced > 0) {
          alert(`${data.synced} nova(s) mensagem(ns) sincronizada(s)!`);
          fetchSupportMessages();
        } else {
          alert("Nenhuma nova mensagem encontrada.");
        }
      }
    } catch (err) {
      console.error("Erro ao sincronizar:", err);
      alert("Erro ao conectar com o servidor de e-mail.");
    } finally {
      setSupportLoading(false);
    }
  };

  const renderSupportView = () => {
    // Agrupar mensagens por email para mostrar threads
    const threads = supportMessages.reduce((acc: any, msg) => {
      // Se a mensagem foi enviada pelo admin, o "dono" da thread é o destinatário (metadata.to)
      // Se foi recebida, o dono é o remetente (remetente_email)
      const threadOwner = (msg.metadata?.to && msg.remetente_email.includes('edutecprof1@gmail.com')) 
        ? msg.metadata.to 
        : msg.remetente_email;
      
      if (!acc[threadOwner]) acc[threadOwner] = [];
      acc[threadOwner].push(msg);
      // Ordenar mensagens dentro da thread pela data (mais recente primeiro na lista lateral)
      acc[threadOwner].sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
      return acc;
    }, {});

    // Ordenar as threads pela data da mensagem mais recente
    const sortedEmails = Object.keys(threads).sort((a, b) => {
      return new Date(threads[b][0].created_at).getTime() - new Date(threads[a][0].created_at).getTime();
    });

    return (
      <div className="space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div>
            <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
              <LifeBuoy className="text-blue-600" /> Centro de Suporte Gmail
            </h2>
            <p className="text-sm text-slate-500">Comunicação bidirecional integrada com {process.env.SUPPORT_EMAIL || 'edutecprof1@gmail.com'}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button 
              onClick={syncMessages}
              disabled={supportLoading}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-xl text-sm font-bold hover:bg-indigo-100 transition-all disabled:opacity-50"
            >
              <Activity size={18} className={supportLoading ? 'animate-spin' : ''} />
              Sincronizar Gmail
            </button>
            <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button 
                onClick={() => setSupportViewTab('inbox')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${supportViewTab === 'inbox' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 opacity-60'}`}
              >
                <Inbox size={18} /> Inbox
              </button>
              <button 
                onClick={() => setSupportViewTab('compose')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold transition-all ${supportViewTab === 'compose' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50 opacity-60'}`}
              >
                <Send size={18} /> Novo E-mail
              </button>
            </div>
          </div>
        </div>

        {supportViewTab === 'inbox' ? (
            <div className={`bg-white rounded-2xl border border-slate-200 shadow-xl overflow-hidden flex flex-col md:flex-row h-[75vh]`}>
              {/* Sidebar de Threads */}
              <div className={`${selectedSupportMessage ? 'hidden md:flex' : 'flex'} w-full md:w-80 border-r border-slate-200 flex-col bg-slate-50/50`}>
                <div className="p-4 border-b border-slate-200 bg-white">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Buscar conversa..."
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:ring-2 focus:ring-blue-500 transition-all"
                      value={supportSearch}
                      onChange={(e) => setSupportSearch(e.target.value)}
                    />
                  </div>
                </div>

              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {sortedEmails
                  .filter(email => {
                    const thread = threads[email];
                    return email.toLowerCase().includes(supportSearch.toLowerCase()) || 
                           thread[0].remetente_nome?.toLowerCase().includes(supportSearch.toLowerCase());
                  })
                  .map((email) => {
                    const thread = threads[email];
                    const latest = thread[0];
                    const unreadCount = thread.filter((m: any) => !m.lido).length;
                    const isSelected = selectedSupportMessage?.remetente_email === email;

                    return (
                      <button
                        key={email}
                        onClick={() => {
                          setSelectedSupportMessage(latest);
                          // Marcar todas como lidas nesta thread
                          thread.forEach((msg: any) => {
                            if (!msg.lido) markMessageAsRead(msg.id);
                          });
                        }}
                        className={`w-full text-left p-4 hover:bg-white transition-all border-l-4 relative ${isSelected ? 'bg-white border-l-blue-600 shadow-sm' : 'border-transparent opacity-80'}`}
                      >
                        <div className="flex justify-between items-start mb-1">
                          <span className={`text-sm truncate pr-2 ${!isSelected ? 'text-slate-700' : 'text-blue-700 font-black'}`}>
                            {latest.remetente_nome || email.split('@')[0]}
                          </span>
                          <span className="text-[10px] text-slate-400 whitespace-nowrap">
                            {new Date(latest.created_at).toLocaleDateString('pt-BR')}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-slate-800 line-clamp-1">{latest.assunto}</p>
                        <p className="text-[11px] text-slate-500 line-clamp-1 mt-1 font-normal">{latest.mensagem}</p>
                        
                        <div className="flex items-center justify-between mt-3">
                          <span className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase ${
                            latest.status === 'aberto' ? 'bg-amber-100 text-amber-700' :
                            latest.status === 'respondido' ? 'bg-blue-100 text-blue-700' :
                            'bg-green-100 text-green-700'
                          }`}>
                            {latest.status}
                          </span>
                          {unreadCount > 0 && (
                            <span className="bg-blue-600 text-white text-[10px] font-bold h-5 w-5 rounded-full flex items-center justify-center animate-pulse">
                              {unreadCount}
                            </span>
                          )}
                        </div>
                      </button>
                    );
                  })}
                {sortedEmails.length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                    <Mail size={40} className="mx-auto mb-4 opacity-10" />
                    <p className="text-sm font-medium">Nenhuma conversa encontrada.</p>
                  </div>
                )}
              </div>
            </div>

            {/* Visualização de Thread (Histórico) */}
            <div className={`${!selectedSupportMessage ? 'hidden md:flex' : 'flex'} flex-1 bg-white flex-col`}>
              {selectedSupportMessage ? (
                <>
                  {/* Header do Contato */}
                  <div className="p-4 md:p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/30">
                    <div className="flex items-center gap-3 md:gap-4">
                      <button 
                        onClick={() => setSelectedSupportMessage(null)}
                        className="md:hidden p-2 -ml-2 text-slate-500 hover:text-blue-600"
                      >
                        <ChevronLeft size={24} />
                      </button>
                      <div className="h-10 w-10 md:h-12 md:w-12 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-black text-lg md:text-xl shadow-lg shadow-blue-100 shrink-0">
                        {selectedSupportMessage.remetente_email[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base md:text-lg font-black text-slate-900 leading-none mb-1 truncate">{selectedSupportMessage.remetente_nome}</h3>
                        <p className="text-[10px] md:text-xs text-slate-500 font-medium truncate">{selectedSupportMessage.remetente_email}</p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                       <button 
                        onClick={() => handleSupportMessageAction(selectedSupportMessage.id, 'resolvido')}
                        className="p-2.5 bg-green-50 text-green-600 rounded-xl hover:bg-green-600 hover:text-white transition-all shadow-sm"
                        title="Marcar Thread como Resolvida"
                       >
                         <CheckCircle2 size={20} />
                       </button>
                       <button className="p-2.5 bg-slate-100 text-slate-600 rounded-xl hover:bg-slate-200 transition-all">
                         <Archive size={20} />
                       </button>
                    </div>
                  </div>

                  {/* Lista de Mensagens na Thread */}
                  <div className="flex-1 overflow-y-auto p-6 space-y-8 bg-slate-50/20 custom-scrollbar">
                    {supportMessages
                      .filter(m => m.remetente_email === selectedSupportMessage.remetente_email)
                      .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
                      .map((msg, idx) => (
                        <div key={msg.id} className="space-y-4 animate-in fade-in slide-in-from-bottom-2">
                          {/* Bolha do Usuário */}
                          <div className="flex flex-col items-start max-w-[85%]">
                            <div className="bg-white p-5 rounded-2xl rounded-tl-none border border-slate-200 shadow-sm relative group">
                              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">{msg.mensagem}</p>
                              <div className="mt-3 flex items-center justify-between gap-4">
                                <span className="text-[10px] font-bold text-slate-400">Assunto: {msg.assunto}</span>
                                <span className="text-[10px] font-medium text-slate-300">
                                  {new Date(msg.created_at).toLocaleString('pt-BR')}
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Bolha de Resposta do Admin */}
                          {msg.resposta && (
                            <div className="flex flex-col items-end w-full">
                              <div className="bg-blue-600 text-white p-5 rounded-2xl rounded-tr-none shadow-xl shadow-blue-100 max-w-[85%]">
                                <p className="text-[10px] font-black tracking-widest uppercase mb-1 opacity-70">Suporte EduTecPro</p>
                                <p className="text-sm leading-relaxed border-t border-blue-500/30 pt-2 mt-1">{msg.resposta}</p>
                                <div className="mt-3 flex justify-end">
                                  <span className="text-[10px] font-medium opacity-60">
                                    Enviado em {new Date(msg.respondido_em!).toLocaleString('pt-BR')}
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                  </div>

                  {/* Ação de Resposta */}
                  <div className="p-6 bg-white border-t border-slate-200">
                    <button 
                      onClick={() => {
                        setSupportReplyText('');
                        setShowSupportReplyModal(true);
                      }}
                      className="w-full py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black hover:scale-[1.01] active:scale-[0.99] transition-all shadow-xl shadow-blue-200 flex items-center justify-center gap-3"
                    >
                      <Reply size={22} className="rotate-180" />
                      Responder Thread
                    </button>
                  </div>
                </>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 p-12 text-center bg-slate-50/10">
                  <div className="w-32 h-32 bg-slate-100 rounded-full flex items-center justify-center mb-8 border-2 border-dashed border-slate-200">
                    <Mail size={56} className="text-slate-300 opacity-50" />
                  </div>
                  <h3 className="text-xl font-black text-slate-700 mb-2">Selecione um Professor</h3>
                  <p className="max-w-xs text-sm text-slate-500 leading-relaxed uppercase tracking-tighter">Escolha uma conversa na lateral para ver o histórico e sincronizar e-mails.</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl overflow-hidden max-w-3xl mx-auto animate-in fade-in zoom-in-95 duration-500">
            <div className="p-8 bg-gradient-to-r from-blue-600 to-indigo-700 text-white">
              <h3 className="text-2xl font-black flex items-center gap-3">
                <Send size={28} /> Enviar Novo E-mail Individual
              </h3>
              <p className="text-blue-100 text-sm mt-2 opacity-80 uppercase font-black tracking-widest">Inicie uma nova conversa fora de conversas existentes</p>
            </div>
            <div className="p-10 space-y-8">
              <div className="grid md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">E-mail do Professor</label>
                  <input 
                    type="email" 
                    value={newEmailData.to}
                    onChange={(e) => setNewEmailData(prev => ({ ...prev, to: e.target.value }))}
                    placeholder="professor@email.com"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all font-bold text-slate-700"
                  />
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Assunto do E-mail</label>
                  <input 
                    type="text" 
                    value={newEmailData.subject}
                    onChange={(e) => setNewEmailData(prev => ({ ...prev, subject: e.target.value }))}
                    placeholder="Suporte Técnico / Sugestão"
                    className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all font-bold text-slate-700"
                  />
                </div>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Conteúdo da Mensagem</label>
                <textarea 
                  rows={8}
                  value={newEmailData.message}
                  onChange={(e) => setNewEmailData(prev => ({ ...prev, message: e.target.value }))}
                  placeholder="Escreva detalhadamente aqui..."
                  className="w-full px-6 py-5 bg-slate-50 border border-slate-200 rounded-3xl focus:ring-4 focus:ring-blue-100 focus:bg-white outline-none transition-all resize-none text-slate-700 leading-relaxed font-medium"
                />
              </div>
              <button 
                onClick={handleSendNewEmail}
                disabled={supportLoading}
                className="w-full py-5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl font-black text-lg hover:scale-[1.02] shadow-2xl shadow-blue-200 transition-all flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {supportLoading ? <div className="w-6 h-6 border-4 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={24} /> Enviar Agora via SMTP</>}
              </button>
            </div>
          </div>
        )}

        {/* Modal de Resposta */}
        {showSupportReplyModal && selectedSupportMessage && (
          <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Responder Mensagem</h2>
                <button onClick={() => setShowSupportReplyModal(false)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
              </div>
              <div className="p-6 space-y-4 text-left">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Para:</p>
                  <p className="text-sm font-bold text-slate-700">{selectedSupportMessage.remetente_nome} ({selectedSupportMessage.remetente_email})</p>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black text-slate-400 uppercase tracking-widest">Sua Resposta</label>
                  <textarea 
                    rows={8}
                    value={supportReplyText}
                    onChange={(e) => setSupportReplyText(e.target.value)}
                    placeholder="Olá! Recebemos sua mensagem e..."
                    className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none text-sm"
                  />
                </div>
                <div className="flex gap-4 pt-4">
                  <button onClick={() => setShowSupportReplyModal(false)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
                  <button 
                    onClick={handleSendSupportReply}
                    disabled={supportLoading || !supportReplyText}
                    className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {supportLoading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <><Send size={18} /> Enviar Resposta</>}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  };

  const handleUpdateUserPlan = async (userId: string, newPlan: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ plano: newPlan })
        .eq('id', userId);
      if (error) throw error;
      fetchData();
    } catch (err) {
      alert('Erro ao atualizar plano');
    }
  };

  const handleUpdateUserStatus = async (userId: string, status: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ status_pagamento: status })
        .eq('id', userId);
      if (error) throw error;
      setActiveMenuUserId(null);
      fetchData();
    } catch (err) {
      alert('Erro ao atualizar status');
    }
  };

  const handleDeleteUser = async (userId: string, userName: string) => {
    if (!window.confirm(`TEM CERTEZA? Isso excluirá permanentemente o professor ${userName} e todos os seus dados. Esta ação não pode ser desfeita.`)) {
      return;
    }

    try {
      const { error } = await supabase.rpc('delete_user_entirely', { target_user_id: userId });
      if (error) throw error;
      setActiveMenuUserId(null);
      fetchData();
    } catch (err) {
      console.error(err);
      alert('Erro ao excluir usuário. Verifique se você tem permissões de admin.');
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({
          nome: selectedUser.nome,
          email: selectedUser.email,
          plano: selectedUser.plano
        })
        .eq('id', selectedUser.id);
      if (error) throw error;
      setModalType(null);
      fetchData();
      alert('Perfil atualizado com sucesso!');
    } catch (err) {
      alert('Erro ao atualizar perfil');
    }
  };

  const handleToggleBlock = async (userId: string, currentStatus: boolean) => {
    if (!window.confirm(`Deseja realmente ${currentStatus ? 'desbloquear' : 'bloquear'} este usuário?`)) return;
    try {
      const { error } = await supabase
        .from('users')
        .update({ is_blocked: !currentStatus })
        .eq('id', userId);
      if (error) throw error;
      setActiveMenuUserId(null);
      fetchData();
    } catch (err) {
      alert('Erro ao alterar status de bloqueio');
    }
  };

  const handleResetPassword = async (email: string) => {
    if (!window.confirm(`Enviar e-mail de recuperação de senha para ${email}?`)) return;
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) throw error;
      alert('E-mail de recuperação enviado com sucesso!');
      setActiveMenuUserId(null);
    } catch (err) {
      alert('Erro ao enviar e-mail de recuperação');
    }
  };

  const openHistory = async (user: AdminUser) => {
    setSelectedUser(user);
    const [stripeRes, pixRes] = await Promise.all([
      supabase.from('pagamentos_stripe').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('pagamentos_pix').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
    ]);

    const combined = [
      ...(stripeRes.data || []).map(p => ({ ...p, metodo: 'Stripe', data_pagamento: p.created_at })),
      ...(pixRes.data || []).map(p => ({ ...p, metodo: 'PIX', data_pagamento: p.created_at }))
    ].sort((a, b) => new Date(b.data_pagamento).getTime() - new Date(a.data_pagamento).getTime());

    setUserHistory(combined);
    setModalType('history');
    setActiveMenuUserId(null);
  };

  const openLogs = async (user: AdminUser) => {
    setSelectedUser(user);
    // Buscar logs pedagógicos diversos
    const [{ data: plans }, { data: presencas }] = await Promise.all([
      supabase.from('planejamentos').select('*').eq('professor_id', user.id).limit(5),
      supabase.from('presenca_alunos').select('*').eq('professor_id', user.id).limit(5)
    ]);
    const mergedLogs = [
      ...(plans || []).map(p => ({ ...p, type: 'Planejamento' })),
      ...(presencas || []).map(p => ({ ...p, type: 'Chamada' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setUserLogs(mergedLogs);
    setModalType('logs');
    setActiveMenuUserId(null);
  };

  const openUserDetails = async (user: AdminUser) => {
    setSelectedUser(user);
    setModalType('userDetails');
    setActiveMenuUserId(null);
    setUserDetailedActiveTab('planejamentos');
    setExpandedItems({});
    setUserDetailedData(prev => ({ ...prev, loading: true }));

    try {
      const [
        { data: planejamentos },
        { data: relatorios },
        { data: reflexoes },
        { data: portfolio },
        { data: alunos },
        { data: presencas }
      ] = await Promise.all([
        supabase.from('planejamentos').select('*').eq('professor_id', user.id).order('created_at', { ascending: false }),
        supabase.from('relatorios').select('*').eq('professor_id', user.id).order('created_at', { ascending: false }),
        supabase.from('diario_reflexoes').select('*').eq('professor_id', user.id).order('data', { ascending: false }),
        supabase.from('portfolio_digital').select('*').eq('professor_id', user.id).order('data_ref', { ascending: false }),
        supabase.from('alunos').select('*').eq('professor_id', user.id).order('nome', { ascending: true }),
        supabase.from('presenca_alunos').select('*').eq('professor_id', user.id).order('data', { ascending: false })
      ]);

      const planos = planejamentos || [];

      setUserDetailedData({
        planejamentoDiario: planos.filter(p => p.tipo_planejamento === 'Diário'),
        planejamentoSemanal: planos.filter(p => p.tipo_planejamento === 'Semanal'),
        planejamentoMensal: planos.filter(p => p.tipo_planejamento === 'Mensal'),
        relatorios: relatorios || [],
        diarioReflexoes: reflexoes || [],
        portfolioDigital: portfolio || [],
        alunos: alunos || [],
        presencaAlunos: presencas || [],
        loading: false
      });
    } catch (err) {
      console.error('Erro ao buscar detalhes do professor:', err);
      setUserDetailedData(prev => ({ ...prev, loading: false }));
      alert('Erro ao carregar dados detalhados do professor.');
    }
  };

  const toggleExpand = (id: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const saveAppearance = () => {
    localStorage.setItem('admin_layout_config', JSON.stringify(layoutConfig));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    // Aplicar variáveis CSS dinamicamente
    document.documentElement.style.setProperty('--admin-bg', layoutConfig.bgColor);
    document.documentElement.style.setProperty('--admin-accent', layoutConfig.accentColor);
  };

  const handleSaveAdminCredentials = async () => {
    setIsSavingAdminCreds(true);
    setSaveCredsSuccess(false);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Administrador não logado.');

      const updates: any = {};
      
      if (newAdminEmail !== user.email) {
        updates.email = newAdminEmail;
      }
      
      // Tentamos atualizar a senha apenas se não for vazia
      if (newAdminPassword && newAdminPassword.trim() !== '') {
        updates.password = newAdminPassword;
      }

      if (Object.keys(updates).length > 0) {
        try {
          const { error: authError } = await supabase.auth.updateUser(updates);
          if (authError) {
            const errMsg = authError.message || '';
            // Ignorar erro se for apenas de senha idêntica
            if (errMsg.toLowerCase().includes('should be different') || 
                errMsg.toLowerCase().includes('same as')) {
              console.log('Ignorando erro de senha idêntica no Auth');
            } else {
              throw authError;
            }
          }
        } catch (authErr: any) {
          const errMsg = authErr.message || '';
          if (errMsg.toLowerCase().includes('should be different') || 
              errMsg.toLowerCase().includes('same as')) {
            console.log('Ignorando erro de senha idêntica na captura do Auth');
          } else {
            throw authErr;
          }
        }

        if (updates.email) {
          const { error: dbError } = await supabase
            .from('users')
            .update({ email: newAdminEmail })
            .eq('id', user.id);
          if (dbError) throw dbError;
        }
      }

      setSaveCredsSuccess(true);
      setTimeout(() => setSaveCredsSuccess(false), 3000);
    } catch (err: any) {
      console.error(err);
      alert(`Erro ao salvar credenciais: ${err.message || JSON.stringify(err)}`);
    } finally {
      setIsSavingAdminCreds(false);
    }
  };

  const presetColors = [
    { name: 'Azul', value: '#2563EB' },
    { name: 'Verde', value: '#059669' },
    { name: 'Laranja', value: '#EA580C' },
    { name: 'Rosa', value: '#DB2777' },
    { name: 'Roxo', value: '#7C3AED' },
    { name: 'Amarelo', value: '#CA8A04' }
  ];

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'users', label: 'Usuários', icon: Users },
    { id: 'pedagogia', label: 'Pedagogia', icon: GraduationCap },
    { id: 'payments', label: 'Financeiro', icon: CreditCard },
    { id: 'logs', label: 'Monitoramento', icon: Activity },
    { id: 'support', label: 'Suporte', icon: LifeBuoy },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden">
      {/* Sidebar Overlay para Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 bg-[#0F172A] text-white transition-all duration-300 ease-in-out flex flex-col shadow-2xl lg:shadow-none
        lg:relative lg:translate-x-0
        ${isSidebarOpen ? 'w-64 translate-x-0' : 'w-20 -translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-blue-500/20">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            {isSidebarOpen && <span className="font-bold text-lg tracking-tight whitespace-nowrap">EduTec Admin</span>}
          </div>
          <button 
            onClick={() => setIsSidebarOpen(false)}
            className="p-1 hover:bg-slate-800 rounded-lg lg:hidden text-slate-400"
          >
            <X size={20} />
          </button>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id as any);
                  if (window.innerWidth < 1024) setIsSidebarOpen(false);
                }}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all duration-200 group
                  ${activeTab === item.id 
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20 font-bold' 
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-white'}
                `}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {isSidebarOpen && (
                  <div className="flex items-center justify-between w-full">
                    <span className="font-medium">{item.label}</span>
                    {item.id === 'support' && unreadSupportCount > 0 && (
                      <span className="bg-red-500 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full animate-pulse">
                        {unreadSupportCount}
                      </span>
                    )}
                  </div>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button 
            onClick={onLogout}
            className="w-full flex items-center gap-3 px-3 py-3 text-slate-400 hover:text-white rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            {isSidebarOpen && <span className="font-medium">Sair</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main 
        className={`flex-1 h-screen overflow-y-auto transition-all duration-300 flex flex-col bg-slate-50 relative ${layoutConfig.theme === 'dark' ? 'bg-[#0F172A] text-white' : ''}`}
        style={{ 
          backgroundColor: layoutConfig.theme === 'dark' ? '#0F172A' : layoutConfig.bgColor,
          backgroundImage: layoutConfig.bgImage ? `url(${layoutConfig.bgImage})` : 'none',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed'
        }}
      >
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 h-16 flex items-center justify-between px-4 md:px-8 sticky top-0 z-30 shrink-0">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-xl transition-colors text-slate-600"
            >
              <Menu className="w-6 h-6" />
            </button>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 truncate max-w-[150px] md:max-w-none">
              {menuItems.find(i => i.id === activeTab)?.label || 'Painel'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Notificações de Suporte */}
            <div className="relative">
              <button 
                onClick={() => setShowNotificationDropdown(!showNotificationDropdown)}
                className="p-2 hover:bg-slate-100 rounded-full transition-all relative group"
                title="Mensagens de Suporte"
              >
                <Bell className={`w-6 h-6 ${unreadSupportCount > 0 ? 'text-blue-600' : 'text-slate-600'}`} />
                {unreadSupportCount > 0 && (
                  <span className="absolute top-1 right-1 bg-red-500 text-white text-[10px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-white animate-bounce">
                    {unreadSupportCount}
                  </span>
                )}
              </button>

              {showNotificationDropdown && (
                <>
                  <div 
                    className="fixed inset-0 z-40" 
                    onClick={() => setShowNotificationDropdown(false)}
                  />
                  <div className="absolute right-0 mt-3 w-80 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">Mensagens de Suporte</h3>
                      {unreadSupportCount > 0 && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 font-extrabold px-2 py-0.5 rounded-full uppercase">
                          {unreadSupportCount} Novas
                        </span>
                      )}
                    </div>
                    
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                      {supportMessages.slice(0, 5).map((msg) => (
                        <button
                          key={msg.id}
                          onClick={() => {
                            setActiveTab('support');
                            setSelectedSupportMessage(msg);
                            setShowNotificationDropdown(false);
                            if (!msg.lido) markMessageAsRead(msg.id);
                          }}
                          className={`w-full text-left p-4 hover:bg-slate-50 transition-colors border-b border-slate-50 flex items-start gap-3 ${!msg.lido ? 'bg-blue-50/30' : ''}`}
                        >
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 font-black text-xs ${!msg.lido ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'}`}>
                            {msg.remetente_nome?.[0] || 'S'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-start mb-0.5">
                              <p className={`text-xs truncate ${!msg.lido ? 'font-bold text-slate-900' : 'font-medium text-slate-600'}`}>
                                {msg.remetente_nome || msg.remetente_email}
                              </p>
                              <span className="text-[9px] text-slate-400 whitespace-nowrap ml-2">
                                {new Date(msg.created_at).toLocaleDateString('pt-BR')}
                              </span>
                            </div>
                            <p className="text-[11px] font-bold text-slate-800 truncate">{msg.assunto}</p>
                            <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">{msg.mensagem}</p>
                          </div>
                        </button>
                      ))}

                      {supportMessages.length === 0 && (
                        <div className="p-10 text-center">
                          <Inbox className="w-10 h-10 text-slate-200 mx-auto mb-2" />
                          <p className="text-xs text-slate-400 font-medium">Nenhuma mensagem recente</p>
                        </div>
                      )}
                    </div>

                    <button 
                      onClick={() => {
                        setActiveTab('support');
                        setShowNotificationDropdown(false);
                      }}
                      className="w-full p-3 bg-slate-50 text-center text-xs font-black text-blue-600 hover:bg-blue-50 transition-colors"
                    >
                      Ver Todas as Mensagens
                    </button>
                  </div>
                </>
              )}
            </div>

            <button 
              onClick={() => setShowCredentialsModal(true)}
              className="flex items-center gap-3 hover:bg-slate-100 p-2 rounded-xl transition-all focus:outline-none select-none text-left border border-transparent hover:border-slate-200"
              title="Ver minhas credenciais de acesso"
            >
              <div className="text-right hidden sm:block">
                <p className="text-sm font-bold text-slate-900 leading-tight">Raquel Duarte</p>
                <p className="text-xs text-slate-500 font-semibold">Administradora</p>
              </div>
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold shadow-sm">
                RD
              </div>
            </button>
          </div>
        </header>

        <div className="p-4 md:p-8 flex-1">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Card de Faturamento Total */}
                <div className="md:col-span-3 bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm flex flex-col md:flex-row justify-between gap-6 hover:shadow-md transition-all duration-300 animate-in fade-in duration-500">
                  {/* Left Side: Monthly & Accumulated Stats */}
                  <div className="flex-1 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-green-50 text-green-600 rounded-xl">
                        <CreditCard className="w-6 h-6" />
                      </div>
                      <h4 className="font-extrabold text-slate-800 text-lg">Faturamento Total</h4>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/50 hover:bg-slate-100/50 transition-colors">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Faturamento do Mês</p>
                        <h3 className="text-2xl md:text-3xl font-black text-[#00A859] mt-1">
                          R$ {revenueStats.monthly.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                      </div>
                      <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100/50 hover:bg-slate-100/50 transition-colors">
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Faturamento Acumulado</p>
                        <h3 className="text-2xl md:text-3xl font-black text-slate-900 mt-1">
                          R$ {revenueStats.accumulated.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Right Side: Graph showing evolution of the last 3 months */}
                  <div className="w-full md:w-72 bg-slate-50 p-5 rounded-2xl border border-slate-100/50 flex flex-col justify-between min-h-[160px]">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Evolução da Receita</p>
                      <span className="text-[9px] bg-green-100 text-green-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase">3 Meses</span>
                    </div>
                    <div className="flex items-end justify-around h-24 pt-2 gap-3">
                      {revenueStats.history.map((h, idx) => {
                        const maxValue = Math.max(...revenueStats.history.map(item => item.value), 1);
                        const percentHeight = Math.min(100, Math.max(12, (h.value / maxValue) * 100));
                        return (
                          <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 group relative">
                            {/* Tooltip on hover */}
                            <div className="absolute bottom-full mb-1 bg-slate-950 text-white text-[9px] font-black px-2 py-0.5 rounded-lg shadow-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-10">
                              R$ {h.value.toFixed(2)}
                            </div>
                            {/* Bar Container */}
                            <div className="w-full bg-slate-200/50 rounded-t-lg h-16 flex items-end">
                              <div 
                                className="w-full bg-[#00A859] hover:bg-[#008F4C] transition-all duration-300 rounded-t-lg" 
                                style={{ height: `${percentHeight}%` }}
                              />
                            </div>
                            <span className="text-[9px] font-extrabold text-slate-500 uppercase">{h.label}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                      <Users className="w-6 h-6" />
                    </div>
                    <span className="text-xs font-medium text-green-600 bg-green-50 px-2 py-1 rounded-full">
                      +12% este mês
                    </span>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Total de Professores</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalProfessors}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                      <Zap className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Assinantes Pro</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.proProfessors}</h3>
                  <div className="mt-4 w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${(stats.proProfessors / stats.totalProfessors) * 100 || 0}%` }}
                    />
                  </div>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                      <CreditCard className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Taxa de Conversão</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">
                    {stats.totalProfessors > 0 ? ((stats.proProfessors / stats.totalProfessors) * 100).toFixed(1) : '0'}%
                  </h3>
                </div>

                {/* Novos Cards Pedagógicos */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                      <GraduationCap className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Total de Alunos</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalAlunos}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
                      <BookOpen className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Planejamentos Criados</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalPlanejamentos}</h3>
                </div>

                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <div className="p-2 bg-cyan-50 text-cyan-600 rounded-lg">
                      <Calendar className="w-6 h-6" />
                    </div>
                  </div>
                  <p className="text-slate-500 text-sm font-medium">Chamadas Registradas</p>
                  <h3 className="text-3xl font-bold text-slate-900 mt-1">{stats.totalPresencas}</h3>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <h2 className="font-semibold text-slate-800">Últimos Pagamentos</h2>
                    <button className="text-sm text-blue-600 font-medium hover:underline">Ver todos</button>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {stats.recentPayments.length > 0 ? stats.recentPayments.map((payment) => (
                      <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            payment.status === 'aprovado' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                          }`}>
                            <CreditCard className="w-5 h-5" />
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{payment.users?.nome || 'Usuário'}</p>
                            <p className="text-xs text-slate-500">{new Date(payment.data_pagamento).toLocaleDateString('pt-BR')}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900">R$ {payment.valor}</p>
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                            payment.status === 'aprovado' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {payment.status}
                          </span>
                        </div>
                      </div>
                    )) : (
                      <div className="p-8 text-center text-slate-400">Nenhum pagamento registrado.</div>
                    )}
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100">
                    <h2 className="font-semibold text-slate-800">Novos Professores</h2>
                  </div>
                  <div className="p-6 space-y-6">
                    {users.slice(0, 5).map((user) => (
                      <div key={user.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center font-bold text-slate-600 uppercase">
                            {user.nome?.substring(0, 2) || 'PR'}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900">{user.nome}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                        <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                          user.plano === 'pro' ? 'bg-purple-50 text-purple-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {user.plano === 'pro' ? 'Pro' : 'Free'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'users' && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input 
                    type="text" 
                    placeholder="Buscar por nome ou email..."
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button className="flex items-center gap-2 px-4 py-2 border border-slate-200 rounded-lg text-sm font-medium hover:bg-slate-50">
                    <Filter className="w-4 h-4" />
                    Filtros
                  </button>
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">
                    Exportar
                  </button>
                </div>
              </div>
              
              <div className="overflow-x-auto custom-scrollbar">
                <table className="min-w-[900px] w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Usuários</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Plano</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status Pagamento</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Cadastro</th>
                      <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                  {users
                    .filter(user => {
                      if (!userSearch) return true;
                      const searchLower = userSearch.toLowerCase();
                      return (
                        (user.nome || '').toLowerCase().includes(searchLower) ||
                        (user.email || '').toLowerCase().includes(searchLower)
                      );
                    })
                    .map((user) => (
                    <tr key={user.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-full flex items-center justify-center font-bold text-xs uppercase">
                            {user.nome?.substring(0, 2) || 'PR'}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-slate-900">{user.nome || 'Sem Nome'}</p>
                            <p className="text-xs text-slate-500">{user.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          value={user.plano}
                          onChange={(e) => handleUpdateUserPlan(user.id, e.target.value)}
                          className={`text-xs px-2 py-1 rounded-full font-medium border-none focus:ring-2 focus:ring-blue-500 ${
                            user.plano === 'pro' ? 'bg-purple-100 text-purple-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          <option value="free">Free</option>
                          <option value="pro">Pro</option>
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          {user.status_pagamento === 'aprovado' ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <Clock className="w-4 h-4 text-amber-500" />
                          )}
                          <span className="text-sm text-slate-600 capitalize">{user.status_pagamento}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-500">
                        {new Date(user.created_at).toLocaleDateString('pt-BR')}
                      </td>
                      <td className="px-6 py-4 text-right relative">
                        <button 
                          onClick={() => setActiveMenuUserId(activeMenuUserId === user.id ? null : user.id)}
                          className={`p-1 rounded-lg transition-colors ${activeMenuUserId === user.id ? 'bg-slate-200 text-slate-900' : 'hover:bg-slate-100 text-slate-400'}`}
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>

                        {/* Dropdown Menu */}
                        {activeMenuUserId === user.id && (
                          <div className="absolute right-6 top-12 w-52 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
                            <button 
                              onClick={() => openUserDetails(user)}
                              className="w-full text-left px-4 py-2 text-sm text-indigo-600 font-bold hover:bg-indigo-50 flex items-center gap-2 border-b border-slate-50 mb-1"
                            >
                              <Eye size={16} /> Ver tudo do usuário
                            </button>
                            <button 
                              onClick={() => handleUpdateUserStatus(user.id, 'aprovado')}
                              className="w-full text-left px-4 py-2 text-sm text-green-600 hover:bg-green-50 flex items-center gap-2"
                            >
                              <CheckCircle2 size={16} /> Aprovar Pagamento
                            </button>
                            <button 
                              onClick={() => handleUpdateUserStatus(user.id, 'pendente')}
                              className="w-full text-left px-4 py-2 text-sm text-amber-600 hover:bg-amber-50 flex items-center gap-2"
                            >
                              <Clock size={16} /> Definir como Pendente
                            </button>
                            <div className="h-px bg-slate-100 my-1" />
                            <button 
                              onClick={() => { setSelectedUser(user); setModalType('edit'); setActiveMenuUserId(null); }}
                              className="w-full text-left px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 flex items-center gap-2"
                            >
                              <UserCircle size={16} /> Editar Perfil
                            </button>
                            <button 
                              onClick={() => handleToggleBlock(user.id, (user as any).is_blocked)}
                              className={`w-full text-left px-4 py-2 text-sm ${(user as any).is_blocked ? 'text-green-600 hover:bg-green-50' : 'text-orange-600 hover:bg-orange-50'} flex items-center gap-2`}
                            >
                              {(user as any).is_blocked ? <LockKeyhole size={16} /> : <Lock size={16} />} 
                              {(user as any).is_blocked ? 'Desbloquear' : 'Bloquear Usuário'}
                            </button>
                            <button 
                              onClick={() => handleResetPassword(user.email)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <Key size={16} /> Resetar Senha
                            </button>
                            <div className="h-px bg-slate-100 my-1" />
                            <button 
                              onClick={() => openHistory(user)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <History size={16} /> Ver Pagamentos
                            </button>
                            <button 
                              onClick={() => openLogs(user)}
                              className="w-full text-left px-4 py-2 text-sm text-slate-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                              <FileText size={16} /> Logs de Atividade
                            </button>
                            <div className="h-px bg-slate-100 my-1" />
                            <button 
                              onClick={() => handleDeleteUser(user.id, user.nome)}
                              className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                            >
                              <XCircle size={16} /> Excluir Conta
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                  </tbody>
                </table>
              </div>

              {/* Modais de Gestão */}
              {modalType === 'edit' && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-800">Editar Usuário</h2>
                      <button onClick={() => setModalType(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <form onSubmit={handleEditUser} className="p-8 space-y-6">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Nome Completo</label>
                        <input 
                          type="text" 
                          value={selectedUser.nome}
                          onChange={(e) => setSelectedUser({...selectedUser, nome: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">E-mail de Acesso</label>
                        <input 
                          type="email" 
                          value={selectedUser.email}
                          onChange={(e) => setSelectedUser({...selectedUser, email: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">Plano Atual</label>
                        <select 
                          value={selectedUser.plano}
                          onChange={(e) => setSelectedUser({...selectedUser, plano: e.target.value})}
                          className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none"
                        >
                          <option value="free">Plano Free</option>
                          <option value="pro">Plano Pro</option>
                        </select>
                      </div>
                      <div className="flex gap-4 pt-4">
                        <button type="button" onClick={() => setModalType(null)} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
                        <button type="submit" className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-200 transition-all">Salvar Alterações</button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {modalType === 'history' && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-800">Histórico de Pagamentos</h2>
                      <button onClick={() => setModalType(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-8">
                      <div className="bg-blue-50 p-4 rounded-xl flex items-center gap-4 mb-6">
                        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center font-bold text-blue-600 shadow-sm">{selectedUser.nome?.substring(0, 2)}</div>
                        <div>
                          <p className="font-bold text-slate-900">{selectedUser.nome}</p>
                          <p className="text-xs text-slate-500">{selectedUser.email}</p>
                        </div>
                      </div>
                      <div className="space-y-4 max-h-[40vh] overflow-auto pr-2">
                        {userHistory.length > 0 ? userHistory.map((pay, i) => (
                          <div key={i} className="flex items-center justify-between p-4 border border-slate-100 rounded-xl hover:border-blue-100 transition-all">
                            <div className="flex items-center gap-3">
                              <div className="p-2 bg-slate-50 rounded-lg"><CreditCard size={18} className="text-slate-400" /></div>
                              <div>
                                <p className="text-sm font-bold text-slate-800">R$ {pay.valor}</p>
                                <p className="text-[10px] text-slate-500 uppercase">{pay.metodo}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs text-slate-500">{new Date(pay.data_pagamento).toLocaleDateString('pt-BR')}</p>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${pay.status === 'aprovado' ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                                {pay.status}
                              </span>
                            </div>
                          </div>
                        )) : <p className="text-center py-10 text-slate-400">Nenhum pagamento registrado para este professor.</p>}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {modalType === 'userDetails' && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-6xl h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    {/* Header do Modal */}
                    <div className="p-8 bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 text-white flex items-center justify-between shrink-0">
                      <div className="flex items-center gap-6">
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center text-2xl font-bold border border-white/20">
                          {selectedUser.nome?.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <h2 className="text-2xl font-bold tracking-tight">{selectedUser.nome}</h2>
                          <div className="flex items-center gap-3 mt-1 text-slate-300">
                            <span className="flex items-center gap-1 text-xs bg-white/10 px-2 py-0.5 rounded-full border border-white/10">
                              <ShieldCheck size={12} /> {selectedUser.plano?.toUpperCase()}
                            </span>
                            <span className="text-xs opacity-60">•</span>
                            <span className="text-sm font-medium">{selectedUser.email}</span>
                          </div>
                        </div>
                      </div>
                      <button 
                        onClick={() => setModalType(null)} 
                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl transition-all border border-white/10 group"
                      >
                        <X size={24} className="group-hover:rotate-90 transition-transform duration-300" />
                      </button>
                    </div>

                    {/* Tabs / Navegação Interna */}
                    <div className="flex bg-slate-50 border-b border-slate-200 px-8 py-2 gap-2 overflow-x-auto scrollbar-hide shrink-0">
                      {[ 
                        { id: 'planejamentos', label: 'Planejamentos', icon: Calendar },
                        { id: 'relatorios', label: 'Relatórios Individuais', icon: FileText },
                        { id: 'portfolio', label: 'Portfólio Digital', icon: History },
                        { id: 'reflexoes', label: 'Diário de Reflexões', icon: Book },
                        { id: 'alunos', label: 'Alunos', icon: Users },
                        { id: 'presenca', label: 'Presença do Aluno', icon: CheckSquare }
                      ].map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setUserDetailedActiveTab(tab.id)}
                          className={`
                            flex items-center gap-2 px-5 py-3 rounded-xl text-sm font-semibold transition-all whitespace-nowrap
                            ${userDetailedActiveTab === tab.id 
                              ? 'bg-blue-600 text-white shadow-md' 
                              : 'text-slate-500 hover:bg-slate-200/50'}
                          `}
                        >
                          <tab.icon size={18} /> {tab.label}
                        </button>
                      ))}
                    </div>

                    {/* Conteúdo do Modal */}
                    <div className="flex-1 overflow-auto p-8 bg-slate-50/30">
                      {userDetailedData.loading ? (
                        <div className="flex flex-col items-center justify-center h-full gap-4">
                          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                          <p className="text-slate-500 font-medium animate-pulse">Buscando dados no Supabase...</p>
                        </div>
                      ) : (
                        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
                          


                          {/* 2. PLANEJAMENTOS */}
                          {userDetailedActiveTab === 'planejamentos' && (
                            <div className="space-y-6">
                              <div className="flex items-center justify-between mb-2">
                                <h3 className="text-xl font-bold text-slate-800">Planejamentos Pedagógicos</h3>
                                <div className="flex gap-2">
                                  <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold">Diários: {userDetailedData.planejamentoDiario.length}</span>
                                  <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold">Semanais: {userDetailedData.planejamentoSemanal.length}</span>
                                  <span className="px-3 py-1 bg-teal-100 text-teal-700 rounded-full text-xs font-bold">Mensais: {userDetailedData.planejamentoMensal.length}</span>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                {[
                                  ...userDetailedData.planejamentoDiario.map(p => ({ ...p, table: 'diario', typeName: 'Diário' })),
                                  ...userDetailedData.planejamentoSemanal.map(p => ({ ...p, table: 'semanal', typeName: 'Semanal' })),
                                  ...userDetailedData.planejamentoMensal.map(p => ({ ...p, table: 'mensal', typeName: 'Mensal' }))
                                ].sort((a,b) => new Date(b.created_at || b.data || b.data_ref).getTime() - new Date(a.created_at || a.data || a.data_ref).getTime()).map((p) => (
                                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                                    <button 
                                      onClick={() => toggleExpand(p.id)}
                                      className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-4 text-left">
                                        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${p.table === 'diario' ? 'bg-blue-50 text-blue-600' : p.table === 'semanal' ? 'bg-purple-50 text-purple-600' : 'bg-teal-50 text-teal-600'}`}>
                                          <Calendar size={24} />
                                        </div>
                                        <div>
                                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{p.typeName} • {new Date(p.data || p.data_ref).toLocaleDateString('pt-BR')}</p>
                                          <h4 className="font-bold text-slate-800">{p.titulo_registro || 'Planejamento s/ Título'}</h4>
                                          <p className="text-xs text-slate-500">{p.ano_serie || 'Turma não especificada'} • {p.componente || p.componente_curricular || 'Componente não especificado'}</p>
                                        </div>
                                      </div>
                                      {expandedItems[p.id] ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                                    </button>
                                    {expandedItems[p.id] && (
                                      <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                        {p.objetivos && (
                                          <div>
                                            <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest block mb-2">Objetivos / Campo de Experiência</label>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm italic text-slate-600">"{p.objetivos}"</div>
                                          </div>
                                        )}
                                        {p.conteudo && (
                                          <div>
                                            <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest block mb-2">Conteúdo / Desenvolvimento</label>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700 whitespace-pre-line">{p.conteudo}</div>
                                          </div>
                                        )}
                                        {p.recursos && (
                                          <div>
                                            <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest block mb-2">Recursos / Materiais</label>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700">{p.recursos}</div>
                                          </div>
                                        )}
                                        {p.avaliacao && (
                                          <div>
                                            <label className="text-[10px] font-black uppercase text-blue-600 tracking-widest block mb-2">Avaliação / Observações</label>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm text-slate-700">{p.avaliacao}</div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {userDetailedData.planejamentoDiario.length === 0 && userDetailedData.planejamentoSemanal.length === 0 && (
                                  <div className="py-20 text-center text-slate-400">Nenhum planejamento encontrado.</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 3. RELATÓRIOS */}
                          {userDetailedActiveTab === 'relatorios' && (
                            <div className="space-y-6">
                              <h3 className="text-xl font-bold text-slate-800">Relatórios e Pareceres Individuais</h3>
                              <div className="space-y-4">
                                {userDetailedData.relatorios.map((r) => (
                                  <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <button 
                                      onClick={() => toggleExpand(r.id)}
                                      className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-4 text-left">
                                        <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center"><FileText size={24} /></div>
                                        <div>
                                          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{r.tipo || 'Relatório'} • {new Date(r.created_at).toLocaleDateString('pt-BR')}</p>
                                          <h4 className="font-bold text-slate-800">{r.titulo_registro || `Relatório: ${r.aluno_nome}`}</h4>
                                          <p className="text-xs text-slate-500">Aluno: {r.aluno_nome || 'Não especificado'}</p>
                                        </div>
                                      </div>
                                      {expandedItems[r.id] ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                                    </button>
                                    {expandedItems[r.id] && (
                                      <div className="p-6 border-t border-slate-100 bg-slate-50/50 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                        <div className="flex gap-4 items-center">
                                          <span className="px-2 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase rounded-lg border border-indigo-100">{r.tom_texto || 'Formal'}</span>
                                          <span className="px-2 py-1 bg-slate-100 text-slate-600 text-[10px] font-black uppercase rounded-lg border border-slate-200">{r.periodo || 'Geral'}</span>
                                        </div>
                                        <div className="bg-white p-6 rounded-2xl border border-slate-200 text-sm text-slate-700 leading-relaxed font-serif italic">
                                          "{r.conteudo}"
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {userDetailedData.relatorios.length === 0 && (
                                  <div className="py-20 text-center text-slate-400">Nenhum relatório emitido.</div>
                                )}
                              </div>
                            </div>
                          )}



                          {/* 5. PORTFÓLIO DIGITAL */}
                          {userDetailedActiveTab === 'portfolio' && (
                            <div className="space-y-6">
                              <h3 className="text-xl font-bold text-slate-800">Portfólio Digital (Investigação e Memória)</h3>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {userDetailedData.portfolioDigital.map((p) => (
                                  <div key={p.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm flex flex-col">
                                    <div className="p-5 flex items-center gap-4 border-b border-slate-50">
                                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center"><History size={24} /></div>
                                      <div>
                                        <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest">{new Date(p.data_ref || p.created_at).toLocaleDateString('pt-BR')}</p>
                                        <h4 className="font-bold text-slate-800">{p.titulo_registro}</h4>
                                      </div>
                                    </div>
                                    <div className="p-5 space-y-3 flex-1">
                                      <div className="flex gap-2">
                                        <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] font-bold rounded-full">{p.aluno_nome || 'Geral'}</span>
                                      </div>
                                      <p className="text-xs text-slate-600 leading-relaxed italic line-clamp-4">"{p.descricao}"</p>
                                      
                                      <button 
                                        onClick={() => toggleExpand(p.id)}
                                        className="text-xs font-bold text-indigo-600 flex items-center gap-1 hover:underline mt-2"
                                      >
                                        {expandedItems[p.id] ? 'Recolher' : 'Ver conteúdo completo'}
                                      </button>
                                      
                                      {expandedItems[p.id] && (
                                        <div className="pt-4 border-t border-slate-100 text-xs text-slate-700 animate-in fade-in duration-300">
                                          {p.descricao}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                ))}
                                {userDetailedData.portfolioDigital.length === 0 && (
                                  <div className="col-span-full py-20 text-center text-slate-400">Nenhum registro de portfólio.</div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* 6. DIÁRIO DE REFLEXÕES */}
                          {userDetailedActiveTab === 'reflexoes' && (
                            <div className="space-y-6">
                              <h3 className="text-xl font-bold text-slate-800">Diário de Reflexões do Educador</h3>
                              <div className="space-y-4">
                                {userDetailedData.diarioReflexoes.map((r) => (
                                  <div key={r.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                    <button 
                                      onClick={() => toggleExpand(r.id)}
                                      className="w-full p-5 flex items-center justify-between hover:bg-slate-50 transition-colors"
                                    >
                                      <div className="flex items-center gap-4 text-left">
                                        <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-xl flex items-center justify-center"><BookOpen size={24} /></div>
                                        <div>
                                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">{new Date(r.data).toLocaleDateString('pt-BR')}</p>
                                          <h4 className="font-bold text-slate-800">{r.titulo}</h4>
                                        </div>
                                      </div>
                                      {expandedItems[r.id] ? <ChevronUp className="text-slate-400" /> : <ChevronDown className="text-slate-400" />}
                                    </button>
                                    {expandedItems[r.id] && (
                                      <div className="p-6 border-t border-slate-100 bg-orange-50/10 space-y-6 animate-in slide-in-from-top-2 duration-200">
                                        <div>
                                          <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest block mb-2">Reflexão do Ciclo</label>
                                          <div className="bg-white p-5 rounded-2xl border border-orange-100 text-sm text-slate-700 italic">"{r.reflexao}"</div>
                                        </div>
                                        {r.foco_proximo_ciclo && (
                                          <div>
                                            <label className="text-[10px] font-black uppercase text-orange-600 tracking-widest block mb-2">Foco / Próximos Passos</label>
                                            <div className="bg-white p-4 rounded-xl border border-slate-200 text-sm font-bold text-slate-800">{r.foco_proximo_ciclo}</div>
                                          </div>
                                        )}
                                        {r.conquistas && (
                                          <div>
                                            <label className="text-[10px] font-black uppercase text-green-600 tracking-widest block mb-2">Conquistas Observadas</label>
                                            <div className="bg-green-50/50 p-4 rounded-xl border border-green-100 text-sm text-green-800">{r.conquistas}</div>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {userDetailedData.diarioReflexoes.length === 0 && (
                                  <div className="py-20 text-center text-slate-400">Nenhuma reflexão registrada.</div>
                                )}
                              </div>
                            </div>
                          )}



                          {/* 8. ALUNOS */}
                          {userDetailedActiveTab === 'alunos' && (
                            <div className="space-y-6">
                              <h3 className="text-xl font-bold text-slate-800">Listagem de Alunos Vinculados</h3>
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                                {userDetailedData.alunos.map((a) => (
                                  <div key={a.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col gap-4">
                                    <div className="flex items-center gap-4">
                                      <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center font-black text-sm">{a.nome?.substring(0, 2).toUpperCase()}</div>
                                      <div>
                                        <h4 className="font-bold text-slate-800 leading-tight">{a.nome}</h4>
                                        <p className="text-xs text-slate-400 font-medium">{a.serie || 'Turma não informada'}</p>
                                      </div>
                                    </div>
                                    <div className="space-y-2">
                                      <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">PCD:</span>
                                        <span className={`font-bold ${a.necessidades_especiais ? 'text-orange-500' : 'text-slate-600'}`}>{a.necessidades_especiais ? 'Sim' : 'Não'}</span>
                                      </div>
                                      <div className="flex justify-between text-xs">
                                        <span className="text-slate-400">Status:</span>
                                        <span className="font-bold text-green-600 uppercase">{a.status || 'Ativo'}</span>
                                      </div>
                                    </div>
                                    <button 
                                      onClick={() => toggleExpand(a.id)}
                                      className="mt-2 text-xs font-bold text-blue-600 hover:underline flex items-center gap-1"
                                    >
                                      {expandedItems[a.id] ? <ChevronUp size={14} /> : <ChevronDown size={14} />} Detalhes do Aluno
                                    </button>
                                    
                                    {expandedItems[a.id] && (
                                      <div className="pt-4 border-t border-slate-100 bg-slate-50 p-4 rounded-xl space-y-3 animate-in fade-in duration-300">
                                        <div>
                                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsáveis</p>
                                          <p className="text-xs text-slate-700">{a.responsavel1_nome || 'Não cadastrados'}</p>
                                          {a.responsavel1_telefone && <p className="text-xs text-blue-600 font-bold">{a.responsavel1_telefone}</p>}
                                        </div>
                                        {a.limitacoes_pcd && (
                                          <div>
                                            <p className="text-[10px] font-black text-orange-400 uppercase tracking-widest mb-1">Observações PCD</p>
                                            <p className="text-xs text-slate-700">{a.limitacoes_pcd}</p>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* 9. PRESENÇA */}
                          {userDetailedActiveTab === 'presenca' && (
                            <div className="space-y-6">
                              <h3 className="text-xl font-bold text-slate-800">Frequência Escolar</h3>
                              <div className="space-y-3">
                                {userDetailedData.presencaAlunos.map((p) => (
                                  <div key={p.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex items-center justify-between shadow-sm">
                                    <div className="flex items-center gap-4">
                                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${p.status === 'presente' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                                        <CheckSquare size={20} />
                                      </div>
                                      <div>
                                        <p className="text-sm font-bold text-slate-800">{p.aluno_nome || 'Aluno'}</p>
                                        <p className="text-xs text-slate-400">{new Date(p.data).toLocaleDateString('pt-BR')}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-4">
                                      <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${p.status === 'presente' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {p.status}
                                      </span>
                                      <button 
                                        onClick={() => toggleExpand(p.id)}
                                        className="p-1 hover:bg-slate-100 rounded-lg text-slate-400"
                                      >
                                        <ChevronDown size={18} />
                                      </button>
                                    </div>
                                    {expandedItems[p.id] && (
                                      <div className="absolute right-0 top-full mt-2 w-full p-4 bg-white border border-slate-200 shadow-xl rounded-2xl z-10 animate-in fade-in duration-200">
                                        <p className="text-xs text-slate-600">ID da chamada: {p.id}</p>
                                        <p className="text-xs text-slate-600">ID do aluno: {p.aluno_id}</p>
                                      </div>
                                    )}
                                  </div>
                                ))}
                                {userDetailedData.presencaAlunos.length === 0 && (
                                  <div className="py-20 text-center text-slate-400">Nenhum registro de presença.</div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Seção Subjacente: Authentication */}
              <div className="mt-12 bg-slate-50 p-6 border-t border-slate-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Supabase Authentication (Contas de Login)</h3>
                    <p className="text-xs text-slate-500">Usuários que possuem credenciais e podem logar no sistema.</p>
                  </div>
                </div>

                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-100">
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">UID (Auth ID)</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">E-mail de Login</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Criado em</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Último Acesso</th>
                        <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Vínculo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {authUsers.map((authUser) => {
                        const hasProfile = users.some(u => u.id === authUser.id);
                        return (
                          <tr key={authUser.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-[10px] font-mono text-slate-400">
                              {authUser.id}
                            </td>
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                              {authUser.email}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                              {new Date(authUser.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                              {authUser.last_sign_in_at 
                                ? new Date(authUser.last_sign_in_at).toLocaleString('pt-BR')
                                : 'Nunca'
                              }
                            </td>
                            <td className="px-6 py-4">
                              {hasProfile ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 rounded-full text-[10px] font-bold">
                                  <CheckCircle2 size={12} /> Perfil Ativo
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-red-50 text-red-700 rounded-full text-[10px] font-bold">
                                  <XCircle size={12} /> Sem Perfil
                                </span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-4 text-[10px] text-slate-400 flex items-center gap-2">
                  <Clock size={12} />
                  Se um e-mail aparece na tabela de cima (Perfis) mas não aparece aqui (Authentication), ele NÃO conseguirá fazer login.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'payments' && (
             <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Resumo Financeiro Header */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <CreditCard className="text-blue-600 w-5 h-5 shrink-0" /> Gestão Financeira (Stripe)
                    </h2>
                    <p className="text-xs text-slate-500">Acompanhe saldos, repasses automáticos e conciliações em tempo real.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={fetchStripeFinancials}
                      disabled={financialsLoading}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Activity size={14} className={financialsLoading ? 'animate-spin' : ''} />
                      Sincronizar Stripe
                    </button>
                    <a 
                      href="https://dashboard.stripe.com" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
                    >
                      <ShieldCheck size={14} /> Ver Detalhes no Stripe
                    </a>
                  </div>
                </div>

                {/* Cards Visuais */}
                {financialsLoading && !stripeFinancials ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-3">
                        <div className="h-4 w-24 bg-slate-100 rounded" />
                        <div className="h-6 w-32 bg-slate-100 rounded" />
                        <div className="h-3 w-16 bg-slate-100 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Card 1: Saldo Disponível */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[130px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">💰 Saldo Disponível</span>
                        <span className="text-[9px] bg-green-50 text-green-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase">Líquido</span>
                      </div>
                      <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900">
                          R$ {((stripeFinancials?.balance?.available?.[0]?.amount || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Pendente: R$ {((stripeFinancials?.balance?.pending?.[0]?.amount || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Entradas Recentes */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[130px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">📈 Entradas Recentes</span>
                        <span className="text-[9px] bg-blue-50 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase">Repasses</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {stripeFinancials?.payouts?.slice(0, 2).map((po: any, idx: number) => (
                          <div key={po.id || idx} className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">{new Date((po.arrival_date || po.created) * 1000).toLocaleDateString('pt-BR')}</span>
                            <span className="font-bold text-green-600">R$ {(po.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        {(!stripeFinancials?.payouts || stripeFinancials.payouts.length === 0) && (
                          <p className="text-xs text-slate-400">Nenhum repasse recente</p>
                        )}
                      </div>
                    </div>

                    {/* Card 3: Repasses Automáticos */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[130px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">🔄 Repasses Automáticos</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${stripeFinancials?.payoutSettings?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {stripeFinancials?.payoutSettings?.enabled ? 'Ativo' : 'Manual'}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-bold text-slate-800">Frequência da Conta</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 capitalize">Intervalo: {stripeFinancials?.payoutSettings?.interval || 'Diário'}</p>
                      </div>
                    </div>

                    {/* Card 4: Relatórios Financeiros */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[130px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">📊 Relatórios Financeiros</span>
                        <span className="text-[9px] bg-purple-50 text-purple-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase">Conciliado</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-bold text-slate-800">
                          {stripeFinancials?.transactions?.length || 0} Lançamentos Recentes
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Taxas e tarifas reconciliadas</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Gestão Financeira (Mercado Pago) */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 mt-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                      <CreditCard className="text-teal-600 w-5 h-5 shrink-0" /> Gestão Financeira (Mercado Pago)
                    </h2>
                    <p className="text-xs text-slate-500">Acompanhe saldos, repasses automáticos e conciliações em tempo real.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button 
                      onClick={fetchMpFinancials}
                      disabled={mpLoading}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 disabled:opacity-50"
                    >
                      <Activity size={14} className={mpLoading ? 'animate-spin' : ''} />
                      Sincronizar Mercado Pago
                    </button>
                    <a 
                      href="https://www.mercadopago.com.br" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition-all shadow-md hover:shadow-lg flex items-center gap-1.5"
                    >
                      <ShieldCheck size={14} /> Ver Detalhes no Mercado Pago
                    </a>
                  </div>
                </div>

                {mpLoading && !mpFinancials ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
                    {[1, 2, 3, 4].map((n) => (
                      <div key={n} className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm animate-pulse space-y-3">
                        <div className="h-4 w-24 bg-slate-100 rounded" />
                        <div className="h-6 w-32 bg-slate-100 rounded" />
                        <div className="h-3 w-16 bg-slate-100 rounded" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-4 animate-in fade-in duration-300">
                    {/* Card 1: Saldo Disponível */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[130px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">💰 Saldo Disponível</span>
                        <span className="text-[9px] bg-green-50 text-green-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase">Líquido</span>
                      </div>
                      <div className="mt-2">
                        <h3 className="text-2xl font-black text-slate-900">
                          R$ {((mpFinancials?.balance?.available?.[0]?.amount || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </h3>
                        <p className="text-[10px] text-slate-400 mt-0.5">
                          Pendente: R$ {((mpFinancials?.balance?.pending?.[0]?.amount || 0) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                        </p>
                      </div>
                    </div>

                    {/* Card 2: Entradas Recentes */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[130px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">📈 Entradas Recentes</span>
                        <span className="text-[9px] bg-blue-50 text-blue-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase">Repasses</span>
                      </div>
                      <div className="mt-2 space-y-1">
                        {mpFinancials?.payouts?.slice(0, 2).map((po: any, idx: number) => (
                          <div key={po.id || idx} className="flex justify-between items-center text-xs">
                            <span className="text-slate-500">{new Date(po.arrival_date * 1000).toLocaleDateString('pt-BR')}</span>
                            <span className="font-bold text-green-600">R$ {(po.amount / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                          </div>
                        ))}
                        {(!mpFinancials?.payouts || mpFinancials.payouts.length === 0) && (
                          <p className="text-xs text-slate-400">Nenhum repasse recente</p>
                        )}
                      </div>
                    </div>

                    {/* Card 3: Repasses Automáticos */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[130px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">🔄 Repasses Automáticos</span>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase ${mpFinancials?.payoutSettings?.enabled ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
                          {mpFinancials?.payoutSettings?.enabled ? 'Ativo' : 'Manual'}
                        </span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-bold text-slate-800">Frequência da Conta</p>
                        <p className="text-[10px] text-slate-400 mt-0.5 capitalize">Intervalo: {mpFinancials?.payoutSettings?.interval || 'Diário'}</p>
                      </div>
                    </div>

                    {/* Card 4: Relatórios Financeiros */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between min-h-[130px]">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">📊 Relatórios Financeiros</span>
                        <span className="text-[9px] bg-purple-50 text-purple-700 font-extrabold px-1.5 py-0.5 rounded-full uppercase">Conciliado</span>
                      </div>
                      <div className="mt-2">
                        <p className="text-xs font-bold text-slate-800">
                          {mpFinancials?.transactions?.length || 0} Lançamentos Recentes
                        </p>
                        <p className="text-[10px] text-slate-400 mt-0.5">Taxas e tarifas reconciliadas</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Filtros e Histórico */}
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-6">
                  <div>
                    <h3 className="text-base font-bold text-slate-800">
                      {paymentFilter === 'stripe' ? 'Histórico de Transações (Stripe)' : paymentFilter === 'pix' ? 'Histórico de Transações (Mercado Pago)' : 'Histórico de Transações Geral'}
                    </h3>
                    <p className="text-xs text-slate-500">Transações de assinantes processadas no Supabase.</p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <button 
                      onClick={() => setPaymentFilter('all')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${paymentFilter === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      Todos
                    </button>
                    <button 
                      onClick={() => setPaymentFilter('stripe')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${paymentFilter === 'stripe' ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      Stripe
                    </button>
                    <button 
                      onClick={() => setPaymentFilter('pix')}
                      className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${paymentFilter === 'pix' ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      PIX
                    </button>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                  {paymentsLoading ? (
                    <div className="flex flex-col items-center justify-center py-20 gap-4">
                      <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                      <p className="text-slate-500 font-medium">Carregando transações...</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-left">
                        <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500 border-b border-slate-100">
                          <tr>
                            <th className="px-6 py-4">Usuário / E-mail</th>
                            <th className="px-6 py-4">Método</th>
                            <th className="px-6 py-4">Valor</th>
                            <th className="px-6 py-4">Status</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">ID Transação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {[
                            ...stripePayments.map(p => ({ ...p, gateway: 'Stripe' })),
                            ...pixPayments.map(p => ({ ...p, gateway: 'PIX' }))
                          ]
                          .filter(p => paymentFilter === 'all' || p.gateway.toLowerCase() === paymentFilter)
                          .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                          .map((payment) => (
                            <tr key={payment.id} className="hover:bg-slate-50 transition-colors">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-sm font-bold text-slate-800">{payment.users?.nome || 'Usuário Desconhecido'}</p>
                                  <p className="text-[10px] text-slate-400 font-mono">{payment.users?.email}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ring-1 ${payment.gateway === 'Stripe' ? 'bg-indigo-50 text-indigo-700 ring-indigo-200' : 'bg-teal-50 text-teal-700 ring-teal-200'}`}>
                                  {payment.gateway}
                                </span>
                              </td>
                              <td className="px-6 py-4 font-bold text-slate-700">
                                R$ {payment.valor}
                              </td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  payment.status === 'PAID' || payment.status === 'active' || payment.status === 'succeeded' || payment.status === 'aprovado'
                                    ? 'bg-green-50 text-green-700 border border-green-100'
                                    : payment.status === 'WAITING' || payment.status === 'pending'
                                    ? 'bg-amber-50 text-amber-700 border border-amber-100'
                                    : 'bg-red-50 text-red-700 border border-red-100'
                                }`}>
                                  {payment.status === 'WAITING' ? 'Aguardando' : 
                                   payment.status === 'PAID' ? 'Pago' : 
                                   payment.status === 'active' ? 'Ativo' : 
                                   payment.status === 'succeeded' ? 'Sucedido' : 
                                   payment.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-slate-500 whitespace-nowrap">
                                {new Date(payment.created_at).toLocaleString('pt-BR')}
                              </td>
                              <td className="px-6 py-4 text-[10px] font-mono text-slate-400">
                                {payment.charge_id || payment.subscription_id || payment.id.substring(0, 8)}
                              </td>
                            </tr>
                          ))}
                          {stripePayments.length === 0 && pixPayments.length === 0 && (
                            <tr>
                              <td colSpan={6} className="py-20 text-center">
                                <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                                <h3 className="text-lg font-semibold text-slate-800">Nenhum pagamento registrado</h3>
                                <p className="text-slate-500 max-w-sm mx-auto mt-2">
                                  As transações aparecerão aqui assim que forem processadas pelos gateways de pagamento.
                                </p>
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
             </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-6 pb-20">
              {/* Controle de Limites */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-rose-100 text-rose-600 rounded-lg">
                      <LockKeyhole className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-800">Controle de Limites</h2>
                      <p className="text-xs text-slate-500">Defina o limite diário de novos registros criados por usuário</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Limite diário para plano Free</label>
                      <input 
                        type="number" 
                        value={limitFree}
                        onChange={(e) => setLimitFree(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition-all font-semibold"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Esse limite determina o número máximo de registros pedagógicos (planejamentos, relatórios, presenças) que um usuário Free pode criar por dia.
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-2">Limite diário para plano Pro</label>
                      <input 
                        type="number" 
                        value={limitPro}
                        onChange={(e) => setLimitPro(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition-all font-semibold"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Esse limite determina o número máximo de registros pedagógicos que um usuário Pro pode criar por dia.
                      </p>
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100">
                    <div className="max-w-md">
                      <label className="block text-sm font-bold text-slate-700 mb-2">Dias de acesso grátis do plano teste Pro</label>
                      <input 
                        type="number" 
                        value={trialDays}
                        onChange={(e) => setTrialDays(parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-rose-500 outline-none transition-all font-semibold"
                      />
                      <p className="mt-2 text-xs text-slate-500">
                        Esses dias determinam o período gratuito oferecido aos novos usuários do plano Pro antes da cobrança.
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    {limitsSuccess ? (
                      <div className="flex items-center gap-2 text-green-600 font-bold animate-bounce text-sm">
                        <CheckCircle2 size={18} />
                        Limites atualizados com sucesso.
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Esses limites serão aplicados em tempo real para todos os professores do sistema.</p>
                    )}
                    <button 
                      onClick={saveLimits}
                      className="px-6 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center gap-2 text-sm"
                    >
                      <CheckCircle2 size={16} /> Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>

              {/* Controle de Promoções */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                      <Zap className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-800">Controle de Promoções (Stripe)</h2>
                      <p className="text-xs text-slate-500">Defina e ative promoções do Stripe para o Plano Pro diretamente pelo painel</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Preços Cadastrados */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl flex flex-col justify-between transition-all duration-300 border-2 ${
                      !isPromoActive 
                        ? 'bg-green-50 border-green-500 shadow-md ring-4 ring-green-500/10' 
                        : 'bg-white border-slate-200 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Preço Padrão</span>
                        {!isPromoActive && (
                          <span className="text-[9px] bg-green-200 text-green-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Selecionado
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-700 mt-2">R$ 29,90 <span className="text-xs font-normal text-slate-400">/ mês</span></h4>
                    </div>

                    <div className={`p-4 rounded-xl flex flex-col justify-between transition-all duration-300 border-2 ${
                      isPromoActive 
                        ? 'bg-green-50 border-green-500 shadow-md ring-4 ring-green-500/10' 
                        : 'bg-white border-slate-200 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Preço Promocional</span>
                        {isPromoActive && (
                          <span className="text-[9px] bg-green-200 text-green-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Selecionado
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-indigo-600 mt-2">R$ 19,90 <span className="text-xs font-normal text-slate-400">/ mês</span></h4>
                    </div>
                  </div>

                  {/* Inputs de Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Data de início da promoção</label>
                      <input 
                        type="date" 
                        value={promoStart}
                        onChange={(e) => setPromoStart(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-sm text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Data de término da promoção</label>
                      <input 
                        type="date" 
                        value={promoEnd}
                        onChange={(e) => setPromoEnd(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-sm text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Status Atual */}
                  <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-slate-200 gap-3 bg-slate-50">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-slate-500">Status Atual do Preço:</span>
                      {(() => {
                        const desc = getPromoStatusDescription();
                        return (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${desc.color}`}>
                            {desc.text}
                          </span>
                        );
                      })()}
                    </div>
                    {promoStart && promoEnd && (
                      <button 
                        onClick={() => savePromoSettings('auto')}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Aplicar Regra de Datas
                      </button>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    {promoSuccess ? (
                      <div className="flex items-center gap-2 text-green-600 font-bold animate-bounce text-sm">
                        <CheckCircle2 size={18} />
                        Promoção atualizada com sucesso.
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Altere manualmente o status do preço ou use a regra de datas.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => savePromoSettings('standard')}
                        className="px-5 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg active:scale-95 transition-all text-xs flex items-center gap-1.5"
                      >
                        <XCircle size={14} /> Ativar Preço Padrão
                      </button>
                      <button 
                        onClick={() => savePromoSettings('promo')}
                        className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg active:scale-95 transition-all text-xs flex items-center gap-1.5"
                      >
                        <Zap size={14} /> Ativar Promoção
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Controle de Promoções (Pix Mercado Pago) */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-teal-100 text-teal-600 rounded-lg">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-800">Controle de Promoções (Pix Mercado Pago)</h2>
                      <p className="text-xs text-slate-500">Defina e ative promoções do Mercado Pago via Pix para o Plano Pro diretamente pelo painel</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Preços Cadastrados */}
                  <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className={`p-4 rounded-xl flex flex-col justify-between transition-all duration-300 border-2 ${
                      !isPixPromoActive 
                        ? 'bg-green-50 border-green-500 shadow-md ring-4 ring-green-500/10' 
                        : 'bg-white border-slate-200 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Preço Padrão</span>
                        {!isPixPromoActive && (
                          <span className="text-[9px] bg-green-200 text-green-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Selecionado
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-slate-700 mt-2">R$ 29,90 <span className="text-xs font-normal text-slate-400">/ mês</span></h4>
                    </div>

                    <div className={`p-4 rounded-xl flex flex-col justify-between transition-all duration-300 border-2 ${
                      isPixPromoActive 
                        ? 'bg-green-50 border-green-500 shadow-md ring-4 ring-green-500/10' 
                        : 'bg-white border-slate-200 opacity-60'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Preço Promocional</span>
                        {isPixPromoActive && (
                          <span className="text-[9px] bg-green-200 text-green-800 font-black px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Selecionado
                          </span>
                        )}
                      </div>
                      <h4 className="text-sm font-black text-teal-600 mt-2">R$ 19,90 <span className="text-xs font-normal text-slate-400">/ mês</span></h4>
                    </div>
                  </div>

                  {/* Inputs de Data */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Data de início da promoção</label>
                      <input 
                        type="date" 
                        value={pixPromoStart}
                        onChange={(e) => setPixPromoStart(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-sm text-slate-700"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-2">Data de término da promoção</label>
                      <input 
                        type="date" 
                        value={pixPromoEnd}
                        onChange={(e) => setPixPromoEnd(e.target.value)}
                        className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all font-semibold text-sm text-slate-700"
                      />
                    </div>
                  </div>

                  {/* Status Atual */}
                  <div className="flex flex-col sm:flex-row items-center justify-between p-4 rounded-xl border border-slate-200 gap-3 bg-slate-50">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="text-xs font-bold text-slate-500">Status Atual do Preço:</span>
                      {(() => {
                        const desc = getPixPromoStatusDescription();
                        return (
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${desc.color}`}>
                            {desc.text}
                          </span>
                        );
                      })()}
                    </div>
                    {pixPromoStart && pixPromoEnd && (
                      <button 
                        onClick={() => savePixPromoSettings('auto')}
                        className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                      >
                        Aplicar Regra de Datas
                      </button>
                    )}
                  </div>

                  {/* Botões de Ação */}
                  <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
                    {pixPromoSuccess ? (
                      <div className="flex items-center gap-2 text-green-600 font-bold animate-bounce text-sm">
                        <CheckCircle2 size={18} />
                        Promoção Pix atualizada com sucesso.
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">Altere manualmente o status do preço ou use a regra de datas.</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      <button 
                        onClick={() => savePixPromoSettings('standard')}
                        className="px-5 py-2.5 bg-slate-600 hover:bg-slate-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg active:scale-95 transition-all text-xs flex items-center gap-1.5"
                      >
                        <XCircle size={14} /> Ativar Preço Padrão
                      </button>
                      <button 
                        onClick={() => savePixPromoSettings('promo')}
                        className="px-5 py-2.5 bg-green-600 hover:bg-green-700 text-white rounded-xl font-bold shadow-md hover:shadow-lg active:scale-95 transition-all text-xs flex items-center gap-1.5"
                      >
                        <Zap size={14} /> Ativar Promoção
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Notificações Sonoras Avançadas */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-amber-100 text-amber-600 rounded-lg">
                      <Volume2 className="w-5 h-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-slate-800">Notificações Sonoras Avançadas</h2>
                      <p className="text-xs text-slate-500">Configure alertas sonoros específicos para cada evento</p>
                    </div>
                  </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  {[
                    { id: 'support', label: 'Suporte (Mensagens)', icon: BellRing },
                    { id: 'payments', label: 'Pagamentos (Vendas)', icon: CreditCard },
                    { id: 'students', label: 'Alunos (Novos/Presença)', icon: Users },
                    { id: 'planning', label: 'Planejamentos', icon: Calendar },
                  ].map((event) => (
                    <div key={event.id} className="p-5 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-slate-600">
                            <event.icon size={20} />
                          </div>
                          <span className="font-bold text-slate-700 text-sm">{event.label}</span>
                        </div>
                        <button
                          onClick={() => {
                            const newConfig = { ...soundConfig, [event.id]: { ...soundConfig[event.id as any], enabled: !soundConfig[event.id as any].enabled } };
                            setSoundConfig(newConfig);
                            localStorage.setItem('edutec_sound_config', JSON.stringify(newConfig));
                          }}
                          className={`w-12 h-6 rounded-full transition-colors relative ${soundConfig[event.id as any].enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
                        >
                          <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${soundConfig[event.id as any].enabled ? 'left-7' : 'left-1'}`} />
                        </button>
                      </div>

                      {soundConfig[event.id as any].enabled && (
                        <div className="space-y-3 pt-2 animate-in fade-in duration-300">
                          <div className="flex gap-2">
                            {['bell', 'soft', 'notify'].map((s) => (
                              <button
                                key={s}
                                onClick={() => {
                                  const newConfig = { ...soundConfig, [event.id]: { ...soundConfig[event.id as any], sound: s, customUrl: '' } };
                                  setSoundConfig(newConfig);
                                  localStorage.setItem('edutec_sound_config', JSON.stringify(newConfig));
                                }}
                                className={`flex-1 py-2 rounded-lg text-[10px] font-black uppercase transition-all border-2 ${soundConfig[event.id as any].sound === s && !soundConfig[event.id as any].customUrl ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-white bg-white text-slate-400'}`}
                              >
                                {s === 'bell' ? 'Sino' : s === 'soft' ? 'Suave' : 'Curto'}
                              </button>
                            ))}
                          </div>
                          
                          <div className="relative">
                            <input 
                              type="text"
                              placeholder="URL de som personalizado (.mp3)"
                              value={soundConfig[event.id as any].customUrl}
                              onChange={(e) => {
                                const newConfig = { ...soundConfig, [event.id]: { ...soundConfig[event.id as any], customUrl: e.target.value } };
                                setSoundConfig(newConfig);
                                localStorage.setItem('edutec_sound_config', JSON.stringify(newConfig));
                              }}
                              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-[10px] outline-none focus:ring-1 focus:ring-blue-500"
                            />
                            <Music className="absolute right-3 top-2.5 text-slate-300" size={14} />
                          </div>

                          <button 
                            onClick={() => playEventSound(event.id as any)}
                            className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-bold flex items-center justify-center gap-2 transition-colors"
                          >
                            <Play size={12} /> Testar Som
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Sincronizado com Realtime Admin</span>
                </div>
              </div>

              {/* Personalização do Layout */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="p-6 border-b border-slate-100 flex items-center gap-2">
                  <div className="p-2 bg-blue-100 text-blue-600 rounded-lg">
                    <Settings className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="font-bold text-slate-800">Personalização do Layout</h2>
                    <p className="text-xs text-slate-500">Ajuste as cores e o estilo visual do seu painel</p>
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {/* Tema */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 block text-left">Tema do Painel</label>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => setLayoutConfig(prev => ({...prev, theme: 'light'}))}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${layoutConfig.theme === 'light' ? 'border-blue-500 bg-blue-50 text-blue-700 font-bold' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                      >
                        <Clock className="w-5 h-5" /> Claro
                      </button>
                      <button 
                        onClick={() => setLayoutConfig(prev => ({...prev, theme: 'dark'}))}
                        className={`flex-1 flex items-center justify-center gap-2 py-4 rounded-xl border-2 transition-all ${layoutConfig.theme === 'dark' ? 'border-blue-500 bg-slate-800 text-white font-bold' : 'border-slate-100 bg-slate-50 text-slate-500'}`}
                      >
                        <ShieldCheck className="w-5 h-5" /> Escuro
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Cor de Fundo */}
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 block text-left">Cor de Fundo Principal</label>
                      <div className="flex items-center gap-4">
                        <input 
                          type="color" 
                          value={layoutConfig.bgColor}
                          onChange={(e) => setLayoutConfig(prev => ({...prev, bgColor: e.target.value}))}
                          className="w-12 h-12 rounded-lg cursor-pointer border-none p-0"
                        />
                        <div className="flex-1">
                          <input 
                            type="text" 
                            value={layoutConfig.bgColor}
                            onChange={(e) => setLayoutConfig(prev => ({...prev, bgColor: e.target.value}))}
                            className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cor de Destaque */}
                    <div className="space-y-3">
                      <label className="text-sm font-bold text-slate-700 block text-left">Cor de Destaque (Botões/Links)</label>
                      <div className="flex flex-wrap gap-2">
                        {presetColors.map(color => (
                          <button
                            key={color.value}
                            onClick={() => setLayoutConfig(prev => ({...prev, accentColor: color.value}))}
                            className={`w-8 h-8 rounded-full border-2 transition-all ${layoutConfig.accentColor === color.value ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent hover:scale-105'}`}
                            style={{ backgroundColor: color.value }}
                            title={color.name}
                          />
                        ))}
                        <input 
                          type="color" 
                          value={layoutConfig.accentColor}
                          onChange={(e) => setLayoutConfig(prev => ({...prev, accentColor: e.target.value}))}
                          className="w-8 h-8 rounded-full cursor-pointer p-0 border-2 border-slate-100"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Imagem de Fundo */}
                  <div className="space-y-3">
                    <label className="text-sm font-bold text-slate-700 block text-left">Imagem de Fundo (URL)</label>
                    <div className="flex gap-4 items-center">
                      <input 
                        type="text" 
                        placeholder="https://exemplo.com/imagem.jpg"
                        value={layoutConfig.bgImage}
                        onChange={(e) => setLayoutConfig(prev => ({...prev, bgImage: e.target.value}))}
                        className="flex-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                      />
                      {layoutConfig.bgImage && (
                        <div className="w-12 h-12 rounded-lg overflow-hidden border border-slate-200 bg-slate-100 relative group">
                          <img src={layoutConfig.bgImage} className="w-full h-full object-cover" />
                          <button 
                            onClick={() => setLayoutConfig(prev => ({...prev, bgImage: ''}))}
                            className="absolute inset-0 bg-black/40 text-white opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Botão Salvar */}
                  <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                    {saveSuccess ? (
                      <div className="flex items-center gap-2 text-green-600 font-bold animate-bounce">
                        <Check size={20} />
                        Configurações de aparência atualizadas!
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400">As alterações serão aplicadas globalmente para você.</p>
                    )}
                    <button 
                      onClick={saveAppearance}
                      style={{ backgroundColor: layoutConfig.accentColor }}
                      className="px-8 py-3 text-white rounded-xl font-bold shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-2"
                    >
                      <CheckCircle2 size={18} /> Salvar Alterações
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'pedagogia' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Lista Global de Alunos */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-800">Alunos Cadastrados no Sistema</h2>
                      <p className="text-xs text-slate-500">Visão global de todos os alunos registrados.</p>
                    </div>
                    <GraduationCap className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-6 py-3">Aluno</th>
                          <th className="px-6 py-3">Professor Responsável</th>
                          <th className="px-6 py-3">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentStudents.map((aluno) => (
                          <tr key={aluno.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">{aluno.nome}</td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {aluno.users?.nome || 'Desconhecido'}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                              {new Date(aluno.created_at).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Lista Global de Planejamentos */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h2 className="font-semibold text-slate-800">Atividade de Planejamento</h2>
                      <p className="text-xs text-slate-500">Últimos planejamentos criados pelos professores.</p>
                    </div>
                    <BookOpen className="w-5 h-5 text-slate-400" />
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead className="bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                        <tr>
                          <th className="px-6 py-3">Título / Atividade</th>
                          <th className="px-6 py-3">Professor</th>
                          <th className="px-6 py-3">Data</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {recentPlans.map((plan) => (
                          <tr key={plan.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 text-sm font-medium text-slate-900">
                              {plan.titulo || plan.atividade_principal || 'Sem título'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate-600">
                              {plan.users?.nome || 'Desconhecido'}
                            </td>
                            <td className="px-6 py-4 text-xs text-slate-500">
                              {new Date(plan.created_at).toLocaleDateString('pt-BR')}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'support' && renderSupportView()}

          {(activeTab === 'logs') && (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
               <div className="p-6 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">Monitoramento em Tempo Real</h2>
                <p className="text-sm text-slate-500 mt-1">Auditando atividades pedagógicas do ecossistema.</p>
              </div>
              <div className="p-6">
                <div className="space-y-4">
                  {recentPlans.slice(0, 5).map((log, i) => (
                    <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center shrink-0">
                        <Activity className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-sm text-slate-900">
                          <span className="font-bold">{log.users?.nome || 'Professor'}</span> criou um novo planejamento diário.
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {new Date(log.created_at).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Modal de Credenciais da Administradora */}
      {showCredentialsModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] shadow-2xl w-full max-w-md overflow-hidden flex flex-col border border-slate-100 animate-in zoom-in-95 duration-300 text-slate-800">
            {/* Header */}
            <div className="p-6 bg-gradient-to-r from-blue-700 to-indigo-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/20">
                  <ShieldCheck className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-lg leading-tight">Minhas Credenciais</h3>
                  <p className="text-[10px] text-blue-100 font-medium">Acesso Administrador EduTec</p>
                </div>
              </div>
              <button 
                onClick={() => {
                  setShowCredentialsModal(false);
                  setShowAdminPassword(false);
                }}
                className="p-2 hover:bg-white/10 rounded-xl transition-colors"
              >
                <X size={20} className="text-white" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              <p className="text-xs text-slate-500 leading-relaxed">
                Utilize as informações abaixo para realizar o login ou altere-as e salve as novas credenciais de acesso administrador.
              </p>

              {/* Email Card */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">E-mail de Cadastro</label>
                <div className="relative flex items-center">
                  <input 
                    type="email"
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    className="w-full pl-4 pr-12 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-805 focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    placeholder="E-mail de Cadastro"
                  />
                  <button 
                    onClick={() => {
                      navigator.clipboard.writeText(newAdminEmail);
                      setCopiedEmail(true);
                      setTimeout(() => setCopiedEmail(false), 2000);
                    }}
                    className={`absolute right-2 p-2 rounded-lg transition-colors ${copiedEmail ? 'bg-green-50 text-green-600' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`}
                    title="Copiar e-mail"
                  >
                    {copiedEmail ? <Check size={16} /> : <Copy size={16} />}
                  </button>
                </div>
              </div>

              {/* Password Card */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest block pl-1">Senha de Cadastro</label>
                <div className="relative flex items-center">
                  <input 
                    type={showAdminPassword ? 'text' : 'password'}
                    value={newAdminPassword}
                    onChange={(e) => setNewAdminPassword(e.target.value)}
                    className="w-full pl-4 pr-20 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold text-slate-805 font-mono focus:outline-none focus:border-blue-500 focus:bg-white transition-all"
                    placeholder="Senha de Cadastro"
                  />
                  <div className="absolute right-2 flex items-center gap-1">
                    <button 
                      onClick={() => setShowAdminPassword(!showAdminPassword)}
                      className="p-2 hover:bg-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                      title={showAdminPassword ? "Ocultar senha" : "Ver senha"}
                    >
                      {showAdminPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(newAdminPassword);
                        setCopiedPassword(true);
                        setTimeout(() => setCopiedPassword(false), 2000);
                      }}
                      className={`p-2 rounded-lg transition-colors ${copiedPassword ? 'bg-green-50 text-green-600' : 'hover:bg-slate-200 text-slate-400 hover:text-slate-600'}`}
                      title="Copiar senha"
                    >
                      {copiedPassword ? <Check size={16} /> : <Copy size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {saveCredsSuccess && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-xs font-bold text-center animate-bounce">
                  Credenciais atualizadas com sucesso!
                </div>
              )}

              {/* Informational Banner */}
              <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-2xl flex gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 leading-relaxed text-left">
                  <span className="font-bold block mb-0.5">Dica de Segurança</span>
                  Mantenha estas credenciais seguras. Elas permitem acesso total de leitura e alteração a todos os professores e dados escolares da plataforma.
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button 
                onClick={() => {
                  setShowCredentialsModal(false);
                  setShowAdminPassword(false);
                }}
                className="flex-1 py-3 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-300 transition-colors"
              >
                Fechar
              </button>
              <button 
                onClick={handleSaveAdminCredentials}
                disabled={isSavingAdminCreds}
                className="flex-1 py-3 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-2 shadow-md shadow-green-600/10"
              >
                {isSavingAdminCreds ? 'Salvando...' : 'Salvar Alterações'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

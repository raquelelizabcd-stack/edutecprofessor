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
  Menu,
  X,
  CreditCard,
  Zap,
  GraduationCap,
  BookOpen,
  Calendar,
  Activity,
  History,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  CheckCircle,
  Plus
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

export default function AdminDashboard({ onLogout }: { onLogout: () => void }) {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'pedagogia' | 'payments' | 'logs' | 'settings'>('dashboard');
  const [stats, setStats] = useState<AdminStats>({ 
    totalProfessors: 0, 
    proProfessors: 0, 
    totalAlunos: 0,
    totalPlanejamentos: 0,
    totalPresencas: 0,
    recentPayments: [] 
  });
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [authUsers, setAuthUsers] = useState<AuthUser[]>([]);
  const [recentStudents, setRecentStudents] = useState<any[]>([]);
  const [recentPlans, setRecentPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [activeMenuUserId, setActiveMenuUserId] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<AdminUser | null>(null);
  const [modalType, setModalType] = useState<'edit' | 'history' | 'logs' | null>(null);
  const [userHistory, setUserHistory] = useState<any[]>([]);
  const [userLogs, setUserLogs] = useState<any[]>([]);
  
  const [layoutConfig, setLayoutConfig] = useState({
    theme: 'light',
    bgColor: '#F8FAFC',
    accentColor: '#2563EB',
    bgImage: ''
  });
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    // Carregar preferências salvas
    const saved = localStorage.getItem('admin_layout_config');
    if (saved) {
      setLayoutConfig(JSON.parse(saved));
    }
    fetchData();
  }, [activeTab]);

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

        // Buscar usuários do Schema AUTH via RPC
        const { data: authData, error: authError } = await supabase
          .rpc('get_auth_users');
        
        if (authError) {
          console.error("Erro ao buscar usuários Auth:", authError);
        } else if (authData) {
          setAuthUsers(authData);
        }
      }

      
      // Estatísticas Pedagógicas Globais
      const [
        { count: alunosCount },
        { count: diárioCount },
        { count: semanalCount },
        { count: mensalCount },
        { count: presencaCount }
      ] = await Promise.all([
        supabase.from('alunos').select('*', { count: 'exact', head: true }),
        supabase.from('planejamento_diario').select('*', { count: 'exact', head: true }),
        supabase.from('planejamento_semanal').select('*', { count: 'exact', head: true }),
        supabase.from('planejamento_mensal').select('*', { count: 'exact', head: true }),
        supabase.from('presenca_alunos').select('*', { count: 'exact', head: true })
      ]);

      setStats(prev => ({
        ...prev,
        totalAlunos: alunosCount || 0,
        totalPlanejamentos: (diárioCount || 0) + (semanalCount || 0) + (mensalCount || 0),
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
        .from('planejamento_diario')
        .select('*, users(nome)')
        .order('created_at', { ascending: false })
        .limit(10);
      if (planData) setRecentPlans(planData);

      const { data: paymentData, error: payError } = await supabase
        .from('payments')
        .select('*, users(nome, email)')
        .order('data_pagamento', { ascending: false })
        .limit(10);

      if (payError) throw payError;
      if (paymentData) {
        setStats(prev => ({ ...prev, recentPayments: paymentData }));
      }
    } catch (err) {
      console.error('Erro ao buscar dados admin:', err);
    } finally {
      setLoading(false);
    }
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
    const { data: payments } = await supabase
      .from('payments')
      .select('*')
      .eq('user_id', user.id)
      .order('data_pagamento', { ascending: false });
    setUserHistory(payments || []);
    setModalType('history');
    setActiveMenuUserId(null);
  };

  const openLogs = async (user: AdminUser) => {
    setSelectedUser(user);
    // Buscar logs pedagógicos diversos
    const [{ data: plans }, { data: presencas }] = await Promise.all([
      supabase.from('planejamento_diario').select('*').eq('user_id', user.id).limit(5),
      supabase.from('presenca_alunos').select('*').eq('user_id', user.id).limit(5)
    ]);
    const mergedLogs = [
      ...(plans || []).map(p => ({ ...p, type: 'Planejamento' })),
      ...(presencas || []).map(p => ({ ...p, type: 'Chamada' }))
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    
    setUserLogs(mergedLogs);
    setModalType('logs');
    setActiveMenuUserId(null);
  };

  const saveAppearance = () => {
    localStorage.setItem('admin_layout_config', JSON.stringify(layoutConfig));
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);

    // Aplicar variáveis CSS dinamicamente
    document.documentElement.style.setProperty('--admin-bg', layoutConfig.bgColor);
    document.documentElement.style.setProperty('--admin-accent', layoutConfig.accentColor);
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
    { id: 'payments', label: 'Pagamentos', icon: CreditCard },
    { id: 'logs', label: 'Monitoramento', icon: Activity },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className={`
        ${isSidebarOpen ? 'w-64' : 'w-20'} 
        bg-[#0F172A] text-white transition-all duration-300 flex flex-col
      `}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          {isSidebarOpen && <span className="font-bold text-lg tracking-tight">EduTec Admin</span>}
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id as any)}
                className={`
                  w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-colors
                  ${activeTab === item.id 
                    ? 'bg-blue-600 text-white' 
                    : 'text-slate-400 hover:bg-slate-800 hover:text-white'}
                `}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {isSidebarOpen && <span className="font-medium">{item.label}</span>}
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
        className={`flex-1 overflow-auto transition-colors duration-300 ${layoutConfig.theme === 'dark' ? 'bg-[#0F172A] text-white' : ''}`}
        style={{ 
          backgroundColor: layoutConfig.theme === 'dark' ? '#0F172A' : layoutConfig.bgColor,
          backgroundImage: layoutConfig.bgImage ? `url(${layoutConfig.bgImage})` : 'none',
          backgroundSize: 'cover',
          backgroundAttachment: 'fixed'
        }}
      >
        <header className="bg-white border-b border-slate-200 h-16 flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-slate-100 rounded-lg lg:hidden"
            >
              <Menu className="w-5 h-5 text-slate-600" />
            </button>
            <h1 className="text-xl font-semibold text-slate-800">
              {menuItems.find(i => i.id === activeTab)?.label || 'Painel Administrativo'}
            </h1>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="text-right hidden sm:block">
              <p className="text-sm font-medium text-slate-900">Raquel Duarte</p>
              <p className="text-xs text-slate-500">Administradora</p>
            </div>
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 font-bold">
              RD
            </div>
          </div>
        </header>

        <div className="p-8">
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              {/* Stats Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Professor</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Plano</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Status Pagamento</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase">Cadastro</th>
                    <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {users.map((user) => (
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
                          <div className="absolute right-6 top-12 w-48 bg-white rounded-xl shadow-xl border border-slate-100 z-50 py-2 animate-in fade-in zoom-in-95 duration-100">
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

              {/* Modais de Gestão */}
              {modalType === 'edit' && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-800">Editar Professor</h2>
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

              {modalType === 'logs' && selectedUser && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                  <div className="bg-white rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 duration-200">
                    <div className="p-6 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <h2 className="text-xl font-bold text-slate-800">Logs de Atividade Administrativa</h2>
                      <button onClick={() => setModalType(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20} /></button>
                    </div>
                    <div className="p-8">
                      <div className="space-y-4 max-h-[50vh] overflow-auto pr-2">
                        {userLogs.length > 0 ? userLogs.map((log, i) => (
                          <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-xl relative border-l-4 border-blue-500">
                            <div>
                              <p className="text-sm text-slate-900 font-bold">{log.type}</p>
                              <p className="text-xs text-slate-600 mt-1">{log.titulo || log.atividade_principal || 'Ação registrada'}</p>
                              <p className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                <Clock size={10} /> {new Date(log.created_at).toLocaleString('pt-BR')}
                              </p>
                            </div>
                          </div>
                        )) : <p className="text-center py-10 text-slate-400">Nenhuma atividade pedagógica recente encontrada.</p>}
                      </div>
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
             <div className="space-y-6">
                <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-slate-800">Integração de Pagamentos</h2>
                    <p className="text-sm text-slate-500">Gerencie Stripe e futuras integrações.</p>
                  </div>
                  <div className="flex gap-2">
                    <span className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-bold ring-1 ring-green-600/20">
                      <div className="w-1.5 h-1.5 bg-green-600 rounded-full animate-pulse" />
                      Stripe: Ativo
                    </span>
                    <span className="flex items-center gap-2 px-3 py-1 bg-slate-50 text-slate-500 rounded-full text-xs font-bold ring-1 ring-slate-600/20">
                      PagBank: Em breve
                    </span>
                  </div>
                </div>

                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden text-center py-20">
                  <CreditCard className="w-12 h-12 text-slate-200 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-slate-800">Histórico Completo</h3>
                  <p className="text-slate-500 max-w-sm mx-auto mt-2">
                    A listagem detalhada de transações está sendo sincronizada com a API do Stripe.
                  </p>
                </div>
             </div>
          )}

          {activeTab === 'settings' && (
            <div className="max-w-4xl space-y-6 pb-20">
              {/* Configurações Básicas */}
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100">
                  <h2 className="font-semibold text-slate-800">Assinaturas e Segurança</h2>
                </div>
                <div className="p-6 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">Valor do Plano Pro (R$)</label>
                      <input type="number" defaultValue={29.90} className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">2FA Administrativo</label>
                      <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <span className="text-xs text-slate-500">Exigir código via App</span>
                        <div className="w-10 h-5 bg-slate-200 rounded-full relative cursor-not-allowed">
                          <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full" />
                        </div>
                      </div>
                    </div>
                  </div>
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
    </div>
  );
}

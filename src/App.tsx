import React, { useState, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import LandingPage from './LandingPage';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import PaymentPage from './components/PaymentPage';
import TermsAndRules from './components/auth/TermsAndRules';
import AdminDashboard from './components/admin/AdminDashboard';
import ProtectedRoute from './components/auth/ProtectedRoute';
import { UserProfile } from './types';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState<Session | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile>('public');
  const [userRole, setUserRole] = useState<'admin' | 'professor' | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState<boolean>(false);

  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [userDataExpiracao, setUserDataExpiracao] = useState<string | null>(null);
  const [userStatusPagamento, setUserStatusPagamento] = useState<string | null>(null);
  const [userWhatsapp, setUserWhatsapp] = useState<string | undefined>(undefined);
  const [userIntent, setUserIntent] = useState<'free' | 'pro'>(() => {
    try {
      const saved = localStorage.getItem('edutec_user_intent');
      console.log('[App] Intent inicial carregada:', saved);
      return (saved as 'free' | 'pro') || 'free';
    } catch (_) {
      return 'free';
    }
  });

  const fetchUserProfile = async (userId: string) => {
    setIsInitializing(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('plano, role, status_pagamento, created_at, data_expiracao, aceitou_privacidade, data_aceite, is_blocked, telefone_whatsapp')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        const isProIntent = userIntent === 'pro';
        
        let trialDaysConfig = 7;
        const { data: settingsData } = await supabase
          .from('users')
          .select('nome')
          .eq('email', 'system_settings@edutec.com')
          .maybeSingle();
        if (settingsData && settingsData.nome) {
          try {
            const parsed = JSON.parse(settingsData.nome);
            if (parsed.trial_days !== undefined) {
              trialDaysConfig = parsed.trial_days;
            }
          } catch (_) {}
        }

        const trialDate = isProIntent ? new Date() : null;
        if (isProIntent && trialDate) trialDate.setDate(trialDate.getDate() + trialDaysConfig);
        const expIso = trialDate ? trialDate.toISOString().split('T')[0] : null;

        await supabase.from('users').upsert({
          id: userId,
          plano: isProIntent ? 'pro' : 'free',
          role: 'professor',
          status_pagamento: isProIntent ? 'pendente' : 'gratis',
          data_expiracao: expIso,
          created_at: new Date().toISOString(),
          aceitou_privacidade: false
        });

        setCurrentProfile(isProIntent ? 'pro' : 'free');
        setUserRole('professor');
        setUserCreatedAt(new Date().toISOString());
        setUserDataExpiracao(expIso);
        setUserStatusPagamento(isProIntent ? 'pendente' : 'gratis');
        setAceitouPrivacidade(false);
      } else {
        const matchedPlano = (data.plano as UserProfile) || 'free';
        console.log('[App] Perfil carregado do DB:', { plano: matchedPlano, status: data.status_pagamento });
        
        setCurrentProfile(matchedPlano);
        setUserRole(data.role === 'admin_geral' ? 'admin' : (data.role as 'admin' | 'professor'));
        setUserCreatedAt(data.created_at);
        setUserDataExpiracao(data.data_expiracao);
        setUserStatusPagamento(data.status_pagamento);
        setUserWhatsapp(data.telefone_whatsapp);
        
        const hasAccepted = data.aceitou_privacidade === true && data.data_aceite !== null;
        setAceitouPrivacidade(hasAccepted);

        const isBlocked = data.is_blocked === true;
        
        if (isBlocked) {
          console.warn('[App] Usuário bloqueado');
          await supabase.auth.signOut();
          alert('Este acesso foi bloqueado pelo administrador.');
          navigate('/login');
          return;
        }

        // Se o banco diz que é FREE mas o usuário tinha intenção PRO (localStorage),
        // talvez devêssemos considerar se ele ainda quer o trial.
        // Mas por segurança, respeitamos o banco se ele já existe.

        // Lógica de redirecionamento
        if (data.role === 'admin' || data.role === 'admin_geral') {
          setUserRole('admin');
          setCurrentProfile('admin');
          if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/dashboard') {
            navigate('/admin', { replace: true });
          }
        } else {
          setUserRole('professor');
          if (location.pathname === '/' || location.pathname === '/login' || location.pathname === '/admin') {
            navigate('/dashboard', { replace: true });
          }
        }
      }
    } catch (err) {
      console.error(err);
      setCurrentProfile('free');
      setUserRole('professor');
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setIsInitializing(false);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        fetchUserProfile(session.user.id);
      } else {
        setCurrentProfile('public');
        setUserRole(null);
        if (location.pathname !== '/') navigate('/');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Registrar logs de acesso reais na tabela access_logs
  useEffect(() => {
    const recordAccessLog = async () => {
      try {
        const ua = navigator.userAgent;
        const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua);
        const deviceType = isMobile ? 'mobile' : 'desktop';

        let source = 'direto';
        const referrer = document.referrer;
        if (referrer) {
          if (referrer.includes('facebook.com') || referrer.includes('t.co') || referrer.includes('instagram.com') || referrer.includes('linkedin.com') || referrer.includes('whatsapp.com')) {
            source = 'redes sociais';
          } else if (referrer.includes('google.com') || referrer.includes('bing.com') || referrer.includes('yahoo.com')) {
            source = 'busca';
          }
        }

        const path = location.pathname;
        let pageName = 'Landing Page';
        if (path.includes('/login')) pageName = 'Login';
        else if (path.includes('/payment')) pageName = 'Pagamento';
        else if (path.includes('/dashboard')) pageName = 'Painel do Professor';
        else if (path.includes('/admin')) pageName = 'Painel Admin';

        const userId = session?.user.id || null;

        // Fazer insert resiliente (com try/catch silenciado caso o usuário não tenha rodado a migration ainda)
        await supabase.from('access_logs').insert({
          user_id: userId,
          device_type: deviceType,
          source: source,
          page: pageName
        });
      } catch (err) {
        console.warn('Erro ao gravar log de acesso:', err);
      }
    };

    recordAccessLog();
  }, [location.pathname, session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const handleGoToLogin = (planIntent?: 'free' | 'pro') => {
    if (planIntent) {
      setUserIntent(planIntent);
      try {
        localStorage.setItem('edutec_user_intent', planIntent);
      } catch (_) {}
    }
    navigate('/login');
  };

  const handleAcceptTerms = async () => {
    if (session?.user.id) {
      const isProIntent = userIntent === 'pro';
      console.log('[App] Aceitando termos. Intenção Pro:', isProIntent, 'Perfil atual:', currentProfile);

      let trialDaysConfig = 7;
      const { data: settingsData } = await supabase
        .from('users')
        .select('nome')
        .eq('email', 'system_settings@edutec.com')
        .maybeSingle();
      if (settingsData && settingsData.nome) {
        try {
          const parsed = JSON.parse(settingsData.nome);
          if (parsed.trial_days !== undefined) {
            trialDaysConfig = parsed.trial_days;
          }
        } catch (_) {}
      }

      const trialDate = isProIntent ? new Date() : null;
      if (isProIntent && trialDate) trialDate.setDate(trialDate.getDate() + trialDaysConfig);
      const expIso = trialDate ? trialDate.toISOString().split('T')[0] : null;

      const nowIso = new Date().toISOString();
      const updateData: any = { 
          aceitou_privacidade: true,
          data_aceite: nowIso 
      };
      
      // Se a intenção é PRO e o usuário ainda está como FREE (ou se acinou de vir do registro trial)
      if (isProIntent && (currentProfile === 'free' || currentProfile === 'public')) {
          updateData.plano = 'pro';
          updateData.status_pagamento = 'pendente';
          updateData.data_expiracao = expIso;
          
          setCurrentProfile('pro');
          setUserStatusPagamento('pendente');
          setUserDataExpiracao(expIso);
      }

      await supabase.from('users').update(updateData).eq('id', session.user.id);
      setAceitouPrivacidade(true);
      
      // Se ativamos o PRO, limpamos a intenção para não confundir futuros logins/registros
      if (isProIntent) {
        localStorage.removeItem('edutec_user_intent');
      }

      navigate(userRole === 'admin' ? '/admin' : '/dashboard');
    }
  };

  if (isInitializing || (session && userRole === null)) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCFB]">
        <div className="w-12 h-12 border-4 border-[#00A859]/20 border-t-[#00A859] rounded-full animate-spin mb-4" />
        <p className="text-black/40 font-medium animate-pulse">Sincronizando perfil...</p>
      </div>
    );
  }

  // Intercept para aceite de termos
  if (session && !aceitouPrivacidade && location.pathname !== '/login') {
    return (
      <TermsAndRules 
        onAccept={handleAcceptTerms}
        onBack={handleLogout}
      />
    );
  }

  return (
    <Routes>
      <Route path="/" element={
        <LandingPage
          onLogin={() => {}} 
          onGoToLogin={handleGoToLogin}
          onGoToPayment={() => navigate('/payment')}
          onGoToDashboard={() => navigate('/dashboard')}
          role={currentProfile}
          statusPagamento={userStatusPagamento}
          userEmail={session?.user.email}
          userId={session?.user.id}
        />
      } />

      <Route path="/login" element={
        <LoginPage 
          onSuccess={async () => {
            const { data: { session: currentSession } } = await supabase.auth.getSession();
            if (currentSession) {
              const { data } = await supabase
                .from('users')
                .select('role')
                .eq('id', currentSession.user.id)
                .maybeSingle();
              if (data?.role === 'admin' || data?.role === 'admin_geral') {
                navigate('/admin', { replace: true });
                return;
              }
            }
            navigate('/dashboard', { replace: true });
          }} 
          onBack={() => navigate('/')}
          initialIntent={userIntent} 
        />
      } />

      <Route path="/payment" element={
        <PaymentPage
          onBack={() => navigate('/')}
          onSuccess={() => navigate('/dashboard')}
          onUnauthenticated={() => handleGoToLogin('pro')}
          userEmail={session?.user.email || ''}
          statusPagamento={userStatusPagamento}
          role={currentProfile}
        />
      } />

      <Route path="/dashboard" element={
        <ProtectedRoute 
          isAuthenticated={!!session} 
          isInitializing={isInitializing}
          userRole={userRole}
          allowedRole="professor"
        >
          <Dashboard
            userId={session?.user.id || ''}
            userEmail={session?.user.email || ''}
            role={currentProfile}
            onLogout={handleLogout}
            onGoToPayment={() => navigate('/payment')}
            userCreatedAt={userCreatedAt}
            userDataExpiracao={userDataExpiracao}
            statusPagamento={userStatusPagamento}
            userWhatsapp={userWhatsapp}
          />
        </ProtectedRoute>
      } />

      <Route path="/admin" element={
        <ProtectedRoute 
          isAuthenticated={!!session} 
          isInitializing={isInitializing}
          userRole={userRole}
          allowedRole="admin"
        >
          <AdminDashboard onLogout={handleLogout} />
        </ProtectedRoute>
      } />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

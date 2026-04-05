import React, { useState, useEffect } from 'react';
import LandingPage from './LandingPage';
import Dashboard from './components/Dashboard';
import LoginPage from './components/LoginPage';
import PaymentPage from './components/PaymentPage';
import TermsAndRules from './components/auth/TermsAndRules';
import PrivacyModal from './components/layout/PrivacyModal';
import { UserProfile } from './types';
import { supabase } from './lib/supabase';
import { Session } from '@supabase/supabase-js';

type View = 'landing' | 'terms' | 'login' | 'dashboard' | 'payment';

export default function App() {
  const getInitialView = (): View => {
    try {
      const saved = localStorage.getItem('edutec_app_view') as View;
      const validViews: View[] = ['landing', 'login', 'dashboard', 'payment'];
      if (saved && validViews.includes(saved)) return saved;
    } catch (_) {}
    return 'landing';
  };

  const [session, setSession] = useState<Session | null>(null);
  const [currentProfile, setCurrentProfile] = useState<UserProfile>('public');
  const [view, setView] = useState<View>(getInitialView());
  const intendedViewRef = React.useRef<View | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  const [userCreatedAt, setUserCreatedAt] = useState<string | null>(null);
  const [userDataExpiracao, setUserDataExpiracao] = useState<string | null>(null);
  const [userStatusPagamento, setUserStatusPagamento] = useState<string | null>(null);
  const [userIntent, setUserIntent] = useState<'free' | 'pro'>(() => {
    try {
      return (localStorage.getItem('edutec_user_intent') as 'free' | 'pro') || 'free';
    } catch (_) {
      return 'free';
    }
  });
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState<boolean>(false); // Começa false para carregar do banco
  const fetchUserProfile = async (userId: string) => {
    setIsInitializing(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('plano, status_pagamento, created_at, data_expiracao, aceitou_privacidade')
        .eq('id', userId)
        .maybeSingle();

      if (error) throw error;

      if (!data) {
        // Novo cadastro via fallback: Respeita a intenção do usuário (Free ou Pro Teste)
        const isProIntent = userIntent === 'pro';
        const trialDate = isProIntent ? new Date() : null;
        if (isProIntent && trialDate) trialDate.setDate(trialDate.getDate() + 7);
        const expIso = trialDate ? trialDate.toISOString().split('T')[0] : null;

        try {
          await supabase.from('users').upsert({
            id: userId,
            plano: isProIntent ? 'pro' : 'free',
            status_pagamento: isProIntent ? 'pendente' : 'gratis',
            data_expiracao: expIso,
            created_at: new Date().toISOString(),
            aceitou_privacidade: false
          });
        } catch (e) {
          console.error('Erro ao criar perfil inicial:', e);
        }

        setCurrentProfile(isProIntent ? 'pro' : 'free');
        setUserCreatedAt(new Date().toISOString());
        setUserDataExpiracao(expIso);
        setUserStatusPagamento(isProIntent ? 'pendente' : 'gratis');
        setAceitouPrivacidade(false);

        setView('dashboard');
      } else {
        const matchedPlano = (data.plano as UserProfile) || 'free';
        setCurrentProfile(matchedPlano);
        setUserCreatedAt(data.created_at);
        setUserDataExpiracao(data.data_expiracao);
        setUserStatusPagamento(data.status_pagamento);
        setAceitouPrivacidade(data.aceitou_privacidade || false);

        const today = new Date().toISOString().split('T')[0];
        const isExpired = data.data_expiracao && data.data_expiracao < today;

        if (matchedPlano === 'pro') {
          const isPaid = data.status_pagamento === 'aprovado';
          const isTrial = data.status_pagamento === 'pendente';
          
          if (!isPaid && !isTrial && isExpired) {
            alert("Seu período de teste grátis de 7 dias terminou. Para continuar acessando as ferramentas Pro, regularize sua assinatura.");
            await supabase.from('users').update({ plano: 'free', status_pagamento: 'expirado' }).eq('id', userId);
            setCurrentProfile('free');
            setUserStatusPagamento('expirado');
            setView('payment');
          } else if (!isPaid && !isTrial && (data.status_pagamento !== 'expirado' && data.status_pagamento !== 'cancelado')) {
             alert("Sua assinatura Pro expirou. Por favor, regularize seu pagamento para continuar.");
             setView('payment');
          } else {
            // Se estiver tudo ok (pago ou trial ativo)
            setView(intendedViewRef.current || 'dashboard');
            intendedViewRef.current = null;
          }
        } else {
          // Usuário Free
          setView(intendedViewRef.current || 'dashboard');
          intendedViewRef.current = null;
        }
      }
    } catch (err) {
      console.error(err);
      setCurrentProfile('free');
      setView(prev => intendedViewRef.current || (prev === 'payment' ? 'payment' : 'dashboard'));
      intendedViewRef.current = null;
    } finally {
      setIsInitializing(false);
    }
  };

  useEffect(() => {
    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        // Se estiver logado e na landing/login, vai para o dashboard
        if (view === 'landing' || view === 'login') {
          setView('dashboard');
        }
        fetchUserProfile(session.user.id);
      } else {
        setIsInitializing(false);
      }
    });

    // Listen to auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        if (view === 'landing' || view === 'login') {
          setView('dashboard');
        }
        fetchUserProfile(session.user.id);
      } else {
        setCurrentProfile('public');
        setView('landing');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Persist current view to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('edutec_app_view', view);
    } catch (_) {}
  }, [view]);

  const handleLogin = (role: UserProfile) => {
    // We keep this signature for LoginPage to pass down the role initially, 
    // but the actual view change is handled by onAuthStateChange event.
    setCurrentProfile(role);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // We map the outer login redirection to save intention if an explicit string is passed
  const handleGoToLogin = (intent?: View, planIntent?: 'free' | 'pro') => {
    if (intent) {
      intendedViewRef.current = intent;
    }
    if (planIntent) {
      console.log('Definindo userIntent como:', planIntent);
      setUserIntent(planIntent);
      try {
        localStorage.setItem('edutec_user_intent', planIntent);
      } catch (_) {}
    }
    setView('login');
  };

  const handleBackToLanding = () => {
    setView('landing');
  };

  const handleGoToDashboard = () => {
    setView('dashboard');
  };

  const handleGoToPayment = () => {
    // Ao ir para pagamento, assumimos intenção Pro
    setUserIntent('pro');
    try {
      localStorage.setItem('edutec_user_intent', 'pro');
    } catch (_) {}
    setView('payment');
  };

  const handlePaymentSuccess = (newRole: UserProfile) => {
    setCurrentProfile(newRole);
    setView('dashboard');
  };

  const handleAcceptTerms = async () => {
    if (session?.user.id) {
      const isProIntent = userIntent === 'pro';
      const trialDate = isProIntent ? new Date() : null;
      if (isProIntent && trialDate) trialDate.setDate(trialDate.getDate() + 7);
      const expIso = trialDate ? trialDate.toISOString().split('T')[0] : null;

      const updateData: any = { aceitou_privacidade: true };
      if (isProIntent && currentProfile === 'free') {
          updateData.plano = 'pro';
          updateData.status_pagamento = 'pendente';
          updateData.data_expiracao = expIso;
      }

      await supabase.from('users').update(updateData).eq('id', session.user.id);
      
      setAceitouPrivacidade(true);
      if (isProIntent && currentProfile === 'free') {
          setCurrentProfile('pro');
          setUserStatusPagamento('pendente');
          setUserDataExpiracao(expIso);
      }
    }
  };

  // Carregamento inicial ou Perfil ainda em transição (public)
  if (isInitializing || (session && currentProfile === 'public')) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#FDFCFB]">
        <div className="w-12 h-12 border-4 border-[#00A859]/20 border-t-[#00A859] rounded-full animate-spin mb-4" />
        <p className="text-black/40 font-medium animate-pulse">Sincronizando perfil...</p>
      </div>
    );
  }

  if (view === 'landing') {
    return <LandingPage
      onLogin={handleLogin}
      onGoToLogin={handleGoToLogin}
      onGoToPayment={handleGoToPayment}
      onGoToDashboard={handleGoToDashboard}
    />;
  }

  if (view === 'login') {
    return (
      <LoginPage 
        onSuccess={() => setView('dashboard')}
        onBack={() => setView('landing')}
        initialIntent={userIntent as 'free' | 'pro'} 
      />
    );
  }

  // Se logado mas NÃO aceitou os termos ainda (ou é conta nova)
  if (session && !aceitouPrivacidade) {
    return (
      <TermsAndRules 
        onAccept={handleAcceptTerms}
        onBack={handleLogout}
      />
    );
  }

  if (view === 'payment') {
    return <PaymentPage
      onBack={handleBackToLanding}
      onSuccess={handlePaymentSuccess}
      onUnauthenticated={() => handleGoToLogin('payment')}
      userEmail={session?.user.email || ''}
      statusPagamento={userStatusPagamento}
      role={currentProfile}
    />;
  }

  return (
    <Dashboard
      userId={session?.user.id || ''}
      userEmail={session?.user.email || ''}
      role={currentProfile}
      onLogout={handleLogout}
      onGoToPayment={handleGoToPayment}
      userCreatedAt={userCreatedAt}
      userDataExpiracao={userDataExpiracao}
      statusPagamento={userStatusPagamento}
    />
  );
}

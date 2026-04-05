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
  const [userIntent, setUserIntent] = useState<'free' | 'pro'>('free'); // Default to free
  const [aceitouPrivacidade, setAceitouPrivacidade] = useState<boolean>(true); // Padrão true para não piscar antes de carregar
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
            plano: isProIntent ? 'teste_pro' : 'free',
            status_pagamento: isProIntent ? 'pendente' : 'gratis',
            data_expiracao: expIso,
            created_at: new Date().toISOString()
          });
        } catch (e) {
          console.error('Erro ao criar perfil inicial:', e);
        }

        setCurrentProfile(isProIntent ? 'teste_pro' : 'free');
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

        if (matchedPlano === 'pro' || matchedPlano === 'teste_pro') {
          const isPaid = data.status_pagamento === 'aprovado';
          const isTrial = matchedPlano === 'teste_pro' && data.status_pagamento === 'pendente';
          
          if (!isPaid && isExpired) {
            if (isTrial) {
              alert("Seu período de teste grátis de 7 dias terminou. Para continuar acessando as ferramentas Pro, regularize sua assinatura.");
              await supabase.from('users').update({ plano: 'free', status_pagamento: 'expirado' }).eq('id', userId);
              setCurrentProfile('free');
              setUserStatusPagamento('expirado');
            } else if (data.status_pagamento !== 'expirado' && data.status_pagamento !== 'cancelado') {
              alert("Sua assinatura Pro expirou. Por favor, regularize seu pagamento para continuar.");
            }
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
      setUserIntent(planIntent);
    }
    setView('terms'); // Garantindo que passe pelos termos agora
  };

  const handleBackToLanding = () => {
    setView('landing');
  };

  const handleGoToDashboard = () => {
    setView('dashboard');
  };

  const handleGoToPayment = () => {
    setView('payment');
  };

  const handlePaymentSuccess = (newRole: UserProfile) => {
    setCurrentProfile(newRole);
    setView('dashboard');
  };

  if (isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCFB]">
        <div className="w-12 h-12 border-4 border-[#00A859]/20 border-t-[#00A859] rounded-full animate-spin" />
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

  if (view === 'terms') {
    return (
      <TermsAndRules 
        onAccept={() => setView('login')}
        onBack={() => setView('landing')}
      />
    );
  }

  if (view === 'login') {
    return (
      <LoginPage 
        onSuccess={() => setView('dashboard')}
        onBack={() => setView('landing')}
        initialIntent={userIntent as 'free' | 'pro'} // Passa a intenção guardada
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

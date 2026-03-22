import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, ChevronLeft, Eye, EyeOff, AlertCircle, User } from 'lucide-react';
import { UserProfile } from '../types';
import { supabase } from '../lib/supabase';

interface LoginPageProps {
  onLogin: (role: UserProfile) => void;
  onBack: () => void;
}

export default function LoginPage({ onLogin, onBack }: LoginPageProps) {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isLoginMode) {
        // Sign In
        const { data, error: authError } = await supabase.auth.signInWithPassword({
          email,
          password
        });

        if (authError) throw authError;

        // The App component will detect the auth change and fetch the correct role
        if (!data.session || !data.user) {
          throw new Error("No session returned.");
        }

        // Consultar tabela users
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('plano, status_pagamento')
          .eq('id', data.user.id)
          .single();

        if (!userError && userData) {
          if (userData.plano === 'pro' && (userData.status_pagamento === 'aprovado' || userData.status_pagamento === 'ativo')) {
            alert('Bem-vindo ao Pro 🚀');
          } else {
            alert('Bem-vindo ao Free');
          }
        }
      } else {
        // Sign Up
        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
        });

        if (signUpError) throw signUpError;

        if (data.user?.identities?.length === 0) {
          setError("Este email já está cadastrado. Faça login.");
          setIsLoginMode(true);
        } else if (data.user) {
          // Sync with public.users table automatically with 7-day PRO trial
          const trialExpiration = new Date();
          trialExpiration.setDate(trialExpiration.getDate() + 7);

          const { error: upsertError } = await supabase
            .from('users')
            .upsert({
              id: data.user.id,
              nome: name || email.split('@')[0],
              email: email,
              senha: 'auth_managed_by_supabase',
              plano: 'pro',
              status_pagamento: 'trial',
              data_expiracao: trialExpiration.toISOString().split('T')[0],
              created_at: new Date().toISOString()
            }, {
              onConflict: 'id'
            });

          if (upsertError) {
            console.error("Failed to sync user profile:", upsertError);
          }

          // In this app architecture, the onAuthStateChange in App.tsx handles the actual reroute,
          // but we shouldn't force isLoginMode while the auth state is transitioning, 
          // because it might interrupt the auto-login that Supabase attempts.
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      // Translate common Supabase messages to Portuguese
      if (err.message === 'Invalid login credentials') {
        setError('E-mail ou senha incorretos.');
      } else if (err.message.includes('Password should be at least')) {
        setError('A senha deve ter pelo menos 6 caracteres.');
      } else if (err.message.includes('User already registered')) {
        setError('Este e-mail já está cadastrado.');
      } else {
        setError(err.message || 'Ocorreu um erro na autenticação.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFCFB] flex flex-col items-center justify-center p-6">
      <motion.div
        key={isLoginMode ? 'login' : 'signup'}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <button
          onClick={onBack}
          className="flex items-center gap-2 text-black/40 hover:text-black transition-colors mb-8 font-medium group"
        >
          <ChevronLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
          Voltar para o início
        </button>

        <div className="bg-white rounded-[40px] border border-black/5 p-8 md:p-12 shadow-xl shadow-black/5">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-[#00A859] rounded-2xl flex items-center justify-center text-white font-bold text-2xl mx-auto mb-6 shadow-lg shadow-[#00A859]/20">
              E
            </div>
            <h1 className="text-3xl font-bold tracking-tight mb-2">
              {isLoginMode ? 'Bem-vindo de volta' : 'Crie sua conta'}
            </h1>
            <p className="text-black/40">
              {isLoginMode ? 'Acesse sua conta para gerenciar suas turmas.' : 'Comece a transformar sua rotina pedagógica.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-2xl flex items-start gap-3 border border-red-100">
              <AlertCircle size={20} className="shrink-0 mt-0.5" />
              <p className="text-sm font-medium">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLoginMode && (
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-black/40 ml-1">Nome Completo</label>
                <div className="relative">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={20} />
                  <input
                    type="text"
                    required={!isLoginMode}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full pl-12 pr-4 py-4 bg-[#FDFCFB] border border-black/5 rounded-2xl focus:outline-none focus:border-[#00A859] transition-colors"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-black/40 ml-1">E-mail</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={20} />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="w-full pl-12 pr-4 py-4 bg-[#FDFCFB] border border-black/5 rounded-2xl focus:outline-none focus:border-[#00A859] transition-colors"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold uppercase tracking-wider text-black/40 ml-1">Senha</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-black/20" size={20} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  minLength={6}
                  className="w-full pl-12 pr-12 py-4 bg-[#FDFCFB] border border-black/5 rounded-2xl focus:outline-none focus:border-[#00A859] transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-black/20 hover:text-black/40 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              {!isLoginMode && (
                <p className="text-[10px] text-black/40 ml-1 mt-1 font-medium">Sua senha deve ter no mínimo 6 caracteres</p>
              )}
            </div>

            {isLoginMode && (
              <div className="flex items-center justify-between text-sm">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <input type="checkbox" className="w-4 h-4 rounded border-black/10 text-[#00A859] focus:ring-[#00A859]" />
                  <span className="text-black/60 group-hover:text-black transition-colors">Lembrar de mim</span>
                </label>
                <a href="#" className="text-[#00A859] font-semibold hover:underline">Esqueceu a senha?</a>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl font-bold hover:bg-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-black/10"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  {isLoginMode ? 'Entrar no Sistema' : 'Criar Conta Gratuita'}
                  <ArrowRight size={20} />
                </>
              )}
            </button>
          </form>

          <div className="mt-10 pt-8 border-t border-black/5 text-center">
            <p className="text-black/40 text-sm">
              {isLoginMode ? 'Ainda não tem uma conta?' : 'Já possui uma conta?'} <br className="sm:hidden" />
              <button
                onClick={() => {
                  setIsLoginMode(!isLoginMode);
                  setError(null);
                }}
                className="text-[#00A859] font-bold hover:underline ml-1 cursor-pointer"
              >
                {isLoginMode ? 'Criar conta gratuita' : 'Fazer login agora'}
              </button>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

-- 1. Função handle_new_user atualizada e robusta
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  -- Log para debug (opcional, visualize nos logs do Supabase)
  -- RAISE NOTICE 'Metadata: %', new.raw_user_meta_data;

  INSERT INTO public.users (
    id, 
    nome, 
    email, 
    senha, 
    plano, 
    status_pagamento, 
    data_expiracao, 
    created_at, 
    updated_at
  )
  VALUES (
    new.id, 
    COALESCE(new.raw_user_meta_data->>'nome', ''), 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'senha', ''), 
    'free', 
    'pendente', 
    (now() + interval '7 days')::date,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    nome = EXCLUDED.nome,
    senha = EXCLUDED.senha,
    updated_at = now();

  RETURN new;
END;
$$;

-- 2. Trigger (Certifique-se de que é AFTER INSERT)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Políticas RLS Seguras para public.users
-- Primeiro, garantimos que o RLS está habilitado
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Remove políticas antigas (opcional, para garantir limpeza)
DROP POLICY IF EXISTS "Usuários podem ver o próprio perfil" ON public.users;
DROP POLICY IF EXISTS "Usuários podem editar o próprio perfil" ON public.users;
DROP POLICY IF EXISTS "Usuários podem deletar o próprio perfil" ON public.users;

-- Política de SELECT: Apenas o dono do registro pode ver
CREATE POLICY "Usuários podem ver o próprio perfil"
ON public.users FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Política de UPDATE: Apenas o dono do registro pode editar
CREATE POLICY "Usuários podem editar o próprio perfil"
ON public.users FOR UPDATE
TO authenticated
USING (auth.uid() = id)
WITH CHECK (auth.uid() = id);

-- Política de DELETE: Apenas o dono do registro pode deletar
CREATE POLICY "Usuários podem deletar o próprio perfil"
ON public.users FOR DELETE
TO authenticated
USING (auth.uid() = id);

-- NOTA IMPORTANTE: Não é necessária política de INSERT para o usuário final
-- se apenas a trigger (SECURITY DEFINER) for responsável por criar o registro.
-- Se você precisar inserir manualmente via Frontend, adicione esta:
-- CREATE POLICY "Usuários podem criar o próprio perfil" ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

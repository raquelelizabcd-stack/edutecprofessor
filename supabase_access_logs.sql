-- Criar a tabela de logs de acesso
CREATE TABLE IF NOT EXISTS public.access_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
    timestamp TIMESTAMPTZ DEFAULT now() NOT NULL,
    device_type TEXT NOT NULL,
    source TEXT NOT NULL,
    page TEXT NOT NULL
);

-- Habilitar RLS (Row Level Security)
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;

-- Criar política de RLS para permitir inserção pública (visitantes anônimos e logados)
DROP POLICY IF EXISTS "Permitir inserção pública de logs" ON public.access_logs;
CREATE POLICY "Permitir inserção pública de logs" 
ON public.access_logs 
FOR INSERT 
WITH CHECK (true);

-- Criar política de RLS para permitir leitura apenas para administradores
DROP POLICY IF EXISTS "Permitir leitura apenas para administradores" ON public.access_logs;
CREATE POLICY "Permitir leitura apenas para administradores" 
ON public.access_logs 
FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM public.users 
        WHERE users.id = auth.uid() 
        AND (users.role = 'admin' OR users.role = 'admin_geral')
    )
);

-- =========================================================================
-- ROTINA DE LIMPEZA AUTOMÁTICA DE LOGS ANTIGOS (> 30 DIAS)
-- =========================================================================

-- 1. Habilitar a extensão pg_cron (caso ainda não esteja ativa)
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 2. Desagendar a tarefa com segurança caso ela já exista para evitar duplicatas
SELECT cron.unschedule('clean-old-access-logs') FROM cron.job WHERE jobname = 'clean-old-access-logs';

-- 3. Agendar a exclusão automática de logs com mais de 30 dias.
-- Esta tarefa é configurada para rodar diariamente à meia-noite (0 0 * * *).
-- É muito mais eficiente e seguro rodar diariamente do que uma vez por mês,
-- pois deleta volumes pequenos por vez e impede o acúmulo súbito de dados no banco.
SELECT cron.schedule(
    'clean-old-access-logs', 
    '0 0 * * *', 
    $$ DELETE FROM public.access_logs WHERE timestamp < NOW() - INTERVAL '30 days'; $$
);

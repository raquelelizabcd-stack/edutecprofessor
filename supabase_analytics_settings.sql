-- Tabela para armazenar as credenciais do Google Analytics de forma segura
CREATE TABLE IF NOT EXISTS public.analytics_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    measurement_id VARCHAR(50) NOT NULL,
    credentials_json TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

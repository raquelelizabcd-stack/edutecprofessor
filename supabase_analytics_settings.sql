-- Tabela para armazenar as credenciais do Google Analytics de forma segura
CREATE TABLE IF NOT EXISTS public.analytics_settings (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    measurement_id VARCHAR(50) NOT NULL,
    credentials_json TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Inserir registro inicial se não existir
INSERT INTO public.analytics_settings (id, measurement_id, credentials_json)
VALUES ('00000000-0000-0000-0000-000000000001', 'G-8XZ9W4PDQE', '{}')
ON CONFLICT (id) DO NOTHING;

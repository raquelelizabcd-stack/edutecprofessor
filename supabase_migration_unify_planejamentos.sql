-- 1. Criação da nova tabela unificada 'planejamentos'
CREATE TABLE IF NOT EXISTS public.planejamentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    titulo_registro TEXT,
    data DATE,
    professor TEXT,
    professor_id UUID REFERENCES public.users(id),
    aluno TEXT,
    componente_curricular TEXT,
    periodo TEXT,
    ano_serie TEXT,
    tom_texto TEXT,
    observacoes_professor TEXT,
    tipo_planejamento TEXT CHECK (tipo_planejamento IN ('Diário', 'Semanal', 'Mensal')),
    
    -- Campos Pedagógicos Consolidados
    objetivos_aprendizagem TEXT,
    atividades_planejadas TEXT,
    recursos_didaticos TEXT,
    avaliacao_acompanhamento TEXT,
    bncc_codes JSONB,
    bncc_code_text TEXT,
    
    -- Campos Específicos
    mes TEXT,
    ano INTEGER,
    grade_semanal_json JSONB,

    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Migrar dados de planejamento_diario
INSERT INTO public.planejamentos (
    id, titulo_registro, data, professor, professor_id, aluno, componente_curricular, periodo, ano_serie,
    tipo_planejamento, objetivos_aprendizagem, atividades_planejadas, recursos_didaticos, avaliacao_acompanhamento,
    bncc_codes, bncc_code_text, created_at
)
SELECT 
    id, titulo_registro, data, professor_nome, professor_id, aluno_nome, componente, periodo, ano_serie,
    'Diário', objetivos, conteudo, recursos, avaliacao,
    bncc_codes, bncc_code_text, created_at
FROM public.planejamento_diario
ON CONFLICT (id) DO NOTHING;

-- 3. Migrar dados de planejamento_semanal
INSERT INTO public.planejamentos (
    id, titulo_registro, data, professor, professor_id, aluno, componente_curricular, periodo, ano_serie,
    observacoes_professor, tipo_planejamento, objetivos_aprendizagem, atividades_planejadas, recursos_didaticos, avaliacao_acompanhamento,
    bncc_codes, bncc_code_text, grade_semanal_json, created_at
)
SELECT 
    id, titulo_registro, data_ref, professor_nome, professor_id, aluno_nome, componentes_curriculares, periodo, ano_serie,
    observacoes_adicionais, 'Semanal', objetivo_aprendizagem, atividade, recursos_didaticos, avaliacao_acompanhamento,
    bncc_codes, bncc_code_text, grade_semanal_json, created_at
FROM public.planejamento_semanal
ON CONFLICT (id) DO NOTHING;

-- 4. Migrar dados de planejamento_mensal
INSERT INTO public.planejamentos (
    id, titulo_registro, data, professor, professor_id, aluno, componente_curricular, periodo, ano_serie,
    observacoes_professor, tipo_planejamento, objetivos_aprendizagem, atividades_planejadas, recursos_didaticos, avaliacao_acompanhamento,
    bncc_codes, bncc_code_text, mes, ano, created_at
)
SELECT 
    id, titulo_registro, data_ref, professor_nome, professor_id, aluno_nome, componente_curricular, periodo, ano_serie,
    observacoes, 'Mensal', objetivos, atividades, recursos, avaliacao,
    bncc_codes, bncc_code_text, mes, ano, created_at
FROM public.planejamento_mensal
ON CONFLICT (id) DO NOTHING;

-- 5. Renomear as tabelas antigas para evitar leituras cruzadas acidentais (marca como obsoleto, sem deletar os dados)
ALTER TABLE public.planejamento_diario RENAME TO planejamento_diario_obsoleto;
ALTER TABLE public.planejamento_semanal RENAME TO planejamento_semanal_obsoleto;
ALTER TABLE public.planejamento_mensal RENAME TO planejamento_mensal_obsoleto;

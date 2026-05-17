-- 1. Ativar Row Level Security (RLS) na nova tabela
ALTER TABLE public.planejamentos ENABLE ROW LEVEL SECURITY;

-- 2. Política para SELECT: Professores só podem ver seus próprios planejamentos
CREATE POLICY "Professores podem ver seus próprios planejamentos"
ON public.planejamentos
FOR SELECT
USING (auth.uid() = professor_id);

-- 3. Política para INSERT: Professores só podem criar planejamentos para si mesmos
CREATE POLICY "Professores podem inserir seus próprios planejamentos"
ON public.planejamentos
FOR INSERT
WITH CHECK (auth.uid() = professor_id);

-- 4. Política para UPDATE: Professores só podem atualizar seus próprios planejamentos
CREATE POLICY "Professores podem atualizar seus próprios planejamentos"
ON public.planejamentos
FOR UPDATE
USING (auth.uid() = professor_id)
WITH CHECK (auth.uid() = professor_id);

-- 5. Política para DELETE: Professores só podem deletar seus próprios planejamentos
CREATE POLICY "Professores podem deletar seus próprios planejamentos"
ON public.planejamentos
FOR DELETE
USING (auth.uid() = professor_id);

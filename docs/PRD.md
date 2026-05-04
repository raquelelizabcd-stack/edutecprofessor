# PRD - EduTecPro: Gestão Pedagógica Inteligente

## 1. Visão Geral do Produto
O **EduTecPro** é um Micro-SaaS desenvolvido para transformar a rotina burocrática dos professores em uma experiência fluida, organizada e tecnologicamente avançada. A plataforma centraliza o planejamento pedagógico, o acompanhamento de alunos e a geração de documentos oficiais, garantindo total alinhamento com a **BNCC (Base Nacional Comum Curricular)**.

-----


## 2. Público-Alvo
*   **Professores de Educação Infantil (EI):** Foco em campos de experiência e objetivos de aprendizagem.
*   **Professores de Ensino Fundamental (EF):** Foco em componentes curriculares, habilidades e objetos de conhecimento.
*   **Coordenadores Pedagógicos:** Para supervisão e padronização de documentos.
*   **Educadores e Gestores:** Painel dedicado a profissionais da educação, facilitando a gestão, o suporte e o acompanhamento pedagógico contínuo.

---

## 3. Objetivos Estratégicos
1.  **Redução da Sobrecarga:** Automatizar a criação de relatórios e planejamentos que consomem horas do docente.
2.  **Conformidade Normativa:** Facilitar a aplicação correta dos códigos BNCC em todos os registros.
3.  **Profissionalização:** Oferecer exportações em PDF de alta qualidade para entrega a pais e instituições.
4.  **Monetização Sustentável:** Modelo Freemium com conversão para Plano Pro via Stripe e PagBank.

---

## 4. Funcionalidades Detalhadas

### 4.1. Módulo de Planejamento (Wizard Inteligente)
*   **Planejamento Semanal:** Guia passo a passo para selecionar Etapa, Faixa Etária, Componente e Habilidades.
*   **Planejamento Diário:** Registro detalhado de objetivos, desenvolvimento metodológico, recursos e avaliação.
*   **Planejamento Mensal:** Consolidação de carga horária, aulas previstas vs. realizadas e síntese do mês.

### 4.2. Gestão de Alunos e Turmas
*   **Cadastro Completo:** Registro de nome, data de nascimento, contatos e observações de saúde/PCD.
*   **Controle de Frequência:** Registro de faltas e presenças com visualização de indicadores de assiduidade.
*   **Portfólio Individual:** Acúmulo de registros e evoluções por aluno ao longo do ano.

### 4.3. Relatórios e IA (EduBot)
*   **Relatório de Evolução:** Gerador de textos narrativos baseados no desempenho coletado.
*   **Parecer PCD:** Suporte especializado para alunos com deficiência, com templates estruturados.
*   **EduBot (Assistente BNCC):** Chatbot integrado para tirar dúvidas pedagógicas, sugerir atividades e localizar códigos da BNCC instantaneamente.

### 4.4. Finanças e Assinaturas (Resiliência Pro)
*   **Plano Free:** Acesso limitado a funcionalidades básicas e 1 turma.
*   **Plano Pro:** 
    *   Turmas e alunos ilimitados.
    *   Exportação de PDFs premium.
    *   Acesso total ao EduBot.
*   **Sistema de Trial:** 7 dias grátis com sincronização resiliente entre Auth, LocalStorage e Banco de Dados.
*   **Checkout Multi-Provider:** Integração com Stripe e Mercado Pago (PIX com QR Code dinâmico e Webhooks automáticos).
*   **Gerenciamento de Assinatura:** Portal do Cliente para cancelamento autônomo e histórico de faturamento.

### 4.5. Painel Administrativo (Admin Console)
*   **Gestão de Usuários:** Visualização completa de métricas, status de pagamento e bloqueio de acesso.
*   **Suporte Integrado:** Módulo de chamados via Gmail/SMTP para atendimento direto ao professor.
*   **Auditoria de Dados:** Acesso aos registros pedagógicos para supervisão de qualidade.

### 4.6. Módulos Especializados
*   **SOS Adaptação:** Ferramenta de suporte pedagógico que oferece estratégias de inclusão e códigos BNCC baseados no tipo de deficiência do aluno.
*   **Saúde e Nutrição:** Registro e persistência de dados de saúde, alergias e alimentação dos alunos.
*   **Hub de Mediação:** Gestão de registros de mediação escolar e acompanhamento de alunos com suporte especializado.

---

## 5. Arquitetura e Stack Tecnológica
*   **Frontend:** React 18 + TypeScript + Vite.
*   **Estilização:** Vanilla CSS (Design System Premium com Glassmorphism e Micro-animações).
*   **Backend & DB:** Supabase (Auth, PostgreSQL, Storage, RLS avançado).
*   **Webhooks & APIs:** Node.js enviando eventos do Stripe e Mercado Pago em tempo real.
*   **Segurança:** Fluxo de aceite de termos de uso e privacidade obrigatório antes do acesso ao Dashboard.
*   **Infraestrutura:** Vercel e Supabase Edge Functions.

---

## 6. Design e Experiência do Usuário (UX/UI)
*   **Estética "Wow":** Uso de gradientes HSL adaptativos, dark mode nativo e componentes de feedback premium.
*   **Responsividade:** Mobile-first com sidebar adaptável e tabelas com scroll horizontal inteligente.
*   **Acessibilidade:** Semântica HTML5 rigorosa e conformidade com contrastes de UI modernos.

---

## 7. Roadmap Futuro (Próximas Fases)
*   [ ] Integração com Google Classroom.
*   [ ] Aplicativo Mobile Nativo (PWA Avançado).
*   [ ] Sistema de Gamificação (Pontuação por completude de planejamento).
*   [ ] Relatórios Estatísticos Avançados sobre o desenvolvimento da turma.

---
**Documento atualizado em:** 04/05/2026
**Responsável:** Antigravity AI (Google DeepMind)

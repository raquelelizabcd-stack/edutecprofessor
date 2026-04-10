# PRD - EduTecPro: Gestão Pedagógica Inteligente

## 1. Visão Geral do Produto
O **EduTecPro** é um Micro-SaaS desenvolvido para transformar a rotina burocrática dos professores em uma experiência fluida, organizada e tecnologicamente avançada. A plataforma centraliza o planejamento pedagógico, o acompanhamento de alunos e a geração de documentos oficiais, garantindo total alinhamento com a **BNCC (Base Nacional Comum Curricular)**.

---

## 2. Público-Alvo
*   **Professores de Educação Infantil (EI):** Foco em campos de experiência e objetivos de aprendizagem.
*   **Professores de Ensino Fundamental (EF):** Foco em componentes curriculares, habilidades e objetos de conhecimento.
*   **Coordenadores Pedagógicos:** Para supervisão e padronização de documentos.

---

## 3. Objetivos Estratégicos
1.  **Redução da Sobrecarga:** Automatizar a criação de relatórios e planejamentos que consomem horas do docente.
2.  **Conformidade Normativa:** Facilitar a aplicação correta dos códigos BNCC em todos os registros.
3.  **Profissionalização:** Oferecer exportações em PDF de alta qualidade para entrega a pais e instituições.
4.  **Monetização Sustentável:** Modelo Freemium com conversão para Plano Pro via Stripe.

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

### 4.4. Finanças e Assinaturas
*   **Plano Free:** Acesso limitado a funcionalidades básicas e 1 turma.
*   **Plano Pro:** 
    *   Turmas e alunos ilimitados.
    *   Exportação de PDFs premium.
    *   Acesso total ao EduBot.
*   **Sistema de Trial:** 7 dias grátis para experimentar o Pro antes da cobrança.
*   **Checkout Stripe:** Transações seguras via Cartão de Crédito e Pix (com webhook para ativação automática).

---

## 5. Arquitetura e Stack Tecnológica
*   **Frontend:** React 18 + TypeScript + Vite.
*   **Estilização:** Vanilla CSS (Design System Premium: Mode Dark/Light, Glassmorphism, HSL Colors).
*   **Backend & DB:** Supabase (Auth, PostgreSQL, Storage).
*   **Infraestrutura:** Vercel (Hospedagem e Edge Functions).
*   **Pagamentos:** Stripe (Customer Portal e Payment Links).
*   **Exportação:** Sistema de geração de PDF dinâmico via Cloud Functions.

---

## 6. Design e Experiência do Usuário (UX/UI)
*   **Estética "Wow":** Uso de gradientes suaves, micro-animações em botões e feedbacks visuais claros.
*   **Responsividade:** Interface adaptada para Desktop, Tablets e Mobile.
*   **Acessibilidade:** Cores com contraste adequado e semântica HTML5 correta.

---

## 7. Roadmap Futuro (Próximas Fases)
*   [ ] Integração com Google Classroom.
*   [ ] Aplicativo Mobile Nativo (PWA Avançado).
*   [ ] Sistema de Gamificação para engajamento do professor.
*   [ ] Análise de dados preditiva sobre o desenvolvimento da turma.

---
**Documento atualizado em:** 08/04/2026
**Responsável:** Antigravity AI

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, FileText, CheckCircle } from 'lucide-react';

export default function TermsOfUsePage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#FDFCFB] text-[#1A1A1A] py-16 px-6 font-sans">
      <div className="max-w-3xl mx-auto">
        {/* Back Button */}
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-black/40 hover:text-black transition-colors mb-8 font-medium group"
        >
          <ChevronLeft className="group-hover:-translate-x-1 transition-transform" size={20} />
          Voltar para a página inicial
        </button>

        {/* Content Card */}
        <div className="bg-white rounded-[32px] border border-black/5 p-8 md:p-12 shadow-xl shadow-black/[0.02]">
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-[#00A859]/10 rounded-2xl flex items-center justify-center text-[#00A859]">
              <FileText size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Termos de Uso</h1>
              <p className="text-black/40 text-sm">Última atualização: Junho de 2026</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none space-y-6 text-black/70 leading-relaxed text-sm md:text-base">
            <section>
              <h2 className="text-xl font-bold text-black mb-3">1. Aceitação dos Termos</h2>
              <p>
                Ao acessar e utilizar o site e a plataforma <strong>EduTecProfessor</strong>, você concorda em cumprir e estar vinculado a estes Termos de Uso. Se você não concordar com qualquer parte destes termos, não deverá utilizar nossos serviços.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-black mb-3">2. Uso do Serviço e Limites dos Planos</h2>
              <p>
                O EduTecProfessor é uma ferramenta de gestão pedagógica para professores individuais. O uso da plataforma é dividido de acordo com o plano escolhido:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-2">
                <li>
                  <strong>Plano Free (R$ 0):</strong> Permite a criação de 1 planejamento diário/relatório por dia, 1 planejamento semanal por semana e 1 planejamento mensal por mês. A exportação em PDF é bloqueada e os dados são apagados após 7 dias de inatividade.
                </li>
                <li>
                  <strong>Teste Pro (7 dias grátis):</strong> Dá acesso temporário aos recursos Pro com limites de até 4 PDFs totais, 10 portfólios e 5 alunos cadastrados.
                </li>
                <li>
                  <strong>Plano Pro Pago (R$ 29,90/mês):</strong> Recursos ilimitados de planejamento e relatórios, exportação ilimitada de PDFs, gestão de até 170 alunos, 500MB de espaço para arquivos e ausência total de anúncios.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-black mb-3">3. Responsabilidades do Usuário</h2>
              <p>
                Você é inteiramente responsável pelas informações inseridas no sistema, incluindo dados pedagógicos e informações de alunos. Você se compromete a:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Manter suas credenciais de login seguras e confidenciais.</li>
                <li>Não utilizar a plataforma para fins ilícitos ou que violem direitos de terceiros.</li>
                <li>Inserir dados verídicos e manter as informações atualizadas.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-black mb-3">4. Pagamento e Cancelamento</h2>
              <p>
                A assinatura do Plano Pro é recorrente (mensal). O pagamento é realizado através de gateways de pagamento globais altamente seguros com criptografia. Você pode solicitar o cancelamento da sua assinatura Pro a qualquer momento diretamente pela plataforma ou entrando em contato com nosso suporte, sem multas ou burocracias.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-black mb-3">5. Limitação de Responsabilidade</h2>
              <p>
                O EduTecProfessor é fornecido "no estado em que se encontra". Embora nos esforcemos para manter a plataforma sempre online e segura, não garantimos o funcionamento ininterrupto ou livre de erros. Não nos responsabilizamos por perdas de dados pedagógicos decorrentes do uso inadequado da plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-black mb-3">6. Modificações dos Termos</h2>
              <p>
                Reservamo-nos o direito de modificar estes Termos de Uso a qualquer momento. Alterações significativas serão notificadas na plataforma ou por e-mail. O uso continuado da plataforma após tais alterações constitui sua aceitação dos novos termos.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-black/40 font-medium">EduTecPro © 2026 - Segurança e Transparência</p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-[#00A859] hover:bg-[#008F4C] text-white font-semibold rounded-xl text-sm transition-all shadow-md shadow-emerald-500/10"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

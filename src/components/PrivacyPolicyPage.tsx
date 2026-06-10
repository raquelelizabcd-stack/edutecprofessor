import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Shield, Lock, Eye } from 'lucide-react';

export default function PrivacyPolicyPage() {
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
              <Lock size={24} />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Política de Privacidade</h1>
              <p className="text-black/40 text-sm">Última atualização: Junho de 2026</p>
            </div>
          </div>

          <div className="prose prose-slate max-w-none space-y-6 text-black/70 leading-relaxed text-sm md:text-base">
            <p className="font-medium">
              A sua privacidade é extremamente importante para nós. Esta Política de Privacidade explica como coletamos, usamos, armazenamos e protegemos seus dados pessoais de acordo com a Lei Geral de Proteção de Dados (LGPD).
            </p>

            <section>
              <h2 className="text-xl font-bold text-black mb-3">1. Coleta de Informações</h2>
              <p>
                Coletamos informações necessárias para a prestação e melhoria dos nossos serviços pedagógicos:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li><strong>Dados de Conta:</strong> Nome completo, endereço de e-mail e número de telefone/WhatsApp ao se cadastrar.</li>
                <li><strong>Dados Pedagógicos:</strong> Informações de alunos, diários de classe, relatórios e planejamentos criados por você na plataforma.</li>
                <li><strong>Dados de Acesso:</strong> Tipo de dispositivo, navegador, data e hora de acesso, e páginas visualizadas (usados para auditoria e melhoria do sistema).</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-black mb-3">2. Finalidade do Tratamento de Dados</h2>
              <p>
                Os dados coletados são tratados exclusivamente para as seguintes finalidades:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Garantir o funcionamento correto da plataforma EduTecProfessor.</li>
                <li>Personalizar a sua experiência e otimizar recursos pedagógicos.</li>
                <li>Processar pagamentos de forma segura através dos nossos parceiros integrados.</li>
                <li>Enviar comunicações sobre a sua conta, atualizações da plataforma e suporte técnico.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-black mb-3">3. Compartilhamento e Segurança de Dados</h2>
              <p>
                Temos o compromisso de **não vender ou compartilhar seus dados com terceiros** para fins publicitários ou lucrativos. Seus dados pedagógicos e pessoais são mantidos em servidores seguros.
              </p>
              <p className="mt-2">
                As transações financeiras são criptografadas e processadas externamente por gateways de pagamento globais certificados. Não armazenamos informações de cartões de crédito em nossos servidores.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-bold text-black mb-3">4. Direitos do Titular</h2>
              <p>
                Você, como titular dos dados, possui controle total sobre suas informações pedagógicas e de cadastro. A qualquer momento você pode solicitar:
              </p>
              <ul className="list-disc pl-5 mt-2 space-y-1">
                <li>Confirmação e acesso aos dados armazenados.</li>
                <li>Correção de dados incompletos ou inexatos.</li>
                <li>A exclusão permanente de seus dados pedagógicos e encerramento da conta via suporte.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-bold text-black mb-3">5. Retenção de Dados</h2>
              <p>
                No Plano Free, os dados pedagógicos poderão ser apagados permanentemente após 7 dias de inatividade ou término do período experimental. Recomendamos a exportação periódica em PDF ou a assinatura do Plano Pro para garantir a permanência de seus relatórios de forma ilimitada.
              </p>
            </section>
          </div>

          <div className="mt-8 pt-8 border-t border-black/5 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-black/40 font-medium">EduTecPro © 2026 - Segurança e Privacidade</p>
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

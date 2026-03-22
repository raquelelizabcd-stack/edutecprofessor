import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import nodemailer from "npm:nodemailer";
import { parse } from "npm:json2csv";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EMAIL_USER = Deno.env.get("EMAIL_USER") ?? "";
const EMAIL_PASS = Deno.env.get("EMAIL_PASS") ?? "";

serve(async (req) => {
  try {
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Encontrar professores expirados
    console.log("Iniciando varredura de professores expirados...");

    // Professores FREE: dados com mais de 15 dias (conta criada há mais de 15 dias)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const { data: freeUsers, error: freeError } = await supabase
      .from('users')
      .select('id, email, nome')
      .eq('plano', 'free')
      .lt('created_at', fifteenDaysAgo.toISOString());

    if (freeError) {
      console.error("Erro ao buscar usuários Free:", freeError);
      throw freeError;
    }

    // Professores PRO: expirados há mais de 30 dias
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const { data: proUsers, error: proError } = await supabase
      .from('users')
      .select('id, email, nome')
      .eq('plano', 'pro')
      .lt('data_expiracao', thirtyDaysAgo.toISOString());

    if (proError) {
      console.error("Erro ao buscar usuários Pro:", proError);
      throw proError;
    }

    const expiredUsers = [...(freeUsers || []), ...(proUsers || [])];
    console.log(`Encontrados ${expiredUsers.length} professores expirados.`);

    if (expiredUsers.length === 0) {
      return new Response(
        JSON.stringify({ message: "Nenhum professor expirado encontrado." }),
        { headers: { "Content-Type": "application/json" }, status: 200 }
      );
    }

    // Configurar Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Adapte conforme seu provedor (SendGrid, Outlook, etc.)
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    for (const user of expiredUsers) {
      console.log(`Processando professor: ${user.email} (ID: ${user.id})`);

      // 2. Buscar dados: alunos e planejamentos
      const { data: alunos, error: errorAlunos } = await supabase
        .from('alunos')
        .select('*')
        .eq('professor_id', user.id);

      const { data: planejamentosDiarios, error: errorDiarios } = await supabase
        .from('planejamento_diario')
        .select('*')
        .eq('professor_id', user.id);

      const { data: planejamentosSemanais, error: errorSemanais } = await supabase
        .from('planejamento_semanal')
        .select('*')
        .eq('professor_id', user.id);

      const { data: planejamentosMensais, error: errorMensais } = await supabase
        .from('planejamento_mensal')
        .select('*')
        .eq('professor_id', user.id);

      const { data: relatorios, error: errorRelatorios } = await supabase
        .from('relatorios')
        .select('*')
        .eq('professor_id', user.id);

      const { data: reflexoes, error: errorReflexoes } = await supabase
        .from('diario_reflexoes')
        .select('*')
        .eq('professor_id', user.id);

      if (errorAlunos || errorDiarios || errorSemanais || errorMensais || errorRelatorios || errorReflexoes) {
        console.error(`Erro ao buscar dados do professor ${user.id}:`, errorAlunos || errorDiarios);
        continue; // Pula para o próximo se houver erro
      }

      let attachments = [];

      // 3. Converter para CSV
      const addToAttachments = (data, filename) => {
        if (data && data.length > 0) {
          try {
            const csv = parse(data);
            attachments.push({ filename, content: csv });
          } catch (err) {
            console.error(`Erro ao gerar CSV ${filename} para ${user.id}:`, err);
          }
        }
      };

      addToAttachments(alunos, 'alunos_export.csv');
      addToAttachments(planejamentosDiarios, 'planejamentos_diarios_export.csv');
      addToAttachments(planejamentosSemanais, 'planejamentos_semanais_export.csv');
      addToAttachments(planejamentosMensais, 'planejamentos_mensais_export.csv');
      addToAttachments(relatorios, 'relatorios_e_registros_export.csv');
      addToAttachments(reflexoes, 'periodo_reflexoes_export.csv');

      // 4. Enviar e-mail
      if (attachments.length > 0) {
        try {
          const mailOptions = {
            from: `"EduTecProfessor" <${EMAIL_USER}>`,
            to: user.email,
            subject: 'EduTecProfessor: Exportação Final de seus Dados Pedagógicos',
            text: `Olá ${user.nome || 'Professor(a)'},\n\nO período de retenção de 15 dias do seu Plano Free expirou.\n\nConforme nossa política de retenção, estamos enviando em anexo todos os seus registros (planejamentos diários, semanais, mensais, relatórios e reflexões) em formato CSV.\n\nIMPORTANTE: Seus dados foram removidos permanentemente do nosso sistema ativo neste momento. Você pode voltar a utilizar a plataforma a qualquer momento iniciando um novo ciclo.\n\nAtenciosamente,\nEquipe EduTecProfessor`,
            attachments: attachments,
          };

          await transporter.sendMail(mailOptions);
          console.log(`E-mail com dados exportados enviado para ${user.email}`);

          // 5. Excluir dados após envio bem-sucedido
          await supabase.from('alunos').delete().eq('professor_id', user.id);
          await supabase.from('planejamento_diario').delete().eq('professor_id', user.id);
          await supabase.from('planejamento_semanal').delete().eq('professor_id', user.id);
          await supabase.from('planejamento_mensal').delete().eq('professor_id', user.id);
          await supabase.from('relatorios').delete().eq('professor_id', user.id);
          await supabase.from('diario_reflexoes').delete().eq('professor_id', user.id);
          // O documentos_bncc deve ter cascade delete ou ser apagado via trigger/manual, 
          // mas as tabelas principais cobertas garantem a limpeza.

          console.log(`Todos os dados do professor ${user.id} foram apagados conforme regra de 15 dias.`);

        } catch (mailErr) {
          console.error(`Erro ao enviar e-mail para ${user.email}:`, mailErr);
        }
      } else {
        console.log(`Professor ${user.email} não possuía registros para exportar.`);
      }
    }

    return new Response(
      JSON.stringify({ message: "Exportação e exclusão concluídas." }),
      { headers: { "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("Erro geral na Edge Function:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
});

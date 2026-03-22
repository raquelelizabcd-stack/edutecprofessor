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

      const { data: planejamentos, error: errorPlanejamentos } = await supabase
        .from('planejamento_diario')
        .select('*')
        .eq('professor_id', user.id);

      if (errorAlunos || errorPlanejamentos) {
        console.error(`Erro ao buscar dados do professor ${user.id}:`, errorAlunos || errorPlanejamentos);
        continue; // Pula para o próximo se houver erro
      }

      let attachments = [];

      // 3. Converter para CSV
      if (alunos && alunos.length > 0) {
        try {
          const csvAlunos = parse(alunos);
          attachments.push({
            filename: 'alunos_export.csv',
            content: csvAlunos,
          });
        } catch (err) {
          console.error(`Erro ao gerar CSV de alunos para ${user.id}:`, err);
        }
      }

      if (planejamentos && planejamentos.length > 0) {
        try {
          const csvPlanejamentos = parse(planejamentos);
          attachments.push({
            filename: 'planejamentos_export.csv',
            content: csvPlanejamentos,
          });
        } catch (err) {
          console.error(`Erro ao gerar CSV de planejamentos para ${user.id}:`, err);
        }
      }

      // 4. Enviar e-mail
      if (attachments.length > 0) {
        try {
          const mailOptions = {
            from: `"EduTecPro" <${EMAIL_USER}>`,
            to: user.email,
            subject: 'EduTecPro: Exportação de seus dados pedagógicos',
            text: `Olá ${user.nome || 'Professor(a)'},\n\nO período de retenção dos seus dados no seu plano atual expirou.\nSegue em anexo a exportação dos seus alunos e planejamentos diários cadastrados em nossa plataforma em formato CSV.\n\nPor políticas de retenção de dados, as informações estão sendo removidas do nosso banco de dados ativo.\n\nAtenciosamente,\nEquipe EduTecPro`,
            attachments: attachments,
          };

          await transporter.sendMail(mailOptions);
          console.log(`E-mail com dados exportados enviado para ${user.email}`);

          // 5. Excluir dados após envio bem-sucedido
          // Nota: O Supabase (via PostgreSQL) apagaria em cascata se configurado nas FKs. Aqui forçamos via delete explícito ou cascata.
          // Se `planejamento_bncc` depender de `planejamento_diario` com ON DELETE CASCADE, será apagado. Se não, idealmente deveríamos apagar os vínculos primeiro.

          await supabase.from('alunos').delete().eq('professor_id', user.id);
          await supabase.from('planejamento_diario').delete().eq('professor_id', user.id);

          console.log(`Dados do professor ${user.id} apagados das tabelas alunos e planejamento_diario.`);

        } catch (mailErr) {
          console.error(`Erro ao enviar e-mail para ${user.email}:`, mailErr);
        }
      } else {
        console.log(`Professor ${user.email} não possuía registros para exportar. Nenhuma ação de exclusão dos registros foi necessária (já estavam vazios).`);
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

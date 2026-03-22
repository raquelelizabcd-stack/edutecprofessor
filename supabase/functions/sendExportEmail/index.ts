import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import nodemailer from "npm:nodemailer";
import { parse } from "npm:json2csv";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const EMAIL_USER = Deno.env.get("EMAIL_USER") ?? "";
const EMAIL_PASS = Deno.env.get("EMAIL_PASS") ?? "";

serve(async (req) => {
  // Configurar CORS
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Obter o token JWT do header de Authorization
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Validar quem é o usuário fazendo o pedido
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 });
    }

    // Obter dados extras do profile
    const { data: profile } = await supabaseClient.from('users').select('nome, email').eq('id', user.id).single();
    const userEmail = profile?.email || user.email;
    const userName = profile?.nome || 'Professor(a)';

    if (!userEmail) {
      return new Response(JSON.stringify({ error: "E-mail do professor não encontrado." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const { csvContent, pdfContent, format } = body;

    if (!csvContent && !pdfContent) {
      return new Response(JSON.stringify({ error: "Nenhum dado pedagógico fornecido para exportação." }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 400 });
    }

    const extension = format === 'pdf' ? 'pdf' : 'csv';
    const filename = `registros_pedagogicos_export.${extension}`;
    const fileContent = format === 'pdf' ? pdfContent : csvContent;

    let attachments = [
      {
        filename: filename,
        content: fileContent,
        encoding: format === 'pdf' ? 'base64' : undefined
      }
    ];

    // 4. Enviar e-mail com Nodemailer
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Adapte conforme seu provedor
      auth: {
        user: EMAIL_USER,
        pass: EMAIL_PASS,
      },
    });

    const mailOptions = {
      from: `"EduTecPro" <${EMAIL_USER}>`,
      to: userEmail,
      subject: `EduTecPro: Exportação de seus Dados Pedagógicos (${extension.toUpperCase()})`,
      text: `Olá ${userName},\n\nConforme solicitado, segue em anexo a exportação dos seus registros pedagógicos em formato ${extension.toUpperCase()}.\n\nAtenciosamente,\nEquipe EduTecPro`,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);
    console.log(`E-mail com exportação enviado com sucesso para ${userEmail}`);

    return new Response(
      JSON.stringify({ message: `Dados exportados em ${extension.toUpperCase()} e enviados para o seu e-mail com sucesso!` }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 }
    );

  } catch (err) {
    console.error("Erro geral na Edge Function sendExportEmail:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

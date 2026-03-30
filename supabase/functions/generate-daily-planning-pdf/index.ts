import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { id } = await req.json();
    
    if (!id) {
      return new Response(JSON.stringify({ error: "ID do registro não fornecido." }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 400 
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Buscar o registro do planejamento diário com joins para Aluno e Professor
    const { data: planning, error: fetchError } = await supabaseClient
      .from('planejamento_diario')
      .select(`
        *,
        aluno:alunos(nome),
        professor:users(nome)
      `)
      .eq('id', id)
      .single();

    if (fetchError || !planning) {
      console.error("Erro ao buscar planejamento:", fetchError);
      return new Response(JSON.stringify({ error: "Registro não encontrado." }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 404 
      });
    }

    // 2. Gerar o PDF com jsPDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 0;

    // --- CABEÇALHO ---
    doc.setFillColor(0, 168, 89); // Verde Institucional
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("EduTecProfessor", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text("Planejamento Diário de Aula", pageWidth / 2, 30, { align: "center" });

    // --- INFORMAÇÕES BÁSICAS ---
    y = 55;
    doc.setTextColor(30, 41, 59); // Slate 800
    doc.setFontSize(10);
    doc.setFont("helvetica", "bold");
    doc.text("INFORMAÇÕES GERAIS", margin, y);
    y += 2;
    doc.setDrawColor(226, 232, 240); // Slate 200
    doc.line(margin, y, pageWidth - margin, y);
    y += 10;

    const infoData = [
      ["Título do Plano:", planning.titulo_registro || "Não definido"],
      ["Data da Aula:", planning.data ? new Date(planning.data).toLocaleDateString('pt-BR') : "N/A"],
      ["Professor(a):", planning.professor?.nome || "Não informado"],
      ["Aluno(a):", planning.aluno_nome || planning.aluno?.nome || "Turma Geral"],
      ["Componente Curricular:", planning.componente || "Não informado"],
      ["Período / Turno:", planning.periodo || planning.turno || "Não informado"]
    ];

    infoData.forEach(([label, value]) => {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10);
      doc.text(label, margin, y);
      doc.setFont("helvetica", "normal");
      doc.text(String(value), margin + 45, y);
      y += 8;
    });

    y += 10;

    // --- SEÇÕES DE CONTEÚDO ---
    const addSection = (title, content) => {
      if (y > 240) {
        doc.addPage();
        y = 25;
      }
      
      // Título da Seção
      doc.setFillColor(241, 245, 249); // Slate 100
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setTextColor(51, 65, 85); // Slate 700
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(title.toUpperCase(), margin + 5, y + 7);
      y += 15;

      // Conteúdo da Seção
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(content || "Nenhum conteúdo registrado.", contentWidth - 10);
      doc.text(splitText, margin + 5, y);
      y += (splitText.length * 5.5) + 15;
    };

    addSection("Objetivos da Aula", planning.objetivos);
    addSection("Atividades Planejadas", planning.conteudo);
    addSection("Recursos Didáticos", planning.recursos);
    addSection("Avaliação / Observações", planning.avaliacao);

    // --- BNCC ---
    if (y > 240) {
      doc.addPage();
      y = 25;
    }
    doc.setFillColor(0, 168, 89, 0.1); // Verde bem clarinho
    doc.rect(margin, y, contentWidth, 30, 'F');
    doc.setTextColor(0, 100, 50);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BASE NACIONAL COMUM CURRICULAR (BNCC)", margin + 5, y + 8);
    
    y += 14;
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    let bnccText = "";
    if (planning.bncc_codes && planning.bncc_codes.length > 0) {
      bnccText += "Códigos Selecionados: " + planning.bncc_codes.join(", ") + "\n";
    }
    if (planning.bncc_code_text) {
      bnccText += "Escrita Livre: " + planning.bncc_code_text;
    }
    const splitBncc = doc.splitTextToSize(bnccText || "Nenhum código BNCC vinculado.", contentWidth - 15);
    doc.text(splitBncc, margin + 5, y);

    // --- RODAPÉ ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text("PDF gerado automaticamente pelo sistema EduTecProfessor", pageWidth / 2, 285, { align: "center" });
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 285, { align: "right" });
    }

    // --- RETORNO ---
    const pdfArrayBuffer = doc.output('arraybuffer');

    return new Response(pdfArrayBuffer, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Planejamento_Diario_${planning.data || 'registro'}.pdf"`
      },
      status: 200,
    });

  } catch (err) {
    console.error("Erro na Edge Function generate-daily-planning-pdf:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

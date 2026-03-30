import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Mapeamento amigável de nomes de tabelas para títulos de módulos
const moduleTitles: Record<string, string> = {
  'planejamento_diario': 'Planejamento Diário',
  'planejamento_semanal': 'Planejamento Semanal',
  'planejamento_mensal': 'Planejamento Mensal',
  'relatorios': 'Relatório Individual',
  'diario_reflexoes': 'Diário de Reflexões',
  'portfolio_digital': 'Portfólio Digital',
  'avaliacoes_alunos': 'Avaliações de Alunos'
};

// Campos que devem ser exibidos na seção "Informações Básicas" (campos curtos)
const basicInfoFields = [
  'titulo', 'titulo_registro', 'data', 'data_ref', 'aluno_nome', 
  'componente', 'componente_curricular', 'componentes_curriculares',
  'periodo', 'periodo_default', 'turno', 'professor_name', 'mes', 'ano',
  'presenca', 'tipo'
];

// Campos técnicos que devem ser ignorados na listagem direta
const ignoreFields = ['id', 'professor_id', 'created_at', 'updated_at', 'aluno_id'];

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tableName, id } = await req.json();
    
    if (!tableName || !id) {
      return new Response(JSON.stringify({ error: "Parâmetros 'tableName' e 'id' são obrigatórios." }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 400 
      });
    }

    const supabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Buscar o registro dinamicamente
    const { data: record, error: fetchError } = await supabaseClient
      .from(tableName)
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError || !record) {
      console.error(`Erro ao buscar registro na tabela ${tableName}:`, fetchError);
      return new Response(JSON.stringify({ error: "Registro não encontrado." }), { 
        headers: { ...corsHeaders, "Content-Type": "application/json" }, 
        status: 404 
      });
    }

    // 2. Gerar o PDF
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.width;
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let y = 0;

    // --- CABEÇALHO ---
    const titleHeader = moduleTitles[tableName] || tableName.replace(/_/g, ' ').toUpperCase();
    doc.setFillColor(0, 168, 89); // Verde Institucional EduTec
    doc.rect(0, 0, pageWidth, 40, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("EduTecProfessor", pageWidth / 2, 20, { align: "center" });
    doc.setFontSize(14);
    doc.setFont("helvetica", "normal");
    doc.text(titleHeader, pageWidth / 2, 30, { align: "center" });

    // Separar campos por categoria
    const basicInfo: [string, string][] = [];
    const contentBlocks: [string, string][] = [];
    const otherFields: [string, any][] = [];

    Object.keys(record).forEach(key => {
      if (ignoreFields.includes(key)) return;
      
      const value = record[key];
      if (value === null || value === undefined) return;

      const label = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());

      // Classificar campos
      if (basicInfoFields.includes(key) && (typeof value === 'string' || typeof value === 'number')) {
        let formattedValue = String(value);
        if (key.includes('data')) {
            try { formattedValue = new Date(formattedValue).toLocaleDateString('pt-BR'); } catch (e) {}
        }
        basicInfo.push([label, formattedValue]);
      } else if (typeof value === 'string' && value.length > 50) {
        contentBlocks.push([label, value]);
      } else {
        otherFields.push([label, value]);
      }
    });

    // --- INFORMAÇÕES BÁSICAS ---
    y = 55;
    if (basicInfo.length > 0) {
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.text("INFORMAÇÕES BÁSICAS", margin, y);
      y += 2;
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;

      basicInfo.forEach(([label, value]) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont("helvetica", "bold");
        doc.text(label + ":", margin, y);
        doc.setFont("helvetica", "normal");
        doc.text(value, margin + 50, y);
        y += 7;
      });
      y += 10;
    }

    // --- CONTEÚDO (Textos Longos) ---
    contentBlocks.forEach(([label, content]) => {
      if (y > 230) { doc.addPage(); y = 30; }
      
      doc.setFillColor(241, 245, 249);
      doc.rect(margin, y, contentWidth, 10, 'F');
      doc.setTextColor(51, 65, 85);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(label.toUpperCase(), margin + 5, y + 7);
      y += 15;

      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      const splitText = doc.splitTextToSize(content, contentWidth - 10);
      doc.text(splitText, margin + 5, y);
      y += (splitText.length * 5.5) + 15;
    });

    // --- OUTROS CAMPOS (BNCC, JSON, ETC) ---
    otherFields.forEach(([label, value]) => {
        if (y > 240) { doc.addPage(); y = 30; }

        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.text(label + ":", margin, y);
        y += 6;

        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        let displayValue = "";
        
        if (Array.isArray(value)) {
            displayValue = value.join(", ");
        } else if (typeof value === 'object') {
            displayValue = JSON.stringify(value, null, 2);
        } else {
            displayValue = String(value);
        }

        const splitOther = doc.splitTextToSize(displayValue, contentWidth);
        doc.text(splitOther, margin, y);
        y += (splitOther.length * 4.5) + 8;
    });

    // --- RODAPÉ ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text("PDF gerado automaticamente pelo sistema EduTecProfessor", pageWidth / 2, 285, { align: "center" });
      doc.text(`Página ${i} de ${totalPages}`, pageWidth - margin, 285, { align: "right" });
    }

    // --- RETORNO BINÁRIO ---
    const pdfArrayBuffer = doc.output('arraybuffer');

    return new Response(pdfArrayBuffer, {
      headers: { 
        ...corsHeaders, 
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="Export_${tableName}_${id}.pdf"`
      },
      status: 200,
    });

  } catch (err) {
    console.error("Erro na Edge Function:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

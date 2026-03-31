import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ==================================================
// CAMPOS EM PAR: renderizados em 2 colunas lado a lado
// Demais campos: renderizados em bloco full-width
// ==================================================
const MODULE_CONFIG: Record<string, {
  title: string;
  pairFields: Array<[{ key: string; label: string; type?: string }, { key: string; label: string; type?: string }]>;
  sections: Array<{ heading: string; fields: Array<{ key: string; label: string; type?: string }> }>;
}> = {
  planejamento_diario: {
    title: "Planejamento Diario",
    pairFields: [
      [{ key: "titulo_registro", label: "Titulo do Registro" }, { key: "data", label: "Data", type: "date" }],
      [{ key: "professor_nome", label: "Professor(a)" }, { key: "aluno_nome", label: "Aluno" }],
      [{ key: "componente", label: "Componente Curricular" }, { key: "periodo", label: "Periodo" }],
    ],
    sections: [
      { heading: "Conteudo Pedagogico", fields: [
        { key: "objetivos", label: "Objetivos da Aula" },
        { key: "conteudo", label: "Conteudo / Atividades Planejadas" },
      ]},
      { heading: "Recursos e Avaliacao", fields: [
        { key: "recursos", label: "Recursos Didaticos" },
        { key: "avaliacao", label: "Avaliacao / Observacoes" },
      ]},
      { heading: "Codigos BNCC Selecionados", fields: [
        { key: "bncc_codes", label: "Codigos", type: "array" },
      ]},
    ]
  },

  planejamento_semanal: {
    title: "Planejamento Semanal",
    pairFields: [
      [{ key: "titulo_registro", label: "Titulo do Registro" }, { key: "data_ref", label: "Data", type: "date" }],
      [{ key: "professor_name", label: "Professor(a)" },        { key: "aluno_nome", label: "Aluno" }],
      [{ key: "componentes_curriculares", label: "Componente Curricular" }, { key: "preset_default_ref", label: "Periodo" }],
    ],
    sections: [
      { heading: "Conteudo da Semana", fields: [
        { key: "objetivo_aprendizagem", label: "Objetivos de Aprendizagem" }, 
        { key: "atividade", label: "Atividades Planejadas" }, 
        { key: "recursos_didaticos", label: "Recursos Didaticos" },
        { key: "avaliacao_acompanhamento", label: "Avaliacao e Acompanhamento" },
        { key: "observacoes_adicionais", label: "Observacoes Adicionais" },
      ]},
      { heading: "Codigos BNCC", fields: [
        { key: "bncc_code_text", label: "Codigo BNCC (Escrita Livre)" },
        { key: "bncc_codes", label: "Codigos Selecionados", type: "array" },
      ]},
      { heading: "Grade Semanal Detalhada", fields: [
        { key: "grade_semanal_json", label: "Grade", type: "grade" },
      ]},
    ]
  },

  planejamento_mensal: {
    title: "Planejamento Mensal",
    pairFields: [
      [{ key: "titulo_registro", label: "Titulo do Registro" }, { key: "data_ref", label: "Data", type: "date" }],
      [{ key: "mes", label: "Mes" },                           { key: "ano", label: "Ano" }],
      [{ key: "aluno_nome", label: "Aluno" },                  { key: "componente_curricular", label: "Componente Curricular" }],
    ],
    sections: [
      { heading: "Conteudo do Mes", fields: [
        { key: "objetivos", label: "Objetivos de Aprendizagem" },
        { key: "atividades", label: "Atividades Planejadas" },
      ]},
      { heading: "Recursos e Avaliacao", fields: [
        { key: "recursos", label: "Recursos Didaticos" },
        { key: "avaliacao", label: "Avaliacao e Acompanhamento" },
        { key: "observacoes", label: "Observacoes Adicionais" },
      ]},
      { heading: "Codigos BNCC", fields: [
        { key: "bncc_code_text", label: "Codigo BNCC (Escrita Livre)" },
        { key: "bncc_codes", label: "Codigos Selecionados", type: "array" },
      ]},
    ]
  },

  relatorios: {
    title: "Relatorio Individual",
    pairFields: [
      [{ key: "tipo", label: "Tipo de Relatorio" }, { key: "aluno_nome", label: "Aluno" }],
    ],
    sections: [
      { heading: "Conteudo do Relatorio", fields: [
        { key: "conteudo", label: "Conteudo" },
      ]},
    ]
  },

  diario_reflexoes: {
    title: "Diario de Reflexoes",
    pairFields: [
      [{ key: "titulo", label: "Titulo" }, { key: "data", label: "Data", type: "date" }],
    ],
    sections: [
      { heading: "Reflexoes e Percepcoes", fields: [
        { key: "percepcoes", label: "Percepcoes" },
      ]},
    ]
  },

  portfolio_digital: {
    title: "Portfolio Digital",
    pairFields: [
      [{ key: "titulo_registro", label: "Titulo" }, { key: "data_ref", label: "Data", type: "date" }],
    ],
    sections: [
      { heading: "Descricao", fields: [
        { key: "descricao", label: "Descricao" },
      ]},
    ]
  },
};

// ==============================
// UTILIDADES
// ==============================
function fmtDate(v: string): string {
  try { const d = new Date(v); return isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' }); } catch { return v; }
}

function rawToStr(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
}

// ==============================
// BLOCO: PAR DE CAMPOS (2 colunas)
// ==============================
function drawInfoGrid(
  doc: jsPDF,
  pairs: Array<[{ key: string; label: string; type?: string }, { key: string; label: string; type?: string }]>,
  rec: Record<string, unknown>,
  yRef: { y: number }
) {
  const COL_W = 84;   // largura de cada coluna
  const COL1_X = 15;
  const COL2_X = 111; // 15 + 84 + 12 de gutter
  const PAGE_H = 282;

  // Cabecalho da secao Informacoes Basicas
  doc.setFillColor(240, 249, 244);
  doc.rect(15, yRef.y - 5, 180, 11, 'F');
  doc.setDrawColor(0, 168, 89);
  doc.line(15, yRef.y - 5, 15, yRef.y + 6);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 100, 0);
  doc.text("INFORMACOES BASICAS", 20, yRef.y + 1.5);
  yRef.y += 14;

  pairs.forEach(([left, right]) => {
    const lv = left.type === 'date' ? fmtDate(rawToStr(rec[left.key])) : rawToStr(rec[left.key]);
    const rv = right.type === 'date' ? fmtDate(rawToStr(rec[right.key])) : rawToStr(rec[right.key]);
    if (!lv && !rv) return;

    if (yRef.y > PAGE_H - 14) { doc.addPage(); yRef.y = 25; }

    // Linha de fundo
    doc.setFillColor(250, 250, 250);
    doc.rect(15, yRef.y - 4, 180, 13, 'F');
    doc.setDrawColor(230, 230, 230);
    doc.rect(15, yRef.y - 4, 180, 13); // borda externa
    doc.line(COL2_X - 6, yRef.y - 4, COL2_X - 6, yRef.y + 9); // divisor central

    // Coluna esquerda
    if (lv) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(left.label + ":", COL1_X + 2, yRef.y + 0.5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
      const ls = doc.splitTextToSize(lv, COL_W - 4);
      doc.text(ls[0], COL1_X + 2, yRef.y + 6.5);
    }
    // Coluna direita
    if (rv) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(100, 100, 100);
      doc.text(right.label + ":", COL2_X, yRef.y + 0.5);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
      const rs = doc.splitTextToSize(rv, COL_W - 4);
      doc.text(rs[0], COL2_X, yRef.y + 6.5);
    }
    yRef.y += 15;
  });
  yRef.y += 6;
}

// ==============================
// BLOCO: CAMPO TEXTO LONGO (full-width)
// ==============================
function drawField(doc: jsPDF, label: string, value: string, yRef: { y: number }) {
  if (!value || value.trim() === '' || value === '[]') return;
  if (yRef.y > 272) { doc.addPage(); yRef.y = 25; }

  doc.setFont("helvetica", "bold"); doc.setFontSize(9); doc.setTextColor(80, 80, 80);
  doc.text(label + ":", 20, yRef.y);
  yRef.y += 6;

  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(25, 25, 25);
  const lines = doc.splitTextToSize(value, 170);
  lines.forEach((line: string) => {
    if (yRef.y > 281) { doc.addPage(); yRef.y = 25; }
    doc.text(line, 20, yRef.y);
    yRef.y += 5.5;
  });
  yRef.y += 5;
}

// ==============================
// BLOCO: HEADING DE SECAO
// ==============================
function drawHeading(doc: jsPDF, text: string, yRef: { y: number }) {
  if (yRef.y > 272) { doc.addPage(); yRef.y = 25; }
  doc.setFillColor(240, 249, 244);
  doc.rect(15, yRef.y - 5, 180, 11, 'F');
  doc.setDrawColor(0, 168, 89);
  doc.line(15, yRef.y - 5, 15, yRef.y + 6);
  doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(0, 100, 0);
  doc.text(text.toUpperCase(), 20, yRef.y + 1.5);
  yRef.y += 14;
}

// ==============================
// GRADE SEMANAL (tabela completa)
// ==============================
function renderGradeTable(doc: jsPDF, grade: Record<string, unknown>, yRef: { y: number }) {
  const DIA_ORDER = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];
  // 8 colunas, total = 180mm
  const COLS = [
    { key: 'turno',                 label: 'Turno',          w: 16 },
    { key: 'horario',               label: 'Horario',        w: 16 },
    { key: 'componenteCurricular',  label: 'Disciplina',     w: 26, fb: 'campoExperiencia' },
    { key: 'bncc_code_text',        label: 'BNCC',           w: 18 },
    { key: 'atividade',             label: 'Atividade',      w: 24 },
    { key: 'objetivo_aprendizagem', label: 'Objetivo',       w: 24 },
    { key: 'acompanhamento',        label: 'Acompanhamento', w: 28 },
    { key: 'observacoes',           label: 'Observacoes',    w: 28 },
  ];

  const dias = Object.keys(grade).sort((a, b) => {
    const norm = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const ai = DIA_ORDER.findIndex(d => norm(a).startsWith(d));
    const bi = DIA_ORDER.findIndex(d => norm(b).startsWith(d));
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
  });

  dias.forEach(dia => {
    const info = grade[dia] as Record<string, unknown>;
    if (!info || typeof info !== 'object') return;
    const has = Object.entries(info).some(([k, v]) => k !== 'bnccCodes' && v && v !== '' && !(Array.isArray(v) && v.length === 0));
    if (!has) return;

    if (yRef.y > 265) { doc.addPage(); yRef.y = 25; }

    // Barra do dia
    doc.setFillColor(0, 140, 70); doc.rect(15, yRef.y - 4, 180, 8, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(dia, 18, yRef.y + 1.5); yRef.y += 11;

    // Cabecalho colunas
    let x = 15;
    doc.setFillColor(232, 248, 240); doc.rect(15, yRef.y - 3.5, 180, 7, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(40, 40, 40);
    COLS.forEach(col => { doc.text(col.label, x + 1, yRef.y + 0.5); x += col.w; });
    yRef.y += 7.5;

    // Dados
    if (yRef.y > 270) { doc.addPage(); yRef.y = 25; }
    x = 15;
    doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.setTextColor(25, 25, 25);
    let maxL = 1;
    const cells: string[][] = [];
    COLS.forEach(col => {
      const fb = (col as { fb?: string }).fb;
      let val: unknown = fb ? (info[fb] || info[col.key]) : info[col.key];
      if (typeof val === 'object') val = JSON.stringify(val);
      const split = doc.splitTextToSize(String(val ?? ''), col.w - 2);
      cells.push(split);
      if (split.length > maxL) maxL = split.length;
    });

    const rH = maxL * 4.2 + 5;
    if (yRef.y + rH > 282) { doc.addPage(); yRef.y = 25; }
    doc.setFillColor(254, 254, 254); doc.rect(15, yRef.y - 2, 180, rH, 'F');
    doc.setDrawColor(210, 210, 210); doc.rect(15, yRef.y - 2, 180, rH);
    x = 15;
    COLS.forEach((col, i) => {
      doc.text(cells[i], x + 1, yRef.y + 2.5);
      if (i < COLS.length - 1) { doc.setDrawColor(210, 210, 210); doc.line(x + col.w, yRef.y - 2, x + col.w, yRef.y - 2 + rH); }
      x += col.w;
    });
    yRef.y += rH + 4;
  });
}

// ==============================
// HANDLER PRINCIPAL
// ==============================
serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const { tableName, id } = await req.json();
    const sc = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const { data: rec, error } = await sc.from(tableName).select('*').eq('id', id).single();
    if (error || !rec) return new Response("Nao encontrado", { status: 404 });

    const cfg = MODULE_CONFIG[tableName];
    const moduleTitle = cfg?.title || tableName.replace(/_/g, ' ');
    const doc = new jsPDF();
    const PW = doc.internal.pageSize.width;

    // ───── CABECALHO ─────
    doc.setFillColor(0, 168, 89); doc.rect(0, 0, PW, 48, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold"); doc.setFontSize(24);
    doc.text("EduTecProfessor", PW / 2, 22, { align: "center" });
    doc.setFontSize(13); doc.setFont("helvetica", "normal");
    doc.text(moduleTitle, PW / 2, 34, { align: "center" });
    doc.setFontSize(8); doc.setTextColor(200, 255, 200);
    doc.text("Gerado em: " + new Date().toLocaleDateString('pt-BR'), PW - 18, 44, { align: "right" });

    const yRef = { y: 62 };

    if (cfg) {
      // INFORMACOES BASICAS em duas colunas
      const hasPairs = cfg.pairFields.some(([l, r]) => rec[l.key] || rec[r.key]);
      if (hasPairs) drawInfoGrid(doc, cfg.pairFields, rec, yRef);

      // SECOES de conteudo
      for (const sec of cfg.sections) {
        const hasData = sec.fields.some(f => {
          const v = rec[f.key];
          if (v === null || v === undefined) return false;
          if (Array.isArray(v) && v.length === 0) return false;
          if (typeof v === 'string' && v.trim() === '') return false;
          return true;
        });
        if (!hasData) continue;

        // Nao mostrar heading para grade (ja tem cabecalho proprio)
        if (!(sec.fields.length === 1 && sec.fields[0].type === 'grade')) {
          drawHeading(doc, sec.heading, yRef);
        }

        for (const f of sec.fields) {
          const raw = rec[f.key];
          if (raw === null || raw === undefined) continue;

          if (f.type === 'grade') {
            let g = raw;
            if (typeof g === 'string') { try { g = JSON.parse(g); } catch(_) {} }
            if (g && typeof g === 'object' && !Array.isArray(g) && Object.keys(g).length > 0) {
              drawHeading(doc, "Grade Semanal Detalhada", yRef);
              renderGradeTable(doc, g as Record<string, unknown>, yRef);
            }
            continue;
          }

          if (f.type === 'array') {
            let arr = raw;
            if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch(_) {} }
            if (!Array.isArray(arr) || arr.length === 0) continue;
            drawField(doc, f.label, arr.join(', '), yRef);
            continue;
          }

          const txt = f.type === 'date' ? fmtDate(rawToStr(raw)) : rawToStr(raw);
          drawField(doc, f.label, txt, yRef);
        }
        yRef.y += 4;
      }
    } else {
      // Fallback generico
      const skip = new Set(['id', 'professor_id', 'created_at', 'updated_at', 'aluno_id', 'bncc_code_id']);
      for (const [k, v] of Object.entries(rec)) {
        if (skip.has(k) || !v) continue;
        drawField(doc, k.replace(/_/g, ' ').toUpperCase(), rawToStr(v), yRef);
      }
    }

    // ───── RODAPE ─────
    const tot = doc.internal.getNumberOfPages();
    for (let i = 1; i <= tot; i++) {
      doc.setPage(i);
      doc.setDrawColor(0, 168, 89); doc.line(15, 285, PW - 15, 285);
      doc.setFontSize(8); doc.setTextColor(130);
      doc.text("PDF gerado automaticamente pelo sistema EduTecProfessor", PW / 2, 290, { align: "center" });
      doc.text(`Pagina ${i} de ${tot}`, PW - 15, 290, { align: "right" });
    }

    return new Response(doc.output('arraybuffer'), {
      headers: { ...corsHeaders, 'Content-Type': 'application/pdf' },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

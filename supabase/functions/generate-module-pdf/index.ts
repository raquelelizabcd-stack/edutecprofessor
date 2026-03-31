import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_ANON_KEY") ?? "";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ============================================================
// CONFIGURAÇÃO DOS MÓDULOS
// Validado contra o schema atual do Supabase (2026-03-31)
// Colunas verificadas em cada tabela antes de incluir aqui.
// ============================================================
type FieldDef = { key: string; label: string; type?: 'date' | 'array' | 'grade' | 'number' };
type PairRow  = [FieldDef, FieldDef];

interface ModuleConfig {
  title: string;
  pairFields: PairRow[];
  sections: Array<{ heading: string; fields: FieldDef[] }>;
}

const MODULE_CONFIG: Record<string, ModuleConfig> = {
  // ─────────────────────────────────────────────────────────
  // planejamento_diario
  // Colunas: id, data, componente, objetivos, conteudo,
  //          recursos, avaliacao, professor_id, created_at,
  //          aluno_id, professor_nome, bncc_code_text,
  //          bncc_codes, aluno_nome, titulo_registro, periodo
  // ─────────────────────────────────────────────────────────
  planejamento_diario: {
    title: "Planejamento Diario",
    pairFields: [
      [{ key: "titulo_registro", label: "Titulo do Registro" }, { key: "data",      label: "Data",      type: "date" }],
      [{ key: "professor_nome",  label: "Professor(a)"       }, { key: "aluno_nome",label: "Aluno"                  }],
      [{ key: "componente",      label: "Componente Curricular" }, { key: "periodo", label: "Periodo"              }],
    ],
    sections: [
      { heading: "Conteudo Pedagogico", fields: [
        { key: "objetivos", label: "Objetivos da Aula" },
        { key: "conteudo",  label: "Conteudo / Atividades Planejadas" },
      ]},
      { heading: "Recursos e Avaliacao", fields: [
        { key: "recursos",  label: "Recursos Didaticos" },
        { key: "avaliacao", label: "Avaliacao / Observacoes" },
      ]},
      { heading: "Codigos BNCC", fields: [
        { key: "bncc_code_text", label: "Codigo BNCC (Livre)" },
        { key: "bncc_codes",     label: "Codigos Selecionados", type: "array" },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────
  // planejamento_semanal
  // Colunas: id, atividade, objetivo_aprendizagem, created_at,
  //          professor_id, data_ref, professor_name,
  //          componentes_curriculares, preset_default_ref,
  //          recursos_didaticos, avaliacao_acompanhamento,
  //          observacoes_adicionais, bncc_codes, bncc_code_text,
  //          titulo_registro, aluno_nome, grade_semanal_json
  // ─────────────────────────────────────────────────────────
  planejamento_semanal: {
    title: "Planejamento Semanal",
    pairFields: [
      [{ key: "titulo_registro",         label: "Titulo do Registro"    }, { key: "data_ref",         label: "Data de Referencia", type: "date" }],
      [{ key: "professor_name",          label: "Professor(a)"          }, { key: "aluno_nome",        label: "Aluno"                            }],
      [{ key: "componentes_curriculares",label: "Componente Curricular" }, { key: "preset_default_ref",label: "Periodo"                          }],
    ],
    sections: [
      { heading: "Conteudo da Semana", fields: [
        { key: "objetivo_aprendizagem",   label: "Objetivos de Aprendizagem" },
        { key: "atividade",               label: "Atividades Planejadas"     },
        { key: "recursos_didaticos",      label: "Recursos Didaticos"        },
        { key: "avaliacao_acompanhamento",label: "Avaliacao e Acompanhamento"},
        { key: "observacoes_adicionais",  label: "Observacoes Adicionais"    },
      ]},
      { heading: "Codigos BNCC", fields: [
        { key: "bncc_code_text", label: "Codigo BNCC (Livre)" },
        { key: "bncc_codes",     label: "Codigos Selecionados", type: "array" },
      ]},
      { heading: "Grade Semanal Detalhada", fields: [
        { key: "grade_semanal_json", label: "Grade", type: "grade" },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────
  // planejamento_mensal
  // Colunas: id, mes, ano, componente_curricular, objetivos,
  //          atividades, recursos, avaliacao, observacoes,
  //          professor_id, aluno_id, created_at, data_ref,
  //          titulo_registro, bncc_code_text, bncc_codes,
  //          aluno_nome, professor_nome, periodo
  // ─────────────────────────────────────────────────────────
  planejamento_mensal: {
    title: "Planejamento Mensal",
    pairFields: [
      [{ key: "titulo_registro",      label: "Titulo do Registro"    }, { key: "data_ref",           label: "Data de Referencia", type: "date" }],
      [{ key: "professor_nome",       label: "Professor(a)"          }, { key: "aluno_nome",          label: "Aluno"                            }],
      [{ key: "componente_curricular",label: "Componente Curricular" }, { key: "periodo",             label: "Periodo"                          }],
      [{ key: "mes",                  label: "Mes"                   }, { key: "ano",                 label: "Ano",               type: "number"}],
    ],
    sections: [
      { heading: "Conteudo do Mes", fields: [
        { key: "objetivos",  label: "Objetivos de Aprendizagem" },
        { key: "atividades", label: "Atividades Planejadas"     },
      ]},
      { heading: "Recursos e Avaliacao", fields: [
        { key: "recursos",   label: "Recursos Didaticos"         },
        { key: "avaliacao",  label: "Avaliacao e Acompanhamento" },
        { key: "observacoes",label: "Observacoes Adicionais"     },
      ]},
      { heading: "Codigos BNCC", fields: [
        { key: "bncc_code_text", label: "Codigo BNCC (Livre)" },
        { key: "bncc_codes",     label: "Codigos Selecionados", type: "array" },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────
  // relatorios
  // Colunas: id, aluno_id, tipo, conteudo, created_at
  // ─────────────────────────────────────────────────────────
  relatorios: {
    title: "Relatorio Individual",
    pairFields: [
      [{ key: "tipo",      label: "Tipo de Relatorio" }, { key: "created_at", label: "Data de Criacao", type: "date" }],
    ],
    sections: [
      { heading: "Conteudo do Relatorio", fields: [
        { key: "conteudo", label: "Conteudo" },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────
  // diario_reflexoes
  // Colunas: id, professor_id, aluno_id, titulo, data, percepcoes, created_at
  // ─────────────────────────────────────────────────────────
  diario_reflexoes: {
    title: "Diario de Reflexoes",
    pairFields: [
      [{ key: "titulo", label: "Titulo" }, { key: "data", label: "Data", type: "date" }],
    ],
    sections: [
      { heading: "Reflexoes e Percepcoes", fields: [
        { key: "percepcoes", label: "Percepcoes e Reflexoes" },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────
  // portfolio_digital
  // Colunas: id, professor_id, aluno_id, titulo_registro, data_ref, descricao, created_at
  // ─────────────────────────────────────────────────────────
  portfolio_digital: {
    title: "Portfolio Digital",
    pairFields: [
      [{ key: "titulo_registro", label: "Titulo" }, { key: "data_ref", label: "Data", type: "date" }],
    ],
    sections: [
      { heading: "Descricao", fields: [
        { key: "descricao", label: "Descricao do Registro" },
      ]},
    ],
  },
};

// ============================================================
// UTILITÁRIOS
// ============================================================
function fmtDate(v: string): string {
  try {
    if (!v) return '';
    const d = new Date(v);
    return isNaN(d.getTime()) ? v : d.toLocaleDateString('pt-BR', { timeZone: 'UTC' });
  } catch { return v; }
}

function rawToStr(raw: unknown): string {
  if (raw === null || raw === undefined) return '';
  if (typeof raw === 'object') return JSON.stringify(raw);
  return String(raw);
}

function hasValue(v: unknown): boolean {
  if (v === null || v === undefined) return false;
  if (typeof v === 'string' && v.trim() === '') return false;
  if (typeof v === 'string' && v === '[]') return false;
  if (Array.isArray(v) && v.length === 0) return false;
  return true;
}

// ============================================================
// LAYOUT: CABEÇALHO DO DOCUMENTO
// ============================================================
function drawHeader(doc: jsPDF, moduleTitle: string) {
  const PW = doc.internal.pageSize.width;
  // Faixa verde principal
  doc.setFillColor(0, 148, 74);
  doc.rect(0, 0, PW, 50, 'F');
  // Faixa verde mais escura na parte inferior do cabeçalho
  doc.setFillColor(0, 110, 55);
  doc.rect(0, 40, PW, 10, 'F');

  // Logo / título sistema
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("EduTecProfessor", PW / 2, 20, { align: "center" });

  // Nome do módulo
  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(moduleTitle.toUpperCase(), PW / 2, 32, { align: "center" });

  // Data de geração
  doc.setFontSize(7.5);
  doc.setTextColor(200, 255, 220);
  doc.text("Gerado em: " + new Date().toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' }), PW - 14, 45, { align: "right" });
}

// ============================================================
// LAYOUT: INFORMAÇÕES BÁSICAS (2 colunas)
// ============================================================
function drawInfoGrid(
  doc: jsPDF,
  pairs: PairRow[],
  rec: Record<string, unknown>,
  yRef: { y: number }
) {
  const COL_W  = 84;
  const COL1_X = 15;
  const COL2_X = 111;
  const PAGE_H = 280;

  // Cabeçalho da seção
  doc.setFillColor(230, 247, 238);
  doc.rect(15, yRef.y - 5, 180, 11, 'F');
  doc.setDrawColor(0, 148, 74);
  doc.setLineWidth(0.6);
  doc.line(15, yRef.y - 5, 15, yRef.y + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 90, 45);
  doc.text("INFORMACOES BASICAS", 20, yRef.y + 1.5);
  yRef.y += 15;

  pairs.forEach(([left, right]) => {
    let lv = rawToStr(rec[left.key]);
    let rv = rawToStr(rec[right.key]);
    if (left.type === 'date')   lv = fmtDate(lv);
    if (right.type === 'date')  rv = fmtDate(rv);
    if (left.type === 'number'  && lv) lv = String(Number(lv));
    if (right.type === 'number' && rv) rv = String(Number(rv));
    if (!lv && !rv) return;

    if (yRef.y > PAGE_H - 14) { doc.addPage(); yRef.y = 25; }

    // Fundo + bordas
    doc.setFillColor(252, 252, 252);
    doc.rect(15, yRef.y - 4, 180, 14, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.rect(15, yRef.y - 4, 180, 14);
    doc.line(COL2_X - 6, yRef.y - 4, COL2_X - 6, yRef.y + 10);

    // Coluna esquerda
    if (lv) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
      doc.text(left.label + ":", COL1_X + 3, yRef.y + 1);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
      const ls = doc.splitTextToSize(lv, COL_W - 5);
      doc.text(ls[0] ?? '', COL1_X + 3, yRef.y + 7.5);
    }
    // Coluna direita
    if (rv) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
      doc.text(right.label + ":", COL2_X + 1, yRef.y + 1);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
      const rs = doc.splitTextToSize(rv, COL_W - 5);
      doc.text(rs[0] ?? '', COL2_X + 1, yRef.y + 7.5);
    }
    yRef.y += 16;
  });
  yRef.y += 6;
}

// ============================================================
// LAYOUT: HEADING DE SEÇÃO
// ============================================================
function drawHeading(doc: jsPDF, text: string, yRef: { y: number }) {
  if (yRef.y > 272) { doc.addPage(); yRef.y = 25; }
  doc.setFillColor(230, 247, 238);
  doc.rect(15, yRef.y - 5, 180, 11, 'F');
  doc.setDrawColor(0, 148, 74);
  doc.setLineWidth(0.6);
  doc.line(15, yRef.y - 5, 15, yRef.y + 6);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(0, 90, 45);
  doc.text(text.toUpperCase(), 20, yRef.y + 1.5);
  yRef.y += 14;
}

// ============================================================
// LAYOUT: CAMPO DE TEXTO LONGO (full-width)
// ============================================================
function drawField(doc: jsPDF, label: string, value: string, yRef: { y: number }) {
  if (!value || value.trim() === '' || value === '[]') return;
  if (yRef.y > 272) { doc.addPage(); yRef.y = 25; }

  doc.setFont("helvetica", "bold"); doc.setFontSize(8.5); doc.setTextColor(80, 80, 80);
  doc.text(label + ":", 20, yRef.y);
  yRef.y += 5.5;

  doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(25, 25, 25);
  const lines = doc.splitTextToSize(value, 168);
  lines.forEach((line: string) => {
    if (yRef.y > 280) { doc.addPage(); yRef.y = 25; }
    doc.text(line, 20, yRef.y);
    yRef.y += 5.5;
  });
  yRef.y += 5;
}

// ============================================================
// LAYOUT: GRADE SEMANAL (tabela dinâmica)
// ============================================================
function renderGradeTable(doc: jsPDF, grade: Record<string, unknown>, yRef: { y: number }) {
  const DIA_ORDER = ['segunda', 'terca', 'quarta', 'quinta', 'sexta'];

  const COLS: Array<{ key: string; label: string; w: number; fb?: string }> = [
    { key: 'turno',                  label: 'Turno',        w: 16 },
    { key: 'horario',                label: 'Horario',      w: 16 },
    { key: 'componenteCurricular',   label: 'Disciplina',   w: 26, fb: 'campoExperiencia' },
    { key: 'bncc_code_text',         label: 'BNCC',         w: 20 },
    { key: 'atividade',              label: 'Atividade',    w: 26 },
    { key: 'objetivo_aprendizagem',  label: 'Objetivo',     w: 26 },
    { key: 'acompanhamento',         label: 'Acomp.',       w: 26 },
    { key: 'observacoes',            label: 'Obs.',         w: 24 },
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
    const hasContent = Object.entries(info).some(([k, v]) =>
      k !== 'bnccCodes' && hasValue(v)
    );
    if (!hasContent) return;

    if (yRef.y > 265) { doc.addPage(); yRef.y = 25; }

    // Barra do dia
    doc.setFillColor(0, 128, 64);
    doc.rect(15, yRef.y - 4, 180, 8, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(dia, 18, yRef.y + 1.5);
    yRef.y += 11;

    // Cabeçalho de colunas
    let x = 15;
    doc.setFillColor(218, 244, 232);
    doc.rect(15, yRef.y - 3.5, 180, 7, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(30, 30, 30);
    COLS.forEach(col => { doc.text(col.label, x + 1.5, yRef.y + 0.5); x += col.w; });
    yRef.y += 8;

    // Dados
    if (yRef.y > 272) { doc.addPage(); yRef.y = 25; }
    const cells: string[][] = [];
    let maxL = 1;
    COLS.forEach(col => {
      let val: unknown = col.fb ? (info[col.fb] || info[col.key]) : info[col.key];
      if (Array.isArray(val)) val = (val as string[]).join(', ');
      if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
      const split = doc.splitTextToSize(String(val ?? ''), col.w - 2);
      cells.push(split);
      if (split.length > maxL) maxL = split.length;
    });

    const rH = maxL * 4.5 + 5;
    if (yRef.y + rH > 283) { doc.addPage(); yRef.y = 25; }
    doc.setFillColor(253, 253, 253);
    doc.rect(15, yRef.y - 2, 180, rH, 'F');
    doc.setDrawColor(210, 210, 210); doc.setLineWidth(0.25);
    doc.rect(15, yRef.y - 2, 180, rH);
    x = 15;
    doc.setFont("helvetica", "normal"); doc.setFontSize(7.5); doc.setTextColor(30, 30, 30);
    COLS.forEach((col, i) => {
      doc.text(cells[i], x + 1.5, yRef.y + 2.5);
      if (i < COLS.length - 1) {
        doc.setDrawColor(210, 210, 210);
        doc.line(x + col.w, yRef.y - 2, x + col.w, yRef.y - 2 + rH);
      }
      x += col.w;
    });
    yRef.y += rH + 4;
  });
}

// ============================================================
// LAYOUT: RODAPÉ
// ============================================================
function drawFooters(doc: jsPDF) {
  const PW  = doc.internal.pageSize.width;
  const tot = doc.internal.getNumberOfPages();
  for (let i = 1; i <= tot; i++) {
    doc.setPage(i);
    doc.setDrawColor(0, 148, 74); doc.setLineWidth(0.5);
    doc.line(15, 285, PW - 15, 285);
    doc.setFontSize(8); doc.setFont("helvetica", "normal"); doc.setTextColor(140, 140, 140);
    doc.text("PDF gerado automaticamente pelo sistema EduTecProfessor", PW / 2, 290, { align: "center" });
    doc.text(`Pagina ${i} de ${tot}`, PW - 15, 290, { align: "right" });
  }
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const tableName: string = body.tableName;
    const id: string        = body.id;

    if (!tableName || !id) {
      return new Response(
        JSON.stringify({ error: "Parametros 'tableName' e 'id' sao obrigatorios." }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Usar service role key para garantir acesso sem RLS
    const sc = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: rec, error } = await sc.from(tableName).select('*').eq('id', id).single();

    if (error || !rec) {
      return new Response(
        JSON.stringify({ error: `Registro nao encontrado: ${error?.message}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const cfg         = MODULE_CONFIG[tableName];
    const moduleTitle = cfg?.title ?? tableName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    // ── MONTAR PDF ──
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    drawHeader(doc, moduleTitle);

    const yRef = { y: 62 };

    if (cfg) {
      // ── INFORMAÇÕES BÁSICAS (2 colunas) ──
      const hasPairsData = cfg.pairFields.some(([l, r]) => hasValue(rec[l.key]) || hasValue(rec[r.key]));
      if (hasPairsData) drawInfoGrid(doc, cfg.pairFields, rec, yRef);

      // ── SEÇÕES DE CONTEÚDO ──
      for (const sec of cfg.sections) {
        const hasData = sec.fields.some(f => hasValue(rec[f.key]));
        if (!hasData) continue;

        // Grade tem cabeçalho próprio — não duplicar
        const isGradeOnlySec = sec.fields.length === 1 && sec.fields[0].type === 'grade';
        if (!isGradeOnlySec) drawHeading(doc, sec.heading, yRef);

        for (const f of sec.fields) {
          const raw = rec[f.key];
          if (!hasValue(raw)) continue;

          // Tipo: grade semanal
          if (f.type === 'grade') {
            let g = raw;
            if (typeof g === 'string') { try { g = JSON.parse(g); } catch (_) {} }
            if (g && typeof g === 'object' && !Array.isArray(g) && Object.keys(g as object).length > 0) {
              drawHeading(doc, "Grade Semanal Detalhada", yRef);
              renderGradeTable(doc, g as Record<string, unknown>, yRef);
            }
            continue;
          }

          // Tipo: array de códigos
          if (f.type === 'array') {
            let arr = raw;
            if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch (_) {} }
            if (!Array.isArray(arr) || arr.length === 0) continue;
            drawField(doc, f.label, (arr as unknown[]).map(String).join(', '), yRef);
            continue;
          }

          // Tipo: data
          const txt = f.type === 'date' ? fmtDate(rawToStr(raw)) : rawToStr(raw);
          drawField(doc, f.label, txt, yRef);
        }
        yRef.y += 4;
      }

      // ── CAMPOS EXTRAS (presentes no banco mas não configurados explicitamente) ──
      const configuredKeys = new Set<string>([
        'id', 'professor_id', 'aluno_id', 'created_at', 'updated_at',
        ...cfg.pairFields.flatMap(([l, r]) => [l.key, r.key]),
        ...cfg.sections.flatMap(s => s.fields.map(f => f.key)),
      ]);
      const extraEntries = Object.entries(rec).filter(([k, v]) => !configuredKeys.has(k) && hasValue(v));
      if (extraEntries.length > 0) {
        drawHeading(doc, "Informacoes Complementares", yRef);
        for (const [k, v] of extraEntries) {
          const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
          drawField(doc, label, rawToStr(v), yRef);
        }
      }
    } else {
      // ── FALLBACK GENÉRICO (tabela não configurada) ──
      const skip = new Set(['id', 'professor_id', 'aluno_id', 'created_at', 'updated_at']);
      drawHeading(doc, "Dados do Registro", yRef);
      for (const [k, v] of Object.entries(rec)) {
        if (skip.has(k) || !hasValue(v)) continue;
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        drawField(doc, label, rawToStr(v), yRef);
      }
    }

    // ── RODAPÉ EM TODAS AS PÁGINAS ──
    drawFooters(doc);

    const pdfBuffer = doc.output('arraybuffer');
    return new Response(pdfBuffer, {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${tableName}_${id.slice(0, 8)}.pdf"`,
      },
    });

  } catch (err) {
    console.error("Erro ao gerar PDF:", err);
    return new Response(
      JSON.stringify({ error: (err as Error).message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

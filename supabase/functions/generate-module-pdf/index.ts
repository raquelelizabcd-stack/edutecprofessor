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
// Validado contra o schema atual do Supabase (2026-04-01)
// ============================================================
type FieldDef = { key: string; label: string; type?: 'date' | 'array' | 'grade' | 'number' };
type PairRow  = [FieldDef, FieldDef?];

interface ModuleConfig {
  title: string;
  pairFields: PairRow[];
  sections: Array<{ heading: string; fields: FieldDef[] }>;
}

// Campos comuns de cabeçalho para todos os planejamentos (Basic Info)
const COMMON_PAIRS: PairRow[] = [
  [{ key: "titulo_registro",      label: "Titulo do Registro"    }, { key: "data_ref",           label: "Data",             type: "date" }],
  [{ key: "professor_nome",       label: "Professor(a)"          }, { key: "aluno_nome",          label: "Aluno"                            }],
  [{ key: "componente_curricular",label: "Componente Curricular" }, { key: "periodo",             label: "Periodo"                          }],
  [{ key: "mes",                  label: "Mes"                   }, { key: "ano",                 label: "Ano",               type: "number"}],
];

const MODULE_CONFIG: Record<string, ModuleConfig> = {
  // ─────────────────────────────────────────────────────────
  // planejamento_diario
  // ─────────────────────────────────────────────────────────
  planejamento_diario: {
    title: "Planejamento Diário",
    pairFields: [
      [{ key: "titulo_registro", label: "Título"                  }, { key: "data",           label: "Data",             type: "date" }],
      [{ key: "professor_nome",  label: "Professor(a)"            }, { key: "aluno_nome",      label: "Aluno"                            }],
      [{ key: "componente",      label: "Componente Curricular"   }, { key: "periodo",         label: "Período"                          }],
      [{ key: "ano_serie",       label: "Ano / Série"             }],
    ],
    sections: [
      { heading: "Conteúdo Pedagógico", fields: [
        { key: "objetivos", label: "Objetivos da Aula" },
        { key: "conteudo",  label: "Conteúdo / Atividades Planejadas" },
      ]},
      { heading: "Recursos e Avaliação", fields: [
        { key: "recursos",  label: "Recursos Didáticos" },
        { key: "avaliacao", label: "Avaliação / Observações" },
      ]},
      { heading: "Códigos BNCC", fields: [
        { key: "bncc_code_text", label: "Código BNCC (Escrita Livre)" },
        { key: "bncc_codes",     label: "Códigos Selecionados (Base de Dados)", type: "array" },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────
  // planejamento_semanal
  // ─────────────────────────────────────────────────────────
  planejamento_semanal: {
    title: "Planejamento Semanal",
    pairFields: [
      [{ key: "titulo_registro",         label: "Titulo do Registro"    }, { key: "data_ref",         label: "Data de Referencia", type: "date" }],
      [{ key: "professor_nome",          label: "Professor(a)"          }, { key: "aluno_nome",        label: "Aluno"                            }],
      [{ key: "componentes_curriculares",label: "Componente Curricular" }, { key: "periodo",           label: "Periodo"                          }],
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
  // ─────────────────────────────────────────────────────────
  planejamento_mensal: {
    title: "Planejamento Mensal",
    pairFields: COMMON_PAIRS,
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
  // ─────────────────────────────────────────────────────────
  relatorios: {
    title: "Relatório Individual",
    pairFields: [
      [{ key: "titulo_registro",      label: "Título do Registro"    }, { key: "data_ref",           label: "Data",             type: "date" }],
      [{ key: "professor_nome",       label: "Professor(a)"          }, { key: "aluno_nome",          label: "Aluno"                            }],
      [{ key: "componente_curricular",label: "Componente Curricular" }, { key: "periodo",             label: "Período"                          }],
      [{ key: "tom_texto",            label: "Tom do Texto"          }, { key: "ano_serie",           label: "Ano / Série"                      }],
    ],
    sections: [
      { heading: "Observações do Professor", fields: [
        { key: "conteudo", label: "Relato Pedagógico / Observações" },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────
  // diario_reflexoes
  // ─────────────────────────────────────────────────────────
  diario_reflexoes: {
    title: "Diario de Reflexoes",
    pairFields: [
      [{ key: "titulo",     label: "Titulo" }, { key: "data",       label: "Data", type: "date" }],
      [{ key: "aluno_nome", label: "Aluno"  }, { key: "professor_nome", label: "Professor(a)"   }],
    ],
    sections: [
      { heading: "Reflexoes e Percepcoes", fields: [
        { key: "percepcoes", label: "Percepcoes e Reflexoes" },
      ]},
    ],
  },

  // ─────────────────────────────────────────────────────────
  // portfolio_digital
  // ─────────────────────────────────────────────────────────
  portfolio_digital: {
    title: "Portfolio Digital",
    pairFields: [
      [{ key: "titulo_registro", label: "Titulo" }, { key: "data_ref",   label: "Data", type: "date" }],
      [{ key: "aluno_nome",      label: "Aluno"  }, { key: "professor_nome", label: "Professor(a)"   }],
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
  doc.setFillColor(0, 148, 74);
  doc.rect(0, 0, PW, 50, 'F');
  doc.setFillColor(0, 110, 55);
  doc.rect(0, 40, PW, 10, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(22);
  doc.text("EduTecProfessor", PW / 2, 20, { align: "center" });

  doc.setFontSize(13);
  doc.setFont("helvetica", "normal");
  doc.text(moduleTitle.toUpperCase(), PW / 2, 32, { align: "center" });

  doc.setFontSize(7.5);
  doc.setTextColor(200, 255, 220);
  const dataGeracao = new Date().toLocaleDateString('pt-BR');
  doc.text("Gerado em: " + dataGeracao, PW - 14, 45, { align: "right" });
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
    let rv = right ? rawToStr(rec[right.key]) : "";

    // Fallback: se não achar 'data_ref', tenta 'data' etc.
    if (!lv && left.key === 'data_ref') lv = rawToStr(rec['data']);
    if (right && !rv && right.key === 'data_ref') rv = rawToStr(rec['data']);

    if (left.type === 'date')   lv = fmtDate(lv);
    if (right?.type === 'date')  rv = fmtDate(rv);
    if (left.type === 'number'  && lv) lv = String(Number(lv));
    if (right?.type === 'number' && rv) rv = String(Number(rv));
    
    if (!lv && !rv) return;

    if (yRef.y > PAGE_H - 14) { doc.addPage(); yRef.y = 25; }

    doc.setFillColor(252, 252, 252);
    doc.rect(15, yRef.y - 4, 180, 14, 'F');
    doc.setDrawColor(220, 220, 220);
    doc.setLineWidth(0.3);
    doc.rect(15, yRef.y - 4, 180, 14);
    if (rv) doc.line(COL2_X - 6, yRef.y - 4, COL2_X - 6, yRef.y + 10);

    if (lv) {
      doc.setFont("helvetica", "bold"); doc.setFontSize(7.5); doc.setTextColor(120, 120, 120);
      doc.text(left.label + ":", COL1_X + 3, yRef.y + 1);
      doc.setFont("helvetica", "normal"); doc.setFontSize(10); doc.setTextColor(20, 20, 20);
      const ls = doc.splitTextToSize(lv, COL_W - 5);
      doc.text(ls[0] ?? '', COL1_X + 3, yRef.y + 7.5);
    }
    if (right && rv) {
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
    const hasContent = Object.entries(info).some(([k, v]) => k !== 'bnccCodes' && hasValue(v));
    if (!hasContent) return;

    if (yRef.y > 265) { doc.addPage(); yRef.y = 25; }

    doc.setFillColor(0, 128, 64);
    doc.rect(15, yRef.y - 4, 180, 8, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
    doc.text(dia, 18, yRef.y + 1.5);
    yRef.y += 11;

    let x = 15;
    doc.setFillColor(218, 244, 232);
    doc.rect(15, yRef.y - 3.5, 180, 7, 'F');
    doc.setFont("helvetica", "bold"); doc.setFontSize(6.5); doc.setTextColor(30, 30, 30);
    COLS.forEach(col => { doc.text(col.label, x + 1.5, yRef.y + 0.5); x += col.w; });
    yRef.y += 8;

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

    const sc = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
    const { data: rawRec, error } = await sc.from(tableName).select('*').eq('id', id).single();

    if (error || !rawRec) {
      return new Response(
        JSON.stringify({ error: `Registro nao encontrado: ${error?.message}` }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Processamento de Fallbacks (Garantir que registros antigos não fiquem em branco)
    const rec = { ...rawRec };
    if (!rec.titulo_registro) {
      if (tableName === 'relatorios') rec.titulo_registro = `Relatório Individual - ${rec.aluno_nome || ''}`;
      else if (rec.titulo)          rec.titulo_registro = rec.titulo;
      else                        rec.titulo_registro = tableName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }
    if (!rec.data_ref) {
      rec.data_ref = rec.data || rec.created_at?.split('T')[0];
    }
    if (!rec.professor_nome && rec.professor_id) {
       const { data: prof } = await sc.from('users').select('nome').eq('id', rec.professor_id).single();
       if (prof?.nome) rec.professor_nome = prof.nome;
    }

    const cfg         = MODULE_CONFIG[tableName];
    const moduleTitle = cfg?.title ?? tableName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    drawHeader(doc, moduleTitle);

    const yRef = { y: 62 };

    if (cfg) {
      const hasPairsData = cfg.pairFields.some(([l, r]) => hasValue(rec[l.key]) || (r && hasValue(rec[r.key])));
      if (hasPairsData) drawInfoGrid(doc, cfg.pairFields, rec, yRef);

      for (const sec of cfg.sections) {
        const hasData = sec.fields.some(f => hasValue(rec[f.key]));
        if (!hasData) continue;

        const isGradeOnlySec = sec.fields.length === 1 && sec.fields[0].type === 'grade';
        if (!isGradeOnlySec) drawHeading(doc, sec.heading, yRef);

        for (const f of sec.fields) {
          const raw = rec[f.key];
          if (!hasValue(raw)) continue;

          if (f.type === 'grade') {
            let g = raw;
            if (typeof g === 'string') { try { g = JSON.parse(g); } catch (_) {} }
            if (g && typeof g === 'object' && !Array.isArray(g) && Object.keys(g as object).length > 0) {
              drawHeading(doc, "Grade Semanal Detalhada", yRef);
              renderGradeTable(doc, g as Record<string, unknown>, yRef);
            }
            continue;
          }

          if (f.type === 'array') {
            let arr = raw;
            if (typeof arr === 'string') { try { arr = JSON.parse(arr); } catch (_) {} }
            if (!Array.isArray(arr) || arr.length === 0) continue;
            drawField(doc, f.label, (arr as unknown[]).map(String).join(', '), yRef);
            continue;
          }

          const txt = f.type === 'date' ? fmtDate(rawToStr(raw)) : rawToStr(raw);
          drawField(doc, f.label, txt, yRef);
        }
        yRef.y += 4;
      }

      const configuredKeys = new Set<string>([
        'id', 'professor_id', 'aluno_id', 'created_at', 'updated_at', 'data', 'data_ref', 'tipo',
        'titulo', 'titulo_registro', 'professor_nome', 'aluno_nome', 'componente_curricular',
        'periodo', 'tom_texto', 'ano_serie', 'conteudo',
        ...cfg.pairFields.flatMap(([l, r]) => r ? [l.key, r.key] : [l.key]),
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
      const skip = new Set(['id', 'professor_id', 'aluno_id', 'created_at', 'updated_at']);
      drawHeading(doc, "Dados do Registro", yRef);
      for (const [k, v] of Object.entries(rec)) {
        if (skip.has(k) || !hasValue(v)) continue;
        const label = k.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
        drawField(doc, label, rawToStr(v), yRef);
      }
    }

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

/**
 * Script para atualizar a Edge Function pdf-edutec-v4 via API Management do Supabase
 * Execute: node deploy-pdf-function.js
 * 
 * Requer: SUPABASE_ACCESS_TOKEN no ambiente (gerado em https://supabase.com/dashboard/account/tokens)
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const PROJECT_REF = 'tmdturyqtaxihzomihss';
const FUNCTION_SLUG = 'pdf-edutec-v4';

// Lê o código da função
const functionCode = fs.readFileSync(
  path.join(__dirname, 'supabase', 'functions', 'generate-module-pdf', 'index.ts'),
  'utf8'
);

const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('\n❌ SUPABASE_ACCESS_TOKEN não definido!');
  console.error('Obtenha seu token em: https://supabase.com/dashboard/account/tokens');
  console.error('E execute: $env:SUPABASE_ACCESS_TOKEN="seu_token_aqui"; node deploy-pdf-function.js\n');
  process.exit(1);
}

const payload = JSON.stringify({
  name: FUNCTION_SLUG,
  verify_jwt: false,
  body: functionCode,
  entrypoint_path: 'index.ts',
  import_map: false,
});

const options = {
  hostname: 'api.supabase.com',
  path: `/v1/projects/${PROJECT_REF}/functions/${FUNCTION_SLUG}`,
  method: 'PATCH',
  headers: {
    'Authorization': `Bearer ${ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(payload),
  },
};

console.log(`\n📤 Atualizando função: ${FUNCTION_SLUG}...`);

const req = https.request(options, (res) => {
  let data = '';
  res.on('data', (chunk) => { data += chunk; });
  res.on('end', () => {
    if (res.statusCode === 200 || res.statusCode === 201) {
      console.log('✅ Deploy realizado com sucesso!');
      try {
        const parsed = JSON.parse(data);
        console.log('   Função:', parsed.name || parsed.slug);
        console.log('   Status:', parsed.status);
      } catch(e) {
        console.log('   Resposta:', data.substring(0, 200));
      }
    } else {
      console.error(`❌ Erro ${res.statusCode}:`, data.substring(0, 500));
    }
  });
});

req.on('error', (e) => { console.error('❌ Erro de rede:', e.message); });
req.write(payload);
req.end();

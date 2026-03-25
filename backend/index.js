require('dotenv').config();
const express = require('express');
const { MercadoPagoConfig, PreApproval } = require('mercadopago');
const { createClient } = require('@supabase/supabase-js');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configuração Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Configuração Mercado Pago (SDK v2)
const mpClient = new MercadoPagoConfig({ 
    accessToken: process.env.MERCADO_PAGO_ACCESS_TOKEN,
    options: { timeout: 5000 } 
});

const preApproval = new PreApproval(mpClient);

/**
 * Endpoints: /criar-assinatura
 */
app.post('/criar-assinatura', async (req, res) => {
    const { userId, email, plano } = req.body;

    if (!userId || !plano) {
        return res.status(400).json({ error: 'userId e plano são obrigatórios.' });
    }

    try {
        if (plano === 'free') {
            // Plano Free: Apenas registrar no Supabase e liberar acesso básico
            await supabase
                .from('users')
                .update({ plano: 'free', status_pagamento: 'pendente' })
                .eq('id', userId);

            return res.json({ 
                message: 'Plano Free configurado com sucesso.',
                checkout_url: null 
            });
        }

        // Configuração comum para assinaturas recursivas
        const body = {
            reason: plano === 'pro_teste' ? 'Plano Pro EduTec (7 Dias Grátis)' : 'Plano Pro Mensal EduTec',
            external_reference: userId,
            payer_email: email,
            auto_recurring: {
                frequency: 1,
                frequency_type: 'months',
                transaction_amount: plano === 'pro_teste' ? 29.90 : 29.90, // Valor padrão
                currency_id: 'BRL',
                // Período de teste para pro_teste (7 dias) se houver suporte, 
                // caso contrário, usaremos cobrança iniciada após 7 dias
                free_trial: plano === 'pro_teste' ? {
                    frequency: 7,
                    frequency_type: 'days'
                } : null
            },
            back_url: 'https://seusite.com/dashboard', // Ajustar conforme necessário
            status: 'pending'
        };

        const result = await preApproval.create({ body });
        
        // Retorna o link para o usuário confirmar
        res.json({ 
            id: result.id,
            checkout_url: result.init_point,
            status: result.status 
        });

    } catch (error) {
        console.error('Erro ao criar assinatura:', error);
        res.status(500).json({ error: error.message || 'Erro interno no servidor' });
    }
});

/**
 * Webhook: /webhook
 * Recebe notificações do Mercado Pago e atualiza Supabase
 */
app.post('/webhook', async (req, res) => {
    const { action, data, type } = req.body;
    console.log('Webhook recebido:', { action, type, data });

    try {
        // O Mercado Pago envia o ID do recurso (pre-approval ou payment)
        if (type === 'preapproval' || action === 'preapproval.created' || action === 'preapproval.updated') {
            const preApprovalId = data.id || req.query.id;
            
            // Consultar detalhes da assinatura
            const sub = await preApproval.get({ preApprovalId });
            const userId = sub.external_reference;
            const status = sub.status; // authorized, cancelled, pending...
            
            // Atualizar tabela de pagamentos no Supabase
            await supabase
                .from('payments')
                .insert({
                    user_id: userId,
                    valor: sub.auto_recurring.transaction_amount,
                    forma_pagamento: 'mercadopago_subscription',
                    status: status,
                    data_pagamento: new Date().toISOString(),
                    plano: sub.reason.includes('7 Dias') ? 'pro_teste' : 'pro_pago'
                });

            // Atualizar o perfil do usuário
            let planoLabel = sub.reason.includes('7 Dias') ? 'pro' : 'pro';
            let statusPagamento = status === 'authorized' ? 'aprovado' : status;

            await supabase
                .from('users')
                .update({ 
                    plano: planoLabel, 
                    status_pagamento: statusPagamento,
                    data_expiracao: status === 'authorized' ? new Date(new Date().setDate(new Date().getDate() + 30)).toISOString().split('T')[0] : null
                })
                .eq('id', userId);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('Erro ao processar webhook:', error);
        res.status(500).send('Erro interno');
    }
});

/**
 * GET status-assinatura/:userId
 */
app.get('/status-assinatura/:userId', async (req, res) => {
    const { userId } = req.params;

    try {
        const { data, error } = await supabase
            .from('users')
            .select('plano, status_pagamento, data_expiracao')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;
        if (!data) return res.status(404).json({ error: 'Usuário não encontrado.' });

        res.json(data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});

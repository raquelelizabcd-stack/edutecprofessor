import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import Stripe from 'stripe';

const app = express();
app.use(express.json());
app.use(cors());

// Configuração Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
if (!supabaseUrl || !supabaseKey) {
    console.error("VITE_SUPABASE_URL ou VITE_SUPABASE_ANON_KEY faltando no .env");
}
const supabase = createClient(supabaseUrl || "", supabaseKey || "");
// Configuração Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', service: 'EduTec-API' });
});

/**
 * Endpoints for Stripe Sessions
 */
const createStripeSessionHandler = async (req, res) => {
    const { userId, email } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId é obrigatório.' });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer_email: email,
            client_reference_id: userId,
            line_items: [
                {
                    price: process.env.ID_PREÇO_STRIPE || process.env.ID_PRECO_STRIPE || process.env.STRIPE_PRICE_ID,
                    quantity: 1,
                },
            ],
            allow_promotion_codes: true,
            success_url: process.env.URL_DE_SUCESSO || process.env.SUCCESS_URL || 'http://localhost:5173/dashboard?payment_success=true',
            cancel_url: process.env.URL_DE_CANCELAMENTO || process.env.CANCEL_URL || 'http://localhost:5173/dashboard?payment_canceled=true',
        });

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Erro ao criar sessão Stripe:', error);
        res.status(500).json({ error: error.message || 'Erro interno no servidor' });
    }
};

app.post('/api/create-stripe-session', createStripeSessionHandler);
app.post('/create-stripe-session', createStripeSessionHandler);

/**
 * Endpoints for Stripe Customer Portal
 */
const createPortalSessionHandler = async (req, res) => {
    const { email, userId } = req.body;

    if (!email && !userId) {
        return res.status(400).json({ error: 'E-mail ou ID do usuário é obrigatório para abrir o portal.' });
    }

    try {
        let stripeCustomerId = null;

        // 1. Tenta buscar o cliente no banco de dados primeiro
        if (userId) {
            const { data: user } = await supabase
                .from('users')
                .select('stripe_customer_id')
                .eq('id', userId)
                .maybeSingle();

            if (user?.stripe_customer_id) {
                stripeCustomerId = user.stripe_customer_id;
            }
        }

        // 2. Fallback: Busca o cliente pelo e-mail no Stripe caso o ID não esteja no banco
        if (!stripeCustomerId && email) {
            const customers = await stripe.customers.list({ email: email, limit: 1 });

            if (customers.data.length > 0) {
                stripeCustomerId = customers.data[0].id;

                // Sincroniza o ID no banco para futuras requisições mais rápidas
                if (userId) {
                    await supabase
                        .from('users')
                        .update({ stripe_customer_id: stripeCustomerId })
                        .eq('id', userId);
                }
            }
        }

        if (!stripeCustomerId) {
            return res.status(404).json({ error: 'Não encontramos uma conta de faturamento ativa para este usuário no Stripe.' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: process.env.SUCCESS_URL || process.env.URL_DE_SUCESSO || 'http://localhost:3000/dashboard',
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Erro ao criar sessão do portal:', error);
        res.status(500).json({ error: error.message || 'Erro ao conectar com o portal Stripe' });
    }
};

app.post('/api/create-portal-session', createPortalSessionHandler);
app.post('/create-portal-session', createPortalSessionHandler);

/**
 * Webhook do Stripe
 */
const stripeWebhookHandler = async (req, res) => {
    const event = req.body;

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.client_reference_id;
            const customerEmail = session.customer_details?.email;

            if (userId) {
                // Atualiza status do usuário para PRO e salva o ID do Stripe
                const dataExpiracao = new Date();
                dataExpiracao.setDate(dataExpiracao.getDate() + 30);

                await supabase
                    .from('users')
                    .update({
                        plano: 'pro',
                        status_pagamento: 'ativo',
                        stripe_customer_id: session.customer,
                        data_expiracao: dataExpiracao.toISOString().split('T')[0]
                    })
                    .eq('id', userId);

                // Opcional: registrar em tabela de pagamentos
                await supabase
                    .from('payments')
                    .insert({
                        user_id: userId,
                        valor: session.amount_total ? session.amount_total / 100 : 29.90,
                        forma_pagamento: 'stripe',
                        status: 'authorized',
                        plano: 'pro_pago'
                    });

                console.log(`[Stripe Webhook] Conta PRO ativada para usuário: ${userId} (${customerEmail})`);
            }
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Erro no processamento do webhook Stripe:', error);
        res.status(500).send('Erro interno do webhook');
    }
};

app.post('/api/webhook/stripe', stripeWebhookHandler);
app.post('/webhook/stripe', stripeWebhookHandler);

/**
 * GET status-assinatura/:userId
 */
const statusAssinaturaHandler = async (req, res) => {
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
};

app.get('/api/status-assinatura/:userId', statusAssinaturaHandler);
app.get('/status-assinatura/:userId', statusAssinaturaHandler);

// Para desenvolvimento local
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Rodando localmente na porta ${PORT}`));
}

// Exportar para o Vercel Serverless
export default app;

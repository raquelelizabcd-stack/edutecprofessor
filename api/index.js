import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import Stripe from 'stripe';

const app = express();

// Configuração Supabase
const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL;
// IMPORTANTE: Para Webhooks no backend, SEMPRE use a SERVICE_ROLE_KEY para ignorar RLS.
// Se usar a ANON_KEY, o webhook pode falhar ao tentar atualizar tabelas protegidas.
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("❌ ERRO CRÍTICO: SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY faltando no arquivo .env");
}

if (supabaseKey && supabaseKey.includes('anon')) {
    console.warn("⚠️ AVISO: Você está usando a ANON_KEY no backend. Isso pode causar erro de RLS nos webhooks. Recomenda-se usar a SERVICE_ROLE_KEY.");
}

const supabase = createClient(supabaseUrl || "", supabaseKey || "");

// Configuração Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

// Middleware para habilitar CORS e JSON (com exceção para o webhook que precisa do raw body)
app.use(cors());

// Parser especial para capturar o raw body necessário para a assinatura do Webhook do Stripe
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl.includes('/webhook/stripe')) {
            req.rawBody = buf;
        }
    }
}));

// ENDPOINT: CRIAR SESSÃO DO CUSTOMER PORTAL (Stripe Management)
app.post('/api/create-portal-session', async (req, res) => {
    try {
        const { userId, email } = req.body;
        
        let customerId;

        // 1. Busca o customer_id na tabela users do Supabase
        const { data: user, error: userError } = await supabase
            .from('users')
            .select('stripe_customer_id')
            .eq('id', userId)
            .single();

        if (user?.stripe_customer_id) {
            customerId = user.stripe_customer_id;
        } else if (email) {
            // 2. Fallback: Busca no Stripe por email
            const customers = await stripe.customers.list({ email, limit: 1 });
            if (customers.data.length > 0) {
                customerId = customers.data[0].id;
                // Salva no banco para futuras consultas
                await supabase.from('users').update({ stripe_customer_id: customerId }).eq('id', userId);
            }
        }

        if (!customerId) {
            return res.status(404).json({ error: 'Você ainda não possui um histórico de pagamentos no Stripe. Assine o plano Pro primeiro!' });
        }

        // 3. Cria a sessão do portal
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: `${req.headers.origin || 'http://localhost:3000'}/`,
        });

        res.json({ url: session.url });
    } catch (err) {
        console.error('[Stripe Portal Error]', err.message);
        res.status(500).json({ error: 'Falha ao abrir portal de faturamento.' });
    }
});

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', service: 'EduTec-API', timestamp: new Date() });
});

/**
 * Funções Auxiliares de Sincronização
 */
const updateSubscriptionInDB = async (subscriptionId) => {
    try {
        const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
            expand: ['default_payment_method']
        });
        
        const customerId = subscription.customer;
        const status = subscription.status;
        const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
        const priceId = subscription.items.data[0].price.id;
        
        // Determina o plano e status amigável
        const plano = 'EduTec Pro'; 
        const statusAmigavel = (status === 'active' || status === 'trialing') ? 'ativo' : status;

        // Tenta encontrar o usuário pelo stripe_customer_id no banco
        const { data: user } = await supabase
            .from('users')
            .select('id')
            .eq('stripe_customer_id', customerId)
            .maybeSingle();

        if (user) {
            // Se falhar ao buscar detalhes (ex: ID de teste), usamos dados básicos
            const subData = {
                user_id: user.id,
                plano: plano,
                status: statusAmigavel,
                proxima_renovacao: currentPeriodEnd,
                stripe_customer_id: customerId,
                stripe_subscription_id: subscriptionId,
                data_atualizacao: new Date().toISOString(),
                metodo_pagamento: subscription.default_payment_method ? {
                    type: subscription.default_payment_method.type,
                    last4: subscription.default_payment_method.card?.last4,
                    brand: subscription.default_payment_method.card?.brand,
                    expiry_month: subscription.default_payment_method.card?.exp_month,
                    expiry_year: subscription.default_payment_method.card?.exp_year
                } : null
            };

            await supabase
                .from('assinaturas')
                .upsert(subData, { onConflict: 'user_id' });

            // Sincroniza também a tabela 'users' principal (para compatibilidade legada)
            await supabase
                .from('users')
                .update({
                    plano: statusAmigavel === 'ativo' ? 'pro' : 'free',
                    status_pagamento: statusAmigavel,
                    data_expiracao: currentPeriodEnd.split('T')[0]
                })
                .eq('id', user.id);
            
            console.log(`[Stripe Sync] Assinatura ${subscriptionId} sincronizada para usuário ${user.id}`);
        }
    } catch (err) {
        console.error(`[Stripe Sync Error] Falha ao sincronizar assinatura ${subscriptionId}:`, err.message);
        
        // Em caso de erro (ex: ID de teste), tentamos uma atualização mínima se tivermos o userId via metadados (no futuro)
        // Por ora, apenas logamos.
    }
};

/**
 * Endpoints for Stripe Checkout
 */
const createStripeSessionHandler = async (req, res) => {
    const { userId, email } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId é obrigatório.' });
    }

    try {
        // Se houver um link de pagamento estático configurado (ex: para testes ou links rápidos)
        // usaremos ele anexando o client_reference_id para rastreio no webhook
        if (process.env.STRIPE_PAYMENT_LINK) {
            const paymentLink = process.env.STRIPE_PAYMENT_LINK;
            const separator = paymentLink.includes('?') ? '&' : '?';
            const redirectUrl = `${paymentLink}${separator}client_reference_id=${userId}${email ? `&prefilled_email=${encodeURIComponent(email)}` : ''}`;
            
            return res.json({ url: redirectUrl });
        }

        // Verifica se o usuário já tem um customer_id
        const { data: userData } = await supabase
            .from('users')
            .select('stripe_customer_id')
            .eq('id', userId)
            .maybeSingle();

        let stripeCustomerId = userData?.stripe_customer_id;

        // Se não tiver, cria um novo customer no Stripe
        if (!stripeCustomerId) {
            const customer = await stripe.customers.create({
                email: email,
                metadata: { supabase_userId: userId },
            });
            stripeCustomerId = customer.id;

            // Salva no banco imediatamente
            await supabase
                .from('users')
                .update({ stripe_customer_id: stripeCustomerId })
                .eq('id', userId);
        }

        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            customer: stripeCustomerId,
            client_reference_id: userId,
            payment_method_types: ['card'], // Adicione 'pix' se o Price/Checkout for compatível
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID || 'price_1TGQVzFwE0ksLNsgvVPbqMDm',
                    quantity: 1,
                },
            ],
            subscription_data: {
                trial_period_days: 7, // Mantém os 7 dias de teste
                metadata: { supabase_userId: userId }
            },
            allow_promotion_codes: true,
            success_url: process.env.SUCCESS_URL || 'https://edutechprofe.vercel.app/dashboard?payment_success=true',
            cancel_url: process.env.CANCEL_URL || 'https://edutechprofe.vercel.app/dashboard?payment_canceled=true',
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

    try {
        let stripeCustomerId = null;

        // 1. Busca dados no banco
        const { data: user } = await supabase
            .from('users')
            .select('stripe_customer_id, status_pagamento')
            .eq('id', userId)
            .maybeSingle();

        // Se o usuário está em modo TESTE de 7 dias, ele não tem portal no Stripe ainda
        if (user?.status_pagamento === 'teste' || user?.status_pagamento === 'trial') {
            return res.status(403).json({ error: 'Você está no período de 7 dias de teste grátis. Para gerenciar pagamentos, conclua o upgrade para o plano Pro primeiro!' });
        }

        if (user?.stripe_customer_id) {
            stripeCustomerId = user.stripe_customer_id;
        }

        // 2. Busca no Stripe por email (caso não esteja no banco)
        if (!stripeCustomerId && email) {
            const customers = await stripe.customers.list({ email: email, limit: 1 });
            if (customers.data.length > 0) {
                stripeCustomerId = customers.data[0].id;
                // Atualiza o banco para agilizar na próxima
                await supabase.from('users').update({ stripe_customer_id: stripeCustomerId }).eq('id', userId);
            }
        }

        if (!stripeCustomerId) {
            return res.status(404).json({ error: 'Você ainda não possui um histórico de faturamento no Stripe. Assine o plano Pro para ativar o portal!' });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: stripeCustomerId,
            return_url: `${req.headers.origin || 'http://localhost:3000'}/dashboard`,
        });

        res.json({ url: session.url });
    } catch (error) {
        console.error('Erro ao abrir portal Stripe:', error.message);
        res.status(500).json({ error: 'Não foi possível acessar o portal de faturamento agora.' });
    }
};

app.post('/api/create-portal-session', createPortalSessionHandler);
app.post('/create-portal-session', createPortalSessionHandler);

/**
 * Webhook do Stripe (Tratamento Completo)
 */
const stripeWebhookHandler = async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    let event;

    try {
        if (webhookSecret && sig) {
            // Verificação de assinatura para Segurança
            event = stripe.webhooks.constructEvent(req.rawBody, sig, webhookSecret);
        } else {
            // Fallback para desenvolvimento sem secret (não recomendado para producao)
            event = req.body;
        }
    } catch (err) {
        console.error(`❌ Erro de Assinatura Webhook: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Stripe Webhook] Recebido evento: ${event.type}`);

    try {
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.client_reference_id;
                const customerId = session.customer;
                const subscriptionId = session.subscription;

                console.log(`[Stripe Webhook] Checkout concluído para usuário: ${userId}`);

                if (userId) {
                    // 1. Vincula o customer_id ao usuário
                    await supabase
                        .from('users')
                        .update({ stripe_customer_id: customerId })
                        .eq('id', userId);

                    // 2. Busca detalhes da assinatura no Stripe para pegar a data de renovação real
                    let currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
                    
                    if (subscriptionId) {
                        try {
                            const subscription = await stripe.subscriptions.retrieve(subscriptionId);
                            currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();
                        } catch (subErr) {
                            console.error('[Stripe Error] Erro ao buscar assinatura:', subErr.message);
                        }
                    }

                    // 3. Atualiza a tabela 'assinaturas' conforme solicitado
                    const { error: subError } = await supabase
                        .from('assinaturas')
                        .upsert({
                            user_id: userId,
                            plano: 'Pro', // Conforme solicitado: 'Pro'
                            status: 'ativo',
                            stripe_customer_id: customerId,
                            stripe_subscription_id: subscriptionId || null,
                            proxima_renovacao: currentPeriodEnd,
                            data_atualizacao: new Date().toISOString()
                        }, { onConflict: 'user_id' });
                    
                    if (subError) console.error('[Supabase Error] Falha ao atualizar assinaturas:', subError.message);

                    // 4. Insere registro na tabela 'payments' - Histórico de pagamentos
                    const { error: payError } = await supabase
                        .from('payments')
                        .insert({
                            user_id: userId,
                            valor: 29.90,
                            forma_pagamento: 'cartao_credito',
                            status: 'pago',
                            data_pagamento: new Date().toISOString(),
                            plano: 'pro_pago' // Usando 'pro_pago' pois 'Pro' falharia no check constraint atual
                        });
                    
                    if (payError) console.error('[Supabase Error] Falha ao inserir em payments:', payError.message);

                    // 5. Atualiza o status principal do usuário (Gatilho para o App)
                    await supabase
                        .from('users')
                        .update({ 
                            plano: 'pro', 
                            status_pagamento: 'ativo',
                            data_expiracao: currentPeriodEnd.split('T')[0]
                        })
                        .eq('id', userId);

                    console.log(`[Stripe Webhook] Fluxo Pro ativado para usuário ${userId}`);
                }
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const status = subscription.status;
                const customerId = subscription.customer;

                // Busca o usuário pelo customerId
                const { data: user } = await supabase
                    .from('users')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .maybeSingle();

                if (user) {
                    const isOrderActive = ['active', 'trialing'].includes(status);
                    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

                    // Atualiza tabela de assinaturas
                    await supabase
                        .from('assinaturas')
                        .update({
                            status: isOrderActive ? 'ativo' : 'expirado',
                            proxima_renovacao: currentPeriodEnd,
                            data_atualizacao: new Date().toISOString()
                        })
                        .eq('user_id', user.id);

                    // Atualiza status do usuário
                    await supabase
                        .from('users')
                        .update({
                            plano: isOrderActive ? 'pro' : 'free',
                            status_pagamento: isOrderActive ? 'ativo' : 'expirado',
                            data_expiracao: currentPeriodEnd.split('T')[0]
                        })
                        .eq('id', user.id);
                    
                    console.log(`[Stripe Webhook] Assinatura atualizada para usuário ${user.id}: ${status}`);
                }
                break;
            }

            case 'invoice.payment_succeeded': {
                const invoice = event.data.object;
                if (invoice.subscription) {
                    // Opcional: registrar novo pagamento no histórico se não for o primeiro
                }
                break;
            }

            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer;
                
                // Notificar usuário ou marcar como falha no banco
                const { data: user } = await supabase
                    .from('users')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .maybeSingle();
                
                if (user) {
                    await supabase
                        .from('assinaturas')
                        .update({ status: 'past_due', data_atualizacao: new Date().toISOString() })
                        .eq('user_id', user.id);
                        
                    await supabase
                        .from('users')
                        .update({ status_pagamento: 'falha_no_pagamento' })
                        .eq('id', user.id);
                }
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                await updateSubscriptionInDB(subscription.id);
                break;
            }

            case 'payment_method.attached':
            case 'payment_method.updated': {
                const paymentMethod = event.data.object;
                const customerId = paymentMethod.customer;
                
                if (customerId) {
                    // Buscar assinaturas ativas deste customer para atualizar os metodos
                    const subscriptions = await stripe.subscriptions.list({ customer: customerId, limit: 5 });
                    for (const sub of subscriptions.data) {
                        await updateSubscriptionInDB(sub.id);
                    }
                }
                break;
            }

            default:
                console.log(`[Stripe Webhook] Evento ignorado: ${event.type}`);
        }

        res.status(200).json({ received: true });
    } catch (error) {
        console.error('Erro no processamento do webhook Stripe:', error);
        res.status(500).json({ error: 'Erro interno no processamento do webhook' });
    }
};

app.post('/api/webhook/stripe', stripeWebhookHandler);
app.post('/webhook/stripe', stripeWebhookHandler);

// Endpoint legado para compatibilidade check de status
const statusAssinaturaHandler = async (req, res) => {
    const { userId } = req.params;
    try {
        const { data, error } = await supabase
            .from('users')
            .select('plano, status_pagamento, data_expiracao')
            .eq('id', userId)
            .maybeSingle();

        if (error) throw error;
        res.json(data || { plano: 'free', status_pagamento: 'pendente' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

app.get('/api/status-assinatura/:userId', statusAssinaturaHandler);

// Inicialização Local
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 API EduTec rodando localmente na porta ${PORT}`));
}

export default app;


import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

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

// Configuração E-mail (Nodemailer)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, 
    auth: {
        user: process.env.SUPPORT_EMAIL || 'edutecprof1@gmail.com',
        pass: (process.env.SUPPORT_PASSWORD || "").replace(/\s/g, '')
    }
});

// Configuração IMAP
const imapConfig = {
    imap: {
        user: process.env.SUPPORT_EMAIL || 'edutecprof1@gmail.com',
        password: (process.env.SUPPORT_PASSWORD || "").replace(/\s/g, ''),
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 3000
    }
};

// Middleware para habilitar CORS e JSON (com exceção para o webhook que precisa do raw body)
app.use(cors());

// Parser especial para capturar o raw body necessário para a assinatura do Webhook do Stripe
app.use(express.json({
    verify: (req, res, buf) => {
        if (req.originalUrl.includes('/webhook/stripe') || req.originalUrl.includes('/webhook/pagbank')) {
            req.rawBody = buf;
        }
    }
}));

// Configuração PagBank
const PAGBANK_TOKEN = process.env.PAGBANK_TOKEN || '4e15c1dd-7423-4ded-a97f-ddbd33e5ff06632119b84fbeb98448dac1e5d2ea8eb7c576-0f16-42c8-b748-d95d212a4089';
const PAGBANK_URL = 'https://api.pagseguro.com'; // Use sandbox.api.pagseguro.com para testes

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
 * Endpoint para Cancelar Assinatura (Agendar cancelamento para o fim do período)
 */
app.post('/api/cancelar-assinatura', async (req, res) => {
    const { userId } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'ID do usuário não fornecido.' });
    }

    try {
        // 1. Busca o ID da assinatura no banco
        const { data: sub, error } = await supabase
            .from('assinaturas')
            .select('stripe_subscription_id, proxima_renovacao')
            .eq('user_id', userId)
            .single();

        if (error || !sub?.stripe_subscription_id) {
            return res.status(404).json({ error: 'Assinatura ativa não encontrada.' });
        }

        // 2. Cancela no Stripe ao final do período (mantém o acesso)
        await stripe.subscriptions.update(sub.stripe_subscription_id, {
            cancel_at_period_end: true
        });

        // 3. Atualiza o status no banco para refletir o cancelamento agendado
        await supabase
            .from('users')
            .update({ status_pagamento: 'cancelado' })
            .eq('id', userId);

        await supabase
            .from('assinaturas')
            .update({ status: 'cancelado' })
            .eq('user_id', userId);

        res.json({ 
            success: true, 
            message: 'Assinatura cancelada com sucesso.',
            expiracao: sub.proxima_renovacao
        });
    } catch (err) {
        console.error('[Stripe Cancel Error]', err.message);
        res.status(500).json({ error: 'Erro ao processar cancelamento: ' + err.message });
    }
});

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

                    // 4. Insere registro na tabela 'pagamentos_stripe' (Nova)
                    await supabase
                        .from('pagamentos_stripe')
                        .insert({
                            user_id: userId,
                            amount: 29.90,
                            stripe_subscription_id: subscriptionId || null,
                            stripe_customer_id: customerId,
                            status: 'pago'
                        });

                    // 5. Atualiza o status principal do usuário (Gatilho para o App)
                    await supabase
                        .from('users')
                        .update({ 
                            plano: 'pro', 
                            status_pagamento: 'aprovado',
                            data_expiracao: currentPeriodEnd.split('T')[0]
                        })
                        .eq('id', userId);

                    console.log(`[Stripe Webhook] Fluxo Pro (APROVADO) ativado para usuário ${userId}`);
                }
                break;
            }

            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                const status = subscription.status;
                const customerId = subscription.customer;
                const cancelAtPeriodEnd = subscription.cancel_at_period_end;

                // Busca o usuário pelo customerId
                const { data: user } = await supabase
                    .from('users')
                    .select('id')
                    .eq('stripe_customer_id', customerId)
                    .maybeSingle();

                if (user) {
                    const isStillActive = ['active', 'trialing'].includes(status);
                    const isCanceled = status === 'canceled' || status === 'unpaid';
                    const currentPeriodEnd = new Date(subscription.current_period_end * 1000).toISOString();

                    // Atualiza o perfil principal
                    await supabase
                        .from('users')
                        .update({ 
                            plano: isStillActive ? 'pro' : 'free', 
                            status_pagamento: isStillActive ? 'aprovado' : (isCanceled ? 'cancelado' : 'expirado'),
                            data_expiracao: currentPeriodEnd.split('T')[0]
                        })
                        .eq('id', user.id);
                    // Se o status do Stripe for realmente cancelado ou expirado, vira 'expirado' ou 'cancelado'
                    let finalStatus = isStillActive ? (cancelAtPeriodEnd ? 'cancelado' : 'ativo') : 'expirado';

                    // Atualiza tabela de assinaturas
                    await supabase
                        .from('assinaturas')
                        .update({
                            status: finalStatus,
                            proxima_renovacao: currentPeriodEnd,
                            data_atualizacao: new Date().toISOString()
                        })
                        .eq('user_id', user.id);

                    // Atualiza status do usuário
                    await supabase
                        .from('users')
                        .update({
                            plano: isStillActive ? 'pro' : 'free',
                            status_pagamento: finalStatus,
                            data_expiracao: currentPeriodEnd.split('T')[0]
                        })
                        .eq('id', user.id);
                    
                    console.log(`[Stripe Webhook] Assinatura ${event.type} para usuário ${user.id}: ${status} (CancelAtEnd: ${cancelAtPeriodEnd})`);
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

/**
 * Endpoint para criar cobrança PIX via PagBank
 */
app.post('/api/pix/charge', async (req, res) => {
    const { userId, email, nome, cpf, amount } = req.body;

    if (!userId || !email || !cpf) {
        return res.status(400).json({ error: 'Dados incompletos (userId, email, cpf são obrigatórios).' });
    }

    try {
        const orderData = {
            reference_id: `edutec-pix-${userId}-${Date.now()}`,
            customer: {
                name: nome || 'Professor EduTec',
                email: email,
                tax_id: cpf.replace(/\D/g, ''),
                phones: [{ country: "55", area: "11", number: "999999999", type: "MOBILE" }]
            },
            items: [{
                name: "Assinatura EduTec Pro (Avulso)",
                quantity: 1,
                unit_amount: (amount || 29.9) * 100 // PagBank trabalha em centavos
            }],
            qr_codes: [{
                amount: { value: (amount || 29.9) * 100 },
                expiration_date: new Date(Date.now() + 24 * 3600 * 1000).toISOString()
            }],
            notification_urls: [process.env.PAGBANK_WEBHOOK_URL || 'https://edutechprofe.vercel.app/api/webhook/pagbank']
        };

        const response = await fetch(`${PAGBANK_URL}/orders`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${PAGBANK_TOKEN}`,
                'Content-Type': 'application/json',
                'accept': '*/*'
            },
            body: JSON.stringify(orderData)
        });

        const data = await response.json();

        if (data.error_messages) {
            console.error('[PagBank Error]', data.error_messages);
            return res.status(400).json({ error: 'Erro no PagBank: ' + data.error_messages[0].description });
        }

        const qrCode = data.qr_codes[0];
        const chargeId = data.id;

        // Salva na tabela pagamentos_pix
        await supabase.from('pagamentos_pix').insert({
            user_id: userId,
            pagbank_charge_id: chargeId,
            qr_code: qrCode.links.find(l => l.rel === 'QRCODE.PNG')?.href,
            qr_code_text: qrCode.text,
            amount: amount || 29.9,
            status: 'Aguardando',
            expires_at: qrCode.expiration_date
        });

        res.json({
            qrCode: qrCode.links.find(l => l.rel === 'QRCODE.PNG')?.href,
            qrCodeText: qrCode.text,
            chargeId: chargeId
        });

    } catch (error) {
        console.error('Erro ao gerar PIX:', error);
        res.status(500).json({ error: 'Falha ao gerar cobrança PIX.' });
    }
});

/**
 * Webhook do PagBank para atualizar status do PIX
 */
app.post('/api/webhook/pagbank', async (req, res) => {
    try {
        const payload = req.body;
        const chargeId = payload.id;
        const status = payload.status; // PAID, WAITING, CANCELED, etc.

        let dbStatus = 'Aguardando';
        if (status === 'PAID') dbStatus = 'Pago';
        if (status === 'CANCELED') dbStatus = 'Expirado';

        console.log(`[PagBank Webhook] Charge ${chargeId} -> ${status}`);

        // 1. Atualiza a tabela pagamentos_pix
        const { data: pixData } = await supabase
            .from('pagamentos_pix')
            .update({ status: dbStatus })
            .eq('pagbank_charge_id', chargeId)
            .select('user_id')
            .maybeSingle();

        // 2. Se pago, ativa o plano Pro do usuário
        if (dbStatus === 'Pago' && pixData?.user_id) {
            const dataExpiracao = new Date();
            dataExpiracao.setMonth(dataExpiracao.getMonth() + 1); // +30 dias

            await supabase
                .from('users')
                .update({ 
                    plano: 'pro', 
                    status_pagamento: 'aprovado',
                    data_expiracao: dataExpiracao.toISOString().split('T')[0]
                })
                .eq('id', pixData.user_id);
            
            console.log(`[PagBank Webhook] Usuário ${pixData.user_id} ativado via PIX.`);
        }

        res.status(200).send('OK');
    } catch (error) {
        console.error('[PagBank Webhook Error]', error);
        res.status(500).send('Webhook Error');
    }
});

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

/**
 * Endpoint para enviar um NOVO e-mail de suporte (iniciado pelo admin)
 */
app.post('/api/support/send', async (req, res) => {
    const { to, subject, message } = req.body;

    if (!to || !message) {
        return res.status(400).json({ error: 'Destinatário e mensagem são obrigatórios.' });
    }

    try {
        // 1. Enviar e-mail via SMTP
        await transporter.sendMail({
            from: `"Suporte EduTecPro" <${process.env.SUPPORT_EMAIL || 'edutecprof1@gmail.com'}>`,
            to: to,
            subject: subject || 'Suporte EduTecPro',
            text: message,
        });

        // 2. Registrar no banco de dados (Supabase)
        const { error } = await supabase.from('suporte_mensagens').insert([{
            remetente_email: process.env.SUPPORT_EMAIL || 'edutecprof1@gmail.com',
            remetente_nome: 'Suporte EduTecPro',
            assunto: subject || '(Sem assunto)',
            mensagem: message,
            status: 'respondido',
            lido: true,
            resposta: message,
            metadata: { 
                to: to,
                type: 'sent_by_admin',
                sent_at: new Date().toISOString()
            }
        }]);

        if (error) throw error;

        res.json({ success: true, message: 'Novo e-mail enviado e registrado com sucesso.' });
    } catch (error) {
        console.error('Erro ao enviar novo e-mail:', error);
        res.status(500).json({ error: 'Erro ao enviar e-mail: ' + error.message });
    }
});

app.get('/api/status-assinatura/:userId', statusAssinaturaHandler);

/**
 * Endpoint para responder mensagem de suporte e enviar e-mail real
 */
app.post('/api/support/reply', async (req, res) => {
    const { messageId, email, subject, replyText } = req.body;

    if (!messageId || !email || !replyText) {
        return res.status(400).json({ error: 'Dados incompletos.' });
    }

    try {
        await transporter.sendMail({
            from: `"Suporte EduTecPro" <${process.env.SUPPORT_EMAIL || 'edutecprof1@gmail.com'}>`,
            to: email,
            subject: `Re: ${subject || 'Suporte EduTecPro'}`,
            text: replyText,
        });

        const { error } = await supabase
            .from('suporte_mensagens')
            .update({
                resposta: replyText,
                status: 'respondido',
                respondido_em: new Date().toISOString()
            })
            .eq('id', messageId);

        if (error) throw error;

        res.json({ success: true, message: 'Resposta enviada e registrada.' });
    } catch (error) {
        console.error('Erro ao responder suporte:', error);
        res.status(500).json({ error: 'Erro ao enviar e-mail: ' + error.message });
    }
});

/**
 * Endpoint para sincronizar e-mails do Gmail com o banco de dados
 */
app.get('/api/support/sync', async (req, res) => {
    try {
        const connection = await imaps.connect(imapConfig);
        await connection.openBox('INBOX');

        const delay = 24 * 3600 * 1000 * 2; 
        const yesterday = new Date(Date.now() - delay).toISOString();
        const searchCriteria = ['UNSEEN', ['SINCE', yesterday]];
        const fetchOptions = { bodies: ['HEADER', 'TEXT', ''], struct: true };

        const messages = await connection.search(searchCriteria, fetchOptions);
        let syncedCount = 0;

        for (const item of messages) {
            const all = item.parts.filter(part => part.which === '');
            const id = item.attributes.uid;
            const headerPart = item.parts.filter(part => part.which === 'HEADER')[0];
            const messageId = headerPart?.body['message-id']?.[0] || `imap-${id}`;

            const parsed = await simpleParser(all[0].body);
            const from = parsed.from?.value[0];
            
            const { data: existing } = await supabase
                .from('suporte_mensagens')
                .select('id')
                .contains('metadata', { message_id: messageId })
                .maybeSingle();

            if (!existing) {
                const { error: insertError } = await supabase
                    .from('suporte_mensagens')
                    .insert([{
                        remetente_email: from?.address || 'desconhecido@email.com',
                        remetente_nome: from?.name || from?.address || 'Professor',
                        assunto: parsed.subject || '(Sem assunto)',
                        mensagem: parsed.text || parsed.html || '',
                        status: 'aberto',
                        lido: false,
                        metadata: { 
                            imap_uid: id,
                            message_id: messageId,
                            sync_date: new Date().toISOString()
                        }
                    }]);
                
                if (!insertError) syncedCount++;
            }
        }

        connection.end();
        res.json({ success: true, synced: syncedCount });
    } catch (error) {
        console.error('Erro na sincronização IMAP:', error);
        res.status(500).json({ error: 'Falha na sincronização: ' + error.message });
    }
});

// Inicialização Local
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, '0.0.0.0', () => console.log(`🚀 API EduTec rodando localmente na porta ${PORT}`));
}

export default app;


import 'dotenv/config';
import express from 'express';
import { createClient } from '@supabase/supabase-js';
import cors from 'cors';
import Stripe from 'stripe';
import nodemailer from 'nodemailer';
import imaps from 'imap-simple';
import { simpleParser } from 'mailparser';

const app = express();
app.use(express.json());
app.use(cors());

// Configuração Supabase
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

// Configuração Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
    apiVersion: '2023-10-16',
});

// Configuração E-mail (Nodemailer)
const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true, // SSL
    auth: {
        user: process.env.SUPPORT_EMAIL || 'edutecprof1@gmail.com',
        pass: process.env.SUPPORT_PASSWORD // Senha de aplicativo
    }
});

// Configuração IMAP
const imapConfig = {
    imap: {
        user: process.env.SUPPORT_EMAIL || 'edutecprof1@gmail.com',
        password: process.env.SUPPORT_PASSWORD,
        host: 'imap.gmail.com',
        port: 993,
        tls: true,
        authTimeout: 3000
    }
};

app.get('/api/status', (req, res) => {
    res.json({ status: 'online', service: 'EduTec-API' });
});

/**
 * Endpoint para criar sessão de checkout no Stripe
 */
app.post('/api/create-stripe-session', async (req, res) => {
    const { userId, email } = req.body;

    if (!userId) {
        return res.status(400).json({ error: 'userId é obrigatório.' });
    }

    try {
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card', 'boleto'],
            mode: 'subscription',
            customer_email: email,
            client_reference_id: userId,
            line_items: [
                {
                    price: process.env.STRIPE_PRICE_ID, // Use the price ID configured in .env
                    quantity: 1,
                },
            ],
            success_url: process.env.SUCCESS_URL || 'http://localhost:5173/dashboard?payment_success=true',
            cancel_url: process.env.CANCEL_URL || 'http://localhost:5173/dashboard?payment_canceled=true',
        });

        res.json({ id: session.id, url: session.url });
    } catch (error) {
        console.error('Erro ao criar sessão Stripe:', error);
        res.status(500).json({ error: error.message || 'Erro interno no servidor' });
    }
});

/**
 * Webhook do Stripe
 */
app.post('/api/webhook/stripe', async (req, res) => {
    const event = req.body;

    try {
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const userId = session.client_reference_id;
            const customerEmail = session.customer_details?.email;
            
            if (userId) {
                // Atualiza status do usuário para PRO e renova data de expiração (ex: +30 dias)
                const dataExpiracao = new Date();
                dataExpiracao.setDate(dataExpiracao.getDate() + 30);

                await supabase
                    .from('users')
                    .update({
                        plano: 'pro',
                        status_pagamento: 'ativo',
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
});

/**
 * GET status-assinatura/:userId
 */
app.get('/api/status-assinatura/:userId', async (req, res) => {
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

/**
 * Endpoint para responder mensagem de suporte e enviar e-mail real
 */
app.post('/api/support/reply', async (req, res) => {
    const { messageId, email, subject, replyText } = req.body;

    if (!messageId || !email || !replyText) {
        return res.status(400).json({ error: 'Dados incompletos.' });
    }

    try {
        // 1. Enviar e-mail real
        await transporter.sendMail({
            from: `"Suporte EduTecPro" <${process.env.SUPPORT_EMAIL || 'edutecprof1@gmail.com'}>`,
            to: email,
            subject: `Re: ${subject || 'Suporte EduTecPro'}`,
            text: replyText,
        });

        // 2. Atualizar no Supabase
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
        res.status(500).json({ error: 'Erro ao enviar e-mail.' });
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
        res.status(500).json({ error: 'Falha na sincronização.' });
    }
});

// Para desenvolvimento local
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const PORT = process.env.PORT || 3001;
    app.listen(PORT, () => console.log(`Rodando localmente na porta ${PORT}`));
}

// Exportar para o Vercel Serverless
export default app;

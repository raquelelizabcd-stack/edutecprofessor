import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from 'https://esm.sh/stripe@14.16.0?target=deno';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { email, action } = await req.json();
        const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');

        if (!stripeSecretKey) {
            throw new Error('STRIPE_SECRET_KEY não configurada no Supabase');
        }

        const stripe = new Stripe(stripeSecretKey);

        if (action === 'portal') {
            // Busca o cliente pelo e-mail
            const { data: customers } = await stripe.customers.list({ email, limit: 1 });

            if (customers.length === 0) {
                return new Response(
                    JSON.stringify({ error: 'Nenhuma assinatura ativa encontrada para este e-mail no Stripe.' }),
                    { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
                );
            }

            const session = await stripe.billingPortal.sessions.create({
                customer: customers[0].id,
                return_url: 'http://localhost:3000/dashboard', // O Stripe redireciona de volta para cá
            });

            return new Response(
                JSON.stringify({ url: session.url }),
                { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            );
        }

        return new Response(
            JSON.stringify({ error: 'Ação não suportada' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );

    } catch (error) {
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
    }
});

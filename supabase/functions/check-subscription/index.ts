import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "npm:@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const logStep = (step: string, details?: any) => {
  console.log(`[CHECK-SUBSCRIPTION] ${step}${details ? ` - ${JSON.stringify(details)}` : ""}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseAdmin.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Get local subscription record
    const { data: localSub } = await supabaseAdmin
      .from("subscriptions")
      .select("id, status, trial_end, stripe_customer_id")
      .eq("user_id", user.id)
      .single();

    if (!localSub) {
      return new Response(JSON.stringify({ subscribed: false, status: "none" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });

    // Find Stripe customer
    let customerId = localSub.stripe_customer_id;
    if (!customerId) {
      const customers = await stripe.customers.list({ email: user.email, limit: 1 });
      if (customers.data.length > 0) {
        customerId = customers.data[0].id;
        await supabaseAdmin
          .from("subscriptions")
          .update({ stripe_customer_id: customerId })
          .eq("id", localSub.id);
        logStep("Synced stripe_customer_id", { customerId });
      }
    }

    // Check for active Stripe subscription
    let subscribed = false;
    let subscriptionEnd: string | null = null;

    if (customerId) {
      const subs = await stripe.subscriptions.list({
        customer: customerId,
        status: "active",
        limit: 1,
      });

      if (subs.data.length > 0) {
        subscribed = true;
        const sub = subs.data[0];
        subscriptionEnd = new Date(sub.current_period_end * 1000).toISOString();

        // Sync to local DB
        if (localSub.status !== "active") {
          await supabaseAdmin
            .from("subscriptions")
            .update({
              status: "active",
              stripe_subscription_id: sub.id,
            })
            .eq("id", localSub.id);
          logStep("Updated status to active");
        }

        return new Response(
          JSON.stringify({ subscribed: true, status: "active", subscription_end: subscriptionEnd }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // No active Stripe subscription — check trial expiry
    const trialEnd = new Date(localSub.trial_end);
    const now = new Date();

    if (localSub.status === "trialing" && now > trialEnd) {
      await supabaseAdmin
        .from("subscriptions")
        .update({ status: "paused" })
        .eq("id", localSub.id);
      logStep("Trial expired, set to paused");

      return new Response(
        JSON.stringify({ subscribed: false, status: "paused", trial_end: localSub.trial_end }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Still trialing
    logStep("Returning current status", { status: localSub.status });
    return new Response(
      JSON.stringify({
        subscribed: false,
        status: localSub.status,
        trial_end: localSub.trial_end,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: msg });
    return new Response(JSON.stringify({ error: msg }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

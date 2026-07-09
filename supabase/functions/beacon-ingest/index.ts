// Beacon ingest endpoint.
// POST JSON with header `x-beacon-secret: <BEACON_INGEST_SECRET>`.
// Upserts into businesses / systems / checklist_items and optionally records readiness_snapshots.
//
// Payload shape:
// {
//   "business": {
//     "user_id": "<uuid>",                 // required — owner of the row
//     "name"?: string,
//     "industry"?: string,
//     "naics_code"?: string,
//     "zip_code"?: string,
//     "team_size"?: string,
//     "revenue_range"?: string,
//     "years_in_business"?: string
//   },
//   "systems"?: [
//     { "system_key": "administration" | "training" | "products" | "current_campaign"
//                    | "growth" | "logistics" | "marketing" | "finance",
//       "badge_level"?: 0|1|2|3, "is_activated"?: boolean,
//       "checklist"?: [ { "item_key": "item_1" | "item_2" | ... | "item_5", "is_completed": boolean } ]
//     }
//   ],
//   "readiness_snapshot"?: { "score": number, "stage": string }
// }

import { createClient } from 'npm:@supabase/supabase-js@2';
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';
import { z } from 'npm:zod@3.23.8';

const ChecklistSchema = z.object({
  item_key: z.string().min(1).max(64),
  is_completed: z.boolean(),
});

const SystemSchema = z.object({
  system_key: z.enum([
    'administration',
    'training',
    'products',
    'current_campaign',
    'growth',
    'logistics',
    'marketing',
    'finance',
  ]),
  badge_level: z.number().int().min(0).max(3).optional(),
  is_activated: z.boolean().optional(),
  checklist: z.array(ChecklistSchema).optional(),
});

const PayloadSchema = z.object({
  business: z.object({
    user_id: z.string().uuid(),
    name: z.string().max(255).optional(),
    industry: z.string().max(255).optional(),
    naics_code: z.string().max(16).optional(),
    zip_code: z.string().max(16).optional(),
    team_size: z.string().max(32).optional(),
    revenue_range: z.string().max(32).optional(),
    years_in_business: z.string().max(32).optional(),
  }),
  systems: z.array(SystemSchema).optional(),
  readiness_snapshot: z
    .object({
      score: z.number().min(0).max(100),
      stage: z.enum(['Emerging', 'Established', 'Advancing', 'Scalable', 'Exit Ready']),
    })
    .optional(),
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const expected = Deno.env.get('BEACON_INGEST_SECRET');
  if (!expected) return json({ error: 'Server misconfigured: BEACON_INGEST_SECRET missing' }, 500);
  const provided = req.headers.get('x-beacon-secret');
  if (!provided || provided !== expected) return json({ error: 'Unauthorized' }, 401);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  const parsed = PayloadSchema.safeParse(body);
  if (!parsed.success) {
    return json({ error: 'Validation failed', details: parsed.error.flatten() }, 400);
  }
  const { business, systems, readiness_snapshot } = parsed.data;

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false } },
  );

  try {
    // 1. Upsert business (one per user_id — single-tenancy).
    const { data: existing, error: findErr } = await admin
      .from('businesses')
      .select('id')
      .eq('user_id', business.user_id)
      .maybeSingle();
    if (findErr) throw findErr;

    let businessId: string;
    if (existing) {
      businessId = existing.id;
      const { error: updErr } = await admin
        .from('businesses')
        .update(business)
        .eq('id', businessId);
      if (updErr) throw updErr;
    } else {
      const { data: inserted, error: insErr } = await admin
        .from('businesses')
        .insert(business)
        .select('id')
        .single();
      if (insErr) throw insErr;
      businessId = inserted.id;
    }

    // 2. Update systems + checklist items.
    const systemResults: Array<{ system_key: string; ok: boolean; error?: string }> = [];
    if (systems?.length) {
      for (const sys of systems) {
        try {
          const patch: Record<string, unknown> = {};
          if (sys.badge_level !== undefined) patch.badge_level = sys.badge_level;
          if (sys.is_activated !== undefined) patch.is_activated = sys.is_activated;

          let systemId: string | null = null;
          if (Object.keys(patch).length) {
            const { data: updRows, error: sysErr } = await admin
              .from('systems')
              .update(patch)
              .eq('business_id', businessId)
              .eq('system_key', sys.system_key)
              .select('id')
              .maybeSingle();
            if (sysErr) throw sysErr;
            systemId = updRows?.id ?? null;
          }
          if (!systemId) {
            const { data: found, error: fErr } = await admin
              .from('systems')
              .select('id')
              .eq('business_id', businessId)
              .eq('system_key', sys.system_key)
              .maybeSingle();
            if (fErr) throw fErr;
            systemId = found?.id ?? null;
          }
          if (!systemId) throw new Error(`system ${sys.system_key} not found for business`);

          if (sys.checklist?.length) {
            for (const item of sys.checklist) {
              const { error: ciErr } = await admin
                .from('checklist_items')
                .update({ is_completed: item.is_completed })
                .eq('system_id', systemId)
                .eq('item_key', item.item_key);
              if (ciErr) throw ciErr;
            }
          }
          systemResults.push({ system_key: sys.system_key, ok: true });
        } catch (e) {
          systemResults.push({
            system_key: sys.system_key,
            ok: false,
            error: e instanceof Error ? e.message : String(e),
          });
        }
      }
    }

    // 3. Optional explicit snapshot (badge_level changes also auto-snapshot via trigger).
    if (readiness_snapshot) {
      const { error: snapErr } = await admin.from('readiness_snapshots').insert({
        business_id: businessId,
        score: readiness_snapshot.score,
        stage: readiness_snapshot.stage,
      });
      if (snapErr) throw snapErr;
    }

    return json({ ok: true, business_id: businessId, systems: systemResults });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('beacon-ingest error', msg);
    return json({ error: msg }, 500);
  }
});

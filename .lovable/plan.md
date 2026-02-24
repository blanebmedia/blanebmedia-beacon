

# Stripe Checkout Integration: 14-Day Founder Trial

## Overview

Integrate Stripe billing into Beacon with a 14-day Founder Trial. New users start trialing with a 2-system activation cap. After subscribing to Beacon Pro ($19/month), they unlock all 8 systems.

## Stripe Product

- **Product**: Beacon Pro (`prod_U2SBVJGVpgk9Oa`)
- **Price**: $19/month (`price_1T4NGhEFaP20Ysw8VVszBcHq`)

---

## What Gets Built

### 1. Three Backend Functions

**`create-checkout`** -- Creates a Stripe Checkout session for the authenticated user. Looks up or creates a Stripe customer by email, then redirects to Stripe's hosted checkout page for the $19/month subscription.

**`check-subscription`** -- Queries Stripe for the user's active subscription status. Called on page load and periodically. Returns whether the user is subscribed, plus subscription end date. Also syncs status back to the `subscriptions` table (updates `stripe_customer_id`, `stripe_subscription_id`, and `status`).

**`customer-portal`** -- Creates a Stripe Customer Portal session so users can manage billing, cancel, or update payment methods.

### 2. Subscription State Hook

A new `useSubscription` hook that:
- Calls `check-subscription` on mount and every 60 seconds
- Exposes `{ subscribed, loading, checkNow }` to any component
- Used by Dashboard and SystemChecklist to gate features

### 3. Dashboard Updates

- Show a **"Subscribe to Beacon Pro"** banner when the user is trialing, with days remaining in trial
- Add a **"Manage Subscription"** button when subscribed
- Show trial expiry warning when less than 3 days remain
- When trial has expired and user hasn't subscribed, show a frozen/read-only state

### 4. System Activation Cap Enforcement

The existing 2-system cap in `SystemChecklist.tsx` already checks `sub.status === 'trialing'`. This will be enhanced:
- If `subscribed === true` (active Stripe subscription), remove the cap entirely
- If trialing and under 2 activations, allow activation
- If trial expired (`status === 'paused'`), block all interactions and show upgrade prompt

### 5. Trial Expiry Logic

- The `check-subscription` function checks if `trial_end` has passed and no active Stripe subscription exists
- If expired, it updates `subscriptions.status` to `'paused'`
- Dashboard renders read-only when paused

---

## Technical Details

### Files Created

| File | Purpose |
|------|---------|
| `supabase/functions/create-checkout/index.ts` | Stripe Checkout session creation |
| `supabase/functions/check-subscription/index.ts` | Subscription status verification |
| `supabase/functions/customer-portal/index.ts` | Stripe billing portal access |
| `src/hooks/use-subscription.ts` | Frontend subscription state hook |

### Files Modified

| File | Changes |
|------|---------|
| `supabase/config.toml` | Add `verify_jwt = false` for all 3 functions |
| `src/pages/Dashboard.tsx` | Add subscribe/manage buttons, trial banner, paused state |
| `src/pages/SystemChecklist.tsx` | Use subscription state for activation gating |

### Edge Function Auth Pattern

All three functions validate the JWT in code using the Supabase client's `getUser()`, rather than relying on `verify_jwt` in config. This follows the project's signing-keys setup.

### Subscription Flow

```text
New User Signs Up
       |
       v
  14-day Trial (2 system cap)
       |
       +---> Clicks "Subscribe" ---> Stripe Checkout ---> Active Subscriber (all 8 systems)
       |
       +---> Trial Expires ---> Status = "paused" ---> Dashboard frozen, upgrade prompt shown
```

### Data Sync

The `check-subscription` function syncs Stripe data back to the `subscriptions` table:
- `stripe_customer_id` -- stored on first checkout
- `stripe_subscription_id` -- stored when active subscription found
- `status` -- kept in sync (`trialing` / `active` / `paused`)

This keeps the local DB as a cache while Stripe remains the source of truth.




# Beacon — Phase 1 MVP Implementation Plan

## Overview
Beacon is a **Business Systems Readiness Platform** that helps founders assess and improve their operational maturity across 8 business systems. Phase 1 delivers the core loop: onboarding → system activation → checklists → badges → Brand Readiness Score.

---

## Step 1: Backend Setup (Supabase + Auth)
- Enable Supabase for database and authentication
- Set up **email/password auth** with a profiles table
- Create database tables:
  - `businesses` (name, industry, linked to user)
  - `systems` (8 rows per business, tracking activation status & badge level)
  - `checklist_items` (5 per system, tracking completion)
  - `subscriptions` (status: trialing/active/paused, trial dates)
  - `readiness_snapshots` (frozen score & stage for paused accounts)
- Add Row Level Security so each user only sees their own data

## Step 2: Systems Registry & Core Logic
- Build a **registry of all 8 systems** with metadata (name, description, checklist definitions, "Common Starting Point" tags for Marketing & Finance)
- Implement **badge level calculation**: 0 items → Level 0, 1–2 → Level 1, 3–4 → Level 2, 5 → Level 3
- Implement **Brand Readiness Score** (0–100): Level 2 = 6.25 pts, Level 3 = 12.5 pts per system
- Implement **Readiness Stage** mapping (Emerging → Exit Ready) with the **floor rule**: stage can't exceed "Structured" unless both Marketing and Finance are at Level 2+
- Score stays **hidden** until at least one system reaches Level 2
- Add unit tests for badge mapping, score calculation, stage + floor rule

## Step 3: Onboarding Wizard (5 Steps)
- **Step 1 – Welcome**: "Activate your first system to unlock your Brand Readiness."
- **Step 2 – Business Profile**: Business name + industry input
- **Step 3 – Choose First System**: Grid of all 8 systems with descriptions; Marketing & Finance tagged as "Common Starting Points"
- **Step 4 – Complete Checklist**: Show the 5 checklist items for the chosen system
- **Step 5 – Score Reveal**: If system reaches Level 2+, show score & stage; otherwise prompt "Complete 3 items to unlock Brand Readiness"

## Step 4: Executive Dashboard
- **Brand Readiness Score** display (or "Activate a system to calculate" placeholder)
- **Readiness Stage** label with visual indicator
- **Account Status**: Trialing / Active / Paused badge
- **Activation count**: "You've activated X of 8 systems"
- **8-System Grid**: Each system card shows badge level, status label, and brief description
  - Active systems are clickable → opens checklist page
  - Inactive systems show "Activating Soon" (no lock/barrier language)
- **Suggested Next System** panel after a system hits Level 2+

## Step 5: System Checklist Pages
- **Marketing & Finance**: Fully interactive — 5 checkboxes per system, badge recalculates on toggle
- **Other 6 systems**: Read-only preview with grayed-out checklist items
- Badge level indicator updates live as items are checked/unchecked
- Score only recalculates when a badge **crosses a threshold** (reaches Level 2 or Level 3), not on every checkbox

## Step 6: Trial & Billing (Stripe)
- Enable Stripe integration for subscription checkout
- **14-day Founder Trial** (card required at signup via Stripe Checkout)
- **2-system activation cap** during trial — attempting a 3rd shows upgrade modal
- **Trial expiry without subscription**:
  - Dashboard becomes read-only
  - Score & badges freeze (snapshot stored)
  - Status shows "Paused" with "Resume by subscribing" CTA
- **After subscribing**: activation cap removed, full access restored

## Step 7: Design & Polish
- **Navy / slate / gold** professional color palette
- Clean, executive-grade typography and spacing
- Responsive layout (desktop-first, mobile-friendly)
- Smooth transitions for score reveals and badge level changes

---

## What This Delivers
A complete MVP where a founder can sign up, activate up to 2 systems during trial, complete checklists to earn badges, see their Brand Readiness Score evolve, and subscribe to unlock all 8 systems.

## Phase 2 Hooks (not built now, but architecture supports)
- Time-based checklist staleness / regression
- Additional system activation beyond Marketing & Finance
- Detailed analytics per system
- Team/advisor views


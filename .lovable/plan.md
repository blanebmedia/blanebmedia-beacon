
# Mobile Responsiveness Fixes (375px viewport)

## Findings

After reviewing the landing page and dashboard at 375px width:

- **Landing page**: Hero, sections, and systems grid all render well. The footer links row is slightly tight but functional since the layout already stacks vertically on mobile via `flex-col` / `sm:flex-row`.
- **Dashboard header**: The header packs the business name, a status badge, "Manage Subscription" button, and "Sign Out" button in a single `flex justify-between` row -- this will overflow or cramp on 375px screens.
- **Dashboard banners** (paused/trial/suggestion cards): Each uses `flex items-center justify-between` with text on the left and a button on the right -- these will squeeze together on narrow screens.

## Changes

### 1. Dashboard header (`src/pages/Dashboard.tsx`, lines 163-176)

- Stack the header vertically on mobile: business name/title on top, action buttons below
- Use `flex-col sm:flex-row` for the outer container
- Wrap the action buttons with `flex-wrap` so they flow naturally on small screens

### 2. Dashboard banners (paused, trial, suggestion cards)

- Change the banner `CardContent` layout from `flex items-center justify-between` to `flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3`
- This makes the text stack above the button on mobile, and sit side-by-side on wider screens
- Applies to three cards: paused banner (~line 183), trial banner (~line 196), and suggestion card (~line 244)

### 3. Landing page footer (minor polish, `src/pages/Index.tsx`, line 235)

- Add `flex-wrap justify-center` to the footer links row so items wrap gracefully if viewport is very narrow
- This is a minor improvement; the current layout already works adequately

## Technical Details

- All fixes use responsive Tailwind utilities (`flex-col sm:flex-row`, `flex-wrap`)
- No structural or component changes required
- Two files modified: `src/pages/Dashboard.tsx` and `src/pages/Index.tsx`

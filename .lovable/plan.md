

# Add Terms of Service and Privacy Policy Links

## Overview

Link to your existing legal pages (blanebmedia.com/terms and blanebmedia.com/privacy) from the landing page footer and the sign-up form.

## Changes

### 1. Landing page footer (`src/pages/Index.tsx`)

- Add "Terms of Service" and "Privacy Policy" links next to the copyright text
- Links open in a new tab pointing to your existing pages

### 2. Auth page (`src/pages/Auth.tsx`)

- Add a small disclaimer below the "Create Account" button (visible only in signup view):
  *"By creating an account, you agree to our Terms of Service and Privacy Policy."*
- Both link to your blanebmedia.com pages in a new tab

## Technical Details

- Two files modified: `src/pages/Index.tsx` (footer section) and `src/pages/Auth.tsx` (signup footer)
- External links use `target="_blank"` and `rel="noopener noreferrer"`
- No new pages or database changes required


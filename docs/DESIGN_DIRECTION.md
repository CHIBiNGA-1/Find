# f!nd — Product design direction

## Design objective

A capable campus marketplace with an editorial, product-led interface. The interface should be quiet; capability should be expressed through fast, predictable workflows rather than explanatory copy.

## Seven disciplines guiding the redesign

1. Product strategy — preserve the campus marketplace's core jobs and prioritize discovery, listing, and communication.
2. Interaction design — reduce steps, expose the next useful action, and make state changes legible.
3. Visual design — establish hierarchy through typography, proportion, image treatment, alignment, and restraint.
4. Information architecture — keep five primary destinations; surface requests and lost-and-found contextually.
5. Usability — remove redundant explanation and ensure empty, loading, error, and success states remain useful.
6. Frontend architecture — reuse shared components and tokens; preserve server-side data access and route behaviour.
7. Accessibility and performance — keyboard access, visible focus, responsive touch targets, reduced motion, optimized media, and honest states.

## Visual language

- Warm near-white canvas, deep evergreen ink, restrained yellow punctuation/price accent.
- Bricolage Grotesque remains the product typeface; hierarchy comes from scale, weight, and spacing rather than decorative treatments.
- Product photography leads listing cards. Avoid enclosing every item in a card.
- Hairlines and whitespace establish grouping; use surfaces only when they communicate a real boundary.
- Compact category navigation, strong search, restrained actions, and product-first grids.
- Mobile is a composed touch interface with safe-area-aware bottom navigation, not a shrunken desktop.

## Workflow priorities

1. Discover: search, category browse, filters, listing detail, save, contact seller.
2. Sell: create listing, add/reorder media, preview, publish, manage status.
3. Communicate: conversation list, listing context, message delivery/retry, report/block.
4. Participate: requests and lost-and-found, without competing with primary navigation.
5. Manage identity: profile, listings, saved items, reputation, settings, account controls.

## Implementation boundary

This redesign changes presentation and interaction composition only. Existing Supabase schema, RLS, authentication, storage, server actions, route contracts, and Render/Vercel deployment assumptions are preserved. Database migrations and production environment settings must not be reset or replaced as part of visual work.

## Current implementation slice

- Replaced the home promotional hero with a compact campus identity, functional search, category rail, product-led listing grid, and restrained community modules.
- Added a dedicated home visual system for typography, spacing, navigation actions, product grids, and community panels.
- Refined the global content width and desktop navigation treatment.

This is the first implementation slice, not a claim that every route has completed the redesign. Explore, listing detail, sell, messages, profile, settings, onboarding, and moderation still require route-by-route workflow and visual passes.

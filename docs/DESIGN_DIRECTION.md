# Design direction

**Principle: elegance in every way.** Quiet interfaces, strong function, one memorable element.

## Identity
- **Signature: the swing-tag price.** A yellow tag with a punched hole sits on every photo. It is real content (the price) doing the branding. Highlighter yellow appears nowhere else except the "!" in the wordmark and unread badges.
- **Evergreen** is for action and brand. **Near-white paper** is the canvas. Structure comes from hairlines and spacing; surfaces appear only where something is a real object (a sheet, a message bubble).
- **Type:** Bricolage Grotesque with its width axis (`wdth.css`). Condensed (78-82%) for headings, normal width for reading. Roles: `t-page`, `t-section`, `t-meta`, `label`, `hint`.
- Tokens (colour, radius, layout widths, z-layers, easing) live in `src/app/globals.css`. Changing the brand means editing that one file.

## Navigation
Five destinations, identical on every screen size: **Home, Explore, Sell, Messages, You**. Desktop uses a left rail (with a "Campus" group for Requests and Lost and found). Phones use a bottom bar with Sell as the one filled action, safe-area padding, and a back-button top bar on deep screens. Chat and listing screens hide the tab bar because they own a bottom action bar.

## Rules we hold ourselves to
- Content first: no hero sections, no promotional copy, no invented activity. "Saved most this week" and "More <category>" only appear when real data exists.
- Lists are hairline rows, not boxed cards. Empty states say what is missing and offer one next step.
- Every control has a real outcome and honest failure feedback. Destructive actions ask first.
- Target WCAG 2.2 AA: visible focus, 44px+ touch targets, reduced-motion support, labelled controls, polite live regions.

# Chautari — Build Brief (Prototype Scope)

Mobile-first community app for the Nepali diaspora in Australia (Greater Melbourne, v1). Users publish posts and get answers from community members and verified local experts (migration agents, accountants, GPs, etc.); each answer can have replies (one level). Terminology: **Post → Answers → Replies**. Stack: React Native (Expo). English only. No dark mode.

## Personas
- Poster: recent grad on a visa, posts about visa/tax/life topics, wants fast credible answers, sometimes anonymously.
- Verified Expert: e.g. MARA migration agent, answers to build reputation, has a public profile with a contact link.
- Community Answerer: long-time resident who answers from lived experience.

## Screens to build
1. Splash (animated logo, 1.5s)
2. Welcome 1 + Welcome 2 (value props, Continue button)
3. Phone Entry (+61 prefilled, AU mobile validation)
4. OTP Verification (6 digits, resend after 60s, 3 attempts) — MOCK: accept any code
5. Profile Setup — Name (required)
6. Profile Setup — Suburb & Photo (both optional, skippable)
7. Home Feed with two tabs: For You (mixed) + Following (followed only)
8. Categories Browser (grid of 8 categories with counts)
9. Search (bar + filters: category, suburb, date range) + Search Results
10. Ask Composer (title, body, category dropdown, up to 5 photos, anonymous toggle)
11. Post Detail (post + threaded answers; verified-expert answers pinned to top)
12. Answer Composer modal (body, link insert, anonymous toggle)
13. Expert Directory (browse all, filter by category + suburb)
14. Expert Profile (bio, profession, suburb, contact button, posts feed, follower count)
15. Verified Expert Application (category select or custom, credential upload, submit)
16. Notifications screen (list, mark-read on view)
17. My Profile (posts, follower/following counts, edit button)
18. Other User Profile (follow button)
19. Edit Profile (name, photo, suburb)
20. Settings (logout, delete account, help, T&Cs, privacy)
21. Report Content modal + Report Expert modal (reason picker + optional text)
22. Confirmation modals (posted, deleted, etc.)

## Categories (fixed, 8)
Migration · Tax & Super · Health & Medical · Real Estate · Loans & Mortgages · IT & Careers · General / Life in Australia · Others

## Core rules (enforce client-side where possible)
- Auth: phone OTP only, no passwords. Multi-device ok. MOCK the OTP.
- Post: title 10–120 chars, body 30–4000 chars, category required, up to 5 photos, anonymous toggle hides name/photo/suburb.
- Answer: any user, body 20–4000 chars, links allowed, no photos, anonymous toggle. Verified expert answers pinned to top of thread.
- Reply: one level of nesting only, 5–1000 chars, links allowed, no photos, anonymous toggle.
- Upvotes: one per user per answer/reply, toggle off by tapping again. Milestone notifications at 5,10,20,50,100,200,500.
- Following: one-way, no requests. Own followers visible to self only. Following count public.
- Verified expert: claim badge → pick category (or custom) → upload credentials → admin review (mock as auto-approve or pending). Badge shown on profile + answers. Expert posts capped 2/day, no promo language.
- Anonymous mode: shows "Anonymous" + placeholder avatar.
- Account deletion: hard delete, re-auth via OTP.
- No profile photo → auto first-letter avatar.

## Out of scope (do NOT build)
Direct messages, blocking, editing posts, best-answer marking, photos in replies, @-mentions, notification preferences, profile privacy, in-app payments, bilingual UI, dark mode, public web app, real backend.

## Data layer
Mock everything locally — in-memory or AsyncStorage. Seed ~15 sample posts across categories, a dozen answers, and 3 verified experts based on the personas above. No Twilio, Supabase, Firebase, or real API keys.

## Done criteria
App launches clean with `npx expo start`, all listed screens reachable, core flows work (signup → feed → ask → answer → expert profile → follow). Include a README explaining what's implemented vs mocked and how to run it.

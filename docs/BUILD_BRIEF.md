Chautari — Build Brief v2 (Polished Prototype)
You are rebuilding/upgrading the Chautari prototype to an exceptional standard. Read PRD.md in this folder first — it is the source of truth for features and rules. This document defines the DESIGN DIRECTION, ENGAGEMENT PSYCHOLOGY, and QUALITY BAR. Where this brief and the PRD agree, follow both. Where this brief adds detail (UI, motion, feel), this brief governs.
Working mode

Work fully autonomously. Do not stop to ask questions. Record assumptions in README.
Mock ALL data and auth locally (in-memory + AsyncStorage). No Twilio, no Supabase, no Firebase, no real API keys. OTP accepts any 6 digits.
Expo SDK 54. React Native. Make sure npx expo start bundles with zero errors before declaring done.
Commit to git frequently with clear messages.
Seed rich, realistic data (see "Seed data" below) — the app must feel populated and alive on first launch, never empty.

The ONE feeling: "This is alive"
Every decision serves one goal: a first-time user must feel, within 30 seconds, that this place is active and people are answering right now. This is primarily a SIGNALS problem, not decoration. Implement these "alive" signals throughout:

Relative timestamps everywhere: "just now", "4 min ago", "2 hr ago". Never raw dates in the feed.
Live-feeling answer counts: each post card shows answer count and, if an expert answered, a distinct "Expert answered" marker with visual weight (badge + subtle accent), not just text.
Recency motion: new/recent cards get a subtle entrance animation (fade + slight rise, ~250ms, staggered). Use React Native Animated or Reanimated if available; keep it tasteful, never bouncy/childish.
"Answered fast" cue: if a post got its first answer quickly, surface it ("First answer in 18 min") — reinforces that posting here gets results.
Activity texture: a thin, quiet "live" indicator on the For You tab (e.g. a soft pulsing dot near a "X new today" pill). Subtle, not a casino.
Optimistic UI: posting a post/answer/upvote reflects instantly before the mock "saves". Makes it feel responsive and real.

Visual language: modern, with subtle Nepali warmth
Mostly clean and modern. Identity shows through warmth and small touches, NOT heavy motifs.

Color: a warm, confident primary — a deep crimson/Nepali red used sparingly as the accent (buttons, active states, expert markers), NOT as big fills. Neutrals carry the layout (warm off-white background, near-black text, soft grey borders). One warm secondary (a saffron/marigold) used only for highlights like upvote milestones and the expert "alive" marker. Define all of this as tokens in a single theme file.
Typography: a clean modern sans for UI; allow a slightly characterful display weight for screen titles and the wordmark. Clear type scale (display / title / body / caption). Generous line-height for readability — Askers read a lot of text.
Subtle Nepali nods (restrained): a small repeating motif (e.g. a simple geometric pattern inspired by Nepali textile/architecture) used ONLY in empty states, the splash, and section dividers — never loud. Warm, human microcopy in places ("Namaste" only where natural, not forced). The point is belonging felt quietly, not flags everywhere.
Depth: soft shadows, generous rounding (cards ~16px radius), comfortable spacing. Mobile-first, thumb-reachable primary actions.
Light mode only. No dark mode.

PRIORITY: polish the core flow to exceptional
If time runs short, the feed → ask → answer loop must be flawless before anything else. Spend disproportionate effort here.
Home Feed (For You + Following)

Post cards are the heart. Each card: author (or "Anonymous" + placeholder), suburb chip, category chip, relative time, title (prominent), 1–2 line body preview, answer count, upvote count, and the "Expert answered" marker when applicable. Expert-answered cards get subtle elevated treatment.
For You = smart mix; Following = followed only with a warm empty state if following no one ("Follow experts and members to build your feed" + 2–3 suggested experts inline).
Pull-to-refresh that feels good. Staggered card entrance on load.
A prominent, thumb-friendly "Post" FAB that feels inviting, not generic.

Post Composer

This is where posters commit. Reduce friction and anxiety. Live character counts that turn warm-green when valid, not punishing red. Category as friendly chips, not a dull dropdown. Anonymous toggle presented as SAFE and clear ("Post anonymously — your name, photo, and suburb stay hidden"), with a tiny preview of how the post will appear. Photo attach up to 5 with clean thumbnails. Posting shows optimistic success + a satisfying confirmation, then drops them into the live thread.

Post Detail + Answering

Post at top, full and readable. Verified-expert answers PINNED above community answers with clear visual hierarchy (expert badge, accent border/tint). Community answers below, sortable by upvotes/recency. One-level threaded replies. Upvote interaction is instant and satisfying (subtle scale/heart-fill animation; saffron flash at a milestone). Answer composer as a clean modal with link insertion and the same safe anonymous toggle.

Engagement mechanics (secondary, but make these delightful)

Upvotes: instant, tactile, with milestone moments (5/10/20/50/100/200/500) that feel rewarding — a brief saffron celebration + a milestone notification entry. Never spammy.
Follow/unfollow: one-tap, optimistic, with a warm confirmation. Following count visible.
Notifications screen: rich, grouped, with the distinct "An expert answered your post" notification visually elevated above ordinary ones. Unread state clear; mark-read on view.
First-letter avatars: auto-generated, colorful-but-tasteful, deterministic per name. Anonymous = neutral placeholder.

Seed data (make it feel alive on launch)

~20–25 posts across all 8 categories, with realistic Nepali-Australian context (visa 485/PR topics, tax/super, finding a GP, rental applications, mortgage as a temp resident, IT job hunting in Melbourne, etc.). Varied relative timestamps (some "just now", some hours/days old).
~40–60 answers spread across them; several posts with a pinned verified-expert answer.
5–6 verified experts with believable profiles (a MARA migration agent, an accountant, a GP, a mortgage broker, an IT professional), bios, suburbs, follower counts, and a few expert posts each.
A handful of community answerers. Realistic upvote counts (a few near milestones to show the mechanic).
The signed-in user starts following 1–2 experts so the Following tab isn't empty.

Build everything in the PRD EXCEPT
Skip only what genuinely needs server/3rd-party work: real OTP delivery, real push delivery, real file storage, the web admin panel. Mock these (OTP accepts anything; notifications are local/in-app; uploads are local URIs). EVERYTHING else — all listed mobile screens, all client-enforceable rules (character limits, rate-limit messaging, anonymous mode, follow, upvote, report flows, expert application, account deletion flow) — must actually work end to end against the mock data layer.
Quality bar / definition of done

App bundles and runs via npx expo start with zero errors.
The feed → post → answer loop is genuinely polished: animations, optimistic updates, empty/loading/error states all handled.
Every listed screen is reachable and functional against mock data.
Consistent theme tokens; no hardcoded one-off colors.
README explains: what's implemented, what's mocked and why, the design decisions made, and how to run it.
Code is clean, componentized, and commented where non-obvious.

What "exceptional" means here (so you don't default to generic)
Exceptional is NOT gradients, glassmorphism, or confetti everywhere. It is: tight visual hierarchy, restraint, meaningful motion that signals "alive", microcopy that feels human and Nepali-warm, empty states that invite action, and a feed that makes someone think "people are actually here, I'll post mine." Aim for something that would make a Melbourne Nepali grad trust it and come back.

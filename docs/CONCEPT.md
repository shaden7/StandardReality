# StandardReality — Concept and Architecture (v0.1)

## Vision

StandardReality is a **persistent emergent storytelling sandbox**, not a traditional game. Players and autonomous agents can attempt arbitrary actions. The simulation determines what is possible and records consequences. There is no win condition, obligatory quest, or predetermined plot.

**Design test:** Does the world produce interesting, causally explainable situations that nobody explicitly scripted?

## Experience: a first playable slice

- A compact 2D slice of a giant mobile industrial crawler: canteen, workshop, engine room, airlock, plus a tiny alien exterior patch. See [SETTING.md](SETTING.md).
- Up to 8 prototype NPCs with goals, basic routines, relationships, and private knowledge.
- Player moves, observes, inspects and types natural-language intentions.
- Physical entities have identities, components, inventory, location and state.
- Every meaningful action produces observable events, durable state changes, and optionally NPC memories.
- A debug panel exposes world state, proposed actions, rejected actions, event chains, prompts, cost and latency.

Example: "I climb onto the table and accuse the navigator of stealing salvage." The parser proposes a climb and speech action. The core engine resolves reachability and resulting positions; observers interpret the accusation based on their beliefs; nearby agents may react or pursue their own goals. Neither an automatic mob riot nor any particular conclusion is hard-coded.

## Setting direction

The world is set aboard a gigantic, slowly moving crawler carrying a small society through strange terrain. It performs recovery, inspection and repair jobs issued by an opaque navigation system; this is background context, **not a required player quest**. First slice stays bounded and need not simulate continuous overland motion. [Setting bible and prototype scope](SETTING.md).

## Layers (interfaces first, boundaries provisional)

1. **World model:** entities, components, spatial map, physical resources and world clock; authoritative state.
2. **Action proposal and resolution:** free text -> structured, versioned action proposal -> precondition checks -> atomic effects -> domain events. An attempt may fail or yield partial success.
3. **Social cognition:** NPC drives/goals, limited perception, knowledge provenance, memory, interpersonal attitudes; bounded LLM decisions only when needed.
4. **Narrative projection:** optional text descriptions, event feed, scene summaries and retrospectives, derived from the event stream, never a second source of truth.
5. **2D UI:** rendering, player input, object selection, timeline and developer tools; no game rules hidden in presentation.

An LLM is **not** the frame-by-frame simulation engine. Deterministic processes run at a fixed update step. LLM invocations are asynchronous proposals at decision boundaries. The sim can pause/continue for a player proposal in the initial single-player prototype.

## Three tiers of mechanics

- **Tier 0 — built-ins:** movement, reach, inventory, transfer, damage, temperature or other limited generic primitives.
- **Tier 1 — composition:** LLM creates a structured plan from existing primitives and predicates; evaluator validates and executes it.
- **Tier 2 — experimental rule extension:** LLM proposes a new rule or mechanism. A registry tests scope, dependencies, conflicts, and possible effects before activation; reversible versioning and state snapshots are preferable to unconstrained dynamic code execution.

The MVP uses Tiers 0–1 only. Tier 2 is deliberately left as a research experiment rather than prematurely adding arbitrary runtime code execution.

## Canonical event protocol

A proposal contains: `id`, `actorId`, `intent`, `preconditions`, `steps`, and `expectedEffects`. The resolver emits events such as `ActionAttempted`, `ActionRejected`, `PositionChanged`, `ObjectDamaged`, `StatementHeard`, `BeliefUpdated`. Event consumers are idempotent. Save state snapshots plus a chronological append-only event log and random seed; track schema and rule versions. Deterministic replay is a target for Tier 0, not a promise for re-running LLM calls: store model outputs as recorded proposals.

**Keep truth separate from belief:** the world can record that a character made an accusation; individual NPCs can believe, doubt, misremember or lie about it. The narrator must not confuse claims with facts.

## Consequence propagation

Events affect nearby systems, and observers respond according to perception and goals. Use bounded propagation (per-tick budgets, loop detection) to avoid infinite event cascades. Meaningful surprises should arise from shared primitives and independent agent goals, not a model fabricating retrospective explanations.

## Technical starting hypothesis

- Browser-based 2D presentation in **TypeScript + PixiJS** (or Phaser, after a small spike).
- TypeScript simulation core with deterministic reducers; headless tests.
- Local Node.js server to broker LLM providers and shield API keys.
- SQLite initially for snapshots, events and agent memories; local in-memory state for active scenes.
- Structured LLM outputs via validated schemas (e.g. Zod); provider adapter, request caching and trace logging.
- Single player/offline non-LLM fallback first. Hosting, multi-player, realistic fluid physics and 3D are out of scope for MVP.

**Alternatives to evaluate:** Godot for richer game tooling; Rust or Java for a separate simulator if profiling warrants it. Choose after measuring developer iteration speed, model latency and simulation needs.

## Risks and working assumptions

- **Causal coherence:** proposals cannot bypass the authoritative resolver. Maintain invariants and reveal every applied effect.
- **Latency/cost:** NPCs do not query an LLM every tick. Rule-based behavior handles routine actions. Batch, cache and throttle high-value calls, record token/cost budgets.
- **Creativity vs constraints:** loose interpretation increases novelty but risks contradictions. Compare permissive and strict modes experimentally.
- **Prompt injection / unsafe code:** treat user and model output as untrusted data. Validate action schemas and entity scopes. Never execute LLM-generated JS directly in the host process.
- **Infinite possibility is aspirational:** all actions ultimately depend on representable states and mechanics; the goal is perceived expressive freedom and meaningful consequences.

## Research questions

1. What smallest set of primitives gives rise to surprising, coherent action chains?
2. When does a new action require only composition, versus extension of world semantics?
3. How should agents distinguish observation, hearsay, lies, memory and ground truth?
4. Does allowing novel runtime rules improve surprise enough to justify instability?
5. How do we measure emergence without rewarding random nonsense?

## Success criteria for the first playable slice

- New player intents can be parsed into valid/rejected proposals with transparent reasons.
- A physical and a social event each cause at least one delayed downstream consequence without a second player prompt.
- An NPC independently acts toward a goal while the player is idle.
- The game can save, reload and inspect why an outcome happened.
- The same recorded initial state, seed, and action proposals reproduce Tier 0 outcomes.
- LLM failures do not corrupt canonical state; a basic fallback still works.

## Non-goals for v0.1

No full human realism, unbounded physics, multiplayer, finely tuned balance, authored campaign, commercial-ready sandboxing, or claim that literally anything can be done.

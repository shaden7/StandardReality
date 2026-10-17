# Roadmap — research-driven vertical slices

Each milestone must leave a runnable, testable artifact and a short written finding. Prefer the smallest complete causal loop over broad scaffolding.

**Setting and scope:** [The Mender — crawler design](SETTING.md). The first slice is the canteen, workshop, engine room, airlock, a tiny exterior patch and a small NPC cast. Never expand to a full vehicle before the core causal loop works.

## M0 — World and event substrate
- Set up TypeScript monorepo/application, tests, local run instructions, lint/CI.
- Render a few connected crawler rooms and agents in 2D; implement a headless simulation loop. Fake exterior travel with scenery/stop states initially.
- Stable entity IDs, state components, seedable RNG, event log, snapshot/load.
- Demonstrate moving an object and replaying identical results from recorded actions.

**Exit:** reload and reproducible physical event sequence.

## M1 — Free-form action proposals
- Natural-language command bar and scene context.
- Provider-agnostic LLM adapter, schema-validated proposals, deterministic resolver.
- Support movement, pick-up, place, push, climb, speech attempts.
- Explain rejected/partially successful actions; instrument latency and API cost.

**Exit:** an unanticipated phrasing maps to existing primitives without changing code.

## M2 — Agent perception and memory
- Up to 8 crawler inhabitants with goals, routines, local perception and private beliefs.
- Routine rule-based behavior, occasional LLM decisions, scheduled reflection.
- Persist observations and interpersonal consequences.
- Model "someone said X" separately from "X is true".

**Exit:** a witnessed dispute changes later NPC behavior, without another player input.

## M3 — Emergent causal chains
- Add selected interoperable crawler systems: generator/power dependency, cooling or lighting, hazards, access permissions, equipment damage. Include a bounded exterior patch and one salvage object.
- Observable consequences travel through systems with bounded event budgets.
- Debug timeline traces causal links for each important outcome.

**Exit:** an unscripted incident crosses at least three systems and is explainable from recorded state/events.

## M4 — Experimental new mechanics
- Compare existing-primitive composition with a versioned declarative rule extension model.
- Controlled rule registration, validation, snapshots, rollback.
- Curated adversarial prompts and tests for causal coherence.

**Exit:** documented evidence whether runtime mechanics add value and at what reliability/cost.

## Evaluation protocol

Keep a fixed suite of 20 varied player intents, several impossible actions, and 3 autonomous scenario seeds. Record:
- proposal validity and repair rate
- action-to-feedback latency, tokens and cost
- canonical-state invariant violations and crashes
- delayed and cross-system consequences
- replay divergence
- human-rated surprise, coherence, and agency

Do not use an arbitrary "emergence score" as a substitute for case studies with event traces.

## Proposed initial repository layout

```text
/docs
  CONCEPT.md
  ROADMAP.md
/apps
  web/                 # PixiJS 2D renderer and UI
  server/              # LLM gateway and persistence
/packages
  simulation/          # world model, resolver, tick
  protocols/           # shared schemas, events
  agents/              # perception, goals, memory
/tests
  scenarios/           # reproducible examples
```

This structure is provisional. Start with fewer packages if an early spike does not justify splitting them.

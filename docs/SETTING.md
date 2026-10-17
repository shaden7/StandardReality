# Setting — The Mender (working title)

> A city-sized crawler crosses an alien landscape, collecting, inspecting and repairing things according to orders from a navigation system nobody fully understands.

**Status:** Chosen creative direction, 2026-10-17. Names, sizes, lore and narrative explanations are provisional; do not turn mysteries into mandatory quests.

## Core fantasy

The playable world is a slow-moving, self-contained industrial vehicle and the small society that lives on it. It is both **place, machine, workplace, and character**. Its strange surroundings generate encounters and resources, but everyday life on board must remain interesting even when no expedition is happening.

A plausible initial scale is an ~800 m-long crawler moving ~4 km/h with ~35 residents; these are evocative targets, **not MVP scope**.

The aesthetic is worn, improvised industrial retrofuturism rather than pristine science fiction. The outside is unfamiliar, beautiful and sometimes hazardous, not a continuous stream of scripted monsters.

## The opaque mission

The vehicle follows an ancient, partly inscrutable work program. Its aging navigator outputs coordinates, work order IDs and instructions to **recover, survey, inspect, or repair** objects and infrastructure encountered along the route. Nobody aboard has a complete explanation of who commissioned the job, what the network does, or why certain tasks matter.

Interpretations conflict: engineers want the machine operational; archivists suspect a grand plan; opportunists want to trade finds; some residents think the journey is pointless; others treat procedures as sacred. Avoid confirming a single explanation early.

**Long-term mystery hypothesis (not canonical truth):** The crawler's passage or interventions may be changing or creating aspects of the landscape/ecology. This must remain a discoverable possibility, not a prescribed main plot or victory condition.

## Society and occupations

Target ~15–50 persistently simulated inhabitants over time, with a small prototype cast initially. Plausible roles:
- engineers, electricians, maintenance and vehicle operators
- salvage crews, field surveyors, scientists and cartographers
- archivists, navigators and dispatchers
- cooks, medics, gardeners, traders, security and people with no formal job
- visitors, stowaways or temporary outsiders where appropriate

Characters have schedules, private knowledge, obligations, competing interests, histories, attachments and opinions about the mission. Institutions and rules exist but can be challenged. The player is **not the chosen commander**: any ordinary inhabitant is a viable starting role.

## Locations and simulation affordances

Potential interconnected areas:
- canteen, living quarters, corridors and recreation room
- workshop, engine room, power distribution and cooling
- bridge/navigation terminal, radio and archive
- cargo hold, quarantine/analysis lab and salvage processing
- greenhouse, kitchen, storage, clinic
- airlock/ramp, vehicle exterior and a bounded stretch of alien terrain

Cross-system dependencies create stories: electricity powers refrigeration and mobility; refrigeration protects samples and food; supplies affect relationships and labor; access controls affect trust; machinery produces noise, heat, wear and hazards. Model only systems needed to support meaningful consequences.

The outside provides artifacts, materials, structural remnants, unknown organisms, weather and encounters. Finds should become persistent manipulable objects with understandable properties, including opportunities for disassembly, crafting, gifting, selling, hiding and repurposing. New properties must enter canonical state through validated rules, not narration alone.

## Gameplay loop — without a mandatory game loop

Observe -> attempt arbitrary action -> simulation resolves it -> other systems and inhabitants respond -> investigate consequences or do something unrelated.

Examples, **not scripted quests**:
- Rewire equipment to silence an irritating generator and inadvertently interrupt cooling.
- Recover an object and use its components for a homemade vehicle rather than hand it to the archivist.
- Convince the cook to open a restaurant in the engine room; negotiate safety and supply disputes.
- Spread a rumor about the navigator; different characters believe or reject it based on their knowledge.
- Organize a strike, black market or expedition; or simply work a shift and watch society evolve.
- Interfere with route controls and discover what the work order system permits.

No game over or campaign completion is required. Accidents, social disorder, unintended consequences and even crashes are tolerable during experiments, but causal inspection and recovery matter.

## Canonical incident test

**Player disables main generator because of the noise.**

1. Action resolver checks reach, permissions, control state and the switch operation.
2. The canonical power network changes state; connected cooling and traction systems lose power as modeled.
3. Temperature rises in sample storage; the crawler stops or switches to backup if available.
4. Technicians perceive equipment alarms, act on their own priorities and may save samples.
5. Dispatch registers an unscheduled halt; residents argue about responsibility and whether to leave the vehicle.
6. NPC beliefs and relationships evolve from witnessed evidence and testimony, not omniscient LLM narration.

Each link must be traceable and allowed to fail differently with altered initial conditions. An LLM may propose an action/response but **cannot directly decree physical consequences**.

## First playable vertical slice

Keep the existing StandardReality architecture and evaluation philosophy, but replace the space station testbed with **a stationary or slowly moving section of the crawler**:

- 2D top-down/isometric placeholder map, **four connected interior areas**: canteen, workshop, engine room, airlock
- a tiny exterior patch with one recoverable strange object
- **eight NPCs** with minimal schedules, goals, perceptions and private beliefs
- player natural-language commands + simple spatial interaction
- one meaningful network dependency: generator -> workshop/lighting/cooling (choose a minimal model)
- an object that can be carried, inspected, exchanged, modified or misused
- a work order terminal that emits simple objectives for NPCs, **not compulsory quests for the player**
- a canonical event log, snapshots/replay and a debug view displaying causal chains

The vehicle need not actually traverse an open world at first: convey movement through external scrolling scenery, periodic stops and bounded expedition scenes. Do **not** simulate 800 meters, 35 full agents, fluid dynamics or continuous procedural terrain for the MVP.

### Demonstration scenarios
1. **Mechanical:** disable or improvise a repair; delayed consequences propagate across at least two machines.
2. **Social:** steal, gift, accuse or negotiate; an NPC later acts using a private belief.
3. **Environmental:** bring back an unfamiliar object; it interacts persistently with another object or system.
4. **Autonomy:** do nothing; NPCs perform duties and develop at least one unscripted disagreement.

## Design guardrails

- No scripted main mystery reveal, forced survival meter, character class, victory condition or chosen-one story.
- No model inventing world facts retrospectively. Separate ground truth, perception, hearsay and hypothesis.
- Deterministic simulation of routine physical processes; LLMs only at meaningful interpretation and decision boundaries.
- Permit creative attempted actions and partial failure; never promise literal infinite mechanical possibilities.
- Unusual finds or new rules must be validated, scoped, logged and ideally reversible.
- Design for replay, causal debugging, test seeds, latency/cost measurement and bounded cascading events.
- Prefer emergent humor, mundane work and human conflict alongside wonder and danger.

## Open creative questions (deliberately unresolved)

- Treads, legs, rails, or an unfamiliar locomotion system?
- Who built the vehicle and why is its mission opaque?
- Is the environment truly alien, transformed Earth or something else?
- How much of the machine's interior has been abandoned or forgotten?
- Is the machine's ecological impact real, coincidental or misunderstood?
- What external communities or other crawlers exist?
- How much law, ownership and exchange should be modeled from the start?

Do not block the prototype on answering these.

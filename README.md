# StandardReality

**An AI-native emergent storytelling sandbox.**

> The world has no script. It has rules, inhabitants, and consequences.

StandardReality explores how free-form player intentions can become persistent, causally grounded events in a simulated world. It is not a quest game or an AI text adventure: stories should emerge from interacting world systems and autonomous inhabitants.

## Principles

1. **Freedom first:** Try to interpret any player intention as an action attempt; success is not guaranteed.
2. **Simulation over narration:** A canonical state and event log determine what actually happened. Narration never silently rewrites them.
3. **Emergence over scripting:** Prefer interacting mechanisms over authored plot sequences.
4. **Persistent consequences:** Physical changes, memories, relationships, and knowledge survive interactions.
5. **Experimentation over perfection:** Weird results and unstable prototypes are tolerable; preserve debuggability and rollback.
6. **No compulsory objectives:** Curiosity, experimentation and observing consequences are the point.

## Initial experiment

A small, single-player 2D section of **a gigantic industrial crawler crossing a strange landscape**. A handful of autonomous inhabitants work, quarrel, improvise repairs and recover unfamiliar objects. The player can attempt open-ended actions; a canonical simulation resolves persistent consequences. The machine follows obscure work orders whose ultimate purpose is unknown.

### The central test

Can a player attempt an unanticipated action, have it interpreted consistently, and observe consequences that continue unfolding without requiring another prompt?

## Documentation

- [Setting: The Mender (working title)](docs/SETTING.md)
- [Concept and architecture](docs/CONCEPT.md)
- [Experiment plan and milestones](docs/ROADMAP.md)

## Status

**Experimental browser prototype.** Architecture and provider choices remain hypotheses to evaluate.

The playable M2 prototype now includes three autonomous inhabitants, subjective perception and belief, a simulation clock, optional throttled NPC model decisions, and a causal debug view. See [M2 observations and limits](docs/M2.md).

### Generated objects and sprites

Type `ich werfe eine banane auf den boden` or `create a banana` in the command field. This uses a bounded creative action to add a portable item to the canonical world on a free nearby tile. The browser shows a placeholder immediately. If the local API gateway has an image-capable OpenAI key, it requests transparent pixel-art imagery in the background; the rendered PNG is cached under `generated-sprites/` and reused after loading a snapshot. The folder is ignored by Git. Without image access, the item remains usable with its placeholder and the UI offers a retry. Set `OPENAI_IMAGE_MODEL` on the gateway to choose a supported GPT Image model; the default is `gpt-image-2.5-flare`. Each new uncached item design may incur an image-generation charge.

## Run locally

Install dependencies with `npm install`. Start the API gateway in one PowerShell window:

```powershell
$env:OPENAI_API_KEY = [Environment]::GetEnvironmentVariable('OPENAI_API_KEY', 'Machine')
$env:OPENAI_MODEL = 'gpt-6-luna'
npm run dev:server
```

The gateway reads the key from its process environment. If the system variable was added after PowerShell or the desktop app started, loading it as above makes it available to this process. The key stays on the server and must never be placed in Vite variables or browser code. The `.env.example` file documents settings; the server does not load `.env` files automatically.

In another PowerShell window, run `npm run dev` and open `http://127.0.0.1:5173/`. The local rule parser still works if the API gateway is not configured. Run `npm test` for the simulation and gateway checks.

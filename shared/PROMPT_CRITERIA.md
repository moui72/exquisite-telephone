# Curated Prompt Criteria

How to write phrases for `CURATED_PHRASE_BANK` (`src/phraseBank.ts`).

Read this before generating candidates. The criteria below were derived from
reviewing 665 candidates down to 74 keepers, and most of them are not
recoverable by looking at the accepted phrases alone — several rules exist
because a plausible-looking phrase failed for a reason that isn't visible in
the ones that passed.

The game is telephone-pictionary: a phrase is drawn, the drawing is described,
the description is drawn again. A phrase must therefore survive being drawn by
someone in a hurry and then reconstructed by someone who never saw it.

## 1. The incongruity must be earned

The pairing has to be justified by the subject's specific anatomy or cultural
baggage. Not an arbitrary crossing of subject and activity.

- **Yes** — A crocodile at the dentist (teeth). A werewolf getting a haircut
  (fur). A rabbit lifting weights (legs).
- **No** — A frog at the dentist. A lion getting a haircut. A duck vacuuming.

This is the load-bearing rule. A batch of 100 built by crossing ~30 creatures
against ~35 mundane activities produced exactly **one** keeper. Writing to this
rule produced **56%**. Do not build a grid.

## 2. Referencing a trait isn't enough — stress it

The trait must be violated or put under pressure, not merely present.

- **No** — Elvis at a barber shop. A haircut is unremarkable for anyone; the
  pompadour is just nearby.
- **Yes** — Elvis eating a salad. Contradicts the fried-food baggage.

## 3. The failed attempt must be drawable

The subject needs the body parts to make a visible attempt. The joke lives in
the attempt, not in the impossibility.

- **Yes** — A T. rex changing a lightbulb. It can reach; the arms are too short.
- **No** — A snake jumping rope. No arms to hold it, no legs to jump. There's
  nothing to draw, which is paralysing rather than funny.

## 4. Settings must reduce to one distinctive prop

- **Yes** — dentist (chair + drill), elevator (box + buttons), phone booth,
  laundromat (washing machine).
- **No** — shoe store, paint store, balloon shop, blood drive. These need
  shelving, signage, and repetition to read as a place at all.

## 5. The activity must not collapse into its generic neighbour

If the drawing renders a broader activity equally well, the phrase is
unrecoverable and degrades on the first pass of the chain.

- "trying on clothes" draws as "getting dressed"
- "playing hide and seek" draws as "hiding"
- "running a marathon" draws as "running"
- "in a ballet" doesn't render as ballet at all

**Rescue:** add a second element that supplies the specificity, or swap in a
prop that carries the joke alone. "An ostrich hiding" → "An ostrich hiding from
a hunter". "A mime at karaoke" → "A mime with a bullhorn".

## 6. Nothing interior

No emotions, intentions, knowledge states, medical states, or process/aspect
distinctions. These only render via props the viewer then has to decode back
into the original abstraction, and that decode never survives the chain.

- **No** — a sore throat, afraid of the dark, plotting escape, *learning to*
  knit (versus knitting), the world's most nervous lion.

## 7. Subjects need a fast silhouette

Weak or over-specific animals fail: pelican, chameleon, hermit crab, puffin,
porcupine. Ghosts are a special case — the only easy rendering is a sheet with
eyes, which forecloses any action needing a body.

Visually distinct **people** work as well as animals, and break up the
clustering that pure-animal batches fall into (long neck / short arms / too
many legs / wrong climate). Elvis, Lincoln, nuns, soldiers, Santa, mimes,
clowns, sumo wrestlers, astronauts, pirates, vikings, witches, Medusa, Dracula.

## 8. Never punch down

When the subject is a person or social group rather than an animal or monster,
the incongruity must live in the **situation**, never in a supposed deficiency
of that group. Watch for phrasing that accidentally aims it at the person.

- **No** — "A cheerleader at a chess match". Ambiguous: if she's *playing*, the
  joke becomes about her intelligence and lands on a sexist stereotype.
- **Yes** — "A cheerleader cheering at a chess match". The mismatch is
  enthusiasm against a silent room. Nobody is the butt of it.

Applies to gender, race, nationality, religion, age, class, disability, and
body. If the humour requires the audience to believe a group is
stupid/lazy/dirty, cut it — there's no rescue.

Self-violating traits of a *specific* fictional or historical figure are fine
(Dracula and a tanning salon, Medusa and a hair salon). The line is
group-level stereotype, not individual character trait.

## 9. Shape and register

Plain noun phrase. One concrete subject, one visible action or state.

- No superlatives or narrative framing — "the world's most disappointing X",
  "the last Y on Earth", "the first Z".
- Leave scale to the artist. Drop "tiny"/"giant"/"very small" unless the size
  *is* the earned joke (an elephant in a teacup).
- Animated household objects (a fridge with eyes, a clock on legs) are
  consistently weak — avoid.

## Two things that do work, against intuition

Both were nearly pruned during review and turned out to be fine:

- **Tone collision works without an anatomical hook.** "A clown at a funeral"
  survives despite needing a coffin to read.
- **Near-duplicate jokes can coexist.** "A cheetah stuck in traffic" and "A
  cheetah on a treadmill" are both in the bank. Don't dedupe aggressively —
  offer both and let the reviewer choose.

## Growing the bank

`CURATED_PHRASE_BANK` is a build-time constant; appending needs no migration.
The bank must stay large enough that a realistic room never hits the deal clamp
of `floor(bankSize / playerCount)` — 74 covers a 12-player room dealt 5 each.

Two backlogged features are intended to grow it from real play rather than by
hand-curation: `player-prompt-rating` (thumbs up/down on prompts as drawn) and
`book-love-reactions` (hearted books surface their opening phrase as a
candidate). Both need a persistence layer the app doesn't have yet.

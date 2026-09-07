import { CHARACTERS, MOOD_AXES, PATTERN_SLOTS, ROLES } from '@/lib/core'
import type { Character, MoodAxis, PatternSlot, Role } from '@/lib/core'
import { PARTS } from './parts'

/**
 * #457. Short definitions for the four closed vocabularies, for the modal a reader opens from
 * the word itself (`components/vocabulary-term.tsx`).
 *
 * **Only the words we chose.** A reader can look `resonance` or `one-shot` up in the manual for
 * the box in front of them; what `ghost-perc` means as a role exists nowhere but here, because
 * invariant 3 makes this taxonomy ours. That line is what keeps the glossary finite: 42 words,
 * closed by the same invariant, so it cannot grow into a synthesis textbook.
 *
 * **Here rather than in `lib/core`.** The engine never reads a definition, and the Markdown guide
 * must not either — a printed guide cannot open a modal, and what is missing there is the
 * interaction, not a claim (#457, #33). Keeping the text out of the renderer's reach is what makes
 * that structural instead of a rule somebody has to remember.
 */

/** One word from one of the four vocabularies. All 42 are distinct, which is why this union works. */
export type VocabularyWord = Role | Character | MoodAxis | PatternSlot

/** Which vocabulary a word came from, spelled as the modal says it. */
export type VocabularyKind = 'role' | 'character' | 'mood axis' | 'pattern slot'

/**
 * The 42, in the order §1, §3.4, §6 and §4.3 list them. Built from the four exported tuples, so
 * a word added to a vocabulary is a word this knows about on the same commit.
 */
export const VOCABULARY_WORDS: readonly VocabularyWord[] = [
  ...ROLES,
  ...CHARACTERS,
  ...MOOD_AXES,
  ...PATTERN_SLOTS,
]

/** Membership, without four `includes` calls widening `VocabularyWord` to `string` at each site. */
function has(list: readonly string[], word: string): boolean {
  return list.includes(word)
}

/**
 * Derived from membership, never authored beside the definition. The four lists are the only
 * source of truth for what kind of word this is, and a hand-written `kind` is a second one that
 * can disagree with them.
 */
export function kindOf(word: VocabularyWord): VocabularyKind {
  if (has(ROLES, word)) return 'role'
  if (has(CHARACTERS, word)) return 'character'
  if (has(MOOD_AXES, word)) return 'mood axis'
  return 'pattern slot'
}

/**
 * §3.4. The six characters, as three opposed pairs on one vector each: force, tone, grit.
 *
 * **Each one is a quality, named against its opposite, and never a setting.** A character is a
 * coordinate that tells a device which of its own recipes to reach for. What a `hard` kick does
 * to any particular control is that recipe's business, and a definition written in control names
 * would be wrong on the first box that voices force some other way — as well as being an answer
 * to a question the reader did not ask.
 */
const CHARACTER_DEFINITIONS: Record<Character, string> = {
  hard: 'Forceful and immediate, landing with its weight at the front. Its opposite is soft.',
  soft: 'Gentle and rounded, easing in instead of landing. Its opposite is hard.',
  bright:
    'Weighted toward the top of the sound, where it is airy and present. Its opposite is dark.',
  dark: 'Weighted away from the top of the sound, where it is warmer and heavier. Its opposite is bright.',
  clean: 'Smooth, with little roughness or breakup in it. Its opposite is dirty.',
  dirty: 'Rough, with grain and breakup as part of the sound. Its opposite is clean.',
}

/**
 * §6. The five knobs, each described by what it actually moves. A box with no param declaring an
 * axis is unmoved by it, which is worth saying on the axis where a reader will meet a knob that
 * appears to do nothing.
 *
 * **`density` does two things and the sentence says both.** It leans the section's pattern band
 * (§6.3) *and* offsets every param authored for the axis — 666 declarations across 64 names in
 * the library today, most of them note length (`DECAY`, `HOLD`, `AMP DEC`) and the rest
 * probability and rate. A definition naming only the patterns would send a reader looking for a
 * knob that does nothing on a part whose grid it cannot reach.
 *
 * **`swing` names no control, because several carry the axis.** `SWING` and `SHUFFLE` carry 370 of
 * the 400 declarations, and the rest are `Glide`, `TC Swing` and `ARP · SWING`. Whichever timing
 * setting the box in front of the reader provides is the one that moves.
 */
const MOOD_AXIS_DEFINITIONS: Record<MoodAxis, string> = {
  darkness:
    'Moves the rig toward its dark end. Filter cutoff and tuning come down, and each part leans toward its dark character.',
  density:
    'How busy the music is. It leans every section’s pattern band one step sparser or busier, and also changes sound settings such as note length or hit probability where the box supports them.',
  grit: 'How much dirt is in the sound: drive, saturation, bitcrush and sample-rate reduction, on the boxes that have them. It also leans each part toward its dirty character.',
  swing:
    'How much the timing is pushed off the straight grid. It moves whichever timing setting a box provides for that, across the range the box prints, so a box with none stays where it is.',
  space: 'How much room the sound sits in. It moves reverb and delay depth and the sends that feed them.',
}

/**
 * §4.3. How a pattern's steps are addressed, so a device can articulate one without knowing which
 * variant it was handed. The convention is fixed in `lib/core/authoring.ts`, and these are that
 * convention said to a reader.
 */
const PATTERN_SLOT_DEFINITIONS: Record<PatternSlot, string> = {
  downbeat:
    'A hit on the beat. A kick on two or four is one of these, because that is the pulse being stated.',
  backbeat:
    'Beats two and four, played by the part that states them: the snare, the clap, the sidestick.',
  offbeat: 'A hit on an eighth-note offbeat, halfway between two beats.',
  accent: 'The one hit a pattern leans on. It always carries a high velocity.',
  'first-hit':
    'The gesture a part enters on, which is no part of its pulse. The crash on an impact is one.',
  'last-hit': 'The tail a part ends on, which is no part of its pulse.',
  fill: 'A run of sixteenths in the closing beat of a pattern.',
  ghost: 'A quiet sixteenth between the beats. It always carries a low velocity.',
}

/**
 * All 42, and the type is what keeps it that way: a word added to any of the four vocabularies
 * fails to compile until it has a definition, and invariant 3 already makes a 43rd an
 * architecture change rather than an addition.
 *
 * The role half is `PARTS`, the same sentences `/parts` prints under **What it is**. Written once
 * (`lib/studio/parts.ts`) and read here, because two copies of 23 descriptions is one of them
 * going stale. The cast is over data built from `ROLES` itself; `PARTS` is `Record<Role, Part>`,
 * so the compiler has already checked that every role has one.
 */
export const DEFINITIONS: Record<VocabularyWord, string> = {
  ...(Object.fromEntries(ROLES.map((role) => [role, PARTS[role].is])) as Record<Role, string>),
  ...CHARACTER_DEFINITIONS,
  ...MOOD_AXIS_DEFINITIONS,
  ...PATTERN_SLOT_DEFINITIONS,
}

/** The definition. Every word in the vocabulary has one, which is what the record's type says. */
export function definitionOf(word: VocabularyWord): string {
  return DEFINITIONS[word]
}

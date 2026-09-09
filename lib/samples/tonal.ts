import type { SampleTarget } from '../core/sample'

/**
 * §3.8/#520. **The tonal sounds** — the six roles whose files are played at a pitch rather than
 * triggered at one.
 *
 * Every one of them is recorded at a **written-down note**, and that is what separates the group
 * from the kit: a kick is a kick wherever it lands on a pad, and a stab recorded at an unknown
 * pitch has to be tuned by ear against every track it goes into. It is also the clearest example
 * of what this prose is for — no recipe can tell a reader to write the note down, because that is
 * a fact about the folder rather than about the box.
 *
 * `vox-chop` is in this group and stays in it. One device in the library can synthesise a voice,
 * so on most rigs it resolves to `loads-audio` and its prose says what to do about that: bring a
 * recording, or make one. It is listed and marked rather than dropped, because a sound removed
 * from the page is a gap made invisible, which is invariant 5 backwards.
 */

export const pad: SampleTarget = {
  id: 'pad',
  name: 'Pad',
  role: 'pad',
  character: 'soft',
  technique: [
    'Hold one note for eight seconds or more and record all of it. A pad is still changing at four ' +
      'seconds, and a short file loops audibly however carefully it is crossfaded.',
    'One note, not a chord. A chord goes in whichever key it was played in; a single note goes in ' +
      'every key.',
    'Record it at a note you write down.',
  ],
}

export const lead: SampleTarget = {
  id: 'lead',
  name: 'Lead',
  role: 'lead',
  character: 'bright',
  technique: [
    'One note, held long enough for the attack to settle. A second is plenty.',
    'Keep the attack exactly as the patch plays it. Whatever the take opens with is what the file ' +
      'does on short notes.',
    'Two or three takes an octave apart where the box tunes.',
  ],
}

export const stab: SampleTarget = {
  id: 'stab',
  name: 'Stab',
  role: 'stab',
  character: 'bright',
  technique: [
    'Short, trimmed tight at both ends. The gap after a stab is part of what makes the next one land.',
    'Play it once at a note you write down.',
    'Two takes, one struck hard and one soft, where the box answers to how it is played.',
  ],
}

export const arp: SampleTarget = {
  id: 'arp',
  name: 'Arp',
  role: 'arp',
  character: 'bright',
  technique: [
    'One note, not a run. This is the sound an arpeggiator plays, so the file wants almost no tail: ' +
      'the next note arrives in a sixteenth.',
    'Record it at a note you write down.',
    'Name the file for the sound rather than for the part you had in mind.',
  ],
}

export const acid: SampleTarget = {
  id: 'acid-line',
  name: 'Acid line',
  role: 'acid',
  character: 'dirty',
  technique: [
    'An acid line is movement under a held note. Record several bars while you move whatever tone ' +
      'control the patch below gives you, rather than one still note.',
    'Several takes at different amounts of movement, where the amount is yours to set, so the ' +
      'choice is made with the files in front of you.',
    'Write down the note you held it at, as for every other sound in this group.',
  ],
}

export const voxChop: SampleTarget = {
  id: 'vocal-chop',
  name: 'Vocal chop',
  role: 'vox-chop',
  character: 'clean',
  technique: [
    'A synthesiser is not a voice. Unless your rig has a formant or vocal engine, bring a ' +
      'recording or make one.',
    'One syllable, about half a second, at a pitch you write down.',
    'Cut on the vowel. The consonant at the front of a word is the part to throw away.',
  ],
}

export const TONAL_SAMPLES: readonly SampleTarget[] = [pad, lead, stab, arp, acid, voxChop]

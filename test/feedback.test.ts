import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { Footer } from '../components/footer'
import {
  REPOSITORY_URL,
  bugLink,
  deviceRequestLink,
  feedbackLinks,
  wrongValueLink,
} from '../lib/studio/feedback'
import type { FeedbackContext, FeedbackLink } from '../lib/studio/feedback'
import { encodeGuideInputs } from '../lib/core/index'
import { CATALOGUE, DEFAULT_INPUTS } from '../lib/studio/session'

/**
 * The footer's issue links. The claim under test is not that a URL was produced. It is that the
 * *decoded* query names a form that exists and fills fields that form actually declares. Both
 * halves are silent failures otherwise: a mistyped `template=` drops the reporter on the chooser
 * page, and a mistyped field key is simply ignored, taking the permalink with it.
 */

/** A real permalink, so the `&` and `=` in it are the ones the app actually emits. */
const PERMALINK = `https://patchscore.app/?${encodeGuideInputs(DEFAULT_INPUTS, CATALOGUE)}`

const CONTEXT: FeedbackContext = {
  permalink: PERMALINK,
  devices: ['Polyend Tracker Mini', 'Roland TR-1000'],
}

function query(link: FeedbackLink): URLSearchParams {
  return new URL(link.href).searchParams
}

function form(file: string): string {
  return readFileSync(new URL(`../.github/ISSUE_TEMPLATE/${file}`, import.meta.url), 'utf8')
}

describe('every issue link', () => {
  it('points at this repository', () => {
    for (const link of feedbackLinks(CONTEXT)) {
      expect(link.href.startsWith(`${REPOSITORY_URL}/issues/new?`)).toBe(true)
      expect(new URL(link.href).pathname).toBe('/miclip/patchscore/issues/new')
    }
  })

  it('names a form that exists', () => {
    for (const link of feedbackLinks(CONTEXT)) {
      expect(query(link).get('template')).toBe(link.template)
      expect(() => form(link.template)).not.toThrow()
    }
  })

  /**
   * The drift guard. Every prefill key must be a field `id` in the form it opens. Rename one in
   * the YAML and the prefill silently stops arriving, with nothing failing anywhere else.
   */
  it('only fills fields its form declares', () => {
    for (const link of feedbackLinks(CONTEXT)) {
      const yaml = form(link.template)
      for (const key of query(link).keys()) {
        // `template` addresses the form; `title` is the issue's own, not a field.
        if (key === 'template' || key === 'title') continue
        expect(yaml, `${link.template} has no field '${key}'`).toContain(`id: ${key}\n`)
      }
    }
  })

  /** Labels live in the forms now. A link that carried its own could disagree with one. */
  it('carries no label of its own', () => {
    for (const link of feedbackLinks(CONTEXT)) {
      expect(query(link).get('labels')).toBeNull()
      expect(query(link).get('body')).toBeNull()
    }
  })

  it('is in the order the footer shows them', () => {
    expect(feedbackLinks(CONTEXT).map((l) => l.id)).toEqual([
      'wrong-value',
      'device-request',
      'bug',
    ])
  })
})

describe('a wrong value', () => {
  it('quotes the permalink whole, ampersands and all', () => {
    expect(query(wrongValueLink(CONTEXT)).get('permalink')).toBe(PERMALINK)
    // The failure this guards: `&darkness=50` read as a second query parameter, so the prefill
    // stops at the first device and the guide can never be reopened.
    expect(PERMALINK).toContain('&')
    expect(query(wrongValueLink(CONTEXT)).get('darkness')).toBeNull()
  })

  it('names the single selected device in the title and the device field', () => {
    const one = query(wrongValueLink({ permalink: PERMALINK, devices: ['Roland TR-1000'] }))
    expect(one.get('title')).toBe('Wrong value: Roland TR-1000')
    expect(one.get('device')).toBe('Roland TR-1000')
    expect(one.get('notes')).toBeNull()
  })

  it('lists a multi-device rig in the notes instead of guessing which box it was', () => {
    const many = query(wrongValueLink(CONTEXT))
    expect(many.get('device')).toBeNull()
    expect(many.get('title')).toBeNull()
    expect(many.get('notes')).toBe('Rig on screen: Polyend Tracker Mini, Roland TR-1000')
  })

  it('fills nothing about the rig when nothing is selected', () => {
    const none = query(wrongValueLink({ permalink: PERMALINK, devices: [] }))
    expect(none.get('device')).toBeNull()
    expect(none.get('notes')).toBeNull()
    expect(none.get('permalink')).toBe(PERMALINK)
  })

  it('sends no permalink at all rather than a placeholder when there is none yet', () => {
    const link = wrongValueLink({ permalink: undefined, devices: [] })
    expect(query(link).get('permalink')).toBeNull()
    // Only the form. Nothing invented to fill the gap.
    expect([...query(link).keys()]).toEqual(['template'])
  })
})

describe('a device request', () => {
  it('opens the form and prefills nothing', () => {
    expect([...query(deviceRequestLink(CONTEXT)).keys()]).toEqual(['template'])
  })
})

describe('a bug', () => {
  it('carries the reproduction and nothing else', () => {
    const q = query(bugLink(CONTEXT))
    expect(q.get('template')).toBe('bug-report.yml')
    expect(q.get('permalink')).toBe(PERMALINK)
    expect([...q.keys()].sort()).toEqual(['permalink', 'template'])
  })
})

/**
 * What the forms must keep asking, whoever edits them. These are the fields a report cannot be
 * acted on without. They are not a restatement of the wording, which is the forms' to own.
 */
describe('the issue forms', () => {
  const REQUIRED: ReadonlyArray<{ file: string; fields: readonly string[] }> = [
    {
      file: 'wrong-value.yml',
      fields: ['device', 'parameter', 'value-shown', 'value-expected', 'source', 'permalink'],
    },
    { file: 'device-request.yml', fields: ['maker', 'model', 'manual-public'] },
    { file: 'bug-report.yml', fields: ['what-happened', 'what-expected', 'permalink'] },
  ]

  it('require every field the report cannot be acted on without', () => {
    for (const spec of REQUIRED) {
      const yaml = form(spec.file)
      for (const field of spec.fields) {
        const at = yaml.indexOf(`id: ${field}\n`)
        expect(at, `${spec.file} is missing field '${field}'`).toBeGreaterThan(-1)
        // The next `required:` after the field is that field's own, in the block that follows.
        const after = yaml.slice(at, yaml.indexOf('- type:', at + 1))
        expect(after, `${spec.file} does not require '${field}'`).toContain('required: true')
      }
    }
  })

  it('ask a device request whether the manual can be got', () => {
    const yaml = form('device-request.yml')
    expect(yaml).toContain('id: manual-url\n')
    expect(yaml).toContain('publicly available')
  })
})

describe('the footer', () => {
  function markup(context: FeedbackContext): string {
    return renderToStaticMarkup(createElement(Footer, context))
  }

  it('renders with no browser at all, and identically twice', () => {
    expect('window' in globalThis).toBe(false)
    expect(markup(CONTEXT)).toBe(markup(CONTEXT))
  })

  it('links the repository', () => {
    const html = markup(CONTEXT)
    expect(html).toContain(`href="${REPOSITORY_URL}"`)
  })

  it('shows all three reports', () => {
    const html = markup(CONTEXT)
    for (const link of feedbackLinks(CONTEXT)) {
      expect(html).toContain(link.label)
    }
  })

  it('sends nothing outward without noopener', () => {
    expect(markup(CONTEXT).split('target="_blank"').length - 1).toBe(3)
    expect(markup(CONTEXT).split('rel="noopener noreferrer"').length - 1).toBe(3)
  })
})

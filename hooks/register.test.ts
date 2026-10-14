import { expect, test } from 'claude-code/testing'

const SURFACES = ['terminal', 'desktop'] as const

const mountMessage = ($: Parameters<Parameters<typeof test>[1]>[0], surface: (typeof SURFACES)[number], text: string) =>
  $.ui.mount({
    plugin: 'md-viewer',
    surface,
    component: 'AssistantMessage',
    props: { text, isFirstOfReply: true },
  })

test('markdown files named in chat become pressable links', async $ => {
  for (const surface of SURFACES) {
    const ui = await mountMessage(
      $,
      surface,
      'Read `docs/plan.md`, [the notes](C:\\work\\notes.md:12) and `src/index.ts`.',
    )
    const md = await ui.find({ type: 'Markdown' })
    const text = String(md?.props.text)

    expect(text).toContain('[`docs/plan.md`](file:///__md__/docs/plan.md)')
    expect(text).toContain('[the notes](file:///__md__/C:/work/notes.md)')
    expect(text).toContain('`src/index.ts`')
    expect(text).not.toContain('[`src/index.ts`]')
    expect(md?.props.pressableLinks).toEqual([
      'file:///__md__/docs/plan.md',
      'file:///__md__/C:/work/notes.md',
    ])

    await ui.unmount()
  }
})

test('code fences and web links are left alone', async ($, on) => {
  // stands in for the engine's own AssistantMessage drawing beneath the plugin
  on('ui.render', async ($, e) => {
    const { Text } = $.ui.resolve(e)

    return h(Text, null, 'engine drew it')
  })

  for (const surface of SURFACES) {
    const ui = await mountMessage(
      $,
      surface,
      '```\ncat README.md\n```\nSee [spec](https://example.com/spec.md) and `a.md.bak`.',
    )

    // nothing to rewrite: the engine draws the message itself, no Markdown of ours
    expect(await ui.find({ type: 'Markdown' })).toBeUndefined()
    expect(await ui.find({ type: 'Text', text: 'engine drew it' })).toBeDefined()

    await ui.unmount()
  }
})

test('pressing a link in chat is answered by the plugin', async ($, on) => {
  on('ui.open', () => ({ value: { isPlaced: true } }))

  for (const surface of SURFACES) {
    const ui = await mountMessage($, surface, 'Open `docs/plan.md` now')
    const md = await ui.find({ type: 'Markdown' })
    const result = await ui.press({
      key: String(md?.key),
      link: { href: 'file:///__md__/docs/plan.md' },
    })

    expect(result?.element).toBe(md?.key)

    await ui.unmount()
  }
})

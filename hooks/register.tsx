import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register } from 'claude-code'

import type { OpenFile } from '../types'

const PANE = 'md-viewer'
const PREFIX = 'file:///__md__/'
const current = atom({ plugin: 'md-viewer', key: 'current' } as const, null)

const MD_TARGET = /^(.+?\.(?:md|markdown|mdx))(?::\d+(?::\d+)?)?(?:#.*)?$/i
const CANDIDATE = /\[([^\]\n]*)\]\(([^)\s]+)\)|`([^`\s]+)`/g
const FENCE = /(```[\s\S]*?(?:```|$))/

/** The opaque link a markdown path becomes in chat: a `file:` URL the surface will draw as a link. */
export function toHref(target: string): string | null {
  if (/^(?:https?|mailto|ftp):/i.test(target)) {
    return null
  }

  const match = MD_TARGET.exec(target)

  if (match === null) {
    return null
  }

  const path = match[1]
    .replace(/^file:\/\/\/?(?=[A-Za-z]:)/i, '')
    .replace(/^file:\/\//i, '')
    .replace(/\\/g, '/')

  return PREFIX + encodeURI(path).replace(/\(/g, '%28').replace(/\)/g, '%29')
}

export function fromHref(href: string): string | null {
  const at = href.indexOf('__md__/')

  if (at < 0) {
    return null
  }

  try {
    return decodeURIComponent(href.slice(at + '__md__/'.length))
  } catch {
    return null
  }
}

/** Turns every markdown link and inline-code mention of a markdown file into a pressable link. */
export function linkify(text: string): { text: string; hrefs: string[] } {
  const hrefs: string[] = []
  const parts = text.split(FENCE).map((part, i) => {
    if (i % 2 === 1) {
      return part
    }

    return part.replace(CANDIDATE, (whole, label, target, code) => {
      const href = toHref(target ?? code)

      if (href === null) {
        return whole
      }

      if (!hrefs.includes(href)) {
        hrefs.push(href)
      }

      return target === undefined ? `[\`${code}\`](${href})` : `[${label}](${href})`
    })
  })

  return { text: parts.join(''), hrefs }
}

const basename = (path: string) => path.replace(/\\/g, '/').split('/').pop() || path

async function show($: EngineInterface, raw: string) {
  const path = raw
    .trim()
    .replace(/^["']|["']$/g, '')
    .replace(/(\.(?:md|markdown|mdx)):\d+(?::\d+)?$/i, '$1')

  let file: OpenFile

  try {
    file = { path, text: await $.fs.read(path), error: null }
  } catch (err) {
    file = { path, text: '', error: err instanceof Error ? err.message : String(err) }
  }

  await update($, current, () => file)
  await $.ui.open({ id: PANE, title: basename(path) })
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'md',
      description: 'Show a markdown file rendered in a pane',
      argumentHint: '<file>',
    })

    return next(e)
  })

  on('command.run', { command: 'md' }, async ($, e) => {
    if (e.args.trim() === '') {
      return { text: 'Usage: /md <file>' }
    }

    await show($, e.args)

    return { text: `Opened ${e.args.trim()}` }
  })

  on('ui.render', { component: 'AssistantMessage' }, async ($, e, next) => {
    const { text, hrefs } = linkify(e.props.text)

    if (hrefs.length === 0) {
      return next(e)
    }

    const { Markdown } = $.ui.resolve(e)

    return (
      <Markdown
        key={`md-${e.requestId}`}
        text={text}
        pressableLinks={hrefs}
        onLinkPress={link => {
          const path = fromHref(link.href)

          if (path !== null) {
            show($, path).catch(err => $.ui.toast(`md-viewer: ${err instanceof Error ? err.message : String(err)}`))
          }
        }}
      />
    )
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Markdown, Text } = $.ui.resolve(e)
    const file = await read($, current)

    if (file === null) {
      return <Text dimColor>No file open. Click a markdown file in chat, or run /md &lt;file&gt;.</Text>
    }

    if (file.error !== null) {
      return (
        <Box flexDirection="column">
          <Text bold>{file.path}</Text>
          <Text>Could not read it: {file.error}</Text>
        </Box>
      )
    }

    return (
      <Box flexDirection="column">
        <Text dimColor>{file.path}</Text>
        <Markdown text={file.text} />
      </Box>
    )
  })
}

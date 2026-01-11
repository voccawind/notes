// Custom Tiptap Extension for Wiki-Style Links [[note-title]]
import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface WikiLinkOptions {
  HTMLAttributes: Record<string, unknown>
  onLinkClick?: (title: string) => void
  onLinkHover?: (title: string) => void
  suggestionRenderer?: (query: string) => string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    wikiLink: {
      setWikiLink: (title: string) => ReturnType
      unsetWikiLink: () => ReturnType
    }
  }
}

export const WikiLink = Mark.create<WikiLinkOptions>({
  name: 'wikiLink',

  addOptions() {
    return {
      HTMLAttributes: {},
      onLinkClick: undefined,
      onLinkHover: undefined,
      suggestionRenderer: undefined,
    }
  },

  addAttributes() {
    return {
      title: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-title'),
        renderHTML: (attributes) => {
          return {
            'data-title': attributes.title,
            class: 'wiki-link',
          }
        },
      },
      exists: {
        default: true,
        parseHTML: (element) => element.getAttribute('data-exists') === 'true',
        renderHTML: (attributes) => {
          return {
            'data-exists': attributes.exists,
            class: attributes.exists ? 'wiki-link-exists' : 'wiki-link-missing',
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="wiki-link"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'wiki-link',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setWikiLink:
        (title) =>
        ({ commands }) => {
          return commands.setMark(this.name, { title, exists: true })
        },
      unsetWikiLink:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },

  addProseMirrorPlugins() {
    const { onLinkClick } = this.options

    return [
      // Auto-convert [[text]] to wiki links
      new Plugin({
        key: new PluginKey('wikiLinkAutodetect'),
        props: {
          handleTextInput: (view, from, _to, text) => {
            if (text === ']') {
              const { state } = view
              const { doc, tr } = state
              const textBefore = doc.textBetween(Math.max(0, from - 100), from, '\n')

              // Check for [[...] pattern
              const match = textBefore.match(/\[\[([^\]]+)$/)
              if (match) {
                const linkText = match[1]
                const linkStart = from - linkText.length - 2
                const linkEnd = from + 1 // Include the final ]

                // Replace [[text]] with wiki link mark
                tr.delete(linkStart, linkEnd)
                tr.insertText(linkText, linkStart)
                tr.addMark(
                  linkStart,
                  linkStart + linkText.length,
                  state.schema.marks.wikiLink.create({ title: linkText, exists: true })
                )

                view.dispatch(tr)
                return true
              }
            }
            return false
          },

          // Add decorations for in-progress wiki links
          decorations: (state) => {
            const { doc } = state
            const decorations: Decoration[] = []

            // Find [[... patterns that haven't been closed yet
            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const regex = /\[\[([^\]]+)$/g
                let match: RegExpExecArray | null

                while ((match = regex.exec(node.text)) !== null) {
                  const start = pos + match.index
                  const end = pos + match.index + match[0].length

                  decorations.push(
                    Decoration.inline(start, end, {
                      class: 'wiki-link-pending',
                    })
                  )
                }
              }
            })

            return DecorationSet.create(doc, decorations)
          },

          // Handle clicks on wiki links
          handleClick: (view, pos, event) => {
            const { state } = view
            const { doc } = state

            const resolvedPos = doc.resolve(pos)
            const mark = resolvedPos.marks().find((m) => m.type.name === 'wikiLink')

            if (mark && onLinkClick) {
              onLinkClick(mark.attrs.title)
              event.preventDefault()
              return true
            }

            return false
          },
        },
      }),
    ]
  },

  addKeyboardShortcuts() {
    return {
      // Cmd+K to create wiki link
      'Mod-k': () => {
        const { state } = this.editor
        const { selection } = state
        const text = state.doc.textBetween(selection.from, selection.to)

        if (text) {
          return this.editor.commands.setWikiLink(text)
        }

        return false
      },
    }
  },
})

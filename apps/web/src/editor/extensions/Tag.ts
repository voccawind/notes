// Custom Tiptap Extension for Tags #tag
import { Mark, mergeAttributes } from '@tiptap/core'
import { Plugin, PluginKey } from '@tiptap/pm/state'
import { Decoration, DecorationSet } from '@tiptap/pm/view'

export interface TagOptions {
  HTMLAttributes: Record<string, unknown>
  onTagClick?: (tag: string) => void
  suggestionRenderer?: (query: string) => string[]
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    tag: {
      setTag: (tag: string) => ReturnType
      unsetTag: () => ReturnType
    }
  }
}

export const Tag = Mark.create<TagOptions>({
  name: 'tag',

  addOptions() {
    return {
      HTMLAttributes: {},
      onTagClick: undefined,
      suggestionRenderer: undefined,
    }
  },

  addAttributes() {
    return {
      tag: {
        default: null,
        parseHTML: (element) => element.getAttribute('data-tag'),
        renderHTML: (attributes) => {
          return {
            'data-tag': attributes.tag,
            class: 'tag',
          }
        },
      },
    }
  },

  parseHTML() {
    return [
      {
        tag: 'span[data-type="tag"]',
      },
    ]
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        'data-type': 'tag',
      }),
      0,
    ]
  },

  addCommands() {
    return {
      setTag:
        (tag) =>
        ({ commands }) => {
          return commands.setMark(this.name, { tag })
        },
      unsetTag:
        () =>
        ({ commands }) => {
          return commands.unsetMark(this.name)
        },
    }
  },

  addProseMirrorPlugins() {
    const { onTagClick } = this.options

    return [
      // Auto-convert #tag to tag marks
      new Plugin({
        key: new PluginKey('tagAutodetect'),
        props: {
          handleTextInput: (view, from, to, text) => {
            // Trigger on space, newline, or punctuation after tag
            if (text === ' ' || text === '\n' || text === ',' || text === '.') {
              const { state } = view
              const { doc, tr } = state
              const textBefore = doc.textBetween(Math.max(0, from - 100), from, '\n')

              // Match #tag pattern (letters, numbers, dash, underscore, slash)
              const match = textBefore.match(/#([a-zA-Z0-9_/-]+)$/)
              if (match) {
                const tagText = match[1]
                const tagStart = from - tagText.length - 1 // Include the #
                const tagEnd = from

                // Replace #tag with tag mark
                tr.delete(tagStart, tagEnd)
                tr.insertText(`#${tagText}`, tagStart)
                tr.addMark(
                  tagStart,
                  tagStart + tagText.length + 1,
                  state.schema.marks.tag.create({ tag: tagText })
                )

                // Insert the trigger character (space, newline, etc.)
                tr.insertText(text, tagStart + tagText.length + 1)

                view.dispatch(tr)
                return true
              }
            }
            return false
          },

          // Add decorations for in-progress tags
          decorations: (state) => {
            const { doc } = state
            const decorations: Decoration[] = []

            // Find #... patterns that are still being typed
            doc.descendants((node, pos) => {
              if (node.isText && node.text) {
                const regex = /#([a-zA-Z0-9_/-]+)$/g
                let match: RegExpExecArray | null

                while ((match = regex.exec(node.text)) !== null) {
                  const start = pos + match.index
                  const end = pos + match.index + match[0].length

                  decorations.push(
                    Decoration.inline(start, end, {
                      class: 'tag-pending',
                    })
                  )
                }
              }
            })

            return DecorationSet.create(doc, decorations)
          },

          // Handle clicks on tags
          handleClick: (view, pos, event) => {
            const { state } = view
            const { doc } = state

            const resolvedPos = doc.resolve(pos)
            const mark = resolvedPos.marks().find((m) => m.type.name === 'tag')

            if (mark && onTagClick) {
              onTagClick(mark.attrs.tag)
              event.preventDefault()
              return true
            }

            return false
          },
        },
      }),
    ]
  },
})

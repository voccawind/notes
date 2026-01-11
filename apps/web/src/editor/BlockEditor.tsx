// Block Editor Component with Tiptap + Yjs
import React, { useEffect } from 'react'
import { useEditor, EditorContent, Editor as TiptapEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import TaskList from '@tiptap/extension-task-list'
import TaskItem from '@tiptap/extension-task-item'
import Link from '@tiptap/extension-link'
import Collaboration from '@tiptap/extension-collaboration'
import * as Y from 'yjs'
import { WikiLink } from './extensions/WikiLink'
import { Tag } from './extensions/Tag'
import type { UUID } from '@orbit/shared-types'

export interface BlockEditorProps {
  noteId: UUID
  ydoc: Y.Doc
  placeholder?: string
  onUpdate?: (editor: TiptapEditor) => void
  onWikiLinkClick?: (title: string) => void
  onTagClick?: (tag: string) => void
  editable?: boolean
  autoFocus?: boolean
}

export const BlockEditor: React.FC<BlockEditorProps> = ({
  noteId,
  ydoc,
  placeholder = 'Start writing...',
  onUpdate,
  onWikiLinkClick,
  onTagClick,
  editable = true,
  autoFocus = false,
}) => {
  const editor = useEditor({
    extensions: [
      // Core extensions
      StarterKit.configure({
        // Disable default history (Yjs handles it)
        history: false,
        // Configure heading levels
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
        // Configure code blocks
        codeBlock: {
          HTMLAttributes: {
            class: 'code-block',
          },
        },
      }),

      // Collaboration (Yjs)
      Collaboration.configure({
        document: ydoc,
        field: 'content',
      }),

      // Tasks
      TaskList.configure({
        HTMLAttributes: {
          class: 'task-list',
        },
      }),
      TaskItem.configure({
        nested: true,
        HTMLAttributes: {
          class: 'task-item',
        },
      }),

      // Links
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'link',
        },
      }),

      // Custom Extensions
      WikiLink.configure({
        onLinkClick: onWikiLinkClick,
        HTMLAttributes: {
          class: 'wiki-link',
        },
      }),

      Tag.configure({
        onTagClick: onTagClick,
        HTMLAttributes: {
          class: 'tag',
        },
      }),

      // Placeholder
      Placeholder.configure({
        placeholder,
        showOnlyWhenEditable: true,
      }),
    ],
    editable,
    autofocus: autoFocus,
    onUpdate: ({ editor }) => {
      if (onUpdate) {
        onUpdate(editor)
      }
    },
    editorProps: {
      attributes: {
        class: 'block-editor',
        'data-note-id': noteId,
      },
    },
  })

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [editor])

  // Update editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editor, editable])

  if (!editor) {
    return null
  }

  return (
    <div className="block-editor-wrapper">
      <EditorContent editor={editor} />
    </div>
  )
}

// Hook for using editor commands externally
export function useEditorCommands(editor: TiptapEditor | null) {
  return {
    // Text formatting
    toggleBold: () => editor?.chain().focus().toggleBold().run(),
    toggleItalic: () => editor?.chain().focus().toggleItalic().run(),
    toggleStrike: () => editor?.chain().focus().toggleStrike().run(),
    toggleCode: () => editor?.chain().focus().toggleCode().run(),

    // Blocks
    setParagraph: () => editor?.chain().focus().setParagraph().run(),
    setHeading: (level: 1 | 2 | 3 | 4 | 5 | 6) =>
      editor?.chain().focus().setHeading({ level }).run(),
    toggleBulletList: () => editor?.chain().focus().toggleBulletList().run(),
    toggleOrderedList: () => editor?.chain().focus().toggleOrderedList().run(),
    toggleTaskList: () => editor?.chain().focus().toggleTaskList().run(),
    toggleCodeBlock: () => editor?.chain().focus().toggleCodeBlock().run(),
    toggleBlockquote: () => editor?.chain().focus().toggleBlockquote().run(),
    setHorizontalRule: () => editor?.chain().focus().setHorizontalRule().run(),

    // Links
    setLink: (url: string) =>
      editor?.chain().focus().setLink({ href: url }).run(),
    unsetLink: () => editor?.chain().focus().unsetLink().run(),

    // Wiki Links
    setWikiLink: (title: string) =>
      editor?.chain().focus().setWikiLink(title).run(),
    unsetWikiLink: () => editor?.chain().focus().unsetWikiLink().run(),

    // Tags
    setTag: (tag: string) => editor?.chain().focus().setTag(tag).run(),
    unsetTag: () => editor?.chain().focus().unsetTag().run(),

    // Undo/Redo (Yjs handles this)
    undo: () => editor?.chain().focus().undo().run(),
    redo: () => editor?.chain().focus().redo().run(),

    // Selection
    selectAll: () => editor?.chain().focus().selectAll().run(),
    clearContent: () => editor?.chain().focus().clearContent().run(),

    // State queries
    isActive: (name: string, attrs?: Record<string, unknown>) =>
      editor?.isActive(name, attrs) || false,
    can: () => editor?.can(),
  }
}

// Helper to extract content as markdown
export function getEditorMarkdown(editor: TiptapEditor | null): string {
  if (!editor) return ''

  // Simple markdown extraction (can be enhanced with a proper extension)
  const { doc } = editor.state
  let markdown = ''

  doc.descendants((node) => {
    if (node.type.name === 'heading') {
      const level = node.attrs.level
      markdown += '#'.repeat(level) + ' ' + node.textContent + '\n\n'
    } else if (node.type.name === 'paragraph') {
      markdown += node.textContent + '\n\n'
    } else if (node.type.name === 'bulletList') {
      markdown += '- ' + node.textContent + '\n'
    } else if (node.type.name === 'orderedList') {
      markdown += '1. ' + node.textContent + '\n'
    } else if (node.type.name === 'codeBlock') {
      markdown += '```\n' + node.textContent + '\n```\n\n'
    } else if (node.type.name === 'blockquote') {
      markdown += '> ' + node.textContent + '\n\n'
    } else if (node.type.name === 'taskItem') {
      const checked = node.attrs.checked ? 'x' : ' '
      markdown += `- [${checked}] ${node.textContent}\n`
    }
  })

  return markdown.trim()
}

// Helper to extract plain text
export function getEditorText(editor: TiptapEditor | null): string {
  return editor?.state.doc.textContent || ''
}

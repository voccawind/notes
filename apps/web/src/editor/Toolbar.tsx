// Editor Toolbar Component
import React from 'react'
import type { Editor as TiptapEditor } from '@tiptap/react'

export interface ToolbarProps {
  editor: TiptapEditor | null
  className?: string
}

export const Toolbar: React.FC<ToolbarProps> = ({ editor, className = '' }) => {
  if (!editor) {
    return null
  }

  const Button: React.FC<{
    onClick: () => void
    active?: boolean
    disabled?: boolean
    title: string
    children: React.ReactNode
  }> = ({ onClick, active = false, disabled = false, title, children }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={`toolbar-button ${active ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
      type="button"
    >
      {children}
    </button>
  )

  return (
    <div className={`editor-toolbar ${className}`}>
      {/* Text Formatting */}
      <div className="toolbar-group">
        <Button
          onClick={() => editor.chain().focus().toggleBold().run()}
          active={editor.isActive('bold')}
          disabled={!editor.can().chain().focus().toggleBold().run()}
          title="Bold (Ctrl+B)"
        >
          <strong>B</strong>
        </Button>

        <Button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          active={editor.isActive('italic')}
          disabled={!editor.can().chain().focus().toggleItalic().run()}
          title="Italic (Ctrl+I)"
        >
          <em>I</em>
        </Button>

        <Button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          active={editor.isActive('strike')}
          disabled={!editor.can().chain().focus().toggleStrike().run()}
          title="Strikethrough"
        >
          <s>S</s>
        </Button>

        <Button
          onClick={() => editor.chain().focus().toggleCode().run()}
          active={editor.isActive('code')}
          disabled={!editor.can().chain().focus().toggleCode().run()}
          title="Inline Code"
        >
          {'</>'}
        </Button>
      </div>

      {/* Headings */}
      <div className="toolbar-group">
        <Button
          onClick={() => editor.chain().focus().setParagraph().run()}
          active={editor.isActive('paragraph')}
          title="Paragraph"
        >
          P
        </Button>

        {[1, 2, 3].map((level) => (
          <Button
            key={level}
            onClick={() => editor.chain().focus().setHeading({ level: level as 1 | 2 | 3 }).run()}
            active={editor.isActive('heading', { level })}
            title={`Heading ${level}`}
          >
            H{level}
          </Button>
        ))}
      </div>

      {/* Lists */}
      <div className="toolbar-group">
        <Button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          active={editor.isActive('bulletList')}
          title="Bullet List"
        >
          • List
        </Button>

        <Button
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          active={editor.isActive('orderedList')}
          title="Numbered List"
        >
          1. List
        </Button>

        <Button
          onClick={() => editor.chain().focus().toggleTaskList().run()}
          active={editor.isActive('taskList')}
          title="Task List"
        >
          ☑ Tasks
        </Button>
      </div>

      {/* Block Types */}
      <div className="toolbar-group">
        <Button
          onClick={() => editor.chain().focus().toggleCodeBlock().run()}
          active={editor.isActive('codeBlock')}
          title="Code Block"
        >
          {'{ }'}
        </Button>

        <Button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          active={editor.isActive('blockquote')}
          title="Quote"
        >
          " "
        </Button>

        <Button
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horizontal Line"
        >
          ―
        </Button>
      </div>

      {/* Undo/Redo */}
      <div className="toolbar-group">
        <Button
          onClick={() => editor.chain().focus().undo().run()}
          disabled={!editor.can().chain().focus().undo().run()}
          title="Undo (Ctrl+Z)"
        >
          ↶
        </Button>

        <Button
          onClick={() => editor.chain().focus().redo().run()}
          disabled={!editor.can().chain().focus().redo().run()}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↷
        </Button>
      </div>
    </div>
  )
}

// Floating Bubble Menu (appears on text selection)
export const BubbleMenu: React.FC<{
  editor: TiptapEditor | null
}> = ({ editor }) => {
  if (!editor) {
    return null
  }

  return (
    <div className="bubble-menu">
      <button
        onClick={() => editor.chain().focus().toggleBold().run()}
        className={editor.isActive('bold') ? 'active' : ''}
      >
        Bold
      </button>
      <button
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className={editor.isActive('italic') ? 'active' : ''}
      >
        Italic
      </button>
      <button
        onClick={() => {
          const url = window.prompt('URL:')
          if (url) {
            editor.chain().focus().setLink({ href: url }).run()
          }
        }}
        className={editor.isActive('link') ? 'active' : ''}
      >
        Link
      </button>
      <button
        onClick={() => {
          const title = window.prompt('Note title:')
          if (title) {
            editor.chain().focus().setWikiLink(title).run()
          }
        }}
      >
        [[Link]]
      </button>
    </div>
  )
}

// Slash Command Menu (appears when typing /)
export const SlashCommandMenu: React.FC<{
  onCommand: (command: string) => void
  visible: boolean
  position: { top: number; left: number }
}> = ({ onCommand, visible, position }) => {
  if (!visible) return null

  const commands = [
    { label: 'Heading 1', command: 'h1', icon: 'H1' },
    { label: 'Heading 2', command: 'h2', icon: 'H2' },
    { label: 'Heading 3', command: 'h3', icon: 'H3' },
    { label: 'Bullet List', command: 'bullet', icon: '•' },
    { label: 'Numbered List', command: 'number', icon: '1.' },
    { label: 'Task List', command: 'task', icon: '☑' },
    { label: 'Code Block', command: 'code', icon: '</>' },
    { label: 'Quote', command: 'quote', icon: '"' },
    { label: 'Divider', command: 'divider', icon: '―' },
  ]

  return (
    <div
      className="slash-command-menu"
      style={{
        position: 'absolute',
        top: position.top,
        left: position.left,
      }}
    >
      {commands.map((cmd) => (
        <button
          key={cmd.command}
          className="slash-command-item"
          onClick={() => onCommand(cmd.command)}
        >
          <span className="command-icon">{cmd.icon}</span>
          <span className="command-label">{cmd.label}</span>
        </button>
      ))}
    </div>
  )
}

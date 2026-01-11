// Markdown parser - Convert between Markdown and ORBIT Blocks

import type { Block } from '@orbit/shared-types'

// ====================
// Markdown to Blocks
// ====================

export function parseMarkdown(markdown: string): Block[] {
  const lines = markdown.split('\n')
  const blocks: Block[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const block = parseLine(line, i)
    if (block) {
      blocks.push(block)
    }
  }

  return blocks
}

function parseLine(line: string, index: number): Block | null {
  const trimmed = line.trim()

  // Empty line
  if (trimmed === '') {
    return null
  }

  // Heading
  const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/)
  if (headingMatch) {
    const level = headingMatch[1].length
    const content = headingMatch[2]
    return {
      id: generateId(index),
      type: 'heading',
      content,
      properties: { level },
    }
  }

  // Task (checkbox)
  const taskMatch = trimmed.match(/^-\s+\[([ x])\]\s+(.+)$/)
  if (taskMatch) {
    const checked = taskMatch[1] === 'x'
    const content = taskMatch[2]
    return {
      id: generateId(index),
      type: 'checkbox',
      content,
      properties: { checked },
    }
  }

  // List item
  const listMatch = trimmed.match(/^[-*]\s+(.+)$/)
  if (listMatch) {
    const content = listMatch[1]
    return {
      id: generateId(index),
      type: 'list',
      content,
      properties: { ordered: false },
    }
  }

  // Code block (simplified - doesn't handle multi-line)
  if (trimmed.startsWith('```')) {
    return {
      id: generateId(index),
      type: 'code',
      content: '',
      properties: { language: 'text' },
    }
  }

  // Divider
  if (trimmed.match(/^(---|___|\*\*\*)$/)) {
    return {
      id: generateId(index),
      type: 'divider',
      content: '',
      properties: {},
    }
  }

  // Default: paragraph
  return {
    id: generateId(index),
    type: 'paragraph',
    content: trimmed,
    properties: {},
  }
}

// ====================
// Blocks to Markdown
// ====================

export function blocksToMarkdown(blocks: Block[]): string {
  return blocks.map(blockToMarkdown).join('\n')
}

function blockToMarkdown(block: Block): string {
  switch (block.type) {
    case 'heading': {
      const level = (block.properties.level as number) || 1
      const hashes = '#'.repeat(level)
      return `${hashes} ${block.content}`
    }

    case 'checkbox': {
      const checked = block.properties.checked ? 'x' : ' '
      return `- [${checked}] ${block.content}`
    }

    case 'list':
      return `- ${block.content}`

    case 'code': {
      const language = block.properties.language || ''
      return `\`\`\`${language}\n${block.content}\n\`\`\``
    }

    case 'divider':
      return '---'

    case 'paragraph':
    default:
      return block.content
  }
}

// ====================
// Links & Tags
// ====================

/**
 * Extract [[wiki-links]] from text
 */
export function extractLinks(text: string): string[] {
  const linkRegex = /\[\[([^\]]+)\]\]/g
  const links: string[] = []
  let match: RegExpExecArray | null

  while ((match = linkRegex.exec(text)) !== null) {
    links.push(match[1])
  }

  return links
}

/**
 * Extract #tags from text
 */
export function extractTags(text: string): string[] {
  const tagRegex = /#([a-zA-Z0-9_/-]+)/g
  const tags: string[] = []
  let match: RegExpExecArray | null

  while ((match = tagRegex.exec(text)) !== null) {
    tags.push(match[1])
  }

  return tags
}

/**
 * Replace [[wiki-links]] with HTML anchors
 */
export function renderLinks(text: string): string {
  return text.replace(/\[\[([^\]]+)\]\]/g, '<a href="#/note/$1">$1</a>')
}

/**
 * Replace #tags with HTML spans
 */
export function renderTags(text: string): string {
  return text.replace(/#([a-zA-Z0-9_/-]+)/g, '<span class="tag">#$1</span>')
}

// ====================
// Utilities
// ====================

function generateId(seed: number): string {
  return `block-${seed}-${Date.now()}`
}

/**
 * Sanitize text for safe rendering (basic XSS prevention)
 */
export function sanitizeText(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

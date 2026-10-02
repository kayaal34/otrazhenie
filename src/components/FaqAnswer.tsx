/**
 * Ответ FAQ хранится обычным текстом: строки, начинающиеся с «- »,
 * превращаются в маркированный список, остальные — в абзацы.
 */
export function FaqAnswer({ text }: { text: string }) {
  const blocks: { type: 'p' | 'ul'; lines: string[] }[] = []

  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line) continue
    const isBullet = line.startsWith('- ')
    const content = isBullet ? line.slice(2).trim() : line
    const type = isBullet ? 'ul' : 'p'
    const last = blocks[blocks.length - 1]
    if (type === 'ul' && last?.type === 'ul') last.lines.push(content)
    else blocks.push({ type, lines: [content] })
  }

  return (
    <div className="space-y-2">
      {blocks.map((block, i) =>
        block.type === 'ul' ? (
          <ul key={i} className="list-disc space-y-1.5 pl-5">
            {block.lines.map((l, j) => (
              <li key={j}>{l}</li>
            ))}
          </ul>
        ) : (
          <p key={i}>{block.lines[0]}</p>
        ),
      )}
    </div>
  )
}

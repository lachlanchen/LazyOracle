/** Renders the little markdown a model tends to emit: **bold** and headings. Nothing else. */
export function renderInline(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/).map((part, index) =>
    part.startsWith('**') && part.endsWith('**') ? <strong key={index}>{part.slice(2, -2)}</strong> : <span key={index}>{part.replace(/^#+\s*/, '')}</span>,
  )
}

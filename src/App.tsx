import './App.css'
import { useMemo, useState } from 'react'

type ToolManifest = {
  id: string
  name: string
  icon: string
  tags: string[]
  description: string
  path: string
  version: string
}

const modules = import.meta.glob('./modules/*/manifest.json', { eager: true })
const tools: ToolManifest[] = Object.values(modules).map((mod: any) => mod.default ?? mod)

const allTags = Array.from(new Set(tools.flatMap((tool) => tool.tags))).sort((a, b) =>
  a.localeCompare(b),
)

function convertLength(value: number, from: 'm' | 'km' | 'mi' | 'ft', to: 'm' | 'km' | 'mi' | 'ft') {
  const inMeters: Record<'m' | 'km' | 'mi' | 'ft', number> = {
    m: 1,
    km: 1000,
    mi: 1609.344,
    ft: 0.3048,
  }
  return (value * inMeters[from]) / inMeters[to]
}

function convertTemperature(value: number, from: 'C' | 'F' | 'K', to: 'C' | 'F' | 'K') {
  const toC =
    from === 'C'
      ? value
      : from === 'F'
        ? ((value - 32) * 5) / 9
        : value - 273.15

  if (to === 'C') return toC
  if (to === 'F') return (toC * 9) / 5 + 32
  return toC + 273.15
}

function makePassword(length: number, useUpper: boolean, useLower: boolean, useNumbers: boolean, useSymbols: boolean) {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ'
  const lower = 'abcdefghijkmnopqrstuvwxyz'
  const numbers = '23456789'
  const symbols = '!@#$%^&*()-_=+[]{}:;,.?'

  let charset = ''
  if (useUpper) charset += upper
  if (useLower) charset += lower
  if (useNumbers) charset += numbers
  if (useSymbols) charset += symbols
  if (!charset) return ''

  const random = crypto.getRandomValues(new Uint32Array(length))
  let out = ''
  for (let i = 0; i < length; i += 1) {
    out += charset[random[i] % charset.length]
  }
  return out
}

function markdownToHtml(input: string) {
  const escaped = input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

  return escaped
    .replace(/^### (.*)$/gm, '<h3>$1</h3>')
    .replace(/^## (.*)$/gm, '<h2>$1</h2>')
    .replace(/^# (.*)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
    .replace(/^- (.*)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>')
    .replace(/\n\n/g, '<br/><br/>')
}

function App() {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string>('all')
  const [activeTool, setActiveTool] = useState<string | null>(null)

  const [lengthValue, setLengthValue] = useState('1')
  const [lengthFrom, setLengthFrom] = useState<'m' | 'km' | 'mi' | 'ft'>('m')
  const [lengthTo, setLengthTo] = useState<'m' | 'km' | 'mi' | 'ft'>('km')

  const [tempValue, setTempValue] = useState('25')
  const [tempFrom, setTempFrom] = useState<'C' | 'F' | 'K'>('C')
  const [tempTo, setTempTo] = useState<'C' | 'F' | 'K'>('F')

  const [pwLength, setPwLength] = useState(16)
  const [pwUpper, setPwUpper] = useState(true)
  const [pwLower, setPwLower] = useState(true)
  const [pwNumbers, setPwNumbers] = useState(true)
  const [pwSymbols, setPwSymbols] = useState(true)
  const [password, setPassword] = useState(() => makePassword(16, true, true, true, true))

  const [markdown, setMarkdown] = useState('# Hello\n\n- Write markdown\n- See preview\n\n**Bold**, *italic*, and `inline code`.')

  const filteredTools = useMemo(() => {
    const q = query.toLowerCase().trim()

    return tools.filter((tool) => {
      const tagMatch = activeTag === 'all' || tool.tags.includes(activeTag)
      const textMatch =
        q.length === 0 ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.tags.some((tag) => tag.toLowerCase().includes(q))

      return tagMatch && textMatch
    })
  }, [query, activeTag])

  const lengthNum = Number(lengthValue)
  const lengthResult = Number.isFinite(lengthNum)
    ? convertLength(lengthNum, lengthFrom, lengthTo).toFixed(4)
    : '—'

  const tempNum = Number(tempValue)
  const tempResult = Number.isFinite(tempNum) ? convertTemperature(tempNum, tempFrom, tempTo).toFixed(2) : '—'

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>EnderClaw Tools</h1>
          <p>Static webapp • auto-discovered modules • no backend</p>
        </div>
        <span className="pill">{tools.length} modules</span>
      </header>

      <section className="controls">
        <input
          className="search"
          type="search"
          placeholder="Search tools, tags, keywords..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        <div className="tags">
          <button className={activeTag === 'all' ? 'tag active' : 'tag'} onClick={() => setActiveTag('all')}>
            all
          </button>
          {allTags.map((tag) => (
            <button
              key={tag}
              className={activeTag === tag ? 'tag active' : 'tag'}
              onClick={() => setActiveTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>
      </section>

      <section className="grid">
        {filteredTools.map((tool) => (
          <article className="card" key={tool.id}>
            <div className="cardHead">
              <span className="icon" aria-hidden="true">
                {tool.icon}
              </span>
              <div>
                <h2>{tool.name}</h2>
                <p className="desc">{tool.description}</p>
              </div>
            </div>

            <div className="chipWrap">
              {tool.tags.map((tag) => (
                <span key={`${tool.id}-${tag}`} className="chip">
                  {tag}
                </span>
              ))}
            </div>

            <button className="openBtn" onClick={() => setActiveTool(activeTool === tool.id ? null : tool.id)}>
              {activeTool === tool.id ? 'Close tool' : 'Open tool'}
            </button>

            {activeTool === 'unit-converter' && tool.id === 'unit-converter' && (
              <div className="toolPanel">
                <h3>Length</h3>
                <div className="row">
                  <input value={lengthValue} onChange={(e) => setLengthValue(e.target.value)} />
                  <select value={lengthFrom} onChange={(e) => setLengthFrom(e.target.value as any)}>
                    <option value="m">m</option>
                    <option value="km">km</option>
                    <option value="mi">mi</option>
                    <option value="ft">ft</option>
                  </select>
                  <span>→</span>
                  <select value={lengthTo} onChange={(e) => setLengthTo(e.target.value as any)}>
                    <option value="m">m</option>
                    <option value="km">km</option>
                    <option value="mi">mi</option>
                    <option value="ft">ft</option>
                  </select>
                </div>
                <p className="result">Result: {lengthResult}</p>

                <h3>Temperature</h3>
                <div className="row">
                  <input value={tempValue} onChange={(e) => setTempValue(e.target.value)} />
                  <select value={tempFrom} onChange={(e) => setTempFrom(e.target.value as any)}>
                    <option value="C">°C</option>
                    <option value="F">°F</option>
                    <option value="K">K</option>
                  </select>
                  <span>→</span>
                  <select value={tempTo} onChange={(e) => setTempTo(e.target.value as any)}>
                    <option value="C">°C</option>
                    <option value="F">°F</option>
                    <option value="K">K</option>
                  </select>
                </div>
                <p className="result">Result: {tempResult}</p>
              </div>
            )}

            {activeTool === 'password-generator' && tool.id === 'password-generator' && (
              <div className="toolPanel">
                <div className="row">
                  <label>Length: {pwLength}</label>
                  <input
                    type="range"
                    min={8}
                    max={64}
                    value={pwLength}
                    onChange={(e) => setPwLength(Number(e.target.value))}
                  />
                </div>
                <div className="checks">
                  <label>
                    <input type="checkbox" checked={pwUpper} onChange={(e) => setPwUpper(e.target.checked)} /> Uppercase
                  </label>
                  <label>
                    <input type="checkbox" checked={pwLower} onChange={(e) => setPwLower(e.target.checked)} /> Lowercase
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={pwNumbers}
                      onChange={(e) => setPwNumbers(e.target.checked)}
                    />{' '}
                    Numbers
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={pwSymbols}
                      onChange={(e) => setPwSymbols(e.target.checked)}
                    />{' '}
                    Symbols
                  </label>
                </div>
                <button
                  className="openBtn"
                  onClick={() => setPassword(makePassword(pwLength, pwUpper, pwLower, pwNumbers, pwSymbols))}
                >
                  Generate
                </button>
                <textarea className="mono" readOnly value={password || 'Enable at least one charset.'} />
              </div>
            )}

            {activeTool === 'markdown-preview' && tool.id === 'markdown-preview' && (
              <div className="toolPanel split">
                <textarea value={markdown} onChange={(e) => setMarkdown(e.target.value)} />
                <div className="preview" dangerouslySetInnerHTML={{ __html: markdownToHtml(markdown) }} />
              </div>
            )}
          </article>
        ))}
      </section>
    </main>
  )
}

export default App

import './App.css'
import { useEffect, useMemo, useState, type ComponentType } from 'react'

type ToolManifest = {
  id: string
  name: string
  icon: string
  tags: string[]
  description: string
  path: string
  version: string
}

type ToolComponent = ComponentType

const manifestModules = import.meta.glob('./modules/*/manifest.json', { eager: true })
const toolModules = import.meta.glob('./modules/*/Tool.tsx', { eager: true }) as Record<string, { default: ToolComponent }>

const tools: ToolManifest[] = Object.values(manifestModules).map((mod: any) => mod.default ?? mod)
const componentById: Record<string, ToolComponent> = {}

for (const [path, mod] of Object.entries(toolModules)) {
  const match = path.match(/\.\/modules\/([^/]+)\/Tool\.tsx$/)
  if (!match) continue
  componentById[match[1]] = mod.default
}

const allTags = Array.from(new Set(tools.flatMap((t) => t.tags))).sort((a, b) => a.localeCompare(b))

function getToolIdFromHash(hash: string) {
  const m = hash.match(/^#\/tools\/([^/?#]+)/)
  return m?.[1] ?? null
}

function App() {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState('all')
  const [activeToolId, setActiveToolId] = useState<string | null>(() => getToolIdFromHash(window.location.hash))

  useEffect(() => {
    const onHash = () => setActiveToolId(getToolIdFromHash(window.location.hash))
    window.addEventListener('hashchange', onHash)
    return () => window.removeEventListener('hashchange', onHash)
  }, [])

  const filteredTools = useMemo(() => {
    const q = query.toLowerCase().trim()
    return tools.filter((tool) => {
      const tagMatch = activeTag === 'all' || tool.tags.includes(activeTag)
      const textMatch =
        !q ||
        tool.name.toLowerCase().includes(q) ||
        tool.description.toLowerCase().includes(q) ||
        tool.tags.some((tag) => tag.toLowerCase().includes(q))
      return tagMatch && textMatch
    })
  }, [query, activeTag])

  if (activeToolId) {
    const tool = tools.find((t) => t.id === activeToolId)
    const Tool = componentById[activeToolId]
    if (!tool || !Tool) {
      return (
        <main className="app">
          <a className="openBtn" href="#/">← Back</a>
          <p>Tool not found.</p>
        </main>
      )
    }

    return (
      <main className="app">
        <header className="topbar">
          <div>
            <h1>{tool.icon} {tool.name}</h1>
            <p>{tool.description}</p>
          </div>
          <a className="openBtn" href="#/">← Back to tools</a>
        </header>
        <Tool />
      </main>
    )
  }

  return (
    <main className="app">
      <header className="topbar">
        <div>
          <h1>EnderClaw Tools</h1>
          <p>Each module is fully isolated in its own folder.</p>
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
          <button className={activeTag === 'all' ? 'tag active' : 'tag'} onClick={() => setActiveTag('all')}>all</button>
          {allTags.map((tag) => (
            <button key={tag} className={activeTag === tag ? 'tag active' : 'tag'} onClick={() => setActiveTag(tag)}>{tag}</button>
          ))}
        </div>
      </section>

      <section className="grid">
        {filteredTools.map((tool) => (
          <article className="card" key={tool.id}>
            <div className="cardHead">
              <span className="icon">{tool.icon}</span>
              <div>
                <h2>{tool.name}</h2>
                <p className="desc">{tool.description}</p>
              </div>
            </div>
            <div className="chipWrap">
              {tool.tags.map((tag) => <span key={`${tool.id}-${tag}`} className="chip">{tag}</span>)}
            </div>
            <a className="openBtn" href={tool.path}>Open tool</a>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App

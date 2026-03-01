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

function App() {
  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string>('all')

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
          <button
            className={activeTag === 'all' ? 'tag active' : 'tag'}
            onClick={() => setActiveTag('all')}
          >
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

            <a className="openBtn" href={tool.path}>
              Open dummy tool
            </a>
          </article>
        ))}
      </section>
    </main>
  )
}

export default App

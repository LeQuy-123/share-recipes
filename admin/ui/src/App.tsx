import { useState } from 'react'
import { api, errorText } from './api'
import { CheckPage } from './pages/Check'
import { Dashboard } from './pages/Dashboard'
import { IngredientEditor, IngredientsPage } from './pages/Ingredients'
import { LookupsPage } from './pages/Lookups'
import { RecipeEditor } from './pages/RecipeEditor'
import { RecipesPage } from './pages/Recipes'
import { MAIN_APP, useRoute } from './router'
import { StoreProvider, useStore } from './store'

const NAV = [
  { path: '', label: 'Tổng quan' },
  { path: 'recipes', label: 'Công thức' },
  { path: 'ingredients', label: 'Nguyên liệu' },
  { path: 'lookups', label: 'Danh mục' },
  { path: 'check', label: 'Kiểm tra' },
]

export default function App() {
  return (
    <StoreProvider>
      <Shell />
    </StoreProvider>
  )
}

function Shell() {
  const { state, error, reload, toast, toasts, dismiss } = useStore()
  const [section = '', id] = useRoute()
  const [rebuilding, setRebuilding] = useState(false)

  const rebuild = async () => {
    setRebuilding(true)
    try {
      const r = await api.rebuild()
      await reload()
      toast(`Đã build lại và xuất bản (${r.warnings.length} cảnh báo)`)
    } catch (e) {
      toast(errorText(e), 'error')
    } finally {
      setRebuilding(false)
    }
  }

  let page
  if (!state) page = <div className="page">{error ? <p className="error-box pre">{error}</p> : <p className="muted">Đang tải dữ liệu…</p>}</div>
  else if (section === 'recipes' && id) page = <RecipeEditor key={id} id={id} />
  else if (section === 'recipes') page = <RecipesPage />
  else if (section === 'ingredients' && id) page = <IngredientEditor key={id} id={id} />
  else if (section === 'ingredients') page = <IngredientsPage />
  else if (section === 'lookups') page = <LookupsPage />
  else if (section === 'check') page = <CheckPage />
  else page = <Dashboard />

  return (
    <div className="layout">
      <aside className="sidebar">
        <div className="brand">
          AutoRecipt <span>admin</span>
        </div>
        <nav>
          {NAV.map((n) => (
            <a key={n.path} href={`#/${n.path}`} className={section === n.path ? 'on' : ''} aria-current={section === n.path ? 'page' : undefined}>
              {n.label}
              {n.path === 'check' && state?.warnings ? <span className="pill">{state.warnings}</span> : null}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot">
          <a href={MAIN_APP} target="_blank" rel="noreferrer">
            Mở app chính ↗
          </a>
          <small className="muted">Build: {state?.built_at?.replace('T', ' ').replace('+00:00', ' UTC') ?? '—'}</small>
          <button type="button" onClick={rebuild} disabled={rebuilding} title="Đọc lại file trên đĩa, build và xuất bản">
            {rebuilding ? 'Đang build…' : 'Build lại & xuất bản'}
          </button>
        </div>
      </aside>
      <main>{page}</main>
      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span className="pre">{t.text}</span>
            <button type="button" className="ghost" onClick={() => dismiss(t.id)} aria-label="Đóng">
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}

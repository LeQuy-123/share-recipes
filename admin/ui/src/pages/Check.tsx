import { useEffect, useState } from 'react'
import { api, errorText } from '../api'
import { useStore } from '../store'
import type { Issue } from '../types'

const LEVEL = { error: 'Lỗi', warning: 'Cảnh báo', info: 'Gợi ý' }

export function CheckPage() {
  const { state, ingredientName } = useStore()
  const [issues, setIssues] = useState<Issue[] | null>(null)
  const [level, setLevel] = useState<'' | Issue['level']>('')
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    api
      .check()
      .then((d) => setIssues(d.issues))
      .catch((e) => setError(errorText(e)))
  }, [state?.built_at])

  const recipeName = (id: string) => state?.recipes.find((r) => r.id === id)?.name_vi
  const link = (i: Issue) => {
    if (recipeName(i.id)) return { href: `#/recipes/${i.id}`, text: recipeName(i.id)! }
    if (state?.ingredients.some((x) => x.id === i.id)) return { href: `#/ingredients/${i.id}`, text: ingredientName(i.id) }
    return null
  }
  const shown = (issues ?? []).filter((i) => !level || i.level === level)
  const counts = (l: Issue['level']) => (issues ?? []).filter((i) => i.level === l).length

  return (
    <div className="page">
      <h1>Kiểm tra dữ liệu</h1>
      <p className="muted">Cảnh báo từ lần build gần nhất ({state?.built_at}) và các mục còn thiếu.</p>
      {error && <p className="error-box pre">{error}</p>}
      <div className="tabs">
        <button type="button" className={!level ? 'on' : ''} onClick={() => setLevel('')}>
          Tất cả {issues?.length ?? ''}
        </button>
        {(['error', 'warning', 'info'] as const).map((l) => (
          <button key={l} type="button" className={level === l ? 'on' : ''} onClick={() => setLevel(l)}>
            {LEVEL[l]} {counts(l)}
          </button>
        ))}
      </div>
      {issues && shown.length === 0 && <p className="ok-text">Không có vấn đề nào. 🎉</p>}
      <ul className="issues">
        {shown.map((i, k) => {
          const l = link(i)
          return (
            <li key={k} className={i.level}>
              <span className="badge">{LEVEL[i.level]}</span>
              {l ? <a href={l.href}>{l.text}</a> : <code>{i.id}</code>}
              <span>{i.message}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

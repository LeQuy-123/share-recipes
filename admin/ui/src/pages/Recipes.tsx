import { useMemo, useState } from 'react'
import { Stars } from '../components'
import { useStore } from '../store'
import { go } from '../router'

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/đ/g, 'd')
    .toLowerCase()

export function RecipesPage() {
  const { state, label, rows } = useStore()
  const [q, setQ] = useState('')
  const [cuisine, setCuisine] = useState('')
  const [stars, setStars] = useState('')
  const [noImage, setNoImage] = useState(window.location.hash.includes('noimage'))
  const [sort, setSort] = useState<'name' | 'difficulty' | 'kcal' | 'health'>('name')

  const list = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean)
    const out = (state?.recipes ?? []).filter(
      (r) =>
        words.every((w) => fold(`${r.name_vi} ${r.name_en ?? ''} ${r.id}`).includes(w)) &&
        (!cuisine || r.cuisine === cuisine) &&
        (!stars || r.difficulty === Number(stars)) &&
        (!noImage || !r.has_image),
    )
    const key = {
      name: (a: (typeof out)[number], b: (typeof out)[number]) => a.name_vi.localeCompare(b.name_vi, 'vi'),
      difficulty: (a: (typeof out)[number], b: (typeof out)[number]) => a.difficulty - b.difficulty,
      kcal: (a: (typeof out)[number], b: (typeof out)[number]) => (a.kcal ?? 0) - (b.kcal ?? 0),
      health: (a: (typeof out)[number], b: (typeof out)[number]) => (b.health_score ?? 0) - (a.health_score ?? 0),
    }[sort]
    return out.sort(key)
  }, [state, q, cuisine, stars, noImage, sort])

  return (
    <div className="page">
      <div className="page-head">
        <h1>
          Công thức <span className="count">{list.length}</span>
        </h1>
        <button type="button" className="primary" onClick={() => go('/recipes/new')}>
          + Công thức mới
        </button>
      </div>
      <div className="filters">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tìm theo tên, không cần dấu" aria-label="Tìm công thức" />
        <select value={cuisine} onChange={(e) => setCuisine(e.target.value)} aria-label="Ẩm thực">
          <option value="">Mọi ẩm thực</option>
          {rows('cuisines').map((c) => (
            <option key={String(c.id)} value={String(c.id)}>
              {c.name_vi}
            </option>
          ))}
        </select>
        <select value={stars} onChange={(e) => setStars(e.target.value)} aria-label="Độ khó">
          <option value="">Mọi độ khó</option>
          {[1, 2, 3, 4, 5].map((n) => (
            <option key={n} value={n}>
              {'★'.repeat(n)} {label('difficulty_levels', n)}
            </option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value as typeof sort)} aria-label="Sắp xếp">
          <option value="name">Sắp theo tên</option>
          <option value="difficulty">Dễ → khó</option>
          <option value="kcal">Ít → nhiều kcal</option>
          <option value="health">Lành mạnh nhất</option>
        </select>
        <label className="check">
          <input type="checkbox" checked={noImage} onChange={(e) => setNoImage(e.target.checked)} /> Chưa có ảnh
        </label>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Tên món</th>
              <th>Ẩm thực</th>
              <th>Loại</th>
              <th>Độ khó</th>
              <th className="num">Phút</th>
              <th className="num">kcal/phần</th>
              <th className="num">Lành mạnh</th>
              <th>Ảnh</th>
              <th className="num">Nguồn</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id} onClick={() => go(`/recipes/${r.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(`/recipes/${r.id}`)}>
                <td>
                  <strong>{r.name_vi}</strong>
                  <small className="muted block">{r.id}</small>
                </td>
                <td>{label('cuisines', r.cuisine)}</td>
                <td>{label('dish_types', r.dish_type)}</td>
                <td>
                  <Stars value={r.difficulty} />
                </td>
                <td className="num">{r.total_min}</td>
                <td className={`num${(r.coverage ?? 1) < 1 ? ' warn-text' : ''}`} title={(r.coverage ?? 1) < 1 ? 'Thiếu dữ liệu dinh dưỡng' : ''}>
                  {r.kcal ?? '—'}
                </td>
                <td className="num">{r.health_score ?? '—'}</td>
                <td>{r.has_image ? '✓' : <span className="muted">—</span>}</td>
                <td className={`num${r.references ? '' : ' warn-text'}`}>{r.references}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

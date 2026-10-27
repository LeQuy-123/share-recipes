import { useEffect, useMemo, useState } from 'react'
import { api, errorText } from '../api'
import { ChipsInput, Field, LookupSelect } from '../components'
import { go } from '../router'
import { useStore } from '../store'
import type { Ingredient, Nutrition } from '../types'

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/đ/g, 'd')
    .toLowerCase()

export function IngredientsPage() {
  const { state, label, rows } = useStore()
  const [q, setQ] = useState('')
  const [category, setCategory] = useState('')
  const [filter, setFilter] = useState<'' | 'used' | 'unused' | 'no-nutrition'>('')

  const list = useMemo(() => {
    const words = fold(q).split(/\s+/).filter(Boolean)
    return (state?.ingredients ?? [])
      .filter(
        (i) =>
          words.every((w) => fold(`${i.name_vi} ${i.name_en} ${i.id} ${(i.aliases ?? []).join(' ')}`).includes(w)) &&
          (!category || i.category === category) &&
          (filter !== 'used' || i.used_in > 0) &&
          (filter !== 'unused' || i.used_in === 0) &&
          (filter !== 'no-nutrition' || !i.has_nutrition),
      )
      .sort((a, b) => (b.popularity ?? 0) - (a.popularity ?? 0))
  }, [state, q, category, filter])

  return (
    <div className="page">
      <div className="page-head">
        <h1>
          Nguyên liệu <span className="count">{list.length}</span>
        </h1>
        <button type="button" className="primary" onClick={() => go('/ingredients/new')}>
          + Nguyên liệu mới
        </button>
      </div>
      <div className="filters">
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Tên, tên khác, id…" aria-label="Tìm nguyên liệu" />
        <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="Nhóm">
          <option value="">Mọi nhóm</option>
          {rows('ingredient_categories').map((c) => (
            <option key={String(c.id)} value={String(c.id)}>
              {c.name_vi}
            </option>
          ))}
        </select>
        <select value={filter} onChange={(e) => setFilter(e.target.value as typeof filter)} aria-label="Lọc">
          <option value="">Tất cả</option>
          <option value="used">Đang dùng trong công thức</option>
          <option value="unused">Chưa dùng</option>
          <option value="no-nutrition">Thiếu dinh dưỡng</option>
        </select>
      </div>
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>Tên</th>
              <th>Nhóm</th>
              <th className="num">Phổ biến</th>
              <th className="num">Điểm tìm kiếm</th>
              <th className="num">Số món</th>
              <th>Gia vị cơ bản</th>
              <th>Dinh dưỡng</th>
            </tr>
          </thead>
          <tbody>
            {list.map((i) => (
              <tr key={i.id} onClick={() => go(`/ingredients/${i.id}`)} tabIndex={0} onKeyDown={(e) => e.key === 'Enter' && go(`/ingredients/${i.id}`)}>
                <td>
                  <strong>{i.name_vi}</strong> <span className="muted">{i.name_en}</span>
                  <small className="muted block">{i.id}</small>
                </td>
                <td>{label('ingredient_categories', i.category)}</td>
                <td className="num">{i.commonness ?? '—'}</td>
                <td className="num">{i.popularity ?? '—'}</td>
                <td className="num">{i.used_in || <span className="muted">0</span>}</td>
                <td>{i.pantry_staple ? '✓' : ''}</td>
                <td className={i.used_in && !i.has_nutrition ? 'warn-text' : ''}>{i.has_nutrition ? '✓' : i.used_in ? 'thiếu' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const BLANK: Ingredient = { name_vi: '', name_en: '', category: 'vegetable', commonness: 3, pantry_staple: false, aliases: [] }
const NUTRIENTS: [keyof Nutrition, string][] = [
  ['kcal', 'kcal'],
  ['protein', 'Đạm (g)'],
  ['fat', 'Béo (g)'],
  ['carbs', 'Tinh bột (g)'],
  ['fiber', 'Chất xơ (g)'],
]

function slugId(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_|_$/g, '')
}

export function IngredientEditor({ id }: { id: string }) {
  const { state, reload, toast, label } = useStore()
  const creating = id === 'new'
  const [ing, setIng] = useState<Ingredient | null>(creating ? BLANK : null)
  const [nutrition, setNutrition] = useState<Nutrition | null>(null)
  const [usedIn, setUsedIn] = useState<Record<string, string>>({})
  const [newId, setNewId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (creating) {
      setIng(BLANK)
      setNutrition(null)
      return
    }
    api
      .ingredient(id)
      .then((d) => {
        setIng(d.ingredient)
        setNutrition(d.nutrition)
        setUsedIn(d.used_in)
      })
      .catch((e) => setError(errorText(e)))
  }, [id, creating])

  if (error && !ing) return <div className="page"><p className="bad pre">{error}</p></div>
  if (!ing || !state) return <div className="page muted">Đang tải…</div>

  const saveId = creating ? newId || slugId(ing.name_en || ing.name_vi) : id
  const recipeName = (rid: string) => state.recipes.find((r) => r.id === rid)?.name_vi ?? rid
  const units = Object.entries(state.units).filter(([, u]) => u.type === 'count')

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.saveIngredient(saveId, { ...ing, nutrition }, creating)
      await reload()
      toast(`Đã lưu “${ing.name_vi}”`)
      if (creating) go(`/ingredients/${saveId}`)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Xoá nguyên liệu “${ing.name_vi}”?`)) return
    setBusy(true)
    try {
      await api.deleteIngredient(id)
      await reload()
      toast(`Đã xoá “${ing.name_vi}”`)
      go('/ingredients')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const setNut = (patch: Partial<Nutrition>) =>
    setNutrition({ kcal: 0, protein: 0, fat: 0, carbs: 0, fiber: 0, ...nutrition, ...patch })

  return (
    <div className="page editor">
      <div className="page-head">
        <div>
          <a href="#/ingredients" className="muted">
            ← Nguyên liệu
          </a>
          <h1>{creating ? 'Nguyên liệu mới' : ing.name_vi}</h1>
          {!creating && (
            <p className="muted">
              {id} · lưu trong <code>{ing._home}</code>
            </p>
          )}
        </div>
      </div>
      {error && <p className="error-box pre">{error}</p>}

      <section className="panel">
        <h2>Thông tin</h2>
        <div className="grid">
          <Field label="Tên tiếng Việt *">
            <input value={ing.name_vi} onChange={(e) => setIng({ ...ing, name_vi: e.target.value })} />
          </Field>
          <Field label="Tên tiếng Anh *">
            <input value={ing.name_en} onChange={(e) => setIng({ ...ing, name_en: e.target.value })} />
          </Field>
          {creating && (
            <Field label="ID (không đổi được sau khi tạo)" hint="chữ thường, gạch dưới, vd: pork_belly">
              <input value={newId} placeholder={slugId(ing.name_en || ing.name_vi)} onChange={(e) => setNewId(slugId(e.target.value))} />
            </Field>
          )}
          <Field label="Nhóm *">
            <LookupSelect table="ingredient_categories" value={ing.category} onChange={(v) => setIng({ ...ing, category: v ?? 'other' })} />
          </Field>
          <Field label="Độ phổ biến (1–5)" hint="5 = nhà nào cũng có. Dùng để xếp hạng khi người dùng tìm kiếm.">
            <select value={ing.commonness ?? 2} onChange={(e) => setIng({ ...ing, commonness: Number(e.target.value) })}>
              {[1, 2, 3, 4, 5].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Gia vị cơ bản" hint="App coi như nhà nào cũng có (muối, đường, nước mắm…)">
            <label className="check">
              <input type="checkbox" checked={!!ing.pantry_staple} onChange={(e) => setIng({ ...ing, pantry_staple: e.target.checked })} /> Luôn có sẵn
            </label>
          </Field>
          <Field label="Tên gọi khác" hint="Tên vùng miền, viết tắt trên hoá đơn… Bản không dấu được tạo tự động." wide>
            <ChipsInput value={ing.aliases ?? []} onChange={(v) => setIng({ ...ing, aliases: v })} />
          </Field>
        </div>
      </section>

      <section className="panel">
        <div className="row between">
          <h2>Dinh dưỡng / 100 g</h2>
          {nutrition ? (
            <button type="button" className="ghost" onClick={() => setNutrition(null)}>
              Bỏ dữ liệu dinh dưỡng
            </button>
          ) : (
            <button type="button" onClick={() => setNut({})}>
              + Thêm dinh dưỡng
            </button>
          )}
        </div>
        {nutrition ? (
          <>
            <div className="grid five">
              {NUTRIENTS.map(([k, text]) => (
                <Field key={k} label={text}>
                  <input type="number" step="any" min={0} value={(nutrition[k] as number) ?? 0} onChange={(e) => setNut({ [k]: Number(e.target.value) })} />
                </Field>
              ))}
              <Field label="Khối lượng riêng (g/ml)" hint="cho ml / muỗng; nước = 1">
                <input type="number" step="any" min={0} value={nutrition.density ?? 1} onChange={(e) => setNut({ density: Number(e.target.value) })} />
              </Field>
              <Field label="Phần ăn được (0–1)" hint="vỏ, xương, gia vị bỏ đi">
                <input type="number" step="any" min={0} max={1} value={nutrition.edible ?? 1} onChange={(e) => setNut({ edible: Number(e.target.value) })} />
              </Field>
            </div>
            <h3>Khối lượng 1 đơn vị đếm (g)</h3>
            <div className="grid five">
              {units.map(([u, d]) => (
                <Field key={u} label={`1 ${d.vi}`}>
                  <input
                    type="number"
                    step="any"
                    min={0}
                    value={nutrition.units?.[u] ?? ''}
                    placeholder="—"
                    onChange={(e) => {
                      const next = { ...(nutrition.units ?? {}) }
                      if (e.target.value === '') delete next[u]
                      else next[u] = Number(e.target.value)
                      setNut({ units: next })
                    }}
                  />
                </Field>
              ))}
            </div>
          </>
        ) : (
          <p className="muted">Chưa có. Công thức dùng nguyên liệu này sẽ thiếu calo.</p>
        )}
      </section>

      {!creating && (
        <section className="panel">
          <h2>Dùng trong {Object.keys(usedIn).length} công thức</h2>
          <div className="chips">
            {Object.entries(usedIn).map(([rid, role]) => (
              <a key={rid} className="chip" href={`#/recipes/${rid}`}>
                {recipeName(rid)}
                {role === 'substitute' ? ' (thay thế)' : ''}
              </a>
            ))}
          </div>
          <p className="muted">Nhóm hiện tại: {label('ingredient_categories', ing.category)}</p>
        </section>
      )}

      <div className="save-bar">
        {!creating && (
          <button type="button" className="danger" onClick={remove} disabled={busy || Object.keys(usedIn).length > 0} title={Object.keys(usedIn).length ? 'Đang được dùng trong công thức' : ''}>
            Xoá
          </button>
        )}
        <button type="button" className="primary" onClick={save} disabled={busy || !ing.name_vi || !ing.name_en}>
          {busy ? 'Đang lưu & build…' : 'Lưu & xuất bản'}
        </button>
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { api, errorText } from '../api'
import { useStore } from '../store'
import type { LookupRow, Unit } from '../types'

const TABLES: { id: string; title: string; numericId?: boolean }[] = [
  { id: 'cuisines', title: 'Ẩm thực' },
  { id: 'dish_types', title: 'Loại món' },
  { id: 'cooking_methods', title: 'Cách nấu' },
  { id: 'meal_types', title: 'Bữa' },
  { id: 'proteins', title: 'Đạm chính' },
  { id: 'regions', title: 'Vùng miền' },
  { id: 'ingredient_categories', title: 'Nhóm nguyên liệu' },
  { id: 'ingredient_groups', title: 'Vai trò trong món' },
  { id: 'step_types', title: 'Loại bước' },
  { id: 'difficulty_levels', title: 'Độ khó', numericId: true },
]

export function LookupsPage() {
  const { state } = useStore()
  const [tab, setTab] = useState('cuisines')
  if (!state) return null
  return (
    <div className="page">
      <h1>Danh mục</h1>
      <p className="muted">Các mã dùng chung cho công thức và nguyên liệu. Không xoá được mã đang được dùng.</p>
      <div className="tabs" role="tablist">
        {TABLES.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className={tab === t.id ? 'on' : ''} onClick={() => setTab(t.id)}>
            {t.title}
          </button>
        ))}
        <button type="button" role="tab" aria-selected={tab === 'units'} className={tab === 'units' ? 'on' : ''} onClick={() => setTab('units')}>
          Đơn vị
        </button>
      </div>
      {tab === 'units' ? <UnitsEditor key="units" /> : <LookupTable key={tab} table={tab} numericId={TABLES.find((t) => t.id === tab)?.numericId} />}
    </div>
  )
}

function LookupTable({ table, numericId }: { table: string; numericId?: boolean }) {
  const { state, reload, toast } = useStore()
  const [rows, setRows] = useState<LookupRow[]>(state?.lookups[table] ?? [])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => setRows(state?.lookups[table] ?? []), [state, table])

  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))].filter((c) => c !== 'id')
  if (!columns.includes('name_vi')) columns.unshift('name_vi')
  if (!columns.includes('name_en')) columns.splice(1, 0, 'name_en')
  const setCell = (i: number, col: string, v: string) =>
    setRows(rows.map((r, j) => (j === i ? { ...r, [col]: col === 'sort' ? Number(v) : v === '' && col !== 'name_vi' ? null : v } : r)))

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      await api.saveLookup(table, rows)
      await reload()
      toast('Đã lưu danh mục')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      {error && <p className="error-box pre">{error}</p>}
      <div className="table-wrap">
        <table className="data edit">
          <thead>
            <tr>
              <th>ID</th>
              {columns.map((c) => (
                <th key={c}>{c}</th>
              ))}
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                <td>
                  <input
                    value={String(r.id ?? '')}
                    readOnly={numericId}
                    onChange={(e) => setRows(rows.map((x, j) => (j === i ? { ...x, id: e.target.value.trim() } : x)))}
                  />
                </td>
                {columns.map((c) => (
                  <td key={c}>
                    <input value={(r[c] as string | number | null) ?? ''} type={c === 'sort' ? 'number' : 'text'} onChange={(e) => setCell(i, c, e.target.value)} />
                  </td>
                ))}
                <td>
                  {!numericId && (
                    <button type="button" className="ghost bad" onClick={() => setRows(rows.filter((_, j) => j !== i))} aria-label="Xoá dòng">
                      ×
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="row between">
        {!numericId ? (
          <button type="button" onClick={() => setRows([...rows, { id: '', name_vi: '', name_en: '', sort: rows.length + 1 }])}>
            + Thêm dòng
          </button>
        ) : (
          <span className="muted">Độ khó luôn có 5 mức; chỉ sửa được tên và mô tả.</span>
        )}
        <button type="button" className="primary" onClick={save} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu danh mục'}
        </button>
      </div>
    </section>
  )
}

function UnitsEditor() {
  const { state, reload, toast } = useStore()
  const [units, setUnits] = useState<[string, Unit][]>(Object.entries(state?.units ?? {}))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const set = (i: number, patch: Partial<Unit> & { id?: string }) =>
    setUnits(units.map(([id, u], j) => (j === i ? [patch.id ?? id, { ...u, ...patch, id: undefined } as Unit] : [id, u])))

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const out: Record<string, Unit> = {}
      for (const [id, u] of units) {
        const clean: Unit = { vi: u.vi, en: u.en, type: u.type }
        if (u.ml) clean.ml = Number(u.ml)
        out[id] = clean
      }
      await api.saveUnits(out)
      await reload()
      toast('Đã lưu đơn vị')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="panel">
      {error && <p className="error-box pre">{error}</p>}
      <table className="data edit">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên (vi)</th>
            <th>Tên (en)</th>
            <th>Loại</th>
            <th>ml / đơn vị</th>
            <th />
          </tr>
        </thead>
        <tbody>
          {units.map(([id, u], i) => (
            <tr key={i}>
              <td>
                <input value={id} onChange={(e) => set(i, { id: e.target.value.trim() })} />
              </td>
              <td>
                <input value={u.vi} onChange={(e) => set(i, { vi: e.target.value })} />
              </td>
              <td>
                <input value={u.en} onChange={(e) => set(i, { en: e.target.value })} />
              </td>
              <td>
                <select value={u.type} onChange={(e) => set(i, { type: e.target.value as Unit['type'] })}>
                  <option value="weight">khối lượng</option>
                  <option value="volume">thể tích</option>
                  <option value="count">đếm</option>
                </select>
              </td>
              <td>
                <input type="number" step="any" value={u.ml ?? ''} disabled={u.type !== 'volume'} onChange={(e) => set(i, { ml: e.target.value ? Number(e.target.value) : null })} />
              </td>
              <td>
                <button type="button" className="ghost bad" onClick={() => setUnits(units.filter((_, j) => j !== i))} aria-label="Xoá">
                  ×
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <div className="row between">
        <button type="button" onClick={() => setUnits([...units, ['', { vi: '', en: '', type: 'count' }]])}>
          + Thêm đơn vị
        </button>
        <button type="button" className="primary" onClick={save} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu đơn vị'}
        </button>
      </div>
    </section>
  )
}

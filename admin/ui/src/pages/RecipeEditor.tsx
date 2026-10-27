import { useEffect, useState } from 'react'
import { api, errorText } from '../api'
import { ChipsInput, CommonsPicker, Field, IngredientPicker, LookupSelect, StarsInput, ToggleChips } from '../components'
import { go, MAIN_APP } from '../router'
import { useStore } from '../store'
import type { Recipe, RecipeLine, RecipeNutrition, Step } from '../types'

const BLANK: Recipe = {
  id: '',
  name_vi: '',
  name_en: null,
  other_names: [],
  description: null,
  cuisine: 'vietnamese',
  region: 'all',
  meal_types: ['lunch', 'dinner'],
  dish_type: 'stir_fry',
  cooking_methods: [],
  main_protein: 'none',
  difficulty: 2,
  servings: 4,
  tags: [],
  image: null,
  key_ingredients: [],
  ingredients: [],
  steps: [],
  notes: null,
  references: [],
}

const HEALTH_NOTE: Record<string, string> = {
  low_fat: 'Ít chất béo',
  high_fat: 'Nhiều chất béo',
  high_protein: 'Giàu đạm',
  veg_rich: 'Nhiều rau',
  fiber_rich: 'Nhiều chất xơ',
  high_kcal: 'Nhiều calo',
  deep_fried: 'Chiên ngập dầu',
}

const BLANK_LINE: RecipeLine = { ingredient_id: '', amount: null, unit: 'g', group: 'main', optional: false, substitutes: [] }
const BLANK_STEP: Step = { type: 'cook', duration_min: 5, title: '', text: '', ingredients_used: [], passive: false }

/** "Canh chua cá lóc" -> "canh-chua-ca-loc" */
function slug(s: string) {
  return s
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .replace(/đ/gi, 'd')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function move<T>(list: T[], i: number, d: number): T[] {
  const j = i + d
  if (j < 0 || j >= list.length) return list
  const out = [...list]
  ;[out[i], out[j]] = [out[j], out[i]]
  return out
}

export function RecipeEditor({ id }: { id: string }) {
  const { state, reload, toast, ingredientName } = useStore()
  const creating = id === 'new'
  const [recipe, setRecipe] = useState<Recipe | null>(creating ? BLANK : null)
  const [nutrition, setNutrition] = useState<RecipeNutrition | null>(null)
  const [newId, setNewId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dirty, setDirty] = useState(false)
  const [picking, setPicking] = useState(false)

  useEffect(() => {
    if (creating) {
      setRecipe(BLANK)
      return
    }
    api
      .recipe(id)
      .then((d) => {
        setRecipe(d.recipe)
        setNutrition(d.nutrition)
      })
      .catch((e) => setError(errorText(e)))
  }, [id, creating])

  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirty) e.preventDefault()
    }
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  }, [dirty])

  if (error && !recipe) return <div className="page"><p className="bad pre">{error}</p></div>
  if (!recipe || !state) return <div className="page muted">Đang tải…</div>

  const set = (patch: Partial<Recipe>) => {
    setRecipe({ ...recipe, ...patch })
    setDirty(true)
  }
  const setLine = (i: number, patch: Partial<RecipeLine>) =>
    set({ ingredients: recipe.ingredients.map((l, j) => (j === i ? { ...l, ...patch } : l)) })
  const setStep = (i: number, patch: Partial<Step>) => set({ steps: recipe.steps.map((s, j) => (j === i ? { ...s, ...patch } : s)) })
  const lineIds = recipe.ingredients.map((l) => l.ingredient_id).filter(Boolean)
  const saveId = creating ? newId || slug(recipe.name_vi) : recipe.id
  const steps = recipe.steps
  const prep = steps.filter((s) => ['prep', 'marinate', 'rest'].includes(s.type)).reduce((a, s) => a + (Number(s.duration_min) || 0), 0)
  const total = steps.reduce((a, s) => a + (Number(s.duration_min) || 0), 0)
  const active = steps.filter((s) => !s.passive).reduce((a, s) => a + (Number(s.duration_min) || 0), 0)

  const save = async () => {
    setBusy(true)
    setError(null)
    try {
      const res = await api.saveRecipe(saveId, { ...recipe, id: saveId }, creating)
      setDirty(false)
      await reload()
      toast(`Đã lưu và xuất bản “${recipe.name_vi}”${res.warnings.length ? ` (${res.warnings.length} cảnh báo)` : ''}`)
      if (creating) go(`/recipes/${saveId}`)
      else {
        const d = await api.recipe(saveId)
        setRecipe(d.recipe)
        setNutrition(d.nutrition)
      }
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    if (!window.confirm(`Xoá hẳn công thức “${recipe.name_vi}”? (Bản cũ vẫn có trong .admin-backups)`)) return
    setBusy(true)
    try {
      await api.deleteRecipe(recipe.id)
      await reload()
      toast(`Đã xoá “${recipe.name_vi}”`)
      go('/recipes')
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }

  const duplicate = () => {
    setRecipe({ ...recipe, id: '', name_vi: `${recipe.name_vi} (bản sao)` })
    setNewId('')
    window.history.replaceState(null, '', '#/recipes/new')
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  }

  return (
    <div className="page editor">
      <div className="page-head">
        <div>
          <a href="#/recipes" className="muted">
            ← Công thức
          </a>
          <h1>{creating ? 'Công thức mới' : recipe.name_vi}</h1>
          {!creating && (
            <p className="muted">
              {recipe.id} · lưu trong <code>{recipe._home}</code> ·{' '}
              <a href={`${MAIN_APP}#/recipe/${recipe.id}`} target="_blank" rel="noreferrer">
                xem trong app ↗
              </a>
            </p>
          )}
        </div>
      </div>

      {error && <p className="error-box pre">{error}</p>}

      <section className="panel">
        <h2>Thông tin</h2>
        <div className="grid">
          <Field label="Tên món (tiếng Việt) *">
            <input value={recipe.name_vi} onChange={(e) => set({ name_vi: e.target.value })} />
          </Field>
          <Field label="Tên tiếng Anh">
            <input value={recipe.name_en ?? ''} onChange={(e) => set({ name_en: e.target.value })} />
          </Field>
          {creating && (
            <Field label="ID (không đổi được sau khi tạo)" hint={`Mặc định: ${slug(recipe.name_vi) || '…'}`}>
              <input value={newId} placeholder={slug(recipe.name_vi)} onChange={(e) => setNewId(slug(e.target.value))} />
            </Field>
          )}
          <Field label="Tên gọi khác" wide>
            <ChipsInput value={recipe.other_names} onChange={(v) => set({ other_names: v })} />
          </Field>
          <Field label="Mô tả ngắn" wide>
            <textarea rows={2} value={recipe.description ?? ''} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <Field label="Ẩm thực *">
            <LookupSelect table="cuisines" value={recipe.cuisine} onChange={(v) => set({ cuisine: v ?? 'vietnamese' })} />
          </Field>
          <Field label="Vùng miền">
            <LookupSelect table="regions" value={recipe.region} onChange={(v) => set({ region: v })} allowEmpty="— không —" />
          </Field>
          <Field label="Loại món *">
            <LookupSelect table="dish_types" value={recipe.dish_type} onChange={(v) => set({ dish_type: v ?? 'stir_fry' })} />
          </Field>
          <Field label="Đạm chính">
            <LookupSelect table="proteins" value={recipe.main_protein} onChange={(v) => set({ main_protein: v ?? 'none' })} />
          </Field>
          <Field label="Số người ăn">
            <input type="number" min={1} value={recipe.servings} onChange={(e) => set({ servings: Number(e.target.value) })} />
          </Field>
          <Field label="Độ khó" hint="1 sao = rất dễ … 5 sao = rất khó. App gợi ý món dễ trước.">
            <StarsInput value={recipe.difficulty} onChange={(v) => set({ difficulty: v })} />
          </Field>
          <Field label="Bữa" wide>
            <ToggleChips table="meal_types" value={recipe.meal_types} onChange={(v) => set({ meal_types: v })} />
          </Field>
          <Field label="Cách nấu" wide>
            <ToggleChips table="cooking_methods" value={recipe.cooking_methods} onChange={(v) => set({ cooking_methods: v })} />
          </Field>
          <Field label="Thẻ" hint="Ví dụ: healthy, nhanh, rẻ, trẻ em thích, món Hàn" wide>
            <ChipsInput value={recipe.tags} onChange={(v) => set({ tags: v })} />
          </Field>
        </div>
      </section>

      <section className="panel">
        <div className="row between">
          <h2>Ảnh</h2>
          <div className="row">
            <button type="button" onClick={() => setPicking(true)}>
              Tìm trên Commons
            </button>
            {recipe.image && (
              <button type="button" className="ghost" onClick={() => set({ image: null })}>
                Bỏ ảnh
              </button>
            )}
          </div>
        </div>
        {recipe.image ? (
          <div className="image-row">
            <img src={recipe.image.url} alt="" referrerPolicy="no-referrer" />
            <div className="grid">
              <Field label="URL ảnh (hiển thị)" wide>
                <input value={recipe.image.url} onChange={(e) => set({ image: { ...recipe.image!, url: e.target.value } })} />
              </Field>
              <Field label="Tác giả">
                <input value={recipe.image.author ?? ''} onChange={(e) => set({ image: { ...recipe.image!, author: e.target.value } })} />
              </Field>
              <Field label="Giấy phép">
                <input value={recipe.image.license ?? ''} onChange={(e) => set({ image: { ...recipe.image!, license: e.target.value } })} />
              </Field>
              <Field label="Trang nguồn" wide>
                <input value={recipe.image.source_page ?? ''} onChange={(e) => set({ image: { ...recipe.image!, source_page: e.target.value } })} />
              </Field>
              <Field label="Loại ảnh">
                <select value={recipe.image.kind} onChange={(e) => set({ image: { ...recipe.image!, kind: e.target.value as 'dish' | 'ingredient' } })}>
                  <option value="dish">Ảnh món ăn</option>
                  <option value="ingredient">Ảnh nguyên liệu</option>
                </select>
              </Field>
            </div>
          </div>
        ) : (
          <p className="muted">Chưa có ảnh. App sẽ hiện hình minh hoạ mặc định.</p>
        )}
      </section>

      <section className="panel">
        <div className="row between">
          <h2>Nguyên liệu ({recipe.ingredients.length})</h2>
          <button type="button" onClick={() => set({ ingredients: [...recipe.ingredients, { ...BLANK_LINE }] })}>
            + Thêm nguyên liệu
          </button>
        </div>
        <p className="hint">
          Đánh dấu <b>Chính</b> cho nguyên liệu quan trọng (không phải gia vị) — app dùng chúng để so với tủ lạnh của người dùng.
        </p>
        <div className="table-wrap">
          <table className="lines">
            <thead>
              <tr>
                <th>Nguyên liệu</th>
                <th>Lượng</th>
                <th>Đơn vị</th>
                <th>Vai trò</th>
                <th>Chính</th>
                <th>Tuỳ chọn</th>
                <th>Ghi chú / thay thế</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {recipe.ingredients.map((l, i) => (
                <tr key={i}>
                  <td>
                    <IngredientPicker value={l.ingredient_id} onChange={(v) => setLine(i, { ingredient_id: v })} />
                  </td>
                  <td>
                    <input className="num-input" type="number" step="any" value={l.amount ?? ''} onChange={(e) => setLine(i, { amount: e.target.value === '' ? null : Number(e.target.value) })} />
                  </td>
                  <td>
                    <select value={l.unit} onChange={(e) => setLine(i, { unit: e.target.value })}>
                      {Object.entries(state.units).map(([u, d]) => (
                        <option key={u} value={u}>
                          {d.vi}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <LookupSelect table="ingredient_groups" value={l.group} onChange={(v) => setLine(i, { group: v ?? 'main' })} />
                  </td>
                  <td className="center">
                    <input
                      type="checkbox"
                      checked={recipe.key_ingredients.includes(l.ingredient_id)}
                      onChange={(e) =>
                        set({
                          key_ingredients: e.target.checked
                            ? [...recipe.key_ingredients, l.ingredient_id]
                            : recipe.key_ingredients.filter((k) => k !== l.ingredient_id),
                        })
                      }
                      aria-label="Nguyên liệu chính"
                    />
                  </td>
                  <td className="center">
                    <input type="checkbox" checked={l.optional} onChange={(e) => setLine(i, { optional: e.target.checked })} aria-label="Tuỳ chọn" />
                  </td>
                  <td>
                    <input value={l.note ?? ''} placeholder="ghi chú, vd: cắt khúc 4 cm" onChange={(e) => setLine(i, { note: e.target.value })} />
                    {l.substitutes.map((s, k) => (
                      <div key={k} className="sub-row">
                        <span className="muted">thay bằng</span>
                        <IngredientPicker
                          value={s.ingredient_id}
                          onChange={(v) => setLine(i, { substitutes: l.substitutes.map((x, j) => (j === k ? { ...x, ingredient_id: v } : x)) })}
                        />
                        <input
                          className="num-input"
                          type="number"
                          step="any"
                          title="Lượng thay thế cho 1 đơn vị gốc (0 = dùng khác, xem ghi chú)"
                          value={s.ratio}
                          onChange={(e) => setLine(i, { substitutes: l.substitutes.map((x, j) => (j === k ? { ...x, ratio: Number(e.target.value) } : x)) })}
                        />
                        <input
                          value={s.note ?? ''}
                          placeholder="ghi chú"
                          onChange={(e) => setLine(i, { substitutes: l.substitutes.map((x, j) => (j === k ? { ...x, note: e.target.value } : x)) })}
                        />
                        <button type="button" className="ghost" onClick={() => setLine(i, { substitutes: l.substitutes.filter((_, j) => j !== k) })} aria-label="Bỏ thay thế">
                          ×
                        </button>
                      </div>
                    ))}
                    <button type="button" className="link" onClick={() => setLine(i, { substitutes: [...l.substitutes, { ingredient_id: '', ratio: 1 }] })}>
                      + nguyên liệu thay thế
                    </button>
                  </td>
                  <td className="actions">
                    <button type="button" className="ghost" onClick={() => set({ ingredients: move(recipe.ingredients, i, -1) })} aria-label="Lên">
                      ↑
                    </button>
                    <button type="button" className="ghost" onClick={() => set({ ingredients: move(recipe.ingredients, i, 1) })} aria-label="Xuống">
                      ↓
                    </button>
                    <button
                      type="button"
                      className="ghost bad"
                      onClick={() =>
                        set({
                          ingredients: recipe.ingredients.filter((_, j) => j !== i),
                          key_ingredients: recipe.key_ingredients.filter((k) => k !== l.ingredient_id),
                        })
                      }
                      aria-label="Xoá dòng"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="panel">
        <div className="row between">
          <h2>Các bước ({steps.length})</h2>
          <span className="muted">
            Tổng {total} phút · chuẩn bị {prep} · đứng bếp {active}
          </span>
        </div>
        <p className="hint">Thời gian món ăn được tính từ tổng các bước. Đánh dấu “Chờ” cho bước không cần đứng bếp (ninh, ướp, ngâm).</p>
        {steps.map((s, i) => (
          <div key={i} className="step-card">
            <div className="step-top">
              <span className="step-no">{i + 1}</span>
              <LookupSelect table="step_types" value={s.type} onChange={(v) => setStep(i, { type: v ?? 'cook' })} />
              <input className="num-input" type="number" min={0} value={s.duration_min} onChange={(e) => setStep(i, { duration_min: Number(e.target.value) })} aria-label="Phút" />
              <span className="muted">phút</span>
              <label className="check">
                <input type="checkbox" checked={s.passive} onChange={(e) => setStep(i, { passive: e.target.checked })} /> Chờ
              </label>
              <input className="grow" value={s.title ?? ''} placeholder="Tiêu đề ngắn, vd: Xào thịt" onChange={(e) => setStep(i, { title: e.target.value })} />
              <button type="button" className="ghost" onClick={() => set({ steps: move(steps, i, -1) })} aria-label="Lên">
                ↑
              </button>
              <button type="button" className="ghost" onClick={() => set({ steps: move(steps, i, 1) })} aria-label="Xuống">
                ↓
              </button>
              <button type="button" className="ghost bad" onClick={() => set({ steps: steps.filter((_, j) => j !== i) })} aria-label="Xoá bước">
                ×
              </button>
            </div>
            <textarea rows={3} value={s.text} placeholder="Hướng dẫn rõ ràng, dễ làm theo" onChange={(e) => setStep(i, { text: e.target.value })} />
            <input value={s.tip ?? ''} placeholder="Mẹo (không bắt buộc)" onChange={(e) => setStep(i, { tip: e.target.value })} />
            <div className="chips">
              <span className="muted">Nguyên liệu dùng:</span>
              {lineIds.map((iid) => {
                const on = s.ingredients_used.includes(iid)
                return (
                  <button
                    key={iid}
                    type="button"
                    className={`chip small${on ? ' on' : ''}`}
                    aria-pressed={on}
                    onClick={() => setStep(i, { ingredients_used: on ? s.ingredients_used.filter((x) => x !== iid) : [...s.ingredients_used, iid] })}
                  >
                    {ingredientName(iid)}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
        <button type="button" onClick={() => set({ steps: [...steps, { ...BLANK_STEP }] })}>
          + Thêm bước
        </button>
      </section>

      <section className="panel">
        <div className="row between">
          <h2>Nguồn tham khảo</h2>
          <button type="button" onClick={() => set({ references: [...recipe.references, { source: '', url: '' }] })}>
            + Thêm nguồn
          </button>
        </div>
        {recipe.references.map((r, i) => (
          <div key={i} className="row ref-row">
            <input
              value={r.source}
              placeholder="Bách hóa XANH, Wikipedia…"
              onChange={(e) => set({ references: recipe.references.map((x, j) => (j === i ? { ...x, source: e.target.value } : x)) })}
            />
            <input
              className="grow"
              value={r.url}
              placeholder="https://…"
              onChange={(e) => set({ references: recipe.references.map((x, j) => (j === i ? { ...x, url: e.target.value } : x)) })}
            />
            {r.url && (
              <a href={r.url} target="_blank" rel="noreferrer">
                mở ↗
              </a>
            )}
            <button type="button" className="ghost bad" onClick={() => set({ references: recipe.references.filter((_, j) => j !== i) })} aria-label="Xoá nguồn">
              ×
            </button>
          </div>
        ))}
        <Field label="Ghi chú" wide>
          <textarea rows={2} value={recipe.notes ?? ''} onChange={(e) => set({ notes: e.target.value })} />
        </Field>
      </section>

      {nutrition && (
        <section className="panel">
          <h2>Dinh dưỡng mỗi phần (tính khi build)</h2>
          <p>
            <b>{nutrition.kcal}</b> kcal · đạm {nutrition.protein_g} g · béo {nutrition.fat_g} g · tinh bột {nutrition.carbs_g} g · xơ{' '}
            {nutrition.fiber_g} g · rau {nutrition.veg_g} g · điểm lành mạnh <b>{nutrition.health_score}</b>
          </p>
          {nutrition.coverage < 1 && (
            <p className="warn-text">
              Chỉ {Math.round(nutrition.coverage * 100)}% nguyên liệu có dữ liệu dinh dưỡng — bổ sung ở trang Nguyên liệu.
            </p>
          )}
          {nutrition.health_notes && <p className="muted">{nutrition.health_notes.split(';').map((n) => HEALTH_NOTE[n] ?? n).join(' · ')}</p>}
        </section>
      )}

      <div className="save-bar">
        <span className="muted">{dirty ? 'Có thay đổi chưa lưu' : 'Đã lưu'}</span>
        {!creating && (
          <>
            <button type="button" className="ghost" onClick={duplicate} disabled={busy}>
              Nhân bản
            </button>
            <button type="button" className="danger" onClick={remove} disabled={busy}>
              Xoá
            </button>
          </>
        )}
        <button type="button" className="primary" onClick={save} disabled={busy || !recipe.name_vi}>
          {busy ? 'Đang lưu & build…' : 'Lưu & xuất bản'}
        </button>
      </div>

      {picking && (
        <CommonsPicker
          initial={recipe.name_vi || recipe.name_en || ''}
          onClose={() => setPicking(false)}
          onPick={(img) => {
            set({
              image: {
                url: img.url,
                original_url: img.original_url,
                source_page: img.source_page,
                license: img.license,
                license_url: img.license_url,
                author: img.author,
                kind: 'dish',
              },
            })
            setPicking(false)
          }}
        />
      )}
    </div>
  )
}

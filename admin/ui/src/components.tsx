import { useEffect, useId, useState, type ReactNode } from 'react'
import { api, errorText } from './api'
import { useStore } from './store'
import type { CommonsImage } from './types'

export function Field(props: { label: string; hint?: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`field${props.wide ? ' wide' : ''}`}>
      <span className="field-label">{props.label}</span>
      {props.children}
      {props.hint && <small className="hint">{props.hint}</small>}
    </label>
  )
}

/** <select> over one lookup table from data/lookups.json. */
export function LookupSelect(props: {
  table: string
  value: string | null
  onChange: (v: string | null) => void
  allowEmpty?: string
}) {
  const { rows } = useStore()
  return (
    <select value={props.value ?? ''} onChange={(e) => props.onChange(e.target.value || null)}>
      {props.allowEmpty !== undefined && <option value="">{props.allowEmpty}</option>}
      {rows(props.table).map((r) => (
        <option key={String(r.id)} value={String(r.id)}>
          {(r.name_vi as string) || String(r.id)}
        </option>
      ))}
    </select>
  )
}

/** Multi-select as toggle chips (meal types, cooking methods...). */
export function ToggleChips(props: { table: string; value: string[]; onChange: (v: string[]) => void }) {
  const { rows } = useStore()
  return (
    <div className="chips">
      {rows(props.table).map((r) => {
        const id = String(r.id)
        const on = props.value.includes(id)
        return (
          <button
            key={id}
            type="button"
            className={`chip${on ? ' on' : ''}`}
            aria-pressed={on}
            onClick={() => props.onChange(on ? props.value.filter((v) => v !== id) : [...props.value, id])}
          >
            {(r.name_vi as string) || id}
          </button>
        )
      })}
    </div>
  )
}

/** Free-text list as removable chips; Enter or comma adds. */
export function ChipsInput(props: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState('')
  const add = () => {
    const parts = text.split(',').map((t) => t.trim()).filter(Boolean)
    if (parts.length) props.onChange([...props.value, ...parts.filter((p) => !props.value.includes(p))])
    setText('')
  }
  return (
    <div className="chips-input">
      {props.value.map((v) => (
        <span key={v} className="chip on">
          {v}
          <button type="button" onClick={() => props.onChange(props.value.filter((x) => x !== v))} aria-label={`Bỏ ${v}`}>
            ×
          </button>
        </span>
      ))}
      <input
        value={text}
        placeholder={props.placeholder ?? 'Gõ rồi Enter'}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault()
            add()
          } else if (e.key === 'Backspace' && !text && props.value.length) {
            props.onChange(props.value.slice(0, -1))
          }
        }}
        onBlur={add}
      />
    </div>
  )
}

export function StarsInput(props: { value: number; onChange: (v: number) => void }) {
  const { label } = useStore()
  return (
    <div className="stars-input" role="radiogroup" aria-label="Độ khó">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          role="radio"
          aria-checked={props.value === n}
          className={n <= props.value ? 'on' : ''}
          onClick={() => props.onChange(n)}
          title={label('difficulty_levels', n)}
        >
          ★
        </button>
      ))}
      <span className="muted">{label('difficulty_levels', props.value)}</span>
    </div>
  )
}

export function Stars({ value }: { value: number }) {
  return (
    <span className={`stars s${value}`} aria-label={`${value}/5`}>
      {'★'.repeat(value)}
      <span className="off">{'★'.repeat(5 - value)}</span>
    </span>
  )
}

/** Ingredient id input with suggestions by Vietnamese name; shows the chosen name. */
export function IngredientPicker(props: { value: string; onChange: (id: string) => void; exclude?: string[] }) {
  const { state, ingredientName } = useStore()
  const listId = useId()
  const known = state?.ingredients.some((i) => i.id === props.value)
  return (
    <span className="ing-picker">
      <input
        list={listId}
        value={props.value}
        onChange={(e) => props.onChange(e.target.value.trim())}
        placeholder="id nguyên liệu"
        className={props.value && !known ? 'invalid' : ''}
        aria-label="Nguyên liệu"
      />
      <datalist id={listId}>
        {state?.ingredients
          .filter((i) => !props.exclude?.includes(i.id))
          .map((i) => (
            <option key={i.id} value={i.id} label={i.name_vi} />
          ))}
      </datalist>
      <small className={known ? 'muted' : 'bad'}>{props.value ? (known ? ingredientName(props.value) : 'không có') : ''}</small>
    </span>
  )
}

export function Modal(props: { title: string; onClose: () => void; children: ReactNode; wide?: boolean }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && props.onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
  return (
    <div className="backdrop" onClick={props.onClose}>
      <div className={`modal${props.wide ? ' wide' : ''}`} role="dialog" aria-label={props.title} onClick={(e) => e.stopPropagation()}>
        <header>
          <h2>{props.title}</h2>
          <button type="button" className="ghost" onClick={props.onClose} aria-label="Đóng">
            ×
          </button>
        </header>
        <div className="modal-body">{props.children}</div>
      </div>
    </div>
  )
}

/** Search Wikimedia Commons (through the admin server) and pick a freely licensed photo. */
export function CommonsPicker(props: { initial: string; onPick: (img: CommonsImage) => void; onClose: () => void }) {
  const [q, setQ] = useState(props.initial)
  const [results, setResults] = useState<CommonsImage[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const search = async () => {
    setBusy(true)
    setError(null)
    try {
      setResults((await api.commons(q)).results)
    } catch (e) {
      setError(errorText(e))
    } finally {
      setBusy(false)
    }
  }
  useEffect(() => {
    search()
    // search once with the dish name when opened
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])
  return (
    <Modal title="Tìm ảnh trên Wikimedia Commons" onClose={props.onClose} wide>
      <form
        className="row"
        onSubmit={(e) => {
          e.preventDefault()
          search()
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="tên món, tiếng Việt hoặc Anh" />
        <button type="submit" disabled={busy}>
          {busy ? 'Đang tìm…' : 'Tìm'}
        </button>
      </form>
      {error && <p className="bad">{error}</p>}
      {results && results.length === 0 && <p className="muted">Không có kết quả. Thử từ khoá tiếng Anh.</p>}
      <div className="commons-grid">
        {results?.map((r) => (
          <button key={r.title} type="button" className="commons-item" onClick={() => props.onPick(r)}>
            <img src={r.url} alt={r.title} loading="lazy" referrerPolicy="no-referrer" />
            <span>{r.title.replace(/^File:/, '')}</span>
            <small>
              {r.license ?? '?'} · {r.author ?? 'không rõ tác giả'}
            </small>
          </button>
        ))}
      </div>
      <p className="hint">Chỉ chọn ảnh có giấy phép tự do (CC BY, CC BY-SA, CC0, Public domain). Tác giả và giấy phép sẽ hiện trong app.</p>
    </Modal>
  )
}

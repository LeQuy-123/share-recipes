import { useEffect, useRef, type ReactNode } from 'react'
import { useT } from '../i18n'
import { difficultyLabel } from '../lib/format'
import { energyShares, type Nutrients } from '../lib/nutrition'
import { HEALTHY_SCORE } from '../lib/planner'

const ICONS = {
  home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z',
  fridge: 'M7 2h10a2 2 0 0 1 2 2v16a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2zM5 10h14M9 5v2M9 13v3',
  search: 'M11 18a7 7 0 1 0 0-14 7 7 0 0 0 0 14zM21 21l-4.35-4.35',
  explore: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM16.24 7.76l-2.12 6.36-6.36 2.12 2.12-6.36z',
  calendar: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z',
  user: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  plus: 'M12 5v14M5 12h14',
  minus: 'M5 12h14',
  x: 'M18 6 6 18M6 6l12 12',
  check: 'M20 6 9 17l-5-5',
  clock: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 6v6l4 2',
  flame:
    'M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.07-2.14-.22-4.05 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.15.43-2.29 1-3a2.5 2.5 0 0 0 2.5 2.5z',
  leaf: 'M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10zM2 21c0-3 1.85-5.36 5.08-6',
  heart:
    'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7z',
  left: 'M15 18l-6-6 6-6',
  right: 'M9 18l6-6-6-6',
  play: 'M7 4l13 8-13 8z',
  pause: 'M7 4h3v16H7zM14 4h3v16h-3z',
  refresh: 'M3 12a9 9 0 0 1 15.5-6.3L21 8M21 3v5h-5M21 12a9 9 0 0 1-15.5 6.3L3 16M3 21v-5h5',
  cart: 'M6 6h15l-1.5 9h-12zM6 6 5 3H2M9 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2zM18 21a1 1 0 1 0 0-2 1 1 0 0 0 0 2z',
  camera: 'M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3zM12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',
  pot: 'M3 11h18M5 11v7a3 3 0 0 0 3 3h8a3 3 0 0 0 3-3v-7M12 3v4M8 5v2M16 5v2',
  sparkle: 'M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z',
  trash: 'M3 6h18M8 6V4h8v2M19 6l-1 14H6L5 6',
  swap: 'M7 16V4M3 8l4-4 4 4M17 8v12M21 16l-4 4-4-4',
  receipt: 'M5 2h14v20l-3-2-2 2-2-2-2 2-2-2-3 2zM9 7h6M9 11h6M9 15h4',
  info: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM12 16v-4M12 8h.01',
  sun: 'M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10zM12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42',
  moon: 'M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z',
  monitor: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM8 20h8M12 16v4',
  globe: 'M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20zM2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z',
  download: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3',
  list: 'M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01',
} as const

export type IconName = keyof typeof ICONS

export function Icon({ name, size = 20, className }: { name: IconName; size?: number; className?: string }) {
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={ICONS[name]} />
    </svg>
  )
}

export function Chip(props: { active?: boolean; onClick?: () => void; children: ReactNode; title?: string }) {
  return (
    <button type="button" className={`chip${props.active ? ' active' : ''}`} onClick={props.onClick} title={props.title} aria-pressed={props.active}>
      {props.children}
    </button>
  )
}

/** Small set of mutually exclusive options (theme, language). */
export function Segmented<T extends string>(props: {
  value: T
  options: { value: T; label: string; icon?: IconName }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="segmented" role="radiogroup" aria-label={props.label}>
      {props.options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={props.value === o.value} className={props.value === o.value ? 'on' : ''} onClick={() => props.onChange(o.value)}>
          {o.icon && <Icon name={o.icon} size={16} />}
          <span>{o.label}</span>
        </button>
      ))}
    </div>
  )
}

export function Modal(props: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const { t } = useT()
  // Callers pass inline closures; a ref keeps the effect from re-running on every render.
  const onClose = useRef(props.onClose)
  useEffect(() => {
    onClose.current = props.onClose
  })
  useEffect(() => {
    if (!props.open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose.current()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [props.open])
  if (!props.open) return null
  return (
    <div className="modal-backdrop" onClick={props.onClose}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={props.title} onClick={(e) => e.stopPropagation()}>
        <div className="modal-grip" aria-hidden="true" />
        <div className="modal-head">
          <h2>{props.title}</h2>
          <button type="button" className="icon-btn" onClick={props.onClose} aria-label={t('common.close')}>
            <Icon name="x" />
          </button>
        </div>
        <div className="modal-body">{props.children}</div>
        {props.footer && <div className="modal-foot">{props.footer}</div>}
      </div>
    </div>
  )
}

export function Stepper(props: { value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; label?: string }) {
  const { t } = useT()
  const { value, onChange, min = 1, max = 20, step = 1 } = props
  return (
    <div className="stepper" role="group" aria-label={props.label}>
      <button type="button" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label={t('common.decrease')}>
        <Icon name="minus" size={16} />
      </button>
      <span aria-live="polite">{value}</span>
      <button type="button" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label={t('common.increase')}>
        <Icon name="plus" size={16} />
      </button>
    </div>
  )
}

/** Difficulty as 1-5 filled stars; fewer stars = easier to make. */
export function Stars({ value }: { value: number }) {
  const { t } = useT()
  const text = t('recipe.difficultyAria', { label: difficultyLabel(value) })
  return (
    <span className={`stars s${value}`} title={text} aria-label={text} role="img">
      {'★'.repeat(value)}
      <span className="stars-off">{'★'.repeat(5 - value)}</span>
    </span>
  )
}

export function HealthBadge({ score }: { score: number }) {
  const { t } = useT()
  const tone = score >= HEALTHY_SCORE ? 'good' : score >= 50 ? 'mid' : 'low'
  return (
    <span className={`health ${tone}`} title={t('health.scoreTitle')}>
      <Icon name="leaf" size={13} /> {score}
    </span>
  )
}

/** Stacked bar of the energy coming from protein / fat / carbs. */
export function MacroBar({ n, showLegend = true }: { n: Nutrients; showLegend?: boolean }) {
  const { t } = useT()
  const s = energyShares(n)
  const pct = (v: number) => `${Math.round(v * 100)}%`
  return (
    <div className="macro">
      <div
        className="macro-bar"
        role="img"
        aria-label={`${t('nutrition.protein')} ${pct(s.protein)}, ${t('nutrition.fat')} ${pct(s.fat)}, ${t('nutrition.carbs')} ${pct(s.carbs)}`}
      >
        <span className="m-protein" style={{ width: pct(s.protein) }} />
        <span className="m-fat" style={{ width: pct(s.fat) }} />
        <span className="m-carbs" style={{ width: pct(s.carbs) }} />
      </div>
      {showLegend && (
        <div className="macro-legend">
          <span>
            <i className="m-protein" /> {t('nutrition.protein')} {Math.round(n.protein_g)} g · {pct(s.protein)}
          </span>
          <span>
            <i className="m-fat" /> {t('nutrition.fat')} {Math.round(n.fat_g)} g · {pct(s.fat)}
          </span>
          <span>
            <i className="m-carbs" /> {t('nutrition.carbs')} {Math.round(n.carbs_g)} g · {pct(s.carbs)}
          </span>
        </div>
      )}
    </div>
  )
}

export function Progress({ value, max, tone }: { value: number; max: number; tone?: 'good' | 'warn' }) {
  const pct = Math.min(100, (value / (max || 1)) * 100)
  return (
    <div className={`progress ${tone ?? ''}`} role="progressbar" aria-valuenow={Math.round(value)} aria-valuemax={Math.round(max)}>
      <span style={{ width: `${pct}%` }} />
    </div>
  )
}

export function EmptyState(props: { icon: IconName; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <span className="empty-icon">
        <Icon name={props.icon} size={28} />
      </span>
      <h3>{props.title}</h3>
      {props.children}
    </div>
  )
}

export function Toggle(props: { checked: boolean; onChange: (v: boolean) => void; label: ReactNode; hint?: ReactNode; disabled?: boolean }) {
  return (
    <label className={`toggle${props.disabled ? ' disabled' : ''}`}>
      <span className="toggle-text">
        <span>{props.label}</span>
        {props.hint && <small>{props.hint}</small>}
      </span>
      <input type="checkbox" checked={props.checked} disabled={props.disabled} onChange={(e) => props.onChange(e.target.checked)} />
      <span className="switch" aria-hidden="true" />
    </label>
  )
}

/** Section heading with an optional count and a trailing action. */
export function SectionHead(props: { title: ReactNode; count?: number; action?: ReactNode }) {
  return (
    <div className="section-head">
      <h2 className="section-title">
        {props.title}
        {props.count !== undefined && <span className="count">{props.count}</span>}
      </h2>
      {props.action}
    </div>
  )
}

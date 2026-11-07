import { useMemo, useState } from 'react'
import { getCards, type RecipeCard } from '../db/catalog'
import { normalize } from '../db/text'
import { displayName, useT } from '../i18n'
import { addDays, formatDate, isoDate, mealLabel } from '../lib/format'
import { eatenWithRice } from '../lib/nutrition'
import { roleLabel, roleOf, ROLES, type Role } from '../lib/planner'
import { actions, type PlanMeal } from '../store/user'
import { RecipeImage } from './RecipeCard'
import { Chip, Icon, Modal, Stepper, Toggle } from './ui'

const MEALS: PlanMeal[] = ['breakfast', 'lunch', 'dinner']

/** Put one or more dishes into the meal plan. */
export function AddToPlanDialog(props: { open: boolean; onClose: () => void; cards: RecipeCard[]; defaultMeal?: PlanMeal }) {
  const { t } = useT()
  const [today] = useState(() => isoDate(new Date()))
  const [date, setDate] = useState(today)
  const [meal, setMeal] = useState<PlanMeal>(props.defaultMeal ?? 'dinner')
  const [servings, setServings] = useState(1)
  const [withRice, setWithRice] = useState(props.cards.some(eatenWithRice))
  const [done, setDone] = useState(false)

  const confirm = () => {
    actions.addToPlan(props.cards.map((c, i) => ({ date, meal, recipe_id: c.id, servings, with_rice: withRice && i === 0 })))
    setDone(true)
    setTimeout(() => {
      setDone(false)
      props.onClose()
    }, 700)
  }

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      title={t('planDialog.title')}
      footer={
        <button type="button" className="btn primary block" onClick={confirm} disabled={done}>
          {done ? t('planDialog.added') : t('planDialog.add', { count: props.cards.length })}
        </button>
      }
    >
      <p className="muted">{props.cards.map(displayName).join(' · ')}</p>
      <h4>{t('planDialog.day')}</h4>
      <div className="chips wrap">
        {Array.from({ length: 7 }, (_, i) => addDays(today, i)).map((d) => (
          <Chip key={d} active={d === date} onClick={() => setDate(d)}>
            {formatDate(d)}
          </Chip>
        ))}
      </div>
      <h4>{t('planDialog.meal')}</h4>
      <div className="chips">
        {MEALS.map((m) => (
          <Chip key={m} active={m === meal} onClick={() => setMeal(m)}>
            {mealLabel(m)}
          </Chip>
        ))}
      </div>
      <div className="row between">
        <h4>{t('planDialog.servings')}</h4>
        <Stepper value={servings} onChange={setServings} min={1} max={12} label={t('planDialog.servings')} />
      </div>
      <Toggle checked={withRice} onChange={setWithRice} label={t('planDialog.withRice')} hint={t('planDialog.withRiceHint')} />
    </Modal>
  )
}

/** Choose a dish for an empty plan slot. */
export function RecipePicker(props: { open: boolean; onClose: () => void; onPick: (card: RecipeCard) => void; meal?: PlanMeal }) {
  const { t } = useT()
  const [q, setQ] = useState('')
  const [role, setRole] = useState<Role | null>(null)
  const list = useMemo(() => {
    const words = normalize(q).split(' ').filter(Boolean)
    return getCards()
      .filter((c) => !role || roleOf(c) === role)
      .filter((c) => words.every((w) => c.search_name.includes(w) || c.search_extra.includes(w)))
      .sort((a, b) => Number(b.meal_types.includes(props.meal ?? '')) - Number(a.meal_types.includes(props.meal ?? '')) || a.difficulty - b.difficulty)
  }, [q, role, props.meal])

  return (
    <Modal open={props.open} onClose={props.onClose} title={props.meal ? t('picker.titleMeal', { meal: mealLabel(props.meal) }) : t('picker.title')}>
      <div className="search-box">
        <Icon name="search" size={18} />
        <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('picker.search')} aria-label={t('picker.search')} />
      </div>
      <div className="chips scroll">
        <Chip active={!role} onClick={() => setRole(null)}>
          {t('common.all')}
        </Chip>
        {ROLES.map((r) => (
          <Chip key={r} active={role === r} onClick={() => setRole(r)}>
            {roleLabel(r)}
          </Chip>
        ))}
      </div>
      <ul className="pick-list">
        {list.map((c) => (
          <li key={c.id}>
            <button type="button" onClick={() => props.onPick(c)}>
              <RecipeImage card={c} className="thumb" />
              <span>
                <strong>{displayName(c)}</strong>
                <small>
                  {roleLabel(roleOf(c))} · {Math.round(c.kcal)} kcal · {t('time.min', { count: c.total_min })}
                </small>
              </span>
              <Icon name="plus" size={18} />
            </button>
          </li>
        ))}
      </ul>
    </Modal>
  )
}


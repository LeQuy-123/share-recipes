import { useMemo, useState } from 'react'
import { RecipePicker } from '../components/PlanDialogs'
import { RecipeImage } from '../components/RecipeCard'
import { EmptyState, Icon, MacroBar, Modal, Progress, Stepper } from '../components/ui'
import { getCard, getCards, getLookups, label } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { addDays, formatDate, formatDayMonth, isoDate, parseDate, weekdayShort, weekStart } from '../lib/format'
import { adviseDay, eatenWithRice, targetsFor } from '../lib/nutrition'
import { autoPlan, planNutrients, shoppingList } from '../lib/planner'
import { href } from '../lib/router'
import { actions, blockedByNoRepeat, useUser, type PlanItem, type PlanMeal } from '../store/user'

const MEALS: PlanMeal[] = ['breakfast', 'lunch', 'dinner']

export function PlanPage() {
  const { t } = useT()
  const user = useUser()
  const today = isoDate(new Date())
  const [start, setStart] = useState(weekStart(today))
  const [day, setDay] = useState(today)
  const [picker, setPicker] = useState<PlanMeal | null>(null)
  const [shopOpen, setShopOpen] = useState(false)
  const [seed, setSeed] = useState(1)
  const targets = targetsFor(user.profile)
  const pantry = useMemo(() => new Set(user.pantry.map((p) => p.id)), [user.pantry])

  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i))
  const byDay = useMemo(() => {
    const m = new Map<string, PlanItem[]>()
    for (const p of user.plan) m.set(p.date, [...(m.get(p.date) ?? []), p])
    return m
  }, [user.plan])
  const dayItems = byDay.get(day) ?? []
  const dayTotal = planNutrients(dayItems)
  const advice = adviseDay(dayTotal, targets)
  // Auto-plan and shopping cover the shown week, or the next 7 days when it is the current week.
  const window7 = days.includes(today) ? Array.from({ length: 7 }, (_, i) => addDays(today, i)) : days

  const moveWeek = (n: number) => {
    const next = addDays(start, n * 7)
    setStart(next)
    setDay(next <= today && today < addDays(next, 7) ? today : next)
  }

  const fillWeek = () => {
    const existing = user.plan.filter((p) => p.date >= addDays(window7[0], -7) && p.date <= addDays(window7[6], 7))
    const items = autoPlan({
      cards: getCards(),
      days: window7,
      meals: MEALS,
      existing,
      pantry,
      blocked: blockedByNoRepeat(user),
      targets,
      healthy: true,
      seed,
    })
    setSeed(seed + 1)
    actions.addToPlan(items)
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t('plan.eyebrow')}</p>
          <h1>{t('plan.title')}</h1>
        </div>
        <button type="button" className="pill" onClick={() => setShopOpen(true)}>
          <Icon name="cart" size={16} /> {t('plan.shopping')}
        </button>
      </header>

      <div className="plan-layout">
        <div className="plan-side">
          <div className="week-nav">
            <button type="button" className="icon-btn" onClick={() => moveWeek(-1)} aria-label={t('plan.prevWeek')}>
              <Icon name="left" />
            </button>
            <span>
              {formatDayMonth(start)} – {formatDayMonth(days[6])}
            </span>
            <button type="button" className="icon-btn" onClick={() => moveWeek(1)} aria-label={t('plan.nextWeek')}>
              <Icon name="right" />
            </button>
          </div>

          <div className="week-strip" role="tablist" aria-label={t('plan.week')}>
            {days.map((d) => {
              const kcal = planNutrients(byDay.get(d) ?? []).kcal
              return (
                <button
                  key={d}
                  type="button"
                  role="tab"
                  aria-selected={d === day}
                  className={`day${d === day ? ' active' : ''}${d === today ? ' today' : ''}`}
                  onClick={() => setDay(d)}
                >
                  <small>{weekdayShort(d)}</small>
                  <strong>{parseDate(d).getDate()}</strong>
                  <span className="day-bar">
                    <span style={{ height: `${Math.min(100, (kcal / targets.kcal) * 100)}%` }} className={kcal > targets.kcal * 1.1 ? 'over' : ''} />
                  </span>
                </button>
              )
            })}
          </div>

          <div className="actions">
            <button type="button" className="btn primary" onClick={fillWeek}>
              <Icon name="sparkle" size={18} /> {t('plan.autoFill')}
            </button>
            {dayItems.length > 0 && (
              <button type="button" className="btn" onClick={() => window.confirm(t('plan.clearConfirm', { day: formatDate(day) })) && actions.clearPlanDays([day])}>
                <Icon name="trash" size={18} /> {t('plan.clearDay')}
              </button>
            )}
          </div>
          <p className="hint">{t('plan.autoHint')}</p>

          <section className="panel">
            <div className="row between">
              <h2>{formatDate(day)}</h2>
              <span>
                <strong>{Math.round(dayTotal.kcal)}</strong> / {targets.kcal} kcal
              </span>
            </div>
            <Progress value={dayTotal.kcal} max={targets.kcal} tone={dayTotal.kcal > targets.kcal * 1.1 ? 'warn' : 'good'} />
            {dayTotal.kcal > 0 && (
              <>
                <MacroBar n={dayTotal} />
                <div className="targets">
                  <span>{t('plan.protein', { have: Math.round(dayTotal.protein_g), want: targets.protein_g })}</span>
                  <span>{t('plan.veg', { have: Math.round(dayTotal.veg_g), want: targets.veg_g })}</span>
                  <span>{t('plan.fiber', { have: Math.round(dayTotal.fiber_g), want: targets.fiber_g })}</span>
                </div>
                <ul className="advice">
                  {advice.map((a) => (
                    <li key={a.key} className={a.level}>
                      <Icon name={a.level === 'good' ? 'check' : 'info'} size={14} /> {t(`advice.${a.key}`, a.params)}
                    </li>
                  ))}
                </ul>
              </>
            )}
            {!user.profile && (
              <p className="hint">
                {t('plan.defaultTarget')} <a href={href('/profile')}>{t('plan.setProfile')}</a>
              </p>
            )}
          </section>
        </div>

        <div className="plan-meals">
          {MEALS.map((meal) => {
            const items = dayItems.filter((p) => p.meal === meal)
            const mealKcal = planNutrients(items).kcal
            return (
              <section key={meal} className="meal-slot">
                <div className="row between">
                  <h3>{t(`meal.${meal}`)}</h3>
                  {items.length > 0 && <span className="muted">{Math.round(mealKcal)} kcal</span>}
                </div>
                {items.map((item) => (
                  <PlanRow key={item.id} item={item} />
                ))}
                <button type="button" className="add-slot" onClick={() => setPicker(meal)}>
                  <Icon name="plus" size={16} /> {t('plan.addDish')}
                </button>
              </section>
            )
          })}
        </div>
      </div>

      {picker && (
        <RecipePicker
          open
          meal={picker}
          onClose={() => setPicker(null)}
          onPick={(card) => {
            const first = !dayItems.some((p) => p.meal === picker && p.with_rice)
            actions.addToPlan([{ date: day, meal: picker, recipe_id: card.id, servings: 1, with_rice: first && eatenWithRice(card) }])
            setPicker(null)
          }}
        />
      )}
      {shopOpen && <ShoppingDialog days={window7} onClose={() => setShopOpen(false)} />}
    </div>
  )
}

function PlanRow({ item }: { item: PlanItem }) {
  const { t } = useT()
  const card = getCard(item.recipe_id)
  if (!card) return null
  const kcal = planNutrients([item]).kcal
  const name = displayName(card)
  return (
    <div className="plan-row">
      <a href={href(`/recipe/${card.id}`)} className="plan-main">
        <RecipeImage card={card} className="thumb" />
        <span>
          <strong>{name}</strong>
          <small>
            {Math.round(kcal)} kcal{item.with_rice ? ` · ${t('plan.withRice')}` : ''}
          </small>
        </span>
      </a>
      <div className="plan-controls">
        <Stepper value={item.servings} min={1} max={12} onChange={(v) => actions.updatePlanItem(item.id, { servings: v })} label={t('plan.portions')} />
        <button
          type="button"
          className={`chip small${item.with_rice ? ' active' : ''}`}
          onClick={() => actions.updatePlanItem(item.id, { with_rice: !item.with_rice })}
          aria-pressed={item.with_rice}
          title={t('planDialog.withRiceHint')}
        >
          {t('plan.rice')}
        </button>
        <button type="button" className="icon-btn" onClick={() => actions.removePlanItem(item.id)} aria-label={t('plan.remove', { name })}>
          <Icon name="x" size={18} />
        </button>
      </div>
    </div>
  )
}

function ShoppingDialog({ days, onClose }: { days: string[]; onClose: () => void }) {
  const { t } = useT()
  const user = useUser()
  const pantry = useMemo(() => new Set(user.pantry.map((p) => p.id)), [user.pantry])
  const items = useMemo(() => {
    const range = new Set(days)
    return shoppingList(user.plan.filter((p) => range.has(p.date)), pantry)
  }, [user.plan, days, pantry])
  const { categories } = getLookups()
  const toBuy = items.filter((i) => !i.inPantry)
  const [copied, setCopied] = useState(false)

  const copy = () => {
    const text = toBuy.map((i) => `☐ ${i.name}: ${i.amounts}`).join('\n')
    navigator.clipboard?.writeText(text).then(
      () => setCopied(true),
      () => {},
    )
  }

  return (
    <Modal
      open
      onClose={onClose}
      title={t('shopping.title')}
      footer={
        toBuy.length > 0 && (
          <button type="button" className="btn block" onClick={copy}>
            {copied ? t('shopping.copied') : t('shopping.copy')}
          </button>
        )
      }
    >
      <p className="muted">{t('shopping.range', { from: formatDate(days[0]), to: formatDate(days[days.length - 1]) })}</p>
      {items.length === 0 ? (
        <EmptyState icon="cart" title={t('shopping.emptyTitle')}>
          <p>{t('shopping.emptyText')}</p>
        </EmptyState>
      ) : (
        <ul className="shop-list">
          {items.map((i) => (
            <li key={i.ingredient_id} className={i.inPantry ? 'have' : ''}>
              <button
                type="button"
                className={`add-btn${i.inPantry ? ' added' : ''}`}
                onClick={() => actions.togglePantry(i.ingredient_id)}
                aria-label={i.inPantry ? t('pantry.removeItem', { name: i.name }) : t('shopping.bought', { name: i.name })}
              >
                <Icon name={i.inPantry ? 'check' : 'plus'} size={16} />
              </button>
              <span>
                <strong>{i.name}</strong>
                <small>
                  {label(categories, i.category_id)} · {i.recipes.join(', ')}
                </small>
              </span>
              <span className="ing-amount">{i.amounts}</span>
            </li>
          ))}
        </ul>
      )}
      <p className="hint">{t('shopping.hint')}</p>
    </Modal>
  )
}

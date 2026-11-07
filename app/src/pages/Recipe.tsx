import { useMemo, useState } from 'react'
import { AddToPlanDialog } from '../components/PlanDialogs'
import { RecipeImage } from '../components/RecipeCard'
import { EmptyState, HealthBadge, Icon, MacroBar, Stars, Stepper } from '../components/ui'
import { getLookups, getRecipeDetail, label, type RecipeLine } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { difficultyLabel, formatAmount, formatMinutes, timeAgo } from '../lib/format'
import { cardNutrients } from '../lib/nutrition'
import { goBack, href } from '../lib/router'
import { actions, recentlyCooked, useUser } from '../store/user'

export function RecipePage({ id }: { id: string }) {
  const { t, lang } = useT()
  const detail = useMemo(() => getRecipeDetail(id), [id])
  const user = useUser()
  const [servings, setServings] = useState(detail?.card.servings ?? 4)
  const [planOpen, setPlanOpen] = useState(false)
  const [cookedNow, setCookedNow] = useState(false)
  const { groups, regions, dishTypes, stepTypes } = getLookups()
  const pantry = useMemo(() => new Set(user.pantry.map((p) => p.id)), [user.pantry])

  if (!detail) {
    return (
      <div className="page">
        <EmptyState icon="search" title={t('recipe.notFound')}>
          <a href={href('/explore')}>{t('recipe.findOther')}</a>
        </EmptyState>
      </div>
    )
  }

  const { card, lines, steps, image } = detail
  const scale = servings / (card.servings || 1)
  const favorite = user.favorites.includes(card.id)
  const lastCooked = recentlyCooked(user, 3650).get(card.id)
  const cookHref = href(`/cook/${card.id}`, { s: servings })

  // Group lines by role in the recipe, keeping the recipe's order inside each group.
  const byGroup = new Map<string, RecipeLine[]>()
  for (const line of lines) {
    const g = line.group_id ?? 'other'
    byGroup.set(g, [...(byGroup.get(g) ?? []), line])
  }
  const groupOrder = [...byGroup.keys()].sort((a, b) => (groups.get(a)?.sort ?? 99) - (groups.get(b)?.sort ?? 99))
  const missing = lines.filter((l) => l.is_key && !pantry.has(l.ingredient_id) && !l.substitutes.some((s) => pantry.has(s.id)))
  const name = displayName(card)
  const secondName = lang === 'en' ? card.name_vi : card.name_en

  return (
    <div className="page recipe">
      <div className="recipe-top">
        <div className="hero">
          <RecipeImage card={card} className="hero-img" eager />
          <button type="button" className="hero-back icon-btn" onClick={() => goBack('/explore')} aria-label={t('common.back')}>
            <Icon name="left" />
          </button>
          <button
            type="button"
            className={`hero-fav icon-btn${favorite ? ' on' : ''}`}
            onClick={() => actions.toggleFavorite(card.id)}
            aria-label={favorite ? t('recipe.unfavorite') : t('recipe.favorite')}
            aria-pressed={favorite}
          >
            <Icon name="heart" />
          </button>
          {image?.author && (
            <p className="credit">
              {t('recipe.photo')}{' '}
              <a href={image.source_page ?? image.url} target="_blank" rel="noreferrer">
                {image.author}
              </a>
              {image.license ? ` · ${image.license}` : ''}
              {image.kind === 'ingredient' ? ` · ${t('recipe.ingredientPhoto')}` : ''}
            </p>
          )}
        </div>

        <div className="recipe-info">
          <h1>{name}</h1>
          {secondName && secondName !== name && <p className="subtitle">{secondName}</p>}
          {card.other_names.length > 0 && <p className="muted">{t('recipe.aka', { names: card.other_names.join(', ') })}</p>}
          {card.description && <p className="lead">{card.description}</p>}

          <div className="facts">
            <span>
              <Icon name="clock" size={16} /> {formatMinutes(card.total_min)}
              <small>{card.active_min < card.total_min ? t('recipe.handsOn', { count: card.active_min }) : t('recipe.totalTime')}</small>
            </span>
            <span title={t(`difficultyDesc.${card.difficulty}`)}>
              <Stars value={card.difficulty} />
              <small>{difficultyLabel(card.difficulty)}</small>
            </span>
            <span>
              <Icon name="flame" size={16} /> {Math.round(card.kcal)} kcal
              <small>{t('recipe.perServing')}</small>
            </span>
          </div>
          <p className="hint">
            <Icon name="pot" size={14} /> {label(dishTypes, card.dish_type_id)} · {difficultyLabel(card.difficulty)}: {t(`difficultyDesc.${card.difficulty}`)}
          </p>
          <p className="tags">
            {card.region_id && card.region_id !== 'all' && <span className="tag">{label(regions, card.region_id)}</span>}
            {card.meal_types.map((m) => (
              <span key={m} className="tag">
                {t(`meal.${m}`)}
              </span>
            ))}
            {card.tags.map((tag) => (
              <span key={tag} className="tag">
                {tag}
              </span>
            ))}
          </p>

          <div className="actions hide-phone">
            <a className="btn primary" href={cookHref}>
              <Icon name="play" size={18} /> {t('recipe.startCooking')}
            </a>
            <button type="button" className="btn" onClick={() => setPlanOpen(true)}>
              <Icon name="calendar" size={18} /> {t('recipe.plan')}
            </button>
          </div>
        </div>
      </div>

      {lang === 'en' && (
        <p className="notice">
          <Icon name="globe" size={16} /> {t('recipe.viOnly')}
        </p>
      )}

      <div className="recipe-body">
        <div className="recipe-aside">
          <section className="panel">
            <div className="row between">
              <h2>{t('recipe.ingredients')}</h2>
              <Stepper value={servings} onChange={setServings} min={1} max={20} label={t('recipe.servings')} />
            </div>
            <p className="muted">
              {t('recipe.forPeople', { count: servings })}
              {missing.length > 0 ? ` · ${t('recipe.missingKey', { count: missing.length })}` : pantry.size ? ` · ${t('recipe.haveAll')}` : ''}
            </p>
            {groupOrder.map((g) => (
              <div key={g} className="ing-group">
                <h3>{label(groups, g)}</h3>
                <ul className="ing-lines">
                  {byGroup.get(g)!.map((line) => (
                    <IngredientLineView key={line.id} line={line} scale={scale} pantry={pantry} />
                  ))}
                </ul>
              </div>
            ))}
            {missing.length > 0 && (
              <button type="button" className="btn ghost small" onClick={() => actions.addToPantry(missing.map((m) => m.ingredient_id))}>
                <Icon name="check" size={16} /> {t('recipe.iHaveAll')}
              </button>
            )}
          </section>

          <section className="panel">
            <div className="row between">
              <h2>{t('recipe.nutrition')}</h2>
              <HealthBadge score={card.health_score} />
            </div>
            <div className="nutri-grid">
              <span>
                <strong>{Math.round(card.kcal)}</strong> kcal
              </span>
              <span>
                <strong>{Math.round(card.protein_g)}</strong> g {t('nutrition.proteinShort')}
              </span>
              <span>
                <strong>{Math.round(card.fat_g)}</strong> g {t('nutrition.fatShort')}
              </span>
              <span>
                <strong>{Math.round(card.carbs_g)}</strong> g {t('nutrition.carbsShort')}
              </span>
              <span>
                <strong>{Math.round(card.fiber_g)}</strong> g {t('nutrition.fiberShort')}
              </span>
              <span>
                <strong>{Math.round(card.veg_g)}</strong> g {t('nutrition.vegShort')}
              </span>
            </div>
            <MacroBar n={cardNutrients(card)} showLegend={false} />
            {card.health_notes.length > 0 && (
              <p className="tags">
                {card.health_notes.map((n) => (
                  <span key={n} className="tag soft">
                    {t(`health.${n}`)}
                  </span>
                ))}
              </p>
            )}
            <p className="hint">{t('recipe.nutritionHint')}</p>
          </section>
        </div>

        <div className="recipe-main">
          <section>
            <h2>{t('recipe.steps', { count: steps.length })}</h2>
            <ol className="steps">
              {steps.map((s) => (
                <li key={s.id}>
                  <div className="step-head">
                    <span className={`step-type t-${s.type_id}`}>{label(stepTypes, s.type_id)}</span>
                    {s.duration_min ? (
                      <span className="muted">
                        <Icon name="clock" size={14} /> {t('time.min', { count: s.duration_min })}
                        {s.passive ? ` · ${t('recipe.wait')}` : ''}
                      </span>
                    ) : null}
                  </div>
                  {s.title && <h3>{s.title}</h3>}
                  <p>{s.text}</p>
                  {s.tip && (
                    <p className="tip">
                      <Icon name="info" size={14} /> {s.tip}
                    </p>
                  )}
                </li>
              ))}
            </ol>
            <div className="actions">
              <a className="btn primary" href={cookHref}>
                <Icon name="play" size={18} /> {t('recipe.cookStepByStep')}
              </a>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  actions.markCooked(card.id)
                  setCookedNow(true)
                }}
                disabled={cookedNow}
              >
                <Icon name="check" size={18} /> {cookedNow ? t('recipe.cookedSaved') : t('recipe.iCookedThis')}
              </button>
            </div>
            {lastCooked && <p className="hint center">{t('recipe.lastCooked', { when: timeAgo(lastCooked) })}</p>}
          </section>

          {detail.notes && (
            <section className="panel">
              <h2>{t('recipe.notes')}</h2>
              <p>{detail.notes}</p>
            </section>
          )}

          {detail.references.length > 0 && (
            <section>
              <h2 className="small-title">{t('recipe.references')}</h2>
              <ul className="refs">
                {detail.references.map((r) => (
                  <li key={r.url}>
                    <a href={r.url} target="_blank" rel="noreferrer">
                      {r.source}
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </div>

      <div className="cta-bar show-phone">
        <button type="button" className="btn icon-only" onClick={() => setPlanOpen(true)} aria-label={t('recipe.plan')}>
          <Icon name="calendar" size={20} />
        </button>
        <a className="btn primary grow" href={cookHref}>
          <Icon name="play" size={18} /> {t('recipe.startCooking')}
        </a>
      </div>

      {planOpen && <AddToPlanDialog open cards={[card]} onClose={() => setPlanOpen(false)} />}
    </div>
  )
}

function IngredientLineView({ line, scale, pantry }: { line: RecipeLine; scale: number; pantry: Set<string> }) {
  const { t } = useT()
  const has = pantry.has(line.ingredient_id)
  const sub = !has ? line.substitutes.find((s) => pantry.has(s.id)) : undefined
  const status = line.pantry_staple ? 'staple' : has ? 'have' : sub ? 'sub' : line.is_key ? 'missing' : 'other'
  return (
    <li className={`ing-line ${status}`}>
      <span className="ing-status" aria-hidden="true">
        {status === 'have' || status === 'staple' ? <Icon name="check" size={14} /> : status === 'sub' ? <Icon name="swap" size={14} /> : null}
      </span>
      <span className="ing-main">
        <a href={href(`/ingredient/${line.ingredient_id}`)}>{displayName(line)}</a>
        {line.optional && <em> ({t('recipe.optional')})</em>}
        {line.note && <small>{line.note}</small>}
        {sub && <small className="sub-note">{t('recipe.useInstead', { name: displayName(sub) })}{sub.note ? ` — ${sub.note}` : ''}</small>}
        {!has && !sub && line.substitutes.length > 0 && <small>{t('recipe.canSwap', { names: line.substitutes.map(displayName).join(', ') })}</small>}
      </span>
      <span className="ing-amount">{formatAmount(line.amount, line.unit_id, scale)}</span>
    </li>
  )
}

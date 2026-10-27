import { useMemo, useState } from 'react'
import { AddToPlanDialog } from '../components/PlanDialogs'
import { QuickSettings } from '../components/QuickSettings'
import { CardRail, MatchLine, RecipeCardView, RecipeImage } from '../components/RecipeCard'
import { Chip, Icon, MacroBar, SectionHead, Toggle } from '../components/ui'
import { getCards, getLookups, label, matchRecipe, type RecipeCard } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { currentMeal } from '../lib/format'
import { applyFilters, byEase, EASY_MAX, recommend, roleLabel, roleOf, suggestTray } from '../lib/planner'
import { href } from '../lib/router'
import { actions, blockedByNoRepeat, useUser, type PlanMeal } from '../store/user'

const METHOD_CHIPS = ['stir_fry', 'boil', 'steam', 'grill', 'braise', 'fry']

export function HomePage() {
  const { t } = useT()
  const user = useUser()
  const pantry = useMemo(() => new Set(user.pantry.map((p) => p.id)), [user.pantry])
  const blocked = useMemo(() => blockedByNoRepeat(user), [user])
  const [meal, setMeal] = useState<PlanMeal | null>(currentMeal())
  const [healthy, setHealthy] = useState(false)
  const [quick, setQuick] = useState(false)
  const [easy, setEasy] = useState(false)
  const [method, setMethod] = useState<string | null>(null)
  const [seed, setSeed] = useState(1)
  const [planCards, setPlanCards] = useState<RecipeCard[] | null>(null)
  const { methods } = getLookups()

  const suggestions = useMemo(
    () => recommend(applyFilters(getCards(), { meal, healthy, quick, method, maxDifficulty: easy ? EASY_MAX : null }), pantry, blocked),
    [meal, healthy, quick, easy, method, pantry, blocked],
  )
  const ready = suggestions.filter((s) => s.match.total > 0 && s.match.missing.length === 0)
  const almost = suggestions.filter((s) => s.match.missing.length > 0 && s.match.missing.length <= 2 && s.match.ratio > 0)
  const others = suggestions.filter((s) => !ready.includes(s) && !almost.includes(s))
  const tray = useMemo(
    () => (meal === 'breakfast' ? null : suggestTray(getCards(), pantry, blocked, { meal: meal ?? undefined, healthy, seed })),
    [meal, pantry, blocked, healthy, seed],
  )
  const sortedOthers = pantry.size
    ? others
    : [...others].sort((a, b) => (healthy ? b.card.health_score - a.card.health_score : byEase(a.card, b.card)))

  return (
    <div className="page home">
      <header className="page-head">
        <div>
          <p className="eyebrow">{meal ? t(`meal.${meal}`) : t('home.anyMeal')}</p>
          <h1>{t('home.title')}</h1>
        </div>
        <div className="head-actions">
          <QuickSettings />
          <a className="pill" href={href('/pantry')}>
            <Icon name="fridge" size={16} /> {pantry.size}
            <span className="hide-sm"> {t('home.ingredients')}</span>
          </a>
        </div>
      </header>

      <div className="chips scroll" role="toolbar" aria-label={t('home.filters')}>
        {(['breakfast', 'lunch', 'dinner'] as PlanMeal[]).map((m) => (
          <Chip key={m} active={meal === m} onClick={() => setMeal(meal === m ? null : m)}>
            {t(`mealShort.${m}`)}
          </Chip>
        ))}
        <span className="chip-sep" />
        <Chip active={easy} onClick={() => setEasy(!easy)}>
          ★ {t('filters.easy')}
        </Chip>
        <Chip active={healthy} onClick={() => setHealthy(!healthy)}>
          <Icon name="leaf" size={14} /> {t('filters.healthy')}
        </Chip>
        <Chip active={quick} onClick={() => setQuick(!quick)}>
          <Icon name="clock" size={14} /> {t('filters.quick')}
        </Chip>
        {METHOD_CHIPS.map((m) => (
          <Chip key={m} active={method === m} onClick={() => setMethod(method === m ? null : m)}>
            {label(methods, m)}
          </Chip>
        ))}
      </div>

      <div className="home-layout">
        <div className="home-main">
          {pantry.size === 0 && (
            <a className="cta-card" href={href('/pantry')}>
              <span className="cta-icon">
                <Icon name="fridge" size={24} />
              </span>
              <span>
                <strong>{t('home.ctaTitle')}</strong>
                <small>{t('home.ctaText')}</small>
              </span>
              <Icon name="right" />
            </a>
          )}

          {ready.length > 0 && (
            <section>
              <SectionHead title={t('home.ready')} count={ready.length} />
              <CardRail>
                {ready.slice(0, 8).map((s) => (
                  <RecipeCardView key={s.card.id} card={s.card} match={s.match} />
                ))}
              </CardRail>
            </section>
          )}

          {almost.length > 0 && (
            <section>
              <SectionHead title={t('home.almost')} count={almost.length} />
              <CardRail>
                {almost.slice(0, 8).map((s) => (
                  <RecipeCardView key={s.card.id} card={s.card} match={s.match} />
                ))}
              </CardRail>
            </section>
          )}

          <section>
            <SectionHead title={pantry.size ? t('home.others') : healthy ? t('home.healthiest') : t('home.easiest')} />
            {sortedOthers.length === 0 && ready.length === 0 && almost.length === 0 && <p className="muted">{t('home.noMatch')}</p>}
            <div className="card-grid">
              {sortedOthers.slice(0, 12).map((s) => (
                <RecipeCardView key={s.card.id} card={s.card} match={pantry.size ? s.match : undefined} />
              ))}
            </div>
          </section>
        </div>

        <aside className="home-side">
          {tray && (
            <section className="tray">
              <SectionHead
                title={t('home.tray')}
                action={
                  <button type="button" className="btn ghost small" onClick={() => setSeed(seed + 1)}>
                    <Icon name="refresh" size={16} /> {t('home.shuffle')}
                  </button>
                }
              />
              <ul className="tray-list">
                {tray.items.map((c) => (
                  <li key={c.id}>
                    <a href={href(`/recipe/${c.id}`)}>
                      <RecipeImage card={c} className="thumb" />
                      <span>
                        <small>{roleLabel(roleOf(c))}</small>
                        <strong>{displayName(c)}</strong>
                        <MatchLine match={matchRecipe(c.id, pantry)} />
                      </span>
                      <span className="kcal">{Math.round(c.kcal)} kcal</span>
                    </a>
                  </li>
                ))}
              </ul>
              <p className="tray-total">{t('home.trayTotal', { kcal: Math.round(tray.nutrients.kcal) })}</p>
              <MacroBar n={tray.nutrients} />
              <button type="button" className="btn primary block" onClick={() => setPlanCards(tray.items)}>
                <Icon name="calendar" size={18} /> {t('home.trayAdd')}
              </button>
            </section>
          )}
          <div className="panel slim">
            <Toggle
              checked={user.settings.no_repeat_enabled}
              onChange={(v) => actions.setSettings({ no_repeat_enabled: v })}
              label={t('noRepeat.label')}
              hint={
                user.settings.no_repeat_enabled
                  ? t('noRepeat.hidden', { count: blocked.size, days: user.settings.no_repeat_days })
                  : t('noRepeat.off', { days: user.settings.no_repeat_days })
              }
            />
          </div>
        </aside>
      </div>

      {planCards && <AddToPlanDialog open cards={planCards} defaultMeal={meal ?? 'dinner'} onClose={() => setPlanCards(null)} />}
    </div>
  )
}

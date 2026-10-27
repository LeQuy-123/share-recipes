import { useMemo, useState } from 'react'
import { CardRail, RecipeCardView } from '../components/RecipeCard'
import { Chip, EmptyState, Icon, SectionHead } from '../components/ui'
import { getCards, getCard, getLookups, label, searchRecipes } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { difficultyLabel } from '../lib/format'
import { applyFilters, byEase, EASY_MAX, HEALTHY_SCORE, type Filters } from '../lib/planner'
import { href, navigate, useRoute } from '../lib/router'
import { useUser } from '../store/user'

const FILTER_KEYS = ['dish', 'method', 'meal', 'protein', 'cuisine', 'healthy', 'quick', 'diff'] as const
/** Filters behind the "More filters" button on phones. */
const MORE_KEYS = ['dish', 'method', 'protein', 'cuisine', 'diff'] as const
/** Country code shown on the cuisine tiles (text, so it renders the same everywhere). */
const CUISINE_MARK: Record<string, string> = { vietnamese: 'VN', korean: 'KR', japanese: 'JP', chinese: 'CN', thai: 'TH', western: 'EU' }
/** Cuisines with at least this many dishes get their own rail on the browse view. */
const RAIL_MIN = 20

export function ExplorePage() {
  const { t } = useT()
  const { query } = useRoute()
  const user = useUser()
  const q = query.get('q') ?? ''
  const [text, setText] = useState(q)
  const [showMore, setShowMore] = useState(false)
  const filters: Filters = {
    dish: query.get('dish'),
    method: query.get('method'),
    meal: query.get('meal'),
    protein: query.get('protein'),
    cuisine: query.get('cuisine'),
    healthy: query.get('healthy') === '1',
    quick: query.get('quick') === '1',
    maxDifficulty: Number(query.get('diff')) || null,
  }
  const hasFilter = FILTER_KEYS.some((k) => query.get(k))
  const moreActive = MORE_KEYS.filter((k) => query.get(k)).length
  const { dishTypes, methods, proteins, cuisines } = getLookups()
  const cards = getCards()

  const setParam = (key: string, value: string | null) => {
    const next: Record<string, string | null> = {}
    for (const k of ['q', ...FILTER_KEYS]) next[k] = query.get(k)
    next[key] = next[key] === value ? null : value
    navigate('/explore', next, true)
  }

  const count = (pred: (c: (typeof cards)[number]) => boolean) => cards.filter(pred).length
  const results = useMemo(() => (q ? searchRecipes(q) : null), [q])
  const matching = applyFilters(results ? results.byName : cards, filters)
  // Text search keeps its relevance order; browsing shows the easiest dishes first.
  const filtered = filters.healthy
    ? [...matching].sort((a, b) => b.health_score - a.health_score)
    : results
      ? matching
      : [...matching].sort(byEase)

  // Lookup order (Vietnamese, Korean, Japanese, …), only cuisines that have recipes.
  const cuisineList = [...cuisines.values()]
    .map((c) => ({ ...c, count: count((r) => r.cuisine_id === c.id) }))
    .filter((c) => c.count > 0)
  const favorites = user.favorites.map((id) => getCard(id)).filter((c) => !!c)
  const seeAll = (query: Record<string, string | number>) => (
    <a className="btn ghost small" href={href('/explore', query)}>
      {t('common.seeAll')}
    </a>
  )

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t('nav.explore')}</p>
          <h1>{t('explore.title')}</h1>
        </div>
      </header>

      <div className="sticky-tools">
        <form className="search-box" role="search" onSubmit={(e) => e.preventDefault()}>
          <Icon name="search" size={18} />
          <input
            type="search"
            value={text}
            enterKeyHint="search"
            onChange={(e) => {
              // Local state keeps typing smooth (Vietnamese IME); the URL follows.
              setText(e.target.value)
              setParam('q', e.target.value.trim() || null)
            }}
            placeholder={t('explore.searchPlaceholder')}
            aria-label={t('explore.searchLabel')}
          />
        </form>

        <div className="chips scroll">
          <button type="button" className={`chip more-btn${showMore || moreActive ? ' active' : ''}`} onClick={() => setShowMore(!showMore)} aria-expanded={showMore}>
            <Icon name="list" size={14} /> {t('explore.moreFilters')}
            {moreActive > 0 && <span className="badge">{moreActive}</span>}
          </button>
          <Chip active={filters.maxDifficulty === EASY_MAX} onClick={() => setParam('diff', String(EASY_MAX))}>
            ★ {t('filters.easy')}
          </Chip>
          <Chip active={filters.healthy} onClick={() => setParam('healthy', '1')}>
            <Icon name="leaf" size={14} /> {t('filters.healthy')}
          </Chip>
          <Chip active={filters.quick} onClick={() => setParam('quick', '1')}>
            <Icon name="clock" size={14} /> {t('filters.quick')}
          </Chip>
          {(['breakfast', 'lunch', 'dinner', 'party'] as const).map((m) => (
            <Chip key={m} active={filters.meal === m} onClick={() => setParam('meal', m)}>
              {t(`meal.${m}`)}
            </Chip>
          ))}
        </div>
      </div>

      <div className={`filter-block${showMore ? ' open' : ''}`}>
        <div className="filter-row">
          <span className="filter-label">{t('explore.difficulty')}</span>
          <div className="chips scroll">
            {[1, 2, 3, 4].map((n) => (
              <Chip key={n} active={filters.maxDifficulty === n} onClick={() => setParam('diff', String(n))} title={t('explore.maxStars', { count: n })}>
                ≤ {'★'.repeat(n)} {n === 1 ? difficultyLabel(1) : ''}
              </Chip>
            ))}
          </div>
        </div>
        <div className="filter-row">
          <span className="filter-label">{t('explore.dishType')}</span>
          <div className="chips scroll">
            {[...dishTypes.values()]
              .filter((d) => count((c) => c.dish_type_id === d.id))
              .map((d) => (
                <Chip key={d.id} active={filters.dish === d.id} onClick={() => setParam('dish', d.id)}>
                  {displayName(d)}
                </Chip>
              ))}
          </div>
        </div>
        <div className="filter-row">
          <span className="filter-label">{t('explore.method')}</span>
          <div className="chips scroll">
            {[...methods.values()]
              .filter((m) => count((c) => c.methods.includes(m.id)))
              .map((m) => (
                <Chip key={m.id} active={filters.method === m.id} onClick={() => setParam('method', m.id)}>
                  {displayName(m)}
                </Chip>
              ))}
          </div>
        </div>
        <div className="filter-row">
          <span className="filter-label">{t('explore.protein')}</span>
          <div className="chips scroll">
            {[...proteins.values()]
              .filter((p) => p.id !== 'none' && count((c) => c.main_protein_id === p.id))
              .map((p) => (
                <Chip key={p.id} active={filters.protein === p.id} onClick={() => setParam('protein', p.id)}>
                  {displayName(p)}
                </Chip>
              ))}
          </div>
        </div>
        {cuisineList.length > 1 && (
          <div className="filter-row">
            <span className="filter-label">{t('explore.cuisine')}</span>
            <div className="chips scroll">
              {cuisineList.map((c) => (
                <Chip key={c.id} active={filters.cuisine === c.id} onClick={() => setParam('cuisine', c.id)}>
                  {displayName(c)} <span className="chip-count">{c.count}</span>
                </Chip>
              ))}
            </div>
          </div>
        )}
      </div>

      {(q || hasFilter) && (
        <section>
          <SectionHead
            title={q ? t('explore.resultsFor', { q }) : filters.cuisine ? label(cuisines, filters.cuisine) : t('explore.results')}
            count={filtered.length}
            action={
              hasFilter && (
                <button type="button" className="btn ghost small" onClick={() => navigate('/explore', { q: q || null }, true)}>
                  {t('explore.clearFilters')}
                </button>
              )
            }
          />
          {filtered.length === 0 && !results?.byIngredient.length && (
            <EmptyState icon="search" title={t('explore.noneTitle')}>
              <p>{t('explore.noneText')}</p>
            </EmptyState>
          )}
          <div className="card-grid">
            {filtered.map((c) => (
              <RecipeCardView key={c.id} card={c} />
            ))}
          </div>
        </section>
      )}

      {results &&
        results.byIngredient.map((g) => {
          const list = applyFilters(g.recipes, filters)
          if (!list.length) return null
          return (
            <section key={g.ingredient.id}>
              <SectionHead title={t('explore.withIngredient', { name: displayName(g.ingredient) })} count={list.length} />
              <CardRail>
                {list.map((c) => (
                  <RecipeCardView key={c.id} card={c} />
                ))}
              </CardRail>
            </section>
          )
        })}

      {results && results.ingredients.length > 0 && (
        <section>
          <SectionHead title={t('explore.howToPrep')} />
          <div className="chips wrap">
            {results.ingredients.slice(0, 8).map((i) => (
              <a key={i.id} className="chip" href={href(`/ingredient/${i.id}`)}>
                {displayName(i)} <Icon name="right" size={14} />
              </a>
            ))}
          </div>
        </section>
      )}

      {!q && !hasFilter && (
        <>
          {favorites.length > 0 && (
            <section>
              <SectionHead title={t('explore.favorites')} count={favorites.length} />
              <CardRail>
                {favorites.map((c) => (
                  <RecipeCardView key={c.id} card={c} />
                ))}
              </CardRail>
            </section>
          )}
          {cuisineList.length > 1 && (
            <section>
              <SectionHead title={t('explore.byCuisine')} />
              <div className="cuisine-grid">
                {cuisineList.map((c) => (
                  <a key={c.id} className="cuisine-tile" data-cuisine={c.id} href={href('/explore', { cuisine: c.id })}>
                    <span className="cuisine-mark" aria-hidden="true">
                      {CUISINE_MARK[c.id] ?? c.id.slice(0, 2).toUpperCase()}
                    </span>
                    <span className="cuisine-text">
                      <strong>{displayName(c)}</strong>
                      <span>{t('explore.dishCount', { count: c.count })}</span>
                    </span>
                  </a>
                ))}
              </div>
            </section>
          )}
          {cuisineList
            .filter((c) => c.count >= RAIL_MIN)
            .map((c) => (
              <section key={c.id}>
                <SectionHead title={t('explore.cuisineRail', { name: displayName(c) })} action={seeAll({ cuisine: c.id })} />
                <CardRail>
                  {cards
                    .filter((r) => r.cuisine_id === c.id)
                    .sort(byEase)
                    .slice(0, 8)
                    .map((r) => (
                      <RecipeCardView key={r.id} card={r} />
                    ))}
                </CardRail>
              </section>
            ))}
          <section>
            <SectionHead title={t('explore.easiest')} action={seeAll({ diff: EASY_MAX })} />
            <CardRail>
              {[...cards]
                .sort(byEase)
                .slice(0, 8)
                .map((c) => (
                  <RecipeCardView key={c.id} card={c} />
                ))}
            </CardRail>
          </section>
          <section>
            <SectionHead title={t('explore.healthiest')} action={seeAll({ healthy: 1 })} />
            <CardRail>
              {[...cards]
                .filter((c) => c.health_score >= HEALTHY_SCORE)
                .sort((a, b) => b.health_score - a.health_score)
                .slice(0, 8)
                .map((c) => (
                  <RecipeCardView key={c.id} card={c} note={c.health_notes.slice(0, 2).map((n) => t(`health.${n}`)).join(' · ')} />
                ))}
            </CardRail>
          </section>
          <section>
            <SectionHead title={t('explore.quickest')} action={seeAll({ quick: 1 })} />
            <CardRail>
              {cards
                .filter((c) => c.total_min <= 30)
                .sort(byEase)
                .slice(0, 8)
                .map((c) => (
                  <RecipeCardView key={c.id} card={c} />
                ))}
            </CardRail>
          </section>
        </>
      )}
    </div>
  )
}

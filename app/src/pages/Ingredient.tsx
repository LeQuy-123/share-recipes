import { useMemo } from 'react'
import { CardRail, RecipeCardView } from '../components/RecipeCard'
import { EmptyState, Icon, SectionHead } from '../components/ui'
import { getIngredientDetail, getLookups, label, matchRecipe, prepStepsFor, recipesUsing } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { goBack, href } from '../lib/router'
import { actions, useUser } from '../store/user'

/** One ingredient: how to prepare it, what to cook with it. */
export function IngredientPage({ id }: { id: string }) {
  const { t, lang } = useT()
  const ing = useMemo(() => getIngredientDetail(id), [id])
  const prep = useMemo(() => prepStepsFor(id), [id])
  const recipes = useMemo(() => recipesUsing(id), [id])
  const user = useUser()
  const pantry = useMemo(() => new Set(user.pantry.map((p) => p.id)), [user.pantry])
  const { categories, stepTypes } = getLookups()

  if (!ing) {
    return (
      <div className="page">
        <EmptyState icon="search" title={t('ingredient.notFound')} />
      </div>
    )
  }
  const inPantry = pantry.has(id)
  const direct = recipes.filter((r) => r.role === 'ingredient')
  const asSubstitute = recipes.filter((r) => r.role === 'substitute')
  const name = displayName(ing)
  const other = lang === 'en' ? ing.name_vi : ing.name_en

  return (
    <div className="page">
      <header className="page-head with-back">
        <button type="button" className="icon-btn" onClick={() => goBack('/pantry')} aria-label={t('common.back')}>
          <Icon name="left" />
        </button>
        <div>
          <p className="eyebrow">{label(categories, ing.category_id)}</p>
          <h1>{name}</h1>
          {other && other !== name && <p className="muted">{other}</p>}
        </div>
      </header>

      <div className="split">
        <div className="split-main">
          {ing.aliases.length > 0 && <p className="muted">{t('recipe.aka', { names: ing.aliases.slice(0, 8).join(', ') })}</p>}

          {ing.pantry_staple ? (
            <p className="hint">
              <Icon name="info" size={14} /> {t('ingredient.staple')}
            </p>
          ) : (
            <button type="button" className={`btn block${inPantry ? '' : ' primary'}`} onClick={() => actions.togglePantry(id)}>
              <Icon name={inPantry ? 'check' : 'plus'} size={18} /> {inPantry ? t('ingredient.inPantry') : t('ingredient.addToPantry')}
            </button>
          )}

          <section>
            <SectionHead title={t('ingredient.howToPrep')} />
            {lang === 'en' && prep.length > 0 && <p className="hint">{t('recipe.viOnly')}</p>}
            {prep.length === 0 ? (
              <p className="muted">{t('ingredient.noPrep')}</p>
            ) : (
              <ol className="steps">
                {prep.slice(0, 6).map((p) => (
                  <li key={`${p.recipe_id}-${p.step_order}`}>
                    <div className="step-head">
                      <span className={`step-type t-${p.type_id}`}>{label(stepTypes, p.type_id)}</span>
                      <a className="muted" href={href(`/recipe/${p.recipe_id}`)}>
                        {t('ingredient.inRecipe', { name: displayName({ name_vi: p.recipe_name, name_en: p.recipe_name_en }) })}
                      </a>
                    </div>
                    {p.title && <h3>{p.title}</h3>}
                    <p>{p.text}</p>
                    {p.tip && (
                      <p className="tip">
                        <Icon name="info" size={14} /> {p.tip}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <div className="split-side">
          {ing.nutrition && (
            <section className="panel">
              <h2>{t('ingredient.per100g')}</h2>
              <div className="nutri-grid">
                <span>
                  <strong>{Math.round(ing.nutrition.kcal)}</strong> kcal
                </span>
                <span>
                  <strong>{ing.nutrition.protein_g}</strong> g {t('nutrition.proteinShort')}
                </span>
                <span>
                  <strong>{ing.nutrition.fat_g}</strong> g {t('nutrition.fatShort')}
                </span>
                <span>
                  <strong>{ing.nutrition.carbs_g}</strong> g {t('nutrition.carbsShort')}
                </span>
                <span>
                  <strong>{ing.nutrition.fiber_g}</strong> g {t('nutrition.fiberShort')}
                </span>
              </div>
            </section>
          )}
        </div>
      </div>

      <section>
        <SectionHead title={t('ingredient.cookWith', { name })} count={direct.length} />
        {direct.length === 0 && <p className="muted">{t('ingredient.noRecipes')}</p>}
        <div className="card-grid">
          {direct.map((r) => (
            <RecipeCardView key={r.card.id} card={r.card} match={pantry.size ? matchRecipe(r.card.id, pantry) : undefined} />
          ))}
        </div>
      </section>

      {asSubstitute.length > 0 && (
        <section>
          <SectionHead title={t('ingredient.asSubstitute')} count={asSubstitute.length} />
          <CardRail>
            {asSubstitute.map((r) => (
              <RecipeCardView key={r.card.id} card={r.card} compact />
            ))}
          </CardRail>
        </section>
      )}
    </div>
  )
}

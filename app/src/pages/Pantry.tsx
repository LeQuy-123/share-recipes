import { useMemo, useState } from 'react'
import { IngredientSearch } from '../components/IngredientSearch'
import { Chip, EmptyState, Icon, SectionHead } from '../components/ui'
import { categoryCounts, getIngredient, getLookups, label, popularIngredients } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { href } from '../lib/router'
import { actions, useUser } from '../store/user'

export function PantryPage() {
  const { t } = useT()
  const user = useUser()
  const pantry = useMemo(() => new Set(user.pantry.map((p) => p.id)), [user.pantry])
  const [category, setCategory] = useState<string | null>(null)
  const { categories } = getLookups()

  const quick = popularIngredients({ category: category ?? undefined, limit: category ? 40 : 24 }).filter((i) => !pantry.has(i.id))

  const grouped = useMemo(() => {
    const groups = new Map<string, { id: string; name: string }[]>()
    for (const item of user.pantry) {
      const ing = getIngredient(item.id)
      if (!ing) continue
      const list = groups.get(ing.category_id) ?? []
      list.push({ id: ing.id, name: displayName(ing) })
      groups.set(ing.category_id, list)
    }
    return [...groups.entries()].sort((a, b) => (categories.get(a[0])?.sort ?? 99) - (categories.get(b[0])?.sort ?? 99))
    // displayName depends on the language, which useT() re-renders for
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.pantry, categories, t])

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t('nav.pantry')}</p>
          <h1>{t('pantry.title')}</h1>
        </div>
      </header>

      <div className="split">
        <div className="split-main">
          <IngredientSearch pantry={pantry} onToggle={actions.togglePantry} />

          <div className="scan-row">
            <button type="button" className="scan-btn" disabled title={t('pantry.soonTitle')}>
              <Icon name="camera" /> {t('pantry.scanFridge')} <span className="soon">{t('pantry.soon')}</span>
            </button>
            <button type="button" className="scan-btn" disabled title={t('pantry.soonTitle')}>
              <Icon name="receipt" /> {t('pantry.scanReceipt')} <span className="soon">{t('pantry.soon')}</span>
            </button>
          </div>

          <section>
            <SectionHead title={category ? label(categories, category) : t('pantry.quickAdd')} />
            <div className="chips scroll">
              <Chip active={!category} onClick={() => setCategory(null)}>
                {t('pantry.popular')}
              </Chip>
              {categoryCounts().map((c) => (
                <Chip key={c.id} active={category === c.id} onClick={() => setCategory(c.id)}>
                  {label(categories, c.id)}
                </Chip>
              ))}
            </div>
            <div className="chips wrap">
              {quick.map((i) => (
                <button key={i.id} type="button" className="chip add" onClick={() => actions.addToPantry([i.id])}>
                  <Icon name="plus" size={14} /> {displayName(i)}
                </button>
              ))}
              {quick.length === 0 && <p className="muted">{t('pantry.allAdded')}</p>}
            </div>
          </section>
        </div>

        <section className="split-side panel">
          <SectionHead
            title={t('pantry.have')}
            count={pantry.size}
            action={
              pantry.size > 0 && (
                <button type="button" className="btn ghost small" onClick={() => window.confirm(t('pantry.clearConfirm')) && actions.clearPantry()}>
                  <Icon name="trash" size={16} /> {t('pantry.clear')}
                </button>
              )
            }
          />
          {pantry.size === 0 ? (
            <EmptyState icon="fridge" title={t('pantry.emptyTitle')}>
              <p>{t('pantry.emptyText')}</p>
            </EmptyState>
          ) : (
            grouped.map(([cat, items]) => (
              <div key={cat} className="pantry-group">
                <h3>{label(categories, cat)}</h3>
                <div className="chips wrap">
                  {items.map((i) => (
                    <span key={i.id} className="chip have">
                      <a href={href(`/ingredient/${i.id}`)}>{i.name}</a>
                      <button type="button" onClick={() => actions.removeFromPantry([i.id])} aria-label={t('pantry.removeItem', { name: i.name })}>
                        <Icon name="x" size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            ))
          )}
          <p className="hint">
            <Icon name="info" size={14} /> {t('pantry.staplesHint')}
          </p>
          {pantry.size > 0 && (
            <a className="btn primary block" href={href('/')}>
              {t('pantry.seeDishes')} <Icon name="right" size={18} />
            </a>
          )}
        </section>
      </div>
    </div>
  )
}

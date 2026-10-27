import { useMemo, useState } from 'react'
import { getLookups, label, searchIngredients } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { href } from '../lib/router'
import { Icon } from './ui'

/** Search box that ranks ingredients by match, then by how common they are. */
export function IngredientSearch(props: { pantry: Set<string>; onToggle: (id: string) => void; autoFocus?: boolean }) {
  const { t } = useT()
  const [q, setQ] = useState('')
  const results = useMemo(() => searchIngredients(q, 12), [q])
  const { categories } = getLookups()

  return (
    <div className="ing-search">
      <div className="search-box">
        <Icon name="search" size={18} />
        <input
          type="search"
          value={q}
          autoFocus={props.autoFocus}
          placeholder={t('pantry.searchPlaceholder')}
          enterKeyHint="done"
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) {
              if (!props.pantry.has(results[0].id)) props.onToggle(results[0].id)
              setQ('')
            }
          }}
          aria-label={t('pantry.searchLabel')}
        />
        {q && (
          <button type="button" className="icon-btn" onClick={() => setQ('')} aria-label={t('common.clear')}>
            <Icon name="x" size={16} />
          </button>
        )}
      </div>
      {q && (
        <ul className="ing-results">
          {results.length === 0 && <li className="muted">{t('pantry.noResult', { q })}</li>}
          {results.map((r) => {
            const inPantry = props.pantry.has(r.id)
            const name = displayName(r)
            return (
              <li key={r.id}>
                <a href={href(`/ingredient/${r.id}`)} className="ing-name">
                  <strong>{name}</strong>
                  <small>
                    {label(categories, r.category_id)}
                    {r.recipe_count ? ` · ${t('pantry.dishCount', { count: r.recipe_count })}` : ''}
                  </small>
                </a>
                <button
                  type="button"
                  className={`add-btn${inPantry ? ' added' : ''}`}
                  onClick={() => props.onToggle(r.id)}
                  aria-label={inPantry ? t('pantry.removeItem', { name }) : t('pantry.addItem', { name })}
                >
                  <Icon name={inPantry ? 'check' : 'plus'} size={18} />
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

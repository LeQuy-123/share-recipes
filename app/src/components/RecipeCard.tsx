import { useState, type ReactNode } from 'react'
import { getIngredient, type Match, type RecipeCard } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { formatMinutes } from '../lib/format'
import { href } from '../lib/router'
import { HealthBadge, Icon, Stars } from './ui'

/**
 * Recipe photo: the copy saved in the app first (fast, offline), then the Wikimedia URL,
 * then a placeholder if both fail.
 */
export function RecipeImage({ card, className, eager }: { card: RecipeCard; className?: string; eager?: boolean }) {
  const sources = [card.image_local, card.image_url].filter((s): s is string => !!s)
  const [index, setIndex] = useState(0)
  if (index >= sources.length)
    return (
      <div className={`${className ?? ''} img-placeholder`} aria-hidden="true">
        <Icon name="pot" size={32} />
      </div>
    )
  return (
    <img
      className={className}
      src={sources[index]}
      alt=""
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => setIndex(index + 1)}
    />
  )
}

export function MatchLine({ match }: { match: Match }) {
  const { t } = useT()
  if (!match.total) return null
  if (!match.missing.length)
    return (
      <p className="match ok">
        <Icon name="check" size={14} /> {match.substitute ? t('match.readyWithSubs', { count: match.substitute }) : t('match.ready')}
      </p>
    )
  const names = match.missing.map((id) => displayName(getIngredient(id)) || id)
  return (
    <p className="match missing">
      {t('match.missing', { count: names.length, names: names.slice(0, 3).join(', ') + (names.length > 3 ? '…' : '') })}
    </p>
  )
}

export function RecipeCardView(props: { card: RecipeCard; match?: Match; note?: string; compact?: boolean }) {
  const { card, match } = props
  useT() // re-render on language change
  return (
    <a className={`rcard${props.compact ? ' compact' : ''}`} href={href(`/recipe/${card.id}`)}>
      <div className="rcard-media">
        <RecipeImage card={card} className="rcard-img" />
        <span className="rcard-time">
          <Icon name="clock" size={12} /> {formatMinutes(card.total_min)}
        </span>
      </div>
      <div className="rcard-body">
        <h3>{displayName(card)}</h3>
        <div className="rcard-meta">
          <Stars value={card.difficulty} />
          <span className="kcal">{Math.round(card.kcal)} kcal</span>
          <HealthBadge score={card.health_score} />
        </div>
        {match && <MatchLine match={match} />}
        {props.note && <p className="note">{props.note}</p>}
      </div>
    </a>
  )
}

/** Horizontal, swipeable row of cards on phones; a normal grid from tablet width up. */
export function CardRail({ children }: { children: ReactNode }) {
  return <div className="card-rail">{children}</div>
}

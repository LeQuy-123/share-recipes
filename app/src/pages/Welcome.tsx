// Landing page: shown on first launch (and from Profile → "About"). Full screen, no tab bar.
// Short on words, long on motion: a moving wall of dish photos, a looping "fridge → dish" demo,
// counters that run up to the live catalog numbers. All motion stops under reduced motion.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { QuickSettings } from '../components/QuickSettings'
import { RecipeImage } from '../components/RecipeCard'
import { Icon, Stars, type IconName } from '../components/ui'
import { getCard, getCards, getLookups, getRecipeDetail, ingredientCount, type RecipeCard } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { formatMinutes } from '../lib/format'
import { useInstall } from '../lib/install'
import { href, navigate } from '../lib/router'
import { versionLabel } from '../lib/version'
import { actions } from '../store/user'

/** The dish the demo "cooks" from the fridge. */
const DEMO = 'trung-xao-ca-chua'
const WALL_COLUMNS = 5
const WALL_PER_COLUMN = 5
const CUISINE_MARK: Record<string, string> = { vietnamese: 'VN', korean: 'KR', japanese: 'JP', chinese: 'CN', thai: 'TH', western: 'EU' }
const STEPS: { icon: IconName; key: string }[] = [
  { icon: 'fridge', key: '1' },
  { icon: 'sparkle', key: '2' },
  { icon: 'play', key: '3' },
]

const reducedMotion = () => !window.matchMedia || window.matchMedia('(prefers-reduced-motion: reduce)').matches

/** Photos for the wall: dishes with a photo (saved copy or remote), taking turns between cuisines. */
function wallCards(cards: RecipeCard[]): RecipeCard[] {
  const byCuisine = new Map<string, RecipeCard[]>()
  for (const c of cards) if (c.image_local || c.image_url) byCuisine.set(c.cuisine_id, [...(byCuisine.get(c.cuisine_id) ?? []), c])
  const queues = [...byCuisine.values()]
  const out: RecipeCard[] = []
  for (let i = 0; out.length < WALL_COLUMNS * WALL_PER_COLUMN && queues.some((q) => q.length > i); i++)
    for (const q of queues) if (q[i] && out.length < WALL_COLUMNS * WALL_PER_COLUMN) out.push(q[i])
  return out
}

/** Counts from 0 up to `to` once on mount (or shows `to` right away under reduced motion). */
function useCountUp(to: number, ms = 1400) {
  const [value, setValue] = useState(() => (reducedMotion() ? to : 0))
  useEffect(() => {
    if (reducedMotion()) return
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / ms)
      setValue(Math.round(to * (1 - (1 - p) ** 3)))
      if (p < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [to, ms])
  return value
}

/** Fades its content in when scrolled into view. */
function Reveal({ children, className = '' }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLElement>(null)
  const [shown, setShown] = useState(() => typeof IntersectionObserver === 'undefined' || reducedMotion())
  useEffect(() => {
    if (shown || !ref.current) return
    const io = new IntersectionObserver(([e]) => e.isIntersecting && setShown(true), { threshold: 0.15 })
    io.observe(ref.current)
    return () => io.disconnect()
  }, [shown])
  return (
    <section ref={ref} className={`reveal${shown ? ' in' : ''} ${className}`}>
      {children}
    </section>
  )
}

function Stat({ value, label }: { value: number; label: string }) {
  const shown = useCountUp(value)
  return (
    <li>
      <strong>{shown}</strong> {label}
    </li>
  )
}

export function WelcomePage() {
  const { t } = useT()
  const install = useInstall()
  const cards = getCards()
  const { cuisines } = getLookups()
  const cuisineList = [...cuisines.values()]
    .map((c) => ({ ...c, count: cards.filter((r) => r.cuisine_id === c.id).length }))
    .filter((c) => c.count > 0)
  const wall = wallCards(cards)
  const demo = getCard(DEMO) ?? cards[0]
  const demoIngredients = (getRecipeDetail(demo.id)?.lines ?? []).filter((l) => l.is_key && !l.pantry_staple).slice(0, 3)

  const start = (path = '/') => {
    actions.setSettings({ welcomed: true })
    navigate(path)
  }

  return (
    <div className="landing">
      <section className="landing-hero">
        <div className="photo-wall" aria-hidden="true">
          {Array.from({ length: WALL_COLUMNS }, (_, col) => {
            const column = wall.filter((_, i) => i % WALL_COLUMNS === col)
            return (
              <div key={col} className={`wall-col c${col}`}>
                {/* Twice the same photos: the column scrolls by half its height and loops seamlessly. */}
                {[...column, ...column].map((c, i) => (
                  <RecipeImage key={`${c.id}-${i}`} card={c} className="wall-img" eager={col < 3 && i < 3} />
                ))}
              </div>
            )
          })}
        </div>

        <header className="landing-bar">
          <span className="landing-brand">
            <img src="/favicon.svg" alt="" width={32} height={32} />
            AutoRecipt
          </span>
          <QuickSettings />
        </header>

        <div className="hero-copy">
          <h1>{t('welcome.title')}</h1>
          <p className="hero-lead">{t('welcome.lead')}</p>
          <div className="landing-cta">
            <button type="button" className="btn primary large glow" onClick={() => start('/pantry')}>
              <Icon name="fridge" size={20} /> {t('welcome.ctaPantry')}
            </button>
            <button type="button" className="btn large glass" onClick={() => start('/explore')}>
              <Icon name="explore" size={20} /> {t('welcome.ctaExplore')}
            </button>
          </div>
          <ul className="landing-stats">
            <Stat value={cards.length} label={t('welcome.statRecipes')} />
            <Stat value={ingredientCount()} label={t('welcome.statIngredients')} />
            <Stat value={cuisineList.length} label={t('welcome.statCuisines')} />
          </ul>
        </div>
        <span className="scroll-cue" aria-hidden="true">
          <Icon name="right" size={22} />
        </span>
      </section>

      <div className="landing-body">
        <Reveal className="landing-how">
          <div className="demo" aria-hidden="true">
            <div className="demo-fridge">
              <small>
                <Icon name="fridge" size={14} /> {t('welcome.demoFridge')}
              </small>
              <div className="demo-chips">
                {demoIngredients.map((l, i) => (
                  <span key={l.id} className="demo-chip" style={{ animationDelay: `${0.4 + i * 0.5}s` }}>
                    <Icon name="check" size={14} /> {displayName(l)}
                  </span>
                ))}
              </div>
            </div>
            <span className="demo-arrow">
              <Icon name="sparkle" size={22} />
            </span>
            <div className="demo-card">
              <RecipeImage card={demo} className="demo-img" />
              <div>
                <strong>{displayName(demo)}</strong>
                <span className="demo-meta">
                  <Stars value={demo.difficulty} /> {formatMinutes(demo.total_min)}
                </span>
                <span className="demo-ready">
                  <Icon name="check" size={14} /> {t('home.ready')}
                </span>
              </div>
            </div>
          </div>
          <div>
            <h2>{t('welcome.howTitle')}</h2>
            <ol className="landing-steps">
              {STEPS.map((s) => (
                <li key={s.key}>
                  <span className="step-icon">
                    <Icon name={s.icon} size={20} />
                  </span>
                  {t(`welcome.step${s.key}`)}
                </li>
              ))}
            </ol>
          </div>
        </Reveal>

        <Reveal>
          <h2>{t('welcome.cuisinesTitle')}</h2>
          <div className="cuisine-grid">
            {cuisineList.map((c) => (
              <a key={c.id} className="cuisine-tile" href={href('/explore', { cuisine: c.id })} onClick={() => actions.setSettings({ welcomed: true })}>
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
        </Reveal>

        {!install.installed && (
          <Reveal className="landing-install">
            <span className="step-icon">
              <Icon name="download" size={20} />
            </span>
            <div>
              <strong>{t('install.title')}</strong>
              <p className="hint">{install.canPrompt ? t('install.text') : install.ios ? t('install.ios') : t('install.other')}</p>
            </div>
            {install.canPrompt && (
              <button type="button" className="btn primary" onClick={() => install.install()}>
                {t('install.button')}
              </button>
            )}
          </Reveal>
        )}

        <Reveal className="landing-final">
          <h2>{t('welcome.finalTitle')}</h2>
          <button type="button" className="btn primary large glow" onClick={() => start('/')}>
            {t('welcome.ctaStart')} <Icon name="right" size={20} />
          </button>
        </Reveal>

        <footer className="landing-footer">
          <p>{t('welcome.footerData')}</p>
          <p>{t('welcome.footerPrivacy')}</p>
          <p>
            <a href="https://github.com/LeQuy-123/share-recipes" target="_blank" rel="noreferrer">
              GitHub
            </a>{' '}
            · <span className="app-version">{versionLabel}</span>
          </p>
        </footer>
      </div>
    </div>
  )
}

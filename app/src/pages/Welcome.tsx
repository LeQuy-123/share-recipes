// Landing page: what the app does, shown on first launch (and from Profile → "About").
// Full screen without the tab bar; every number comes from the catalog.
import { QuickSettings } from '../components/QuickSettings'
import { RecipeImage } from '../components/RecipeCard'
import { Icon, type IconName } from '../components/ui'
import { getCard, getCards, getLookups, ingredientCount } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { useInstall } from '../lib/install'
import { href, navigate } from '../lib/router'
import { actions } from '../store/user'

/** Dishes in the hero collage, one per big cuisine plus a Vietnamese classic. */
const HERO = ['pho-bo', 'kimchi-jjigae', 'kare-raisu', 'bun-cha']
const CUISINE_MARK: Record<string, string> = { vietnamese: 'VN', korean: 'KR', japanese: 'JP', chinese: 'CN', thai: 'TH', western: 'EU' }
const FEATURES: { icon: IconName; key: string }[] = [
  { icon: 'fridge', key: 'pantry' },
  { icon: 'play', key: 'steps' },
  { icon: 'sparkle', key: 'easy' },
  { icon: 'calendar', key: 'plan' },
  { icon: 'leaf', key: 'healthy' },
  { icon: 'refresh', key: 'fresh' },
]

export function WelcomePage() {
  const { t } = useT()
  const install = useInstall()
  const cards = getCards()
  const { cuisines } = getLookups()
  const hero = HERO.map((id) => getCard(id)).filter((c) => !!c)
  const cuisineList = [...cuisines.values()]
    .map((c) => ({ ...c, count: cards.filter((r) => r.cuisine_id === c.id).length }))
    .filter((c) => c.count > 0)

  const start = (path = '/') => {
    actions.setSettings({ welcomed: true })
    navigate(path)
  }

  return (
    <div className="landing">
      <header className="landing-bar">
        <span className="landing-brand">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={30} height={30} />
          AutoRecipt
        </span>
        <QuickSettings />
      </header>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">{t('welcome.eyebrow')}</p>
          <h1>{t('welcome.title')}</h1>
          <p className="landing-lead">{t('welcome.lead')}</p>
          <div className="landing-cta">
            <button type="button" className="btn primary large" onClick={() => start('/pantry')}>
              <Icon name="fridge" size={20} /> {t('welcome.ctaPantry')}
            </button>
            <button type="button" className="btn ghost large" onClick={() => start('/explore')}>
              <Icon name="explore" size={20} /> {t('welcome.ctaExplore')}
            </button>
          </div>
          <ul className="landing-stats">
            <li>
              <strong>{cards.length}</strong> {t('welcome.statRecipes')}
            </li>
            <li>
              <strong>{ingredientCount()}</strong> {t('welcome.statIngredients')}
            </li>
            <li>
              <strong>{cuisineList.length}</strong> {t('welcome.statCuisines')}
            </li>
          </ul>
        </div>
        <div className="landing-collage" aria-hidden="true">
          {hero.map((c, i) => (
            <figure key={c.id} className={`collage-${i}`}>
              <RecipeImage card={c} eager />
              <figcaption>{displayName(c)}</figcaption>
            </figure>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2>{t('welcome.howTitle')}</h2>
        <ol className="landing-steps">
          {(['1', '2', '3'] as const).map((n) => (
            <li key={n}>
              <span className="step-num">{n}</span>
              <div>
                <strong>{t(`welcome.how${n}Title`)}</strong>
                <p>{t(`welcome.how${n}Text`)}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="landing-section">
        <h2>{t('welcome.featuresTitle')}</h2>
        <div className="landing-features">
          {FEATURES.map((f) => (
            <article key={f.key} className="feature">
              <span className="feature-icon">
                <Icon name={f.icon} size={22} />
              </span>
              <h3>{t(`welcome.feature.${f.key}Title`)}</h3>
              <p>{t(`welcome.feature.${f.key}Text`)}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <h2>{t('welcome.cuisinesTitle')}</h2>
        <div className="cuisine-grid">
          {cuisineList.map((c) => (
            <a
              key={c.id}
              className="cuisine-tile"
              href={href('/explore', { cuisine: c.id })}
              onClick={() => actions.setSettings({ welcomed: true })}
            >
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

      {!install.installed && (
        <section className="landing-section landing-install">
          <div>
            <h2>
              <Icon name="download" size={20} /> {t('install.title')}
            </h2>
            <p>{t('welcome.installText')}</p>
            {!install.canPrompt && <p className="hint">{install.ios ? t('install.ios') : t('install.other')}</p>}
          </div>
          {install.canPrompt && (
            <button type="button" className="btn primary" onClick={() => install.install()}>
              <Icon name="download" size={18} /> {t('install.button')}
            </button>
          )}
        </section>
      )}

      <section className="landing-final">
        <h2>{t('welcome.finalTitle')}</h2>
        <button type="button" className="btn primary large" onClick={() => start('/')}>
          {t('welcome.ctaStart')} <Icon name="right" size={20} />
        </button>
      </section>

      <footer className="landing-footer">
        <p>{t('welcome.footerData')}</p>
        <p>{t('welcome.footerPrivacy')}</p>
        <a href="https://github.com/LeQuy-123/share-recipes" target="_blank" rel="noreferrer">
          GitHub
        </a>
      </footer>
    </div>
  )
}

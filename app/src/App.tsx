import { useEffect, useState } from 'react'
import { QuickSettings } from './components/QuickSettings'
import { Icon, type IconName } from './components/ui'
import { loadCatalog, loadImageIndex } from './db/catalog'
import { openDatabase } from './db/sqlite'
import { initI18n, useT } from './i18n'
import { useNewDataAvailable } from './lib/dataVersion'
import { href, useRoute } from './lib/router'
import { CookPage } from './pages/Cook'
import { ExplorePage } from './pages/Explore'
import { HomePage } from './pages/Home'
import { IngredientPage } from './pages/Ingredient'
import { PantryPage } from './pages/Pantry'
import { PlanPage } from './pages/Plan'
import { ProfilePage } from './pages/Profile'
import { RecipePage } from './pages/Recipe'
import { getUser, useUser, type Theme } from './store/user'

const TABS: { path: string; icon: IconName; key: string }[] = [
  { path: '', icon: 'home', key: 'nav.home' },
  { path: 'pantry', icon: 'fridge', key: 'nav.pantry' },
  { path: 'explore', icon: 'explore', key: 'nav.explore' },
  { path: 'plan', icon: 'calendar', key: 'nav.plan' },
  { path: 'profile', icon: 'user', key: 'nav.profile' },
]

initI18n(getUser().settings.language)

const THEME_COLORS = { light: '#faf6f0', dark: '#1a1612' }

/** Theme on <html data-theme>; 'system' removes it so the CSS media query decides. */
function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  const dark = theme === 'dark' || (theme === 'system' && window.matchMedia?.('(prefers-color-scheme: dark)').matches)
  document.querySelectorAll('meta[name="theme-color"]').forEach((m) => m.setAttribute('content', dark ? THEME_COLORS.dark : THEME_COLORS.light))
}

/** Keeps <html> (language, theme) in sync with the user's settings. */
function useAppearance() {
  const { settings } = useUser()
  useEffect(() => initI18n(settings.language), [settings.language])
  useEffect(() => {
    applyTheme(settings.theme)
    if (settings.theme !== 'system') return
    const mq = window.matchMedia?.('(prefers-color-scheme: dark)')
    const onChange = () => applyTheme('system')
    mq?.addEventListener('change', onChange)
    return () => mq?.removeEventListener('change', onChange)
  }, [settings.theme])
}

export default function App() {
  const { t } = useT()
  const [status, setStatus] = useState<'loading' | 'ready' | Error>('loading')
  useAppearance()

  useEffect(() => {
    Promise.all([openDatabase(), loadImageIndex()])
      .then(() => {
        loadCatalog()
        setStatus('ready')
      })
      .catch((e: unknown) => setStatus(e instanceof Error ? e : new Error(String(e))))
  }, [])

  if (status === 'loading') {
    return (
      <div className="splash">
        <span className="splash-icon">
          <Icon name="pot" size={36} />
        </span>
        <p>{t('app.loading')}</p>
      </div>
    )
  }
  if (status instanceof Error) {
    return (
      <div className="splash">
        <h1>{t('app.loadError')}</h1>
        <p>{status.message}</p>
        <button type="button" className="btn primary" onClick={() => window.location.reload()}>
          {t('app.retry')}
        </button>
      </div>
    )
  }
  return <Shell />
}

export function Shell() {
  const { t } = useT()
  const { path, query } = useRoute()
  const [section = '', id] = path
  const newData = useNewDataAvailable()

  if (section === 'cook' && id) {
    const s = Number(query.get('s'))
    return <CookPage id={id} servings={s > 0 ? s : null} />
  }

  let page
  switch (section) {
    case 'pantry':
      page = <PantryPage />
      break
    case 'explore':
      page = <ExplorePage />
      break
    case 'plan':
      page = <PlanPage />
      break
    case 'profile':
      page = <ProfilePage />
      break
    case 'recipe':
      page = <RecipePage key={id} id={id ?? ''} />
      break
    case 'ingredient':
      page = <IngredientPage key={id} id={id ?? ''} />
      break
    default:
      page = <HomePage />
  }

  const activeTab = section === 'recipe' || section === 'ingredient' ? null : section
  return (
    <div className="app">
      <nav className="tabbar" aria-label={t('nav.label')}>
        <a className="rail-brand" href={href('/')} aria-label="AutoRecipt">
          <img src={`${import.meta.env.BASE_URL}favicon.svg`} alt="" width={36} height={36} />
        </a>
        {TABS.map((tab) => (
          <a key={tab.path} href={href(`/${tab.path}`)} className={activeTab === tab.path ? 'active' : ''} aria-current={activeTab === tab.path ? 'page' : undefined}>
            <Icon name={tab.icon} size={22} />
            <span>{t(tab.key)}</span>
          </a>
        ))}
        <div className="rail-settings">
          <QuickSettings vertical />
        </div>
      </nav>
      <div className="app-content">
        {newData && (
          <div className="update-banner" role="status">
            <span>{t('app.newData')}</span>
            <button type="button" className="btn small primary" onClick={() => window.location.reload()}>
              {t('app.reload')}
            </button>
          </div>
        )}
        <main>{page}</main>
      </div>
    </div>
  )
}

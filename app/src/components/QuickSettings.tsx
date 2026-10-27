import { useT, type Lang } from '../i18n'
import { actions, useUser, type Theme } from '../store/user'
import { Icon, type IconName } from './ui'

const NEXT_THEME: Record<Theme, Theme> = { system: 'light', light: 'dark', dark: 'system' }
const THEME_ICON: Record<Theme, IconName> = { system: 'monitor', light: 'sun', dark: 'moon' }

/** Day/night and language switches, for page headers and the tablet side rail. */
export function QuickSettings({ vertical }: { vertical?: boolean }) {
  const { t, lang } = useT()
  const { settings } = useUser()
  const next = NEXT_THEME[settings.theme]
  const otherLang: Lang = lang === 'vi' ? 'en' : 'vi'
  return (
    <div className={`quick-settings${vertical ? ' vertical' : ''}`}>
      <button
        type="button"
        className="icon-btn"
        onClick={() => actions.setSettings({ theme: next })}
        title={t('settings.themeNow', { theme: t(`settings.theme.${settings.theme}`) })}
        aria-label={t('settings.themeSwitch', { theme: t(`settings.theme.${next}`) })}
      >
        <Icon name={THEME_ICON[settings.theme]} />
      </button>
      <button
        type="button"
        className="icon-btn lang-btn"
        onClick={() => actions.setSettings({ language: otherLang })}
        aria-label={t('settings.languageSwitch')}
        title={t('settings.languageSwitch')}
        lang={otherLang}
      >
        {otherLang.toUpperCase()}
      </button>
    </div>
  )
}

import { useRef, useState } from 'react'
import { Chip, Icon, Segmented, Toggle } from '../components/ui'
import { getCard } from '../db/catalog'
import { displayName, useT, type Lang } from '../i18n'
import { timeAgo } from '../lib/format'
import { useInstall } from '../lib/install'
import { ACTIVITY_LEVELS, bmi, bmiKey, targetsFor } from '../lib/nutrition'
import { href } from '../lib/router'
import { actions, useUser, type Profile, type Theme, type UserData } from '../store/user'

const DEFAULT_PROFILE: Profile = { sex: 'female', age: 30, weight: 55, height: 160, activity: 1.375, goal: 'keep' }

/** Number input that only saves values inside [min, max], so typing "1" on the way to "165" is fine. */
function NumberField(props: { label: string; value: number; min: number; max: number; onCommit: (v: number) => void }) {
  const [text, setText] = useState(String(props.value))
  const [shown, setShown] = useState(props.value)
  if (props.value !== shown) {
    // Value changed from outside (e.g. data restored): show it.
    setShown(props.value)
    setText(String(props.value))
  }
  return (
    <label>
      {props.label}
      <input
        type="number"
        inputMode="decimal"
        value={text}
        min={props.min}
        max={props.max}
        onChange={(e) => {
          setText(e.target.value)
          const v = Number(e.target.value)
          if (e.target.value && v >= props.min && v <= props.max) props.onCommit(v)
        }}
        onBlur={() => setText(String(props.value))}
      />
    </label>
  )
}

export function ProfilePage() {
  const { t } = useT()
  const user = useUser()
  const install = useInstall()
  const profile = user.profile ?? DEFAULT_PROFILE
  const targets = targetsFor(user.profile)
  const fileRef = useRef<HTMLInputElement>(null)
  const [importError, setImportError] = useState<string | null>(null)

  const set = (patch: Partial<Profile>) => actions.setProfile({ ...profile, ...patch })

  const exportData = () => {
    const blob = new Blob([JSON.stringify(user, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `autorecipt-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as UserData
      if (data.version !== 1 || !Array.isArray(data.pantry)) throw new Error('format')
      actions.replaceAll(data)
      setImportError(null)
    } catch {
      setImportError(t('profile.importError'))
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <div>
          <p className="eyebrow">{t('nav.profile')}</p>
          <h1>{t('profile.title')}</h1>
        </div>
        <a className="btn ghost small" href={href('/welcome')}>
          <Icon name="info" size={16} /> {t('welcome.about')}
        </a>
      </header>

      <div className="panel-grid">
        <section className="panel">
          <h2>{t('profile.appearance')}</h2>
          <div className="setting-row">
            <span>{t('settings.themeLabel')}</span>
            <Segmented<Theme>
              label={t('settings.themeLabel')}
              value={user.settings.theme}
              onChange={(theme) => actions.setSettings({ theme })}
              options={[
                { value: 'system', label: t('settings.theme.system'), icon: 'monitor' },
                { value: 'light', label: t('settings.theme.light'), icon: 'sun' },
                { value: 'dark', label: t('settings.theme.dark'), icon: 'moon' },
              ]}
            />
          </div>
          <div className="setting-row">
            <span>{t('settings.languageLabel')}</span>
            <Segmented<Lang>
              label={t('settings.languageLabel')}
              value={user.settings.language}
              onChange={(language) => actions.setSettings({ language })}
              options={[
                { value: 'vi', label: 'Tiếng Việt' },
                { value: 'en', label: 'English' },
              ]}
            />
          </div>
          <p className="hint">{t('settings.languageHint')}</p>
        </section>

        {!install.installed && (
          <section className="panel install-panel">
            <h2>
              <Icon name="download" size={18} /> {t('install.title')}
            </h2>
            <p className="muted">{t('install.text')}</p>
            {install.canPrompt ? (
              <button type="button" className="btn primary" onClick={() => install.install()}>
                <Icon name="download" size={18} /> {t('install.button')}
              </button>
            ) : install.ios ? (
              <p className="hint">{t('install.ios')}</p>
            ) : (
              <p className="hint">{t('install.other')}</p>
            )}
          </section>
        )}

        <section className="panel">
          <h2>{t('profile.body')}</h2>
          <p className="hint">{t('profile.bodyHint')}</p>
          <div className="chips">
            <Chip active={profile.sex === 'female'} onClick={() => set({ sex: 'female' })}>
              {t('profile.female')}
            </Chip>
            <Chip active={profile.sex === 'male'} onClick={() => set({ sex: 'male' })}>
              {t('profile.male')}
            </Chip>
          </div>
          <div className="form-grid">
            <NumberField label={t('profile.age')} value={profile.age} min={10} max={100} onCommit={(v) => set({ age: v })} />
            <NumberField label={t('profile.height')} value={profile.height} min={100} max={220} onCommit={(v) => set({ height: v })} />
            <NumberField label={t('profile.weight')} value={profile.weight} min={25} max={200} onCommit={(v) => set({ weight: v })} />
          </div>
          <label className="field">
            {t('profile.activityLabel')}
            <select value={profile.activity} onChange={(e) => set({ activity: Number(e.target.value) })}>
              {ACTIVITY_LEVELS.map((a) => (
                <option key={a} value={a}>
                  {t(`profile.activity.${String(a).replace('.', '_')}`)}
                </option>
              ))}
            </select>
          </label>
          <div className="chips">
            {(['lose', 'keep', 'gain'] as const).map((g) => (
              <Chip key={g} active={profile.goal === g} onClick={() => set({ goal: g })}>
                {t(`profile.goal.${g}`)}
              </Chip>
            ))}
          </div>
          {user.profile ? (
            <div className="target-box">
              <p>
                BMI <strong>{bmi(profile).toFixed(1)}</strong> · {t(`bmi.${bmiKey(bmi(profile))}`)}
              </p>
              <p className="big">
                <strong>{targets.kcal}</strong> {t('profile.kcalPerDay')}
              </p>
              <p className="muted">
                {t('profile.targets', { protein: targets.protein_g, fat: targets.fat_g, carbs: targets.carbs_g, veg: targets.veg_g })}
              </p>
            </div>
          ) : (
            <button type="button" className="btn primary block" onClick={() => actions.setProfile(profile)}>
              {t('profile.calculate')}
            </button>
          )}
        </section>

        <section className="panel">
          <h2>{t('profile.suggestions')}</h2>
          <Toggle
            checked={user.settings.no_repeat_enabled}
            onChange={(v) => actions.setSettings({ no_repeat_enabled: v })}
            label={t('noRepeat.label')}
            hint={t('noRepeat.hint')}
          />
          <div className="chips">
            {[3, 5, 7, 14, 30].map((d) => (
              <Chip key={d} active={user.settings.no_repeat_days === d} onClick={() => actions.setSettings({ no_repeat_days: d, no_repeat_enabled: true })}>
                {t('profile.days', { count: d })}
              </Chip>
            ))}
          </div>
          <Toggle checked={false} disabled onChange={() => {}} label={t('profile.cloudScan')} hint={t('profile.cloudScanHint')} />
        </section>

        <section className="panel">
          <h2>{t('profile.history')}</h2>
          {user.cooked.length === 0 && <p className="muted">{t('profile.historyEmpty')}</p>}
          <ul className="history">
            {user.cooked.slice(0, 15).map((c) => {
              const card = getCard(c.recipe_id)
              return (
                <li key={c.at}>
                  <a href={href(`/recipe/${c.recipe_id}`)}>{card ? displayName(card) : c.recipe_id}</a>
                  <span className="muted">{timeAgo(c.at)}</span>
                  <button type="button" className="icon-btn" onClick={() => actions.removeCooked(c.at)} aria-label={t('profile.removeHistory')}>
                    <Icon name="x" size={16} />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>

        <section className="panel">
          <h2>{t('profile.data')}</h2>
          <p className="hint">{t('profile.dataHint')}</p>
          <div className="actions">
            <button type="button" className="btn" onClick={exportData}>
              {t('profile.backup')}
            </button>
            <button type="button" className="btn" onClick={() => fileRef.current?.click()}>
              {t('profile.restore')}
            </button>
            <button type="button" className="btn danger" onClick={() => window.confirm(t('profile.resetConfirm')) && actions.resetAll()}>
              {t('profile.reset')}
            </button>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) importData(f)
              e.target.value = ''
            }}
          />
          {importError && <p className="error">{importError}</p>}
        </section>
      </div>
      <p className="hint center">{t('profile.footer')}</p>
    </div>
  )
}

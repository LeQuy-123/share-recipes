import { useEffect, useMemo, useRef, useState } from 'react'
import { Icon } from '../components/ui'
import { getLookups, getRecipeDetail, label, type RecipeLine } from '../db/catalog'
import { displayName, useT } from '../i18n'
import { formatAmount } from '../lib/format'
import { href, navigate } from '../lib/router'
import { actions, useUser } from '../store/user'

/** Step-by-step cooking: one step per screen, big text, a timer for timed steps. */
export function CookPage({ id, servings }: { id: string; servings: number | null }) {
  const { t, lang } = useT()
  const detail = useMemo(() => getRecipeDetail(id), [id])
  const user = useUser()
  const [index, setIndex] = useState(0)
  const { stepTypes } = getLookups()
  useWakeLock()

  const steps = detail?.steps ?? []
  const total = steps.length
  const finished = index >= total
  const go = (i: number) => setIndex(Math.max(0, Math.min(total, i)))

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') setIndex((i) => Math.min(total, i + 1))
      if (e.key === 'ArrowLeft') setIndex((i) => Math.max(0, i - 1))
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [total])

  const touchX = useRef<number | null>(null)

  if (!detail) {
    return (
      <div className="page">
        <p>{t('recipe.notFound')}</p>
        <a href={href('/explore')}>{t('recipe.findOther')}</a>
      </div>
    )
  }

  const scale = (servings ?? detail.card.servings) / (detail.card.servings || 1)
  const step = steps[index]
  const stepLines = step ? detail.lines.filter((l) => step.ingredient_ids.includes(l.ingredient_id)) : []

  return (
    <div
      className="cook"
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null) return
        const dx = e.changedTouches[0].clientX - touchX.current
        if (Math.abs(dx) > 70) go(index + (dx < 0 ? 1 : -1))
        touchX.current = null
      }}
    >
      <header className="cook-head">
        <a className="icon-btn" href={href(`/recipe/${id}`)} aria-label={t('cook.exit')}>
          <Icon name="x" />
        </a>
        <div className="cook-title">
          <small>{displayName(detail.card)}</small>
          <strong>{finished ? t('cook.done') : t('cook.stepOf', { n: index + 1, total })}</strong>
        </div>
        <span className="icon-btn" aria-hidden="true" />
      </header>
      <div className="cook-progress" aria-hidden="true">
        {steps.map((s, i) => (
          <button key={s.id} type="button" className={i < index ? 'done' : i === index ? 'now' : ''} onClick={() => go(i)} tabIndex={-1} />
        ))}
      </div>

      {!finished && step && (
        <main className="cook-step" key={step.id}>
          <div className="cook-text-col">
            <p className={`step-type t-${step.type_id}`}>{label(stepTypes, step.type_id)}</p>
            {step.title && <h1>{step.title}</h1>}
            <p className="cook-text" lang="vi">
              {step.text}
            </p>
            {lang === 'en' && <p className="hint">{t('recipe.viOnly')}</p>}
            {step.tip && (
              <p className="tip">
                <Icon name="info" size={16} /> {step.tip}
              </p>
            )}
          </div>
          <div className="cook-side-col">
            {stepLines.length > 0 && <StepIngredients lines={stepLines} scale={scale} />}
            {step.duration_min ? <StepTimer key={step.id} minutes={step.duration_min} passive={step.passive} /> : null}
          </div>
        </main>
      )}

      {finished && <FinishScreen recipeId={id} lines={detail.lines} pantry={new Set(user.pantry.map((p) => p.id))} />}

      <footer className="cook-nav">
        <button type="button" className="btn" onClick={() => go(index - 1)} disabled={index === 0}>
          <Icon name="left" /> {t('cook.prev')}
        </button>
        {!finished && (
          <button type="button" className="btn primary" onClick={() => go(index + 1)}>
            {index === total - 1 ? t('cook.finish') : t('cook.next')} <Icon name="right" />
          </button>
        )}
      </footer>
    </div>
  )
}

function StepIngredients({ lines, scale }: { lines: RecipeLine[]; scale: number }) {
  return (
    <ul className="cook-ings">
      {lines.map((l) => (
        <li key={l.id}>
          <span>{displayName(l)}</span>
          <strong>{formatAmount(l.amount, l.unit_id, scale)}</strong>
        </li>
      ))}
    </ul>
  )
}

function FinishScreen(props: { recipeId: string; lines: RecipeLine[]; pantry: Set<string> }) {
  const { t } = useT()
  const used = props.lines.filter((l) => !l.pantry_staple && props.pantry.has(l.ingredient_id))
  const [usedUp, setUsedUp] = useState<Set<string>>(new Set())
  const toggle = (id: string) => {
    const next = new Set(usedUp)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setUsedUp(next)
  }
  return (
    <main className="cook-step finish">
      <span className="finish-icon">
        <Icon name="check" size={40} />
      </span>
      <h1>{t('cook.finishedTitle')}</h1>
      {used.length > 0 && (
        <>
          <p>{t('cook.usedUpQuestion')}</p>
          <ul className="check-list">
            {used.map((l) => (
              <li key={l.ingredient_id}>
                <label>
                  <input type="checkbox" checked={usedUp.has(l.ingredient_id)} onChange={() => toggle(l.ingredient_id)} />
                  {displayName(l)}
                </label>
              </li>
            ))}
          </ul>
        </>
      )}
      <button
        type="button"
        className="btn primary block"
        onClick={() => {
          actions.markCooked(props.recipeId)
          if (usedUp.size) actions.removeFromPantry([...usedUp])
          navigate(`/recipe/${props.recipeId}`)
        }}
      >
        {t('cook.saveCooked')}
      </button>
    </main>
  )
}

function StepTimer({ minutes, passive }: { minutes: number; passive: boolean }) {
  const { t } = useT()
  const full = minutes * 60
  // While running, the end time is kept rather than a countdown: phones pause timers when the
  // screen locks, and the clock catches up when the page is back.
  const [endsAt, setEndsAt] = useState<number | null>(null)
  const [left, setLeft] = useState(full)
  const running = endsAt !== null

  useEffect(() => {
    if (endsAt === null) return
    const tick = () => {
      const s = Math.max(0, Math.ceil((endsAt - Date.now()) / 1000))
      setLeft(s)
      if (s === 0) {
        setEndsAt(null)
        alarm()
      }
    }
    tick()
    const timer = window.setInterval(tick, 250)
    document.addEventListener('visibilitychange', tick)
    return () => {
      window.clearInterval(timer)
      document.removeEventListener('visibilitychange', tick)
    }
  }, [endsAt])

  const start = (seconds: number) => {
    unlockAudio()
    setLeft(seconds)
    setEndsAt(Date.now() + seconds * 1000)
  }
  const pause = () => setEndsAt(null)

  const mm = String(Math.floor(left / 60)).padStart(2, '0')
  const ss = String(left % 60).padStart(2, '0')
  const atStart = left === full && !running
  return (
    <div className={`timer${left === 0 ? ' done' : ''}${running ? ' running' : ''}`}>
      <span className="timer-label">{passive ? t('cook.waitTime', { count: minutes }) : t('cook.about', { count: minutes })}</span>
      <span className="timer-clock" role="timer" aria-live={left === 0 ? 'assertive' : 'off'}>
        {left === 0 ? t('cook.timeUp') : `${mm}:${ss}`}
      </span>
      <div className="timer-buttons">
        <button type="button" className="btn primary" onClick={() => (running ? pause() : start(left === 0 ? full : left))}>
          <Icon name={running ? 'pause' : 'play'} size={18} />{' '}
          {running ? t('cook.pause') : atStart ? t('cook.startTimer') : left === 0 ? t('cook.again') : t('cook.resume')}
        </button>
        {!atStart && (
          <button
            type="button"
            className="btn"
            onClick={() => {
              pause()
              setLeft(full)
            }}
            aria-label={t('cook.reset')}
          >
            <Icon name="refresh" size={18} />
          </button>
        )}
      </div>
    </div>
  )
}

// One audio context for the page. iPhone Safari only lets it make sound once it has been
// created or resumed during a tap, so the timer's Start button unlocks it.
let audio: AudioContext | null = null
function unlockAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    audio ??= new Ctx()
    if (audio.state === 'suspended') audio.resume().catch(() => {})
  } catch {
    audio = null
  }
}

function alarm() {
  navigator.vibrate?.([300, 150, 300, 150, 300])
  try {
    const ctx = audio
    if (!ctx) return
    ;[0, 0.4, 0.8].forEach((at) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.frequency.value = 880
      gain.gain.setValueAtTime(0.25, ctx.currentTime + at)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + at + 0.3)
      osc.connect(gain).connect(ctx.destination)
      osc.start(ctx.currentTime + at)
      osc.stop(ctx.currentTime + at + 0.3)
    })
  } catch {
    // No audio available; vibration (if any) is enough.
  }
}

/** Keep the screen on while cooking, where the browser allows it. */
function useWakeLock() {
  useEffect(() => {
    let lock: WakeLockSentinel | null = null
    const request = () => {
      navigator.wakeLock
        ?.request('screen')
        .then((l) => (lock = l))
        .catch(() => {})
    }
    request()
    const onVisible = () => document.visibilityState === 'visible' && request()
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      document.removeEventListener('visibilitychange', onVisible)
      lock?.release().catch(() => {})
    }
  }, [])
}

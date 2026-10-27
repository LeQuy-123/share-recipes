// "Install app" (PWA). Chrome/Edge/Android fire beforeinstallprompt, which we keep to show
// our own button; iOS Safari has no prompt, so the UI explains Share -> Add to Home Screen.
import { useSyncExternalStore } from 'react'

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

let deferred: InstallPromptEvent | null = null
let installed = false
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

/** Call once at startup, before the browser fires the event. */
export function listenForInstall() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as InstallPromptEvent
    emit()
  })
  window.addEventListener('appinstalled', () => {
    installed = true
    deferred = null
    emit()
  })
}

export const isStandalone = () =>
  typeof window !== 'undefined' &&
  (window.matchMedia?.('(display-mode: standalone)').matches || (navigator as Navigator & { standalone?: boolean }).standalone === true)

const isIOS = () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent)

let snapshot = { canPrompt: false, installed: false, ios: false }
function getSnapshot() {
  const next = { canPrompt: !!deferred, installed: installed || isStandalone(), ios: isIOS() }
  if (next.canPrompt !== snapshot.canPrompt || next.installed !== snapshot.installed || next.ios !== snapshot.ios) snapshot = next
  return snapshot
}

export function useInstall() {
  const state = useSyncExternalStore((cb) => {
    listeners.add(cb)
    return () => listeners.delete(cb)
  }, getSnapshot)
  return {
    ...state,
    async install() {
      if (!deferred) return false
      await deferred.prompt()
      const { outcome } = await deferred.userChoice
      deferred = null
      emit()
      return outcome === 'accepted'
    },
  }
}

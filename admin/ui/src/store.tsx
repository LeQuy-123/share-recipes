import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { api, errorText } from './api'
import type { AppState, LookupRow } from './types'

interface Toast {
  id: number
  kind: 'ok' | 'error'
  text: string
}

interface Store {
  state: AppState | null
  error: string | null
  reload: () => Promise<void>
  toast: (text: string, kind?: Toast['kind']) => void
  toasts: Toast[]
  dismiss: (id: number) => void
  /** label for a lookup code, e.g. label('cuisines', 'korean') -> 'Món Hàn' */
  label: (table: string, id: string | number | null | undefined) => string
  rows: (table: string) => LookupRow[]
  ingredientName: (id: string) => string
}

const Ctx = createContext<Store | null>(null)

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AppState | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])

  const reload = useCallback(async () => {
    try {
      setState(await api.state())
      setError(null)
    } catch (e) {
      setError(errorText(e))
    }
  }, [])

  useEffect(() => {
    reload()
  }, [reload])

  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback(
    (text: string, kind: Toast['kind'] = 'ok') => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, kind, text }])
      if (kind === 'ok') setTimeout(() => dismiss(id), 3500)
    },
    [dismiss],
  )

  const value = useMemo<Store>(() => {
    const names = new Map(state?.ingredients.map((i) => [i.id, i.name_vi]))
    return {
      state,
      error,
      reload,
      toast,
      toasts,
      dismiss,
      rows: (table) => state?.lookups[table] ?? [],
      label: (table, id) => {
        if (id === null || id === undefined || id === '') return '—'
        const row = state?.lookups[table]?.find((r) => r.id === id)
        return (row?.name_vi as string) || String(id)
      },
      ingredientName: (id) => names.get(id) ?? id,
    }
  }, [state, error, reload, toast, toasts, dismiss])

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>
}

export function useStore(): Store {
  const s = useContext(Ctx)
  if (!s) throw new Error('StoreProvider missing')
  return s
}

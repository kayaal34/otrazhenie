import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import { checkIsAdmin } from '../lib/adminAuth'

export type AdminSessionState = {
  loading: boolean
  session: Session | null
  isAdmin: boolean
}

export function useAdminSession(): AdminSessionState {
  const [state, setState] = useState<AdminSessionState>({
    loading: true,
    session: null,
    isAdmin: false,
  })

  useEffect(() => {
    let cancelled = false

    async function resolveSession(session: Session | null) {
      if (!session) {
        if (!cancelled) setState({ loading: false, session: null, isAdmin: false })
        return
      }
      const isAdmin = await checkIsAdmin()
      if (!cancelled) setState({ loading: false, session, isAdmin })
    }

    supabase.auth.getSession().then(({ data }) => resolveSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setState((prev) => ({ ...prev, loading: true }))
      resolveSession(session)
    })

    return () => {
      cancelled = true
      listener.subscription.unsubscribe()
    }
  }, [])

  return state
}

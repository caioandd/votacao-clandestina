import { createDemoAdapter } from './demo'
import { createSupabaseAdapter } from './supabase'
import type { DataAdapter } from '../types'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

export const isSupabaseConfigured = Boolean(url && anonKey)

/**
 * Com as variáveis de ambiente configuradas o app fala com o Supabase.
 * Sem elas, cai no modo demonstração (localStorage) para desenvolvimento.
 */
export const data: DataAdapter = isSupabaseConfigured
  ? createSupabaseAdapter(url as string, anonKey as string)
  : createDemoAdapter()

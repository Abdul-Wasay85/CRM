import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { supabase } from '../lib/supabase'

type OrganizationContextType = {
  userId: string | null
  organizationId: string | null
  organizationName: string
  role: string | null
  loading: boolean
  error: string
  refreshOrganization: () => Promise<void>
}

const OrganizationContext =
  createContext<OrganizationContextType | undefined>(
    undefined
  )

export function OrganizationProvider({
  children,
}: {
  children: ReactNode
}) {
  const [userId, setUserId] = useState<string | null>(
    null
  )

  const [organizationId, setOrganizationId] =
    useState<string | null>(null)

  const [organizationName, setOrganizationName] =
    useState('My Organization')

  const [role, setRole] = useState<string | null>(
    null
  )

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadOrganization() {
    try {
      setLoading(true)
      setError('')

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError) {
        throw userError
      }

      if (!user) {
        setUserId(null)
        setOrganizationId(null)
        setOrganizationName('My Organization')
        setRole(null)
        return
      }

      setUserId(user.id)

      const { data: membership, error: membershipError } =
        await supabase
          .from('organization_members')
          .select(`
            organization_id,
            role
          `)
          .eq('user_id', user.id)
          .limit(1)
          .maybeSingle()

      if (membershipError) {
        throw membershipError
      }

      if (!membership) {
        throw new Error(
          'No organization found for this account'
        )
      }

      setOrganizationId(membership.organization_id)
      setRole(membership.role)

      const {
        data: organization,
        error: organizationError,
      } = await supabase
        .from('organizations')
        .select('name')
        .eq('id', membership.organization_id)
        .maybeSingle()

      if (organizationError) {
        throw organizationError
      }

      setOrganizationName(
        organization?.name || 'My Organization'
      )
    } catch (error) {
      console.error(
        'Error loading organization:',
        error
      )

      if (error instanceof Error) {
        setError(error.message)
      } else {
        setError('Failed to load organization')
      }

      setOrganizationId(null)
      setRole(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrganization()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!session) {
          setUserId(null)
          setOrganizationId(null)
          setOrganizationName('My Organization')
          setRole(null)
          setLoading(false)
        } else {
          loadOrganization()
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return (
    <OrganizationContext.Provider
      value={{
        userId,
        organizationId,
        organizationName,
        role,
        loading,
        error,
        refreshOrganization: loadOrganization,
      }}
    >
      {children}
    </OrganizationContext.Provider>
  )
}

export function useOrganization() {
  const context = useContext(
    OrganizationContext
  )

  if (!context) {
    throw new Error(
      'useOrganization must be used inside OrganizationProvider'
    )
  }

  return context
}
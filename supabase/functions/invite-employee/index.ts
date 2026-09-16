import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods':
    'POST, OPTIONS',
}

const allowedRoles = [
  'admin',
  'manager',
  'sales',
  'employee',
]

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!
const supabaseServiceRoleKey =
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

const supabaseAdmin = createClient(
  supabaseUrl,
  supabaseServiceRoleKey,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
)

export default {
  async fetch(req: Request) {
    if (req.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: corsHeaders,
      })
    }

    try {
      /*
       * Get Authorization header
       */
      const authorization =
        req.headers.get('Authorization')

      if (!authorization) {
        return new Response(
          JSON.stringify({
            error: 'Missing authorization header',
          }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }

      /*
       * Extract Bearer token
       */
      const token = authorization.replace(
        /^Bearer\s+/i,
        ''
      )

      if (!token) {
        return new Response(
          JSON.stringify({
            error: 'Invalid authorization header',
          }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }

      /*
       * Verify the user's JWT
       */
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser(token)

      if (userError || !user) {
        console.error(
          'JWT verification failed:',
          userError
        )

        return new Response(
          JSON.stringify({
            error: 'Not authenticated',
          }),
          {
            status: 401,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }

      console.log(
        'Authenticated user:',
        user.id
      )

      /*
       * Parse request body
       */
      const body = await req.json()

      const {
        email,
        full_name,
        role,
      } = body

      /*
       * Validate email
       */
      if (
        !email ||
        typeof email !== 'string'
      ) {
        return new Response(
          JSON.stringify({
            error:
              'Employee email is required',
          }),
          {
            status: 400,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }

      const normalizedEmail =
        email.trim().toLowerCase()

      /*
       * Validate role
       */
      const employeeRole =
        typeof role === 'string' &&
        allowedRoles.includes(
          role.toLowerCase()
        )
          ? role.toLowerCase()
          : 'employee'

      /*
       * Get current user's organization membership
       */
     const {
  data: membership,
  error: membershipError,
} = await supabaseAdmin
  .from('organization_members')
  .select(`
    organization_id,
    role
  `)
  .eq('user_id', user.id)
  .limit(1)
  .maybeSingle()
        .select(`
          organization_id,
          role
        `)
        .eq('user_id', user.id)
        .limit(1)
        .maybeSingle()

      if (membershipError) {
        console.error(
          'Membership error:',
          membershipError
        )

        throw membershipError
      }

      if (!membership) {
        return new Response(
          JSON.stringify({
            error:
              'You are not a member of an organization',
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }

      /*
       * Only owners and admins can invite
       */
      const currentRole =
        membership.role?.toLowerCase()

      if (
        currentRole !== 'owner' &&
        currentRole !== 'admin'
      ) {
        return new Response(
          JSON.stringify({
            error:
              'Only organization owners and admins can invite employees',
          }),
          {
            status: 403,
            headers: {
              ...corsHeaders,
              'Content-Type': 'application/json',
            },
          }
        )
      }

      /*
       * Get organization
       */
      const {
  data: organization,
  error: organizationError,
} = await supabaseAdmin
  .from('organizations')
  .select('name')
  .eq(
    'id',
    membership.organization_id
  )
  .maybeSingle()
        .select('name')
        .eq(
          'id',
          membership.organization_id
        )
        .maybeSingle()

      if (organizationError) {
        console.error(
          'Organization error:',
          organizationError
        )

        throw organizationError
      }

      /*
       * Send invitation using Admin API
       */
      const {
        data: invitedUser,
        error: inviteError,
      } =
        await supabaseAdmin.auth.admin
          .inviteUserByEmail(
            normalizedEmail,
            {
              data: {
                full_name:
                  typeof full_name === 'string'
                    ? full_name.trim()
                    : normalizedEmail.split('@')[0],

                organization_id:
                  membership.organization_id,

                organization_role:
                  employeeRole,

                organization_name:
                  organization?.name ||
                  'My Organization',
              },

              redirectTo:
                'http://localhost:5173/login',
            }
          )

      if (inviteError) {
        console.error(
          'Invitation error:',
          inviteError
        )

        throw inviteError
      }

      return new Response(
        JSON.stringify({
          success: true,
          message:
            'Employee invitation sent successfully',
          user_id:
            invitedUser.user?.id ?? null,
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      )
    } catch (error) {
      console.error(
        'Invite employee error:',
        error
      )

      return new Response(
        JSON.stringify({
          error:
            error instanceof Error
              ? error.message
              : 'Failed to invite employee',
        }),
        {
          status: 500,
          headers: {
            ...corsHeaders,
            'Content-Type':
              'application/json',
          },
        }
      )
    }
  },
}
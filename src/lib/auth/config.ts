import NextAuth from 'next-auth';
import type { NextAuthConfig } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { getDb } from '@/lib/db/config';
import type { User, Role } from '@/types/database';

declare module 'next-auth' {
  interface User {
    id: string;
    email: string;
    displayName: string;
    roles: string[];
    permissions: string[];
  }

  interface Session {
    user: {
      id: string;
      email: string;
      name: string;
      image?: string;
      roles: string[];
      permissions: string[];
    };
  }
}

async function getUserWithRoles(email: string): Promise<{
  user: User;
  roles: Role[];
} | null> {
  const db = getDb();

  const user = await db<User>('users')
    .where('email', email)
    .where('is_active', true)
    .first();

  if (!user) return null;

  const roles = await db<Role>('roles')
    .join('user_roles', 'roles.id', 'user_roles.role_id')
    .where('user_roles.user_id', user.id)
    .select('roles.*');

  return { user, roles };
}

const authConfig: NextAuthConfig = {
  providers: [
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const result = await getUserWithRoles(email);
        if (!result) return null;

        const { user, roles } = result;

        const isValidPassword = await bcrypt.compare(password, user.password_hash);
        if (!isValidPassword) return null;

        // Aggregate permissions from all roles
        const permissions = roles.flatMap((role) => {
          try {
            return JSON.parse(role.permissions);
          } catch {
            return [];
          }
        });

        return {
          id: user.id,
          email: user.email,
          displayName: user.display_name,
          roles: roles.map((r) => r.name),
          permissions: Array.from(new Set(permissions)),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.email = user.email!;
        token.displayName = user.displayName;
        token.roles = user.roles;
        token.permissions = user.permissions;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.id as string;
      session.user.email = token.email as string;
      session.user.name = token.displayName as string;
      session.user.roles = (token.roles as string[]) ?? [];
      session.user.permissions = (token.permissions as string[]) ?? [];
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  trustHost: true,
};

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

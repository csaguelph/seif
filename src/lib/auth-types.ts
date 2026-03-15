/** Session shape from auth.api.getSession() - use for props passed to client components */
export interface AuthSession {
  user: {
    id: string;
    name: string;
    email: string;
    image?: string | null;
    emailVerified: boolean;
    role?: string;
  };
  session: {
    id: string;
    userId: string;
    token: string;
    expiresAt: Date;
  };
}

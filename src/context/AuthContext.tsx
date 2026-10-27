import React, { createContext, useContext, useState, useEffect } from 'react';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  phone?: string;
  country: string;
  city: string;
  avatarUrl?: string;
  preferredLanguage: 'fr' | 'en';
  role: 'superadmin' | 'user';
  status: 'active' | 'suspended';
  emailVerified: boolean;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  planId: string;
  status: 'trialing' | 'active' | 'expired' | 'canceled';
  startDate: string;
  trialEndsAt?: string;
  currentPeriodEnd: string;
  autoRenew: boolean;
  paymentMethod?: string;
}

export interface SubscriptionPlan {
  id: string;
  key: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  billingPeriod: string;
  trialDays: number;
  maxAgents: number;
  maxPagesPerAgent: number;
  maxPostsPerWeek: number;
  maxPostsPerDay: number;
  canEditVisualPrompt: boolean;
  canEditProposals: boolean;
  canDeepCustomize: boolean;
  aiTokenMonthlyQuota: number;
  isActive: boolean;
}

export interface SubscriptionUsage {
  id: string;
  userId: string;
  postsCreatedCount: number;
  postsPublishedCount: number;
  aiTokensUsed: number;
  estimatedAiCostEur: number;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  subscription: Subscription | null;
  plan: SubscriptionPlan | null;
  usage: SubscriptionUsage | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (data: any) => Promise<{ success: boolean; error?: string }>;
  logout: () => Promise<void>;
  refreshMe: () => Promise<void>;
  quickLogin: (type: 'admin' | 'demo') => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('metacolab_token'));
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [plan, setPlan] = useState<SubscriptionPlan | null>(null);
  const [usage, setUsage] = useState<SubscriptionUsage | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshMe = async () => {
    const currentToken = token || localStorage.getItem('metacolab_token');
    if (!currentToken) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await fetch('/api/auth/me', {
        headers: { Authorization: `Bearer ${currentToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        setSubscription(data.subscription);
        setPlan(data.plan);
        setUsage(data.usage);
      } else {
        localStorage.removeItem('metacolab_token');
        setToken(null);
        setUser(null);
      }
    } catch (err) {
      console.error('Failed to fetch current user session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const initialToken = localStorage.getItem('metacolab_token');
    if (!initialToken) {
      setUser(null);
      setToken(null);
      setSubscription(null);
      setPlan(null);
      setUsage(null);
      setIsLoading(false);
      return;
    } else {
      refreshMe();
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Identifiants invalides' };
      }

      localStorage.setItem('metacolab_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setSubscription(data.subscription);
      setPlan(data.plan);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur réseau' };
    }
  };

  const register = async (formData: any) => {
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Erreur lors de l’inscription' };
      }

      localStorage.setItem('metacolab_token', data.token);
      setToken(data.token);
      setUser(data.user);
      setPlan(data.plan);
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || 'Erreur réseau' };
    }
  };

  const logout = async () => {
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (err) {
        console.error(err);
      }
    }
    localStorage.removeItem('metacolab_token');
    setToken(null);
    setUser(null);
    setSubscription(null);
    setPlan(null);
  };

  const quickLogin = async (type: 'admin' | 'demo') => {
    setIsLoading(true);
    if (type === 'admin') {
      await login('admin@metacolab.io', 'AdminMetaColab2026!');
    } else {
      await login('demo@metacolab.io', 'DemoUser2026!');
    }
    setIsLoading(false);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        subscription,
        plan,
        usage,
        isLoading,
        login,
        register,
        logout,
        refreshMe,
        quickLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
};

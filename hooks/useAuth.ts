import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../services/supabase';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const resolveSignUpRedirectTo = () => {
    if (import.meta.env.DEV) {
      return 'http://localhost:3000/';
    }

    if (typeof window !== 'undefined' && window.location.origin) {
      return `${window.location.origin}/`;
    }

    return 'http://localhost:3000/';
  };

  useEffect(() => {
    let isMounted = true;

    const initializeSession = async () => {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        console.error('Failed to load session', error.message);
      }

      if (!isMounted) return;

      const currentUser = data.session?.user ?? null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setLoading(false);
    };

    initializeSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const currentUser = session?.user ?? null;
      setUser(currentUser);
      setIsAuthenticated(!!currentUser);
      setLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const login = async (email: string, passwordInput: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: passwordInput
      });

      if (error) {
        throw new Error(error.message);
      }

      return { email };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
      console.error('Login failed', errorMessage);
      throw error;
    }
  };

  const onSignUp = async (email: string, passwordInput: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password: passwordInput,
        options: {
          emailRedirectTo: resolveSignUpRedirectTo()
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      const currentUser = data.session?.user ?? null;
      if (currentUser) {
        setUser(currentUser);
        setIsAuthenticated(true);
        setLoading(false);
      }

      return data;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
      console.error('Sign up failed', errorMessage);
      throw error;
    }
  };

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw new Error(error.message);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown authentication error';
      console.error('Logout failed', errorMessage);
    }
  };

  return {
    isAuthenticated,
    user,
    loading,
    login,
    onSignUp,
    logout
  };
};

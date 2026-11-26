import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../supabase';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Get current user (if already logged in)
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const loginWithMagicLink = async (email) => {
    const { data, error } = await supabase.functions.invoke('email-login', {
      body: { action: 'send', email },
    });
    if (error) throw error;
    return data;
  };

  const verifyMagicLink = async (email, code) => {
    const { data, error } = await supabase.functions.invoke('email-login', {
      body: { action: 'verify', email, code },
    });
    if (error) throw error;
    const { token_hash, type } = data;
    const { error: verifyError } = await supabase.auth.verifyOtp({ token_hash, type });
    if (verifyError) throw verifyError;
    // onAuthStateChange will update `user`
    return supabase.auth.getUser();
  };

  const logout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loginWithMagicLink, verifyMagicLink, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);

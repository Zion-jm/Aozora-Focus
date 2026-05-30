import React, { createContext, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import { User, useGetMe, setAuthTokenGetter, getGetMeQueryKey } from "@workspace/api-client-react";

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  isAuthenticated: boolean;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const { data: meData, error: meError, refetch: refetchMe } = useGetMe({
    query: {
      enabled: false,
    }
  });

  useEffect(() => {
    // Only fetch me if we have a token
    if (token) {
      refetchMe().then((res) => {
        if (res.data) {
          setUser(res.data);
        } else {
          logout();
        }
      });
    }
  }, [token, refetchMe]);

  useEffect(() => {
    setAuthTokenGetter(() => {
      return token;
    });
  }, [token]);

  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await AsyncStorage.getItem("auth_token");
        if (storedToken) {
          setToken(storedToken);
        } else {
          setIsLoading(false);
        }
      } catch (err) {
        setIsLoading(false);
      }
    };
    loadToken();
  }, []);

  useEffect(() => {
    if (token && (meData || meError)) {
      setIsLoading(false);
    }
  }, [token, meData, meError]);

  const login = async (newToken: string, newUser: User) => {
    try {
      await AsyncStorage.setItem("auth_token", newToken);
      setToken(newToken);
      setUser(newUser);
    } catch (e) {
      console.error(e);
    }
  };

  const logout = async () => {
    try {
      await AsyncStorage.removeItem("auth_token");
      setToken(null);
      setUser(null);
      queryClient.clear();
    } catch (e) {
      console.error(e);
    }
  };

  const updateUser = (updatedUser: User) => {
    setUser(updatedUser);

    queryClient.setQueryData(getGetMeQueryKey(), updatedUser);

    queryClient.setQueriesData(
      {
        predicate: (query) =>
          typeof query.queryKey[0] === "string" &&
          /^\/api\/dorms\/\d+$/.test(query.queryKey[0] as string),
      },
      (old: any) => {
        if (!old || old.owner?.id !== updatedUser.id) return old;
        return {
          ...old,
          owner: {
            ...old.owner,
            fullName: updatedUser.fullName,
            avatarUrl: updatedUser.avatarUrl ?? null,
          },
        };
      }
    );

    queryClient.setQueriesData(
      { queryKey: ["/api/conversations"] },
      (old: any) => {
        if (!old?.conversations) return old;
        return {
          ...old,
          conversations: old.conversations.map((conv: any) =>
            conv.otherParticipant?.id === updatedUser.id
              ? {
                  ...conv,
                  otherParticipant: {
                    ...conv.otherParticipant,
                    fullName: updatedUser.fullName,
                    avatarUrl: updatedUser.avatarUrl ?? null,
                  },
                }
              : conv
          ),
        };
      }
    );

    queryClient.invalidateQueries();
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, updateUser, isAuthenticated: !!user, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
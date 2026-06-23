import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type User = {
    name: string;
    email: string;
    attendedSessions: number;
};

interface AuthContextType {
    user: User;
    updateUser: (data: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultUser: User = {
    name: 'Enzhe Shaikhutdinova',
    email: 'e.shaikhutdinova@innopolis.university',
    attendedSessions: 47,
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User>(defaultUser);

    const updateUser = (data: Partial<User>) =>
        setUser((prev) => ({ ...prev, ...data }));

    return (
        <AuthContext.Provider value={{ user, updateUser }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
};
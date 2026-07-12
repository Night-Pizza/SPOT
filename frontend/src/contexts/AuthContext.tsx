import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { getCurrentUser } from '../api/User';
import type { UserDTO } from '../types/Authentification';
import { startAuthentication } from '@simplewebauthn/browser';
import { getAssertionOptions, verifyAssertion } from '../api/WebAuth';

export type User = {
    id: number | null;
    email: string;
    attendedSessions: number;
    faceRegistered: boolean;
    webauthRegistered: boolean;
};

interface AuthContextType {
    user: User;
    loading: boolean;
    error: string | null;
    updateUser: (data: Partial<User>) => void;
    setAuthenticatedUser: (data: UserDTO) => void;
    refreshCurrentUser: () => Promise<void>;
    isWebauthVerified: boolean;
    verifyWebauth: () => Promise<boolean>;
    markWebauthVerified: () => void;
    clearWebauthVerification: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const defaultUser: User = {
    id: null,
    email: '',
    attendedSessions: 0,
    faceRegistered: false,
    webauthRegistered: false,
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User>(defaultUser);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isWebauthVerified, setIsWebauthVerified] = useState<boolean>(() => {
        return localStorage.getItem('spot_webauth_verified') === 'true';
    });

    const verifyWebauth = useCallback(async (): Promise<boolean> => {
        try {
            const { optionsJson } = await getAssertionOptions();
            const parsedOptions = JSON.parse(optionsJson);
            const authOptions = parsedOptions.publicKeyCredentialRequestOptions || parsedOptions.publicKey || parsedOptions;

            if (authOptions && authOptions.extensions) {
                delete authOptions.extensions.appidExclude;
                delete authOptions.extensions.appid;
            }

            authOptions.hints = ['client-device'];

            const assertionResponse = await startAuthentication({
                optionsJSON: authOptions,
                useBrowserAutofill: false,
            });

            await verifyAssertion(JSON.stringify(assertionResponse));
            
            setIsWebauthVerified(true);
            localStorage.setItem('spot_webauth_verified', 'true');
            return true;
        } catch (err) {
            console.error('WebAuthn verification failed:', err);
            return false;
        }
    }, []);

    const clearWebauthVerification = useCallback(() => {
        localStorage.removeItem('spot_webauth_verified');
    }, []);

    const markWebauthVerified = useCallback(() => {
        setIsWebauthVerified(true);
        localStorage.setItem('spot_webauth_verified', 'true');
    }, []);

    const updateUser = (data: Partial<User>) =>
        setUser((prev) => ({ ...prev, ...data }));

    const setAuthenticatedUser = useCallback((data: UserDTO) => {
        setUser((prev) => ({
            ...prev,
            id: data.id,
            email: data.email,
            faceRegistered: data.faceRegistered ?? false,
            webauthRegistered: data.webauthRegistered ?? false,
        }));
        setError(null);
    }, []);

    const refreshCurrentUser = useCallback(async () => {
        setLoading(true);
        try {
            const currentUser = await getCurrentUser();
            setAuthenticatedUser(currentUser);
        } catch (requestError) {
            setUser(defaultUser);
            setError(requestError instanceof Error ? requestError.message : 'Failed to load current user');
        } finally {
            setLoading(false);
        }
    }, [setAuthenticatedUser]);

    useEffect(() => {
        void refreshCurrentUser();
    }, [refreshCurrentUser]);

    return (
        <AuthContext.Provider value={{ 
            user, 
            loading, 
            error, 
            updateUser, 
            setAuthenticatedUser, 
            refreshCurrentUser,
            isWebauthVerified,
            verifyWebauth,
            markWebauthVerified,
            clearWebauthVerification
        }}>
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

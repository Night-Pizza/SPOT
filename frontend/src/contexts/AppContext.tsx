import { createContext, useContext, useState } from 'react';
import type { ReactNode } from 'react';

export type Session = {
    id: string;
    title: string;
    mode?: 'QR' | 'CODE';
    password: string;
    geolocationEnabled: boolean;
    radius?: number;
    lat?: number;
    lng?: number;
    createdAt: string;
    isActive: boolean;
    validationTypes?: string[];
};

export type Student = {
    id: string;
    name: string;
    email: string;
    time: string;
};

interface AppContextType {
    sessions: Session[];
    addSession: (session: Omit<Session, 'isActive'>) => void;
    endSession: (id: string) => void;
    updateSession: (id: string, updates: Partial<Session>) => void;
    getSessionById: (id: string) => Session | undefined;
    activeSessionId: string | null;
    setActiveSessionId: (id: string | null) => void;
    // Методы принимают sessionId
    getStudentsForSession: (sessionId: string) => Student[];
    addStudentToSession: (sessionId: string, student: Student) => void;
    removeStudentFromSession: (sessionId: string, studentId: string) => void;
    clearStudentsForSession: (sessionId: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider = ({ children }: { children: ReactNode }) => {
    const [sessions, setSessions] = useState<Session[]>([]);
    const [activeSessionId, setActiveSessionId] = useState<string | null>(null);
    // Храним студентов по ID сессии
    const [studentsBySession, setStudentsBySession] = useState<Record<string, Student[]>>({});

    const addSession = (session: Omit<Session, 'isActive'>) => {
        const newSession: Session = { ...session, isActive: true };
        setSessions((prev) => [...prev, newSession]);
        setActiveSessionId(session.id);
        // Инициализируем пустой массив студентов для новой сессии
        setStudentsBySession((prev) => ({ ...prev, [session.id]: [] }));
    };

    const endSession = (id: string) => {
        setSessions((prev) =>
            prev.map((s) => (s.id === id ? { ...s, isActive: false } : s))
        );
        if (activeSessionId === id) setActiveSessionId(null);
    };

    const updateSession = (id: string, updates: Partial<Session>) => {
        setSessions((prev) =>
            prev.map((s) => (s.id === id ? { ...s, ...updates } : s))
        );
    };

    const getSessionById = (id: string) => sessions.find((s) => s.id === id);

    // Новые методы для работы со студентами конкретной сессии
    const getStudentsForSession = (sessionId: string): Student[] => {
        return studentsBySession[sessionId] || [];
    };

    const addStudentToSession = (sessionId: string, student: Student) => {
        setStudentsBySession((prev) => {
            const current = prev[sessionId] || [];
            // Проверяем, нет ли уже такого студента по email
            const exists = current.some((s) => s.email === student.email);
            if (exists) return prev;
            return {
                ...prev,
                [sessionId]: [...current, student],
            };
        });
    };

    const removeStudentFromSession = (sessionId: string, studentId: string) => {
        setStudentsBySession((prev) => {
            const current = prev[sessionId] || [];
            return {
                ...prev,
                [sessionId]: current.filter((s) => s.id !== studentId),
            };
        });
    };

    const clearStudentsForSession = (sessionId: string) => {
        setStudentsBySession((prev) => ({
            ...prev,
            [sessionId]: [],
        }));
    };

    return (
        <AppContext.Provider
            value={{
                sessions,
                addSession,
                endSession,
                updateSession,
                getSessionById,
                activeSessionId,
                setActiveSessionId,
                getStudentsForSession,
                addStudentToSession,
                removeStudentFromSession,
                clearStudentsForSession,
            }}
        >
            {children}
        </AppContext.Provider>
    );
};

export const useApp = () => {
    const ctx = useContext(AppContext);
    if (!ctx) throw new Error('useApp must be used within AppProvider');
    return ctx;
};

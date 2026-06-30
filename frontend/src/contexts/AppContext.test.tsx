import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { AppProvider, useApp } from './AppContext';

describe('AppContext', () => {
    const renderAppHook = () => {
        return renderHook(() => useApp(), {
            wrapper: ({ children }) => <AppProvider>{children}</AppProvider>,
        });
    };

    const mockSession = {
        id: 'session-1',
        title: 'Math',
        password: '123',
        geolocationEnabled: false,
        createdAt: '2026-06-30',
    };

    const mockStudent = {
        id: 'student-1',
        name: 'John',
        email: 'john@spot.com',
        time: '12:00',
    };

    it('should have initial empty state', () => {
        const { result } = renderAppHook();
        expect(result.current.sessions).toEqual([]);
        expect(result.current.activeSessionId).toBeNull();
    });

    it('should add session and make it active', () => {
        const { result } = renderAppHook();

        act(() => {
            result.current.addSession(mockSession);
        });

        expect(result.current.sessions).toHaveLength(1);
        expect(result.current.sessions[0]).toEqual({ ...mockSession, isActive: true });
        expect(result.current.activeSessionId).toBe('session-1');
        expect(result.current.getStudentsForSession('session-1')).toEqual([]);
    });

    it('should end session and clear activeSessionId', () => {
        const { result } = renderAppHook();

        act(() => {
            result.current.addSession(mockSession);
        });

        act(() => {
            result.current.endSession('session-1');
        });

        expect(result.current.sessions[0].isActive).toBe(false);
        expect(result.current.activeSessionId).toBeNull();
    });

    it('should update session properties', () => {
        const { result } = renderAppHook();

        act(() => {
            result.current.addSession(mockSession);
        });

        act(() => {
            result.current.updateSession('session-1', { title: 'Physics' });
        });

        expect(result.current.sessions[0].title).toBe('Physics');
        expect(result.current.sessions[0].password).toBe('123');
    });

    it('should get session by id', () => {
        const { result } = renderAppHook();

        act(() => {
            result.current.addSession(mockSession);
        });

        const found = result.current.getSessionById('session-1');
        const notFound = result.current.getSessionById('session-2');

        expect(found?.title).toBe('Math');
        expect(notFound).toBeUndefined();
    });

    it('should add student to session uniquely by email', () => {
        const { result } = renderAppHook();

        act(() => {
            result.current.addSession(mockSession);
        });

        act(() => {
            result.current.addStudentToSession('session-1', mockStudent);
        });

        expect(result.current.getStudentsForSession('session-1')).toHaveLength(1);

        act(() => {
            result.current.addStudentToSession('session-1', { ...mockStudent, id: 'student-2' });
        });

        expect(result.current.getStudentsForSession('session-1')).toHaveLength(1);
    });

    it('should remove student from session by id', () => {
        const { result } = renderAppHook();

        act(() => {
            result.current.addSession(mockSession);
            result.current.addStudentToSession('session-1', mockStudent);
        });

        act(() => {
            result.current.removeStudentFromSession('session-1', 'student-1');
        });

        expect(result.current.getStudentsForSession('session-1')).toHaveLength(0);
    });

    it('should clear all students for a session', () => {
        const { result } = renderAppHook();

        act(() => {
            result.current.addSession(mockSession);
            result.current.addStudentToSession('session-1', mockStudent);
            result.current.addStudentToSession('session-1', { ...mockStudent, id: 'student-2', email: 'jane@spot.com' });
        });

        expect(result.current.getStudentsForSession('session-1')).toHaveLength(2);

        act(() => {
            result.current.clearStudentsForSession('session-1');
        });

        expect(result.current.getStudentsForSession('session-1')).toHaveLength(0);
    });

    it('should throw error if useApp is used outside of AppProvider', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => renderHook(() => useApp())).toThrow('useApp must be used within AppProvider');

        consoleSpy.mockRestore();
    });
});
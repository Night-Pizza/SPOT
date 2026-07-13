import { renderHook, act, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AuthProvider, useAuth } from './AuthContext';
import { getCurrentUser } from '../api/User';

vi.mock('../api/User', () => ({
    getCurrentUser: vi.fn(),
}));

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    const renderAuthHook = () => {
        return renderHook(() => useAuth(), {
            wrapper: ({ children }) => <AuthProvider>{children}</AuthProvider>,
        });
    };

    it('should fetch user on mount and set loading to false', async () => {
        const mockUser = { id: 1, email: 'valerii@spot.com', faceRegistered: true };
        vi.mocked(getCurrentUser).mockResolvedValueOnce(mockUser);

        const { result } = renderAuthHook();

        expect(result.current.loading).toBe(true);

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.user).toEqual({
            id: 1,
            email: 'valerii@spot.com',
            attendedSessions: 0,
            faceRegistered: true,
            webauthRegistered: false,
        });
        expect(result.current.error).toBeNull();
    });

    it('should set error if fetch fails on mount', async () => {
        vi.mocked(getCurrentUser).mockRejectedValueOnce(new Error('Network Error'));

        const { result } = renderAuthHook();

        await waitFor(() => {
            expect(result.current.loading).toBe(false);
        });

        expect(result.current.error).toBe('Network Error');
        expect(result.current.user.id).toBeNull();
    });

    it('should update user partially with updateUser', async () => {
        vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 1, email: 'valerii@spot.com' });

        const { result } = renderAuthHook();

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.updateUser({ attendedSessions: 5 });
        });

        expect(result.current.user.attendedSessions).toBe(5);
        expect(result.current.user.email).toBe('valerii@spot.com');
    });

    it('should set authenticated user directly', async () => {
        vi.mocked(getCurrentUser).mockResolvedValueOnce({ id: 1, email: 'valerii@spot.com' });

        const { result } = renderAuthHook();

        await waitFor(() => expect(result.current.loading).toBe(false));

        act(() => {
            result.current.setAuthenticatedUser({ id: 2, email: 'new@spot.com', faceRegistered: false });
        });

        expect(result.current.user.id).toBe(2);
        expect(result.current.user.email).toBe('new@spot.com');
    });

    it('should throw if useAuth is used outside of AuthProvider', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        expect(() => renderHook(() => useAuth())).toThrow('useAuth must be used within AuthProvider');

        consoleSpy.mockRestore();
    });
});
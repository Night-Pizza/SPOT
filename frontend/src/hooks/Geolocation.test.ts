import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, afterEach, afterAll, vi } from 'vitest';
import { useGeolocation } from './Geolocation';

describe('useGeolocation', () => {
    const originalGeolocation = navigator.geolocation;

    afterEach(() => {
        vi.clearAllMocks();
    });

    afterAll(() => {
        Object.defineProperty(navigator, 'geolocation', {
            value: originalGeolocation,
            configurable: true,
        });
    });

    it('should throw an error if geolocation is not supported', async () => {
        Object.defineProperty(navigator, 'geolocation', {
            value: undefined,
            configurable: true,
        });

        const { result } = renderHook(() => useGeolocation());
        await expect(result.current.getPosition()).rejects.toThrow('Geolocation not supported');
        expect(result.current.loading).toBe(false);
    });

    it('should return latitude and longitude on success', async () => {
        const mockGeolocation = {
            getCurrentPosition: vi.fn().mockImplementation((successCallback) => {
                successCallback({
                    coords: {
                        latitude: 55.7558,
                        longitude: 37.6173,
                    },
                });
            }),
        };

        Object.defineProperty(navigator, 'geolocation', {
            value: mockGeolocation,
            configurable: true,
        });

        const { result } = renderHook(() => useGeolocation());

        let position;
        await act(async () => {
            position = await result.current.getPosition();
        });
        expect(position).toEqual({ lat: 55.7558, long: 37.6173 });
        expect(result.current.error).toBeNull();
        expect(result.current.loading).toBe(false);
    });

    it('should set error state on failure', async () => {
        const mockGeolocation = {
            getCurrentPosition: vi.fn().mockImplementation((_, errorCallback) => {
                errorCallback({ message: 'User denied Geolocation' });
            }),
        };

        Object.defineProperty(navigator, 'geolocation', {
            value: mockGeolocation,
            configurable: true,
        });

        const { result } = renderHook(() => useGeolocation());

        await act(async () => {
            await expect(result.current.getPosition()).rejects.toEqual({ message: 'User denied Geolocation' });
        });

        expect(result.current.error).toBe('User denied Geolocation');
        expect(result.current.loading).toBe(false);
    });
});
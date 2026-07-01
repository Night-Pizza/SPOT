import { render } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import L from 'leaflet';
import SessionMap from './SessionMap';

const { mockRemove, mockSetView, mockAddTo, mockBindPopup, mockOpenPopup } = vi.hoisted(() => ({
    mockRemove: vi.fn(),
    mockSetView: vi.fn().mockReturnThis(),
    mockAddTo: vi.fn().mockReturnThis(),
    mockBindPopup: vi.fn().mockReturnThis(),
    mockOpenPopup: vi.fn().mockReturnThis(),
}));

vi.mock('leaflet', () => {
    return {
        default: {
            map: vi.fn(() => ({
                setView: mockSetView,
                remove: mockRemove,
            })),
            tileLayer: vi.fn(() => ({ addTo: mockAddTo })),
            circle: vi.fn(() => ({ addTo: mockAddTo })),
            marker: vi.fn(() => ({
                addTo: mockAddTo,
                bindPopup: mockBindPopup,
                openPopup: mockOpenPopup,
            })),
        },
    };
});

describe('SessionMap', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('initializes map, tile layer, circle, and marker correctly', () => {
        const center: [number, number] = [55.75, 37.61];
        const radius = 100;

        render(<SessionMap center={center} radius={radius} />);

        expect(L.map).toHaveBeenCalled();
        expect(L.tileLayer).toHaveBeenCalledWith(
            'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
            expect.any(Object)
        );
        expect(L.circle).toHaveBeenCalledWith(center, expect.objectContaining({ radius }));
        expect(L.marker).toHaveBeenCalledWith(center);
    });

    it('cleans up map instance on unmount', () => {
        const { unmount } = render(<SessionMap center={[55.75, 37.61]} radius={100} />);
        
        unmount();
        
        expect(mockRemove).toHaveBeenCalled();
    });

    it('re-initializes map when center or radius changes', () => {
        const { rerender } = render(<SessionMap center={[55.75, 37.61]} radius={100} />);
        
        expect(L.map).toHaveBeenCalledTimes(1);

        rerender(<SessionMap center={[55.76, 37.62]} radius={200} />);

        expect(mockRemove).toHaveBeenCalled();
        expect(L.map).toHaveBeenCalledTimes(2);
    });
});
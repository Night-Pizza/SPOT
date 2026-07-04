import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import GeoButton from './GeolocationButton';
import { useGeolocation } from '../hooks/Geolocation';

vi.mock('../hooks/Geolocation', () => ({
    useGeolocation: vi.fn(),
}));

vi.mock('antd', async () => {
    const actual = await vi.importActual('antd');
    return {
        ...actual,
        message: {
            success: vi.fn(),
            error: vi.fn(),
        },
    };
});

import { message } from 'antd';

describe('GeoButton', () => {
    it('renders correctly and shows default text', () => {
        vi.mocked(useGeolocation).mockReturnValue({
            getPosition: vi.fn(),
            loading: false,
            error: null,
        });

        render(<GeoButton onLocationSuccess={vi.fn()} />);
        expect(screen.getByText('Get Location')).toBeInTheDocument();
        expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('shows loading state and disables interactions when loading is true', () => {
        vi.mocked(useGeolocation).mockReturnValue({
            getPosition: vi.fn(),
            loading: true,
            error: null,
        });

        render(<GeoButton onLocationSuccess={vi.fn()} />);
        expect(screen.getByText('Locating...')).toBeInTheDocument();
    });

    it('calls onLocationSuccess and shows success message on success', async () => {
        const mockOnSuccess = vi.fn();
        const mockGetPosition = vi.fn().mockResolvedValue({ lat: 55.75, long: 37.61 });

        vi.mocked(useGeolocation).mockReturnValue({
            getPosition: mockGetPosition,
            loading: false,
            error: null,
        });

        render(<GeoButton onLocationSuccess={mockOnSuccess} />);
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(mockGetPosition).toHaveBeenCalled();
            expect(mockOnSuccess).toHaveBeenCalledWith({ lat: 55.75, long: 37.61 });
            expect(message.success).toHaveBeenCalledWith('Location acquired!');
        });
    });

    it('shows error message when getPosition fails', async () => {
        const mockGetPosition = vi.fn().mockRejectedValue(new Error('Denied'));

        vi.mocked(useGeolocation).mockReturnValue({
            getPosition: mockGetPosition,
            loading: false,
            error: null,
        });

        render(<GeoButton onLocationSuccess={vi.fn()} />);
        fireEvent.click(screen.getByRole('button'));

        await waitFor(() => {
            expect(message.error).toHaveBeenCalledWith('Failed to get location. Please check browser permissions.');
        });
    });
});
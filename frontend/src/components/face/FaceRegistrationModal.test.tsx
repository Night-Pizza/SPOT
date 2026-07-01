import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import '@testing-library/jest-dom';
import FaceRegistrationModal from './FaceRegistrationModal';
import { registerFace, checkFaceStatus } from '../../api/Face';
import { useAuth } from '../../contexts/AuthContext';

vi.mock('../../api/Face', () => ({
    registerFace: vi.fn(),
    checkFaceStatus: vi.fn(),
}));

vi.mock('../../contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('./FaceCapture', () => ({
    default: ({ onCapture, onCancel, error, loading }: any) => (
        <div data-testid="mock-face-capture">
            <span data-testid="capture-error">{error}</span>
            <span data-testid="capture-loading">{loading ? 'loading' : 'idle'}</span>
            <button data-testid="capture-btn" onClick={() => onCapture([new File([''], 'test.jpg')])}>Capture</button>
            <button data-testid="cancel-btn" onClick={onCancel}>Cancel</button>
        </div>
    )
}));

vi.mock('./VerificationResult', () => ({
    default: ({ verified, onContinue, onRetry }: any) => (
        <div data-testid="mock-verification-result">
            <span data-testid="verified-status">{verified ? 'yes' : 'no'}</span>
            <button data-testid="continue-btn" onClick={onContinue}>Continue</button>
            <button data-testid="retry-btn" onClick={onRetry}>Retry</button>
        </div>
    )
}));

describe('FaceRegistrationModal', () => {
    const mockUpdateUser = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(useAuth).mockReturnValue({
            user: { id: 1 } as any,
            updateUser: mockUpdateUser,
        } as any);
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('renders FaceCapture initially and handles cancel', () => {
        const mockOnCancel = vi.fn();
        render(<FaceRegistrationModal visible={true} onSuccess={vi.fn()} onCancel={mockOnCancel} />);

        expect(screen.getByTestId('mock-face-capture')).toBeInTheDocument();
        
        fireEvent.click(screen.getByTestId('cancel-btn'));
        expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('does not start capture if user id is missing', () => {
        vi.mocked(useAuth).mockReturnValue({ user: {} as any, updateUser: mockUpdateUser } as any);
        render(<FaceRegistrationModal visible={true} onSuccess={vi.fn()} />);
        
        fireEvent.click(screen.getByTestId('capture-btn'));
        
        expect(registerFace).not.toHaveBeenCalled();
    });

    it('handles successful face registration', async () => {
        const mockOnSuccess = vi.fn();
        vi.mocked(registerFace).mockResolvedValueOnce({ success: true, requestId: 123 });
        vi.mocked(checkFaceStatus).mockResolvedValueOnce({ success: true, status: 'SUCCESS' } as any);

        render(<FaceRegistrationModal visible={true} onSuccess={mockOnSuccess} />);

        fireEvent.click(screen.getByTestId('capture-btn'));

        expect(screen.getByTestId('capture-loading')).toHaveTextContent('loading');

        await waitFor(() => {
            expect(screen.getByTestId('mock-verification-result')).toBeInTheDocument();
        });

        expect(screen.getByTestId('verified-status')).toHaveTextContent('yes');
        expect(mockUpdateUser).toHaveBeenCalledWith({ faceRegistered: true });

        fireEvent.click(screen.getByTestId('continue-btn'));
        expect(mockOnSuccess).toHaveBeenCalledTimes(1);
    });

    it('handles missing request ID from backend', async () => {
        vi.mocked(registerFace).mockResolvedValueOnce({ success: true } as any);

        render(<FaceRegistrationModal visible={true} onSuccess={vi.fn()} />);

        fireEvent.click(screen.getByTestId('capture-btn'));

        await waitFor(() => {
            expect(screen.getByTestId('mock-verification-result')).toBeInTheDocument();
        });

        expect(screen.getByTestId('verified-status')).toHaveTextContent('no');

        fireEvent.click(screen.getByTestId('retry-btn'));
        expect(screen.getByTestId('mock-face-capture')).toBeInTheDocument();
        expect(screen.getByTestId('capture-error')).toHaveTextContent('');
    });

    it('handles polling failure status', async () => {
        vi.useFakeTimers();
        vi.mocked(registerFace).mockResolvedValueOnce({ success: true, requestId: 123 });
        vi.mocked(checkFaceStatus)
            .mockResolvedValueOnce({ success: true, status: 'PENDING' } as any)
            .mockResolvedValueOnce({ success: true, status: 'FAILED', errorMessage: 'Blurry photo' } as any);

        render(<FaceRegistrationModal visible={true} onSuccess={vi.fn()} />);

        await act(async () => {
            fireEvent.click(screen.getByTestId('capture-btn'));
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        await act(async () => {
            await vi.advanceTimersByTimeAsync(1000);
        });

        expect(screen.getByTestId('mock-verification-result')).toBeInTheDocument();
        expect(screen.getByTestId('verified-status')).toHaveTextContent('no');
        
        fireEvent.click(screen.getByTestId('retry-btn'));
        expect(screen.getByTestId('capture-error')).toHaveTextContent('');
    });

    it('handles polling timeout after max attempts', async () => {
        vi.useFakeTimers();
        vi.mocked(registerFace).mockResolvedValueOnce({ success: true, requestId: 123 });
        vi.mocked(checkFaceStatus).mockResolvedValue({ success: true, status: 'PENDING' } as any);

        render(<FaceRegistrationModal visible={true} onSuccess={vi.fn()} />);

        await act(async () => {
            fireEvent.click(screen.getByTestId('capture-btn'));
        });

        for (let i = 0; i < 30; i++) {
            await act(async () => {
                await vi.advanceTimersByTimeAsync(1000);
            });
        }

        expect(screen.getByTestId('mock-verification-result')).toBeInTheDocument();
        expect(screen.getByTestId('verified-status')).toHaveTextContent('no');
    });
});
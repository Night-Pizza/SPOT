import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, beforeAll, afterAll } from 'vitest';
import '@testing-library/jest-dom';
import FaceCapture from './FaceCapture';

vi.mock('react-webcam', () => {
    return {
        default: React.forwardRef((props, ref) => {
            React.useImperativeHandle(ref, () => ({
                getScreenshot: vi.fn(() => 'data:image/jpeg;base64,mock')
            }));
            return <div data-testid="webcam" />;
        })
    };
});

describe('FaceCapture', () => {
    beforeAll(() => {
        vi.stubGlobal('URL', {
            createObjectURL: vi.fn(() => 'blob:mock-url')
        });

        vi.stubGlobal('fetch', vi.fn(async () => ({
            blob: async () => new Blob(['mock'], { type: 'image/jpeg' })
        })));

        vi.stubGlobal('Image', class {
            onload: () => void = () => {};
            set src(value: string) {
                this.onload();
            }
        });

        HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
            drawImage: vi.fn(),
            getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(16) })),
            putImageData: vi.fn(),
        })) as any;

        HTMLCanvasElement.prototype.toDataURL = vi.fn(() => 'data:image/jpeg;base64,filtered');
    });

    beforeEach(() => {
        vi.clearAllMocks();
        vi.useFakeTimers();
    });

    afterAll(() => {
        vi.useRealTimers();
        vi.unstubAllGlobals();
    });

    it('renders single mode correctly', () => {
        render(<FaceCapture onCapture={vi.fn()} mode="single" />);
        expect(screen.getByRole('button', { name: /Capture Photo/i })).toBeInTheDocument();
    });

    it('handles single capture and submit flow', async () => {
        const mockOnCapture = vi.fn();
        render(<FaceCapture onCapture={mockOnCapture} mode="single" />);

        const captureBtn = screen.getByRole('button', { name: /Capture Photo/i });
        fireEvent.click(captureBtn);

        expect(screen.getByText('1')).toBeInTheDocument();

        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByAltText('Face 1')).toBeInTheDocument();
        });

        const submitBtn = screen.getByRole('button', { name: /Submit Photos/i });
        fireEvent.click(submitBtn);

        expect(mockOnCapture).toHaveBeenCalledTimes(1);
        expect(mockOnCapture.mock.calls[0][0]).toHaveLength(1);
    });

    it('handles triple capture flow', async () => {
        const mockOnCapture = vi.fn();
        render(<FaceCapture onCapture={mockOnCapture} mode="triple" />);

        const captureBtn = screen.getByRole('button', { name: /Capture 3 Photos/i });
        fireEvent.click(captureBtn);

        for (let i = 3; i > 0; i--) {
            expect(screen.getByText(i.toString())).toBeInTheDocument();
            await act(async () => {
                vi.advanceTimersByTime(1000);
                await Promise.resolve();
            });
        }

        await waitFor(() => {
            expect(screen.getAllByAltText(/Face/i)).toHaveLength(3);
        });

        const submitBtn = screen.getByRole('button', { name: /Submit Photos/i });
        fireEvent.click(submitBtn);

        expect(mockOnCapture).toHaveBeenCalledTimes(1);
        expect(mockOnCapture.mock.calls[0][0]).toHaveLength(3);
    });

    it('handles retake button', async () => {
        render(<FaceCapture onCapture={vi.fn()} mode="single" />);

        fireEvent.click(screen.getByRole('button', { name: /Capture Photo/i }));

        await act(async () => {
            vi.advanceTimersByTime(1000);
            await Promise.resolve();
        });

        await waitFor(() => {
            expect(screen.getByAltText('Face 1')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByRole('button', { name: /Retake/i }));

        expect(screen.queryByAltText('Face 1')).not.toBeInTheDocument();
        expect(screen.getByRole('button', { name: /Capture Photo/i })).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', () => {
        const mockOnCancel = vi.fn();
        render(<FaceCapture onCapture={vi.fn()} onCancel={mockOnCancel} mode="single" />);

        fireEvent.click(screen.getByRole('button', { name: /Cancel/i }));

        expect(mockOnCancel).toHaveBeenCalledTimes(1);
    });

    it('renders error alert when error is provided', () => {
        render(<FaceCapture onCapture={vi.fn()} error="Camera not found" />);
        expect(screen.getByText('Camera not found')).toBeInTheDocument();
    });
});
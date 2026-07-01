import React from 'react';
import { render, screen, fireEvent} from '@testing-library/react';
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
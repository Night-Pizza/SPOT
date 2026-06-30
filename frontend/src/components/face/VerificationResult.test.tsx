import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import '@testing-library/jest-dom';
import FaceVerificationResult from './VerificationResult';

describe('FaceVerificationResult', () => {
    it('renders success state correctly when verified is true', () => {
        const mockOnContinue = vi.fn();
        const mockOnRetry = vi.fn();

        render(
            <FaceVerificationResult 
                verified={true} 
                onContinue={mockOnContinue} 
                onRetry={mockOnRetry} 
            />
        );

        expect(screen.getByText('Face Verified!')).toBeInTheDocument();
        expect(screen.getByText('Your face has been successfully registered.')).toBeInTheDocument();

        const continueBtn = screen.getByRole('button', { name: 'Continue' });
        expect(continueBtn).toBeInTheDocument();
        expect(screen.queryByRole('button', { name: 'Retake Photos' })).not.toBeInTheDocument();

        fireEvent.click(continueBtn);
        expect(mockOnContinue).toHaveBeenCalledTimes(1);
        expect(mockOnRetry).not.toHaveBeenCalled();
    });

    it('renders failure state correctly when verified is false', () => {
        const mockOnContinue = vi.fn();
        const mockOnRetry = vi.fn();

        render(
            <FaceVerificationResult 
                verified={false} 
                onContinue={mockOnContinue} 
                onRetry={mockOnRetry} 
            />
        );

        expect(screen.getByText('Face Verification Failed')).toBeInTheDocument();
        expect(screen.getByText('Please try again or ensure good lighting.')).toBeInTheDocument();

        const retryBtn = screen.getByRole('button', { name: 'Retry' });
        const retakeBtn = screen.getByRole('button', { name: 'Retake Photos' });

        expect(retryBtn).toBeInTheDocument();
        expect(retakeBtn).toBeInTheDocument();

        fireEvent.click(retryBtn);
        expect(mockOnContinue).toHaveBeenCalledTimes(1);

        fireEvent.click(retakeBtn);
        expect(mockOnRetry).toHaveBeenCalledTimes(1);
    });
});
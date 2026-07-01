import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import DrawerMenu from './DrawerMenu';

describe('DrawerMenu', () => {
    const renderDrawer = (isOpen: boolean, onClose = vi.fn()) => {
        return render(
            <MemoryRouter>
                <DrawerMenu isOpen={isOpen} onClose={onClose} />
            </MemoryRouter>
        );
    };

    it('applies open class only when isOpen is true', () => {
        const { container } = renderDrawer(true);
        const drawer = container.querySelector('.drawer-menu');
        const overlay = container.querySelector('.drawer-overlay');

        expect(drawer).toHaveClass('open');
        expect(overlay).toHaveClass('open');
    });

    it('does not apply open class when isOpen is false', () => {
        const { container } = renderDrawer(false);
        const drawer = container.querySelector('.drawer-menu');
        const overlay = container.querySelector('.drawer-overlay');

        expect(drawer).not.toHaveClass('open');
        expect(overlay).not.toHaveClass('open');
    });

    it('calls onClose when overlay is clicked', () => {
        const mockOnClose = vi.fn();
        const { container } = renderDrawer(true, mockOnClose);
        
        const overlay = container.querySelector('.drawer-overlay');
        if (overlay) fireEvent.click(overlay);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('renders all navigation links', () => {
        renderDrawer(true);

        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('Attendance')).toBeInTheDocument();
        expect(screen.getByText('Sessions')).toBeInTheDocument();
        expect(screen.getByText('Profile')).toBeInTheDocument();
    });

    it('calls onClose when a navigation link is clicked', () => {
        const mockOnClose = vi.fn();
        renderDrawer(true, mockOnClose);

        const dashboardLink = screen.getByText('Dashboard');
        fireEvent.click(dashboardLink);

        expect(mockOnClose).toHaveBeenCalledTimes(1);
    });

    it('renders correct hrefs for navigation links', () => {
        renderDrawer(true);

        expect(screen.getByText('Dashboard').closest('a')).toHaveAttribute('href', '/dashboard');
        expect(screen.getByText('Attendance').closest('a')).toHaveAttribute('href', '/attendance');
        expect(screen.getByText('Sessions').closest('a')).toHaveAttribute('href', '/sessions');
        expect(screen.getByText('Profile').closest('a')).toHaveAttribute('href', '/profile');
    });

    it('renders the branding logo and text', () => {
        renderDrawer(true);

        expect(screen.getByAltText('')).toBeInTheDocument();
        expect(screen.getByLabelText('Innopolis University SPOT')).toBeInTheDocument();
        expect(screen.getByText('INNOPOLIS')).toBeInTheDocument();
        expect(screen.getByText('UNIVERSITY')).toBeInTheDocument();
        expect(screen.getByText('SPOT')).toBeInTheDocument();
    });
});
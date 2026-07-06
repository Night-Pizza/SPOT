import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import '@testing-library/jest-dom';
import AppShell from './AppShell';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';

vi.mock('../contexts/AuthContext', () => ({
    useAuth: vi.fn(),
}));

vi.mock('../contexts/ThemeContext', () => ({
    useTheme: vi.fn(),
}));

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async (importOriginal) => {
    const actual = await importOriginal<any>();
    return {
        ...actual,
        useNavigate: () => mockNavigate,
    };
});

describe('AppShell', () => {
    const mockToggleTheme = vi.fn();
    const mockSetLanguage = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();

        vi.mocked(useAuth).mockReturnValue({
            user: { email: 'student@innopolis.ru' },
            loading: false,
        } as any);

        vi.mocked(useTheme).mockReturnValue({
            theme: 'light',
            toggleTheme: mockToggleTheme,
            language: 'en',
            setLanguage: mockSetLanguage,
            t: (key: string) => `translated_${key}`,
        } as any);
    });

    const renderWithRouter = (ui: React.ReactElement, initialRoute = '/') => {
        return render(
            <MemoryRouter initialEntries={[initialRoute]}>
                {ui}
            </MemoryRouter>
        );
    };

    it('renders basic layout with title, subtitle, and children', () => {
        renderWithRouter(
            <AppShell title="Main Title" subtitle="Sub Title">
                <div data-testid="child-content">Content</div>
            </AppShell>
        );

        expect(screen.getByText('Main Title')).toBeInTheDocument();
        expect(screen.getByText('Sub Title')).toBeInTheDocument();
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
        expect(screen.getByText('student@innopolis.ru')).toBeInTheDocument();
        expect(screen.getByText('S')).toBeInTheDocument();
    });

    it('hides page title when showPageTitle is false', () => {
        renderWithRouter(
            <AppShell title="Hidden Title" showPageTitle={false}>
                <div>Content</div>
            </AppShell>
        );

        expect(screen.queryByText('Hidden Title')).not.toBeInTheDocument();
    });

    it('handles drawer toggle on mobile menu button and overlay click', () => {
        const { container } = renderWithRouter(<AppShell title="Test">Content</AppShell>);

        const overlay = container.querySelector('.drawer-overlay');
        const menuBtn = container.querySelector('.mobile-menu-button');
        const drawer = container.querySelector('.drawer-menu');

        expect(drawer).not.toHaveClass('open');

        if (menuBtn) fireEvent.click(menuBtn);
        expect(drawer).toHaveClass('open');

        if (overlay) fireEvent.click(overlay);
        expect(drawer).not.toHaveClass('open');
    });

    it('calls toggleTheme when theme button is clicked', () => {
        const { container } = renderWithRouter(<AppShell title="Test">Content</AppShell>);

        const themeBtn = container.querySelector('.theme-toggle');
        if (themeBtn) fireEvent.click(themeBtn);

        expect(mockToggleTheme).toHaveBeenCalledTimes(1);
    });

    it('navigates to profile when user section is clicked', () => {
        renderWithRouter(<AppShell title="Test">Content</AppShell>);

        const userName = screen.getByText('student@innopolis.ru');
        fireEvent.click(userName);

        expect(mockNavigate).toHaveBeenCalledWith('/profile');
    });

    it('highlights active nav link', () => {
        renderWithRouter(<AppShell title="Test">Content</AppShell>, '/dashboard');

        const dashboardLink = screen.getByText('translated_dashboard').closest('a');
        const profileLink = screen.getByText('translated_profile').closest('a');

        expect(dashboardLink).toHaveClass('active');
        expect(profileLink).not.toHaveClass('active');
    });

    it('renders fallback when user is loading and email is empty', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { email: '' },
            loading: true,
        } as any);

        renderWithRouter(<AppShell title="Test">Content</AppShell>);

        expect(screen.getByText('translated_loading', { selector: '.user-name' })).toBeInTheDocument();
        expect(screen.getByText('?')).toBeInTheDocument();
    });

    it('renders fallback profile text when user is not loading but email is empty', () => {
        vi.mocked(useAuth).mockReturnValue({
            user: { email: '' },
            loading: false,
        } as any);

        renderWithRouter(<AppShell title="Test">Content</AppShell>);

        expect(screen.getByText('translated_profile', { selector: '.user-name' })).toBeInTheDocument();
        expect(screen.getByText('?')).toBeInTheDocument();
    });
});
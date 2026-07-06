import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ThemeProvider, useTheme } from './ThemeContext';

vi.unmock('./ThemeContext');

describe('ThemeContext', () => {
    beforeEach(() => {
        window.localStorage.clear();
        document.documentElement.removeAttribute('data-theme');
    });

    const renderThemeHook = () => {
        return renderHook(() => useTheme(), {
            wrapper: ({ children }) => <ThemeProvider>{children}</ThemeProvider>,
        });
    };

    it('должен инициализироваться со значениями по умолчанию (light и en)', () => {
        const { result } = renderThemeHook();

        expect(result.current.theme).toBe('light');
        expect(result.current.language).toBe('en');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('должен подтягивать значения из localStorage, если они там есть', () => {
        window.localStorage.setItem('theme', 'dark');
        window.localStorage.setItem('language', 'ru');

        const { result } = renderThemeHook();

        expect(result.current.theme).toBe('dark');
        expect(result.current.language).toBe('ru');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    });

    it('должен переключать тему и обновлять localStorage и DOM', () => {
        const { result } = renderThemeHook();

        act(() => {
            result.current.toggleTheme();
        });

        expect(result.current.theme).toBe('dark');
        expect(window.localStorage.getItem('theme')).toBe('dark');
        expect(document.documentElement.getAttribute('data-theme')).toBe('dark');

        act(() => {
            result.current.toggleTheme();
        });

        expect(result.current.theme).toBe('light');
        expect(window.localStorage.getItem('theme')).toBe('light');
        expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('должен менять язык и сохранять его в localStorage', () => {
        const { result } = renderThemeHook();

        act(() => {
            result.current.setLanguage('ru');
        });

        expect(result.current.language).toBe('ru');
        expect(window.localStorage.getItem('language')).toBe('ru');
    });

    it('должен правильно переводить ключи в зависимости от языка', () => {
        const { result } = renderThemeHook();

        expect(result.current.t('dashboard')).toBe('Dashboard');
        expect(result.current.t('scanQR')).toBe('Scan QR');

        act(() => {
            result.current.setLanguage('ru');
        });

        expect(result.current.t('dashboard')).toBe('Панель');
        expect(result.current.t('scanQR')).toBe('Сканировать QR');
    });

    it('должен возвращать сам ключ, если перевода не существует', () => {
        const { result } = renderThemeHook();
        expect(result.current.t('SOME_MAGIC_KEY')).toBe('SOME_MAGIC_KEY');
    });

    it('должен выбрасывать ошибку, если useTheme вызван вне ThemeProvider', () => {
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});


        expect(() => renderHook(() => useTheme())).toThrow('useTheme must be used within ThemeProvider');

        consoleSpy.mockRestore();
    });
});
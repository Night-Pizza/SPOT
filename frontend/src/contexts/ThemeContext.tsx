import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

type Theme = 'light' | 'dark';
type Language = 'en' | 'ru';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    language: Language;
    setLanguage: (lang: Language) => void;
    t: (key: string) => string;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const translations: Record<Language, Record<string, string>> = {
    en: {
        // Меню и навигация
        dashboard: 'Dashboard',
        attendance: 'Attendance',
        sessions: 'Sessions',
        profile: 'Profile',
        logout: 'Logout',

        // Общие действия
        back: 'Back',
        add: 'Add',
        cancel: 'Cancel',
        submit: 'Submit',
        save: 'Save',
        edit: 'Edit',
        delete: 'Delete',
        close: 'Close',
        remove: 'Remove',
        ok: 'OK',

        // Сессии
        newSession: 'New Session',
        sessionDetails: 'Session Details',
        sessionCode: 'Session Code',
        geolocation: 'Geolocation',
        enabled: 'Enabled',
        disabled: 'Disabled',
        location: 'Location',
        active: 'Active',
        sessionLive: 'Session live',
        noSessions: 'No sessions created yet',
        manageSessions: 'Manage your attendance sessions',
        sessionTitle: 'Session Title',
        enableGeolocation: 'Enable Geolocation',
        allowedRadius: 'Allowed Radius',
        meters: 'meters',
        sessionCodeOptional: 'Session Code (optional)',
        sessionCodeHelp: 'Participants can use this code to join the session.',
        createSession: 'Create Session',
        sessionsCreated: 'Sessions Created',
        sessionsAttended: 'Sessions Attended',
        scannedStudents: 'Scanned Students',
        noAttendees: 'No attendees yet',
        addStudentManually: 'Add Student Manually',
        geolocationHelp: 'Students must be within this radius to mark attendance.',

        // Attendance
        scanQR: 'Scan QR',
        scanQRCode: 'Scan QR Code',
        scanQRDesc: 'Use your camera to scan the session QR code',
        openCamera: 'Open Camera',
        enterSessionCode: 'Enter Session Code',
        enterCodeDesc: 'Enter the code shared for this session',
        submitCode: 'Submit Code',
        attendanceHistory: 'Attendance History',
        sessionName: 'Session Name',
        date: 'Date',
        time: 'Time',
        noAttendanceRecords: 'No attendance records yet',

        // Verification
        locationVerification: 'Location Verification',
        gettingLocation: 'Getting your location...',
        yourLocation: 'Your location',
        sessionLocation: 'Session location',
        withinAllowed: '✅ Within Allowed Area',
        outsideAllowed: '❌ Outside Allowed Area',
        distanceFromCenter: 'Distance from session center',
        proceedToSession: 'Proceed to Session',

        // Profile
        changePassword: 'Change Password',
        contactInformation: 'Contact Information',
        email: 'Email',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        passwordMismatch: 'Passwords do not match',
        passwordChanged: 'Password changed successfully',

        // Dashboard
        hello: 'Hello',
        quickActions: 'QUICK ACTIONS',
        viewAttendance: 'View Attendance',

        // Общие ошибки
        sessionNotFound: 'Session not found',
        goToSessions: 'Go to Sessions',
        loading: 'Loading...',
        loadingSession: 'Loading session...',
        sessionNotFoundError: 'Session not found. Please check the code.',
        locationError: 'Unable to get location. Please enable GPS or disable geolocation.',
        removeAttendee: 'Remove this attendee?',
        attendeeAdded: 'Attendee added.',
        name: 'Name',
        actions: 'Actions',
    },
    ru: {
        // Меню и навигация
        dashboard: 'Панель',
        attendance: 'Посещаемость',
        sessions: 'Сессии',
        profile: 'Профиль',
        logout: 'Выйти',

        // Общие действия
        back: 'Назад',
        add: 'Добавить',
        cancel: 'Отмена',
        submit: 'Отправить',
        save: 'Сохранить',
        edit: 'Изменить',
        delete: 'Удалить',
        close: 'Закрыть',
        remove: 'Удалить',
        ok: 'ОК',

        // Сессии
        newSession: 'Новая сессия',
        sessionDetails: 'Детали сессии',
        sessionCode: 'Код сессии',
        geolocation: 'Геолокация',
        enabled: 'Включена',
        disabled: 'Отключена',
        location: 'Местоположение',
        active: 'Активна',
        sessionLive: 'Сессия активна',
        noSessions: 'Нет созданных сессий',
        manageSessions: 'Управление сессиями посещаемости',
        sessionTitle: 'Название сессии',
        enableGeolocation: 'Включить геолокацию',
        allowedRadius: 'Разрешённый радиус',
        meters: 'метров',
        sessionCodeOptional: 'Код сессии (опционально)',
        sessionCodeHelp: 'Участники могут использовать этот код для входа в сессию.',
        createSession: 'Создать сессию',
        sessionsCreated: 'Создано сессий',
        sessionsAttended: 'Посещено сессий',
        scannedStudents: 'Отсканированные студенты',
        noAttendees: 'Нет участников',
        addStudentManually: 'Добавить студента вручную',
        geolocationHelp: 'Студенты должны находиться в этом радиусе для отметки посещаемости.',

        // Attendance
        scanQR: 'Сканировать QR',
        scanQRCode: 'Сканировать QR-код',
        scanQRDesc: 'Используйте камеру для сканирования QR-кода сессии',
        openCamera: 'Открыть камеру',
        enterSessionCode: 'Ввести код сессии',
        enterCodeDesc: 'Введите код, предоставленный для этой сессии',
        submitCode: 'Отправить код',
        attendanceHistory: 'История посещаемости',
        sessionName: 'Название сессии',
        date: 'Дата',
        time: 'Время',
        noAttendanceRecords: 'Нет записей о посещаемости',

        // Verification
        locationVerification: 'Проверка местоположения',
        gettingLocation: 'Определение вашего местоположения...',
        yourLocation: 'Ваше местоположение',
        sessionLocation: 'Местоположение сессии',
        withinAllowed: '✅ В разрешённой зоне',
        outsideAllowed: '❌ Вне разрешённой зоны',
        distanceFromCenter: 'Расстояние от центра сессии',
        proceedToSession: 'Перейти к сессии',

        // Profile
        changePassword: 'Сменить пароль',
        contactInformation: 'Контактная информация',
        email: 'Email',
        currentPassword: 'Текущий пароль',
        newPassword: 'Новый пароль',
        confirmPassword: 'Подтвердите пароль',
        passwordMismatch: 'Пароли не совпадают',
        passwordChanged: 'Пароль успешно изменён',

        // Dashboard
        hello: 'Здравствуйте',
        quickActions: 'БЫСТРЫЕ ДЕЙСТВИЯ',
        viewAttendance: 'Просмотр посещаемости',

        // Общие ошибки
        sessionNotFound: 'Сессия не найдена',
        goToSessions: 'Перейти к сессиям',
        loading: 'Загрузка...',
        loadingSession: 'Загрузка сессии...',
        sessionNotFoundError: 'Сессия не найдена. Проверьте код.',
        locationError: 'Не удалось определить местоположение. Включите GPS или отключите геолокацию.',
        removeAttendee: 'Удалить этого участника?',
        attendeeAdded: 'Участник добавлен.',
        name: 'Имя',
        actions: 'Действия',
    },
};

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
    const [theme, setTheme] = useState<Theme>(() => {
        const stored = localStorage.getItem('theme') as Theme | null;
        return stored || 'light';
    });
    const [language, setLanguage] = useState<Language>(() => {
        const stored = localStorage.getItem('language') as Language | null;
        return stored || 'en';
    });

    useEffect(() => {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('language', language);
    }, [language]);

    const toggleTheme = () => {
        setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    };

    const t = (key: string): string => {
        return translations[language]?.[key] || key;
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, language, setLanguage, t }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};
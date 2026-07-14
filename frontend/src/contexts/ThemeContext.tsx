import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';

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
        // Nav
        dashboard: 'Dashboard',
        attendance: 'Attendance',
        sessions: 'Sessions',
        profile: 'Profile',
        logout: 'Logout',

        // Common
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
        loading: 'Loading...',
        unavailable: 'Unavailable',
        participants: 'Participants',
        open: 'Open',
        view: 'View',
        create: 'Create',
        retry: 'Retry',
        next: 'Next',
        finish: 'Finish',
        enabled: 'Enabled',
        disabled: 'Disabled',
        nA: 'N/A',

        // Auth
        login: 'Login',
        register: 'Register',
        emailPlaceholder: 'name@innopolis.university',
        passwordPlaceholder: 'password',
        emailInvalid: 'Email must belong to @innopolis.ru or @innopolis.university',
        emailLowercase: 'Email must be in lowercase and contain no spaces',
        emailEmpty: 'Email cannot be empty',
        passwordEmpty: 'Password cannot be empty',
        passwordMin: 'Password must be at least 8 characters long',
        passwordDigit: 'Password must contain at least one digit',
        passwordLower: 'Password must contain at least one lowercase letter',
        passwordUpper: 'Password must contain at least one uppercase letter',
        passwordSpecial: 'Password must contain at least one special character',
        loginFailed: 'Login failed',
        registerFailed: 'Registration failed',

        // Sessions/create
        newSession: 'New Session',
        sessionDetails: 'Session Details',
        sessionCode: 'Session Code',
        createSession: 'Create Session',
        sessionTitle: 'Session Title',
        titleRequired: 'Please enter a session title.',
        titlePlaceholder: 'e.g. Machine Learning Lecture',
        manageSessions: 'Create and manage your sessions',
        noSessions: 'No sessions yet. Create one to get started.',
        validationMethods: 'Validation Methods',
        gps: 'GPS',
        password: 'Password',
        faceRecShort: 'Face Recognition',
        none: 'None',
        sessionId: 'Session ID',
        sessionIdRequired: 'Please enter a session ID.',
        sessionIdPositive: 'Session ID must be a positive integer.',
        sessionCodeLabel: 'Session Code',
        sessionPasswordPlaceholder: 'Session password',
        submitCode: 'Submit Code',

        // Geolocation / map
        enableGeolocation: 'Enable Geolocation',
        geolocationHelp: 'Restrict attendance to a physical location',
        limitByLocation: 'Limit by location',
        onlyNearCheckIn: 'Only people near your chosen point can check in',
        allowedRadius: 'Allowed Radius',
        radiusRequired: 'Please enter an allowed radius.',
        radiusMin: 'Radius must be a positive number.',
        meters: 'meters',
        sessionLocation: 'Session Location',
        getLocation: 'Get Location',
        locationSet: 'Location set!',
        locationPermissionError: 'Failed to acquire location. Please grant permission.',
        pleaseSetLocation: 'Please set your location first.',
        checkInMethod: 'Check‑in method',
        scanQR: 'Scan QR',
        codeExtra: 'Participants can use this code to join.',
        codePlaceholder: 'Enter password',
        useDeviceLocation: 'Use my device location',
        pickOnMap: 'Pick on map',
        locationNotSet: 'Location not set — use device location or pick on map.',
        pickLocation: 'Pick location',
        mapHint: 'Drag the marker or click the map to choose the center.',
        allowedRadiusShort: 'Allowed radius',
        metersShort: 'm',
        done: 'Done',
        locationLabel: 'Location',               // <-- единственное определение
        radiusLabel: 'Radius',                   // <-- единственное определение
        adjustLocation: 'Adjust on map',
        acquiringLocation: 'Getting your location...',
        adjustLocationTitle: 'Choose location',
        selectPointOnMap: 'Select a point on the map',
        gpsValidation: 'Location',
        passwordValidation: 'Code word',
        faceValidation: 'Face recognition',
        noValidation: 'No additional validation',
        geolocationLabel: 'Geolocation',         // <-- единственное определение
        geolocationRequired: 'Geolocation is required for this session.',
        sessionLocationTitle: 'Session Location',

        // Face recognition
        faceRecognition: 'Require Face Recognition',
        faceRecognitionHelp: 'Students must scan their face to mark attendance',
        faceRegistrationRequired: 'Face Registration Required',
        faceRegistrationRequiredDescription: 'You have not registered your face embedding yet. Please register your face to enable face recognition check-in.',
        registerFace: 'Register Face',
        faceRegisteredSuccess: 'Face registered successfully!',
        faceUpdated: 'Face updated successfully',
        faceVerificationRequired: 'Face Verification Required',
        verifyingFace: 'Verifying your face...',
        verifyingFaceDescription: 'Please wait while we check your face against the registered data.',
        faceVerified: 'Face verified!',
        faceAttendanceSuccess: 'Attendance recorded successfully.',
        continue: 'Continue',
        faceVerificationFailed: 'Face verification failed',
        faceNotRecognized: 'Face not recognized. Please try again.',
        tryAgain: 'Try Again',

        // Dashboard
        hello: 'Hello',
        quickActions: 'Quick Actions',
        sessionsCreated: 'Sessions created',
        sessionsAttended: 'Sessions attended',
        startSession: 'Start a session',
        markAttendance: 'Mark attendance',
        reviewRecords: 'Review records',

        // Profile
        profileTitle: 'Profile',
        changePassword: 'Change Password',
        currentPassword: 'Current Password',
        newPassword: 'New Password',
        confirmPassword: 'Confirm Password',
        passwordMismatch: 'Passwords do not match',
        passwordChanged: 'Password changed successfully',
        logoutSuccess: 'Logged out',
        accountActions: 'Account actions',
        faceUpdated1: 'Face updated successfully',
        registerDevice: 'Register Biometric Device',
        changeDevice: 'Change Biometric Device',
        updateFace: 'Update Face Recognition',
        biometricRequired: 'Biometric Device Required',
        biometricNotRegistered: 'You have not registered your biometric device yet. Please register your device to enable biometric verification.',
        biometricRegistrationSuccess: 'Biometric device registered successfully!',
        biometricRegistrationFailed: 'Biometric device registration failed.',
        deviceAlreadyInUse: 'The device is already in use by someone else',
        currentPasswordRequired: 'Please enter your current password',
        newPasswordRequired: 'Please enter a new password',
        confirmPasswordRequired: 'Please confirm your new password',
        passwordMinLength: 'Password must be at least 8 characters',
        passwordChangeFailed: 'Failed to change password',
        registerLater: 'Register Later',
        fetchError: 'Failed to fetch data. Please try again.',

        active: 'Active',
        ended: 'Ended',
        sessionLive: 'Session is live',
        sessionFinished: 'Session finished',
        validationMethodsLabel: 'Validation Methods',
        scannedStudents: 'Scanned Students',
        addAttendee: 'Add attendee',
        exportLabel: 'Export',
        refreshLabel: 'Refresh',
        endSession: 'End Session',
        loadingUsers: 'Loading checked-in users...',
        noAttendees: 'No attendees yet',
        removeAttendee: 'Remove attendee',
        attendeeAdded: 'Attendee added successfully.',
        addAttendeeModalTitle: 'Add attendee',
        attendeeEmailPlaceholder: 'student@example.com',
        endSessionConfirmTitle: 'End session?',
        endSessionConfirm: 'End Session',
        endSessionDescription: 'QR/code attendance will stop after ending the session. Participants will no longer be able to check in using this session.',
        expandQR: 'Expand QR',
        waitingForToken: 'Waiting for backend QR token...',
        sessionNotFound: 'Session not found',
        goToSessions: 'Go to Sessions',

        // Attendance
        scanQRCode: 'Scan QR Code',
        scanQRDescription: 'Scan a session QR code to mark your attendance.',
        openCamera: 'Open Camera',
        enterSessionCode: 'Enter Session Code',
        enterCodeDesc: 'Enter session ID and code to mark attendance.',
        attendedSessions: 'Attended Sessions',
        noAttendedSessions: 'No attended sessions yet',
        noAttendedDescription: 'You have not attended any sessions yet.',
        owner: 'Owner',
        attendedAt: 'Attended',
        loadingHistory: 'Loading attendance history...',
        submittingAttendance: 'Submitting attendance...',
        qrAttendanceSubmitted: 'Attendance submitted via QR!',
        attendanceSubmitted: 'Attendance submitted!',
        biometricDeviceRequired: 'Biometric Device Required',
        biometricDeviceRequiredDesc: 'You must register this device with your biometrics before you can mark attendance.',
        registerDeviceButton: 'Register Device',

        // Verification
        locationVerification: 'Location Verification',
        gettingLocation: 'Getting your location…',
        yourLocation: 'Your location',
        withinAllowed: 'You are within the allowed area',
        outsideAllowed: 'You are outside the allowed area',
        distanceFromCenter: 'Distance from center',
        proceedToSession: 'Proceed to session',
        locationError: 'Failed to get your location',
        sessionNotFoundError: 'Session not found',

        // Tour
        'tour.welcome': 'Welcome to the Attendance System!',
        'tour.step1': 'Here you can quickly create a new session, scan QR to mark attendance, or view your sessions.',
        'tour.step2': 'Click "Create Session" to set up a new session. You can choose QR or code-based check-in, enable geolocation, and face recognition.',
        'tour.step3': 'Use "Scan QR" to quickly check in by scanning a session QR code.',
        'tour.step4': 'Go to "Sessions" to see all your created sessions and their attendance records.',
        'tour.step5': 'You can manage your profile, change password, register biometric device, and update face recognition from the profile page (click the avatar in the top right).',
        'tour.finish': 'You’re all set! Explore the app and start managing attendance.',
    },
    ru: {
        // Навигация
        dashboard: 'Панель',
        attendance: 'Посещаемость',
        sessions: 'Сессии',
        profile: 'Профиль',
        logout: 'Выйти',

        // Общие
        back: 'Назад',
        add: 'Добавить',
        cancel: 'Отмена',
        submit: 'Отправить',
        save: 'Сохранить',
        edit: 'Редактировать',
        delete: 'Удалить',
        close: 'Закрыть',
        remove: 'Убрать',
        ok: 'ОК',
        loading: 'Загрузка...',
        unavailable: 'Недоступно',
        participants: 'Участники',
        open: 'Открыть',
        view: 'Просмотр',
        create: 'Создать',
        retry: 'Повторить',
        next: 'Далее',
        finish: 'Завершить',
        enabled: 'Включено',
        disabled: 'Отключено',
        nA: 'Н/Д',

        // Аутентификация
        login: 'Вход',
        register: 'Регистрация',
        emailPlaceholder: 'name@innopolis.university',
        passwordPlaceholder: 'пароль',
        emailInvalid: 'Почта должна быть @innopolis.ru или @innopolis.university',
        emailLowercase: 'Почта — в нижнем регистре и без пробелов',
        emailEmpty: 'Почта не может быть пустой',
        passwordEmpty: 'Пароль не может быть пустым',
        passwordMin: 'Пароль должен быть не короче 8 символов',
        passwordDigit: 'Пароль должен содержать хотя бы одну цифру',
        passwordLower: 'Пароль должен содержать хотя бы одну строчную букву',
        passwordUpper: 'Пароль должен содержать хотя бы одну заглавную букву',
        passwordSpecial: 'Пароль должен содержать спецсимвол',
        loginFailed: 'Не удалось войти',
        registerFailed: 'Не удалось зарегистрироваться',

        // Сессии/создание
        newSession: 'Новая сессия',
        sessionDetails: 'Детали сессии',
        sessionCode: 'Код сессии',
        createSession: 'Создать сессию',
        sessionTitle: 'Название сессии',
        titleRequired: 'Введите название сессии.',
        titlePlaceholder: 'Напр., Лекция по машинному обучению',
        manageSessions: 'Создавайте и управляйте сессиями',
        noSessions: 'Пока нет сессий. Создайте первую, чтобы начать.',
        validationMethods: 'Методы подтверждения',
        gps: 'GPS',
        password: 'Пароль',
        faceRecShort: 'Распознавание лица',
        none: 'Нет',
        sessionId: 'ID сессии',
        sessionIdRequired: 'Введите ID сессии.',
        sessionIdPositive: 'ID сессии должен быть положительным числом.',
        sessionCodeLabel: 'Код сессии',
        sessionPasswordPlaceholder: 'Пароль сессии',
        submitCode: 'Отправить код',

        // Геолокация / карта
        enableGeolocation: 'Включить геолокацию',
        geolocationHelp: 'Ограничьте отметку присутствия физическим местом',
        limitByLocation: 'Ограничить по локации',
        onlyNearCheckIn: 'Отметиться смогут только рядом с выбранной точкой',
        allowedRadius: 'Допустимый радиус',
        radiusRequired: 'Укажите допустимый радиус.',
        radiusMin: 'Радиус должен быть положительным числом.',
        meters: 'метров',
        sessionLocation: 'Местоположение сессии',
        getLocation: 'Получить локацию',
        locationSet: 'Локация установлена!',
        locationPermissionError: 'Не удалось получить локацию. Предоставьте разрешение.',
        pleaseSetLocation: 'Сначала укажите местоположение.',
        checkInMethod: 'Способ отметки',
        scanQR: 'Сканировать QR',
        codeExtra: 'Участники могут использовать этот код для входа.',
        codePlaceholder: 'Введите пароль',
        useDeviceLocation: 'Моё местоположение',
        pickOnMap: 'Выбрать на карте',
        locationNotSet: 'Локация не задана — используйте своё местоположение или выберите на карте.',
        pickLocation: 'Выбор локации',
        mapHint: 'Перетащите маркер или кликните по карте, чтобы выбрать центр.',
        allowedRadiusShort: 'Радиус',
        metersShort: 'м',
        done: 'Готово',
        locationLabel: 'Местоположение',          // <-- единственное определение
        radiusLabel: 'Радиус',                    // <-- единственное определение
        adjustLocation: 'Изменить на карте',
        acquiringLocation: 'Получаем местоположение...',
        adjustLocationTitle: 'Выбор местоположения',
        selectPointOnMap: 'Выберите точку на карте',
        gpsValidation: 'Геолокация',
        passwordValidation: 'Кодовое слово',
        faceValidation: 'Распознавание лица',
        noValidation: 'Без дополнительной проверки',
        geolocationLabel: 'Геолокация',           // <-- единственное определение
        geolocationRequired: 'Для этой сессии требуется геолокация.',
        sessionLocationTitle: 'Местоположение сессии',

        // Распознавание лица
        faceRecognition: 'Требовать распознавание лица',
        faceRecognitionHelp: 'Студенты должны отсканировать лицо для отметки посещаемости',
        faceRegistrationRequired: 'Требуется регистрация лица',
        faceRegistrationRequiredDescription: 'Вы еще не зарегистрировали свой вектор лица. Пожалуйста, зарегистрируйте лицо для входа по распознаванию.',
        registerFace: 'Зарегистрировать лицо',
        faceRegisteredSuccess: 'Лицо успешно зарегистрировано!',
        faceUpdated: 'Лицо успешно обновлено',
        faceVerificationRequired: 'Требуется проверка лица',
        verifyingFace: 'Проверка лица...',
        verifyingFaceDescription: 'Пожалуйста, подождите, пока мы сверим ваше лицо с зарегистрированными данными.',
        faceVerified: 'Лицо подтверждено!',
        faceAttendanceSuccess: 'Посещаемость успешно отмечена.',
        continue: 'Продолжить',
        faceVerificationFailed: 'Проверка лица не удалась',
        faceNotRecognized: 'Лицо не распознано. Попробуйте снова.',
        tryAgain: 'Попробовать снова',

        // Дашборд
        hello: 'Привет',
        quickActions: 'Быстрые действия',
        sessionsCreated: 'Создано сессий',
        sessionsAttended: 'Посещено сессий',
        startSession: 'Начать сессию',
        markAttendance: 'Отметить посещаемость',
        reviewRecords: 'Просмотр записей',

        // Профиль
        profileTitle: 'Профиль',
        changePassword: 'Сменить пароль',
        currentPassword: 'Текущий пароль',
        newPassword: 'Новый пароль',
        confirmPassword: 'Подтвердите пароль',
        passwordMismatch: 'Пароли не совпадают',
        passwordChanged: 'Пароль успешно изменен',
        logoutSuccess: 'Вы вышли из системы',
        accountActions: 'Действия с аккаунтом',
        faceUpdated1: 'Лицо успешно обновлено',
        registerDevice: 'Зарегистрировать биометрическое устройство',
        changeDevice: 'Сменить биометрическое устройство',
        updateFace: 'Обновить распознавание лица',
        biometricRequired: 'Требуется биометрическое устройство',
        biometricNotRegistered: 'Вы еще не зарегистрировали биометрическое устройство. Пожалуйста, зарегистрируйте его для включения биометрической проверки.',
        biometricRegistrationSuccess: 'Биометрическое устройство успешно зарегистрировано!',
        biometricRegistrationFailed: 'Не удалось зарегистрировать биометрическое устройство.',
        deviceAlreadyInUse: 'Устройство уже используется другим пользователем',
        currentPasswordRequired: 'Введите текущий пароль',
        newPasswordRequired: 'Введите новый пароль',
        confirmPasswordRequired: 'Подтвердите новый пароль',
        passwordMinLength: 'Пароль должен содержать не менее 8 символов',
        passwordChangeFailed: 'Не удалось изменить пароль',
        registerLater: 'Зарегистрировать позже',
        fetchError: 'Не удалось загрузить данные. Попробуйте снова.',

        // ActiveSession (без дублей locationLabel, radiusLabel, geolocationLabel)
        active: 'Активна',
        ended: 'Завершена',
        sessionLive: 'Сессия активна',
        sessionFinished: 'Сессия завершена',
        validationMethodsLabel: 'Методы проверки',
        // locationLabel, radiusLabel, geolocationLabel уже определены выше
        scannedStudents: 'Отметившиеся студенты',
        addAttendee: 'Добавить участника',
        exportLabel: 'Экспорт',
        refreshLabel: 'Обновить',
        endSession: 'Завершить сессию',
        loadingUsers: 'Загрузка отметившихся...',
        noAttendees: 'Пока нет участников',
        removeAttendee: 'Удалить участника',
        attendeeAdded: 'Участник успешно добавлен.',
        addAttendeeModalTitle: 'Добавить участника',
        attendeeEmailPlaceholder: 'student@example.com',
        endSessionConfirmTitle: 'Завершить сессию?',
        endSessionConfirm: 'Завершить сессию',
        endSessionDescription: 'После завершения сессии отметка по QR/коду будет недоступна. Участники больше не смогут отметиться.',
        expandQR: 'Развернуть QR',
        waitingForToken: 'Ожидание QR-токена от сервера...',
        sessionNotFound: 'Сессия не найдена',
        goToSessions: 'К сессиям',

        // Attendance
        scanQRCode: 'Сканировать QR-код',
        scanQRDescription: 'Отсканируйте QR-код сессии, чтобы отметиться.',
        openCamera: 'Открыть камеру',
        enterSessionCode: 'Ввести код сессии',
        enterCodeDesc: 'Введите ID сессии и код для отметки.',
        attendedSessions: 'Посещённые сессии',
        noAttendedSessions: 'Нет посещённых сессий',
        noAttendedDescription: 'Вы ещё не посещали ни одной сессии.',
        owner: 'Владелец',
        attendedAt: 'Посещено',
        loadingHistory: 'Загрузка истории посещений...',
        submittingAttendance: 'Отправка отметки...',
        qrAttendanceSubmitted: 'Отметка по QR отправлена!',
        attendanceSubmitted: 'Отметка отправлена!',
        biometricDeviceRequired: 'Требуется биометрическое устройство',
        biometricDeviceRequiredDesc: 'Вы должны зарегистрировать это устройство с вашей биометрией, прежде чем сможете отмечать посещаемость.',
        registerDeviceButton: 'Зарегистрировать устройство',

        // Verification
        locationVerification: 'Проверка локации',
        gettingLocation: 'Получаем вашу локацию…',
        yourLocation: 'Ваша локация',
        withinAllowed: 'Вы находитесь в допустимой зоне',
        outsideAllowed: 'Вы вне допуска',
        distanceFromCenter: 'Расстояние от центра',
        proceedToSession: 'Перейти к сессии',
        locationError: 'Не удалось получить вашу локацию',
        sessionNotFoundError: 'Сессия не найдена',

        // Tour
        'tour.welcome': 'Добро пожаловать в систему учёта посещаемости!',
        'tour.step1': 'Здесь вы можете быстро создать новую сессию, отсканировать QR для отметки или просмотреть свои сессии.',
        'tour.step2': 'Нажмите "Создать сессию", чтобы настроить новую сессию. Вы можете выбрать отметку по QR или коду, включить геолокацию и распознавание лица.',
        'tour.step3': 'Используйте "Сканировать QR" для быстрой отметки по QR-коду сессии.',
        'tour.step4': 'Перейдите в "Сессии", чтобы увидеть все созданные вами сессии и записи посещаемости.',
        'tour.step5': 'Управляйте своим профилем, меняйте пароль, регистрируйте биометрическое устройство и обновляйте распознавание лица на странице профиля (нажмите на аватар в правом верхнем углу).',
        'tour.finish': 'Всё готово! Изучайте приложение и начинайте управлять посещаемостью.',
    },
};

export function ThemeProvider({ children }: { children: ReactNode }) {
    const [language, setLanguageState] = useState<Language>(() => {
        const saved = localStorage.getItem('language') as Language | null;
        return saved === 'ru' ? 'ru' : 'en';
    });

    const [theme, setTheme] = useState<Theme>(() => {
        const saved = localStorage.getItem('theme') as Theme | null;
        return saved === 'dark' ? 'dark' : 'light';
    });

    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme);
        document.documentElement.style.scrollBehavior = 'auto';
        document.documentElement.style.scrollbarGutter = 'stable';
        localStorage.setItem('theme', theme);
    }, [theme]);

    useEffect(() => {
        localStorage.setItem('language', language);
        document.documentElement.lang = language;
    }, [language]);

    const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
    const setLanguage = (lang: Language) => setLanguageState(lang);

    const dict = translations[language];

    const t = useMemo(
        () => (key: string) => dict[key] ?? key,
        [dict]
    );

    const value: ThemeContextType = {
        theme,
        toggleTheme,
        language,
        setLanguage,
        t,
    };

    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextType {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
}
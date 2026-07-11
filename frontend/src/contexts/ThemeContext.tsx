import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { ConfigProvider, theme as antdTheme } from 'antd';

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
        attendeeRemoved: 'Attendee removed.',
        name: 'Name',
        actions: 'Actions',
        login: 'Login',
        register: 'Register',
        password: 'Password',
        unavailable: 'Unavailable',
        retry: 'Retry',
        updateFace: 'Update Face',
        faceUpdated: 'Face updated successfully',
        faceRegistrationRequired: 'Face Registration Required',
        faceRegistrationRequiredDescription: 'You have not registered your face yet. Please register your face to enable face recognition check-in.',
        registerFace: 'Register Face',
        faceRegistration: 'Face Registration',
        faceRegistrationIntro: 'Before you start using SPOT, please complete the required face scan. The camera will start automatically after liveness verification.',
        faceVerified: 'Face Verified!',
        faceVerificationFailed: 'Face Verification Failed',
        faceRegisteredSuccess: 'Your face has been successfully registered.',
        faceRetryHint: 'Please try again or ensure good lighting.',
        retakePhotos: 'Retake Photos',
        loadingLivenessModel: 'Loading liveness detection model...',
        livenessModelFailed: 'Failed to load liveness detection model.',
        lookAtCameraMouthClosed: 'Please look at the camera with mouth closed',
        openYourMouth: 'Now open your mouth!',
        livenessVerified: 'Liveness Verified!',
        livenessFailed: 'Liveness Verification Failed',
        retryingInSeconds: 'Please try again. Retrying in {seconds} seconds...',
        capturingPhoto: 'Capturing photo...',
        capturingPhotoOf: 'Capturing photo {current} of {total}...',
        nextPhotoInSeconds: 'Next photo in 3 seconds... ({current} of {total})',
        submittingToServer: 'Submitting to server...',
        capturingPhotos: 'Capturing photos...',
        sendingVerificationRequest: 'Sending verification request...',
        processing: 'Processing...',
        failedCapturePhotos: 'Failed to capture photos.',
        faceVerificationRequired: 'Face Verification Required',
        verifyingFace: 'Verifying Face...',
        verifyingFaceDescription: 'We are extracting your face embedding and validating attendance. Please wait.',
        faceAttendanceSuccess: 'Your face was successfully matched and attendance registered.',
        faceNotRecognized: 'Face not recognized.',
        tryAgain: 'Try Again',
        attendanceSubmitted: 'Attendance submitted',
        qrAttendanceSubmitted: 'QR attendance submitted',
        attendanceSubmittedSuccess: 'Attendance submitted successfully!',
        submittingAttendance: 'Submitting attendance...',
        sessionId: 'Session ID',
        sessionIdRequired: 'Please enter a session ID.',
        sessionIdPositive: 'Session ID must be a positive integer.',
        sessionCodeRequired: 'Please enter a session code.',
        sessionPasswordPlaceholder: 'Session password',
        qrNoToken: 'QR code did not contain a token.',
        getLocation: 'Get Location',
        locating: 'Locating...',
        locationAcquired: 'Location acquired!',
        locationPermissionError: 'Failed to get location. Please check browser permissions.',
        geolocationUnsupported: 'Geolocation is not supported by your browser.',
        sessionMode: 'Session Mode',
        sessionModeRequired: 'Please choose a session mode.',
        qrCodeSession: 'QR Code session',
        codeWordSession: 'Code Word session',
        titleRequired: 'Please enter a session title.',
        titlePlaceholder: 'e.g. Machine Learning Lecture',
        pleaseSetLocation: 'Please set your location first.',
        sessionCreated: 'Session created successfully!',
        createFailed: 'Failed to create session',
        radiusRequired: 'Please enter an allowed radius.',
        radiusMin: 'Radius must be a positive number.',
        locationSet: 'Location set!',
        locationPreview: 'Location preview',
        requireFaceRecognition: 'Require Face Recognition',
        faceRecognitionHelp: 'Students must scan their face to mark attendance.',
        codeExtra: 'Participants can use this code to join.',
        codePlaceholder: 'Enter password',
        validationMethods: 'Validation Methods',
        passwordValidation: 'Password',
        faceRecognition: 'Face Recognition',
        none: 'None',
        ended: 'Ended',
        sessionFinished: 'Session finished',
        validationMethodsLabel: 'Validation Methods',
        radius: 'Radius',
        addAttendee: 'Add attendee',
        refresh: 'Refresh',
        endSession: 'End Session',
        endSessionConfirm: 'Are you sure you want to end this session?',
        yes: 'Yes',
        no: 'No',
        checkedInUsersLoading: 'Loading checked-in users...',
        waitingQrToken: 'Waiting for backend QR token...',
        expandQr: 'Expand QR',
        expandMap: 'Expand Map',
        sessionEnded: 'Session ended',
        radiusUpdated: 'Radius updated',
        validRadiusRequired: 'Please enter a valid radius',
        validEmailRequired: 'Enter a valid email address.',
        passwordCurrentRequired: 'Please enter your current password',
        passwordNewRequired: 'Please enter a new password',
        passwordMinLength: 'Password must be at least 8 characters',
        passwordConfirmRequired: 'Please confirm your new password',
        changePasswordFailed: 'Failed to change password',
        emailRequired: 'Email cannot be empty',
        emailFormatInvalid: 'Email must be in lowercase and contain no spaces',
        emailDomainInvalid: 'Email must belong to @innopolis.ru or @innopolis.university',
        passwordRequired: 'Password cannot be empty',
        passwordDigitRequired: 'Password must contain at least one digit',
        passwordLowerRequired: 'Password must contain at least one lowercase letter',
        passwordUpperRequired: 'Password must contain at least one uppercase letter',
        passwordSpecialRequired: 'Password must contain at least one special character',
        loginFailed: 'Login failed',
        registrationFailed: 'Registration failed',
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
        continue: 'Продолжить',

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
        attendeeRemoved: 'Участник удалён.',
        name: 'Имя',
        actions: 'Действия',
        login: 'Войти',
        register: 'Зарегистрироваться',
        password: 'Пароль',
        unavailable: 'Недоступно',
        retry: 'Повторить',
        updateFace: 'Обновить лицо',
        faceUpdated: 'Лицо успешно обновлено',
        faceRegistrationRequired: 'Требуется регистрация лица',
        faceRegistrationRequiredDescription: 'Вы ещё не зарегистрировали лицо. Зарегистрируйте его, чтобы использовать отметку по распознаванию лица.',
        registerFace: 'Зарегистрировать лицо',
        faceRegistration: 'Регистрация лица',
        faceRegistrationIntro: 'Перед началом работы в SPOT необходимо пройти сканирование лица. Камера запустится автоматически после проверки живости.',
        faceVerified: 'Лицо подтверждено!',
        faceVerificationFailed: 'Проверка лица не пройдена',
        faceRegisteredSuccess: 'Ваше лицо успешно зарегистрировано.',
        faceRetryHint: 'Попробуйте ещё раз или проверьте освещение.',
        retakePhotos: 'Переснять фото',
        loadingLivenessModel: 'Загрузка модели проверки живости...',
        livenessModelFailed: 'Не удалось загрузить модель проверки живости.',
        lookAtCameraMouthClosed: 'Посмотрите в камеру с закрытым ртом',
        openYourMouth: 'Теперь откройте рот!',
        livenessVerified: 'Живость подтверждена!',
        livenessFailed: 'Проверка живости не пройдена',
        retryingInSeconds: 'Попробуйте ещё раз. Повтор через {seconds} сек.',
        capturingPhoto: 'Снимаем фото...',
        capturingPhotoOf: 'Снимаем фото {current} из {total}...',
        nextPhotoInSeconds: 'Следующее фото через 3 секунды... ({current} из {total})',
        submittingToServer: 'Отправка на сервер...',
        capturingPhotos: 'Снимаем фото...',
        sendingVerificationRequest: 'Отправка запроса на проверку...',
        processing: 'Обработка...',
        failedCapturePhotos: 'Не удалось сделать фото.',
        faceVerificationRequired: 'Требуется проверка лица',
        verifyingFace: 'Проверяем лицо...',
        verifyingFaceDescription: 'Мы извлекаем embedding лица и подтверждаем посещаемость. Пожалуйста, подождите.',
        faceAttendanceSuccess: 'Лицо успешно сопоставлено, посещаемость отмечена.',
        faceNotRecognized: 'Лицо не распознано.',
        tryAgain: 'Попробовать снова',
        attendanceSubmitted: 'Посещаемость отмечена',
        qrAttendanceSubmitted: 'Посещаемость по QR отмечена',
        attendanceSubmittedSuccess: 'Посещаемость успешно отмечена!',
        submittingAttendance: 'Отправка посещаемости...',
        sessionId: 'ID сессии',
        sessionIdRequired: 'Введите ID сессии.',
        sessionIdPositive: 'ID сессии должен быть положительным целым числом.',
        sessionCodeRequired: 'Введите код сессии.',
        sessionPasswordPlaceholder: 'Пароль сессии',
        qrNoToken: 'QR-код не содержит токен.',
        getLocation: 'Получить геолокацию',
        locating: 'Определение...',
        locationAcquired: 'Геолокация получена!',
        locationPermissionError: 'Не удалось получить геолокацию. Проверьте разрешения браузера.',
        geolocationUnsupported: 'Геолокация не поддерживается вашим браузером.',
        sessionMode: 'Режим сессии',
        sessionModeRequired: 'Выберите режим сессии.',
        qrCodeSession: 'Сессия с QR-кодом',
        codeWordSession: 'Сессия с кодовым словом',
        titleRequired: 'Введите название сессии.',
        titlePlaceholder: 'например, лекция по машинному обучению',
        pleaseSetLocation: 'Сначала укажите местоположение.',
        sessionCreated: 'Сессия успешно создана!',
        createFailed: 'Не удалось создать сессию',
        radiusRequired: 'Введите разрешённый радиус.',
        radiusMin: 'Радиус должен быть положительным числом.',
        locationSet: 'Местоположение задано!',
        locationPreview: 'Предпросмотр местоположения',
        requireFaceRecognition: 'Требовать распознавание лица',
        faceRecognitionHelp: 'Студенты должны просканировать лицо, чтобы отметиться.',
        codeExtra: 'Участники смогут использовать этот код для входа.',
        codePlaceholder: 'Введите пароль',
        validationMethods: 'Методы проверки',
        passwordValidation: 'Пароль',
        faceRecognition: 'Распознавание лица',
        none: 'Нет',
        ended: 'Завершена',
        sessionFinished: 'Сессия завершена',
        validationMethodsLabel: 'Методы проверки',
        radius: 'Радиус',
        addAttendee: 'Добавить участника',
        refresh: 'Обновить',
        endSession: 'Завершить сессию',
        endSessionConfirm: 'Вы уверены, что хотите завершить эту сессию?',
        yes: 'Да',
        no: 'Нет',
        checkedInUsersLoading: 'Загрузка отметившихся пользователей...',
        waitingQrToken: 'Ожидание QR-токена от сервера...',
        expandQr: 'Развернуть QR',
        expandMap: 'Развернуть карту',
        sessionEnded: 'Сессия завершена',
        radiusUpdated: 'Радиус обновлён',
        validRadiusRequired: 'Введите корректный радиус',
        validEmailRequired: 'Введите корректный email.',
        passwordCurrentRequired: 'Введите текущий пароль',
        passwordNewRequired: 'Введите новый пароль',
        passwordMinLength: 'Пароль должен быть не короче 8 символов',
        passwordConfirmRequired: 'Подтвердите новый пароль',
        changePasswordFailed: 'Не удалось изменить пароль',
        emailRequired: 'Email не может быть пустым',
        emailFormatInvalid: 'Email должен быть в нижнем регистре и без пробелов',
        emailDomainInvalid: 'Email должен относиться к @innopolis.ru или @innopolis.university',
        passwordRequired: 'Пароль не может быть пустым',
        passwordDigitRequired: 'Пароль должен содержать хотя бы одну цифру',
        passwordLowerRequired: 'Пароль должен содержать хотя бы одну строчную букву',
        passwordUpperRequired: 'Пароль должен содержать хотя бы одну заглавную букву',
        passwordSpecialRequired: 'Пароль должен содержать хотя бы один специальный символ',
        loginFailed: 'Не удалось войти',
        registrationFailed: 'Не удалось зарегистрироваться',
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
            <ConfigProvider 
                theme={{ 
                    algorithm: theme === 'dark' ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
                    token: {
                        colorPrimary: '#5ec832',
                        ...(theme === 'dark' ? {
                            colorBgBase: '#0f172a',
                            colorBgElevated: '#1e293b',
                            colorTextBase: '#f1f5f9',
                            colorBorder: '#334155',
                            colorBgContainer: '#2d3748',
                        } : {})
                    }
                }}
            >
                {children}
            </ConfigProvider>
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
    return ctx;
};

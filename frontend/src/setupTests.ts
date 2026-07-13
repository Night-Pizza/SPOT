import { vi } from 'vitest';
import '@testing-library/jest-dom';

// Используем window вместо global
Object.defineProperty(window, 'ResizeObserver', {
  writable: true,
  configurable: true,
  value: vi.fn().mockImplementation(() => ({
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  })),
});

const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value.toString();
    },
    clear: () => {
      store = {};
    },
    removeItem: (key: string) => {
      delete store[key];
    },
  };
})();

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
  writable: true,
});

vi.mock('./contexts/ThemeContext', () => {
  const enTranslations: Record<string, string> = {
    dashboard: 'Dashboard',
    attendance: 'Attendance',
    sessions: 'Sessions',
    profile: 'Profile',
    loading: 'Loading...',
    cancel: 'Cancel',
    continue: 'Continue',
    faceVerified: 'Face Verified!',
    faceVerificationFailed: 'Face Verification Failed',
    faceRegisteredSuccess: 'Your face has been successfully registered.',
    faceRetryHint: 'Please try again or ensure good lighting.',
    retakePhotos: 'Retake Photos',
    loadingLivenessModel: 'Loading liveness detection model...',
    livenessVerified: 'Liveness Verified!',
    livenessFailed: 'Liveness Verification Failed',
    scanQRCode: 'Scan QR Code',
    submittingAttendance: 'Submitting attendance...',
    faceVerificationRequired: 'Face Verification Required',
    verifyingFace: 'Verifying Face...',
    verifyingFaceDescription: 'We are extracting your face embedding and validating attendance. Please wait.',
    faceAttendanceSuccess: 'Your face was successfully matched and attendance registered.',
    faceNotRecognized: 'Face not recognized.',
    tryAgain: 'Try Again',
    retry: 'Retry',
    lookAtCameraMouthClosed: 'Please look at the camera with mouth closed',
    getLocation: 'Get Location',
    locating: 'Locating...',
    locationAcquired: 'Location acquired!',
    locationPermissionError: 'Failed to get location. Please check browser permissions.'
  };

  return {
    ThemeProvider: ({ children }: any) => children,
    useTheme: () => ({
      t: (key: string) => enTranslations[key] || key,
      theme: 'light',
      setLanguage: vi.fn(),
      setTheme: vi.fn(),
      toggleTheme: vi.fn(),
      language: 'en',
    }),
  };
});
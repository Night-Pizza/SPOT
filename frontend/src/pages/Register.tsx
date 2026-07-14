import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../api/Authentification';
import { useAuth } from '../contexts/AuthContext';

function validateEmail(email: string): string | null {
    if (!email) return 'Email cannot be empty';
    if (email.includes(' ') || email !== email.toLowerCase()) return 'Email must be in lowercase and contain no spaces';
    if (email.endsWith('@innopolis.ru') || email.endsWith('@innopolis.university')) return 'Innopolis emails must use SSO to log in or register';
    return null;
}

function validatePassword(password: string): string | null {
    if (!password) {
        return 'Password cannot be empty';
    }

    if (password.trim().length < 8) {
        return 'Password must be at least 8 characters long';
    }

    if (!/[0-9]/.test(password)) {
        return 'Password must contain at least one digit';
    }

    if (!/[a-zа-яё]/.test(password)) {
        return 'Password must contain at least one lowercase letter';
    }

    if (!/[A-ZА-ЯЁ]/.test(password)) {
        return 'Password must contain at least one uppercase letter';
    }

    if (!/[@#$%^&+=!*~_\-?]/.test(password)) {
        return 'Password must contain at least one special character';
    }

    return null;
}

export default function RegisterPage() {
    const navigate = useNavigate();
    const { setAuthenticatedUser } = useAuth();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [loading, setLoading] = useState(false);

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        setErrorMessage('');

        const emailError = validateEmail(email);
        if (emailError) { setErrorMessage(emailError); return; }

        const passwordError = validatePassword(password);
        if (passwordError) { setErrorMessage(passwordError); return; }

        setLoading(true);
        try {
            const user = await registerUser({ email, password });
            setAuthenticatedUser(user);

            navigate('/dashboard');
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : 'Registration failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-screen">
            <div className="auth-inner">
                <img src="/iu-logo.png" alt="Innopolis University" className="iu-logo" />
                <h1 className="auth-heading">Register</h1>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <input
                        className="auth-input"
                        type="email"
                        placeholder="name@example.com"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        required
                    />
                    <input
                        className="auth-input"
                        type="password"
                        placeholder="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        required
                    />
                    {errorMessage ? <p className="auth-error">{errorMessage}</p> : null}
                    <button className="auth-submit" type="submit" disabled={loading}>
                        {loading ? 'Loading...' : 'Register'}
                    </button>
                </form>
                <div className="auth-secondary-link">
                    <Link to="/login">Login</Link>
                </div>
            </div>
        </div>
    );
}

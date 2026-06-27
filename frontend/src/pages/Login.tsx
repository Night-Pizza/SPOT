import { type FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../api/Authentification';
import { useAuth } from '../contexts/AuthContext';

function validateEmail(email: string): string | null {
    if (!email) return 'Email cannot be empty';
    if (email.includes(' ') || email !== email.toLowerCase()) return 'Email must be in lowercase and contain no spaces';
    if (!email.endsWith('@innopolis.ru') && !email.endsWith('@innopolis.university')) return 'Email must belong to @innopolis.ru or @innopolis.university';
    return null;
}

export default function LoginPage() {
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

        setLoading(true);
        try {
            const user = await loginUser({ email, password });
            setAuthenticatedUser(user);
            navigate('/dashboard');
        } catch (error: unknown) {
            setErrorMessage(error instanceof Error ? error.message : 'Login failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="auth-screen">
            <div className="auth-inner">
                <img src="/iu-logo.png" alt="Innopolis University" className="iu-logo" />
                <h1 className="auth-heading">Login</h1>
                <form className="auth-form" onSubmit={handleSubmit}>
                    <input
                        className="auth-input"
                        type="email"
                        placeholder="name@innopolis.university"
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
                        {loading ? 'Loading...' : 'Login'}
                    </button>
                </form>
                <div className="auth-secondary-link">
                    <Link to="/register">Register</Link>
                </div>
            </div>
        </div>
    );
}

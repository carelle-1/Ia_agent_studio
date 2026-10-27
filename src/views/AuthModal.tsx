import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserRound,
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const inputClassName =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-[#17B9FF] focus:bg-white focus:ring-4 focus:ring-[#17B9FF]/10';

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    companyName: '',
    email: '',
    phone: '',
    password: '',
    passwordConfirm: '',
    country: 'France',
    city: 'Paris',
    preferredLanguage: 'fr',
  });

  if (!isOpen) return null;

  const changeMode = (nextMode: 'login' | 'register') => {
    setMode(nextMode);
    setErrorMsg('');
    setShowPassword(false);
  };

  const handleLoginSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsLoading(true);
    setErrorMsg('');
    const result = await login(loginEmail, loginPass);
    setIsLoading(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.error || 'Identifiants incorrects.');
    }
  };

  const handleRegisterSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg('');

    if (formData.password !== formData.passwordConfirm) {
      setErrorMsg('La confirmation du mot de passe ne correspond pas.');
      return;
    }

    setIsLoading(true);
    const result = await register(formData);
    setIsLoading(false);

    if (result.success) {
      onClose();
    } else {
      setErrorMsg(result.error || 'Erreur lors de la création du compte.');
    }
  };

  const updateFormField = (field: keyof typeof formData, value: string) => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  return (
    <div className="auth-screen-scrollbar fixed inset-0 z-50 overflow-y-auto bg-[#f8fafc] font-sans text-slate-900">
      <div className="mx-auto grid min-h-screen w-full max-w-[1440px] lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="relative hidden min-h-screen overflow-hidden bg-[#101827] px-12 py-10 text-white lg:flex lg:flex-col">
          <div className="pointer-events-none absolute -left-32 top-36 h-96 w-96 rounded-full bg-[#17B9FF]/25 blur-[100px]" />
          <div className="pointer-events-none absolute -right-24 bottom-12 h-96 w-96 rounded-full bg-[#FF4297]/25 blur-[110px]" />
          <div className="pointer-events-none absolute right-12 top-16 h-56 w-56 rounded-full bg-[#FFC000]/10 blur-[80px]" />

          <a href="/" aria-label="Meta Colab, accueil" className="relative z-10 inline-flex w-fit items-center">
            <img
              src="/assets/logo-white.png"
              alt="Meta Colab"
              className="h-12 w-auto object-contain"
            />
          </a>

          <div className="relative z-10 my-auto max-w-xl py-16">
            <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[0.06] px-4 py-2 text-xs font-semibold tracking-wide text-white/80">
              <Sparkles className="h-4 w-4 text-[#FFC000]" />
              Votre studio créatif augmenté par l’IA
            </span>
            <h1 className="text-5xl font-extrabold leading-[1.14] tracking-tight xl:text-6xl">
              Faites grandir votre marque.
              <span className="mt-2 block bg-gradient-to-r from-[#17B9FF] via-[#FF4297] to-[#FFC000] bg-clip-text text-transparent">
                L’IA vous accompagne.
              </span>
            </h1>
            <p className="mt-6 max-w-md text-base leading-7 text-slate-300">
              Imaginez, planifiez et pilotez vos contenus Facebook et Instagram depuis un espace
              pensé pour votre équipe.
            </p>

            <div className="mt-10 grid max-w-md grid-cols-3 gap-3">
              {[
                { value: '01', label: 'Créez votre agent', color: 'text-[#17B9FF]' },
                { value: '02', label: 'Préparez vos idées', color: 'text-[#FF4297]' },
                { value: '03', label: 'Gardez la main', color: 'text-[#FFC000]' },
              ].map((item) => (
                <div key={item.value} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4">
                  <span className={`text-xs font-extrabold ${item.color}`}>{item.value}</span>
                  <p className="mt-2 text-xs font-medium leading-5 text-slate-300">{item.label}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3 text-xs text-slate-400">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#17B9FF]/15 text-[#17B9FF]">
                <ShieldCheck className="h-5 w-5" />
              </span>
              <span>Vos publications restent sous votre validation.</span>
            </div>
          </div>

          <p className="relative z-10 text-xs text-slate-500">
            © {new Date().getFullYear()} Meta Colab · Votre espace de travail créatif
          </p>
        </aside>

        <main className="flex min-h-screen flex-col justify-center px-5 py-8 sm:px-10 lg:px-14 xl:px-20">
          <div className="mx-auto w-full max-w-[540px]">
            <div className="mb-8 flex items-center gap-3 lg:hidden">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[#17B9FF] via-[#FF4297] to-[#FFC000] shadow-lg shadow-[#FF4297]/20">
                <img src="/assets/logo-white.png" alt="" className="h-7 w-auto object-contain" />
              </span>
              <span className="text-lg font-extrabold tracking-tight text-slate-900">Meta Colab</span>
            </div>

            <div className="mb-8">
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-[#FF4297]">
                Bienvenue chez Meta Colab
              </p>
              <h2 className="text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
                {mode === 'login' ? 'Ravi de vous revoir.' : 'Votre aventure commence ici.'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-slate-500">
                {mode === 'login'
                  ? 'Connectez-vous pour retrouver votre espace de travail.'
                  : 'Créez votre compte et découvrez votre studio créatif.'}
              </p>
            </div>

            <div className="mb-6 grid grid-cols-2 rounded-2xl bg-slate-100 p-1.5">
              <button
                type="button"
                onClick={() => changeMode('login')}
                aria-pressed={mode === 'login'}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Se connecter
              </button>
              <button
                type="button"
                onClick={() => changeMode('register')}
                aria-pressed={mode === 'register'}
                className={`rounded-xl px-4 py-3 text-sm font-bold transition ${
                  mode === 'register'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Créer un compte
              </button>
            </div>

            {errorMsg && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {mode === 'login' ? (
              <form onSubmit={handleLoginSubmit} className="space-y-5">
                <div>
                  <label htmlFor="login-email" className="mb-2 block text-sm font-semibold text-slate-700">
                    Adresse e-mail
                  </label>
                  <div className="relative">
                    <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="vous@entreprise.fr"
                      value={loginEmail}
                      onChange={(event) => setLoginEmail(event.target.value)}
                      className={`${inputClassName} pl-11`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="login-password" className="mb-2 block text-sm font-semibold text-slate-700">
                    Mot de passe
                  </label>
                  <div className="relative">
                    <LockKeyhole className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      placeholder="Votre mot de passe"
                      value={loginPass}
                      onChange={(event) => setLoginPass(event.target.value)}
                      className={`${inputClassName} pl-11 pr-12`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((visible) => !visible)}
                      aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-slate-400 transition hover:text-slate-700"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#17B9FF] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#17B9FF]/20 transition hover:bg-[#079fe2] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Connexion en cours…' : 'Se connecter'}
                  {!isLoading && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />}
                </button>
              </form>
            ) : (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="register-first-name" className="mb-2 block text-sm font-semibold text-slate-700">
                      Prénom
                    </label>
                    <div className="relative">
                      <UserRound className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                      <input
                        id="register-first-name"
                        type="text"
                        autoComplete="given-name"
                        required
                        placeholder="Camille"
                        value={formData.firstName}
                        onChange={(event) => updateFormField('firstName', event.target.value)}
                        className={`${inputClassName} pl-11`}
                      />
                    </div>
                  </div>
                  <div>
                    <label htmlFor="register-last-name" className="mb-2 block text-sm font-semibold text-slate-700">
                      Nom
                    </label>
                    <input
                      id="register-last-name"
                      type="text"
                      autoComplete="family-name"
                      required
                      placeholder="Martin"
                      value={formData.lastName}
                      onChange={(event) => updateFormField('lastName', event.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="register-company" className="mb-2 block text-sm font-semibold text-slate-700">
                    Nom de l’entreprise
                  </label>
                  <input
                    id="register-company"
                    type="text"
                    autoComplete="organization"
                    required
                    placeholder="Studio Créatif"
                    value={formData.companyName}
                    onChange={(event) => updateFormField('companyName', event.target.value)}
                    className={inputClassName}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="register-email" className="mb-2 block text-sm font-semibold text-slate-700">
                      Adresse e-mail
                    </label>
                    <input
                      id="register-email"
                      type="email"
                      autoComplete="email"
                      required
                      placeholder="vous@entreprise.fr"
                      value={formData.email}
                      onChange={(event) => updateFormField('email', event.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="register-phone" className="mb-2 block text-sm font-semibold text-slate-700">
                      Téléphone <span className="font-normal text-slate-400">(facultatif)</span>
                    </label>
                    <input
                      id="register-phone"
                      type="tel"
                      autoComplete="tel"
                      placeholder="+33 6 00 00 00 00"
                      value={formData.phone}
                      onChange={(event) => updateFormField('phone', event.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="register-password" className="mb-2 block text-sm font-semibold text-slate-700">
                      Mot de passe
                    </label>
                    <input
                      id="register-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      placeholder="8 caractères minimum"
                      value={formData.password}
                      onChange={(event) => updateFormField('password', event.target.value)}
                      className={inputClassName}
                    />
                  </div>
                  <div>
                    <label htmlFor="register-password-confirm" className="mb-2 block text-sm font-semibold text-slate-700">
                      Confirmer le mot de passe
                    </label>
                    <input
                      id="register-password-confirm"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="new-password"
                      minLength={8}
                      required
                      placeholder="Répétez le mot de passe"
                      value={formData.passwordConfirm}
                      onChange={(event) => updateFormField('passwordConfirm', event.target.value)}
                      className={inputClassName}
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={showPassword}
                    onChange={(event) => setShowPassword(event.target.checked)}
                    className="h-4 w-4 rounded border-slate-300 accent-[#17B9FF]"
                  />
                  Afficher les mots de passe
                </label>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="group flex w-full items-center justify-center gap-2 rounded-xl bg-[#FF4297] px-5 py-3.5 text-sm font-bold text-white shadow-lg shadow-[#FF4297]/20 transition hover:bg-[#eb3185] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isLoading ? 'Création du compte…' : 'Créer mon compte'}
                  {!isLoading && <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />}
                </button>
                <p className="text-center text-xs leading-5 text-slate-400">
                  Un essai gratuit de 7 jours est inclus avec votre inscription.
                </p>
              </form>
            )}

            <div className="mt-8 flex items-center justify-center gap-2 border-t border-slate-100 pt-5 text-xs text-slate-400">
              <ShieldCheck className="h-4 w-4 text-[#17B9FF]" />
              Vos informations sont protégées et sécurisées.
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};

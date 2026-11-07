import React, { useState, useEffect } from 'react';
import { authService, EmailValidationResult, PasswordScore } from '../services/auth';
import { UserAccount } from '../types/tour';
import confetti from 'canvas-confetti';
import {
  X,
  Lock,
  Mail,
  User as UserIcon,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldAlert
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: UserAccount) => void;
  onOpenPrivacyPolicy: (tab?: 'policy' | 'consent' | 'rights') => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onOpenPrivacyPolicy
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Form Fields
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent152FZ, setConsent152FZ] = useState(false);

  // Validation States
  const [emailCheck, setEmailCheck] = useState<EmailValidationResult>({ isValid: true });
  const [nameError, setNameError] = useState<string | null>(null);
  const [pwdStrength, setPwdStrength] = useState<PasswordScore>(
    authService.checkPasswordStrength('')
  );
  const [confirmError, setConfirmError] = useState<string | null>(null);

  // General State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'error' | 'success'; message: string } | null>(null);

  // Real-time Email check
  useEffect(() => {
    if (!email) {
      setEmailCheck({ isValid: true });
      return;
    }
    const res = authService.validateEmail(email);
    setEmailCheck(res);
  }, [email]);

  // Real-time Name check
  useEffect(() => {
    if (mode === 'register' && fullName) {
      const res = authService.validateFullName(fullName);
      setNameError(res.isValid ? null : (res.error || null));
    } else {
      setNameError(null);
    }
  }, [fullName, mode]);

  // Real-time Password strength check
  useEffect(() => {
    setPwdStrength(authService.checkPasswordStrength(password));
    if (mode === 'register' && confirmPassword) {
      if (password !== confirmPassword) {
        setConfirmError('Пароли не совпадают');
      } else {
        setConfirmError(null);
      }
    } else {
      setConfirmError(null);
    }
  }, [password, confirmPassword, mode]);

  if (!isOpen) return null;

  const handleApplySuggestion = (suggested: string) => {
    setEmail(suggested);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    // Validate email
    const emailRes = authService.validateEmail(email);
    if (!emailRes.isValid) {
      setFormFeedback({ type: 'error', message: emailRes.error || 'Проверьте email' });
      return;
    }

    if (mode === 'register') {
      const nameRes = authService.validateFullName(fullName);
      if (!nameRes.isValid) {
        setFormFeedback({ type: 'error', message: nameRes.error || 'Проверьте имя' });
        return;
      }

      if (pwdStrength.score < 4) {
        setFormFeedback({
          type: 'error',
          message: 'Пароль должен соответствовать требованиям безопасности (не менее 4 критериев).'
        });
        return;
      }

      if (password !== confirmPassword) {
        setFormFeedback({ type: 'error', message: 'Введенные пароли не совпадают.' });
        return;
      }

      if (!consent152FZ) {
        setFormFeedback({
          type: 'error',
          message: 'В соответствии со ст. 9 ФЗ № 152-ФЗ необходимо подтвердить согласие на обработку персональных данных.'
        });
        return;
      }
    }

    setIsSubmitting(true);

    try {
      let user: UserAccount;
      if (mode === 'login') {
        user = await authService.login(email, password);
        setFormFeedback({ type: 'success', message: 'Авторизация выполнена успешно!' });
      } else {
        user = await authService.register(email, fullName, password, consent152FZ);
        setFormFeedback({ type: 'success', message: 'Регистрация инженера завершена!' });
        try {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.6 }
          });
        } catch {}
      }

      setTimeout(() => {
        setIsSubmitting(false);
        onSuccess(user);
        onClose();
      }, 700);
    } catch (err: any) {
      setIsSubmitting(false);
      setFormFeedback({
        type: 'error',
        message: err?.message || 'Не удалось выполнить операцию. Проверьте введенные данные.'
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 select-none animate-in fade-in duration-200">
      <div className="relative w-full max-w-md max-h-[92vh] overflow-y-auto bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl transition-all">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-5 right-5 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Tab Switcher */}
        <div className="flex bg-slate-100 dark:bg-slate-800/80 p-1 rounded-2xl mb-5">
          <button
            type="button"
            onClick={() => {
              setMode('login');
              setFormFeedback(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'login'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Вход в систему
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('register');
              setFormFeedback(null);
            }}
            className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all cursor-pointer ${
              mode === 'register'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-cyan-400 shadow-sm'
                : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Регистрация специалиста
          </button>
        </div>

        {/* Header Title */}
        <div className="mb-4">
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            {mode === 'login' ? 'Авторизация инженера' : 'Регистрация в цифровом двойнике'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {mode === 'login'
              ? 'Доступ к управлению моделированием и параметрам криогенных установок'
              : 'Создание подтвержденной учетной записи в соответствии с ФЗ № 152-ФЗ'}
          </p>
        </div>

        {/* Feedback Alert */}
        {formFeedback && (
          <div
            className={`p-3 rounded-xl mb-4 text-xs font-semibold flex items-center gap-2.5 ${
              formFeedback.type === 'error'
                ? 'bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
            }`}
          >
            {formFeedback.type === 'error' ? (
              <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
            ) : (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-500" />
            )}
            <span>{formFeedback.message}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          {/* Full Name (Registration only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                ФИО и должность специалиста
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Иванов Алексей Петрович"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
              {nameError && (
                <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {nameError}
                </p>
              )}
            </div>
          )}

          {/* Email with deep validation & typo correction */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Электронная почта
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="engineer@gazprom.ru"
                className={`w-full pl-9 pr-4 py-2.5 rounded-xl border text-sm text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-800 focus:outline-none transition-all ${
                  email && !emailCheck.isValid
                    ? 'border-red-400 focus:ring-2 focus:ring-red-500/30'
                    : 'border-slate-300 dark:border-slate-700 focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500'
                }`}
              />
            </div>

            {/* Error Message */}
            {email && !emailCheck.isValid && (
              <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> {emailCheck.error}
              </p>
            )}

            {/* Smart Typo Suggestion */}
            {emailCheck.suggestion && (
              <div className="mt-1.5 p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-900/60 flex items-center justify-between text-xs text-sky-800 dark:text-sky-300">
                <span className="truncate">
                  Возможно: <strong>{emailCheck.suggestion}</strong>?
                </span>
                <button
                  type="button"
                  onClick={() => handleApplySuggestion(emailCheck.suggestion!)}
                  className="ml-2 px-2 py-0.5 text-[10px] font-bold rounded-md bg-sky-600 text-white hover:bg-sky-700 cursor-pointer"
                >
                  Исправить
                </button>
              </div>
            )}
          </div>

          {/* Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Пароль
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>

            {/* Password Strength Checklist (Registration) */}
            {mode === 'register' && password && (
              <div className="mt-2.5 space-y-2">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-500 dark:text-slate-400">Сложность:</span>
                  <span style={{ color: pwdStrength.color }}>{pwdStrength.label}</span>
                </div>
                <div className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                  <div
                    className="h-full transition-all duration-300 rounded-full"
                    style={{
                      width: `${(pwdStrength.score / 5) * 100}%`,
                      backgroundColor: pwdStrength.color
                    }}
                  />
                </div>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-slate-500 dark:text-slate-400 pt-1">
                  <div className={`flex items-center gap-1 ${pwdStrength.hasMinLength ? 'text-emerald-500' : ''}`}>
                    <CheckCircle2 className="w-3 h-3" /> от 8 символов
                  </div>
                  <div className={`flex items-center gap-1 ${pwdStrength.hasUpper ? 'text-emerald-500' : ''}`}>
                    <CheckCircle2 className="w-3 h-3" /> заглавная буква
                  </div>
                  <div className={`flex items-center gap-1 ${pwdStrength.hasLower ? 'text-emerald-500' : ''}`}>
                    <CheckCircle2 className="w-3 h-3" /> строчная буква
                  </div>
                  <div className={`flex items-center gap-1 ${pwdStrength.hasNumber ? 'text-emerald-500' : ''}`}>
                    <CheckCircle2 className="w-3 h-3" /> цифра (0-9)
                  </div>
                  <div className={`flex items-center gap-1 ${pwdStrength.hasSpecial ? 'text-emerald-500' : ''}`}>
                    <CheckCircle2 className="w-3 h-3" /> спецсимвол (!@#$)
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password (Registration only) */}
          {mode === 'register' && (
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Подтверждение пароля
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500 transition-all"
                />
              </div>
              {confirmError && (
                <p className="text-[11px] font-medium text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {confirmError}
                </p>
              )}
            </div>
          )}

          {/* Mandatory 152-FZ Personal Data Consent Checkbox (Registration only, Art. 9 152-FZ) */}
          {mode === 'register' && (
            <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80">
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={consent152FZ}
                  onChange={(e) => setConsent152FZ(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer shrink-0"
                />
                <span className="text-[11px] leading-snug text-slate-600 dark:text-slate-300">
                  Я даю{' '}
                  <button
                    type="button"
                    onClick={() => onOpenPrivacyPolicy('consent')}
                    className="font-bold text-blue-600 dark:text-cyan-400 underline hover:text-blue-700 cursor-pointer"
                  >
                    согласие на обработку персональных данных
                  </button>{' '}
                  согласно ст. 9 <strong>ФЗ № 152-ФЗ «О персональных данных»</strong> и подтверждаю ознакомление с{' '}
                  <button
                    type="button"
                    onClick={() => onOpenPrivacyPolicy('policy')}
                    className="font-bold text-blue-600 dark:text-cyan-400 underline hover:text-blue-700 cursor-pointer"
                  >
                    Политикой обработки ПДн
                  </button>
                  .
                </span>
              </label>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (mode === 'register' && !consent152FZ)}
            className="w-full py-3 px-4 rounded-xl font-extrabold text-sm text-white bg-gradient-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-700 hover:to-sky-700 shadow-lg shadow-blue-500/25 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer mt-2"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Проверка учетных данных...
              </span>
            ) : (
              <>
                <span>{mode === 'login' ? 'Войти в аккаунт' : 'Зарегистрировать специалиста'}</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* 152-FZ Data Localization & Subject Rights Notice Footer */}
        <div className="mt-4 pt-3.5 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-2 text-[11px] text-slate-500 dark:text-slate-400">
          <span className="truncate">
            Локализация и криптозащита ПДн по <strong>ФЗ № 152-ФЗ (РФ)</strong>
          </span>
          <button
            type="button"
            onClick={() => onOpenPrivacyPolicy('policy')}
            className="font-bold text-blue-600 dark:text-cyan-400 hover:underline shrink-0 cursor-pointer"
          >
            Политика 152-ФЗ →
          </button>
        </div>
      </div>
    </div>
  );
};

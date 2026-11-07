/**
 * Secure Authentication & Validation Service
 * Comprehensive field validation, RFC-compliant email checks, typo corrections,
 * PBKDF2 password hashing, and user session management.
 */

import { UserAccount } from '../types/tour';
import { appCache } from './cache';

// Known common domain typo suggestions
const DOMAIN_TYPO_MAP: Record<string, string> = {
  'gmai.com': 'gmail.com',
  'gamil.com': 'gmail.com',
  'gmial.com': 'gmail.com',
  'gmaill.com': 'gmail.com',
  'yandx.ru': 'yandex.ru',
  'yandex.r': 'yandex.ru',
  'yandeks.ru': 'yandex.ru',
  'mail.r': 'mail.ru',
  'inbox.r': 'inbox.ru',
  'gazprom.r': 'gazprom.ru',
  'gazprom.con': 'gazprom.ru',
  'bk.r': 'bk.ru'
};

// Known temporary/disposable email providers
const DISPOSABLE_EMAIL_DOMAINS = new Set([
  'tempmail.com',
  'temp-mail.org',
  'mailinator.com',
  '10minutemail.com',
  'guerrillamail.com',
  'throwawaymail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getairmail.com'
]);

export interface EmailValidationResult {
  isValid: boolean;
  error?: string;
  suggestion?: string;
}

export interface PasswordScore {
  score: number; // 0 to 5
  hasMinLength: boolean;
  hasUpper: boolean;
  hasLower: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
  label: string;
  color: string;
}

interface StoredUserRecord {
  id: string;
  email: string;
  fullName: string;
  role: string;
  salt: string;
  passHash: string;
  registeredAt: string;
  consent152FZAt?: string;
  consentVersion?: string;
}

const USERS_STORAGE_KEY = 'gp_registered_users_v3';
const SESSION_STORAGE_KEY = 'gp_auth_session_v3';

// Built-in seed accounts
const SEED_ACCOUNTS = [
  {
    email: 'qwes.rev@gmail.com',
    password: 'Gazprom2026!Student',
    fullName: 'Алексей Ревякин',
    role: 'Инженер-исследователь'
  },
  {
    email: 'lead.engineer@gazprom.ru',
    password: 'Gazprom2026!Lead',
    fullName: 'Смирнов Дмитрий Васильевич',
    role: 'Главный технолог СПГ'
  },
  {
    email: 'operator.shift@gazprom.ru',
    password: 'Gazprom2026!Operator',
    fullName: 'Ковалева Елена Сергеевна',
    role: 'Старший оператор пульта'
  }
];

class AuthService {
  private currentUser: UserAccount | null = null;
  private isInitialized = false;

  constructor() {
    this.init();
  }

  private async init() {
    await this.seedDefaultAccounts();
    this.restoreSession();
    this.isInitialized = true;
  }

  /**
   * Validate Email with deep checks:
   * 1. RFC structure
   * 2. No invalid characters or spaces
   * 3. Disposable email domain detection
   * 4. Domain typo detection and smart suggestion
   */
  public validateEmail(email: string): EmailValidationResult {
    const trimmed = (email || '').trim().toLowerCase();

    if (!trimmed) {
      return { isValid: false, error: 'Введите адрес электронной почты' };
    }

    if (trimmed.length > 254) {
      return { isValid: false, error: 'Email слишком длинный (максимум 254 символа)' };
    }

    // Strict RFC 5322 standard compliant regex
    const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
    if (!emailRegex.test(trimmed)) {
      return { isValid: false, error: 'Некорректный формат email (пример: engineer@gazprom.ru)' };
    }

    const parts = trimmed.split('@');
    if (parts.length !== 2) {
      return { isValid: false, error: 'Email должен содержать один символ @' };
    }

    const domain = parts[1];

    // Check disposable domains
    if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) {
      return {
        isValid: false,
        error: 'Временные (одноразовые) email не поддерживаются. Укажите постоянный рабочий или личный адрес.'
      };
    }

    // Check TLD length
    const domainParts = domain.split('.');
    const tld = domainParts[domainParts.length - 1];
    if (tld.length < 2) {
      return { isValid: false, error: 'Укажите корректный домен верхнего уровня (.ru, .com и т.д.)' };
    }

    // Check typo suggestions
    let suggestion: string | undefined = undefined;
    if (DOMAIN_TYPO_MAP[domain]) {
      suggestion = `${parts[0]}@${DOMAIN_TYPO_MAP[domain]}`;
    }

    return { isValid: true, suggestion };
  }

  /**
   * Validate full name (First Name + Last Name)
   */
  public validateFullName(fullName: string): { isValid: boolean; error?: string } {
    const trimmed = (fullName || '').trim();
    if (!trimmed) {
      return { isValid: false, error: 'Введите ваше имя и фамилию' };
    }

    if (trimmed.length < 4) {
      return { isValid: false, error: 'Имя должно содержать не менее 4 символов' };
    }

    const words = trimmed.split(/\s+/).filter(Boolean);
    if (words.length < 2) {
      return { isValid: false, error: 'Пожалуйста, укажите имя и фамилию через пробел' };
    }

    // Allow Cyrillic, Latin, spaces, and hyphens
    const nameRegex = /^[a-zA-Zа-яА-ЯёЁ\s\-]+$/;
    if (!nameRegex.test(trimmed)) {
      return { isValid: false, error: 'Имя может содержать только буквы, пробел и дефис' };
    }

    return { isValid: true };
  }

  /**
   * Evaluate password complexity score and criteria
   */
  public checkPasswordStrength(password: string): PasswordScore {
    const pwd = password || '';
    const hasMinLength = pwd.length >= 8;
    const hasUpper = /[A-ZА-ЯЁ]/.test(pwd);
    const hasLower = /[a-zа-яё]/.test(pwd);
    const hasNumber = /\d/.test(pwd);
    const hasSpecial = /[!@#$%^&*(),.?":{}|<>\-_=+]/.test(pwd);

    let score = 0;
    if (hasMinLength) score++;
    if (hasUpper) score++;
    if (hasLower) score++;
    if (hasNumber) score++;
    if (hasSpecial) score++;

    const labels = [
      'Очень слабый',
      'Слабый пароль',
      'Средний уровень',
      'Хороший пароль',
      'Надежный пароль'
    ];
    const colors = [
      '#ef4444', // red
      '#f97316', // orange
      '#eab308', // yellow
      '#3b82f6', // blue
      '#10b981'  // emerald green
    ];

    return {
      score,
      hasMinLength,
      hasUpper,
      hasLower,
      hasNumber,
      hasSpecial,
      label: labels[Math.max(0, score - 1)] || 'Введите пароль',
      color: colors[Math.max(0, score - 1)] || '#64748b'
    };
  }

  /**
   * WebCrypto PBKDF2 Password Hashing
   */
  private async hashPassword(password: string, salt: string): Promise<string> {
    const enc = new TextEncoder();
    const keyMaterial = await window.crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      { name: 'PBKDF2' },
      false,
      ['deriveBits', 'deriveKey']
    );

    const derivedKey = await window.crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: enc.encode(salt),
        iterations: 80000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt']
    );

    const exported = await window.crypto.subtle.exportKey('raw', derivedKey);
    return Array.from(new Uint8Array(exported))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private getStoredUsers(): Record<string, StoredUserRecord> {
    const cached = appCache.get<Record<string, StoredUserRecord>>(USERS_STORAGE_KEY);
    if (cached) return cached;
    try {
      const raw = localStorage.getItem(USERS_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private saveStoredUsers(users: Record<string, StoredUserRecord>): void {
    appCache.set(USERS_STORAGE_KEY, users, undefined, true);
  }

  private async seedDefaultAccounts(): Promise<void> {
    const users = this.getStoredUsers();
    let updated = false;

    for (const seed of SEED_ACCOUNTS) {
      const emailLower = seed.email.toLowerCase();
      if (!users[emailLower]) {
        const salt = `gp_salt_${Math.random().toString(36).slice(2, 10)}`;
        const passHash = await this.hashPassword(seed.password, salt);
        const nowIso = new Date().toISOString();
        users[emailLower] = {
          id: `usr_${Math.random().toString(36).slice(2, 9)}`,
          email: seed.email,
          fullName: seed.fullName,
          role: seed.role,
          salt,
          passHash,
          registeredAt: nowIso,
          consent152FZAt: nowIso,
          consentVersion: '152-ФЗ ред. 2026'
        };
        updated = true;
      }
    }

    if (updated) {
      this.saveStoredUsers(users);
    }
  }

  /**
   * Register a new user with full field validation and mandatory 152-FZ consent (Art. 9)
   */
  public async register(
    email: string,
    fullName: string,
    password: string,
    consent152FZ = true,
    role = 'Инженер-технолог СПГ'
  ): Promise<UserAccount> {
    if (!consent152FZ) {
      throw new Error(
        'Согласно ст. 9 Федерального закона № 152-ФЗ «О персональных данных», для регистрации необходимо дать согласие на обработку персональных данных.'
      );
    }

    const emailNorm = email.trim().toLowerCase();

    // 1. Validate email
    const emailCheck = this.validateEmail(emailNorm);
    if (!emailCheck.isValid) {
      throw new Error(emailCheck.error || 'Неверный адрес электронной почты');
    }

    // 2. Validate full name
    const nameCheck = this.validateFullName(fullName);
    if (!nameCheck.isValid) {
      throw new Error(nameCheck.error || 'Некорректное имя пользователя');
    }

    // 3. Validate password strength
    const pwdStrength = this.checkPasswordStrength(password);
    if (pwdStrength.score < 4) {
      throw new Error('Пароль слишком простой: требуется не менее 8 знаков, заглавная и строчная буквы, цифра и спецсимвол');
    }

    const users = this.getStoredUsers();
    if (users[emailNorm]) {
      throw new Error('Пользователь с таким email уже зарегистрирован в системе');
    }

    const salt = `gp_salt_${Math.random().toString(36).slice(2, 10)}`;
    const passHash = await this.hashPassword(password, salt);
    const nowIso = new Date().toISOString();

    const newUserRecord: StoredUserRecord = {
      id: `usr_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
      email: emailNorm,
      fullName: fullName.trim(),
      role: role || 'Специалист СПГ',
      salt,
      passHash,
      registeredAt: nowIso,
      consent152FZAt: nowIso,
      consentVersion: '152-ФЗ ред. 2026'
    };

    users[emailNorm] = newUserRecord;
    this.saveStoredUsers(users);

    const user: UserAccount = {
      id: newUserRecord.id,
      email: newUserRecord.email,
      fullName: newUserRecord.fullName,
      role: newUserRecord.role,
      registeredAt: newUserRecord.registeredAt,
      consent152FZAt: newUserRecord.consent152FZAt,
      consentVersion: newUserRecord.consentVersion
    };

    this.setCurrentSession(user);
    return user;
  }

  /**
   * Authenticate user with email and password
   */
  public async login(email: string, password: string): Promise<UserAccount> {
    const emailNorm = email.trim().toLowerCase();

    const emailCheck = this.validateEmail(emailNorm);
    if (!emailCheck.isValid) {
      throw new Error(emailCheck.error || 'Проверьте формат email');
    }

    if (!password) {
      throw new Error('Введите пароль');
    }

    const users = this.getStoredUsers();
    const userRecord = users[emailNorm];

    if (!userRecord) {
      throw new Error('Пользователь с указанным email не найден. Проверьте адрес или зарегистрируйтесь.');
    }

    const testHash = await this.hashPassword(password, userRecord.salt);
    if (testHash !== userRecord.passHash) {
      throw new Error('Неверный пароль. Попробуйте еще раз или восстановите доступ.');
    }

    const user: UserAccount = {
      id: userRecord.id,
      email: userRecord.email,
      fullName: userRecord.fullName,
      role: userRecord.role,
      registeredAt: userRecord.registeredAt,
      consent152FZAt: userRecord.consent152FZAt || userRecord.registeredAt,
      consentVersion: userRecord.consentVersion || '152-ФЗ ред. 2026'
    };

    this.setCurrentSession(user);
    return user;
  }

  /**
   * Subject Right of Access (ст. 14 ФЗ-152): Export Personal Data card
   */
  public exportPersonalData(): Record<string, unknown> {
    const user = this.currentUser;
    return {
      documentType: 'Справка-выписка об обрабатываемых персональных данных субъекта (ст. 14 ФЗ № 152-ФЗ)',
      generatedAt: new Date().toISOString(),
      operator: 'ПАО «Газпром» / Цифровой двойник СПГ (Информационная система персональных данных ИСПДн)',
      legalBasis: [
        'Статья 6 ч. 1 п. 1 ФЗ № 152-ФЗ (обработка с согласия субъекта персональных данных)',
        'Статья 9 ФЗ № 152-ФЗ (добровольное, конкретное, информированное и сознательное согласие)',
        'Статья 18 ч. 5 ФЗ № 152-ФЗ (локализация баз данных на территории РФ)'
      ],
      securityMeasures: {
        passwordStorage: 'Одностороннее криптографическое хеширование PBKDF2-HMAC-SHA256 (80 000 итераций) с индивидуальной солью',
        protectionLevel: 'УЗ-3 (Постановление Правительства РФ № 1119, Приказ ФСТЭК России № 21)',
        biometricOrSpecialCategoriesProcessed: false
      },
      subjectData: user
        ? {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            role: user.role,
            registeredAt: user.registeredAt,
            consent152FZAt: user.consent152FZAt || user.registeredAt,
            consentVersion: user.consentVersion || '152-ФЗ ред. 2026'
          }
        : {
            status: 'Анонимная сессия (авторизованный профиль отсутствует)',
            technicalData: 'Обрабатываются только обезличенные настройки темы оформления и локального кеша 3D-сцен'
          }
    };
  }

  /**
   * Subject Right to Withdraw Consent & Demand Destruction of Personal Data (ст. 21 ч. 5 ФЗ-152)
   */
  public revokeConsentAndDeleteAccount(): { deletedEmail: string | null; timestamp: string } {
    const emailNorm = this.currentUser?.email?.toLowerCase() || null;
    if (emailNorm) {
      const users = this.getStoredUsers();
      delete users[emailNorm];
      this.saveStoredUsers(users);
    }
    this.logout();
    return {
      deletedEmail: emailNorm,
      timestamp: new Date().toISOString()
    };
  }

  public logout(): void {
    this.currentUser = null;
    appCache.remove(SESSION_STORAGE_KEY);
    try {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {}
  }

  public getCurrentUser(): UserAccount | null {
    return this.currentUser;
  }

  private setCurrentSession(user: UserAccount): void {
    this.currentUser = user;
    appCache.set(SESSION_STORAGE_KEY, user, 7 * 24 * 60 * 60 * 1000, true);
  }

  private restoreSession(): void {
    const cached = appCache.get<UserAccount>(SESSION_STORAGE_KEY);
    if (cached) {
      this.currentUser = cached;
    }
  }

  public getSeedAccounts() {
    return SEED_ACCOUNTS;
  }
}

export const authService = new AuthService();

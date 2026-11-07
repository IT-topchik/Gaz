import React, { useState } from 'react';
import { authService } from '../services/auth';
import { appCache } from '../services/cache';
import { UserAccount } from '../types/tour';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  ShieldCheck,
  FileText,
  Scale,
  Server,
  Lock,
  Download,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Database
} from 'lucide-react';

interface PrivacyPolicyModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserAccount | null;
  onUserDeleted: () => void;
  initialTab?: 'policy' | 'consent' | 'rights';
}

export const PrivacyPolicyModal: React.FC<PrivacyPolicyModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUserDeleted,
  initialTab = 'policy'
}) => {
  const [activeTab, setActiveTab] = useState<'policy' | 'consent' | 'rights'>(initialTab);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'warning'; text: string } | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      setStatusMessage(null);
      setConfirmRevoke(false);
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  const handleExportData = () => {
    const data = authService.exportPersonalData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gazprom-lng-152fz-extract-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    setStatusMessage({
      type: 'success',
      text: 'Справка-выписка об обрабатываемых ПДн (ст. 14 ФЗ-152) успешно сформирована и выгружена в формате JSON.'
    });
  };

  const handleRevokeAndErase = () => {
    const res = authService.revokeConsentAndDeleteAccount();
    onUserDeleted();
    setConfirmRevoke(false);
    setStatusMessage({
      type: 'warning',
      text: res.deletedEmail
        ? `Акт об уничтожении ПДн (ст. 21 ч. 5 ФЗ-152): учетная запись ${res.deletedEmail} и связанные персональные данные безвозвратно удалены (${new Date(res.timestamp).toLocaleTimeString('ru-RU')}).`
        : 'Активная сессия и персональные идентификаторы очищены согласно ст. 21 ФЗ-152.'
    });
  };

  const handleClearTechnicalCache = () => {
    appCache.clearAll();
    setStatusMessage({
      type: 'success',
      text: 'Локальный технический кеш и метаданные браузера очищены.'
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/65 select-none animate-in fade-in duration-200">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="relative w-full max-w-2xl max-h-[88vh] flex flex-col bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        {/* Top Header */}
        <div className="flex items-start justify-between gap-4 p-6 pb-4 border-b border-slate-200/80 dark:border-slate-800">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-cyan-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/70">
                  ФЗ № 152-ФЗ «О персональных данных»
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 dark:bg-blue-950/60 dark:text-cyan-300">
                  УЗ-3 / Локализация РФ
                </span>
              </div>
              <h2 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 mt-1">
                Политика и защита персональных данных
              </h2>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 pt-3 pb-1 bg-slate-50/70 dark:bg-slate-900/50 border-b border-slate-200/70 dark:border-slate-800">
          <div className="flex gap-1.5 bg-slate-200/70 dark:bg-slate-800 p-1 rounded-2xl text-xs font-bold">
            {(
              [
                { id: 'policy', label: 'Политика ПДн (ст. 18.1)', icon: FileText },
                { id: 'consent', label: 'Согласие субъекта (ст. 9)', icon: ShieldCheck },
                { id: 'rights', label: 'Мои права и ПДн (ст. 14, 21)', icon: Lock }
              ] as const
            ).map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => {
                    setActiveTab(tab.id);
                    setStatusMessage(null);
                  }}
                  className={`relative isolate flex-1 py-2 px-2.5 rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    isActive
                      ? 'text-blue-600 dark:text-cyan-400'
                      : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="privacyModalTabPill"
                      className="absolute inset-0 z-0 bg-white dark:bg-slate-700 rounded-xl shadow-sm"
                      transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    />
                  )}
                  <Icon className="relative z-10 w-3.5 h-3.5 shrink-0" />
                  <span className="relative z-10 truncate">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Content Area */}
        <div className="p-6 overflow-y-auto space-y-4 text-xs leading-relaxed text-slate-600 dark:text-slate-300">
          {statusMessage && (
            <div
              className={`p-3 rounded-2xl border font-semibold flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60'
                  : 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/60'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              )}
              <span>{statusMessage.text}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {activeTab === 'policy' && (
              <motion.div
                key="policy"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                      <Server className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                      <span>Локализация (ст. 18 ч. 5)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Запись, систематизация, накопление и хранение ПДн граждан РФ осуществляются в контуре РФ.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                      <Lock className="w-3.5 h-3.5 text-blue-600 dark:text-cyan-400" />
                      <span>Криптозащита (ст. 19)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Пароли не хранятся в открытом виде: применяется PBKDF2-SHA256 (80 000 итераций) с солью.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-800">
                    <div className="flex items-center gap-1.5 font-extrabold text-slate-900 dark:text-slate-100 mb-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                      <span>Минимизация (ст. 5)</span>
                    </div>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Специальные (ст. 10) и биометрические (ст. 11) категории ПДн в системе не собираются.
                    </p>
                  </div>
                </div>

                <div className="space-y-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100">
                    1. Общие положения и правовые основания (ст. 5, 6, 18.1 ФЗ № 152-ФЗ)
                  </h3>
                  <p>
                    Настоящая Политика разработана во исполнение требований <strong>Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных»</strong>, Постановления Правительства РФ от 01.11.2012 № 1119 и Приказа ФСТЭК России от 18.02.2013 № 21. Обработка персональных данных осуществляется исключительно для предоставления доступа специалистам к интерактивному 3D-тренажеру («Цифровой двойник завода СПГ»).
                  </p>

                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 pt-1">
                    2. Категории и перечень обрабатываемых ПДн
                  </h3>
                  <ul className="list-disc pl-5 space-y-1">
                    <li><strong>Фамилия, имя, отчество и должность</strong> — для идентификации профиля специалиста в интерфейсе диспетчерского тренажера;</li>
                    <li><strong>Адрес электронной почты (корпоративный или личный)</strong> — для аутентификации учетной записи и защиты от несанкционированного доступа;</li>
                    <li><strong>Технические данные сессии и локального кеша</strong> — выбранная тема оформления (дневной/ночной режим) и состояние предзагрузки 3D-объектов.</li>
                  </ul>

                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 pt-1">
                    3. Порядок хранения, защиты и трансграничной передачи
                  </h3>
                  <p>
                    Трансграничная передача персональных данных на территорию иностранных государств (ст. 12 ФЗ-152) <strong>не осуществляется</strong>. Передача третьим лицам без отдельного согласия субъекта запрещена, за исключением случаев, прямо предусмотренных законодательством РФ.
                  </p>
                </div>
              </motion.div>
            )}

            {activeTab === 'consent' && (
              <motion.div
                key="consent"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-3 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-800"
              >
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100">
                    Согласие субъекта на обработку персональных данных (ст. 9 ФЗ № 152-ФЗ)
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-cyan-300">
                    Редакция 2026.1
                  </span>
                </div>

                <p>
                  Настоящим я, действуя свободно, своей волей и в своем интересе, в соответствии со <strong>ст. 9 Федерального закона от 27.07.2006 № 152-ФЗ «О персональных данных»</strong> даю конкретное, предметное, информированное, сознательное и однозначное согласие Оператору информационной системы «Газпром СПГ — 3D-Тур PRO» на обработку моих персональных данных:
                </p>

                <div className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 space-y-1.5">
                  <div><strong>Перечень данных:</strong> ФИО, должность/роль, адрес электронной почты (e-mail), параметры пользовательской сессии.</div>
                  <div><strong>Цель обработки:</strong> регистрация и авторизация пользователя в интерактивном цифровом двойнике завода СПГ, сохранение пользовательских настроек визуализации.</div>
                  <div><strong>Перечень действий с ПДн (ст. 3 п. 3 ФЗ-152):</strong> сбор, запись, систематизация, накопление, хранение, уточнение (обновление, изменение), извлечение, использование, блокирование, удаление и уничтожение.</div>
                  <div><strong>Способ обработки:</strong> автоматизированная обработка с использованием средств криптографической защиты (PBKDF2-SHA256) без передачи по открытым неконтролируемым каналам.</div>
                  <div><strong>Срок действия и порядок отзыва:</strong> согласие действует до момента его отзыва субъектом ПДн путем нажатия кнопки «Отозвать согласие и уничтожить ПДн» во вкладке «Мои права и ПДн (ст. 14, 21)».</div>
                </div>
              </motion.div>
            )}

            {activeTab === 'rights' && (
              <motion.div
                key="rights"
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                className="space-y-4"
              >
                {/* Current Subject Status Card */}
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-slate-900 dark:text-slate-100">
                      Статус субъекта персональных данных
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${
                        currentUser
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/70 dark:text-emerald-300'
                          : 'bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300'
                      }`}
                    >
                      {currentUser ? 'Согласие 152-ФЗ активно' : 'Гостевой режим (без ПДн)'}
                    </span>
                  </div>

                  {currentUser ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px] pt-1">
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-slate-400 block">Субъект ПДн:</span>
                        <strong className="text-slate-900 dark:text-slate-100">{currentUser.fullName}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-slate-400 block">Электронная почта:</span>
                        <strong className="text-slate-900 dark:text-slate-100">{currentUser.email}</strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-slate-400 block">Дата подписания согласия (ст. 9):</span>
                        <strong className="font-mono text-slate-900 dark:text-slate-100">
                          {new Date(currentUser.consent152FZAt || currentUser.registeredAt).toLocaleString('ru-RU')}
                        </strong>
                      </div>
                      <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
                        <span className="text-slate-400 block">Редакция документа:</span>
                        <strong className="text-blue-600 dark:text-cyan-400">
                          {currentUser.consentVersion || '152-ФЗ ред. 2026'}
                        </strong>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      Вы просматриваете 3D-тур в гостевом режиме. Персональные данные (ФИО, email) в настоящий момент не обрабатываются.
                    </p>
                  )}
                </div>

                {/* Action Buttons implementing Art. 14 and Art. 21 of 152-FZ */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={handleExportData}
                    className="p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900/60 bg-blue-50/60 hover:bg-blue-100/70 dark:bg-blue-950/30 dark:hover:bg-blue-950/50 text-left transition-all flex items-start gap-3 cursor-pointer"
                  >
                    <Download className="w-5 h-5 text-blue-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-slate-100">
                        Выгрузить справку ПДн (ст. 14)
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Право субъекта на получение сведений об обрабатываемых персональных данных (JSON)
                      </div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={handleClearTechnicalCache}
                    className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 hover:bg-slate-100 dark:bg-slate-800/60 dark:hover:bg-slate-800 text-left transition-all flex items-start gap-3 cursor-pointer"
                  >
                    <Database className="w-5 h-5 text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-extrabold text-slate-900 dark:text-slate-100">
                        Очистить технический кеш
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Удаление локальных метаданных и кешированных параметров браузера
                      </div>
                    </div>
                  </button>
                </div>

                {/* Consent Withdrawal & Account Destruction (Art. 21 Pt. 5 152-FZ) */}
                <div className="p-4 rounded-2xl border border-red-200 dark:border-red-900/50 bg-red-50/40 dark:bg-red-950/20 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-extrabold text-red-700 dark:text-red-300">
                        Отзыв согласия и уничтожение ПДн (ст. 21 ч. 5 ФЗ № 152-ФЗ)
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                        При отзыве согласия Оператор обязан прекратить обработку и уничтожить персональные данные учетной записи.
                      </p>
                    </div>
                    {!confirmRevoke ? (
                      <button
                        type="button"
                        onClick={() => setConfirmRevoke(true)}
                        className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white font-bold text-xs flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Отозвать согласие</span>
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={handleRevokeAndErase}
                          className="px-3 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs cursor-pointer"
                        >
                          Подтвердить удаление
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmRevoke(false)}
                          className="px-2.5 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs cursor-pointer"
                        >
                          Отмена
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200/80 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>Соответствует требованиям Роскомнадзора и ФЗ № 152-ФЗ</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Закрыть
          </button>
        </div>
      </motion.div>
    </div>
  );
};

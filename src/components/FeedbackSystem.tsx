import React from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  Info,
  XCircle,
  X,
  Trash2,
  Check,
  Ban
} from 'lucide-react';

export interface ToastItem {
  id: string;
  type: 'success' | 'warning' | 'error' | 'info';
  title?: string;
  message: string;
  description?: string;
}

export interface ConfirmModalState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  confirmLabel?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary' | 'success' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface FeedbackSystemProps {
  toasts: ToastItem[];
  onDismissToast: (id: string) => void;
  confirmModal: ConfirmModalState;
  onCloseConfirm: () => void;
  isRtl?: boolean;
}

export const FeedbackSystem: React.FC<FeedbackSystemProps> = ({
  toasts,
  onDismissToast,
  confirmModal,
  onCloseConfirm,
  isRtl = false
}) => {
  return (
    <>
      {/* Toast Notification Container (Fixed at top-center on mobile, bottom-right on desktop) */}
      <div
        className={`fixed z-50 pointer-events-none flex flex-col gap-2.5 p-4 max-w-sm w-full transition-all ${
          isRtl ? 'left-0 sm:left-6' : 'right-0 sm:right-6'
        } top-16 sm:top-auto sm:bottom-6`}
      >
        {toasts.map(toast => {
          const isSuccess = toast.type === 'success';
          const isError = toast.type === 'error';
          const isWarning = toast.type === 'warning';
          const isInfo = toast.type === 'info';

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto flex items-start gap-3 p-3.5 sm:p-4 rounded-2xl shadow-xl border backdrop-blur-md transition-all animate-in fade-in slide-in-from-top-4 sm:slide-in-from-bottom-4 duration-300 ${
                isSuccess
                  ? 'bg-emerald-900/95 text-white border-emerald-500/40 shadow-emerald-950/20'
                  : isError
                  ? 'bg-rose-900/95 text-white border-rose-500/40 shadow-rose-950/20'
                  : isWarning
                  ? 'bg-amber-900/95 text-white border-amber-500/40 shadow-amber-950/20'
                  : 'bg-slate-900/95 text-white border-slate-700 shadow-slate-950/20'
              }`}
            >
              {/* Icon */}
              <div className="shrink-0 mt-0.5">
                {isSuccess && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
                {isError && <XCircle className="w-5 h-5 text-rose-300" />}
                {isWarning && <AlertTriangle className="w-5 h-5 text-amber-300" />}
                {isInfo && <Info className="w-5 h-5 text-blue-300" />}
              </div>

              {/* Message Content */}
              <div className="flex-1 min-w-0">
                {toast.title && (
                  <p className="text-[11px] font-extrabold uppercase tracking-wider opacity-90 mb-0.5">
                    {toast.title}
                  </p>
                )}
                <p className="text-xs sm:text-sm font-black leading-snug">
                  {toast.message}
                </p>
                {toast.description && (
                  <p className="text-[11px] sm:text-xs opacity-80 mt-0.5">
                    {toast.description}
                  </p>
                )}
              </div>

              {/* Dismiss Button */}
              <button
                type="button"
                onClick={() => onDismissToast(toast.id)}
                className="shrink-0 p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-colors"
                title="Fermer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          );
        })}
      </div>

      {/* Confirmation Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div
            className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200"
            dir={isRtl ? 'rtl' : 'ltr'}
          >
            <div className="p-6 sm:p-7 text-center">
              {/* Header Icon based on variant */}
              <div
                className={`w-14 h-14 rounded-2xl mx-auto flex items-center justify-center mb-4 shadow-inner ${
                  confirmModal.variant === 'danger'
                    ? 'bg-rose-100 text-rose-600'
                    : confirmModal.variant === 'warning'
                    ? 'bg-amber-100 text-amber-600'
                    : confirmModal.variant === 'success'
                    ? 'bg-emerald-100 text-emerald-600'
                    : 'bg-blue-100 text-blue-600'
                }`}
              >
                {confirmModal.variant === 'danger' && <Trash2 className="w-7 h-7" />}
                {confirmModal.variant === 'warning' && <AlertTriangle className="w-7 h-7" />}
                {confirmModal.variant === 'success' && <Check className="w-7 h-7" />}
                {(!confirmModal.variant || confirmModal.variant === 'primary') && <Info className="w-7 h-7" />}
              </div>

              {/* Title & Message */}
              <h3 className="text-lg sm:text-xl font-black text-slate-900 leading-tight">
                {confirmModal.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 mt-2 leading-relaxed font-medium">
                {confirmModal.message}
              </p>

              {/* Actions */}
              <div className="mt-6 flex flex-col-reverse sm:flex-row items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => {
                    if (confirmModal.onCancel) confirmModal.onCancel();
                    onCloseConfirm();
                  }}
                  className="w-full sm:w-auto min-w-[120px] px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 active:scale-[0.98] transition-all min-h-[44px]"
                >
                  {confirmModal.cancelText || 'Annuler'}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    confirmModal.onConfirm();
                    onCloseConfirm();
                  }}
                  className={`w-full sm:w-auto min-w-[140px] inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-black text-white shadow-md active:scale-[0.98] transition-all min-h-[44px] ${
                    confirmModal.variant === 'danger'
                      ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 shadow-rose-900/20'
                      : confirmModal.variant === 'warning'
                      ? 'bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-700 hover:to-amber-800 shadow-amber-900/20'
                      : confirmModal.variant === 'success'
                      ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 shadow-emerald-900/20'
                      : 'bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-800 hover:to-blue-700 shadow-blue-900/20'
                  }`}
                >
                  {confirmModal.variant === 'danger' && <Trash2 className="w-4 h-4" />}
                  {confirmModal.variant === 'success' && <Check className="w-4 h-4" />}
                  {confirmModal.variant === 'warning' && <AlertTriangle className="w-4 h-4" />}
                  <span>{confirmModal.confirmText || confirmModal.confirmLabel || 'Confirmer'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

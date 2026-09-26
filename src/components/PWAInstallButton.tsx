import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Smartphone, Download, Share, PlusSquare, X, Check, Sparkles } from 'lucide-react';
import cmedLogo from '../assets/images/cmed_logo.jpeg';

interface PWAInstallButtonProps {
  variant?: 'header' | 'banner' | 'login' | 'sidebar';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'header' }) => {
  const { isInstallable, isInstalled, isIOS, install, dismiss } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [showSuccessToast, setShowSuccessToast] = useState(false);

  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      const installed = await install();
      if (installed) {
        setShowSuccessToast(true);
        setTimeout(() => setShowSuccessToast(false), 4000);
      }
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback for browsers that don't trigger beforeinstallprompt
      setShowIOSModal(true);
    }
  };

  // Header compact button
  if (variant === 'header') {
    return (
      <>
        <button
          type="button"
          onClick={handleInstallClick}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] text-white font-bold text-xs shadow-md shadow-cyan-900/20 transition-all border border-[#57e4ff]/30 active:scale-95 group shrink-0 cursor-pointer"
          title="Installer l'application CMED Zirara sur votre smartphone"
        >
          <Smartphone className="w-4 h-4 group-hover:rotate-12 transition-transform text-[#57e4ff]" />
          <span className="hidden sm:inline">Installer l'application</span>
          <span className="sm:hidden">Installer</span>
        </button>

        {/* iOS / Browser Install Instructions Modal */}
        {showIOSModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
            <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 text-slate-900 relative space-y-4">
              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="absolute top-4 right-4 p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-2xl bg-white p-1.5 flex items-center justify-center shadow-md border border-cyan-200 shrink-0">
                  <img
                    src={cmedLogo}
                    alt="Logo CMED"
                    className="w-full h-full object-contain"
                    referrerPolicy="no-referrer"
                  />
                </div>
                <div>
                  <h3 className="text-base font-black text-[#0a1a44] leading-tight">
                    Application CMED Zirara
                  </h3>
                  <p className="text-xs text-[#02b3bb] font-bold">
                    Centre Deuxième Chance
                  </p>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs text-slate-700">
                <p className="font-extrabold text-[#0a1a44]">
                  Pour ajouter l'icône sur votre écran d'accueil :
                </p>
                
                {isIOS ? (
                  <ol className="space-y-2.5 list-decimal list-inside font-medium">
                    <li className="flex items-start gap-2">
                      <Share className="w-4 h-4 text-[#02b3bb] shrink-0 mt-0.5" />
                      <span>Appuyez sur le bouton <strong>Partager</strong> en bas de Safari.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <PlusSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Faites défiler et choisissez <strong>"Sur l'écran d'accueil"</strong>.</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-[#02b3bb] shrink-0 mt-0.5" />
                      <span>Appuyez sur <strong>Ajouter</strong> en haut à droite.</span>
                    </li>
                  </ol>
                ) : (
                  <ol className="space-y-2.5 list-decimal list-inside font-medium">
                    <li className="flex items-start gap-2">
                      <Download className="w-4 h-4 text-[#02b3bb] shrink-0 mt-0.5" />
                      <span>Ouvrez le menu de votre navigateur (les 3 points en haut).</span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Smartphone className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <span>Cliquez sur <strong>"Installer l'application"</strong> ou <strong>"Ajouter à l'écran d'accueil"</strong>.</span>
                    </li>
                  </ol>
                )}
              </div>

              <button
                type="button"
                onClick={() => setShowIOSModal(false)}
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-[#02b3bb] to-[#0891b2] text-white font-extrabold text-xs shadow-md hover:opacity-95 transition-all cursor-pointer"
              >
                J'ai compris
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  // Login view banner
  if (variant === 'login') {
    return (
      <div className="mb-4 p-3.5 rounded-2xl bg-gradient-to-r from-cyan-50/90 to-blue-50/90 border border-cyan-200/90 flex items-center justify-between gap-3 text-slate-800 shadow-2xs">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-white p-1 flex items-center justify-center shrink-0 shadow-2xs border border-cyan-200">
            <img
              src={cmedLogo}
              alt="Logo CMED"
              className="w-full h-full object-contain"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-black text-[#0a1a44] truncate">
              Installer l'application CMED
            </div>
            <div className="text-[10px] text-slate-500 truncate">
              Raccourci rapide sur l'écran de votre smartphone
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleInstallClick}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-[#02b3bb] to-[#0891b2] hover:from-[#0099a8] hover:to-[#0e7490] text-white font-extrabold text-xs shrink-0 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
        >
          <Download className="w-3.5 h-3.5" />
          <span>Installer</span>
        </button>
      </div>
    );
  }

  // Sidebar variant
  return (
    <button
      type="button"
      onClick={handleInstallClick}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#02b3bb]/15 hover:bg-[#02b3bb]/25 text-[#57e4ff] border border-[#02b3bb]/30 font-bold text-xs transition-all text-left cursor-pointer"
    >
      <Smartphone className="w-4 h-4 text-[#57e4ff] shrink-0" />
      <span className="truncate">Installer l'application</span>
    </button>
  );
};

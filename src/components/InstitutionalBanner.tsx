import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useApp } from '../context/AppContext';
import { Sparkles } from 'lucide-react';

interface InstitutionalBannerProps {
  title?: string;
  subtitle?: string;
  badge?: string;
  actionButton?: React.ReactNode;
}

export const InstitutionalBanner: React.FC<InstitutionalBannerProps> = ({
  title,
  subtitle,
  badge,
  actionButton
}) => {
  const { currentUser, isAdmin } = useAuth();
  const { settings, isRtl } = useApp();

  return (
    <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all">
      {/* Subtle modern Canva tech gradient edge */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#0a1a44] via-[#02b3bb] to-[#57e4ff]" />

      <div className="flex items-start gap-4 min-w-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1.5">
            {badge && (
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black bg-cyan-50 text-cyan-800 border border-cyan-200 shadow-2xs">
                <span className="w-1.5 h-1.5 rounded-full bg-[#02b3bb]" />
                {badge}
              </span>
            )}
            <span className="text-[11px] font-bold text-slate-400">
              {settings.nomCentre || 'Centre de Deuxième Chance Zirara'}
            </span>
          </div>

          {/* Dynamic page title */}
          {title && (
            <h1 className="text-xl sm:text-2xl font-black text-[#0a1a44] tracking-tight leading-snug">
              {title}
            </h1>
          )}

          {subtitle && (
            <p className="text-xs sm:text-sm text-slate-500 font-medium mt-1">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {actionButton && (
        <div className="shrink-0 flex items-center gap-2 self-start md:self-auto">
          {actionButton}
        </div>
      )}
    </div>
  );
};

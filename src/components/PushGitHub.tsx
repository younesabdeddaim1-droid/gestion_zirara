import React, { useState } from 'react';
import { GitBranch, UploadCloud, CheckCircle2, AlertCircle, ExternalLink, KeyRound, Copy, Check } from 'lucide-react';

export const PushGitHub: React.FC = () => {
  const [token, setToken] = useState('');
  const [repoUrl, setRepoUrl] = useState('https://github.com/younesabdeddaim1-droid/gestion_zirara.git');
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string; output?: string } | null>(null);
  const [copiedCmd, setCopiedCmd] = useState(false);

  const handlePush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setStatusMessage({ type: 'error', text: 'Veuillez saisir votre GitHub Personal Access Token (PAT).' });
      return;
    }

    setLoading(true);
    setStatusMessage(null);

    try {
      const res = await fetch('/api/github/push', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), repoUrl: repoUrl.trim() })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Erreur lors du push GitHub');
      }

      setStatusMessage({
        type: 'success',
        text: '🎉 Félicitations ! Votre code a été poussé avec succès sur GitHub !',
        output: data.output
      });
    } catch (err: any) {
      setStatusMessage({
        type: 'error',
        text: err.message || 'Échec du push. Vérifiez que votre token a bien les permissions "repo".'
      });
    } finally {
      setLoading(false);
    }
  };

  const copyManualCmd = () => {
    navigator.clipboard.writeText(`git push https://<VOTRE_TOKEN>@github.com/younesabdeddaim1-droid/gestion_zirara.git main:main`);
    setCopiedCmd(true);
    setTimeout(() => setCopiedCmd(false), 2500);
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
            <GitBranch className="w-6 h-6 text-[#57e4ff]" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900">Synchronisation & Push GitHub</h2>
            <p className="text-xs text-slate-500">Envoyer le code source directement vers votre repository GitHub</p>
          </div>
        </div>

        <a
          href="https://github.com/younesabdeddaim1-droid/gestion_zirara"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all"
        >
          <span>Ouvrir sur GitHub</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>

      <form onSubmit={handlePush} className="space-y-5">
        <div>
          <label className="block text-xs font-bold uppercase text-slate-700 mb-1">
            Dépôt distant (Repository URL)
          </label>
          <input
            type="text"
            value={repoUrl}
            onChange={e => setRepoUrl(e.target.value)}
            className="w-full py-2.5 px-3.5 text-sm rounded-xl border border-slate-300 font-mono text-slate-800 bg-slate-50"
            required
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="block text-xs font-bold uppercase text-slate-700">
              Personal Access Token (PAT) GitHub *
            </label>
            <a
              href="https://github.com/settings/tokens/new?scopes=repo&description=ZiraraConnectDeploy"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[#02b3bb] hover:underline font-bold flex items-center gap-1"
            >
              <KeyRound className="w-3 h-3" />
              <span>Générer un token (cocher "repo")</span>
            </a>
          </div>
          <input
            type="password"
            placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
            value={token}
            onChange={e => setToken(e.target.value)}
            className="w-full py-2.5 px-3.5 text-sm rounded-xl border border-slate-300 font-mono text-slate-800 focus:ring-2 focus:ring-[#02b3bb] focus:border-[#02b3bb] outline-none"
            required
          />
          <p className="text-[11px] text-slate-500 mt-1.5">
            🔒 GitHub ne permet pas l'accès anonyme en écriture. Le token permet d'authentifier votre compte en toute sécurité.
          </p>
        </div>

        {statusMessage && (
          <div
            className={`p-4 rounded-2xl flex items-start gap-3 border ${
              statusMessage.type === 'success'
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : 'bg-rose-50 text-rose-900 border-rose-200'
            }`}
          >
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="text-xs space-y-1">
              <p className="font-bold">{statusMessage.text}</p>
              {statusMessage.output && (
                <pre className="font-mono text-[10px] bg-white/70 p-2 rounded-lg overflow-x-auto mt-2">
                  {statusMessage.output}
                </pre>
              )}
            </div>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 px-6 rounded-2xl bg-[#0a1a44] hover:bg-[#132c6e] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              <span>Envoi en cours vers GitHub...</span>
            </>
          ) : (
            <>
              <UploadCloud className="w-4 h-4 text-[#57e4ff]" />
              <span>Pousser le code maintenant sur GitHub (main)</span>
            </>
          )}
        </button>
      </form>

      <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-bold text-slate-800">Alternative ligne de commande :</span>
          <button
            onClick={copyManualCmd}
            className="flex items-center gap-1 text-[11px] font-bold text-slate-700 hover:text-slate-900 cursor-pointer"
          >
            {copiedCmd ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedCmd ? 'Copié' : 'Copier la commande'}</span>
          </button>
        </div>
        <p className="font-mono text-[11px] bg-white p-2 rounded-xl border border-slate-200 text-slate-700 overflow-x-auto select-all">
          git push https://&lt;VOTRE_TOKEN&gt;@github.com/younesabdeddaim1-droid/gestion_zirara.git main:main
        </p>
      </div>
    </div>
  );
};

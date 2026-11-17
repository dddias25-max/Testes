import { useEffect, useRef, useState } from 'react';
import { Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export function PWAInstallButton() {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (showIOSGuide && !dialog.open) {
      dialog.showModal();
    } else if (!showIOSGuide && dialog.open) {
      dialog.close();
    }
  }, [showIOSGuide]);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        type="button"
        onClick={install}
        className="inline-flex items-center gap-1.5 rounded-lg border border-teal-700 bg-teal-50 px-3 py-1.5 text-xs font-semibold text-teal-800 transition-colors hover:bg-teal-100 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0 cursor-pointer"
      >
        <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
        <span>Instalar App</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          type="button"
          onClick={() => setShowIOSGuide(true)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-teal-700 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Smartphone className="h-3.5 w-3.5" aria-hidden="true" />
          <span>Instalar no iPhone</span>
        </button>

        <dialog
          ref={dialogRef}
          onClose={() => setShowIOSGuide(false)}
          aria-labelledby="ios-install-title"
          className="m-auto w-full max-w-sm rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-lg backdrop:bg-slate-950/40"
        >
          <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
            <h2 id="ios-install-title" className="text-base font-semibold text-slate-900">
              Instalar no iPhone / iPad
            </h2>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              aria-label="Fechar instruções de instalação"
              className="inline-flex h-8 w-8 items-center justify-center rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-900 cursor-pointer"
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <div className="space-y-3 p-5 text-sm text-slate-600">
            <p>
              1. Toque no botão <strong>Compartilhar</strong> na barra do Safari.
            </p>
            <p>
              2. Role para baixo e selecione <strong>Adicionar à Tela de Início</strong>.
            </p>
            <p>
              3. Toque em <strong>Adicionar</strong> para abrir a planilha como aplicativo.
            </p>
            <button
              type="button"
              onClick={() => setShowIOSGuide(false)}
              className="mt-2 w-full rounded-lg bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-800 cursor-pointer"
            >
              Entendi
            </button>
          </div>
        </dialog>
      </>
    );
  }

  return null;
}

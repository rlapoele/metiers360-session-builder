import { successBannerTimer } from '@features/sessions/success-banner-timer';
import { useEffect, useRef, useState } from 'react';
import { useStore } from '@nanostores/react';
import { Button } from '@components/ui/button';
import { saveCoordinator } from '@features/sessions/save-coordinator';
import {
  $draftSaveState,
  $draftCanSave,
  $draftSaveIssue,
  $sessionDraftHydrated,
  hydrateSessionDraft,
  sessionDraftStore,
} from '@features/sessions/session-draft.store';

export function SaveStatusBanner({
  onlyOperation = false,
}: {
  onlyOperation?: boolean;
}) {
  const save = useStore($draftSaveState);
  const canSave = useStore($draftCanSave);
  const issue = useStore($draftSaveIssue);
  const hydrated = useStore($sessionDraftHydrated);
  const successId =
    save?.result?.status === 'succeeded'
      ? save.request.operation_id
      : undefined;
  const owner = useRef(Symbol('success-banner')).current;
  const dismissedId = useStore(successBannerTimer.$dismissed);
  useEffect(() => {
    if (successId) return successBannerTimer.observe(successId, owner);
  }, [successId, owner]);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);
  if (
    !hydrated ||
    (successId &&
      (dismissedId === successId ||
        successBannerTimer.wasDismissed(successId))) ||
    (!save && (onlyOperation || (canSave && !issue)))
  )
    return null;
  const result = save?.result;
  const pending = Boolean(save && (!result || result.status === 'pending'));
  const delayed = Boolean(save && now - save.started_at >= 8000);
  const uncertain = save?.uncertain;
  const failed = result?.status === 'failed';
  const succeeded = result?.status === 'succeeded';
  const warning = Boolean(
    uncertain || issue || (!save && !canSave) || (pending && delayed),
  );
  const colors = failed
    ? 'bg-destructive text-destructive-foreground'
    : succeeded
      ? 'bg-success text-success-foreground'
      : warning
        ? 'bg-warning text-warning-foreground'
        : 'bg-primary text-primary-foreground';
  const text = failed
    ? 'L’enregistrement a échoué. Votre brouillon est conservé : vous pouvez le corriger ou réessayer.'
    : succeeded
      ? `La séance « ${result.session.name} » a été enregistrée.`
      : (issue ??
        (uncertain === 'runtime'
          ? 'Le service a perdu le suivi de cet enregistrement. Le résultat est inconnu : consultez Mes séances. Le brouillon reste en lecture seule.'
          : uncertain
            ? 'La réponse n’a pas pu être confirmée. Vérification automatique en cours ; le brouillon reste en lecture seule.'
            : !save
              ? 'L’enregistrement n’est pas disponible dans ce navigateur. Autorisez le stockage local et utilisez un navigateur récent ; votre brouillon reste modifiable.'
              : delayed
                ? 'L’enregistrement prend plus de temps que prévu. Le brouillon reste en lecture seule pendant la vérification.'
                : `Enregistrement de « ${save.request.session.name} » en cours. Le brouillon est temporairement en lecture seule.`));
  return (
    <section
      aria-label="Statut de l’enregistrement"
      onPointerEnter={(event) => {
        if (event.pointerType !== 'touch')
          successBannerTimer.pause(owner, 'pointer');
      }}
      onPointerLeave={() => successBannerTimer.resume(owner, 'pointer')}
      onFocusCapture={() => successBannerTimer.pause(owner, 'focus')}
      onBlurCapture={(event) => {
        if (
          !(event.relatedTarget instanceof Node) ||
          !event.currentTarget.contains(event.relatedTarget)
        )
          successBannerTimer.resume(owner, 'focus');
      }}
      className={`${colors} px-4 py-3 sm:px-6`}
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
        <p role={failed ? 'alert' : 'status'} className="text-sm font-medium">
          {text}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {pending && warning && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void saveCoordinator.reconcile()}
            >
              Vérifier le statut
            </Button>
          )}
          {save?.uncertain === 'runtime' && (
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (
                  window.confirm(
                    'Vérifiez d’abord Mes séances. Confirmez-vous qu’aucune séance correspondant à cet enregistrement n’y figure ? Le résultat reste inconnu : reprendre peut créer un doublon. Votre brouillon sera conservé.',
                  )
                )
                  void sessionDraftStore
                    .releaseUncertainSave(save.request.operation_id)
                    .then((released) => {
                      if (released)
                        requestAnimationFrame(() => {
                          const target =
                            document.querySelector<HTMLElement>(
                              'dialog[open] input:not([disabled])',
                            ) ??
                            document.querySelector<HTMLElement>(
                              '[data-session-draft-trigger]',
                            );
                          target?.focus();
                        });
                    });
              }}
            >
              Reprendre après vérification
            </Button>
          )}
          {succeeded ? (
            <a
              className="underline underline-offset-4"
              href={`/sessions/${encodeURIComponent(result.session.id)}`}
            >
              Consulter l’enregistrement
            </a>
          ) : (
            pending && (
              <a className="underline underline-offset-4" href="/sessions">
                Consulter Mes séances
              </a>
            )
          )}
        </div>
      </div>
    </section>
  );
}

export function SessionSaveStatus() {
  useEffect(() => {
    hydrateSessionDraft();
    return saveCoordinator.watch();
  }, []);
  return <SaveStatusBanner />;
}

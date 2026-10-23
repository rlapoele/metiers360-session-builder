import {
  CheckCircleIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { useMutation } from '@tanstack/react-query';
import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent,
} from 'react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  NativeSelect,
  NativeSelectOption,
} from '@/components/ui/native-select';

import { formatDuration } from '../../features/catalogue/format';
import { createSession, SessionSaveError } from '../../features/sessions/api';
import {
  CreateSessionSchema,
  type CreateSession,
  type Headset,
  type Session,
  type SessionDraft,
} from '../../lib/api/schemas';
import type { DraftVideoItem } from './SessionDraftContent';

interface SessionFinalisationDialogProps {
  draft: SessionDraft;
  items: DraftVideoItem[];
  headsets: Headset[];
  onNameChange: (name: string) => void;
  onHeadsetChange: (headsetId: string | null) => void;
  onClose: () => void;
  onSaved: (session: Session) => void;
}

const focusableSelector =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

interface FieldErrors {
  name?: string;
  headset_id?: string;
  video_ids?: string;
}

function fieldErrorsFromIssues(
  issues: ReadonlyArray<{ path: PropertyKey[]; message: string }>,
) {
  const errors: FieldErrors = {};
  for (const issue of issues) {
    const field = issue.path[0];
    if (
      (field === 'name' || field === 'headset_id' || field === 'video_ids') &&
      !errors[field]
    ) {
      errors[field] = issue.message;
    }
  }
  return errors;
}

export function SessionFinalisationDialog({
  draft,
  items,
  headsets,
  onNameChange,
  onHeadsetChange,
  onClose,
  onSaved,
}: SessionFinalisationDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const mutation = useMutation({
    mutationFn: (request: CreateSession) => createSession(request),
    retry: false,
    onSuccess: onSaved,
  });
  const selectedHeadset = headsets.find(
    (headset) => headset.id === draft.headset_id,
  );
  const incompatibleItems = selectedHeadset
    ? items.filter(
        (item) =>
          item.video &&
          !item.video.compatible_headsets.includes(selectedHeadset.id),
      )
    : [];
  const unresolvedItems = items.filter((item) => !item.video);
  const isPending = mutation.isPending;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const previousOverflow = document.documentElement.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    dialog.showModal();
    nameInputRef.current?.focus();

    return () => {
      document.documentElement.style.overflow = previousOverflow;
    };
  }, []);

  function keepFocusInside(event: KeyboardEvent<HTMLDialogElement>) {
    if (event.key !== 'Tab') return;
    const elements = Array.from(
      event.currentTarget.querySelectorAll<HTMLElement>(focusableSelector),
    );
    const first = elements.at(0);
    const last = elements.at(-1);
    if (!first || !last) return;
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isPending) return;

    mutation.reset();
    const parsed = CreateSessionSchema.safeParse({
      name: draft.name,
      video_ids: draft.video_ids,
      headset_id: draft.headset_id,
    });
    const nextErrors = parsed.success
      ? {}
      : fieldErrorsFromIssues(parsed.error.issues);

    if (draft.headset_id && !selectedHeadset) {
      nextErrors.headset_id = 'Choisissez un casque proposé dans la liste.';
    }

    setFieldErrors(nextErrors);
    if (!parsed.success || nextErrors.headset_id) {
      if (nextErrors.name) nameInputRef.current?.focus();
      return;
    }

    mutation.mutate(parsed.data);
  }

  const saveError = mutation.error;
  const serverFieldErrors =
    saveError instanceof SessionSaveError
      ? fieldErrorsFromIssues(
          saveError.fieldErrors.map((error) => ({
            path: [error.field],
            message: error.message,
          })),
        )
      : {};
  const visibleFieldErrors = { ...serverFieldErrors, ...fieldErrors };

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby="session-finalisation-title"
      onClose={onClose}
      onCancel={(event) => {
        if (isPending) event.preventDefault();
      }}
      onKeyDown={keepFocusInside}
      className="bg-card text-foreground fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-hidden shadow-xl backdrop:bg-foreground/40 sm:inset-y-6 sm:mx-auto sm:h-auto sm:max-h-draft-panel sm:max-w-2xl sm:rounded-lg sm:border border-dialog"
    >
      <form noValidate onSubmit={submit} className="flex h-full flex-col">
        <header className="border-border shrink-0 border-b px-4 py-3 sm:px-6">
          <div className="flex min-h-11 items-center justify-between gap-4">
            <div>
              <p className="text-muted-foreground text-sm font-medium">
                Dernière étape
              </p>
              <h2
                id="session-finalisation-title"
                className="text-xl font-semibold"
              >
                Enregistrer la séance
              </h2>
            </div>
            <Button
              type="button"
              variant="ghost"
              disabled={isPending}
              onClick={() => dialogRef.current?.close()}
              className="px-2"
            >
              <XMarkIcon aria-hidden="true" className="size-5" />
              Fermer
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-6 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="space-y-2">
            <label
              htmlFor="session-name"
              className="block text-sm font-semibold"
            >
              Nom de la séance{' '}
              <span className="text-muted-foreground font-normal">
                (obligatoire)
              </span>
            </label>
            <Input
              ref={nameInputRef}
              id="session-name"
              value={draft.name}
              maxLength={120}
              required
              disabled={isPending}
              aria-invalid={visibleFieldErrors.name ? 'true' : undefined}
              aria-describedby={
                visibleFieldErrors.name
                  ? 'session-name-error session-name-help'
                  : 'session-name-help'
              }
              onChange={(event) => {
                onNameChange(event.currentTarget.value);
                setFieldErrors((current) => ({
                  ...current,
                  name: undefined,
                }));
              }}
            />
            <div
              id="session-name-help"
              className="text-muted-foreground flex justify-between gap-4 text-sm"
            >
              <span>Un nom court permettra de la retrouver facilement.</span>
              <span>{draft.name.length}/120</span>
            </div>
            {visibleFieldErrors.name && (
              <p
                id="session-name-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {visibleFieldErrors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label
              htmlFor="session-headset"
              className="block text-sm font-semibold"
            >
              Casque VR{' '}
              <span className="text-muted-foreground font-normal">
                (facultatif)
              </span>
            </label>
            <NativeSelect
              id="session-headset"
              value={draft.headset_id ?? ''}
              disabled={isPending}
              aria-invalid={visibleFieldErrors.headset_id ? 'true' : undefined}
              aria-describedby={
                visibleFieldErrors.headset_id
                  ? 'session-headset-help session-headset-error'
                  : 'session-headset-help'
              }
              onChange={(event) => {
                onHeadsetChange(event.currentTarget.value || null);
                setFieldErrors((current) => ({
                  ...current,
                  headset_id: undefined,
                }));
              }}
            >
              <NativeSelectOption value="">
                Aucun casque choisi
              </NativeSelectOption>
              {headsets.map((headset) => (
                <NativeSelectOption key={headset.id} value={headset.id}>
                  {headset.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <p
              id="session-headset-help"
              className="text-muted-foreground text-sm"
            >
              Le choix permet de vérifier la compatibilité avant
              l’enregistrement.
            </p>
            {visibleFieldErrors.headset_id && (
              <p
                id="session-headset-error"
                role="alert"
                className="text-destructive text-sm"
              >
                {visibleFieldErrors.headset_id}
              </p>
            )}
          </div>

          {selectedHeadset && incompatibleItems.length > 0 && (
            <div
              role="alert"
              className="border-border bg-muted rounded-md border p-4"
            >
              <div className="flex items-start gap-3">
                <ExclamationTriangleIcon
                  aria-hidden="true"
                  className="text-destructive mt-0.5 size-5 shrink-0"
                />
                <div>
                  <p className="font-semibold">
                    {incompatibleItems.length}{' '}
                    {incompatibleItems.length === 1 ? 'vidéo' : 'vidéos'} non
                    compatible{incompatibleItems.length === 1 ? '' : 's'} avec{' '}
                    {selectedHeadset.name}
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                    {incompatibleItems.map((item) => (
                      <li key={item.id}>{item.video?.title}</li>
                    ))}
                  </ul>
                  <p className="text-muted-foreground mt-2 text-sm">
                    Vous pouvez enregistrer la séance, mais ces vidéos ne
                    pourront pas être lues avec ce casque.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedHeadset &&
            incompatibleItems.length === 0 &&
            unresolvedItems.length === 0 && (
              <div
                role="status"
                className="border-border bg-muted rounded-md border p-4"
              >
                <p className="text-success flex items-start gap-2 font-semibold">
                  <CheckCircleIcon
                    aria-hidden="true"
                    className="mt-0.5 size-5 shrink-0"
                  />
                  Toutes les vidéos sont compatibles avec {selectedHeadset.name}
                  .
                </p>
              </div>
            )}

          {selectedHeadset && unresolvedItems.length > 0 && (
            <p className="text-muted-foreground text-sm">
              La compatibilité de {unresolvedItems.length}{' '}
              {unresolvedItems.length === 1 ? 'vidéo' : 'vidéos'} n’a pas pu
              être confirmée.
            </p>
          )}

          <section aria-labelledby="session-finalisation-videos-title">
            <div className="flex items-baseline justify-between gap-4">
              <h3
                id="session-finalisation-videos-title"
                className="font-semibold"
              >
                Ordre de lecture
              </h3>
              <p className="text-muted-foreground text-sm">
                {items.length} {items.length === 1 ? 'vidéo' : 'vidéos'}
              </p>
            </div>
            <ol className="mt-3 space-y-2">
              {items.map((item, index) => (
                <li
                  key={item.id}
                  className="border-border flex items-start gap-3 rounded-md border p-3"
                >
                  <Badge aria-hidden="true" className="size-8 p-0 text-sm">
                    {index + 1}
                  </Badge>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">
                      {item.video?.title ?? `Vidéo ${index + 1}`}
                    </p>
                    <p className="text-muted-foreground mt-1 text-sm">
                      {item.video
                        ? formatDuration(item.video.duration_seconds)
                        : 'Informations indisponibles'}
                    </p>
                  </div>
                </li>
              ))}
            </ol>
            {visibleFieldErrors.video_ids && (
              <p role="alert" className="text-destructive mt-2 text-sm">
                {visibleFieldErrors.video_ids}
              </p>
            )}
          </section>

          {mutation.isError && (
            <p role="alert" className="text-destructive text-sm leading-6">
              {mutation.error instanceof Error
                ? mutation.error.message
                : 'La séance n’a pas pu être enregistrée. Réessayez.'}
            </p>
          )}
        </div>

        <footer className="border-border bg-card shrink-0 border-t p-4 sm:px-6">
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isPending}
              onClick={() => dialogRef.current?.close()}
            >
              Revenir à ma séance
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending
                ? 'Enregistrement en cours…'
                : mutation.isError
                  ? 'Réessayer d’enregistrer'
                  : 'Enregistrer la séance'}
            </Button>
          </div>
        </footer>
      </form>
    </dialog>
  );
}

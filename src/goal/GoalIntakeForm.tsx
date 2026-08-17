'use client';

import { type ChangeEvent, type FormEvent, useEffect, useId, useState } from 'react';
import { Minus, Plus, Paperclip } from '@phosphor-icons/react';
import {
  createAttachment,
  createGoal,
  ensureCurrentInitiative,
  getCurrentCompany,
  getCurrentInitiative,
} from '../api/client';
import { associateFieldErrors, formAlert, isApiError } from '../api/errors';
import type { GoalAttachmentRef, GoalDraft } from '../api/types';
import {
  toAttachmentPayload,
  validateLocalFile,
} from './attachments';
import {
  initiativeTitle,
  toCreateGoalBody,
  validateDraft,
  writeDraft,
} from './draft';

interface GoalIntakeFormProps {
  initial: GoalDraft;
  onSubmitted: (runId: string, replayed: boolean) => void;
  onNeedCompany: () => void;
}

interface PendingFile {
  key: string;
  file: File;
}

export function GoalIntakeForm({ initial, onSubmitted, onNeedCompany }: GoalIntakeFormProps) {
  const [draft, setDraft] = useState<GoalDraft>(initial);
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const formId = useId();

  useEffect(() => {
    writeDraft(draft);
  }, [draft]);

  function update<K extends keyof GoalDraft>(key: K, value: GoalDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateList(key: 'must_haves' | 'non_goals', index: number, value: string) {
    setDraft((current) => {
      const next = [...current[key]];
      next[index] = value;
      return { ...current, [key]: next };
    });
  }

  function addListItem(key: 'must_haves' | 'non_goals') {
    setDraft((current) =>
      current[key].length >= 20 ? current : { ...current, [key]: [...current[key], ''] },
    );
  }

  function removeListItem(key: 'must_haves' | 'non_goals', index: number) {
    setDraft((current) => {
      const next = current[key].filter((_, itemIndex) => itemIndex !== index);
      return { ...current, [key]: next.length > 0 ? next : [''] };
    });
  }

  function onPickFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    if (files.length === 0) return;
    const nextErrors: Record<string, string> = {};
    const accepted: PendingFile[] = [];
    let count = draft.attachments.length + pendingFiles.length;
    let bytes =
      draft.attachments.reduce((sum, item) => sum + item.size_bytes, 0) +
      pendingFiles.reduce((sum, item) => sum + item.file.size, 0);
    for (const file of files) {
      const message = validateLocalFile(file, count, bytes);
      if (message) {
        nextErrors.attachment_ids = message;
        continue;
      }
      accepted.push({ key: `${file.name}-${file.size}-${file.lastModified}-${count}`, file });
      count += 1;
      bytes += file.size;
    }
    if (accepted.length > 0) {
      setPendingFiles((current) => [...current, ...accepted]);
    }
    setFieldErrors((current) => ({ ...current, ...nextErrors }));
    if (nextErrors.attachment_ids) {
      setAlert(nextErrors.attachment_ids);
    }
  }

  function removePending(key: string) {
    setPendingFiles((current) => current.filter((item) => item.key !== key));
  }

  function removeUploaded(id: string) {
    setDraft((current) => ({
      ...current,
      attachments: current.attachments.filter((item) => item.id !== id),
    }));
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clientErrors = validateDraft(draft, pendingFiles.length);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setAlert('Correct the highlighted fields and retry.');
      return;
    }
    setPending(true);
    setAlert(null);
    try {
      try {
        await getCurrentCompany();
      } catch (caught) {
        if (isApiError(caught) && caught.status === 404) {
          onNeedCompany();
          return;
        }
        throw caught;
      }

      const initiative = await ensureCurrentInitiative(initiativeTitle(draft));
      if (!initiative.etag) {
        setAlert('Refresh the initiative before submitting. An If-Match tag is required.');
        return;
      }

      const uploaded: GoalAttachmentRef[] = [...draft.attachments];
      for (const item of pendingFiles) {
        const payload = await toAttachmentPayload(item.file);
        const result = await createAttachment(payload);
        uploaded.push({
          id: result.attachment.id,
          filename: result.attachment.filename,
          media_type: String(result.attachment.media_type),
          size_bytes: Number(result.attachment.size_bytes),
        });
        const nextDraft = { ...draft, attachments: uploaded };
        setDraft(nextDraft);
        writeDraft(nextDraft);
      }
      setPendingFiles([]);

      const body = toCreateGoalBody({ ...draft, attachments: uploaded });
      const submitted = await createGoal(initiative.initiative.id, body, initiative.etag);
      onSubmitted(submitted.result.run.id, submitted.replayed);
    } catch (caught) {
      if (isApiError(caught) && caught.status === 412) {
        try {
          await getCurrentInitiative();
          setAlert(
            'The initiative changed. Review the current draft and submit again with the refreshed version.',
          );
        } catch {
          setAlert(caught.problem.detail);
        }
        return;
      }
      if (isApiError(caught)) {
        const mapped = associateFieldErrors(caught.problem);
        setFieldErrors(mapped);
        setAlert(formAlert(caught.problem, mapped));
        return;
      }
      setAlert('The goal could not be submitted. Retry the same submit.');
    } finally {
      setPending(false);
    }
  }

  const targetError = fieldErrors['goal.target_user'];
  const problemError = fieldErrors['goal.problem'];
  const outcomeError = fieldErrors['goal.desired_outcome'];
  const flowError = fieldErrors['goal.primary_flow'];
  const mustHaveError = fieldErrors['goal.must_haves'];
  const nonGoalError = fieldErrors['goal.non_goals'];
  const visualError = fieldErrors['goal.visual_direction'];
  const screensError = fieldErrors['goal.constraints.max_screens'];
  const warningError = fieldErrors.mock_data_acknowledged;
  const attachmentError = fieldErrors.attachment_ids;

  return (
    <form className="space-y-8" onSubmit={(event) => void onSubmit(event)} noValidate>
      {alert ? (
        <p role="alert" className="border border-alert/30 bg-surface px-4 py-3 text-sm text-alert">
          {alert}
        </p>
      ) : null}

      <aside
        className="border border-pine/30 bg-surface px-4 py-3 text-sm text-ink"
        aria-labelledby={`${formId}-scope`}
      >
        <h2 id={`${formId}-scope`} className="font-medium">
          Prototype limits
        </h2>
        <p className="mt-2 leading-relaxed text-muted">
          This intake stays inside one primary flow, at most five screens, client-only mock
          or local data, and a prototype rather than a production system. Out-of-scope
          submissions stay on this form with a narrowing warning. They are not silently
          truncated.
        </p>
      </aside>

      <div>
        <label htmlFor={`${formId}-target`} className="block text-sm font-medium">
          Target user
        </label>
        <p id={`${formId}-target-hint`} className="mt-1 text-sm text-muted">
          3 to 300 characters. Who this prototype is for.
        </p>
        <input
          id={`${formId}-target`}
          name="target_user"
          type="text"
          value={draft.target_user}
          onChange={(event) => update('target_user', event.target.value)}
          aria-invalid={Boolean(targetError)}
          aria-describedby={`${formId}-target-hint${targetError ? ` ${formId}-target-error` : ''}`}
          className="mt-2 min-h-11 w-full border border-line bg-surface px-3 outline-none focus:ring-2 focus:ring-pine"
        />
        {targetError ? (
          <p id={`${formId}-target-error`} className="mt-1 text-sm text-alert">
            {targetError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-problem`} className="block text-sm font-medium">
          Problem
        </label>
        <p id={`${formId}-problem-hint`} className="mt-1 text-sm text-muted">
          10 to 1,000 characters.
        </p>
        <textarea
          id={`${formId}-problem`}
          name="problem"
          rows={4}
          value={draft.problem}
          onChange={(event) => update('problem', event.target.value)}
          aria-invalid={Boolean(problemError)}
          aria-describedby={`${formId}-problem-hint ${formId}-problem-count${problemError ? ` ${formId}-problem-error` : ''}`}
          className="mt-2 w-full border border-line bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-pine"
        />
        <p id={`${formId}-problem-count`} className="mt-1 font-mono text-xs text-muted">
          {draft.problem.trim().length} / 1000
        </p>
        {problemError ? (
          <p id={`${formId}-problem-error`} className="mt-1 text-sm text-alert">
            {problemError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-outcome`} className="block text-sm font-medium">
          Desired outcome
        </label>
        <p id={`${formId}-outcome-hint`} className="mt-1 text-sm text-muted">
          10 to 1,000 characters. What a successful prototype lets the user do.
        </p>
        <textarea
          id={`${formId}-outcome`}
          name="desired_outcome"
          rows={4}
          value={draft.desired_outcome}
          onChange={(event) => update('desired_outcome', event.target.value)}
          aria-invalid={Boolean(outcomeError)}
          aria-describedby={`${formId}-outcome-hint ${formId}-outcome-count${outcomeError ? ` ${formId}-outcome-error` : ''}`}
          className="mt-2 w-full border border-line bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-pine"
        />
        <p id={`${formId}-outcome-count`} className="mt-1 font-mono text-xs text-muted">
          {draft.desired_outcome.trim().length} / 1000
        </p>
        {outcomeError ? (
          <p id={`${formId}-outcome-error`} className="mt-1 text-sm text-alert">
            {outcomeError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-flow`} className="block text-sm font-medium">
          Primary flow
        </label>
        <p id={`${formId}-flow-hint`} className="mt-1 text-sm text-muted">
          5 to 500 characters. Exactly one flow for this prototype.
        </p>
        <textarea
          id={`${formId}-flow`}
          name="primary_flow"
          rows={3}
          value={draft.primary_flow}
          onChange={(event) => update('primary_flow', event.target.value)}
          aria-invalid={Boolean(flowError)}
          aria-describedby={`${formId}-flow-hint${flowError ? ` ${formId}-flow-error` : ''}`}
          className="mt-2 w-full border border-line bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-pine"
        />
        {flowError ? (
          <p id={`${formId}-flow-error`} className="mt-1 text-sm text-alert">
            {flowError}
          </p>
        ) : null}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Must-haves</legend>
        <p id={`${formId}-must-hint`} className="text-sm text-muted">
          1 to 20 items. Each becomes MH-001 and onward on submit.
        </p>
        {mustHaveError ? (
          <p id={`${formId}-must-error`} className="text-sm text-alert">
            {mustHaveError}
          </p>
        ) : null}
        <ul className="space-y-3" aria-describedby={`${formId}-must-hint`}>
          {draft.must_haves.map((item, index) => {
            const fieldId = `${formId}-must-${index}`;
            return (
              <li key={fieldId} className="flex gap-2">
                <label htmlFor={fieldId} className="sr-only">
                  Must-have {index + 1}
                </label>
                <input
                  id={fieldId}
                  name={`must_haves.${index}`}
                  type="text"
                  value={item}
                  onChange={(event) => updateList('must_haves', index, event.target.value)}
                  aria-invalid={Boolean(mustHaveError)}
                  className="min-h-11 w-full border border-line bg-surface px-3 outline-none focus:ring-2 focus:ring-pine"
                />
                <button
                  type="button"
                  onClick={() => removeListItem('must_haves', index)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center border border-line"
                  aria-label={`Remove must-have ${index + 1}`}
                >
                  <Minus size={16} weight="regular" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => addListItem('must_haves')}
          disabled={draft.must_haves.length >= 20}
          className="inline-flex min-h-11 items-center gap-2 border border-line px-4 text-sm"
        >
          <Plus size={16} weight="regular" aria-hidden="true" />
          Add must-have
        </button>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Non-goals</legend>
        <p id={`${formId}-non-hint`} className="text-sm text-muted">
          1 to 20 items the prototype will not include.
        </p>
        {nonGoalError ? (
          <p id={`${formId}-non-error`} className="text-sm text-alert">
            {nonGoalError}
          </p>
        ) : null}
        <ul className="space-y-3" aria-describedby={`${formId}-non-hint`}>
          {draft.non_goals.map((item, index) => {
            const fieldId = `${formId}-non-${index}`;
            return (
              <li key={fieldId} className="flex gap-2">
                <label htmlFor={fieldId} className="sr-only">
                  Non-goal {index + 1}
                </label>
                <input
                  id={fieldId}
                  name={`non_goals.${index}`}
                  type="text"
                  value={item}
                  onChange={(event) => updateList('non_goals', index, event.target.value)}
                  aria-invalid={Boolean(nonGoalError)}
                  className="min-h-11 w-full border border-line bg-surface px-3 outline-none focus:ring-2 focus:ring-pine"
                />
                <button
                  type="button"
                  onClick={() => removeListItem('non_goals', index)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center border border-line"
                  aria-label={`Remove non-goal ${index + 1}`}
                >
                  <Minus size={16} weight="regular" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => addListItem('non_goals')}
          disabled={draft.non_goals.length >= 20}
          className="inline-flex min-h-11 items-center gap-2 border border-line px-4 text-sm"
        >
          <Plus size={16} weight="regular" aria-hidden="true" />
          Add non-goal
        </button>
      </fieldset>

      <div>
        <label htmlFor={`${formId}-visual`} className="block text-sm font-medium">
          Visual direction
        </label>
        <p id={`${formId}-visual-hint`} className="mt-1 text-sm text-muted">
          3 to 500 characters.
        </p>
        <textarea
          id={`${formId}-visual`}
          name="visual_direction"
          rows={3}
          value={draft.visual_direction}
          onChange={(event) => update('visual_direction', event.target.value)}
          aria-invalid={Boolean(visualError)}
          aria-describedby={`${formId}-visual-hint${visualError ? ` ${formId}-visual-error` : ''}`}
          className="mt-2 w-full border border-line bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-pine"
        />
        {visualError ? (
          <p id={`${formId}-visual-error`} className="mt-1 text-sm text-alert">
            {visualError}
          </p>
        ) : null}
      </div>

      <fieldset className="space-y-4 border-t border-line pt-6">
        <legend className="text-sm font-medium">Prototype constraints</legend>
        <p className="text-sm text-muted">
          These limits are part of the submitted goal. The prototype stays inside five
          screens, one primary flow, client-only delivery, and mock or local data.
        </p>
        <div>
          <label htmlFor={`${formId}-screens`} className="block text-sm font-medium">
            Maximum screens
          </label>
          <p id={`${formId}-screens-hint`} className="mt-1 text-sm text-muted">
            Choose 1 to 5.
          </p>
          <input
            id={`${formId}-screens`}
            name="max_screens"
            type="number"
            min={1}
            max={5}
            value={draft.max_screens}
            onChange={(event) => update('max_screens', Number(event.target.value))}
            aria-invalid={Boolean(screensError)}
            aria-describedby={`${formId}-screens-hint${screensError ? ` ${formId}-screens-error` : ''}`}
            className="mt-2 min-h-11 w-24 border border-line bg-surface px-3 outline-none focus:ring-2 focus:ring-pine"
          />
          {screensError ? (
            <p id={`${formId}-screens-error`} className="mt-1 text-sm text-alert">
              {screensError}
            </p>
          ) : null}
        </div>
        <div>
          <p className="text-sm font-medium" id={`${formId}-flows-label`}>
            Primary flows
          </p>
          <p id={`${formId}-flows-hint`} className="mt-1 text-sm text-muted">
            Fixed at 1 for this prototype slice.
          </p>
          <input
            type="text"
            value="1"
            readOnly
            aria-labelledby={`${formId}-flows-label`}
            aria-describedby={`${formId}-flows-hint`}
            className="mt-2 min-h-11 w-24 border border-line bg-canvas px-3 text-muted"
          />
        </div>
        <div>
          <p className="text-sm font-medium" id={`${formId}-client-label`}>
            Client only
          </p>
          <p id={`${formId}-client-hint`} className="mt-1 text-sm text-muted">
            Fixed at true. Generated work stays in the client prototype.
          </p>
          <input
            type="text"
            value="true"
            readOnly
            aria-labelledby={`${formId}-client-label`}
            aria-describedby={`${formId}-client-hint`}
            className="mt-2 min-h-11 w-24 border border-line bg-canvas px-3 font-mono text-sm text-muted"
          />
        </div>
        <div>
          <p className="text-sm font-medium" id={`${formId}-data-label`}>
            Data mode
          </p>
          <p id={`${formId}-data-hint`} className="mt-1 text-sm text-muted">
            Mock or local data only. Live customer data is outside this slice.
          </p>
          <input
            type="text"
            value="mock_or_local"
            readOnly
            aria-labelledby={`${formId}-data-label`}
            aria-describedby={`${formId}-data-hint`}
            className="mt-2 min-h-11 w-full border border-line bg-canvas px-3 font-mono text-sm text-muted"
          />
        </div>
      </fieldset>

      <fieldset className="space-y-3 border-t border-line pt-6">
        <legend className="text-sm font-medium">Attachments</legend>
        <p id={`${formId}-attach-hint`} className="text-sm text-muted">
          Optional. Up to five text, Markdown, PDF, PNG, JPEG, or WebP references. Uploaded
          references stay in this draft after a validation warning. Files chosen but not yet
          submitted stay only until you leave this page.
        </p>
        {attachmentError ? (
          <p id={`${formId}-attach-error`} className="text-sm text-alert">
            {attachmentError}
          </p>
        ) : null}
        <ul className="space-y-2">
          {draft.attachments.map((item) => (
            <li key={item.id} className="flex items-center gap-2 text-sm">
              <span className="min-h-11 flex-1 border border-line bg-surface px-3 py-3">
                {item.filename} · {item.media_type} · {item.size_bytes} bytes
              </span>
              <button
                type="button"
                onClick={() => removeUploaded(item.id)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center border border-line"
                aria-label={`Remove ${item.filename}`}
              >
                <Minus size={16} weight="regular" aria-hidden="true" />
              </button>
            </li>
          ))}
          {pendingFiles.map((item) => (
            <li key={item.key} className="flex items-center gap-2 text-sm">
              <span className="min-h-11 flex-1 border border-line bg-surface px-3 py-3">
                {item.file.name} · selected, not yet submitted
              </span>
              <button
                type="button"
                onClick={() => removePending(item.key)}
                className="inline-flex min-h-11 min-w-11 items-center justify-center border border-line"
                aria-label={`Remove ${item.file.name}`}
              >
                <Minus size={16} weight="regular" aria-hidden="true" />
              </button>
            </li>
          ))}
        </ul>
        <label className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-line px-4 text-sm">
          <Paperclip size={16} weight="regular" aria-hidden="true" />
          Add attachment
          <input
            id={`${formId}-attach`}
            name="attachments"
            type="file"
            multiple
            accept="text/plain,text/markdown,application/pdf,image/png,image/jpeg,image/webp,.txt,.md,.pdf,.png,.jpg,.jpeg,.webp"
            onChange={onPickFiles}
            aria-describedby={`${formId}-attach-hint${attachmentError ? ` ${formId}-attach-error` : ''}`}
            className="sr-only"
          />
        </label>
      </fieldset>

      <div className="border-t border-line pt-6">
        <div className="flex gap-3">
          <input
            id={`${formId}-warning`}
            name="mock_data_acknowledged"
            type="checkbox"
            checked={draft.mock_data_acknowledged}
            onChange={(event) => update('mock_data_acknowledged', event.target.checked)}
            aria-invalid={Boolean(warningError)}
            aria-describedby={`${formId}-warning-hint${warningError ? ` ${formId}-warning-error` : ''}`}
            className="mt-1 h-5 w-5 accent-pine"
          />
          <div>
            <label htmlFor={`${formId}-warning`} className="text-sm font-medium">
              I acknowledge the sensitive-data warning
            </label>
            <p id={`${formId}-warning-hint`} className="mt-1 text-sm text-muted">
              Do not put real customer records, secrets, or other sensitive data in this
              goal or its attachments. The control plane keeps the prototype on mock or
              local data.
            </p>
            {warningError ? (
              <p id={`${formId}-warning-error`} className="mt-1 text-sm text-alert">
                {warningError}
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <p className="text-sm leading-relaxed text-muted">
        Submit records an immutable goal version and a run in intake. The next screen shows
        that persisted status. It does not invent generated narration.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 bg-pine px-5 text-surface disabled:opacity-60"
      >
        {pending ? 'Submitting goal' : 'Submit goal'}
      </button>
    </form>
  );
}

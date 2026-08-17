'use client';

import { type FormEvent, useEffect, useId, useState } from 'react';
import { Minus, Plus } from '@phosphor-icons/react';
import { createCompany, getCurrentCompany, replaceProfile } from '../api/client';
import { associateFieldErrors, formAlert, isApiError } from '../api/errors';
import type { Company, CompanyDraft } from '../api/types';
import {
  companyToDraft,
  toCreateBody,
  toProfileBody,
  validateDraft,
  writeDraft,
} from './draft';

interface CompanySetupFormProps {
  mode: 'create' | 'edit';
  initial: CompanyDraft;
  etag: string | null;
  onCommitted: (company: Company, etag: string | null, replayed: boolean) => void;
}

export function CompanySetupForm({ mode, initial, etag, onCommitted }: CompanySetupFormProps) {
  const [draft, setDraft] = useState<CompanyDraft>(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [alert, setAlert] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [currentEtag, setCurrentEtag] = useState(etag);
  const formId = useId();

  useEffect(() => {
    writeDraft(draft);
  }, [draft]);

  function update<K extends keyof CompanyDraft>(key: K, value: CompanyDraft[K]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function updateConstraint(index: number, value: string) {
    setDraft((current) => {
      const next = [...current.constraints];
      next[index] = value;
      return { ...current, constraints: next };
    });
  }

  function addConstraint() {
    setDraft((current) =>
      current.constraints.length >= 20
        ? current
        : { ...current, constraints: [...current.constraints, ''] },
    );
  }

  function removeConstraint(index: number) {
    setDraft((current) => {
      const next = current.constraints.filter((_, itemIndex) => itemIndex !== index);
      return { ...current, constraints: next.length > 0 ? next : [''] };
    });
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const clientErrors = validateDraft(draft, mode);
    setFieldErrors(clientErrors);
    if (Object.keys(clientErrors).length > 0) {
      setAlert('Correct the highlighted fields and retry.');
      return;
    }
    setPending(true);
    setAlert(null);
    try {
      if (mode === 'create') {
        const result = await createCompany(toCreateBody(draft));
        onCommitted(result.company, result.etag, result.replayed);
        return;
      }
      if (!currentEtag) {
        setAlert('Refresh the company profile before saving. An If-Match tag is required.');
        return;
      }
      const result = await replaceProfile(toProfileBody(draft), currentEtag);
      onCommitted(result.company, result.etag, result.replayed);
    } catch (caught) {
      if (isApiError(caught) && caught.status === 412) {
        try {
          const fresh = await getCurrentCompany();
          setCurrentEtag(fresh.etag);
          setDraft(companyToDraft(fresh.company));
          setAlert(
            'The company profile changed. The form now shows the current version. Review and save again.',
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
      setAlert('The company profile could not be saved. Retry the same submit.');
    } finally {
      setPending(false);
    }
  }

  const nameError = fieldErrors.name;
  const purposeError = fieldErrors.purpose;
  const targetError = fieldErrors.target_customer;
  const constraintsError = fieldErrors.constraints;
  const screensError = fieldErrors['normalized_limits.max_screens'];
  const warningError = fieldErrors.sensitive_data_warning_acknowledged;

  return (
    <form className="space-y-8" onSubmit={(event) => void onSubmit(event)} noValidate>
      {alert ? (
        <p role="alert" className="border border-alert/30 bg-surface px-4 py-3 text-sm text-alert">
          {alert}
        </p>
      ) : null}

      <div>
        <label htmlFor={`${formId}-name`} className="block text-sm font-medium">
          Company name
        </label>
        <p id={`${formId}-name-hint`} className="mt-1 text-sm text-muted">
          {mode === 'create'
            ? '2 to 120 characters. The name is set when the company is created.'
            : 'Company name is set at creation and is not replaced by later profile edits.'}
        </p>
        <input
          id={`${formId}-name`}
          name="name"
          type="text"
          value={draft.name}
          onChange={(event) => update('name', event.target.value)}
          disabled={mode === 'edit'}
          aria-invalid={Boolean(nameError)}
          aria-describedby={`${formId}-name-hint${nameError ? ` ${formId}-name-error` : ''}`}
          className="mt-2 min-h-11 w-full border border-line bg-surface px-3 outline-none focus:ring-2 focus:ring-pine disabled:text-muted"
        />
        {nameError ? (
          <p id={`${formId}-name-error`} className="mt-1 text-sm text-alert">
            {nameError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-purpose`} className="block text-sm font-medium">
          Purpose
        </label>
        <p id={`${formId}-purpose-hint`} className="mt-1 text-sm text-muted">
          10 to 1,000 characters. Describe what this company exists to do.
        </p>
        <textarea
          id={`${formId}-purpose`}
          name="purpose"
          rows={5}
          value={draft.purpose}
          onChange={(event) => update('purpose', event.target.value)}
          aria-invalid={Boolean(purposeError)}
          aria-describedby={`${formId}-purpose-hint ${formId}-purpose-count${purposeError ? ` ${formId}-purpose-error` : ''}`}
          className="mt-2 w-full border border-line bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-pine"
        />
        <p id={`${formId}-purpose-count`} className="mt-1 font-mono text-xs text-muted">
          {draft.purpose.trim().length} / 1000
        </p>
        {purposeError ? (
          <p id={`${formId}-purpose-error`} className="mt-1 text-sm text-alert">
            {purposeError}
          </p>
        ) : null}
      </div>

      <div>
        <label htmlFor={`${formId}-customer`} className="block text-sm font-medium">
          Target customer
        </label>
        <p id={`${formId}-customer-hint`} className="mt-1 text-sm text-muted">
          3 to 500 characters.
        </p>
        <textarea
          id={`${formId}-customer`}
          name="target_customer"
          rows={3}
          value={draft.target_customer}
          onChange={(event) => update('target_customer', event.target.value)}
          aria-invalid={Boolean(targetError)}
          aria-describedby={`${formId}-customer-hint${targetError ? ` ${formId}-customer-error` : ''}`}
          className="mt-2 w-full border border-line bg-surface px-3 py-2 outline-none focus:ring-2 focus:ring-pine"
        />
        {targetError ? (
          <p id={`${formId}-customer-error`} className="mt-1 text-sm text-alert">
            {targetError}
          </p>
        ) : null}
      </div>

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Durable constraints</legend>
        <p id={`${formId}-constraints-hint`} className="text-sm text-muted">
          1 to 20 constraints. Each stays with the company across later runs.
        </p>
        {constraintsError ? (
          <p id={`${formId}-constraints-error`} className="text-sm text-alert">
            {constraintsError}
          </p>
        ) : null}
        <ul className="space-y-3" aria-describedby={`${formId}-constraints-hint`}>
          {draft.constraints.map((constraint, index) => {
            const fieldId = `${formId}-constraint-${index}`;
            return (
              <li key={fieldId} className="flex gap-2">
                <label htmlFor={fieldId} className="sr-only">
                  Constraint {index + 1}
                </label>
                <input
                  id={fieldId}
                  name={`constraints.${index}`}
                  type="text"
                  value={constraint}
                  onChange={(event) => updateConstraint(index, event.target.value)}
                  aria-invalid={Boolean(constraintsError)}
                  className="min-h-11 w-full border border-line bg-surface px-3 outline-none focus:ring-2 focus:ring-pine"
                />
                <button
                  type="button"
                  onClick={() => removeConstraint(index)}
                  className="inline-flex min-h-11 min-w-11 items-center justify-center border border-line"
                  aria-label={`Remove constraint ${index + 1}`}
                >
                  <Minus size={16} weight="regular" aria-hidden="true" />
                </button>
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={addConstraint}
          disabled={draft.constraints.length >= 20}
          className="inline-flex min-h-11 items-center gap-2 border border-line px-4 text-sm"
        >
          <Plus size={16} weight="regular" aria-hidden="true" />
          Add constraint
        </button>
      </fieldset>

      <fieldset className="space-y-4 border-t border-line pt-6">
        <legend className="text-sm font-medium">Prototype limits</legend>
        <p className="text-sm text-muted">
          These limits are part of the committed profile. The prototype stays inside
          five screens, one primary flow, and mock or local data.
        </p>
        <div>
          <label htmlFor={`${formId}-screens`} className="block text-sm font-medium">
            Maximum screens
          </label>
          <p id={`${formId}-screens-hint`} className="mt-1 text-sm text-muted">
            Choose 1 to 5. The generated prototype cannot exceed this count.
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

      <div className="border-t border-line pt-6">
        <div className="flex gap-3">
          <input
            id={`${formId}-warning`}
            name="sensitive_data_warning_acknowledged"
            type="checkbox"
            checked={draft.sensitive_data_warning_acknowledged}
            onChange={(event) => update('sensitive_data_warning_acknowledged', event.target.checked)}
            aria-invalid={Boolean(warningError)}
            aria-describedby={`${formId}-warning-hint${warningError ? ` ${formId}-warning-error` : ''}`}
            className="mt-1 h-5 w-5 accent-pine"
          />
          <div>
            <label htmlFor={`${formId}-warning`} className="text-sm font-medium">
              I acknowledge the sensitive-data warning
            </label>
            <p id={`${formId}-warning-hint`} className="mt-1 text-sm text-muted">
              Do not put real customer records, secrets, or other sensitive data in
              this profile. The control plane rejects unacknowledged submissions.
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
        Saving commits a profile version. Later edits replace the current profile
        for future runs. An already-started run keeps the frozen snapshot it
        captured.
      </p>

      <button
        type="submit"
        disabled={pending}
        className="min-h-11 bg-pine px-5 text-surface disabled:opacity-60"
      >
        {pending ? 'Saving company profile' : mode === 'create' ? 'Create company profile' : 'Save profile version'}
      </button>
    </form>
  );
}

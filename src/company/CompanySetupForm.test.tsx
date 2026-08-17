import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CompanySetupForm } from './CompanySetupForm';
import { EMPTY_DRAFT, readDraft } from './draft';

vi.mock('../api/client', () => ({
  createCompany: vi.fn(),
  getCurrentCompany: vi.fn(),
  replaceProfile: vi.fn(),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

describe('CompanySetupForm', () => {
  it('labels required fields and preserves a recoverable draft', async () => {
    const user = userEvent.setup();
    render(
      <CompanySetupForm mode="create" initial={EMPTY_DRAFT} etag={null} onCommitted={vi.fn()} />,
    );

    expect(screen.getByLabelText('Company name')).toBeInTheDocument();
    expect(screen.getByLabelText('Purpose')).toBeInTheDocument();
    expect(screen.getByLabelText('Target customer')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum screens')).toBeInTheDocument();
    expect(screen.getByLabelText('I acknowledge the sensitive-data warning')).toBeInTheDocument();
    expect(screen.getByText(/already-started run keeps the frozen snapshot/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Company name'), 'North Desk Studio');
    expect(readDraft()?.name).toBe('North Desk Studio');
  });

  it('associates client validation errors with fields', async () => {
    const user = userEvent.setup();
    render(
      <CompanySetupForm mode="create" initial={EMPTY_DRAFT} etag={null} onCommitted={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: 'Create company profile' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/highlighted fields/i);
    expect(screen.getByText(/company name between 2 and 120/i)).toBeInTheDocument();
  });
});

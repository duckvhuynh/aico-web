import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GoalIntakeForm } from './GoalIntakeForm';
import { EMPTY_DRAFT, readDraft } from './draft';

vi.mock('../api/client', () => ({
  createAttachment: vi.fn(),
  createGoal: vi.fn(),
  ensureCurrentInitiative: vi.fn(),
  getCurrentCompany: vi.fn(),
  getCurrentInitiative: vi.fn(),
}));

afterEach(() => {
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
});

describe('GoalIntakeForm', () => {
  it('labels required fields and preserves a recoverable draft', async () => {
    const user = userEvent.setup();
    render(
      <GoalIntakeForm initial={EMPTY_DRAFT} onSubmitted={vi.fn()} onNeedCompany={vi.fn()} />,
    );

    expect(screen.getByRole('heading', { name: 'Prototype limits' })).toBeInTheDocument();
    expect(
      screen.getByText(/This intake stays inside one primary flow, at most five screens/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Target user')).toBeInTheDocument();
    expect(screen.getByLabelText('Problem')).toBeInTheDocument();
    expect(screen.getByLabelText('Desired outcome')).toBeInTheDocument();
    expect(screen.getByLabelText('Primary flow')).toBeInTheDocument();
    expect(screen.getByLabelText('Visual direction')).toBeInTheDocument();
    expect(screen.getByLabelText('Maximum screens')).toBeInTheDocument();
    expect(screen.getByLabelText('I acknowledge the sensitive-data warning')).toBeInTheDocument();
    expect(screen.getByText(/does not invent generated narration/i)).toBeInTheDocument();

    await user.type(screen.getByLabelText('Target user'), 'Independent consultants');
    expect(readDraft()?.target_user).toBe('Independent consultants');
  });

  it('associates client validation errors with fields', async () => {
    const user = userEvent.setup();
    render(
      <GoalIntakeForm initial={EMPTY_DRAFT} onSubmitted={vi.fn()} onNeedCompany={vi.fn()} />,
    );
    await user.click(screen.getByRole('button', { name: 'Submit goal' }));
    expect(screen.getByRole('alert')).toHaveTextContent(/highlighted fields/i);
    expect(screen.getByText(/target user must be between 3 and 300/i)).toBeInTheDocument();
  });
});

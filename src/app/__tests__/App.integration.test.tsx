import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import React from 'react';
import App from '../../App';

vi.mock('@/utils/logger', () => ({
  logEvent: vi.fn(),
}));

describe('App integration', () => {
  it('toont setup-weergave bij opstarten', () => {
    render(<App />);

    expect(screen.getByText(/vaardigheidsniveau/i)).toBeInTheDocument();
    expect(screen.getByText(/kies je niveau en een activiteit/i)).toBeInTheDocument();
  });

  it('navigeert naar missies via navigatieknop', async () => {
    render(<App />);

    const missionsButton = screen.getAllByRole('button', { name: /missies/i })[0];
    fireEvent.click(missionsButton);

    expect(await screen.findByText(/dagelijkse missies/i)).toBeInTheDocument();
  });
});


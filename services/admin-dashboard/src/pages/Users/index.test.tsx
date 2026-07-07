import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Users from './index';

const renderUsers = () => render(<BrowserRouter><Users /></BrowserRouter>);

describe('Users', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('renders users page', async () => {
    renderUsers();
    await waitFor(() => expect(screen.queryByText('Users')).toBeTruthy(), { timeout: 10000 });
  });
});

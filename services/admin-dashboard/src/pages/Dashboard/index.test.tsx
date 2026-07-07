import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from './index';

const renderDashboard = () => render(<BrowserRouter><Dashboard /></BrowserRouter>);

describe('Dashboard', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('renders dashboard stats', async () => {
    renderDashboard();
    await waitFor(() => expect(screen.queryByText('Dashboard')).toBeTruthy(), { timeout: 10000 });
    expect(screen.queryByText('Total Users')).toBeTruthy();
    expect(screen.queryByText('Active API Keys')).toBeTruthy();
  });
});

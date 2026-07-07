import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ApiKeys from './index';

const renderApiKeys = () => render(<BrowserRouter><ApiKeys /></BrowserRouter>);

describe('ApiKeys', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('renders api keys page', async () => {
    renderApiKeys();
    await waitFor(() => expect(screen.queryByText('Developer API Keys')).toBeTruthy(), { timeout: 10000 });
  });
});

import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Login from './index';

const renderLogin = () => render(<BrowserRouter><Login /></BrowserRouter>);

describe('Login', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.resetAllMocks();
  });

  it('renders login form', () => {
    renderLogin();
    expect(screen.getByText('API Platform Admin')).toBeDefined();
    expect(screen.getByPlaceholderText('Email')).toBeDefined();
    expect(screen.getByPlaceholderText('Password')).toBeDefined();
  });
});

import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

// Mock zustand stores
vi.mock('./state', () => ({
  useProjectStore: vi.fn(() => ({
    currentProject: null,
    initializeApp: vi.fn(),
    setCurrentProject: vi.fn(),
  })),
}));

// Mock electronAPI for renderer
Object.defineProperty(window, 'electronAPI', {
  value: {
    setup: {
      scan: vi.fn().mockResolvedValue({ score: 0, blocking: [], warnings: [], checks: [] }),
      repair: vi.fn().mockResolvedValue({ created: [] }),
      createProject: vi.fn().mockResolvedValue({ success: true, projectRoot: '/tmp/test', readiness: { score: 100, blocking: [], warnings: [] } }),
      adopt: vi.fn().mockResolvedValue({ success: true }),
    },
    dialog: {
      openFile: vi.fn().mockResolvedValue(undefined),
    },
  },
  writable: true,
});

describe('App — setup gateway routing', () => {
  it('renders SetupGateway when no project selected', async () => {
    const { useProjectStore } = await import('./state');
    (useProjectStore as any).mockReturnValue({
      currentProject: null,
      initializeApp: vi.fn(),
      setCurrentProject: vi.fn(),
    });

    const { default: App } = await import('./App');
    render(React.createElement(App));

    // Should show setup gateway, not dashboard
    expect(screen.getByText(/Welcome to AI-PM Toolkit/)).toBeDefined();
    expect(screen.getByText(/New Project/)).toBeDefined();
    expect(screen.getByText(/Use Existing Project/)).toBeDefined();
    expect(screen.getByText(/Demo Project/)).toBeDefined();
  });

  it('does NOT show Dashboard when no project', async () => {
    const { useProjectStore } = await import('./state');
    (useProjectStore as any).mockReturnValue({
      currentProject: null,
      initializeApp: vi.fn(),
      setCurrentProject: vi.fn(),
    });

    const { default: App } = await import('./App');
    render(React.createElement(App));

    // Should NOT show sidebar or project view
    expect(screen.queryByText(/Dashboard/)).toBeNull();
  });
});

import { describe, expect, it } from 'vitest';
import { pageTitle } from './pageTitle';

describe('pageTitle', () => {
  it('names the section and the signed in user', () => {
    expect(pageTitle('/dashboard', 'Ravi Menon')).toBe('Overview · Ravi Menon');
    expect(pageTitle('/projects', 'Aditi Rao')).toBe('Projects · Aditi Rao');
  });

  it('matches the sidebar wording for a developer', () => {
    expect(pageTitle('/tasks', 'Karan Patel', 'DEVELOPER')).toBe('My Tasks · Karan Patel');
    expect(pageTitle('/tasks', 'Ravi Menon', 'PROJECT_MANAGER')).toBe('Tasks · Ravi Menon');
  });

  it('keeps the section when a detail route is open', () => {
    expect(pageTitle('/tasks/abc-123', 'Karan Patel', 'DEVELOPER')).toBe('My Tasks · Karan Patel');
    expect(pageTitle('/projects/abc-123', 'Ravi Menon')).toBe('Projects · Ravi Menon');
  });

  it('falls back for routes outside the workspace', () => {
    expect(pageTitle('/', 'Ravi Menon')).toBe('Velozity Dashboard');
    expect(pageTitle('/login')).toBe('Velozity Dashboard');
    expect(pageTitle('/nonsense', 'Ravi Menon')).toBe('Velozity Dashboard');
  });

  it('omits the name when nobody is signed in yet', () => {
    expect(pageTitle('/dashboard')).toBe('Overview');
  });
});

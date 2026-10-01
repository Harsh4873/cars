import { act } from 'react';

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
import { createRoot } from 'react-dom/client';
import App from './App';

function renderApp() {
  const el = document.createElement('div');
  document.body.appendChild(el);
  const root = createRoot(el);
  act(() => {
    root.render(<App />);
  });
  return {
    el,
    cleanup() {
      act(() => root.unmount());
      el.remove();
    },
  };
}

describe('swipe deck', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('shows flags and saves a match', () => {
    const view = renderApp();
    expect(view.el.textContent).toContain('Green flag');
    expect(view.el.textContent).toContain('Red flag');
    const first = view.el.querySelector('h1')?.textContent ?? '';

    const like = view.el.querySelector<HTMLButtonElement>('[aria-label="Like"]');
    act(() => like?.click());
    const second = view.el.querySelector('h1')?.textContent ?? '';
    expect(second).not.toBe(first);

    const matches = view.el.querySelector<HTMLButtonElement>('[aria-label="Matches"]');
    act(() => matches?.click());
    expect(view.el.textContent).toContain(first);

    const details = view.el.querySelector<HTMLButtonElement>('li button');
    act(() => details?.click());
    expect(view.el.textContent).toContain('Open the listing');
    expect(view.el.textContent).toContain('Complaint year');
    expect(view.el.textContent).toContain('better');
    expect(view.el.textContent).toContain('Known weak spots');
    view.cleanup();
  });
});

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

  it('shows the Accord and saves a match', () => {
    const view = renderApp();
    expect(view.el.textContent).toContain('2012 Honda Accord');
    expect(view.el.textContent).toContain('$7,500');
    expect(view.el.textContent).toContain('68,600 mi');

    const like = view.el.querySelector<HTMLButtonElement>('[aria-label="Like"]');
    act(() => like?.click());
    expect(view.el.textContent).toContain('2007 Honda CR-V');

    const matches = view.el.querySelector<HTMLButtonElement>('[aria-label="Matches"]');
    act(() => matches?.click());
    expect(view.el.textContent).toContain('2012 Honda Accord');
    expect(view.el.textContent).toContain('Houston');

    const details = view.el.querySelector<HTMLButtonElement>('li button');
    act(() => details?.click());
    expect(view.el.textContent).toContain('Open the listing');
    expect(view.el.textContent).toContain('Known weak spots');
    view.cleanup();
  });
});

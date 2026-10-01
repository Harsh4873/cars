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

  it('shows the Katy Civic and saves a match', () => {
    const view = renderApp();
    expect(view.el.textContent).toContain('2009 Honda Civic');
    expect(view.el.textContent).toContain('$7,673');
    expect(view.el.textContent).toContain('126,201 mi');
    expect(view.el.textContent).toContain('Seven Lakes');

    const like = view.el.querySelector<HTMLButtonElement>('[aria-label="Like"]');
    act(() => like?.click());
    expect(view.el.textContent).toContain('2008 Honda Civic');
    expect(view.el.textContent).toContain('Texas A&M');

    const matches = view.el.querySelector<HTMLButtonElement>('[aria-label="Matches"]');
    act(() => matches?.click());
    expect(view.el.textContent).toContain('2009 Honda Civic');
    expect(view.el.textContent).toContain('Katy');

    const details = view.el.querySelector<HTMLButtonElement>('li button');
    act(() => details?.click());
    expect(view.el.textContent).toContain('Open the listing');
    expect(view.el.textContent).toContain('Complaint year');
    expect(view.el.textContent).toContain('typical');
    expect(view.el.textContent).toContain('Known weak spots');
    view.cleanup();
  });
});

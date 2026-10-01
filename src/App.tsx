import { useEffect, useRef, useState, type PointerEvent } from 'react';
import { CARS, CHECKED_ON, MARKET_NOTES, YEAR_RECORDS, type Car, type YearGrade } from './cars';
import {
  decide,
  likes,
  miles,
  money,
  remainingIds,
  undo,
  type Decision,
} from './deck';
import { useCarsSync } from './useCarsSync';
import { filterBoard, makesIn, type BoardQuery, type BoardSort, type Place } from './boardFilter';

const ORDER = CARS.map((car) => car.id);
const BY_ID = new Map(CARS.map((car) => [car.id, car]));

export default function App() {
  const { history, updateHistory, status, message, user, signIn, signOut, configured } = useCarsSync(ORDER);
  const [showLikes, setShowLikes] = useState(false);
  const [board, setBoard] = useState(false);
  const [sheet, setSheet] = useState<Car | 'guide' | null>(null);
  const [photo, setPhoto] = useState(0);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const origin = useRef<{ x: number; y: number } | null>(null);
  const offset = useRef({ x: 0, y: 0 });
  const currentId = useRef<string | undefined>(undefined);

  const queue = remainingIds(ORDER, history);
  const current = queue[0] ? BY_ID.get(queue[0]) : undefined;
  const saved = likes(history)
    .map((id) => BY_ID.get(id))
    .filter((car): car is Car => Boolean(car));
  currentId.current = current?.id;

  useEffect(() => {
    setPhoto(0);
  }, [current?.id]);

  function commit(decision: Decision) {
    const id = currentId.current;
    if (!id) return;
    updateHistory((prev) => decide(prev, id, decision));
    origin.current = null;
    offset.current = { x: 0, y: 0 };
    setDrag({ x: 0, y: 0, active: false });
  }

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return;
      if (event.key === 'ArrowLeft') commit('nope');
      if (event.key === 'ArrowRight') commit('like');
      if (event.key === 'ArrowUp' && currentId.current) {
        const car = BY_ID.get(currentId.current);
        if (car) setSheet(car);
      }
      if (event.key === 'Escape') setSheet(null);
      if (event.key === 'z' && (event.metaKey || event.ctrlKey)) {
        updateHistory((prev) => undo(prev));
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function onPointerDown(event: PointerEvent<HTMLElement>) {
    if (event.button !== 0) return;
    origin.current = { x: event.clientX, y: event.clientY };
    offset.current = { x: 0, y: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDrag({ x: 0, y: 0, active: true });
  }

  function onPointerMove(event: PointerEvent<HTMLElement>) {
    if (!origin.current) return;
    const next = {
      x: event.clientX - origin.current.x,
      y: event.clientY - origin.current.y,
    };
    offset.current = next;
    setDrag({ ...next, active: true });
  }

  function onPointerUp() {
    if (!origin.current) return;
    const { x, y } = offset.current;
    origin.current = null;
    const mostlyUp = y < -90 && Math.abs(x) < 70;
    if (mostlyUp && current) {
      setSheet(current);
      setDrag({ x: 0, y: 0, active: false });
      return;
    }
    if (x > 110) {
      commit('like');
      return;
    }
    if (x < -110) {
      commit('nope');
      return;
    }
    setDrag({ x: 0, y: 0, active: false });
  }

  const tilt = drag.active ? drag.x / 18 : 0;
  const likeOpacity = Math.min(Math.max(drag.x / 110, 0), 1);
  const nopeOpacity = Math.min(Math.max(-drag.x / 110, 0), 1);

  return (
    <div className="app">
      <header className="top">
        <button className="wordmark" type="button" onClick={() => { setShowLikes(false); setBoard(false); setSheet(null); }}>
          cars
        </button>
        {configured ? (
          <div className="sync-controls" aria-live="polite">
            <span className={`sync-pill sync-${status}`} title={message}>
              {status === 'local' ? 'Local only' : status === 'connecting' ? 'Connecting' : status === 'syncing' ? 'Syncing' : status === 'synced' ? 'Synced' : status === 'offline' ? 'Offline' : 'Sync error'}
            </span>
            {user ? <button type="button" className="sync-button" onClick={() => void signOut()}>Sign out</button>
              : status !== 'error' || !message?.startsWith('Incomplete Firebase')
                ? <button type="button" className="sync-button" onClick={() => void signIn()}>Sign in with Google</button>
                : null}
          </div>
        ) : null}
        <div className="top-actions">
          <button type="button" className="text-button" onClick={() => { setBoard((open) => !open); setShowLikes(false); }}>
            {board ? 'Swipe' : 'Board'}
          </button>
          <button type="button" className="text-button" onClick={() => setSheet('guide')}>
            Guide
          </button>
          <button type="button" className="text-button" aria-label="Matches" onClick={() => { setShowLikes(true); setBoard(false); }}>
            Saved{saved.length > 0 ? ` ${saved.length}` : ''}
          </button>
        </div>
      </header>
      {status === 'error' && message ? <p className="sync-message" role="alert">{message}</p> : null}

      {showLikes ? (
        <Likes
          cars={saved}
          onOpen={(car) => setSheet(car)}
          onBack={() => setShowLikes(false)}
        />
      ) : board ? (
        <Board cars={CARS} onOpen={(car) => setSheet(car)} />
      ) : current ? (
        <main className="stage">
          <p className="lede">
            {queue.length} left · $5k to $8k · checked {CHECKED_ON}
          </p>
          {queue[1] ? <div className="card card-back" aria-hidden="true" /> : null}
          <article
            className={drag.active ? 'card dragging' : 'card'}
            style={{ transform: `translate(${drag.x}px, ${drag.y}px) rotate(${tilt}deg)` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <div className="photo">
              {current.photos.length > 1 ? (
                <>
                  <button
                    type="button"
                    className="photo-nav left"
                    aria-label="Previous photo"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setPhoto((index) => (index - 1 + current.photos.length) % current.photos.length)}
                  />
                  <button
                    type="button"
                    className="photo-nav right"
                    aria-label="Next photo"
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setPhoto((index) => (index + 1) % current.photos.length)}
                  />
                </>
              ) : null}
              <img
                key={current.photos[photo]}
                src={current.photos[photo]}
                alt={`${current.year} ${current.make} ${current.model}`}
                draggable={false}
                onError={(event) => {
                  event.currentTarget.style.display = 'none';
                  event.currentTarget.parentElement?.classList.add('photo-missing');
                }}
              />
              <span className="stamp stamp-like" style={{ opacity: likeOpacity }}>Like</span>
              <span className="stamp stamp-nope" style={{ opacity: nopeOpacity }}>Nope</span>
              <div className="dots" aria-label="Photos">
                {current.photos.map((src, index) => (
                  <button
                    key={src}
                    type="button"
                    className={index === photo ? 'dot on' : 'dot'}
                    aria-label={`Photo ${index + 1}`}
                    onPointerDown={(event) => event.stopPropagation()}
                    onClick={() => setPhoto(index)}
                  />
                ))}
              </div>
            </div>
            <div className="bio">
              <span className={`verdict verdict-${slug(current.verdict)}`}>{current.verdict}</span>
              <h1>
                {current.year} {current.make} {current.model}
              </h1>
              <p className="price">
                {money(current.price)}
                {current.priceNote ? <small> {current.priceNote}</small> : null}
              </p>
              <p className="meta">
                {current.trim} · {miles(current.miles)} · {current.city} · {current.drive}
              </p>
              <div className="flag green">
                <b>Green flag</b>
                <p>{current.greenFlag}</p>
              </div>
              <div className="flag red">
                <b>Red flag</b>
                <p>{current.redFlag}</p>
              </div>
              <button
                type="button"
                className="details"
                onPointerDown={(event) => event.stopPropagation()}
                onClick={() => setSheet(current)}
              >
                All the details
              </button>
            </div>
          </article>
          <div className="actions">
            <button type="button" className="round undo" aria-label="Undo" disabled={history.length === 0} onClick={() => updateHistory((prev) => undo(prev))}>
              ↩
            </button>
            <button type="button" className="round nope" aria-label="Pass" onClick={() => commit('nope')}>
              ✕
            </button>
            <button type="button" className="round like" aria-label="Like" onClick={() => commit('like')}>
              ♥
            </button>
          </div>
        </main>
      ) : (
        <Done
          saved={saved.length}
          passed={history.length - saved.length}
          onMatches={() => setShowLikes(true)}
          onReset={() => updateHistory(() => [])}
        />
      )}

      {sheet === 'guide' ? <Guide onClose={() => setSheet(null)} /> : null}
      {sheet && sheet !== 'guide' ? <CarSheet car={sheet} onClose={() => setSheet(null)} /> : null}
    </div>
  );
}

function slug(verdict: string): string {
  return verdict.toLowerCase().replace(/\s+/g, '-');
}

function Board({ cars, onOpen }: { cars: Car[]; onOpen: (car: Car) => void }) {
  const [query, setQuery] = useState<BoardQuery>({
    text: '',
    make: '',
    place: 'all',
    grade: 'all',
    sort: 'deck',
  });
  const shown = filterBoard(cars, query);
  const makes = makesIn(cars);
  const filtering = query.text !== '' || query.make !== '' || query.place !== 'all' || query.grade !== 'all' || query.sort !== 'deck';
  const set = (patch: Partial<BoardQuery>) => setQuery((current) => ({ ...current, ...patch }));
  return (
    <main className="board">
      <p className="lede">{shown.length} of {cars.length} cars</p>
      <div className="board-tools">
        <input
          className="board-search"
          aria-label="Search cars"
          placeholder="Search make, model, city, dealer, truck"
          value={query.text}
          onChange={(event) => set({ text: event.target.value })}
        />
        <select className="board-select" aria-label="Filter by make" value={query.make} onChange={(event) => set({ make: event.target.value })}>
          <option value="">Every make</option>
          {makes.map((make) => <option key={make} value={make}>{make}</option>)}
        </select>
        <select className="board-select" aria-label="Sort cars" value={query.sort} onChange={(event) => set({ sort: event.target.value as BoardSort })}>
          <option value="deck">Listed order</option>
          <option value="price">Lowest price</option>
          <option value="miles">Lowest miles</option>
          <option value="newest">Newest year</option>
        </select>
      </div>
      <div className="filters" role="group" aria-label="Filter by place">
        {([
          ['all', 'Everywhere'],
          ['campus', 'Texas A&M'],
          ['seven-lakes', 'Seven Lakes'],
          ['houston', 'Houston'],
        ] as const).map(([place, label]) => (
          <button key={place} type="button" className={query.place === place ? 'text-button on' : 'text-button'} onClick={() => set({ place: place as Place })}>
            {label}
          </button>
        ))}
      </div>
      <div className="filters" role="group" aria-label="Filter by complaint year">
        {(['all', 'better', 'typical', 'worse'] as const).map((key) => (
          <button key={key} type="button" className={query.grade === key ? 'text-button on' : 'text-button'} onClick={() => set({ grade: key as YearGrade | 'all' })}>
            {key === 'all' ? 'Any record' : key}
          </button>
        ))}
        {filtering ? <button type="button" className="text-button" onClick={() => setQuery({ text: '', make: '', place: 'all', grade: 'all', sort: 'deck' })}>Clear</button> : null}
      </div>
      {shown.length === 0 ? <p className="empty">No cars match. Clear the search.</p> : null}
      <ul>
        {shown.map((car) => {
          const record = YEAR_RECORDS[car.id];
          return (
            <li key={car.id}>
              <button type="button" onClick={() => onOpen(car)}>
                <img src={car.photos[0]} alt="" />
                <span>
                  <strong>{car.year} {car.make} {car.model} {car.trim}</strong>
                  <em>{money(car.price)} · {miles(car.miles)} · {car.city}</em>
                  <em className="record-note">{record?.note}</em>
                </span>
                <b className={`verdict verdict-${record?.grade ?? 'typical'}`}>{record?.grade}</b>
              </button>
            </li>
          );
        })}
      </ul>
    </main>
  );
}

function Likes({ cars, onOpen, onBack }: { cars: Car[]; onOpen: (car: Car) => void; onBack: () => void }) {
  return (
    <main className="likes">
      <div className="likes-head">
        <button type="button" onClick={onBack}>Back to deck</button>
        <h1>Matches</h1>
      </div>
      {cars.length === 0 ? <p className="empty">Swipe right on a car and it lands here.</p> : null}
      <ul>
        {cars.map((car) => (
          <li key={car.id}>
            <button type="button" onClick={() => onOpen(car)}>
              <img src={car.photos[0]} alt="" />
              <span>
                <strong>{car.year} {car.make} {car.model}</strong>
                <em>{money(car.price)} · {miles(car.miles)} · {car.city}</em>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}

function Done({ saved, passed, onMatches, onReset }: { saved: number; passed: number; onMatches: () => void; onReset: () => void }) {
  return (
    <main className="done">
      <h1>That is the deck.</h1>
      <p>{saved} matched, {passed} passed. Listings move fast, so open the ones you liked before they disappear.</p>
      <button type="button" className="solid" onClick={onMatches}>Open matches</button>
      <button type="button" className="ghost" onClick={onReset}>Start over</button>
    </main>
  );
}

function Guide({ onClose }: { onClose: () => void }) {
  return (
    <div className="sheet-wrap" role="presentation" onClick={onClose}>
      <section className="sheet" role="dialog" aria-label="How these cars were picked" onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>How these got in the deck</h2>
          <button type="button" onClick={onClose} aria-label="Close">Close</button>
        </header>
        <p className="sheet-kicker">Snapshot from Craigslist on {CHECKED_ON}. College Station had almost none of the reliable stuff left in this price.</p>
        {MARKET_NOTES.map((note) => <p key={note}>{note}</p>)}
      </section>
    </div>
  );
}

function CarSheet({ car, onClose }: { car: Car; onClose: () => void }) {
  return (
    <div className="sheet-wrap" role="presentation" onClick={onClose}>
      <section className="sheet" role="dialog" aria-label={`${car.year} ${car.make} ${car.model}`} onClick={(event) => event.stopPropagation()}>
        <header>
          <h2>{car.year} {car.make} {car.model} {car.trim}</h2>
          <button type="button" onClick={onClose} aria-label="Close">Close</button>
        </header>
        <p className="sheet-price">{money(car.price)}{car.priceNote ? ` · ${car.priceNote}` : ''}</p>
        <div className="flag green"><b>Green flag</b><p>{car.greenFlag}</p></div>
        <div className="flag red"><b>Red flag</b><p>{car.redFlag}</p></div>
        <dl>
          <div><dt>Miles</dt><dd>{miles(car.miles)}</dd></div>
          <div><dt>Where</dt><dd>{car.city}, {car.drive}</dd></div>
          <div><dt>Owners</dt><dd>{car.owners}</dd></div>
          <div><dt>Title</dt><dd>{car.title}</dd></div>
          <div><dt>Seller</dt><dd>{car.dealer}</dd></div>
          <div><dt>VIN</dt><dd>{car.vin}</dd></div>
          <div><dt>Color</dt><dd>{car.color}</dd></div>
          <div><dt>Drivetrain</dt><dd>{car.drivetrain}</dd></div>
        </dl>
        <h3>Complaint year</h3>
        <p><span className={`verdict verdict-${YEAR_RECORDS[car.id]?.grade ?? 'typical'}`}>{YEAR_RECORDS[car.id]?.grade}</span></p>
        <p>{YEAR_RECORDS[car.id]?.note}</p>
        <h3>Why it is here</h3>
        <p>{car.why}</p>
        <h3>What the seller said</h3>
        <p>{car.sellerSays}</p>
        <h3>Known weak spots</h3>
        <ul>{car.watch.map((item) => <li key={item}>{item}</li>)}</ul>
        <h3>Check before you pay</h3>
        <ul>{car.check.map((item) => <li key={item}>{item}</li>)}</ul>
        <a className="listing" href={car.listingUrl} target="_blank" rel="noreferrer">Open the listing</a>
        <p className="fine">Photos and asking prices come from the live ad. When the ad ends, this card goes stale.</p>
      </section>
    </div>
  );
}

import { useCallback, useEffect, useRef, useState } from 'react';
import { onSnapshot, serverTimestamp, setDoc, type Unsubscribe } from 'firebase/firestore';
import type { User } from 'firebase/auth';
import { loadHistory, saveHistory, type HistoryItem } from './deck';
import { carsDocument, chooseHistory, HISTORY_UPDATED_KEY, parseCloudHistory, type HistoryVersion } from './carsSync';
import { getFirebaseServices, observeFirebaseAuth, signInToFirebaseWithGoogle, signOutOfFirebase } from './firebase';
import { isFirebaseConfigured, isFirebaseMisconfigured, missingFirebaseConfigKeys } from './firebaseConfig';
import { resolveOwnerVault } from './owner-vault';

type SyncStatus = 'local' | 'connecting' | 'syncing' | 'synced' | 'offline' | 'error';

const CLIENT_ID_KEY = 'harsh-bet-cars-v1-client-id';

function deviceClientId(): string {
  try {
    const existing = localStorage.getItem(CLIENT_ID_KEY);
    if (existing) return existing;
    const created = globalThis.crypto?.randomUUID?.() ?? `cars-${Date.now()}-${Math.random()}`;
    localStorage.setItem(CLIENT_ID_KEY, created);
    return created;
  } catch {
    return globalThis.crypto?.randomUUID?.() ?? `cars-${Date.now()}-${Math.random()}`;
  }
}

const clientId = deviceClientId();

function localTimestamp(): number {
  try {
    const value = Number(localStorage.getItem(HISTORY_UPDATED_KEY));
    return Number.isSafeInteger(value) && value > 0 ? value : 0;
  } catch { return 0; }
}

function persist(version: HistoryVersion) {
  saveHistory(version.history);
  localStorage.setItem(HISTORY_UPDATED_KEY, String(version.updatedAtMs));
}

function isOfflineError(error: unknown): boolean {
  return !navigator.onLine || Boolean(error && typeof error === 'object' && 'code' in error && String(error.code).includes('unavailable'));
}

function errorMessage(error: unknown): string {
  if (isOfflineError(error)) return 'Offline. Changes stay on this device and will sync when reconnected.';
  const code = error && typeof error === 'object' && 'code' in error ? String(error.code) : '';
  if (code.includes('popup-closed-by-user')) return 'Google sign-in was cancelled.';
  if (code.includes('permission-denied')) return 'This account cannot access the owner vault or Cars history.';
  return error instanceof Error ? error.message : 'Cars could not sync. Local history is safe.';
}

export function useCarsSync(knownIds: readonly string[]) {
  const [history, setHistory] = useState<HistoryItem[]>(() => loadHistory([...knownIds]));
  const version = useRef<HistoryVersion>({ history, updatedAtMs: localTimestamp(), clientId });
  const [status, setStatus] = useState<SyncStatus>(() => isFirebaseMisconfigured ? 'error' : 'local');
  const [message, setMessage] = useState<string | undefined>(() => isFirebaseMisconfigured
    ? `Incomplete Firebase configuration: ${missingFirebaseConfigKeys.join(', ')}` : undefined);
  const [user, setUser] = useState<User | null>(null);
  const vaultId = useRef<string | null>(null);
  const generation = useRef(0);
  const ready = useRef(false);
  const writeTimer = useRef<number | undefined>();
  const writingGeneration = useRef<number | null>(null);
  const remoteVersion = useRef<HistoryVersion | null>(null);
  const dbRef = useRef<Awaited<ReturnType<typeof getFirebaseServices>>>(null);

  const scheduleWrite = useCallback(() => {
    if (!ready.current || !vaultId.current || !dbRef.current || !navigator.onLine) return;
    window.clearTimeout(writeTimer.current);
    setStatus('syncing');
    writeTimer.current = window.setTimeout(async () => {
      if (writingGeneration.current === generation.current || !ready.current || !dbRef.current) return;
      const current = version.current;
      const remote = remoteVersion.current;
      if (remote && chooseHistory(current, remote) !== current) return;
      if (remote && current.updatedAtMs === remote.updatedAtMs && current.clientId === remote.clientId) {
        setStatus('synced');
        return;
      }
      const activeGeneration = generation.current;
      writingGeneration.current = activeGeneration;
      try {
        await setDoc(carsDocument(dbRef.current.db, vaultId.current!), {
          schemaVersion: 1,
          history: current.history,
          updatedAt: new Date(current.updatedAtMs).toISOString(),
          updatedAtMs: current.updatedAtMs,
          clientId: current.clientId,
          syncedAt: serverTimestamp(),
        });
        if (activeGeneration !== generation.current) return;
        remoteVersion.current = current;
        if (version.current === current) setStatus('synced');
      } catch (error) {
        if (activeGeneration === generation.current) {
          setStatus(isOfflineError(error) ? 'offline' : 'error');
          setMessage(errorMessage(error));
        }
      } finally {
        if (writingGeneration.current === activeGeneration) writingGeneration.current = null;
        if (activeGeneration === generation.current && version.current !== current) scheduleWrite();
      }
    }, 600);
  }, []);

  const updateHistory = useCallback((update: (previous: HistoryItem[]) => HistoryItem[]) => {
    const next = update(version.current.history);
    if (next === version.current.history) return;
    const updatedAtMs = Math.max(Date.now(), version.current.updatedAtMs + 1, (remoteVersion.current?.updatedAtMs ?? 0) + 1);
    version.current = { history: next, updatedAtMs, clientId };
    persist(version.current);
    setHistory(next);
    scheduleWrite();
  }, [scheduleWrite]);

  useEffect(() => {
    if (!isFirebaseConfigured) return;
    let disposed = false;
    let unsubscribeAuth: Unsubscribe | undefined;
    let unsubscribeHistory: Unsubscribe | undefined;
    const resetCloud = () => {
      generation.current += 1;
      window.clearTimeout(writeTimer.current);
      ready.current = false;
      remoteVersion.current = null;
      unsubscribeHistory?.();
      unsubscribeHistory = undefined;
      vaultId.current = null;
    };
    setStatus('connecting');
    let currentUser: User | null = null;
    const connect = async (signedIn: User | null) => {
      if (disposed) return;
      resetCloud();
      setUser(signedIn);
      if (!signedIn) { setStatus('local'); setMessage(undefined); return; }
      setStatus(navigator.onLine ? 'connecting' : 'offline');
      const activeGeneration = generation.current;
      try {
        const services = await getFirebaseServices();
        if (!services) return;
        const membership = await resolveOwnerVault(services.db, signedIn);
        if (disposed || activeGeneration !== generation.current) return;
        dbRef.current = services;
        vaultId.current = membership.vaultId;
        unsubscribeHistory = onSnapshot(carsDocument(services.db, membership.vaultId), { includeMetadataChanges: true }, (snapshot) => {
          if (disposed || activeGeneration !== generation.current) return;
          if (snapshot.metadata.fromCache || snapshot.metadata.hasPendingWrites) {
            setStatus(navigator.onLine ? snapshot.metadata.hasPendingWrites ? 'syncing' : 'connecting' : 'offline');
            return;
          }
          if (snapshot.exists()) {
            const remote = parseCloudHistory(snapshot.data(), knownIds);
            if (!remote) {
              setStatus('error');
              setMessage('The cloud history has an invalid format. Local history is safe.');
              return;
            }
            remoteVersion.current = remote;
            const winner = chooseHistory(version.current, remote);
            if (winner === remote) {
              version.current = remote;
              persist(remote);
              setHistory(remote.history);
            }
          } else {
            remoteVersion.current = null;
            if (version.current.updatedAtMs === 0) {
              version.current = { ...version.current, updatedAtMs: Date.now() };
              persist(version.current);
            }
          }
          ready.current = true;
          setMessage(undefined);
          if (!snapshot.exists() || chooseHistory(version.current, remoteVersion.current!) === version.current
            && (version.current.updatedAtMs !== remoteVersion.current!.updatedAtMs || version.current.clientId !== remoteVersion.current!.clientId)) {
            setStatus('syncing');
            window.setTimeout(scheduleWrite, 0);
          } else setStatus('synced');
        }, (error) => {
          if (!disposed && activeGeneration === generation.current) {
            ready.current = false;
            setStatus(isOfflineError(error) ? 'offline' : 'error');
            setMessage(errorMessage(error));
          }
        });
      } catch (error) {
        if (!disposed && activeGeneration === generation.current) {
          setStatus(isOfflineError(error) ? 'offline' : 'error');
          setMessage(errorMessage(error));
        }
      }
    };
    void observeFirebaseAuth((signedIn) => {
      currentUser = signedIn;
      void connect(signedIn);
    }, (error) => {
      if (!disposed) { setStatus('error'); setMessage(errorMessage(error)); }
    }).then((unsubscribe) => { if (disposed) unsubscribe(); else unsubscribeAuth = unsubscribe; }).catch((error) => {
      if (!disposed) { setStatus('error'); setMessage(errorMessage(error)); }
    });
    const online = () => {
      if (ready.current) scheduleWrite();
      else if (currentUser) void connect(currentUser);
      else setStatus('local');
    };
    const offline = () => setStatus('offline');
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => {
      disposed = true;
      resetCloud();
      unsubscribeAuth?.();
      window.removeEventListener('online', online);
      window.removeEventListener('offline', offline);
    };
  }, [knownIds, scheduleWrite]);

  const signIn = useCallback(async () => {
    setStatus('connecting');
    setMessage(undefined);
    try { await signInToFirebaseWithGoogle(); }
    catch (error) { setStatus('error'); setMessage(errorMessage(error)); }
  }, []);
  const signOut = useCallback(async () => {
    try { await signOutOfFirebase(); }
    catch (error) { setStatus('error'); setMessage(errorMessage(error)); }
  }, []);

  return { history, updateHistory, status, message, user, signIn, signOut, configured: isFirebaseConfigured || isFirebaseMisconfigured };
}

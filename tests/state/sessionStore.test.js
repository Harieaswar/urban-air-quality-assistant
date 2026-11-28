/**
 * Unit Tests for Profile Import Validation, LocalStorage Persistence, Reducer, and Storage Errors.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { validateProfileImport } from '@/utils/validate';
import { STORAGE_KEY } from '@/state/initialState';
import {
  appReducer,
  loadPersistedState,
  loadPersistedStateWithStatus,
  persistState,
} from '@/state/sessionStore';

describe('validateProfileImport', () => {
  it('accepts direct profiles and wrapped report bundles, and rejects malformed inputs', () => {
    expect(validateProfileImport('').valid).toBe(false);
    expect(validateProfileImport('{not-json').valid).toBe(false);
    expect(validateProfileImport('[]').valid).toBe(false);
    expect(validateProfileImport(JSON.stringify({ version: '2.0.0' })).valid).toBe(false);
    expect(
      validateProfileImport(JSON.stringify({ location: { name: 'Delhi' }, rooms: { list: 'bad' } }))
        .valid
    ).toBe(false);

    const direct = validateProfileImport(JSON.stringify({ location: { name: 'Salem' } }));
    expect(direct.valid).toBe(true);
    expect(direct.data.location.name).toBe('Salem');

    const bundle = validateProfileImport(
      JSON.stringify({ profile: { family: { householdSize: 3 } } })
    );
    expect(bundle.valid).toBe(true);
    expect(bundle.data.family.householdSize).toBe(3);
  });
});

describe('sessionStore persistence & reducer error handling', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.restoreAllMocks();
  });

  it('handles missing, corrupted JSON, non-object JSON, and quota failures without console noise', () => {
    const empty = loadPersistedStateWithStatus();
    expect(empty.error).toBeNull();
    expect(empty.state.wizardStep).toBe(1);

    localStorage.setItem(STORAGE_KEY, '{corrupted-json');
    const corrupted = loadPersistedStateWithStatus();
    expect(corrupted.error?.name).toBe('StorageAccessError');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    localStorage.setItem(STORAGE_KEY, '[1,2,3]');
    const nonObj = loadPersistedStateWithStatus();
    expect(nonObj.error?.name).toBe('StorageAccessError');
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();

    const saveOk = persistState(corrupted.state);
    expect(saveOk.ok).toBe(true);

    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });
    const saveFail = persistState(corrupted.state);
    expect(saveFail.ok).toBe(false);
    expect(saveFail.error?.name).toBe('StorageAccessError');
  });

  it('merges partial stored sections cleanly and enforces reducer invariants', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ wizardStep: 2, location: { name: 'Pune' }, rooms: { list: [] } })
    );
    const loaded = loadPersistedState();
    expect(loaded.wizardStep).toBe(2);
    expect(loaded.location.name).toBe('Pune');
    expect(loaded.rooms.list.length).toBe(1);

    const clamped = appReducer(loaded, { type: 'SET_STEP', step: 99 });
    expect(clamped.wizardStep).toBe(4);

    const toggledNone = appReducer(clamped, { type: 'TOGGLE_SENSITIVE_GROUP', id: 'none' });
    expect(toggledNone.family.sensitiveGroups).toEqual(['none']);

    const added = appReducer(toggledNone, { type: 'ADD_ROOM' });
    expect(added.rooms.list.length).toBe(2);
    const removed = appReducer(added, { type: 'REMOVE_ROOM', id: added.rooms.list[1].id });
    expect(removed.rooms.list.length).toBe(1);
    const cannotRemoveLast = appReducer(removed, {
      type: 'REMOVE_ROOM',
      id: removed.rooms.list[0].id,
    });
    expect(cannotRemoveLast.rooms.list.length).toBe(1);
  });
});

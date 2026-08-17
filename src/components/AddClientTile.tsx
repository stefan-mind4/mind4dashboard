import { useState } from 'react';
import { slugify } from '../lib/format';
import type { ClientRow, ProfileMap } from '../types';

interface Props {
  profiles: ProfileMap;
  existingIds: string[];
  onSave: (row: Omit<ClientRow, 'updated_at'>) => Promise<void>;
}

export default function AddClientTile({ profiles, existingIds, onSave }: Props) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [domain, setDomain] = useState('');
  const [account, setAccount] = useState('');
  const [desc, setDesc] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function reset() {
    setName('');
    setDomain('');
    setAccount('');
    setDesc('');
    setError('');
  }

  function toggle() {
    setOpen((o) => !o);
    setError('');
  }

  async function save() {
    const trimmedName = name.trim();
    const digits = account.replace(/[^0-9]/g, '');
    if (!trimmedName) return setError('Name fehlt.');
    if (digits.length !== 10) return setError('Kundennummer muss 10 Ziffern haben.');
    const id = slugify(trimmedName);
    if (!id) return setError('Aus dem Namen lässt sich keine ID bilden.');
    if (profiles[id] || existingIds.includes(id)) {
      return setError(`Client „${id}“ existiert bereits.`);
    }
    setSaving(true);
    setError('');
    try {
      await onSave({
        id,
        name: trimmedName,
        domain: domain.trim(),
        account: digits,
        description: desc.trim(),
        mock: false,
        active: true,
      });
      reset();
      setOpen(false);
    } catch (err) {
      console.warn('Client speichern fehlgeschlagen', err);
      setError('Speichern fehlgeschlagen — Verbindung prüfen.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="add-tile">
      {!open ? (
        <button type="button" className="add-tile__trigger" onClick={toggle}>
          <div className="add-tile__plus">+</div>
          <div className="add-tile__label">Add client</div>
          <div className="add-tile__hint">Appears in the next daily run</div>
        </button>
      ) : (
        <>
          <div className="add-tile__title">New client</div>
          <input
            type="text"
            className="field"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Name — e.g. Musterfirma GmbH"
          />
          <input
            type="text"
            className="field"
            value={domain}
            onChange={(e) => setDomain(e.target.value)}
            placeholder="Domain — e.g. musterfirma.at"
          />
          <input
            type="text"
            className="field field--mono"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="Google Ads Kundennummer — e.g. 1234567890"
          />
          <textarea
            className="field field--area"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            placeholder="Context for the AI — business model, goals, quirks (optional, editable later)"
          />
          {error && <div className="form-error">{error}</div>}
          <div className="form-actions">
            <button
              type="button"
              className="btn-primary"
              onClick={save}
              disabled={saving}
            >
              {saving ? 'Saving …' : 'Save client'}
            </button>
            <button type="button" className="btn-secondary" onClick={toggle}>
              Cancel
            </button>
          </div>
        </>
      )}
    </div>
  );
}

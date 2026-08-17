interface Props {
  note: string;
  /** Manuell aufgeklappt; ein vorhandener Text klappt ohnehin auf. */
  toggled: boolean;
  onToggle: () => void;
  onChange: (text: string) => void;
  placeholder: string;
}

/**
 * „+ Note for AI“-Link mit Textarea. Ein bereits gespeicherter Text haelt das
 * Feld offen und beschriftet den Link mit „(saved)“ — so wie in der Design-Referenz.
 */
export default function NoteField({ note, toggled, onToggle, onChange, placeholder }: Props) {
  const open = toggled || !!note;
  const label = open ? (note ? '✎ Note for AI (saved)' : '− Hide note') : '+ Note for AI';
  return (
    <>
      <button type="button" className="link-btn" onClick={onToggle}>
        {label}
      </button>
      {open && (
        <textarea
          className="note-area"
          value={note}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
        />
      )}
    </>
  );
}

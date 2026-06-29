import { useGen } from '../state/GeneratorContext';

/** Clears all content + style back to defaults (recoverability for the long
 *  form). Confirmed, since it discards the user's current work. */
export function ResetButton() {
  const { reset } = useGen();
  return (
    <button
      type="button"
      className="reset-btn"
      title="Clear all content and styling and start fresh"
      onClick={() => {
        if (window.confirm('Reset everything to defaults? Your current code and styling will be cleared.')) reset();
      }}
    >
      ↺ Reset
    </button>
  );
}

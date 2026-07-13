/**
 * Contact-form capture → Supabase (REST insert, no SDK needed for one call).
 *
 * Auth uses the modern PUBLISHABLE key (sb_publishable_…) ONLY. Publishable
 * keys are designed to ship in client code, with row-level security doing the
 * real enforcement (insert-only policy on the table — see
 * docs/runbooks/contact-supabase.md). Legacy anon JWT keys (eyJ…) are
 * deliberately rejected so one can't be pasted in by mistake.
 */

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const TABLE = 'contact_messages';

function validKey(k: string | undefined): k is string {
  if (!k) return false;
  if (!k.startsWith('sb_publishable_')) {
    // A legacy anon key is a JWT ("eyJ…"); refuse it rather than half-work.
    console.warn(
      '[contact] VITE_SUPABASE_PUBLISHABLE_KEY must be a publishable key (sb_publishable_…), ' +
        'not a legacy anon/JWT key — contact form disabled.',
    );
    return false;
  }
  return true;
}

/** Whether the deployment has valid Supabase credentials for the form. */
export const contactConfigured: boolean = Boolean(SUPABASE_URL) && validKey(KEY);

export interface ContactMessage {
  name: string;
  email: string;
  topic: string;
  message: string;
  /** Path the form was submitted from (routing context for triage). */
  page: string;
}

/** Insert one message; throws on any non-2xx so the UI can show an error. */
export async function submitContact(msg: ContactMessage): Promise<void> {
  if (!contactConfigured) throw new Error('Contact form is not configured.');
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${TABLE}`, {
    method: 'POST',
    headers: {
      apikey: KEY as string,
      Authorization: `Bearer ${KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(msg),
  });
  if (!res.ok) {
    throw new Error(`Supabase insert failed (${res.status})`);
  }
}

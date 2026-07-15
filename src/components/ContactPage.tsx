import { useEffect, useState, type FormEvent } from 'react';
import type { RouteDef } from '../seo/routes';
import { applyRouteHead } from '../seo/head';
import { contactConfigured, submitContact } from '../lib/contact';
import { Nav } from './Nav';
import { Footer } from './Footer';

const TOPICS = ['Support', 'Bug report', 'Feature idea', 'Business enquiry'] as const;

type SendState = 'idle' | 'sending' | 'sent' | 'error';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * /contact — a plain sub-page that captures standard details to Supabase
 * (insert-only via the publishable key + RLS; see src/lib/contact.ts). The
 * hidden "company" field is a honeypot: humans never see it, naive bots fill
 * it, and we quietly accept-and-drop those submissions.
 */
export function ContactPage({ route }: { route: RouteDef }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [topic, setTopic] = useState<string>(TOPICS[0]);
  const [message, setMessage] = useState('');
  const [honeypot, setHoneypot] = useState('');
  const [state, setState] = useState<SendState>('idle');
  const [problem, setProblem] = useState('');

  useEffect(() => applyRouteHead(route), [route]);

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (state === 'sending') return;

    const n = name.trim();
    const m = message.trim();
    if (!n || !EMAIL_RE.test(email.trim()) || !m) {
      setProblem('Please fill in your name, a valid email, and a message.');
      return;
    }
    setProblem('');

    if (honeypot.trim()) {
      // Honeypot tripped — pretend success, store nothing.
      setState('sent');
      return;
    }

    setState('sending');
    try {
      await submitContact({
        name: n.slice(0, 200),
        email: email.trim().slice(0, 320),
        topic,
        message: m.slice(0, 4000),
        page: window.location.pathname,
      });
      setState('sent');
    } catch {
      setState('error');
    }
  };

  return (
    <>
      <Nav />
      <main id="top">
        <section className="band" style={{ borderTop: 0 }}>
          <div className="wrap">
            <span className="kicker">Contact</span>
            <h2>Talk to us.</h2>
            <p className="lead">
              Support questions, bug reports, feature ideas, business — we read everything and reply
              by email. Your message goes straight to our inbox; nothing else about your visit is
              collected.
            </p>
            <p className="contact-direct">
              Prefer your own mail client? Write to us directly at{' '}
              <a href="mailto:contact@theqr.studio">contact@theqr.studio</a>.
            </p>

            <div className="contact-card">
              {state === 'sent' ? (
                <div className="contact-done" role="status">
                  <span className="contact-done__mark" aria-hidden="true">
                    ✓
                  </span>
                  <h3>Message sent — thank you.</h3>
                  <p>We'll get back to you at your email address, usually within a couple of days.</p>
                </div>
              ) : (
                <form className="contact-form" onSubmit={onSubmit} noValidate>
                  <div className="contact-form__row">
                    <label className="contact-field">
                      <span>Name</span>
                      <input
                        type="text"
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                      />
                    </label>
                    <label className="contact-field">
                      <span>Email</span>
                      <input
                        type="email"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                      />
                    </label>
                  </div>

                  <label className="contact-field">
                    <span>Topic</span>
                    <select value={topic} onChange={(e) => setTopic(e.target.value)}>
                      {TOPICS.map((t) => (
                        <option key={t} value={t}>
                          {t}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="contact-field">
                    <span>Message</span>
                    <textarea
                      rows={6}
                      maxLength={4000}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      required
                    />
                  </label>

                  {/* honeypot — visually hidden, tab-skipped; bots fill it */}
                  <label className="contact-trap" aria-hidden="true">
                    Company
                    <input
                      type="text"
                      tabIndex={-1}
                      autoComplete="off"
                      value={honeypot}
                      onChange={(e) => setHoneypot(e.target.value)}
                    />
                  </label>

                  {problem && <p className="contact-problem">{problem}</p>}
                  {state === 'error' && (
                    <p className="contact-problem">
                      Sending failed — please try again in a moment.
                    </p>
                  )}
                  {!contactConfigured && (
                    <p className="contact-problem">
                      The contact form isn't configured yet — submissions are disabled.
                    </p>
                  )}

                  <div className="contact-form__foot">
                    <button type="submit" className="btn" disabled={!contactConfigured || state === 'sending'}>
                      {state === 'sending' ? 'Sending…' : 'Send message ▸'}
                    </button>
                    <span className="trust">stored securely · used only to reply · never shared</span>
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

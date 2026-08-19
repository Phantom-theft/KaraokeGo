import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { LIMITS } from '../lib/limits';
import { enforceRateLimit } from '../lib/rateLimit';

export type ContactKind = 'report' | 'feedback';

export interface ContactPayload {
  kind: ContactKind;
  name?: string;
  email?: string;
  message: string;
  category?: string;
  roomCode?: string;
  rating?: number;
  severity?: string;
}

export async function sendContactMessage(payload: ContactPayload): Promise<void> {
  const message = payload.message?.trim();
  if (!message) {
    throw new Error('Please enter a message before sending.');
  }
  if (message.length < LIMITS.contact.minMessageLength) {
    throw new Error(`Please enter at least ${LIMITS.contact.minMessageLength} characters so we can understand your message.`);
  }
  if (message.length > LIMITS.contact.maxMessageLength) {
    throw new Error(`Please keep your message under ${LIMITS.contact.maxMessageLength} characters.`);
  }

  enforceRateLimit(`contact-${payload.kind}`, {
    max: LIMITS.contact.maxPerWindow,
    windowMs: LIMITS.contact.windowMs,
    persist: 'local',
    message: 'Too many messages sent.',
  });

  const name = (payload.name?.trim() || 'Anonymous').slice(0, LIMITS.contact.maxNameLength);
  const emailRaw = payload.email?.trim() || '';
  const email = emailRaw ? emailRaw.slice(0, LIMITS.contact.maxEmailLength) : null;
  const userAgent =
    typeof navigator !== 'undefined' ? navigator.userAgent.slice(0, 400) : null;

  try {
    const targetCollection = payload.kind === 'report' ? 'reports' : 'feedback';
    await addDoc(collection(db, targetCollection), {
      kind: payload.kind,
      name,
      email,
      message,
      category: payload.category || (payload.kind === 'report' ? 'General Issue' : 'General Feedback'),
      roomCode: payload.roomCode?.trim().toUpperCase().slice(0, 8) || null,
      rating: typeof payload.rating === 'number' ? payload.rating : null,
      severity: payload.severity || null,
      createdAt: serverTimestamp(),
      userAgent,
      appVersion: __APP_VERSION__,
    });
  } catch (error: any) {
    console.error(`[FeedbackService] Error submitting ${payload.kind}:`, error);
    throw new Error(error?.message || `Failed to send your ${payload.kind}. Please check your connection and try again.`);
  }
}

import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

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

  try {
    await addDoc(collection(db, 'feedback'), {
      kind: payload.kind,
      name: payload.name?.trim() || 'Anonymous',
      email: payload.email?.trim() || null,
      message,
      category: payload.category || (payload.kind === 'report' ? 'General Issue' : 'General Feedback'),
      roomCode: payload.roomCode?.trim().toUpperCase() || null,
      rating: typeof payload.rating === 'number' ? payload.rating : null,
      severity: payload.severity || null,
      createdAt: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
      appVersion: __APP_VERSION__,
    });
  } catch (error: any) {
    console.error(`[FeedbackService] Error submitting ${payload.kind}:`, error);
    throw new Error(error?.message || `Failed to send your ${payload.kind}. Please check your connection and try again.`);
  }
}

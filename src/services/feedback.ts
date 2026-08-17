import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';

export type ContactKind = 'report' | 'feedback';

export async function sendContactMessage(payload: {
  kind: ContactKind;
  name: string;
  email: string;
  message: string;
}): Promise<void> {
  const message = payload.message.trim();
  if (!message) throw new Error('Please enter a message.');

  await addDoc(collection(db, 'feedback'), {
    kind: payload.kind,
    name: payload.name.trim() || 'Anonymous',
    email: payload.email.trim() || null,
    message,
    createdAt: serverTimestamp(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });
}

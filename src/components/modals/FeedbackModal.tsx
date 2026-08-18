import React, { useState } from 'react';
import {
  X,
  Sparkles,
  MessageSquare,
  Send,
  Star,
  RefreshCw,
} from 'lucide-react';
import { sendContactMessage } from '../../services/feedback';
import { ModalPortal, useModalBehavior } from './modalUtils';

/* ── 4. FEEDBACK & SUGGESTIONS MODAL (CAN SEND MESSAGE TO FIREBASE) ── */
export const FeedbackModal: React.FC<{
  isOpen: boolean;
  roomCode?: string | null;
  onClose: () => void;
}> = ({ isOpen, roomCode, onClose }) => {
  const [feedbackType, setFeedbackType] = useState('Feature Idea');
  const [feedbackRating, setFeedbackRating] = useState<number>(5);
  const [feedbackHoverRating, setFeedbackHoverRating] = useState<number | null>(null);
  const [feedbackName, setFeedbackName] = useState('');
  const [feedbackEmail, setFeedbackEmail] = useState('');
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackSuccess, setFeedbackSuccess] = useState(false);
  const [feedbackError, setFeedbackError] = useState<string | null>(null);

  const ratingLabels = ['Needs work', 'Okay', 'Good', 'Great', 'Superb!'];

  const contentRef = useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const handleFeedbackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!feedbackMessage.trim()) {
      setFeedbackError('Please enter your feedback or suggestion.');
      return;
    }

    setFeedbackLoading(true);
    setFeedbackError(null);
    try {
      await sendContactMessage({
        kind: 'feedback',
        name: feedbackName,
        email: feedbackEmail,
        message: feedbackMessage,
        category: feedbackType,
        rating: feedbackRating,
        roomCode: roomCode || undefined,
      });
      setFeedbackSuccess(true);
      setFeedbackMessage('');
    } catch (err: any) {
      setFeedbackError(err?.message || 'Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="search-modal-backdrop info-modal-backdrop" onClick={onClose}>
        <div className="search-modal-box info-modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="info-modal-header">
            <div className="info-modal-title-group">
              <div className="info-modal-badge-icon"><MessageSquare size={22} /></div>
              <div>
                <h2 className="info-modal-heading">Send Feedback</h2>
                <p className="info-modal-subheading">Rate your party experience or suggest ideas for Karaoke Go</p>
              </div>
            </div>
            <button type="button" className="info-modal-close-btn" onClick={onClose} aria-label="Close Feedback modal">
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div className="info-modal-content custom-scrollbar" ref={contentRef}>
            <div className="info-section">
              {feedbackSuccess ? (
                <div className="info-form-success">
                  <div className="info-success-icon-wrap info-success-icon-wrap--gold" aria-hidden="true">
                    <Sparkles size={48} />
                  </div>
                  <h3>Thank You for Your Feedback!</h3>
                  <p>We appreciate your thoughts, ideas, and suggestions. Your input directly influences future features.</p>
                  <div className="info-success-actions">
                    <button type="button" className="button-primary" onClick={() => setFeedbackSuccess(false)}>
                      <RefreshCw size={15} /> Send More Feedback
                    </button>
                    <button type="button" className="button-secondary" onClick={onClose}>Back to Party</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleFeedbackSubmit} className="info-form">
                  <div className="info-form-notice info-form-notice--feedback">
                    <Sparkles size={18} className="info-notice-icon" />
                    <span>Have an idea for Karaoke Go or want to rate your singing party? We’d love to hear from you!</span>
                  </div>

                  {feedbackError && <div className="setup-error" role="alert">{feedbackError}</div>}

                  <div className="form-field info-rating-field">
                    <label className="form-label">How is your Karaoke Go experience?</label>
                    <div className="info-stars-group">
                      {[1, 2, 3, 4, 5].map((star) => {
                        const isFilled = (feedbackHoverRating !== null ? feedbackHoverRating : feedbackRating) >= star;
                        return (
                          <button
                            key={star}
                            type="button"
                            className={`info-star-btn ${isFilled ? 'is-filled' : ''}`}
                            onClick={() => setFeedbackRating(star)}
                            onMouseEnter={() => setFeedbackHoverRating(star)}
                            onMouseLeave={() => setFeedbackHoverRating(null)}
                            aria-label={`${star} star${star > 1 ? 's' : ''}`}
                          >
                            <Star size={26} strokeWidth={2} />
                          </button>
                        );
                      })}
                      <span className="info-rating-label">{ratingLabels[(feedbackHoverRating ?? feedbackRating) - 1]}</span>
                    </div>
                  </div>

                  <div className="info-form-row-3">
                    <div className="form-field">
                      <label className="form-label" htmlFor="feedbackTypeSelect">Category</label>
                      <select
                        id="feedbackTypeSelect"
                        value={feedbackType}
                        onChange={(e) => setFeedbackType(e.target.value)}
                        className="setup-input info-select"
                      >
                        <option value="Feature Idea">Feature Idea / Request</option>
                        <option value="UI & Design">UI & Design Improvement</option>
                        <option value="Song Search & Catalog">Song Search & Catalog</option>
                        <option value="Compliment & Praise">Compliment & Praise</option>
                        <option value="General Suggestion">General Suggestion</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label" htmlFor="feedbackNameInput">
                        Your Name <span className="info-label-opt">(Optional)</span>
                      </label>
                      <input
                        id="feedbackNameInput"
                        type="text"
                        placeholder="e.g. Taylor"
                        value={feedbackName}
                        onChange={(e) => setFeedbackName(e.target.value)}
                        className="setup-input"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label" htmlFor="feedbackEmailInput">
                        Email <span className="info-label-opt">(Optional)</span>
                      </label>
                      <input
                        id="feedbackEmailInput"
                        type="email"
                        placeholder="taylor@example.com"
                        value={feedbackEmail}
                        onChange={(e) => setFeedbackEmail(e.target.value)}
                        className="setup-input"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="feedbackMessageTextarea">
                      Message & Ideas <span className="info-label-req">*</span>
                    </label>
                    <textarea
                      id="feedbackMessageTextarea"
                      rows={4}
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      placeholder="Tell us what features you’d love to see next (e.g. singer score, playlists, voting)..."
                      className="setup-input info-textarea"
                      required
                    />
                  </div>

                  <div className="info-form-submit-row">
                    <button type="submit" className="button-primary info-submit-btn" disabled={feedbackLoading || !feedbackMessage.trim()}>
                      {feedbackLoading ? (
                        <><RefreshCw size={16} className="info-spinner" /> Sending Feedback...</>
                      ) : (
                        <><Send size={16} /> Send Feedback</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="info-modal-footer">
            <div className="info-modal-footer-copy">Karaoke Go Community</div>
            <button type="button" className="button-primary info-footer-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

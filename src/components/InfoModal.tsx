import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  X,
  HelpCircle,
  FileText,
  Shield,
  Sparkles,
  MessageSquare,
  AlertTriangle,
  Send,
  CheckCircle2,
  Star,
  Search,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Smartphone,
  Tv,
  Volume2,
  History,
  Info,
} from 'lucide-react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { db } from '../services/firebase';
import { sendContactMessage } from '../services/feedback';
import { InputOTP, InputOTPGroup, InputOTPSlot } from './ui/input-otp';

export type InfoModalType = 'terms' | 'privacy' | 'help' | 'updates' | 'report' | 'feedback';
export type InfoModalTab = InfoModalType;

const FAQ_DATA = [
  {
    category: 'Host Setup',
    question: 'How do I host a party on my TV or large screen?',
    answer:
      'Connect your laptop or PC to your TV using an HDMI cable, or cast your browser using Chromecast / AirPlay. Open Karaoke Go, click "Host", and enter your name to create a room. Press Fullscreen on the stage view so lyrics fill the TV screen.',
  },
  {
    category: 'Guest Joining',
    question: 'How do guests join from their phones?',
    answer:
      'Guests can either scan the QR code displayed on the host screen using their phone camera, or visit the Karaoke Go website and enter the 4-letter room code. Guests do NOT need to download any app or create an account.',
  },
  {
    category: 'Audio & Playback',
    question: 'Why is there a Play button on the host screen?',
    answer:
      'Modern web browsers prevent audio from autoplaying without user interaction. Click the Play button once to allow high-definition audio playback.',
  },
  {
    category: 'Queue Management',
    question: 'Can the host skip or reorder songs in the queue?',
    answer:
      'Yes! The host has full playback controls: pause, play, skip, or remove songs. Guests can also remove songs they personally added.',
  },
  {
    category: 'Troubleshooting',
    question: 'What if connection is lost during a party?',
    answer:
      'Karaoke Go automatically saves your active room session. If you refresh or reconnect to Wi-Fi, it will reconnect automatically.',
  },
];


/* ── MODAL SCROLL & VIEWPORT BEHAVIOR HOOK ── */
function useModalBehavior(isOpen: boolean, onClose: () => void) {
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    // Reset the modal's own scroll area to the top
    if (contentRef.current) {
      contentRef.current.scrollTop = 0;
    }

    // Capture the current scroll position before locking
    const scrollY = window.scrollY || document.documentElement.scrollTop || 0;

    // Save original overflow & overscroll styles
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const prevBodyOverflow = document.body.style.overflow;
    const prevOverscroll = document.documentElement.style.overscrollBehavior;

    // Lock background scrolling cleanly
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overscrollBehavior = 'none';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      // Restore background styles
      document.documentElement.style.overflow = prevHtmlOverflow;
      document.body.style.overflow = prevBodyOverflow;
      document.documentElement.style.overscrollBehavior = prevOverscroll;

      // Restore exact page scroll position
      window.scrollTo({ top: scrollY, behavior: 'instant' as ScrollBehavior });
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  return contentRef;
}

// ── Portal helper ──────────────────────────────────────────────────────────
// Renders modal directly into document.body to break free from any parent stacking
// context (such as CSS isolation, animations, filters, and transforms on landing-page).
function ModalPortal({ children }: { children: React.ReactNode }) {
  if (typeof document === 'undefined') return null;
  return createPortal(children, document.body);
}

/* ── 1. HELP & FAQ MODAL ── */
export const HelpModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onOpenReport?: () => void;
  onOpenFeedback?: () => void;
}> = ({ isOpen, onClose, onOpenReport, onOpenFeedback }) => {
  const [faqSearch, setFaqSearch] = useState('');
  const [faqCategory, setFaqCategory] = useState('All');
  const [expandedFaqIndex, setExpandedFaqIndex] = useState<number | null>(0);
  const contentRef = useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const filteredFaqs = FAQ_DATA.filter((item) => {
    const matchesCategory = faqCategory === 'All' || item.category === faqCategory;
    const q = faqSearch.toLowerCase().trim();
    const matchesSearch =
      !q ||
      item.question.toLowerCase().includes(q) ||
      item.answer.toLowerCase().includes(q) ||
      item.category.toLowerCase().includes(q);
    return matchesCategory && matchesSearch;
  });

  return (
    <ModalPortal>
      <div className="search-modal-backdrop info-modal-backdrop" onClick={onClose}>
        <div className="search-modal-box info-modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="info-modal-header">
            <div className="info-modal-title-group">
              <div className="info-modal-badge-icon"><HelpCircle size={22} /></div>
              <div>
                <h2 className="info-modal-heading">Help & FAQ</h2>
                <p className="info-modal-subheading">Guides and answers for hosting and joining parties</p>
              </div>
            </div>
            <button type="button" className="info-modal-close-btn" onClick={onClose} aria-label="Close Help modal">
              <X size={20} strokeWidth={2.4} />
          </button>
        </div>

        <div className="info-modal-content custom-scrollbar" ref={contentRef}>
          <div className="info-section">
            <div className="info-guide-grid">
              <div className="info-guide-card">
                <div className="info-guide-icon"><Tv size={22} /></div>
                <h4>Hosting on TV</h4>
                <p>Open on laptop, plug HDMI into TV, click Host, and enter Fullscreen for stage view.</p>
              </div>
              <div className="info-guide-card">
                <div className="info-guide-icon"><Smartphone size={22} /></div>
                <h4>Joining as Guest</h4>
                <p>Scan the QR code shown on the screen with your phone or enter the 4-letter room code to join. You can also install Karaoke Go as an app for easier access.</p>
              </div>
              <div className="info-guide-card">
                <div className="info-guide-icon"><Volume2 size={22} /></div>
                <h4>Sound & Audio</h4>
                <p>Connect speakers directly to the host laptop for crystal-clear sound and zero lag.</p>
              </div>
            </div>

            <div className="info-faq-controls">
              <div className="info-search-wrap">
                <Search size={16} className="info-search-icon" />
                <input
                  type="text"
                  value={faqSearch}
                  onChange={(e) => setFaqSearch(e.target.value)}
                  placeholder="Search topics (e.g. audio, QR code, skip song)..."
                  className="info-search-input"
                />
                {faqSearch && (
                  <button type="button" onClick={() => setFaqSearch('')} className="info-search-clear" aria-label="Clear search">
                    <X size={14} />
                  </button>
                )}
              </div>

              <div className="info-filter-pills">
                {['All', 'Host Setup', 'Guest Joining', 'Audio & Playback', 'Troubleshooting'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`info-filter-pill ${faqCategory === cat ? 'is-active' : ''}`}
                    onClick={() => setFaqCategory(cat)}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="info-faq-list">
              {filteredFaqs.length === 0 ? (
                <div className="info-empty-state">
                  <Info size={28} />
                  <p>No questions matched your search query.</p>
                  <button type="button" className="button-secondary" onClick={() => { setFaqSearch(''); setFaqCategory('All'); }}>Reset Filter</button>
                </div>
              ) : (
                filteredFaqs.map((faq, idx) => {
                  const isExpanded = expandedFaqIndex === idx;
                  return (
                    <div key={idx} className={`info-faq-item ${isExpanded ? 'is-expanded' : ''}`}>
                      <button type="button" className="info-faq-question" onClick={() => setExpandedFaqIndex(isExpanded ? null : idx)}>
                        <div className="info-faq-q-text">
                          <span className="info-faq-cat-badge">{faq.category}</span>
                          <span>{faq.question}</span>
                        </div>
                        <span className="info-faq-chevron">{isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}</span>
                      </button>
                      {isExpanded && <div className="info-faq-answer">{faq.answer}</div>}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        <div className="info-modal-footer">
          <div className="info-modal-footer-copy">Karaoke Go Help Center</div>
          <button type="button" className="button-primary info-footer-close-btn" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};

/* ── 2. UPDATES MODAL ── */
interface ChangelogEntry {
  id: string;
  version: string;
  date: string;
  title: string;
  badge?: string;
  highlights: string[];
  order: number;
}

export const UpdatesModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const contentRef = useModalBehavior(isOpen, onClose);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    const q = query(collection(db, 'updates'), orderBy('order', 'asc'));
    getDocs(q)
      .then((snap) => {
        const data = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() } as ChangelogEntry));
        setEntries(data);
      })
      .catch(() => setError('Could not load updates. Please try again.'))
      .finally(() => setLoading(false));
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="search-modal-backdrop info-modal-backdrop" onClick={onClose}>
        <div className="search-modal-box info-modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="info-modal-header">
            <div className="info-modal-title-group">
              <div className="info-modal-badge-icon"><History size={22} /></div>
              <div>
                <h2 className="info-modal-heading">What's New &amp; Updates</h2>
                <p className="info-modal-subheading">Changelog and recent improvements to Karaoke Go</p>
              </div>
            </div>
            <button type="button" className="info-modal-close-btn" onClick={onClose} aria-label="Close Updates modal">
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div className="info-modal-content custom-scrollbar" ref={contentRef}>
            <div className="info-section">
              {loading && (
                <div className="info-updates-status">
                  <div className="info-updates-status-icon">
                    <RefreshCw size={24} className="info-updates-spinner" />
                  </div>
                  <p className="info-updates-status-title">Loading updates…</p>
                </div>
              )}
              {error && !loading && (
                <div className="info-updates-status info-updates-error">
                  <div className="info-updates-status-icon info-updates-error-icon">
                    <AlertTriangle size={24} />
                  </div>
                  <p className="info-updates-status-title">{error}</p>
                </div>
              )}
              {!loading && !error && entries.length === 0 && (
                <div className="info-updates-empty">
                  <div className="info-updates-empty-icon">
                    <History size={30} strokeWidth={1.8} />
                  </div>
                  <p className="info-updates-empty-title">No updates posted yet</p>
                  <span className="info-updates-empty-desc">Check back soon for new features and improvements.</span>
                </div>
              )}
              {!loading && !error && entries.length > 0 && (
                <div className="info-updates-timeline">
                  {entries.map((update) => (
                    <div key={update.id} className="info-update-card">
                      <div className="info-update-header">
                        <div className="info-update-version-row">
                          <span className="info-update-version">{update.version}</span>
                          {update.badge && <span className="info-update-badge">{update.badge}</span>}
                          <span className="info-update-date">{update.date}</span>
                        </div>
                        <h3 className="info-update-title">{update.title}</h3>
                      </div>
                      <ul className="info-update-list">
                        {(update.highlights || []).map((point, pIdx) => (
                          <li key={pIdx}>
                            <span className="info-update-dot" aria-hidden="true" />
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="info-modal-footer">
            <div className="info-modal-footer-copy">Karaoke Go Updates</div>
            <button type="button" className="button-primary info-footer-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

/* ── 3. REPORT AN ISSUE MODAL (CAN SEND MESSAGE TO FIREBASE) ── */
export const ReportModal: React.FC<{
  isOpen: boolean;
  roomCode?: string | null;
  onClose: () => void;
}> = ({ isOpen, roomCode, onClose }) => {
  const [reportCategory, setReportCategory] = useState('Audio / Video Playback');
  const [reportRoomCode, setReportRoomCode] = useState(roomCode || '');
  const [reportSeverity, setReportSeverity] = useState('Normal');
  const [reportName, setReportName] = useState('');
  const [reportEmail, setReportEmail] = useState('');
  const [reportMessage, setReportMessage] = useState('');
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSuccess, setReportSuccess] = useState(false);
  const [reportError, setReportError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && roomCode) setReportRoomCode(roomCode);
  }, [isOpen, roomCode]);

  const contentRef = useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  const handleReportSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reportMessage.trim()) {
      setReportError('Please enter a description of the issue.');
      return;
    }

    setReportLoading(true);
    setReportError(null);
    try {
      await sendContactMessage({
        kind: 'report',
        name: reportName,
        email: reportEmail,
        message: reportMessage,
        category: reportCategory,
        roomCode: reportRoomCode,
        severity: reportSeverity,
      });
      setReportSuccess(true);
      setReportMessage('');
    } catch (err: any) {
      setReportError(err?.message || 'Failed to submit report. Please check your connection.');
    } finally {
      setReportLoading(false);
    }
  };

  return (
    <ModalPortal>
      <div className="search-modal-backdrop info-modal-backdrop" onClick={onClose}>
        <div className="search-modal-box info-modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="info-modal-header">
            <div className="info-modal-title-group">
              <div className="info-modal-badge-icon"><AlertTriangle size={22} /></div>
              <div>
                <h2 className="info-modal-heading">Report an Issue</h2>
                <p className="info-modal-subheading">Found a playback glitch or bug? Send us a message below</p>
              </div>
            </div>
            <button type="button" className="info-modal-close-btn" onClick={onClose} aria-label="Close Report modal">
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div className="info-modal-content custom-scrollbar" ref={contentRef}>
            <div className="info-section">
              {reportSuccess ? (
                <div className="info-form-success">
                  <div className="info-success-icon-wrap" aria-hidden="true"><CheckCircle2 size={48} /></div>
                  <h3>Report Submitted!</h3>
                  <p>Thank you for letting us know. Your report has been securely sent to our team to help fix and improve Karaoke Go.</p>
                  <div className="info-success-actions">
                    <button type="button" className="button-primary" onClick={() => setReportSuccess(false)}>
                      <RefreshCw size={15} /> Submit Another Report
                    </button>
                    <button type="button" className="button-secondary" onClick={onClose}>Back to Party</button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleReportSubmit} className="info-form">
                  <div className="info-form-notice">
                    <AlertTriangle size={18} className="info-notice-icon" />
                    <span>Tell us what happened so we can diagnose and resolve the issue quickly.</span>
                  </div>

                  {reportError && <div className="setup-error" role="alert">{reportError}</div>}

                  <div className="info-form-row-2">
                    <div className="form-field">
                      <label className="form-label" htmlFor="reportCategorySelect">Issue Type</label>
                      <select
                        id="reportCategorySelect"
                        value={reportCategory}
                        onChange={(e) => setReportCategory(e.target.value)}
                        className="setup-input info-select"
                      >
                        <option value="Audio / Video Playback">Audio / Video Playback Issue</option>
                        <option value="Room Connection / Sync">Room Connection & Sync</option>
                        <option value="Queue & Song Request">Queue / Song Adding Problem</option>
                        <option value="Search / Missing Song">Search / Song Catalog Issue</option>
                        <option value="Inappropriate Content">Inappropriate Song / Content</option>
                        <option value="UI & Display Glitch">Display / UI Glitch</option>
                        <option value="Other">Other Problem</option>
                      </select>
                    </div>

                    <div className="form-field">
                      <label className="form-label" htmlFor="reportSeveritySelect">Severity</label>
                      <select
                        id="reportSeveritySelect"
                        value={reportSeverity}
                        onChange={(e) => setReportSeverity(e.target.value)}
                        className="setup-input info-select"
                      >
                        <option value="Low">Low (Minor annoyance)</option>
                        <option value="Normal">Normal (Impairs party flow)</option>
                        <option value="Urgent">Urgent (Playback stopped / Room crashed)</option>
                      </select>
                    </div>
                  </div>

                  <div className="info-form-row-3">
                    <div className="form-field">
                      <span className="form-label" id="reportRoomCodeLabel">
                        Room Code <span className="info-label-opt">(Optional)</span>
                      </span>
                      <InputOTP
                        maxLength={4}
                        value={reportRoomCode}
                        onChange={(value) => setReportRoomCode(value.toUpperCase())}
                        pattern={REGEXP_ONLY_DIGITS_AND_CHARS}
                        aria-label="Room code"
                        containerClassName="info-report-otp"
                        otpSize="sm"
                      >
                        <InputOTPGroup otpSize="sm">
                          <InputOTPSlot index={0} otpSize="sm" />
                          <InputOTPSlot index={1} otpSize="sm" />
                          <InputOTPSlot index={2} otpSize="sm" />
                          <InputOTPSlot index={3} otpSize="sm" />
                        </InputOTPGroup>
                      </InputOTP>
                    </div>

                    <div className="form-field">
                      <label className="form-label" htmlFor="reportNameInput">
                        Your Name <span className="info-label-opt">(Optional)</span>
                      </label>
                      <input
                        id="reportNameInput"
                        type="text"
                        placeholder="e.g. Alex"
                        value={reportName}
                        onChange={(e) => setReportName(e.target.value)}
                        className="setup-input"
                      />
                    </div>

                    <div className="form-field">
                      <label className="form-label" htmlFor="reportEmailInput">
                        Email <span className="info-label-opt">(Optional)</span>
                      </label>
                      <input
                        id="reportEmailInput"
                        type="email"
                        placeholder="alex@example.com"
                        value={reportEmail}
                        onChange={(e) => setReportEmail(e.target.value)}
                        className="setup-input"
                      />
                    </div>
                  </div>

                  <div className="form-field">
                    <label className="form-label" htmlFor="reportMessageTextarea">
                      Message & Description <span className="info-label-req">*</span>
                    </label>
                    <textarea
                      id="reportMessageTextarea"
                      rows={4}
                      value={reportMessage}
                      onChange={(e) => setReportMessage(e.target.value)}
                      placeholder="Describe the issue (e.g. video said 'restricted playback', song title that failed, queue didn't sync)..."
                      className="setup-input info-textarea"
                      required
                    />
                  </div>

                  <div className="info-form-submit-row">
                    <button type="submit" className="button-primary info-submit-btn" disabled={reportLoading || !reportMessage.trim()}>
                      {reportLoading ? (
                        <><RefreshCw size={16} className="info-spinner" /> Sending Report...</>
                      ) : (
                        <><Send size={16} /> Send Report</>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>

          <div className="info-modal-footer">
            <div className="info-modal-footer-copy">Karaoke Go Issue Reporter</div>
            <button type="button" className="button-primary info-footer-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

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

/* ── 5. TERMS OF SERVICE MODAL ── */
export const TermsModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const contentRef = useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="search-modal-backdrop info-modal-backdrop" onClick={onClose}>
        <div className="search-modal-box info-modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="info-modal-header">
            <div className="info-modal-title-group">
              <div className="info-modal-badge-icon"><FileText size={22} /></div>
              <div>
                <h2 className="info-modal-heading">Terms of Service</h2>
                <p className="info-modal-subheading">Guidelines, rights, and responsibilities for using Karaoke Go</p>
              </div>
            </div>
            <button type="button" className="info-modal-close-btn" onClick={onClose} aria-label="Close Terms modal">
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div className="info-modal-content custom-scrollbar" ref={contentRef}>
            <div className="info-section info-legal-text">

              <h3>1. Acceptance of Terms</h3>
              <p>By using Karaoke Go, you agree to these Terms of Service.</p>

              <h3>2. Using Karaoke Go</h3>
              <p>Karaoke Go is a free web-based karaoke platform where a host can create a room and participants can join using a room code or QR code to search and add songs to the queue.</p>

              <h3>3. Third-Party Content</h3>
              <p>Karaoke Go uses third-party services, including YouTube, for video and music playback. All videos, music, lyrics, and other content belong to their respective owners. Karaoke Go does not claim ownership of this content.</p>

              <h3>4. Responsible Use</h3>
              <p>Please use Karaoke Go responsibly. Do not attempt to abuse, disrupt, or interfere with the app or its services.</p>

              <h3>5. Service Availability</h3>
              <p>Karaoke Go is provided as available. We cannot guarantee that the service will always be uninterrupted or error-free.</p>

              <h3>6. Changes to These Terms</h3>
              <p>These Terms may be updated from time to time. Continued use of Karaoke Go means you accept any updated Terms.</p>
            </div>
          </div>

          <div className="info-modal-footer">
            <div className="info-modal-footer-copy">Karaoke Go Terms of Service</div>
            <button type="button" className="button-primary info-footer-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

/* ── 6. PRIVACY POLICY MODAL ── */
export const PrivacyModal: React.FC<{ isOpen: boolean; onClose: () => void; onOpenFeedback?: () => void }> = ({ isOpen, onClose, onOpenFeedback }) => {
  const contentRef = useModalBehavior(isOpen, onClose);

  if (!isOpen) return null;

  return (
    <ModalPortal>
      <div className="search-modal-backdrop info-modal-backdrop" onClick={onClose}>
        <div className="search-modal-box info-modal-box" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
          <div className="info-modal-header">
            <div className="info-modal-title-group">
              <div className="info-modal-badge-icon"><Shield size={22} /></div>
              <div>
                <h2 className="info-modal-heading">Privacy Policy</h2>

              </div>
            </div>
            <button type="button" className="info-modal-close-btn" onClick={onClose} aria-label="Close Privacy modal">
              <X size={20} strokeWidth={2.4} />
            </button>
          </div>

          <div className="info-modal-content custom-scrollbar" ref={contentRef}>
            <div className="info-section info-legal-text">


              <h3>1. No Account Required</h3>
              <p>Karaoke Go does not require you to create an account, provide an email address, or set a password to use the app.</p>

              <h3>2. Temporary Session Data</h3>
              <p>To make each karaoke session work, Karaoke Go temporarily stores information such as room codes, nicknames, and song queue data. This information is only used for the active karaoke session.</p>

              <h3>3. Browser Storage</h3>
              <p>We may use browser storage to remember your preferences, such as your selected theme and room connection. We do not use tracking cookies or advertising cookies.</p>

              <h3>4. Third-Party Services</h3>
              <p>Karaoke Go may use third-party services for features such as real-time room synchronization and video playback. Only the information necessary to provide these features is shared with those services.</p>

              <h3>5. No Selling of Personal Data</h3>
              <p>Karaoke Go does not sell, rent, or monetize your personal information.</p>

              <h3>6. Contact Us</h3>
              <p>If you have questions or concerns about this Privacy Policy, you can contact us through the {onOpenFeedback ? (
                <button type="button" className="info-inline-btn" onClick={() => { onClose(); onOpenFeedback!(); }}>Feedback</button>
              ) : 'Feedback'} form available in Karaoke Go.</p>
            </div>
          </div>

          <div className="info-modal-footer">
            <div className="info-modal-footer-copy">Karaoke Go Privacy Policy</div>
            <button type="button" className="button-primary info-footer-close-btn" onClick={onClose}>Close</button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};

/* ── 7. COMPOSITE INFOMODAL WRAPPER (SWITCHER FOR INDIVIDUAL MODALS) ── */
export const InfoModal: React.FC<{
  isOpen: boolean;
  initialTab?: InfoModalType;
  roomCode?: string | null;
  onClose: () => void;
  onOpenReport?: () => void;
  onOpenFeedback?: () => void;
}> = ({ isOpen, initialTab = 'help', roomCode, onClose, onOpenReport, onOpenFeedback }) => {
  if (!isOpen) return null;

  switch (initialTab) {
    case 'help':
      return (
        <HelpModal
          isOpen={isOpen}
          onClose={onClose}
          onOpenReport={onOpenReport}
          onOpenFeedback={onOpenFeedback}
        />
      );
    case 'updates':
      return <UpdatesModal isOpen={isOpen} onClose={onClose} />;
    case 'report':
      return <ReportModal isOpen={isOpen} roomCode={roomCode} onClose={onClose} />;
    case 'feedback':
      return <FeedbackModal isOpen={isOpen} roomCode={roomCode} onClose={onClose} />;
    case 'terms':
      return <TermsModal isOpen={isOpen} onClose={onClose} />;
    case 'privacy':
      return <PrivacyModal isOpen={isOpen} onClose={onClose} onOpenFeedback={onOpenFeedback} />;
    default:
      return (
        <HelpModal
          isOpen={isOpen}
          onClose={onClose}
          onOpenReport={onOpenReport}
          onOpenFeedback={onOpenFeedback}
        />
      );
  }
};


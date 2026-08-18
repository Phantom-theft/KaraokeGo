import React, { useState, useEffect } from 'react';
import {
  X,
  AlertTriangle,
  Send,
  CheckCircle2,
  RefreshCw,
} from 'lucide-react';
import { REGEXP_ONLY_DIGITS_AND_CHARS } from 'input-otp';
import { sendContactMessage } from '../../services/feedback';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '../ui/input-otp';
import { ModalPortal, useModalBehavior } from './modalUtils';

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

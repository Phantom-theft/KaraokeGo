import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Search,
  ChevronDown,
  ChevronUp,
  Smartphone,
  Tv,
  Volume2,
  Info,
} from 'lucide-react';
import { ModalPortal, useModalBehavior } from './modalUtils';

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

/* ── 1. HELP & FAQ MODAL ── */
export const HelpModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
}> = ({ isOpen, onClose }) => {
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

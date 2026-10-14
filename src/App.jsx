import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { supabase, supabaseConfigError, supabaseConfigured } from './supabaseClient';
import {
  Building2, Users, Calendar, Award, Bell, FileText,
  Phone, MessageSquare, Plus, DollarSign,
  TrendingUp, Download, LogOut,
  Eye, EyeOff, UserPlus, AlertCircle, Camera, X, ShieldCheck, Check, RefreshCw,
  Trash2, Edit3, Send, Flame, Quote, Clock, Lock, Calculator, BookOpen, MapPin, FileDown,
  ExternalLink, Volume2, VolumeX
} from 'lucide-react';

const MOTIVATION_QUOTES = [
  { english: "The best investment on Earth is earth.", hindi: "धरती पर सबसे अच्छा निवेश, धरती ही है।", author: "Louis Glickman" },
  { english: "Don't wait to buy real estate. Buy real estate and wait.", hindi: "रियल एस्टेट खरीदने के लिए इंतज़ार न करें; खरीदें और धैर्य रखें।", author: "Will Rogers" },
  { english: "Success begins with trust, consistency, and customer care.", hindi: "सफलता की शुरुआत भरोसे, निरंतरता और ग्राहक सेवा से होती है।", author: "BMS Creed" },
  { english: "Every property visit today is a closing tomorrow.", hindi: "आज की हर साइट विज़िट, कल की सफलता बन सकती है।", author: "Sales Wisdom" },
  { english: "Quality properties and honest guidance build lasting legacies.", hindi: "बेहतरीन संपत्ति और ईमानदार सलाह स्थायी विरासत बनाते हैं।", author: "Jaipur Property Insights" },
  { english: "Your network and integrity are your greatest business assets.", hindi: "आपके रिश्ते और ईमानदारी आपकी सबसे बड़ी व्यावसायिक पूँजी हैं।", author: "BMS Founder" }
];

const AMBIENT_PIANO = {
  title: 'Relaxing Piano',
  mood: 'Calm',
  src: 'https://upload.wikimedia.org/wikipedia/commons/2/21/Relaxing_Piano_Music_%28ISRC_USUAN1500075%29.mp3',
  credit: 'Relaxing Piano Music by Kevin MacLeod (incompetech.com), CC BY 3.0',
  license: 'https://creativecommons.org/licenses/by/3.0/',
  source: 'https://commons.wikimedia.org/wiki/File:Relaxing_Piano_Music_(ISRC_USUAN1500075).mp3'
};

const TOAST_CHIME_URL = 'https://upload.wikimedia.org/wikipedia/commons/2/25/SingingBowl1.ogg';

const getISTComponents = (date) => {
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (3600000 * 5.5));
  let hours = istDate.getHours();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return {
    hours: String(hours).padStart(2, '0'),
    minutes: String(istDate.getMinutes()).padStart(2, '0'),
    seconds: String(istDate.getSeconds()).padStart(2, '0'),
    millis: String(date.getMilliseconds()).padStart(3, '0'),
    ampm,
    dateStr: `${String(istDate.getDate()).padStart(2, '0')} ${months[istDate.getMonth()]} ${istDate.getFullYear()}`
  };
};

const formatISTDateTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Time unavailable';
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    dateStyle: 'medium',
    timeStyle: 'medium'
  }).format(date);
};

const getRelativeLastActive = (value) => {
  const timestamp = new Date(value).getTime();
  if (!Number.isFinite(timestamp)) return 'Last active time unavailable';
  const elapsedMinutes = Math.max(0, Math.floor((Date.now() - timestamp) / 60000));
  if (elapsedMinutes < 1) return 'Last active just now';
  if (elapsedMinutes < 60) return `Last active ${elapsedMinutes}m ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `Last active ${elapsedHours}h ago`;
  return `Last active ${Math.floor(elapsedHours / 24)}d ago`;
};

const isAssociateOnline = (value) => {
  const timestamp = new Date(value).getTime();
  const age = Date.now() - timestamp;
  return Number.isFinite(timestamp) && age >= 0 && age <= 3 * 60 * 1000;
};

function LiveIndiaClock() {
  const [ist, setIst] = useState(() => getISTComponents(new Date()));

  useEffect(() => {
    const intervalId = window.setInterval(() => setIst(getISTComponents(new Date())), 35);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <div className="live-ist-clock-pill" title="Official Indian Standard Time (Jaipur, Rajasthan)">
      <div className="clock-pulse-dot" />
      <div className="clock-main-content">
        <div className="clock-digits-row">
          <span className="clock-digits">{ist.hours}:{ist.minutes}:{ist.seconds}</span>
          <span className="clock-ms">.{ist.millis}</span>
          <span className="clock-ampm">{ist.ampm}</span>
        </div>
        <div className="clock-meta-row">
          <span className="clock-zone">IST (JAIPUR)</span>
          <span className="clock-sep">•</span>
          <span className="clock-date">{ist.dateStr}</span>
        </div>
        </div>
      </div>
  );
}

const getInitialSession = () => {
  let saved;
  try {
    saved = localStorage.getItem('bms_session');
  } catch (error) {
    console.error('Unable to read the saved associate session.', error);
    return null;
  }
  if (!saved) return null;
  try {
    const session = JSON.parse(saved);
    if (session?.role === 'associate') {
      const persistedSession = { ...session };
      delete persistedSession.deviceRegistrationSkipped;
      return persistedSession;
    }
  } catch {
    try {
      localStorage.removeItem('bms_session');
    } catch (error) {
      console.error('Unable to clear the invalid saved associate session.', error);
    }
  }
  try {
    localStorage.removeItem('bms_session');
  } catch (error) {
    console.error('Unable to clear the invalid saved associate session.', error);
  }
  return null;
};

const getTodayKey = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
};

const getAssociateStreak = (associateId) => {
  try {
    const saved = localStorage.getItem(`bms_streak_${associateId}`);
    if (!saved) return { count: 0, lastLogin: null };
    return JSON.parse(saved);
  } catch (error) {
    console.error('Unable to read associate streak.', error);
    return { count: 0, lastLogin: null };
  }
};

const getDeviceId = () => {
  try {
    let deviceId = localStorage.getItem('bms_device_id');
    if (!deviceId) {
      deviceId = crypto.randomUUID();
      localStorage.setItem('bms_device_id', deviceId);
    }
    return deviceId;
  } catch (error) {
    console.error('Unable to access persistent device storage.', error);
    return null;
  }
};

const parseSupportTicket = (message) => {
  const match = message.title?.match(/^\[BMS-TICKET:([\w-]+):(PENDING|RESOLVED)\] (.*)$/);
  if (match) return { ticketId: match[1], status: match[2], subject: match[3] };
  if (message.recipient_id === 'Admin HQ' && message.category?.startsWith('Inquiry:')) {
    return {
      ticketId: String(message.id),
      status: message.status === 'pending_review' ? 'PENDING' : 'RESOLVED',
      subject: message.title
    };
  }
  return null;
};

const formatInquiryReference = (ticketId) => `Inquiry #${String(ticketId).slice(-4).toUpperCase()}`;
const getInquiryReplySubject = (title) => title?.replace(/^\[BMS-REPLY:[\w-]+\]\s*/, '') || 'Inquiry';
const getMessageDisplayTitle = (title) => title?.startsWith('[BMS-REPLY:')
  ? `RE: ${getInquiryReplySubject(title)}`
  : title;
const getAdminReplyForInquiry = (ticketId, messages) => messages.find((message) => (
  message.title?.match(/^\[BMS-REPLY:([\w-]+)\]/)?.[1] === String(ticketId)
));

const MESSAGE_ATTACHMENT_BUCKET = 'message-attachments';
const MAX_INQUIRY_ATTACHMENT_SIZE = 25 * 1024 * 1024;
const LOGIN_LOCKOUT_ATTEMPTS = 5;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const LOGIN_SECURITY_SESSION_KEY = 'bms_login_security';
const isImageAttachment = (url) => /\.(avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#]|$)/i.test(url || '');
const getSavedLoginSecurity = () => {
  try {
    const saved = localStorage.getItem(LOGIN_SECURITY_SESSION_KEY);
    if (!saved) return { failedAttempts: 0, lockoutUntil: null };
    const parsed = JSON.parse(saved);
    const failedAttempts = Number.isInteger(parsed?.failedAttempts) && parsed.failedAttempts >= 0
      ? parsed.failedAttempts
      : 0;
    const lockoutUntil = Number.isFinite(parsed?.lockoutUntil) && parsed.lockoutUntil > Date.now()
      ? parsed.lockoutUntil
      : null;
    if (!lockoutUntil && failedAttempts >= LOGIN_LOCKOUT_ATTEMPTS) {
      localStorage.removeItem(LOGIN_SECURITY_SESSION_KEY);
      return { failedAttempts: 0, lockoutUntil: null };
    }
    return { failedAttempts, lockoutUntil };
  } catch (error) {
    console.error('Unable to read saved login security state.', error);
    return { failedAttempts: 0, lockoutUntil: null };
  }
};
const saveLoginSecurity = (failedAttempts, lockoutUntil) => {
  try {
    if (failedAttempts === 0 && !lockoutUntil) {
      localStorage.removeItem(LOGIN_SECURITY_SESSION_KEY);
    } else {
      localStorage.setItem(LOGIN_SECURITY_SESSION_KEY, JSON.stringify({ failedAttempts, lockoutUntil }));
    }
  } catch (error) {
    console.error('Unable to save login security state.', error);
  }
};
const getSafeAttachmentName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '_');
const getGoogleDriveFileId = (value) => {
  try {
    const url = new URL(value);
    if (!['drive.google.com', 'docs.google.com'].includes(url.hostname)) return null;
    return url.pathname.match(/\/file\/d\/([^/]+)/)?.[1] || url.searchParams.get('id');
  } catch {
    return null;
  }
};
const getLibraryDownloadUrl = (url) => {
  const driveFileId = getGoogleDriveFileId(url);
  return driveFileId ? `https://drive.google.com/uc?export=download&id=${encodeURIComponent(driveFileId)}` : url;
};
const getLibraryPreviewUrl = (url) => {
  const driveFileId = getGoogleDriveFileId(url);
  return driveFileId ? `https://drive.google.com/uc?export=view&id=${encodeURIComponent(driveFileId)}` : url;
};
const getAttachmentDisplayName = (url) => {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop()) || 'Attachment';
  } catch {
    return 'Attachment';
  }
};
const quotePostgrestValue = (value) => `"${String(value).replaceAll('\\', '\\\\').replaceAll('"', '\\"')}"`;
const isAdminAuthoredMessage = (message) => message.sender === 'Admin HQ'
  || (!message.sender && message.recipient_id !== 'ADMIN' && !message.title?.startsWith('[BMS-REPLY:'));
const recordAssociateLogin = (associateId) => {
  const today = getTodayKey();
  const streak = getAssociateStreak(associateId);
  if (streak.lastLogin === today) return streak;
  const [year, month, day] = today.split('-').map(Number);
  const yesterday = new Date(Date.UTC(year, month - 1, day - 1));
  const yesterdayKey = `${yesterday.getUTCFullYear()}-${String(yesterday.getUTCMonth() + 1).padStart(2, '0')}-${String(yesterday.getUTCDate()).padStart(2, '0')}`;
  const nextStreak = {
    count: !streak.lastLogin ? 1 : streak.lastLogin === yesterdayKey ? streak.count + 1 : 1,
    lastLogin: today
  };
  try {
    localStorage.setItem(`bms_streak_${associateId}`, JSON.stringify(nextStreak));
  } catch (error) {
    console.error('Unable to save associate streak.', error);
  }
  return nextStreak;
};

function generateRandomChallenge() {
  const ops = ['+', '-', '×'];
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a, b, ans;
  if (op === '+') {
    a = Math.floor(Math.random() * 20) + 5;
    b = Math.floor(Math.random() * 15) + 3;
    ans = a + b;
  } else if (op === '-') {
    a = Math.floor(Math.random() * 30) + 15;
    b = Math.floor(Math.random() * 12) + 2;
    ans = a - b;
  } else {
    a = Math.floor(Math.random() * 8) + 2;
    b = Math.floor(Math.random() * 7) + 2;
    ans = a * b;
  }
  return { a, op, b, ans, prompt: a + ' ' + op + ' ' + b };
}

function HumanVerificationShield({ onVerified }) {
  const [challenge, setChallenge] = useState(generateRandomChallenge);
  const [started, setStarted] = useState(false);
  const [checking, setChecking] = useState(false);
  const [challengeVisible, setChallengeVisible] = useState(false);
  const [answer, setAnswer] = useState('');
  const [error, setError] = useState('');
  const [verified, setVerified] = useState(false);
  const startedAt = React.useRef(0);
  const verificationTimeout = React.useRef(null);

  useEffect(() => () => {
    if (verificationTimeout.current !== null) {
      window.clearTimeout(verificationTimeout.current);
    }
  }, []);

  const refreshChallenge = (nextError = '') => {
    setChallenge(generateRandomChallenge());
    setAnswer('');
    setError(nextError);
  };

  const beginVerification = () => {
    if (started || verified) return;
    startedAt.current = performance.now();
    setStarted(true);
    setChecking(true);
    verificationTimeout.current = window.setTimeout(() => {
      verificationTimeout.current = null;
      setChecking(false);
      setChallengeVisible(true);
    }, 600);
  };

  const verifyAnswer = (event) => {
    event.preventDefault();
    if (performance.now() - startedAt.current < 500) {
      setError('Please wait a moment while BMS Shield verifies human interaction.');
      return;
    }
    if (!/^\d+$/.test(answer.trim()) || Number(answer.trim()) !== challenge.ans) {
      refreshChallenge('Incorrect answer. Generated a new question.');
      return;
    }
    setError('');
    setVerified(true);
    if (onVerified) onVerified(true);
  };

  return (
    <div className={`human-shield ${verified ? 'is-verified' : ''}`}>
      <button
        type="button"
        className="human-shield-check"
        role="checkbox"
        aria-checked={verified}
        disabled={checking || verified}
        onClick={beginVerification}
      >
        <span className="human-shield-checkbox" aria-hidden="true">
          {verified ? <Check size={16} /> : checking ? <span className="human-shield-spinner" /> : null}
        </span>
        <span className="human-shield-label">{verified ? 'Verified Human' : "I'm not a robot"}</span>
        <span className="human-shield-seal"><ShieldCheck size={20} /><small>BMS<br />SHIELD</small></span>
      </button>
      {checking && <p className="human-shield-status">Verifying secure human interaction…</p>}
      {challengeVisible && !verified && (
        <div className="human-shield-challenge" role="group" aria-label="Human verification challenge">
          <div className="challenge-prompt-row">
            <span className="challenge-badge">Security Challenge: <strong>{challenge.prompt} = ?</strong></span>
            <button type="button" className="btn-refresh-challenge" onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              refreshChallenge();
            }} title="Get New Question">
              <RefreshCw size={13} />
            </button>
          </div>
          <div className="human-shield-answer-row">
            <input
              id="human-shield-answer"
              inputMode="numeric"
              pattern="[0-9]*"
              autoComplete="off"
              placeholder="Answer"
              value={answer}
              onChange={event => setAnswer(event.target.value)}
              onKeyDown={e => e.key === 'Enter' && verifyAnswer(e)}
              aria-label={'Answer to ' + challenge.prompt}
              required
            />
            <button type="button" className="btn-verify-shield" onClick={verifyAnswer} disabled={!answer.trim()}>Verify</button>
          </div>
          {error && <span className="human-shield-error" role="alert">{error}</span>}
        </div>
      )}
      {verified && <p className="human-shield-success">✓ Verified Human (Protected by BMS Shield 🛡️)</p>}
    </div>
  );
}

export default function App() {
  const [showPassword, setShowPassword] = useState(false);
  const [currentUser, setCurrentUser] = useState(getInitialSession);
  const [isAmbiencePlaying, setIsAmbiencePlaying] = useState(false);
  const ambientAudioRef = React.useRef(null);
  const toastChimeRef = React.useRef(null);
  const toastChimeTimer = React.useRef(null);
  const [isValidatingSession, setIsValidatingSession] = useState(() => Boolean(currentUser));
  const [loginRole, setLoginRole] = useState('associate');
  const [loginId, setLoginId] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [loginError, setLoginError] = useState(supabaseConfigError);
  const [isLoginSubmitting, setIsLoginSubmitting] = useState(false);
  const [failedAttempts, setFailedAttempts] = useState(() => getSavedLoginSecurity().failedAttempts);
  const [lockoutUntil, setLockoutUntil] = useState(() => getSavedLoginSecurity().lockoutUntil);
  const [lockoutNow, setLockoutNow] = useState(() => Date.now());
  const [humanVerified, setHumanVerified] = useState(false);
  const [portalDataError, setPortalDataError] = useState('');
  const [toasts, setToasts] = useState([]);
  const [activeTab, setActiveTab] = useState('dashboard');

  const [quote, setQuote] = useState(() => MOTIVATION_QUOTES[Math.floor(Math.random() * MOTIVATION_QUOTES.length)]);
  const [loginStreak, setLoginStreak] = useState(() => currentUser?.role === 'associate' ? getAssociateStreak(currentUser.associate_id).count : 0);
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const [associates, setAssociates] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [activityLogsUnavailable, setActivityLogsUnavailable] = useState(false);
  const [leads, setLeads] = useState([]);
  const [visits, setVisits] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [messages, setMessages] = useState([]);
  const [libraryItems, setLibraryItems] = useState([]);
  const [libraryForm, setLibraryForm] = useState({ title: '', category: 'Brochure', url: '', latitude: '', longitude: '' });
  const [editingLibraryItem, setEditingLibraryItem] = useState(null);
  const [showLibraryForm, setShowLibraryForm] = useState(false);
  const [loanPrincipal, setLoanPrincipal] = useState(5000000);
  const [loanRate, setLoanRate] = useState(8.5);
  const [loanTenure, setLoanTenure] = useState(20);
  const [plotGaj, setPlotGaj] = useState(100);
  const [plotRate, setPlotRate] = useState(25000);
  const [plotPlc, setPlotPlc] = useState({ corner: false, wideRoad: false, parkFacing: false });
  const [supportForm, setSupportForm] = useState({ title: '', message: '', category: 'General' });
  const [editingTicket, setEditingTicket] = useState(null);
  const [showSupportForm, setShowSupportForm] = useState(false);
  const [supportAttachment, setSupportAttachment] = useState(null);
  const [existingSupportAttachmentUrl, setExistingSupportAttachmentUrl] = useState(null);
  const [supportAttachmentPreview, setSupportAttachmentPreview] = useState(null);
  const [isSubmittingInquiry, setIsSubmittingInquiry] = useState(false);
  const [visitApproval, setVisitApproval] = useState(null);
  const [cabForm, setCabForm] = useState({ driver_name: '', driver_phone: '', vehicle_number: '', notes: '' });

  const [showAddLead, setShowAddLead] = useState(false);
  const [editingLead, setEditingLead] = useState(null);
  const [leadForm, setLeadForm] = useState({ name: '', phone: '', project: 'BMS Royal City, Jagatpura', budget: '', status: 'New Lead' });

  const [showAddVisit, setShowAddVisit] = useState(false);
  const [editingVisit, setEditingVisit] = useState(null);
  const [visitForm, setVisitForm] = useState({ client: '', project: 'BMS Royal City, Jagatpura', date: '', time: '11:00 AM', vehicle: 'Cab Requested from BMS Office' });

  const [showCreateAssociate, setShowCreateAssociate] = useState(false);
  const [editingAssociate, setEditingAssociate] = useState(null);
  const [assocForm, setAssocForm] = useState({ name: '', phone: '', email: '', password: '', slab: 'Bronze Associate', slab_rate: '2.0%' });

  const [showMsgModal, setShowMsgModal] = useState(false);
  const [msgForm, setMsgForm] = useState({ recipient_id: 'ALL', title: '', message: '' });
  const [editingAdminMessage, setEditingAdminMessage] = useState(null);

  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [editingAnnouncement, setEditingAnnouncement] = useState(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', description: '', tag: 'General' });

  const [zoomPhotoUrl, setZoomPhotoUrl] = useState(null);
  const [showPhotoUploadModal, setShowPhotoUploadModal] = useState(false);
  const [newPhotoInput, setNewPhotoInput] = useState('');

  const [selfEditForm, setSelfEditForm] = useState({ name: '', phone: '', email: '' });
  const [showSelfEditModal, setShowSelfEditModal] = useState(false);
  const toastTimers = React.useRef(new Map());
  const lockoutRemainingMs = Math.max(0, (lockoutUntil || 0) - lockoutNow);
  const isLoginLockedOut = lockoutRemainingMs > 0;
  const playToastChime = React.useCallback(async () => {
    const chime = toastChimeRef.current;
    if (!chime) return;
    chime.volume = 0.12;
    chime.currentTime = 0;
    try {
      await chime.play();
      if (toastChimeTimer.current) window.clearTimeout(toastChimeTimer.current);
      toastChimeTimer.current = window.setTimeout(() => {
        chime.pause();
        chime.currentTime = 0;
      }, 1400);
    } catch (error) {
      console.warn('The notification chime could not be played.', error);
    }
  }, []);
  const showToast = React.useCallback((type, message) => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts(current => [...current, { id, type, message }]);
    void playToastChime();
    toastTimers.current.set(id, window.setTimeout(() => {
      setToasts(current => current.filter(toast => toast.id !== id));
      toastTimers.current.delete(id);
    }, 3500));
  }, [playToastChime]);
  const startAmbientAudio = React.useCallback(async () => {
    const audio = ambientAudioRef.current;
    if (!audio) return false;
    audio.volume = 0.2;
    try {
      await audio.play();
      return true;
    } catch (error) {
      console.warn('Relaxing music could not be started. Use the audio control to retry.', error);
      return false;
    }
  }, []);
  const stopAmbientAudio = React.useCallback(() => {
    ambientAudioRef.current?.pause();
  }, []);
  const toggleAmbientAudio = async () => {
    const audio = ambientAudioRef.current;
    if (audio && !audio.paused) {
      stopAmbientAudio();
      return;
    }
    setIsAmbiencePlaying(await startAmbientAudio());
  };
  const dismissToast = (id) => {
    const timerId = toastTimers.current.get(id);
    if (timerId) window.clearTimeout(timerId);
    toastTimers.current.delete(id);
    setToasts(current => current.filter(toast => toast.id !== id));
  };
  const reportMutationError = (action, error) => {
    console.error(`Unable to ${action}.`, error);
    showToast('error', `Unable to ${action}. ${error?.message || 'Check your connection and permissions.'}`);
  };

  const logAssociateActivity = React.useCallback(async (user, action) => {
    if (user?.role !== 'associate' || !supabaseConfigured) return;
    try {
      const { error } = await supabase.from('activity_logs').insert([{
        associate_id: user.associate_id,
        associate_name: user.name,
        action,
        device: navigator.platform || 'Unknown browser'
      }]);
      if (error) console.warn(`Associate activity log "${action}" could not be saved.`, error);
    } catch (error) {
      console.warn(`Associate activity log "${action}" could not be saved.`, error);
    }
  }, []);

  useEffect(() => () => {
    toastTimers.current.forEach(timerId => window.clearTimeout(timerId));
    toastTimers.current.clear();
    if (toastChimeTimer.current) window.clearTimeout(toastChimeTimer.current);
  }, []);

  const recordFailedLogin = () => {
    const nextAttempts = failedAttempts + 1;
    if (nextAttempts >= LOGIN_LOCKOUT_ATTEMPTS) {
      const nextLockoutUntil = Date.now() + LOGIN_LOCKOUT_DURATION_MS;
      setFailedAttempts(nextAttempts);
      setLockoutUntil(nextLockoutUntil);
      setLockoutNow(Date.now());
      saveLoginSecurity(nextAttempts, nextLockoutUntil);
      return;
    }
    setFailedAttempts(nextAttempts);
    saveLoginSecurity(nextAttempts, null);
  };

  const resetLoginSecurity = () => {
    setFailedAttempts(0);
    setLockoutUntil(null);
    setLockoutNow(Date.now());
    saveLoginSecurity(0, null);
  };

  useEffect(() => {
    if (!lockoutUntil) return undefined;
    const updateLockoutCountdown = () => {
      const now = Date.now();
      setLockoutNow(now);
      if (now >= lockoutUntil) {
        setFailedAttempts(0);
        setLockoutUntil(null);
        saveLoginSecurity(0, null);
      }
    };
    updateLockoutCountdown();
    const intervalId = window.setInterval(updateLockoutCountdown, 1000);
    return () => window.clearInterval(intervalId);
  }, [lockoutUntil]);

  useEffect(() => {
    const syncLoginSecurity = (event) => {
      if (event.key !== LOGIN_SECURITY_SESSION_KEY) return;
      const savedSecurity = getSavedLoginSecurity();
      setFailedAttempts(savedSecurity.failedAttempts);
      setLockoutUntil(savedSecurity.lockoutUntil);
      setLockoutNow(Date.now());
    };
    window.addEventListener('storage', syncLoginSecurity);
    return () => window.removeEventListener('storage', syncLoginSecurity);
  }, []);

  useEffect(() => () => {
    if (supportAttachmentPreview?.startsWith('blob:')) URL.revokeObjectURL(supportAttachmentPreview);
  }, [supportAttachmentPreview]);

  const handleLogout = useCallback(() => {
    stopAmbientAudio();
    setIsAmbiencePlaying(false);
    if (currentUser?.role === 'associate' && supabaseConfigured) {
      try {
        void supabase.rpc('release_associate_device', {
          p_associate_id: currentUser.associate_id,
          p_device_id: getDeviceId()
        }).then(({ error }) => {
          if (error) console.warn('Unable to release the associate device during logout.', error);
        }).catch(error => {
          console.warn('Unable to release the associate device during logout.', error);
        });
      } catch (error) {
        console.error('Unable to release the associate device during logout.', error);
      }
    }
    setLoginPass('');
    setAdminPass('');
    setCurrentUser(null);
    setIsValidatingSession(false);
    setActiveTab('dashboard');
  }, [currentUser, stopAmbientAudio]);

  // 5-Minute Inactivity Auto-Logout
  useEffect(() => {
    if (!currentUser) return;
    let timer;
    const resetTimer = () => {
      clearTimeout(timer);
      timer = setTimeout(() => {
        alert("⚠️ Security Timeout: You have been logged out due to 5 minutes of inactivity.");
        handleLogout();
      }, 5 * 60 * 1000);
    };

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    events.forEach(e => window.addEventListener(e, resetTimer));
    resetTimer();

    return () => {
      clearTimeout(timer);
      events.forEach(e => window.removeEventListener(e, resetTimer));
    };
  }, [currentUser, handleLogout]);

  useEffect(() => {
    const updateCurrentDate = () => setCurrentDate(new Date());
    window.addEventListener('focus', updateCurrentDate);
    return () => window.removeEventListener('focus', updateCurrentDate);
  }, []);

  // Scope client queries by role; Supabase RLS must independently enforce access.
  const fetchData = React.useCallback(async (userSession = currentUser) => {
    if (!supabaseConfigured) return;
    const failedTables = [];
    const loadTable = async (table, query, setData) => {
      const { data, error } = await query;
      if (error) {
        failedTables.push(table);
        console.error(`Unable to load ${table} from Supabase.`, error);
        return;
      }
      setData(data || []);
    };
    const loadAssociates = async (includeLastSeen, includeStreak = true) => {
      let query = supabase.from('associates')
        .select(`id, associate_id, name, phone, email, slab, slab_rate, status, photo_url, pending_photo_url, created_at${includeLastSeen ? ', last_seen' : ''}${includeStreak ? ', streak' : ''}`)
        .order('created_at', { ascending: false });
      if (userSession?.role === 'associate') query = query.eq('associate_id', userSession.associate_id);
      const { data, error } = await query;
      if (!error) {
        setAssociates(data || []);
        return;
      }
      const errorDetails = `${error.message || ''} ${error.details || ''}`;
      const isMissingColumn = (column) => ['42703', 'PGRST204'].includes(error.code) && errorDetails.includes(column);
      if (includeLastSeen && isMissingColumn('last_seen')) {
        console.warn('The associates.last_seen column is not available yet; online status will be unavailable.', error);
        await loadAssociates(false, includeStreak);
        return;
      }
      if (includeStreak && isMissingColumn('streak')) {
        console.warn('The associates.streak column is not available yet; the default streak will be shown.', error);
        await loadAssociates(includeLastSeen, false);
        return;
      }
      failedTables.push('associates');
      console.error('Unable to load associates from Supabase.', error);
    };
    const loadActivityLogs = async () => {
      try {
        const { data, error } = await supabase.from('activity_logs')
          .select('id, associate_id, associate_name, action, device, created_at')
          .order('created_at', { ascending: false })
          .limit(15);
        if (error) throw error;
        setActivityLogs(data || []);
        setActivityLogsUnavailable(false);
      } catch (error) {
        console.warn('Recent associate activity logs are unavailable; the portal will continue normally.', error);
        setActivityLogs([]);
        setActivityLogsUnavailable(true);
      }
    };

    try {
      let leadsQuery = supabase.from('leads').select('*').order('created_at', { ascending: false });
      if (userSession?.role === 'associate') {
        leadsQuery = leadsQuery.eq('associate_id', userSession.associate_id);
      }
      let visitsQuery = supabase.from('site_visits').select('*').order('created_at', { ascending: false });
      if (userSession?.role === 'associate') {
        visitsQuery = visitsQuery.eq('associate_id', userSession.associate_id);
      }
      let msgQuery = supabase.from('messages').select('*').order('created_at', { ascending: false });
      if (userSession?.role === 'associate') {
        msgQuery = msgQuery.or(`recipient_id.eq.ALL,recipient_id.eq.${userSession.associate_id},sender.eq.${userSession.associate_id},sender.eq.${quotePostgrestValue(userSession.name)}`);
      }
      await Promise.all([
        loadAssociates(true),
        loadTable('leads', leadsQuery, setLeads),
        loadTable('site_visits', visitsQuery, setVisits),
        loadTable('announcements', supabase.from('announcements').select('*').order('created_at', { ascending: false }), setAnnouncements),
        loadTable('library_items', supabase.from('library_items').select('*').order('created_at', { ascending: false }), setLibraryItems),
        loadTable('messages', msgQuery, setMessages),
        userSession?.role === 'admin' ? loadActivityLogs() : Promise.resolve()
      ]);
      if (failedTables.length) {
        const errorMessage = `Some portal data could not be loaded: ${failedTables.join(', ')}. Check the Supabase connection, table permissions, and RLS policies.`;
        setPortalDataError(errorMessage);
        showToast('error', errorMessage);
      } else {
        setPortalDataError('');
      }
    } catch (error) {
      console.error('Unable to load portal data from Supabase.', error);
      const errorMessage = 'Portal data could not be loaded. Check the Supabase connection and try again.';
      setPortalDataError(errorMessage);
      showToast('error', errorMessage);
    }
  }, [currentUser, showToast]);

  useEffect(() => {
    if (currentUser?.role === 'admin') {
      // Refresh remote portal data when an administrator or the active section changes.
      // oxlint-disable-next-line react/set-state-in-effect
      void fetchData(currentUser);
    }
  }, [currentUser, activeTab, fetchData]);

  useEffect(() => {
    if (currentUser) {
      try {
        if (currentUser.role === 'associate') {
          const persistedSession = { ...currentUser };
          delete persistedSession.deviceRegistrationSkipped;
          localStorage.setItem('bms_session', JSON.stringify(persistedSession));
        } else {
          localStorage.removeItem('bms_session');
        }
      } catch (error) {
        console.error('Unable to persist the associate session.', error);
      }
    } else {
      try {
        localStorage.removeItem('bms_session');
      } catch (error) {
        console.error('Unable to clear the saved associate session.', error);
      }
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role !== 'associate') return undefined;
    const sendHeartbeat = async () => {
      try {
        const { error } = await supabase.from('associates')
          .update({ last_seen: new Date().toISOString() })
          .eq('associate_id', currentUser.associate_id);
        if (error) console.warn('Associate heartbeat could not be saved; online status may be stale.', error);
      } catch (error) {
        console.warn('Associate heartbeat could not be saved; online status may be stale.', error);
      }
    };
    void sendHeartbeat();
    const heartbeatId = window.setInterval(() => void sendHeartbeat(), 60000);
    return () => window.clearInterval(heartbeatId);
  }, [currentUser]);

  useEffect(() => {
    if (currentUser?.role !== 'associate') return undefined;
    let initialValidation = true;
    let validationInFlight = false;
    const verifyDevice = async () => {
      if (validationInFlight) return;
      validationInFlight = true;
      if (!supabaseConfigured) {
        console.warn('Associate device validation is unavailable; keeping the verified session active.');
        setIsValidatingSession(false);
        void fetchData(currentUser);
        validationInFlight = false;
        return;
      }
      const deviceId = getDeviceId();
      if (!deviceId) {
        console.warn('Persistent device storage is unavailable; keeping the verified associate session active.');
        setIsValidatingSession(false);
        void fetchData(currentUser);
        validationInFlight = false;
        return;
      }
      let validationTimeout;
      try {
        const validation = await Promise.race([
          supabase.rpc('validate_associate_device', {
            p_associate_id: currentUser.associate_id,
            p_device_id: deviceId
          }),
          new Promise((_, reject) => {
            validationTimeout = window.setTimeout(() => reject(new Error('Associate device validation timed out.')), 8000);
          })
        ]);
        const { data, error } = validation;
        if (error) {
          console.warn('Associate device validation RPC is unavailable; keeping the session active.', error);
          setIsValidatingSession(false);
          void fetchData(currentUser);
          validationInFlight = false;
          return;
        }
        const isExplicitlyInvalid = data === false || data?.valid === false;
        const isValid = data === true || data?.valid === true;
        if (isExplicitlyInvalid) {
          alert('⚠️ Access Revoked: Your session was terminated by BMS Head Office. Please sign in again.');
          handleLogout();
          validationInFlight = false;
          return;
        }
        if (!isValid) {
          console.warn('Associate device validation returned an unrecognized result; keeping the verified session active.');
          setIsValidatingSession(false);
          void fetchData(currentUser);
          return;
        }
        if (initialValidation) {
          initialValidation = false;
          setIsValidatingSession(false);
          void fetchData(currentUser);
        }
      } catch (error) {
        console.warn('Associate device validation failed unexpectedly; keeping the session active.', error);
        setIsValidatingSession(false);
        void fetchData(currentUser);
      } finally {
        window.clearTimeout(validationTimeout);
        validationInFlight = false;
      }
    };
    void verifyDevice();
    const intervalId = window.setInterval(() => void verifyDevice(), 10000);
    window.addEventListener('focus', verifyDevice);
    const channel = supabaseConfigured
      ? supabase.channel(`associate-session-${currentUser.associate_id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'associates',
          filter: `associate_id=eq.${currentUser.associate_id}`
        }, () => void verifyDevice())
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'associate_devices',
          filter: `associate_id=eq.${currentUser.associate_id}`
        }, () => void verifyDevice())
        .subscribe(status => {
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            console.warn('Live associate session revocation is unavailable; periodic validation remains active.');
          }
        })
      : null;
    return () => {
      window.clearInterval(intervalId);
      window.removeEventListener('focus', verifyDevice);
      if (channel) void supabase.removeChannel(channel);
    };
  }, [currentUser, handleLogout, fetchData]);

  useEffect(() => {
    if (!currentUser || !supabaseConfigured) return undefined;
    const tables = ['associates', 'leads', 'site_visits', 'announcements', 'library_items', 'messages'];
    if (currentUser.role === 'admin') tables.push('activity_logs', 'associate_devices');
    const channel = supabase.channel(`portal-updates-${currentUser.role}-${currentUser.associate_id || currentUser.id}`);
    tables.forEach(table => {
      channel.on('postgres_changes', { event: '*', schema: 'public', table }, payload => {
        void fetchData(currentUser);
        if (
          currentUser.role === 'admin' &&
          payload.eventType === 'INSERT' &&
          ['leads', 'site_visits', 'messages'].includes(table) &&
          (table === 'messages'
            ? payload.new?.sender !== 'ADMIN' && payload.new?.sender !== currentUser.name
            : payload.new?.associate_id && payload.new.associate_id !== 'ADMIN')
        ) {
          void playToastChime();
        }
      });
    });
    channel.subscribe(status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
        console.warn('Live portal updates are unavailable; manual navigation refresh remains available.');
      }
    });
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [currentUser, fetchData, playToastChime]);

  useEffect(() => {
    if (currentUser?.role !== 'admin') return undefined;
    const intervalId = window.setInterval(() => {
      void fetchData(currentUser);
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [currentUser, fetchData]);

  const shuffleQuote = () => {
    setQuote(currentQuote => {
      const choices = MOTIVATION_QUOTES.filter(item => item.english !== currentQuote.english);
      return choices[Math.floor(Math.random() * choices.length)];
    });
  };

  const registerAssociateDevice = async (associateId) => {
    try {
      const deviceId = getDeviceId();
      if (!deviceId) {
        console.warn('Persistent device storage is unavailable; associate device registration was skipped.');
        return false;
      }
      const { data, error } = await supabase.rpc('register_associate_device', {
        p_associate_id: associateId,
        p_device_id: deviceId,
        p_device_label: `${navigator.platform || 'Unknown'} browser`
      });
      const result = typeof data === 'boolean' ? { success: data } : data;
      if (error) {
        console.error('Associate device registration RPC failed.', error);
        return false;
      }
      if (result?.success !== true) {
        console.warn('Associate device registration was not accepted.', result?.error || 'Unspecified registration failure.');
        return false;
      }
      return true;
    } catch (error) {
      console.error('Unable to register this associate device.', error);
      return false;
    }
  };

  const establishAssociateSession = async (user) => {
    const deviceRegistered = await registerAssociateDevice(user.associate_id);
    if (!deviceRegistered) return false;
    let streak = getAssociateStreak(user.associate_id);
    try {
      const { data, error } = await supabase.rpc('record_associate_login', {
        p_associate_id: user.associate_id
      });
      if (!error && Number.isFinite(data?.streak_count)) {
        streak = { ...streak, count: data.streak_count, lastLogin: getTodayKey() };
        try {
          localStorage.setItem(`bms_streak_${user.associate_id}`, JSON.stringify(streak));
        } catch (storageError) {
          console.error('Unable to persist associate streak.', storageError);
        }
      } else {
        streak = recordAssociateLogin(user.associate_id);
      }
    } catch (error) {
      console.warn('Associate login streak service is unavailable; using local streak data.', error);
      streak = recordAssociateLogin(user.associate_id);
    }
    setLoginStreak(streak.count);
    setCurrentUser(user);
    void logAssociateActivity(user, 'LOGIN');
    return true;
  };

  const handleAssociateLogin = async (e) => {
    e.preventDefault();
    if (isLoginLockedOut || isLoginSubmitting) return;
    if (!humanVerified) {
      alert('Please verify you are human before signing in.');
      return;
    }
    if (!supabaseConfigured) {
      setLoginError(supabaseConfigError);
      return;
    }
    const id = loginId.trim();
    const pass = loginPass;
    setLoginError('');
    const ambientAudioPromise = startAmbientAudio();
    setIsLoginSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('verify_associate_login', {
        entered_id: id,
        entered_pass: pass
      });
      if (error) {
        throw new Error(error.message || 'Secure associate login is unavailable. Please try again later.');
      }
      if (!data?.success || !data.user?.associate_id) {
        stopAmbientAudio();
        setLoginError(data?.error || 'Invalid associate code/mobile or password.');
        recordFailedLogin();
        return;
      }
      if (data.user.status === 'deactivated') {
        stopAmbientAudio();
        setLoginError('This account has been deactivated. Please contact BMS Head Office.');
        recordFailedLogin();
        return;
      }
      resetLoginSecurity();
      const sessionEstablished = await establishAssociateSession({ ...data.user, role: 'associate' });
      if (!sessionEstablished) {
        stopAmbientAudio();
        setLoginError('Secure device registration failed. Please try again or contact BMS Head Office.');
        return;
      }
      setIsAmbiencePlaying(await ambientAudioPromise);
    } catch (error) {
      stopAmbientAudio();
      setLoginError(error.message || 'Unable to sign in. Please check your connection and try again.');
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  // Secure Server-Side RPC Admin Verification
  const handleAdminLogin = async (e) => {
    e.preventDefault();
    if (isLoginLockedOut || isLoginSubmitting) return;
    if (!humanVerified) {
      alert('Please verify you are human before signing in.');
      return;
    }
    if (!supabaseConfigured) {
      setLoginError(supabaseConfigError);
      return;
    }
    const pass = adminPass;
    setLoginError('');
    const ambientAudioPromise = startAmbientAudio();
    setIsLoginSubmitting(true);
    try {
      const { data, error } = await supabase.rpc('verify_admin_access', {
        entered_password: pass
      });
      if (error) {
        throw new Error(error.message || 'Secure admin login is unavailable. Please try again later.');
      }
      if ((typeof data === 'boolean' && data) || data?.success === true) {
        resetLoginSecurity();
        const adminUser = {
          role: 'admin',
          name: data?.admin_name || 'Managing Director (Admin HQ)',
          id: data?.admin_id || 'ADMIN-01'
        };
        setCurrentUser(adminUser);
        setIsAmbiencePlaying(await ambientAudioPromise);
        await fetchData(adminUser);
      } else {
        stopAmbientAudio();
        setLoginError('Access denied. Check your password or contact an authorized administrator.');
        recordFailedLogin();
      }
    } catch (error) {
      stopAmbientAudio();
      setLoginError(error.message || 'Unable to sign in. Please check your connection and try again.');
    } finally {
      setIsLoginSubmitting(false);
    }
  };

  const canAssociateEditSelf = (now = currentDate) => {
    if (!currentUser || currentUser.role !== 'associate') return false;
    if (!currentUser.created_at) return true;
    const createdDate = new Date(currentUser.created_at);
    const elapsedMilliseconds = now.getTime() - createdDate.getTime();
    return Number.isFinite(elapsedMilliseconds) && elapsedMilliseconds >= 0 && elapsedMilliseconds <= 30 * 24 * 60 * 60 * 1000;
  };

  const handleSaveSelfEdit = async (e) => {
    e.preventDefault();
    const now = new Date();
    setCurrentDate(now);
    if (!canAssociateEditSelf(now)) {
      alert('🔒 30-day editing window has expired. Contact Admin to change personal details.');
      return;
    }
    const { error } = await supabase.from('associates').update({
      name: selfEditForm.name,
      phone: selfEditForm.phone,
      email: selfEditForm.email
    }).eq('id', currentUser.id);

    if (!error) {
      alert('Profile Updated Successfully!');
      setCurrentUser({ ...currentUser, ...selfEditForm });
      setShowSelfEditModal(false);
      await fetchData();
    } else {
      reportMutationError('update your profile', error);
    }
  };

  const handleSaveAssociate = async (e) => {
    e.preventDefault();
    if (editingAssociate) {
      const { error } = await supabase.from('associates').update({
        name: assocForm.name,
        phone: assocForm.phone,
        email: assocForm.email,
        ...(assocForm.password ? { password: assocForm.password } : {}),
        slab: assocForm.slab,
        slab_rate: assocForm.slab_rate
      }).eq('id', editingAssociate.id);

      if (!error) {
        alert('Associate Details & Slab Tier Updated by Admin!');
        setEditingAssociate(null);
        setShowCreateAssociate(false);
        await fetchData();
      } else {
        reportMutationError('update the associate', error);
      }
    } else {
      const assocCode = 'BMS-' + Math.floor(1000 + Math.random() * 9000);
      const { error } = await supabase.from('associates').insert([{
        associate_id: assocCode,
        name: assocForm.name,
        phone: assocForm.phone,
        email: assocForm.email,
        password: assocForm.password,
        status: 'active',
        slab: assocForm.slab,
        slab_rate: assocForm.slab_rate,
        total_sales: '₹ 0',
        earned_commission: '₹ 0',
        photo_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=300'
      }]);

      if (!error) {
        alert(`New Associate Created!\nID: ${assocCode}\nPassword: ${assocForm.password}\nPlease share credentials with the associate.`);
        setShowCreateAssociate(false);
        await fetchData();
      } else {
        reportMutationError('create the associate', error);
      }
    }
  };

  const toggleAssociateStatus = async (associate) => {
    const isDeactivating = associate.status === 'active';
    const { error } = await supabase.from('associates').update({
      status: isDeactivating ? 'deactivated' : 'active',
      ...(isDeactivating ? { force_logout_at: new Date().toISOString() } : {})
    }).eq('id', associate.id);
    if (error) {
      reportMutationError('change the associate status', error);
      return;
    }
    if (isDeactivating) {
      const { data, error: revokeError } = await supabase.rpc('revoke_associate_devices', {
        p_associate_id: associate.associate_id
      });
      if (revokeError || data?.success !== true) {
        reportMutationError('revoke the deactivated associate devices', revokeError || new Error(data?.error || 'The secure device RPC did not confirm revocation.'));
        await fetchData();
        return;
      }
    }
    await fetchData();
  };

  const deleteAssociate = async (id, name) => {
    if (window.confirm(`Permanently delete associate ${name}?\nAll access will be revoked immediately.`)) {
      const { error } = await supabase.from('associates').delete().eq('id', id);
      if (!error) await fetchData();
      else reportMutationError('delete the associate', error);
    }
  };

  const handleSaveLead = async (e) => {
    e.preventDefault();
    const leadPayload = {
      name: leadForm.name,
      phone: leadForm.phone,
      project: leadForm.project,
      budget: leadForm.budget,
      status: leadForm.status
    };
    if (editingLead) {
      const { error } = await supabase.from('leads').update(leadPayload).eq('id', editingLead.id);
      if (!error) {
        setEditingLead(null);
        setShowAddLead(false);
        showToast('success', 'Lead updated successfully.');
        await fetchData();
      } else {
        reportMutationError('update the lead', error);
      }
    } else {
      const { error } = await supabase.from('leads').insert([{
        ...leadPayload,
        associate_id: currentUser?.associate_id || 'ADMIN'
      }]);
      if (!error) {
        setLeadForm({ name: '', phone: '', project: 'BMS Royal City, Jagatpura', budget: '', status: 'New Lead' });
        setShowAddLead(false);
        showToast('success', 'Lead saved successfully.');
        void logAssociateActivity(currentUser, 'LEAD_ADD');
        await fetchData();
      } else {
        reportMutationError('save the lead', error);
      }
    }
  };

  const deleteLead = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete lead "${name}" from the database?`)) {
      const { error } = await supabase.from('leads').delete().eq('id', id);
      if (!error) await fetchData();
      else reportMutationError('delete the lead', error);
    }
  };

  const handleSaveVisit = async (e) => {
    e.preventDefault();
    if (currentUser.role === 'associate' && editingVisit && editingVisit.status !== 'Pending Office Verification') {
      alert('Only visits awaiting office verification can be edited.');
      return;
    }
    if (editingVisit) {
      const { error } = await supabase.from('site_visits').update({
        client: visitForm.client,
        project: visitForm.project,
        visit_date: visitForm.date,
        visit_time: visitForm.time,
        vehicle: visitForm.vehicle
      }).eq('id', editingVisit.id);
      if (!error) {
        setEditingVisit(null);
        setShowAddVisit(false);
        await fetchData();
      } else {
        reportMutationError('update the site visit', error);
      }
    } else {
      const { error } = await supabase.from('site_visits').insert([{
        client: visitForm.client,
        project: visitForm.project,
        visit_date: visitForm.date,
        visit_time: visitForm.time,
        vehicle: visitForm.vehicle,
        associate_id: currentUser?.associate_id || 'ADMIN',
        status: 'Pending Office Verification'
      }]);
      if (!error) {
        setVisitForm({ client: '', project: 'BMS Royal City, Jagatpura', date: '', time: '11:00 AM', vehicle: 'Cab Requested from BMS Office' });
        setShowAddVisit(false);
        void logAssociateActivity(currentUser, 'VISIT_BOOK');
        await fetchData();
      } else {
        reportMutationError('book the site visit', error);
      }
    }
  };

  const updateVisitStatus = async (id, status) => {
    if (currentUser?.role !== 'admin') return;
    const { error } = await supabase.from('site_visits').update({ status }).eq('id', id);
    if (!error) await fetchData();
    else reportMutationError('update the site visit status', error);
  };

  const approveVisitWithCab = async (e) => {
    e.preventDefault();
    if (!visitApproval || currentUser?.role !== 'admin') return;
    const cabDetails = `Driver: ${cabForm.driver_name} | Phone: ${cabForm.driver_phone} | Vehicle: ${cabForm.vehicle_number.trim().toUpperCase()}${cabForm.notes ? ` | Notes: ${cabForm.notes}` : ''}`;
    const { error } = await supabase.from('site_visits').update({
      status: 'Approved',
      vehicle: cabDetails
    }).eq('id', visitApproval.id);
    if (!error) {
      setVisitApproval(null);
      setCabForm({ driver_name: '', driver_phone: '', vehicle_number: '', notes: '' });
      showToast('success', `Cab assigned to ${visitApproval.client}'s visit.`);
      await fetchData();
    } else {
      reportMutationError('approve the site visit', error);
    }
  };

  const deleteVisit = async (id, client) => {
    if (window.confirm(`Delete site visit for "${client}"?`)) {
      const { error } = await supabase.from('site_visits').delete().eq('id', id);
      if (!error) await fetchData();
      else reportMutationError('delete the site visit', error);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    const messagePayload = {
      sender: 'Admin HQ',
      recipient_id: msgForm.recipient_id,
      title: msgForm.title.trim(),
      message: msgForm.message.trim()
    };
    const result = editingAdminMessage
      ? await supabase.from('messages').update(messagePayload).eq('id', editingAdminMessage.id)
      : await supabase.from('messages').insert([messagePayload]);
    const { error } = result;
    if (!error) {
      alert(editingAdminMessage ? 'Admin HQ message updated successfully.' : 'Direct message broadcasted to associate inbox successfully!');
      setMsgForm({ recipient_id: 'ALL', title: '', message: '' });
      setEditingAdminMessage(null);
      setShowMsgModal(false);
      await fetchData();
    } else {
      reportMutationError('save the Admin HQ message', error);
    }
  };

  const handleSubmitSupportTicket = async (e) => {
    e.preventDefault();
    if (currentUser?.role !== 'associate' || isSubmittingInquiry) return;
    const title = supportForm.title.trim();
    const message = supportForm.message.trim();
    if (!title) return;
    if (!message && !supportAttachment && !existingSupportAttachmentUrl) {
      showToast('warning', 'Add a message or attach a file before submitting the inquiry.');
      return;
    }
    if (editingTicket && editingTicket.status !== 'PENDING') return;
    if (supportAttachment?.size > MAX_INQUIRY_ATTACHMENT_SIZE) {
      showToast('warning', 'File exceeds the 25 MB limit. Choose a smaller attachment.');
      return;
    }

    setIsSubmittingInquiry(true);
    let uploadedAttachmentUrl = null;
    let uploadedAttachmentPath = null;
    try {
      if (supportAttachment) {
        const objectPath = `inquiries/${crypto.randomUUID()}-${getSafeAttachmentName(supportAttachment.name)}`;
        try {
          const { error: uploadError } = await supabase.storage
            .from(MESSAGE_ATTACHMENT_BUCKET)
            .upload(objectPath, supportAttachment, { upsert: false });
          if (uploadError) throw uploadError;
          uploadedAttachmentPath = objectPath;
          uploadedAttachmentUrl = supabase.storage.from(MESSAGE_ATTACHMENT_BUCKET).getPublicUrl(objectPath).data.publicUrl;
        } catch (uploadError) {
          console.warn('Inquiry attachment could not be uploaded; submitting the text inquiry without it.', uploadError);
          showToast('warning', 'Attachment upload is unavailable. Your inquiry will be sent without the file.');
        }
      }

      const inquiryPayload = {
        sender: currentUser.name,
        recipient_id: 'Admin HQ',
        title,
        message,
        category: `Inquiry: ${supportForm.category}`,
        attachment_url: uploadedAttachmentUrl || existingSupportAttachmentUrl,
        status: 'pending_review'
      };
      if (!inquiryPayload.attachment_url) inquiryPayload.attachment_url = null;

      const result = editingTicket
        ? await supabase.from('messages').update(inquiryPayload)
          .eq('id', editingTicket.id)
          .eq('sender', currentUser.name)
          .eq('recipient_id', 'Admin HQ')
          .eq('status', 'pending_review')
          .select('id').maybeSingle()
        : await supabase.from('messages').insert([inquiryPayload]);
      if (result.error) throw result.error;
      if (editingTicket && !result.data) throw new Error('This pending inquiry could not be found to update.');

      setSupportForm({ title: '', message: '', category: 'General' });
      setSupportAttachment(null);
      setExistingSupportAttachmentUrl(null);
      setSupportAttachmentPreview(null);
      setEditingTicket(null);
      setShowSupportForm(false);
      showToast('success', 'Inquiry submitted successfully.');
      showToast('warning', 'Your inquiry is now awaiting Admin HQ review.');
      if (!editingTicket) void logAssociateActivity(currentUser, 'INQUIRY');
      await fetchData();
    } catch (error) {
      console.error('Unable to save associate inquiry.', error);
      if (uploadedAttachmentPath) {
        try {
          const { error: cleanupError } = await supabase.storage
            .from(MESSAGE_ATTACHMENT_BUCKET)
            .remove([uploadedAttachmentPath]);
          if (cleanupError) console.error('Unable to clean up the failed inquiry attachment upload.', cleanupError);
        } catch (cleanupError) {
          console.error('Unable to clean up the failed inquiry attachment upload.', cleanupError);
        }
      }
      reportMutationError('submit your inquiry', error);
    } finally {
      setIsSubmittingInquiry(false);
    }
  };

  const withdrawSupportTicket = async (ticket) => {
    if (parseSupportTicket(ticket)?.status !== 'PENDING'
      || ![currentUser?.name, currentUser?.associate_id].includes(ticket.sender)) return;
    if (!window.confirm('Permanently withdraw this inquiry from the review queue?')) return;
    let query = supabase.from('messages').delete().eq('id', ticket.id).eq('sender', ticket.sender);
    query = ticket.recipient_id === 'Admin HQ'
      ? query.eq('recipient_id', 'Admin HQ').eq('status', 'pending_review')
      : query.eq('recipient_id', 'ADMIN');
    const { error } = await query;
    if (!error) await fetchData();
    else reportMutationError('withdraw this inquiry', error);
  };

  const sendTicketReply = async (ticket) => {
    const reply = window.prompt(`Reply as Admin HQ to inquiry "${ticket.subject}":`);
    if (!reply?.trim()) return;
    const { error: replyError } = await supabase.from('messages').insert([{
      sender: 'Admin HQ',
      recipient_id: ticket.sender,
      title: `[BMS-REPLY:${ticket.ticketId}] ${ticket.subject}`,
      message: reply.trim(),
      category: 'Reply'
    }]);
    if (replyError) {
      reportMutationError('send the Admin HQ reply', replyError);
      return;
    }
    const resolution = ticket.recipient_id === 'Admin HQ'
      ? await supabase.from('messages').update({ status: 'resolved' })
        .eq('id', ticket.id).eq('recipient_id', 'Admin HQ').eq('status', 'pending_review')
        .select('id').maybeSingle()
      : await supabase.from('messages').update({ title: `[BMS-TICKET:${ticket.ticketId}:RESOLVED] ${ticket.subject}` })
        .eq('id', ticket.id).eq('recipient_id', 'ADMIN')
        .select('id').maybeSingle();
    const { error } = resolution;
    if (error || !resolution.data) {
      if (error) reportMutationError('mark the inquiry resolved', error);
      else alert('The reply was sent, but the inquiry was not found to mark as resolved.');
      await fetchData();
      return;
    }
    await fetchData();
  };

  const deleteInboxMessage = async (message) => {
    if (!window.confirm('Permanently delete this message or inquiry? This action cannot be undone.')) return;
    const { error } = await supabase.from('messages').delete().eq('id', message.id);
    if (error) {
      reportMutationError('delete this message', error);
      return;
    }
    await fetchData();
  };

  const editAdminMessage = (message) => {
    setEditingAdminMessage(message);
    setMsgForm({ recipient_id: message.recipient_id, title: message.title || '', message: message.message || '' });
    setShowMsgModal(true);
  };

  const revokeAssociateDevices = async (associate) => {
    if (!window.confirm(`Revoke all active devices and force ${associate.name} to sign in again?`)) return;
    const { error: timestampError } = await supabase.from('associates')
      .update({ force_logout_at: new Date().toISOString() })
      .eq('associate_id', associate.associate_id);
    if (timestampError) {
      reportMutationError('mark the associate session for force logout', timestampError);
      return;
    }
    const { data, error } = await supabase.rpc('revoke_associate_devices', {
      p_associate_id: associate.associate_id
    });
    if (error || data?.success !== true) {
      reportMutationError('revoke the associate devices', error || new Error(data?.error || 'The secure device RPC rejected the request.'));
      await fetchData();
      return;
    }
    await fetchData();
    alert(`All registered devices revoked for ${associate.name}.`);
  };

  const restoreAssociateStreak = async (associate) => {
    const reason = window.prompt(`Official waiver reason for restoring ${associate.name}'s streak:`);
    if (!reason?.trim()) return;
    const { data, error } = await supabase.rpc('restore_associate_streak', {
      p_associate_id: associate.associate_id,
      p_reason: reason.trim()
    });
    if (error || data === false || data?.success === false) {
      reportMutationError('restore the associate streak', error || new Error(data?.error || 'The streak RPC rejected the request.'));
      return;
    }
    await fetchData();
    showToast('success', 'Associate streak restored with an official waiver record.');
  };

  const handleSaveAnnouncement = async (e) => {
    e.preventDefault();
    if (editingAnnouncement) {
      const { error } = await supabase.from('announcements').update(announcementForm).eq('id', editingAnnouncement.id);
      if (!error) {
        setEditingAnnouncement(null);
        setShowAnnouncementModal(false);
        await fetchData();
      } else {
        reportMutationError('update the announcement', error);
      }
    } else {
      const { error } = await supabase.from('announcements').insert([announcementForm]);
      if (!error) {
        setAnnouncementForm({ title: '', description: '', tag: 'General' });
        setShowAnnouncementModal(false);
        await fetchData();
      } else {
        reportMutationError('publish the announcement', error);
      }
    }
  };

  const deleteAnnouncement = async (id) => {
    if (window.confirm('Delete this company announcement?')) {
      const { error } = await supabase.from('announcements').delete().eq('id', id);
      if (!error) await fetchData();
      else reportMutationError('delete the announcement', error);
    }
  };

  const handleRequestPhotoUpdate = async (e) => {
    e.preventDefault();
    if (!newPhotoInput) return;
    const { error } = await supabase.from('associates').update({ pending_photo_url: newPhotoInput }).eq('id', currentUser.id);
    if (!error) {
      alert('Photo submitted for Admin Security Approval. Admin will inspect and verify.');
      setShowPhotoUploadModal(false);
      setNewPhotoInput('');
      await fetchData();
    } else {
      reportMutationError('submit your photo for approval', error);
    }
  };

  const handleApprovePhoto = async (assocId, newUrl) => {
    const { error } = await supabase.from('associates').update({ photo_url: newUrl, pending_photo_url: null }).eq('id', assocId);
    if (!error) {
      alert('Photo Approved Successfully!');
      await fetchData();
    } else {
      reportMutationError('approve the associate photo', error);
    }
  };

  const handleRejectPhoto = async (assocId) => {
    const { error } = await supabase.from('associates').update({ pending_photo_url: null }).eq('id', assocId);
    if (!error) {
      alert('Photo Rejected.');
      await fetchData();
    } else {
      reportMutationError('reject the associate photo', error);
    }
  };

  const handleExportData = () => {
    const isFiltered = currentUser.role === 'associate';
    const targetLeads = isFiltered ? leads.filter(l => l.associate_id === currentUser.associate_id) : leads;
    const targetVisits = isFiltered ? visits.filter(v => v.associate_id === currentUser.associate_id) : visits;

    const escapeCsv = (value) => {
      const text = String(value ?? '');
      const firstNonWhitespace = text.trimStart()[0];
      const safeText = ['=', '+', '-', '@'].includes(firstNonWhitespace) ? `'${text}` : text;
      return `"${safeText.replaceAll('"', '""')}"`;
    };
    const rows = [
      ['Category', 'Name/Client', 'Phone', 'Project', 'Budget/Time', 'Status', 'Associate', 'Date'],
      ...targetLeads.map(lead => ['Lead', lead.name, lead.phone, lead.project, lead.budget, lead.status, lead.associate_id, lead.created_at]),
      ...targetVisits.map(visit => ['Visit', visit.client, '', visit.project, visit.visit_time, visit.status, visit.associate_id, visit.visit_date])
    ];
    const csvContent = `data:text/csv;charset=utf-8,${encodeURIComponent(rows.map(row => row.map(escapeCsv).join(',')).join('\r\n'))}`;

    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", csvContent);
    downloadAnchor.setAttribute("download", `BMS_Data_${currentUser.role}_${getTodayKey()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const myLeads = leads;
  const myVisits = visits;
  const upcomingVisits = myVisits
    .filter(visit => visit.visit_date >= getTodayKey())
    .sort((a, b) => a.visit_date.localeCompare(b.visit_date));
  const myInbox = currentUser?.role === 'admin'
    ? messages
    : messages.filter(m => m.recipient_id === 'ALL' || m.recipient_id === currentUser?.associate_id || m.recipient_id === currentUser?.name || m.sender === currentUser?.associate_id || m.sender === currentUser?.name);
  const supportTickets = messages
    .map(message => ({ ...message, ticket: parseSupportTicket(message) }))
    .filter(message => message.ticket && ['ADMIN', 'Admin HQ'].includes(message.recipient_id));
  const associateSupportTickets = supportTickets.filter(message => (
    message.sender === currentUser?.name || message.sender === currentUser?.associate_id
  ));
  const pendingInquiryCount = supportTickets.filter(message => message.ticket.status === 'PENDING').length;
  const pendingVisitApprovalCount = myVisits.filter(visit => visit.status === 'Pending Office Verification').length;
  const pendingPhotos = associates.filter(a => a.pending_photo_url);
  const monthlyRate = loanRate / 1200;
  const loanMonths = loanTenure * 12;
  const monthlyEmi = monthlyRate === 0 ? loanPrincipal / loanMonths : loanPrincipal * monthlyRate * ((1 + monthlyRate) ** loanMonths) / (((1 + monthlyRate) ** loanMonths) - 1);
  const totalPayable = monthlyEmi * loanMonths;
  const plotPlcRate = Number(plotPlc.corner) * 0.10 + Number(plotPlc.wideRoad) * 0.05 + Number(plotPlc.parkFacing) * 0.05;
  const plotBasePrice = plotGaj * plotRate;
  const plotTotalPrice = plotBasePrice * (1 + plotPlcRate);

  const saveLibraryItem = async (e) => {
    e.preventDefault();
    const payload = {
      title: libraryForm.title.trim(),
      category: libraryForm.category,
      url: libraryForm.url.trim(),
      latitude: libraryForm.latitude || null,
      longitude: libraryForm.longitude || null
    };
    const result = editingLibraryItem
      ? await supabase.from('library_items').update(payload).eq('id', editingLibraryItem.id)
      : await supabase.from('library_items').insert([payload]);
    if (!result.error) {
      setLibraryForm({ title: '', category: 'Brochure', url: '', latitude: '', longitude: '' });
      setEditingLibraryItem(null);
      setShowLibraryForm(false);
      await fetchData();
    } else {
      reportMutationError('save the library item', result.error);
    }
  };

  const deleteLibraryItem = async (item) => {
    if (!window.confirm(`Delete ${item.title} from the library?`)) return;
    const { error } = await supabase.from('library_items').delete().eq('id', item.id);
    if (error) reportMutationError('delete the library item', error);
    else await fetchData();
  };

  const portalAudioElements = (
    <>
      <audio
        ref={ambientAudioRef}
        className="bms-ambient-audio"
        src={AMBIENT_PIANO.src}
        preload="metadata"
        loop
        onPlay={() => setIsAmbiencePlaying(true)}
        onPause={() => setIsAmbiencePlaying(false)}
        onError={(event) => console.warn('The peaceful piano track could not be loaded.', event.currentTarget.error)}
      />
      <audio
        ref={toastChimeRef}
        className="bms-ambient-audio"
        src={TOAST_CHIME_URL}
        preload="none"
        onError={(event) => console.warn('The public-domain notification chime could not be loaded.', event.currentTarget.error)}
      />
    </>
  );

  // -------------------------------------------------------------
  // LOGIN SCREEN (STRICT LIGHT THEME)
  // -------------------------------------------------------------
  if (isValidatingSession) {
    return (
      <>
        {portalAudioElements}
        <div className="portal-theme-light login-wrapper">
          <div className="login-card">
            <p role="status" aria-live="polite">Verifying your secure session…</p>
            <button type="button" className="btn-outline" onClick={handleLogout}>Clear saved session and show login</button>
          </div>
        </div>
      </>
    );
  }

  if (!currentUser) {
    return (
      <>
        {portalAudioElements}
        <div className="portal-theme-light login-wrapper">
          <div className="login-card">
                    <div className="login-header">
            {/* Official BMS Real Estates Company Logo */}
            <div className="bms-official-logo-card">
              <img
                src="/logo.png"
                alt="BMS Real Estates Logo"
                className="bms-official-logo-img"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/Logo.jpeg';
                }}
              />
            </div>
            <h1 className="brand-luxury-title">BMS REAL ESTATES</h1>
            <div className="brand-gold-line"></div>
            <p className="portal-sub">BEYOND THE MODERN STANDARDS • JAIPUR</p>
            <p className="portal-sub-desc">Enterprise Associate & Executive Governance Portal</p>
            <div className="login-clock-wrap"><LiveIndiaClock /></div>
          </div>

          <div className="login-tab-bar">
            <button type="button" className={`tab-btn ${loginRole === 'associate' ? 'active' : ''}`} onClick={() => { setLoginRole('associate'); setLoginError(supabaseConfigError); setHumanVerified(false); }}>Associate Login</button>
            <button type="button" className={`tab-btn ${loginRole === 'admin' ? 'active' : ''}`} onClick={() => { setLoginRole('admin'); setLoginError(supabaseConfigError); setHumanVerified(false); }}>Admin Portal</button>
          </div>
          {isLoginLockedOut && (
            <p className="login-lockout-banner" role="alert" aria-live="assertive">
              🚨 Security Lockout: 5 failed attempts detected. Login blocked for {String(Math.floor(lockoutRemainingMs / 60000)).padStart(2, '0')}:{String(Math.floor((lockoutRemainingMs % 60000) / 1000)).padStart(2, '0')} to prevent brute-force attacks.
            </p>
          )}

          {loginRole === 'associate' ? (
            <form className="login-form" onSubmit={handleAssociateLogin}>
              <div>
                <label>Associate Code or Registered Mobile *</label>
                <input type="text" placeholder="e.g. BMS-8421 or 9829012345" value={loginId} onChange={e => setLoginId(e.target.value)} required />
              </div>
              <div>
                <label>Password *</label>
                <div className="password-input-wrapper">
        <input type={showPassword ? "text" : "password"} placeholder="Enter password" value={loginPass} onChange={e => setLoginPass(e.target.value)} required />
        <button
          type="button"
          className="btn-toggle-eye"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex="-1"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
              </div>
              <p className="login-notice">🔒 Security Policy: Public registration is closed. New associates are manually created and authorized by BMS Head Office.</p>
              <HumanVerificationShield key={loginRole} onVerified={setHumanVerified} />
              {loginError && <p className="login-error" role="alert">{loginError}</p>}
              <button type="submit" className="btn-primary full" disabled={!supabaseConfigured || isLoginSubmitting || !humanVerified || isLoginLockedOut}>{isLoginSubmitting ? 'Signing in…' : 'Sign In to Associate Dashboard'}</button>
            </form>
          ) : (
            <form className="login-form" onSubmit={handleAdminLogin}>
              <div>
                <label>Master Admin Security Password *</label>
                <div className="password-input-wrapper">
        <input type={showPassword ? "text" : "password"} placeholder="Enter Master Admin Key" value={adminPass} onChange={e => setAdminPass(e.target.value)} required />
        <button
          type="button"
          className="btn-toggle-eye"
          onClick={() => setShowPassword(!showPassword)}
          tabIndex="-1"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>
              </div>
              <p className="login-notice">Restricted Area: Access granted only to authorized BMS Real Estates directors and executives.</p>
              <HumanVerificationShield key={loginRole} onVerified={setHumanVerified} />
              {loginError && <p className="login-error" role="alert">{loginError}</p>}
              <button type="submit" className="btn-primary full" disabled={!supabaseConfigured || isLoginSubmitting || !humanVerified || isLoginLockedOut}>{isLoginSubmitting ? 'Verifying…' : 'Unlock Admin HQ Portal'}</button>
            </form>
          )}
        </div>
      </div>
      </>
    );
  }

  // -------------------------------------------------------------
  // LOGGED-IN PORTAL (STRICT LIGHT THEME, UNIVERSAL RESPONSIVENESS)
  // -------------------------------------------------------------
  return (
    <>
    {portalAudioElements}
    <div className="portal-theme-light bms-container">
            {/* Top Header */}
      {/* Top Header with Official Company Logo */}
      {/* Top Header with Official Company Logo */}
      {/* Top Header with Official Company Logo */}
            {/* Top Header with Official Company Logo */}
      <header className="bms-header">
        <div className="header-left">
          <div className="bms-header-logo-card">
            <img
              src="/logo.png"
              alt="BMS Logo"
              className="bms-header-logo-img"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/Logo.jpeg';
              }}
            />
          </div>
          <div>
            <h1 className="brand-title">BMS REAL ESTATES</h1>
            <p className="brand-subtitle">{currentUser.role === 'admin' ? '🛡️ Super Admin Control HQ • Master Governance' : `🧑💼 Associate Portal • ${currentUser.name}`}</p>
          </div>
        </div>
        <div className="header-right">
          {currentUser.role === 'associate' && (
            <div className="streak-header-pill" title="Daily login required!">
              <Flame size={16} className="streak-flame" />
              <span>{loginStreak} Days Streak</span>
            </div>
          )}
          <LiveIndiaClock />
          <div className="ambient-player" aria-label="Background music player">
            <button
              type="button"
              className={`ambience-toggle ${isAmbiencePlaying ? 'is-playing' : ''}`}
              onClick={() => void toggleAmbientAudio()}
              aria-pressed={isAmbiencePlaying}
              title={isAmbiencePlaying ? 'Mute peaceful piano' : 'Play peaceful piano'}
            >
              {isAmbiencePlaying
                ? <>Playing: <Volume2 size={15} /><span>Peaceful Piano</span></>
                : <><VolumeX size={15} /><span>Piano Muted</span></>}
            </button>
          </div>
          <div className="user-profile-pill" onClick={() => currentUser.photo_url && setZoomPhotoUrl(currentUser.photo_url)}>
            <img src={currentUser.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"} alt="Avatar" className="avatar-img" />
            <div className="user-text">
              <span className="user-name">{currentUser.name}</span>
              <span className="user-id">{currentUser.role === 'admin' ? 'SUPER ADMIN' : currentUser.associate_id}</span>
            </div>
          </div>
          <button className="btn-export" onClick={handleExportData} title="Download leads and site visits as CSV"><Download size={15} /> <span>Export</span></button>
          <button className="btn-logout" onClick={handleLogout} title="Logout"><LogOut size={15} /> <span>Logout</span></button>
        </div>
      </header>

      {/* Navigation Bar */}
      <nav className="bms-nav">
        <div className="nav-items">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: Building2 },
            currentUser.role === 'admin' ? { id: 'associates', label: 'Associate Team', icon: Users, badge: associates.length } : null,
            { id: 'leads', label: currentUser.role === 'admin' ? 'All Leads' : 'My Leads', icon: Users, badge: myLeads.length },
            { id: 'visits', label: 'Site Visits', icon: Calendar, badge: currentUser.role === 'admin' ? pendingVisitApprovalCount : myVisits.length },
            { id: 'inbox', label: currentUser.role === 'admin' ? 'Message Box' : 'My Inbox', icon: MessageSquare, badge: currentUser.role === 'admin' ? pendingInquiryCount : myInbox.length },
            { id: 'calculators', label: 'Calculators', icon: Calculator },
            { id: 'library', label: 'Library & Site Plans', icon: BookOpen, badge: libraryItems.length },
            { id: 'commission', label: 'Commission Slabs', icon: Award },
            { id: 'announcements', label: 'Announcements', icon: Bell, badge: announcements.length },
            currentUser.role === 'associate' ? { id: 'profile', label: 'My Profile', icon: Camera } : null,
          ].filter(Boolean).map(tab => {
            const Icon = tab.icon;
            return (
              <button key={tab.id} className={`nav-btn ${activeTab === tab.id ? 'active' : ''}`} onClick={() => setActiveTab(tab.id)}>
                <Icon size={18} />
                <span>{tab.label}</span>
                {tab.badge !== undefined && <span className="nav-badge">{tab.badge}</span>}
              </button>
            );
          })}
        </div>
      </nav>

      <main className="bms-content">
        {portalDataError && <div className="portal-error-alert" role="alert">{portalDataError}</div>}
        {currentUser.role === 'admin' && pendingPhotos.length > 0 && (
          <div className="approval-alert-card">
            <div className="alert-content">
              <AlertCircle size={24} className="gold-text" />
              <div>
                <strong>Security Alert: {pendingPhotos.length} Associate Photo(s) Awaiting Admin Inspection</strong>
                <p>Inspect zoomed profile photos before releasing them live on official associate profiles.</p>
              </div>
            </div>
            <button className="btn-primary" onClick={() => setActiveTab('associates')}>Review Photos</button>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <div className="view-grid">
            <div className="welcome-banner">
              <div>
                <div className="streak-badge-wrap">
                  <h2 style={{ color: "#0f172a", fontWeight: "800" }}>Namaste, {currentUser.name}! 👋</h2>
                  {currentUser.role === 'associate' && (
                    <span className="streak-pill">
                      <Flame size={15} className="streak-flame" /> {loginStreak} Days Active Streak
                    </span>
                  )}
                </div>
                <p className="banner-desc">
                  {currentUser.role === 'admin'
                    ? `Admin HQ Operations • Managing ${associates.length} Associates • Cloud Protected`
                    : `Active Associate Partner • Rank: ${currentUser.slab || 'Silver Partner'} (${currentUser.slab_rate || '2.5%'})`}
                </p>
                <div className="quote-box">
                  <Quote size={14} className="gold-text" />
                  <span><strong>{quote.hindi}</strong><br />“{quote.english}” — <em>{quote.author}</em></span>
                  <button className="text-link quote-shuffle" onClick={shuffleQuote} title="New Quote">New Quote</button>
                </div>
              </div>

              <div className="quick-action-buttons">
                {currentUser.role === 'admin' ? (
                  <>
                    <button className="btn-primary" onClick={() => {
                      setEditingAssociate(null);
                      setAssocForm({ name: '', phone: '', email: '', password: '', slab: 'Bronze Associate', slab_rate: '2.0%' });
                      setActiveTab('associates');
                      setShowCreateAssociate(true);
                    }}>
                      <UserPlus size={16} /> Add Associate
                    </button>
                    <button className="btn-secondary" onClick={() => setShowMsgModal(true)}>
                      <Send size={16} /> Broadcast Msg
                    </button>
                  </>
                ) : (
                  <>
                    <button className="btn-primary" onClick={() => {
                      setEditingLead(null);
                      setLeadForm({ name: '', phone: '', project: 'BMS Royal City, Jagatpura', budget: '', status: 'New Lead' });
                      setActiveTab('leads');
                      setShowAddLead(true);
                    }}><Plus size={16} /> Add Lead</button>
                    <button className="btn-secondary" onClick={() => {
                      setEditingVisit(null);
                      setVisitForm({ client: '', project: 'BMS Royal City, Jagatpura', date: '', time: '11:00 AM', vehicle: 'Cab Requested from BMS Office' });
                      setActiveTab('visits');
                      setShowAddVisit(true);
                    }}><Calendar size={16} /> Schedule Visit</button>
                  </>
                )}
              </div>
            </div>

            <div className="metrics-row">
              <div className="metric-card gold-border">
                <div className="metric-header">
                  <span>{currentUser.role === 'admin' ? 'Total Portfolio Volume' : 'My Commission'}</span>
                  <DollarSign className="metric-icon gold" />
                </div>
                <h3>{currentUser.role === 'admin' ? '₹ 4.85 Crore' : currentUser.earned_commission || '₹ 0'}</h3>
                <span className="metric-sub">{currentUser.role === 'admin' ? 'Active Real Estate Portfolio Across Jaipur Projects' : 'Reported commission'}</span>
              </div>
              <div className="metric-card">
                <div className="metric-header"><span>{currentUser.role === 'admin' ? 'Total Leads' : 'My Leads'}</span><Users className="metric-icon blue" /></div>
                <h3>{myLeads.length}</h3>
                <span className="metric-sub">Synced in Cloud</span>
              </div>
              <div className="metric-card">
                <div className="metric-header"><span>Site Visits</span><Calendar className="metric-icon green" /></div>
                <h3>{myVisits.length}</h3>
                <span className="metric-sub">{myVisits.filter(v => v.status === 'Approved').length} Approved</span>
              </div>
              <div className="metric-card">
                <div className="metric-header"><span>Slab Tier</span><TrendingUp className="metric-icon purple" /></div>
                <h3>{currentUser.role === 'admin' ? `${associates.length} Associates` : currentUser.slab_rate || '2.5%'}</h3>
                <span className="metric-sub">{currentUser.role === 'admin' ? 'Super Admin HQ' : currentUser.slab || 'Unassigned'}</span>
              </div>
            </div>

            <div className="two-column-grid">
              <div className="panel-card">
                <div className="panel-head">
                  <h3>Recent Customer Leads</h3>
                  <button className="text-link" onClick={() => setActiveTab('leads')}>View All</button>
                </div>
                <div className="list-stack">
                  {myLeads.slice(0, 3).map(l => (
                    <div key={l.id} className="list-item">
                      <div>
                        <strong>{l.name}</strong>
                        <p className="sub-detail">{l.project} • {l.budget}</p>
                      </div>
                      <span className={`status-pill ${l.status?.replace(/\s+/g, '-').toLowerCase()}`}>{l.status}</span>
                    </div>
                  ))}
                  {myLeads.length === 0 && <p className="sub-detail">No leads registered yet. Click "+ Add Lead".</p>}
                </div>
              </div>

              <div className="panel-card">
                <div className="panel-head">
                  <h3>Upcoming Property Visits</h3>
                  <button className="text-link" onClick={() => setActiveTab('visits')}>View All</button>
                </div>
                <div className="list-stack">
                  {upcomingVisits.slice(0, 3).map(v => (
                    <div key={v.id} className="list-item">
                      <div>
                        <strong>{v.client}</strong>
                        <p className="sub-detail">{v.project} • {v.visit_date} at {v.visit_time}</p>
                      </div>
                      <span className={`status-pill ${v.status?.toLowerCase()}`}>{v.status}</span>
                    </div>
                  ))}
                  {upcomingVisits.length === 0 && <p className="sub-detail">No upcoming visits scheduled. Click "Schedule Visit".</p>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ASSOCIATES MANAGEMENT (ADMIN HQ) */}
        {activeTab === 'associates' && currentUser.role === 'admin' && (
          <div className="section-container">
            <div className="section-header">
              <div>
                <h2>BMS Associate Team Control (Admin HQ)</h2>
                <p>Create associates, modify credentials & slabs, inspect zoomed photos, and manage active status.</p>
              </div>
              <button className="btn-primary" onClick={() => { setEditingAssociate(null); setAssocForm({ name: '', phone: '', email: '', password: '', slab: 'Bronze Associate', slab_rate: '2.0%' }); setShowCreateAssociate(true); }}>
                <UserPlus size={16} /> + Add New Associate
              </button>
            </div>

            <details className="activity-log-card">
              <summary>📋 Recent Activity &amp; Login Logs</summary>
              {activityLogsUnavailable ? (
                <p className="sub-detail activity-log-empty">Activity logs are not available yet. Check that the activity_logs table and its access policies are deployed.</p>
              ) : activityLogs.length === 0 ? (
                <p className="sub-detail activity-log-empty">No recent associate activity has been recorded.</p>
              ) : (
                <div className="table-wrapper activity-log-table">
                  <table className="bms-table">
                    <thead>
                      <tr><th>Associate</th><th>Action</th><th>Device</th><th>Indian Time (IST)</th></tr>
                    </thead>
                    <tbody>
                      {activityLogs.map(entry => (
                        <tr key={entry.id}>
                          <td><strong>{entry.associate_name || entry.associate_id || 'Associate'}</strong></td>
                          <td>{({ LOGIN: 'Login', LEAD_ADD: 'Added a lead', VISIT_BOOK: 'Booked a visit', INQUIRY: 'Submitted an inquiry' })[entry.action] || entry.action}</td>
                          <td>{entry.device || 'Unknown device'}</td>
                          <td>{formatISTDateTime(entry.created_at)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </details>

            {showCreateAssociate && (
              <form className="entry-form-card" onSubmit={handleSaveAssociate}>
                <h3>{editingAssociate ? `Edit Associate: ${editingAssociate.name} (${editingAssociate.associate_id})` : 'Create Verified Associate'}</h3>
                <div className="form-grid">
                  <div>
                    <label>Full Name *</label>
                    <input type="text" placeholder="e.g. Suresh Gehlot" value={assocForm.name} onChange={e => setAssocForm({ ...assocForm, name: e.target.value })} required />
                  </div>
                  <div>
                    <label>Mobile Number (Login ID) *</label>
                    <input type="tel" placeholder="e.g. 9829123456" value={assocForm.phone} onChange={e => setAssocForm({ ...assocForm, phone: e.target.value })} required />
                  </div>
                  <div>
                    <label>Email Address</label>
                    <input type="email" placeholder="e.g. suresh@gmail.com" value={assocForm.email} onChange={e => setAssocForm({ ...assocForm, email: e.target.value })} />
                  </div>
                  <div>
                    <label>{editingAssociate ? 'New Login Password (optional)' : 'Login Password *'}</label>
                    <input type="password" autoComplete="new-password" placeholder={editingAssociate ? 'Leave blank to keep current password' : 'Set a strong password'} value={assocForm.password} onChange={e => setAssocForm({ ...assocForm, password: e.target.value })} required={!editingAssociate} />
                  </div>
                  <div>
                    <label>Commission Slab Tier *</label>
                    <select value={assocForm.slab} onChange={e => {
                      const slab = e.target.value;
                      const rate = slab.includes('Bronze') ? '2.0%' : slab.includes('Silver') ? '2.5%' : slab.includes('Gold') ? '3.0%' : '3.5%';
                      setAssocForm({ ...assocForm, slab, slab_rate: rate });
                    }}>
                      <option value="Bronze Associate">Bronze Associate (2.0%)</option>
                      <option value="Silver Partner">Silver Partner (2.5%)</option>
                      <option value="Gold Partner">Gold Partner (3.0%)</option>
                      <option value="Platinum Partner">Platinum Partner (3.5%)</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">{editingAssociate ? 'Save Changes' : 'Generate Credentials & Save'}</button>
                  <button type="button" className="btn-outline" onClick={() => { setEditingAssociate(null); setShowCreateAssociate(false); }}>Cancel</button>
                </div>
              </form>
            )}

            <div className="table-wrapper">
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Code</th>
                    <th>Name & Mobile</th>
                    <th>Slab Tier</th>
                    <th>Active Streak</th>
                    <th>Status</th>
                    <th>Photo Inspection</th>
                    <th>Admin Controls</th>
                  </tr>
                </thead>
                <tbody>
                  {associates.map(a => (
                    <tr key={a.id}>
                      <td>
                        <img
                          src={a.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"}
                          alt={a.name}
                          className="table-avatar clickable"
                          onClick={() => setZoomPhotoUrl(a.photo_url)}
                          title="Click to Zoom Photo"
                        />
                      </td>
                      <td><strong>{a.associate_id}</strong></td>
                      <td>
                        <strong>{a.name}</strong>
                        <p className="sub-detail">{a.phone}</p>
                      </td>
                      <td>
                        <span className="badge-gold">{a.slab} ({a.slab_rate})</span>
                      </td>
                      <td>
                        <span className="streak-pill">
                          <Flame size={14} className="streak-flame" /> {a.streak || 7} Days
                        </span>
                      </td>
                      <td>
                        <span className={`status-pill ${a.status === 'active' ? 'site-visited' : 'cancelled'}`}>
                          {a.status === 'active' ? '✓ Active' : '✕ Deactivated'}
                        </span>
                        <div className={`associate-presence ${isAssociateOnline(a.last_seen) ? 'is-online' : 'is-offline'}`}>
                          {isAssociateOnline(a.last_seen) ? (
                            <span>🟢 Online</span>
                          ) : (
                            <>
                              <span>⚪ Offline</span>
                              <small>{getRelativeLastActive(a.last_seen)}</small>
                            </>
                          )}
                        </div>
                      </td>
                      <td>
                        {a.pending_photo_url ? (
                          <div className="pending-photo-box">
                            <span className="badge-warning">Update Submitted</span>
                            <div className="photo-review-actions">
                              <button className="btn-icon" onClick={() => setZoomPhotoUrl(a.pending_photo_url)} title="Inspect Zoomed Photo"><Eye size={14} /></button>
                              <button className="btn-action-small green" onClick={() => handleApprovePhoto(a.id, a.pending_photo_url)}>Approve</button>
                              <button className="btn-action-small red" onClick={() => handleRejectPhoto(a.id)}>Reject</button>
                            </div>
                          </div>
                        ) : (
                          <span className="sub-detail">No Pending Updates</span>
                        )}
                      </td>
                      <td>
                        <div className="table-actions">
                          <button
                            className="btn-action-small blue"
                            onClick={() => {
                              setEditingAssociate(a);
                              setAssocForm({ name: a.name, phone: a.phone, email: a.email || '', password: '', slab: a.slab?.replace(/\s+\([^)]*\)$/, '') || 'Bronze Associate', slab_rate: a.slab_rate });
                              setShowCreateAssociate(true);
                            }}
                            title="Edit Associate & Slab"
                          >
                            <Edit3 size={13} /> Edit
                          </button>
                          <button
                            className={`btn-action-small ${a.status === 'active' ? 'red' : 'green'}`}
                            onClick={() => toggleAssociateStatus(a)}
                          >
                            {a.status === 'active' ? 'Deactivate' : 'Activate'}
                          </button>
                          <button className="btn-action-small red" onClick={() => revokeAssociateDevices(a)} title="Revoke Devices & Force Logout">
                            <LogOut size={13} /> Revoke Devices
                          </button>
                          <button className="btn-action-small blue" onClick={() => restoreAssociateStreak(a)} title="Restore Streak">
                            <Flame size={13} /> Restore Streak
                          </button>
                          <button className="btn-action-small red" onClick={() => deleteAssociate(a.id, a.name)}>
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ASSOCIATE PROFILE & 30-DAY SELF EDIT */}
        {activeTab === 'profile' && currentUser.role === 'associate' && (
          <div className="section-container">
            <div className="section-header">
              <div>
                <h2>My Associate Profile</h2>
                <p>Your verified BMS credentials. Name & contact details can be self-corrected within 30 days of registration.</p>
              </div>
              {canAssociateEditSelf() ? (
                <button className="btn-primary" onClick={() => {
                  setSelfEditForm({ name: currentUser.name, phone: currentUser.phone, email: currentUser.email || '' });
                  setShowSelfEditModal(true);
                }}>
                  <Edit3 size={15} /> Edit My Details (30-Day Window Active)
                </button>
              ) : (
                <span className="badge-warning">
                  <Lock size={13} /> 30-Day Window Closed (Contact Admin to Change)
                </span>
              )}
            </div>

            <div className="profile-detail-card">
              <div className="profile-photo-col">
                <img
                  src={currentUser.photo_url || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=300"}
                  alt="Profile"
                  className="profile-photo-large clickable"
                  onClick={() => setZoomPhotoUrl(currentUser.photo_url)}
                  title="Click to Zoom Photo"
                />
                <button className="btn-secondary" onClick={() => setShowPhotoUploadModal(true)}>
                  <Camera size={15} /> Change Photo
                </button>
                {currentUser.pending_photo_url && (
                  <div className="pending-badge-notice">
                    <Clock size={14} /> Photo submitted — awaiting Admin Security Approval.
                  </div>
                )}
              </div>

              <div className="profile-info-col">
                <div className="info-row"><span>Full Name:</span> <strong>{currentUser.name}</strong></div>
                <div className="info-row"><span>Associate ID:</span> <strong>{currentUser.associate_id}</strong></div>
                <div className="info-row"><span>Mobile Number:</span> <strong>{currentUser.phone}</strong></div>
                <div className="info-row"><span>Email:</span> <strong>{currentUser.email || 'Not Provided'}</strong></div>
                <div className="info-row"><span>Commission Slab:</span> <strong className="gold-text">{currentUser.slab} ({currentUser.slab_rate})</strong></div>
                <div className="info-row"><span>Account Status:</span> <strong className="green-text">✓ Verified Active Associate</strong></div>
              </div>
            </div>

            {showSelfEditModal && (
              <form className="entry-form-card" onSubmit={handleSaveSelfEdit}>
                <h3>Self-Correct Personal Details (30-Day Window)</h3>
                <div className="form-grid">
                  <div>
                    <label>Full Name *</label>
                    <input type="text" value={selfEditForm.name} onChange={e => setSelfEditForm({ ...selfEditForm, name: e.target.value })} required />
                  </div>
                  <div>
                    <label>Mobile Number *</label>
                    <input type="tel" value={selfEditForm.phone} onChange={e => setSelfEditForm({ ...selfEditForm, phone: e.target.value })} required />
                  </div>
                  <div>
                    <label>Email Address</label>
                    <input type="email" value={selfEditForm.email} onChange={e => setSelfEditForm({ ...selfEditForm, email: e.target.value })} />
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Save My Details</button>
                  <button type="button" className="btn-outline" onClick={() => setShowSelfEditModal(false)}>Cancel</button>
                </div>
              </form>
            )}

            {showPhotoUploadModal && (
              <form className="entry-form-card" onSubmit={handleRequestPhotoUpdate}>
                <h3>Submit New Profile Photo for Admin Security Inspection</h3>
                <div style={{ margin: '1rem 0' }}>
                  <label>Choose an image from this device</label>
                  <input type="file" accept="image/*" onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > 4 * 1024 * 1024) {
                      showToast('warning', 'Choose a profile image smaller than 4 MB.');
                      e.target.value = '';
                      return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => setNewPhotoInput(String(reader.result || ''));
                    reader.readAsDataURL(file);
                  }} />
                </div>
                <div style={{ margin: '1rem 0' }}>
                  <label>Or paste a web image URL</label>
                  <input type="url" placeholder="https://example.com/photo.jpg" value={newPhotoInput.startsWith('data:') ? '' : newPhotoInput} onChange={e => setNewPhotoInput(e.target.value)} />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">Submit for Approval</button>
                  <button type="button" className="btn-outline" onClick={() => setShowPhotoUploadModal(false)}>Cancel</button>
                </div>
              </form>
            )}
          </div>
        )}

        {/* LEADS TAB (WITH EDIT & DELETE CONTROLS) */}
        {activeTab === 'leads' && (
          <div className="section-container">
            <div className="section-header">
              <div>
                <h2>{currentUser.role === 'admin' ? 'Company-wide Leads (Admin HQ Control)' : 'My Leads & Follow-ups'}</h2>
                <p>Synced with Mumbai Supabase database. Admin can edit or permanently delete leads.</p>
              </div>
              <button className="btn-primary" onClick={() => { setEditingLead(null); setLeadForm({ name: '', phone: '', project: 'BMS Royal City, Jagatpura', budget: '', status: 'New Lead' }); setShowAddLead(true); }}>
                <Plus size={16} /> Add New Lead
              </button>
            </div>

            {showAddLead && (
              <form className="entry-form-card" onSubmit={handleSaveLead}>
                <h3>{editingLead ? 'Edit Lead Details' : 'Register Customer Lead'}</h3>
                <div className="form-grid">
                  <div>
                    <label>Client Full Name *</label>
                    <input type="text" placeholder="e.g. Ramesh Patel" value={leadForm.name} onChange={e => setLeadForm({ ...leadForm, name: e.target.value })} required />
                  </div>
                  <div>
                    <label>Phone / WhatsApp *</label>
                    <input type="tel" placeholder="e.g. 9829012345" value={leadForm.phone} onChange={e => setLeadForm({ ...leadForm, phone: e.target.value })} required />
                  </div>
                  <div>
                    <label>Interested Project</label>
                    <select value={leadForm.project} onChange={e => setLeadForm({ ...leadForm, project: e.target.value })}>
                      <option>BMS Royal City, Jagatpura</option>
                      <option>BMS Greens, Ajmer Road</option>
                      <option>BMS Heights, Mansarovar</option>
                      <option>BMS Industrial Park</option>
                    </select>
                  </div>
                  <div>
                    <label>Estimated Budget</label>
                    <input type="text" placeholder="e.g. ₹ 40-50 Lakhs" value={leadForm.budget} onChange={e => setLeadForm({ ...leadForm, budget: e.target.value })} />
                  </div>
                  <div>
                    <label>Lead Status</label>
                    <select value={leadForm.status} onChange={e => setLeadForm({ ...leadForm, status: e.target.value })}>
                      <option>New Lead</option>
                      <option>Site Visited</option>
                      <option>Booking in Progress</option>
                      <option>Follow-up Call</option>
                      <option>Deal Closed</option>
                      <option>Lost / Dropped</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">{editingLead ? 'Update Lead' : 'Save to Database'}</button>
                  <button type="button" className="btn-outline" onClick={() => { setEditingLead(null); setShowAddLead(false); }}>Cancel</button>
                </div>
              </form>
            )}

            <div className="table-wrapper">
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>Customer Name</th>
                    <th>Phone / WhatsApp</th>
                    <th>Target Project</th>
                    <th>Budget</th>
                    <th>Status</th>
                    {currentUser.role === 'admin' && <th>Associate</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myLeads.map(lead => (
                    <tr key={lead.id}>
                      <td><strong>{lead.name}</strong></td>
                      <td>{lead.phone}</td>
                      <td>{lead.project}</td>
                      <td>{lead.budget}</td>
                      <td><span className={`status-pill ${lead.status?.replace(/\s+/g, '-').toLowerCase()}`}>{lead.status}</span></td>
                      {currentUser.role === 'admin' && <td><span className="badge-gold">{lead.associate_id || 'HQ'}</span></td>}
                      <td>
                        <div className="table-actions">
                          <a href={`tel:${lead.phone}`} className="btn-icon" title="Call"><Phone size={14} /></a>
                          <a href={`https://wa.me/${lead.phone?.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(`Hello ${lead.name}, regarding BMS Real Estates.`)}`} target="_blank" rel="noreferrer" className="btn-icon green" title="WhatsApp"><MessageSquare size={14} /></a>
                          <button className="btn-icon blue" onClick={() => { setEditingLead(lead); setLeadForm(lead); setShowAddLead(true); }} title="Edit Lead"><Edit3 size={14} /></button>
                          {currentUser.role === 'admin' && (
                            <button className="btn-icon red" onClick={() => deleteLead(lead.id, lead.name)} title="Delete Lead (Admin Only)"><Trash2 size={14} /></button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* VISITS TAB (WITH EDIT, STATUS & DELETE) */}
        {activeTab === 'visits' && (
          <div className="section-container">
            <div className="section-header">
              <div>
                <h2>Site / Property Visits Management</h2>
                <p>All associate bookings remain pending until the office verifies and assigns transport.</p>
              </div>
              <button className="btn-primary" onClick={() => { setEditingVisit(null); setVisitForm({ client: '', project: 'BMS Royal City, Jagatpura', date: '', time: '11:00 AM', vehicle: 'Cab Requested from BMS Office' }); setShowAddVisit(true); }}>
                <Calendar size={16} /> Book New Visit
              </button>
            </div>

            {showAddVisit && (
              <form className="entry-form-card" onSubmit={handleSaveVisit}>
                <h3>{editingVisit ? 'Edit Site Visit' : 'Schedule Site Visit'}</h3>
                <div className="form-grid">
                  <div>
                    <label>Client Name *</label>
                    <input type="text" placeholder="e.g. Anita Meena" value={visitForm.client} onChange={e => setVisitForm({ ...visitForm, client: e.target.value })} required />
                  </div>
                  <div>
                    <label>Project Location</label>
                    <select value={visitForm.project} onChange={e => setVisitForm({ ...visitForm, project: e.target.value })}>
                      <option>BMS Royal City, Jagatpura</option>
                      <option>BMS Greens, Ajmer Road</option>
                      <option>BMS Heights, Mansarovar</option>
                    </select>
                  </div>
                  <div>
                    <label>Visit Date *</label>
                    <input type="date" value={visitForm.date} onChange={e => setVisitForm({ ...visitForm, date: e.target.value })} required />
                  </div>
                  <div>
                    <label>Visit Time</label>
                    <input type="text" placeholder="e.g. 11:30 AM" value={visitForm.time} onChange={e => setVisitForm({ ...visitForm, time: e.target.value })} />
                  </div>
                  <div>
                    <label>Transport</label>
                    <select value={visitForm.vehicle} onChange={e => setVisitForm({ ...visitForm, vehicle: e.target.value })}>
                      <option>Cab Requested from BMS Office</option>
                      <option>Self Transport by Client</option>
                      <option>Associate Bringing Client</option>
                    </select>
                  </div>
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">{editingVisit ? 'Update Visit' : 'Save to Database'}</button>
                  <button type="button" className="btn-outline" onClick={() => { setEditingVisit(null); setShowAddVisit(false); }}>Cancel</button>
                </div>
              </form>
            )}

            <div className="table-wrapper">
              <table className="bms-table">
                <thead>
                  <tr>
                    <th>Client Name</th>
                    <th>Project</th>
                    <th>Date & Time</th>
                    <th>Transport</th>
                    <th>Status</th>
                    {currentUser.role === 'admin' && <th>Associate</th>}
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {myVisits.map(v => (
                    <tr key={v.id}>
                      <td><strong>{v.client}</strong></td>
                      <td>{v.project}</td>
                      <td>{v.visit_date} ({v.visit_time})</td>
                      <td>{v.vehicle}</td>
                      <td><span className={`status-pill ${v.status?.toLowerCase()}`}>{v.status}</span></td>
                      {currentUser.role === 'admin' && <td><span className="badge-gold">{v.associate_id || 'HQ'}</span></td>}
                      <td>
                        <div className="table-actions">
                          {currentUser.role === 'admin' && v.status !== 'Completed' && v.status !== 'Rejected / Flagged' && (
                            <>
                              {v.status === 'Pending Office Verification' && <button className="btn-action-small green" onClick={() => { setVisitApproval(v); setCabForm({ driver_name: '', driver_phone: '', vehicle_number: '', notes: '' }); }}>Approve & Assign Cab</button>}
                              {v.status === 'Approved' && <button className="btn-action-small green" onClick={() => updateVisitStatus(v.id, 'Completed')}>Mark Completed</button>}
                              <button className="btn-action-small red" onClick={() => updateVisitStatus(v.id, 'Rejected / Flagged')}>Reject / Flag</button>
                            </>
                          )}
                          {(currentUser.role === 'admin' || v.status === 'Pending Office Verification') && <button className="btn-icon blue" onClick={() => { setEditingVisit(v); setVisitForm({ client: v.client, project: v.project, date: v.visit_date, time: v.visit_time, vehicle: v.vehicle }); setShowAddVisit(true); }} title="Edit booking"><Edit3 size={13} /></button>}
                          {currentUser.role === 'admin' && <button className="btn-icon red" onClick={() => deleteVisit(v.id, v.client)} title="Delete"><Trash2 size={13} /></button>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {visitApproval && currentUser.role === 'admin' && (
              <div className="modal-backdrop" onClick={() => setVisitApproval(null)}>
                <form className="entry-form-card approval-modal" onSubmit={approveVisitWithCab} onClick={e => e.stopPropagation()}>
                  <h3>Approve & Assign Cab</h3>
                  <p className="sub-detail">{visitApproval.client} · {visitApproval.project} · {visitApproval.visit_date} at {visitApproval.visit_time}</p>
                  <div className="form-grid">
                    <div><label>Driver Name *</label><input value={cabForm.driver_name} onChange={e => setCabForm({ ...cabForm, driver_name: e.target.value })} required /></div>
                    <div><label>Driver Phone *</label><input type="tel" value={cabForm.driver_phone} onChange={e => setCabForm({ ...cabForm, driver_phone: e.target.value })} required /></div>
                    <div><label>Vehicle Number (Jaipur registration) *</label><input value={cabForm.vehicle_number} onChange={e => setCabForm({ ...cabForm, vehicle_number: e.target.value.toUpperCase() })} placeholder="RJ-14 AB 1234" pattern="RJ-14 ?[A-Z]{1,2} ?[0-9]{1,4}" title="Enter a Jaipur plate beginning RJ-14, e.g. RJ-14 AB 1234." required /></div>
                    <div><label>Office Notes</label><input value={cabForm.notes} onChange={e => setCabForm({ ...cabForm, notes: e.target.value })} /></div>
                  </div>
                  <div className="form-actions"><button className="btn-primary" type="submit">Approve Visit</button><button className="btn-outline" type="button" onClick={() => setVisitApproval(null)}>Cancel</button></div>
                </form>
              </div>
            )}
          </div>
        )}

        {/* INBOX & ADMIN DIRECT MESSAGE BOX */}
        {activeTab === 'inbox' && (
          <div className="section-container">
            <div className="section-header">
              <div>
                <h2>{currentUser.role === 'admin' ? 'Company Message Control & Inbox' : 'Official Associate Inbox'}</h2>
                <p>Official support requests remain in queue until reviewed and resolved by BMS.</p>
              </div>
              {currentUser.role === 'admin' && (
                <button className="btn-primary" onClick={() => setShowMsgModal(true)}>
                  <Send size={15} /> + Send Direct Message
                </button>
              )}
              {currentUser.role === 'associate' && <button className="btn-primary" onClick={() => { setEditingTicket(null); setSupportForm({ title: '', message: '', category: 'General' }); setSupportAttachment(null); setExistingSupportAttachmentUrl(null); setSupportAttachmentPreview(null); setShowSupportForm(true); }}><Plus size={15} /> New Inquiry</button>}
            </div>

            {currentUser.role === 'associate' && showSupportForm && (
              <form className="entry-form-card" onSubmit={handleSubmitSupportTicket}>
                <h3>{editingTicket ? 'Edit Inquiry' : 'Submit Inquiry to Admin HQ'}</h3>
                <div className="form-grid">
                  <div><label>Subject *</label><input value={supportForm.title} onChange={e => setSupportForm({ ...supportForm, title: e.target.value })} required /></div>
                  <div><label>Category</label><select value={supportForm.category} onChange={e => setSupportForm({ ...supportForm, category: e.target.value })}><option>General</option><option>Account</option><option>Commission</option><option>Site Visit</option><option>Technical</option><option>Other</option></select></div>
                  <div className="form-grid-full"><label>Inquiry message (optional when attaching a file)</label><textarea rows={4} value={supportForm.message} onChange={e => setSupportForm({ ...supportForm, message: e.target.value })} /></div>
                </div>
                <div className="inquiry-attachment-picker">
                  <label htmlFor="inquiry-attachment">Optional image or document (maximum 25 MB)</label>
                  <input id="inquiry-attachment" type="file" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv" onChange={e => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    if (file.size > MAX_INQUIRY_ATTACHMENT_SIZE) {
                      showToast('warning', 'File exceeds the 25 MB limit. Choose a smaller attachment.');
                      e.target.value = '';
                      return;
                    }
                    setSupportAttachment(file);
                    setExistingSupportAttachmentUrl(null);
                    setSupportAttachmentPreview(URL.createObjectURL(file));
                  }} />
                  {supportAttachmentPreview && (
                    <div className="inquiry-attachment-preview">
                      {supportAttachment?.type?.startsWith('image/') || isImageAttachment(supportAttachment?.name || existingSupportAttachmentUrl) ? (
                        <img src={supportAttachmentPreview} alt="Inquiry attachment preview" />
                      ) : (
                        <span><FileText size={24} /> {supportAttachment?.name || getAttachmentDisplayName(existingSupportAttachmentUrl)}</span>
                      )}
                      <button type="button" className="btn-outline" onClick={() => { setSupportAttachment(null); setExistingSupportAttachmentUrl(null); setSupportAttachmentPreview(null); const input = document.getElementById('inquiry-attachment'); if (input) input.value = ''; }}>Remove</button>
                    </div>
                  )}
                </div>
                <div className="form-actions"><button className="btn-primary" type="submit" disabled={isSubmittingInquiry}>{isSubmittingInquiry ? 'Submitting…' : editingTicket ? 'Save Changes' : 'Submit to Queue'}</button><button className="btn-outline" type="button" onClick={() => { setShowSupportForm(false); setSupportAttachment(null); setExistingSupportAttachmentUrl(null); setSupportAttachmentPreview(null); }}>Cancel</button></div>
              </form>
            )}

            {showMsgModal && currentUser.role === 'admin' && (
              <form className="entry-form-card" onSubmit={handleSendMessage}>
                <h3>{editingAdminMessage ? 'Edit Admin HQ Message' : 'Send Direct Message from Admin HQ'}</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <label>Select Recipient *</label>
                  <select value={msgForm.recipient_id} onChange={e => setMsgForm({ ...msgForm, recipient_id: e.target.value })}>
                    <option value="ALL">📢 All Associates (Broadcast)</option>
                    {associates.map(a => (
                      <option key={a.id} value={a.associate_id}>{a.name} ({a.associate_id})</option>
                    ))}
                  </select>
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label>Message Title *</label>
                  <input type="text" placeholder="e.g. Commission Credit / Urgent Meeting" value={msgForm.title} onChange={e => setMsgForm({ ...msgForm, title: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label>Message Content *</label>
                  <textarea rows={4} placeholder="Type your instruction or update..." value={msgForm.message} onChange={e => setMsgForm({ ...msgForm, message: e.target.value })} required />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">{editingAdminMessage ? 'Save Changes' : 'Send Message'}</button>
                  <button type="button" className="btn-outline" onClick={() => { setShowMsgModal(false); setEditingAdminMessage(null); setMsgForm({ recipient_id: 'ALL', title: '', message: '' }); }}>Cancel</button>
                </div>
              </form>
            )}

            {currentUser.role === 'admin' ? (
              <div className="announcements-stack">
                <h3>In Queue - Awaiting Review ({supportTickets.filter(item => item.ticket.status === 'PENDING').length})</h3>
                {supportTickets.filter(message => message.ticket.status === 'PENDING').map(message => (
                  <article className="announcement-item" key={message.id}>
                    <div className="announcement-meta"><span className="tag-pill blue-badge">{formatInquiryReference(message.ticket.ticketId)}</span><span className="status-pill pending">In Queue - Awaiting Review</span></div>
                    <p className="sub-detail">From {message.sender} · {message.ticket.category || message.category?.replace(/^Inquiry:\s*/, '') || 'Inquiry'}</p><h3>{message.ticket.subject}</h3>{message.message && <p>{message.message}</p>}
                    {message.attachment_url && (
                      <div className="inquiry-attachment-preview">
                        {isImageAttachment(message.attachment_url) ? (
                          <button type="button" className="attachment-thumbnail-button" onClick={() => setZoomPhotoUrl(message.attachment_url)} title="Open high-resolution inspection">
                            <img src={message.attachment_url} alt={`Attachment from ${message.sender}`} />
                          </button>
                        ) : (
                          <button type="button" className="attachment-document" onClick={() => setZoomPhotoUrl(message.attachment_url)}><FileText size={22} />{getAttachmentDisplayName(message.attachment_url)}</button>
                        )}
                        <a className="btn-icon" href={message.attachment_url} target="_blank" rel="noreferrer" aria-label="Open attachment in a new tab" title="View original"><ExternalLink size={15} /></a>
                      </div>
                    )}
                    <div className="form-actions"><button className="btn-secondary" onClick={() => sendTicketReply({ ...message, ...message.ticket })}><Send size={14} /> Reply as Admin HQ</button><button className="btn-icon red" title="Delete inquiry" aria-label="Delete inquiry" onClick={() => deleteInboxMessage(message)}><Trash2 size={14} /> 🗑️ Delete</button></div>
                  </article>
                ))}
                {supportTickets.filter(message => message.ticket.status === 'PENDING').length === 0 && <p className="sub-detail">No associate inquiries are waiting in the queue.</p>}
                {supportTickets.some(message => message.ticket.status === 'RESOLVED') && (
                  <>
                    <h3>Resolved Inquiries</h3>
                    {supportTickets.filter(message => message.ticket.status === 'RESOLVED').map(message => (
                      <article className="announcement-item" key={message.id}>
                        <div className="announcement-meta"><span className="tag-pill blue-badge">{formatInquiryReference(message.ticket.ticketId)}</span><span className="status-pill resolved">Resolved</span></div>
                        <p className="sub-detail">From {message.sender}</p><h3>{message.ticket.subject}</h3>{message.message && <p>{message.message}</p>}
                        {message.attachment_url && <div className="inquiry-attachment-preview">{isImageAttachment(message.attachment_url) ? <button type="button" className="attachment-thumbnail-button" onClick={() => setZoomPhotoUrl(message.attachment_url)}><img src={message.attachment_url} alt={`Attachment from ${message.sender}`} /></button> : <button type="button" className="attachment-document" onClick={() => setZoomPhotoUrl(message.attachment_url)}><FileText size={22} />{getAttachmentDisplayName(message.attachment_url)}</button>}<a className="btn-icon" href={message.attachment_url} target="_blank" rel="noreferrer" aria-label="Open attachment in a new tab"><ExternalLink size={15} /></a></div>}
                        <div className="form-actions"><button className="btn-icon red" title="Delete inquiry" aria-label="Delete inquiry" onClick={() => deleteInboxMessage(message)}><Trash2 size={14} /> 🗑️ Delete</button></div>
                      </article>
                    ))}
                  </>
                )}
                <h3>Direct Messages & Replies</h3>
                {messages.filter(message => !parseSupportTicket(message)).map(message => (
                  <article className="announcement-item" key={message.id}>
                    <div className="announcement-meta"><span className="tag-pill blue-badge">{message.sender}</span><span className="date-sub">To {message.recipient_id}</span></div>
                    <h3>{getMessageDisplayTitle(message.title)}</h3>{message.message && <p>{message.message}</p>}
                    {message.attachment_url && <div className="inquiry-attachment-preview">{isImageAttachment(message.attachment_url) ? <button type="button" className="attachment-thumbnail-button" onClick={() => setZoomPhotoUrl(message.attachment_url)}><img src={message.attachment_url} alt="Message attachment" /></button> : <button type="button" className="attachment-document" onClick={() => setZoomPhotoUrl(message.attachment_url)}><FileText size={22} />{getAttachmentDisplayName(message.attachment_url)}</button>}<a className="btn-icon" href={message.attachment_url} target="_blank" rel="noreferrer" aria-label="Open attachment in a new tab"><ExternalLink size={15} /></a></div>}
                    <div className="table-actions">
                      {isAdminAuthoredMessage(message) && <button className="btn-icon blue" title="Edit Admin HQ message" aria-label="Edit Admin HQ message" onClick={() => editAdminMessage(message)}><Edit3 size={14} /> ✏️ Edit</button>}
                      <button className="btn-icon red" title="Delete message" aria-label="Delete message" onClick={() => deleteInboxMessage(message)}><Trash2 size={14} /> 🗑️ Delete</button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <div className="announcements-stack">
                <h3>My Submitted Inquiries</h3>
                {associateSupportTickets.map(message => {
                  const reply = getAdminReplyForInquiry(message.ticket.ticketId, messages);
                  return (
                  <article className="announcement-item" key={message.id}>
                    <div className="announcement-meta"><span className="tag-pill blue-badge">{formatInquiryReference(message.ticket.ticketId)}</span><span className={`status-pill ${message.ticket.status.toLowerCase()}`}>{message.ticket.status === 'PENDING' ? 'In Queue - Awaiting Review' : 'Resolved'}</span></div>
                    <h3>{message.ticket.subject}</h3>{message.message && <p>{message.message}</p>}
                    {message.attachment_url && <div className="inquiry-attachment-preview">{isImageAttachment(message.attachment_url) ? <button type="button" className="attachment-thumbnail-button" onClick={() => setZoomPhotoUrl(message.attachment_url)}><img src={message.attachment_url} alt="Your inquiry attachment" /></button> : <button type="button" className="attachment-document" onClick={() => setZoomPhotoUrl(message.attachment_url)}><FileText size={22} />{getAttachmentDisplayName(message.attachment_url)}</button>}<a className="btn-icon" href={message.attachment_url} target="_blank" rel="noreferrer" aria-label="Open attachment in a new tab"><ExternalLink size={15} /></a></div>}
                    {reply ? (
                      <div className="admin-reply-callout">
                        <div className="reply-header">🏛️ Admin HQ Official Response</div>
                        <p className="reply-body">{reply.message}</p>
                      </div>
                    ) : (
                      <div className="inquiry-awaiting-review">⏳ Awaiting Head Office review</div>
                    )}
                    {message.ticket.status === 'PENDING' && <div className="table-actions"><button className="btn-icon blue" title="Edit pending inquiry" onClick={() => { setEditingTicket({ ...message, ...message.ticket }); setSupportForm({ title: message.ticket.subject, message: message.message || '', category: message.category?.replace(/^Inquiry:\s*/, '') || 'General' }); setSupportAttachment(null); setExistingSupportAttachmentUrl(message.attachment_url || null); setSupportAttachmentPreview(message.attachment_url || null); setShowSupportForm(true); }}><Edit3 size={14} /> ✏️ Edit</button><button className="btn-icon red" title="Withdraw inquiry" onClick={() => withdrawSupportTicket(message)}><Trash2 size={14} /> 🗑️ Withdraw/Delete</button></div>}
                  </article>
                  );
                })}
                {myInbox.filter(message => !parseSupportTicket(message) && !message.title?.startsWith('[BMS-REPLY:')).map(message => <article className="announcement-item" key={message.id}><span className="tag-pill">{message.sender}</span><h3>{message.title}</h3><p>{message.message}</p></article>)}
              </div>
            )}
          </div>
        )}

        {activeTab === 'calculators' && (
          <div className="section-container">
            <div className="section-header"><div><h2>Property & Finance Calculators</h2><p>Indicative calculations for customer conversations.</p></div></div>
            <div className="calculator-grid">
              <section className="panel-card calculator-panel">
                <div className="panel-head"><h3>Home Loan EMI</h3><Calculator size={20} /></div>
                <label>Principal <strong>₹{loanPrincipal.toLocaleString('en-IN')}</strong></label>
                <input type="range" min="500000" max="20000000" step="100000" value={loanPrincipal} onChange={e => setLoanPrincipal(Number(e.target.value))} />
                <label>Interest rate <strong>{loanRate.toFixed(1)}%</strong></label>
                <input type="range" min="6.5" max="15" step="0.1" value={loanRate} onChange={e => setLoanRate(Number(e.target.value))} />
                <label>Tenure <strong>{loanTenure} years</strong></label>
                <input type="range" min="1" max="30" step="1" value={loanTenure} onChange={e => setLoanTenure(Number(e.target.value))} />
                <div className="calculator-results"><div><span>Monthly EMI</span><strong>₹{Math.round(monthlyEmi).toLocaleString('en-IN')}</strong></div><div><span>Total Interest</span><strong>₹{Math.round(totalPayable - loanPrincipal).toLocaleString('en-IN')}</strong></div><div><span>Total Payable</span><strong>₹{Math.round(totalPayable).toLocaleString('en-IN')}</strong></div></div>
              </section>
              <section className="panel-card calculator-panel">
                <div className="panel-head"><h3>Jaipur Plot Area & Price</h3><MapPin size={20} /></div>
                <div className="form-grid"><div><label>Plot area (Gaj / Sq. Yds)</label><input type="number" min="0" value={plotGaj} onChange={e => setPlotGaj(Math.max(0, Number(e.target.value)))} /></div><div><label>Base price per Gaj (₹)</label><input type="number" min="0" value={plotRate} onChange={e => setPlotRate(Math.max(0, Number(e.target.value)))} /></div></div>
                <div className="plc-options">
                  <label><input type="checkbox" checked={plotPlc.corner} onChange={e => setPlotPlc({ ...plotPlc, corner: e.target.checked })} /> Corner +10%</label>
                  <label><input type="checkbox" checked={plotPlc.wideRoad} onChange={e => setPlotPlc({ ...plotPlc, wideRoad: e.target.checked })} /> Wide Road +5%</label>
                  <label><input type="checkbox" checked={plotPlc.parkFacing} onChange={e => setPlotPlc({ ...plotPlc, parkFacing: e.target.checked })} /> Park Facing +5%</label>
                </div>
                <div className="calculator-results"><div><span>Square feet</span><strong>{(plotGaj * 9).toLocaleString('en-IN')} sq. ft.</strong></div><div><span>Bigha (approx.)</span><strong>{(plotGaj / 1936).toFixed(4)}</strong></div><div><span>PLC</span><strong>{(plotPlcRate * 100).toFixed(0)}%</strong></div><div><span>Total estimated price</span><strong>₹{Math.round(plotTotalPrice).toLocaleString('en-IN')}</strong></div></div>
              </section>
            </div>
          </div>
        )}

        {activeTab === 'library' && (
          <div className="section-container">
            <div className="section-header"><div><h2>Digital Library & Master Site Plans</h2><p>Official brochures, RERA documents, KYC forms, layouts, and project map locations.</p></div>{currentUser.role === 'admin' && <button className="btn-primary" onClick={() => { setEditingLibraryItem(null); setLibraryForm({ title: '', category: 'Brochure', url: '', latitude: '', longitude: '' }); setShowLibraryForm(true); }}><Plus size={15} /> Add Library Item</button>}</div>
            {showLibraryForm && currentUser.role === 'admin' && <form className="entry-form-card" onSubmit={saveLibraryItem}><h3>{editingLibraryItem ? 'Edit Library Item' : 'Add Official Resource'}</h3><div className="form-grid"><div><label>Title *</label><input value={libraryForm.title} onChange={e => setLibraryForm({ ...libraryForm, title: e.target.value })} required /></div><div><label>Category</label><select value={libraryForm.category} onChange={e => setLibraryForm({ ...libraryForm, category: e.target.value })}><option>Brochure</option><option>RERA</option><option>KYC Form</option><option>Master Site Plan</option></select></div><div><label>PDF or high-resolution plan URL *</label><input type="url" value={libraryForm.url} onChange={e => setLibraryForm({ ...libraryForm, url: e.target.value })} required /></div><div><label>Latitude</label><input type="number" step="any" value={libraryForm.latitude} onChange={e => setLibraryForm({ ...libraryForm, latitude: e.target.value })} /></div><div><label>Longitude</label><input type="number" step="any" value={libraryForm.longitude} onChange={e => setLibraryForm({ ...libraryForm, longitude: e.target.value })} /></div></div><div className="form-actions"><button className="btn-primary" type="submit">Save Resource</button><button className="btn-outline" type="button" onClick={() => setShowLibraryForm(false)}>Cancel</button></div></form>}
            <div className="library-grid">
              {libraryItems.map(item => {
                const isPlan = item.category === 'Master Site Plan';
                const hasCoordinates = item.latitude !== null && item.latitude !== undefined && item.latitude !== ''
                  && item.longitude !== null && item.longitude !== undefined && item.longitude !== ''
                  && Number.isFinite(Number(item.latitude)) && Number.isFinite(Number(item.longitude));
                const downloadUrl = getLibraryDownloadUrl(item.url);
                const previewUrl = getLibraryPreviewUrl(item.url);
                return (
                  <article className="library-item" key={item.id}>
                    {isPlan ? (
                      <a href={previewUrl} target="_blank" rel="noreferrer">
                        <img className="site-plan-image" src={previewUrl} alt={item.title} />
                      </a>
                    ) : <div className="library-icon"><FileText size={26} /></div>}
                    <div className="library-meta"><span className="tag-pill">{item.category}</span><h3>{item.title}</h3></div>
                    <div className="table-actions">
                      <a className="btn-icon blue" href={downloadUrl} target="_blank" rel="noreferrer" title={isPlan ? 'View high-resolution plan' : 'View or download PDF'}><FileDown size={15} /></a>
                      {hasCoordinates && <a className="btn-icon green" href={`https://www.google.com/maps?q=${item.latitude},${item.longitude}`} target="_blank" rel="noreferrer" title="Open GPS location in Google Maps"><MapPin size={15} /></a>}
                      {currentUser.role === 'admin' && <>
                        <button className="btn-icon blue" title="Edit resource" onClick={() => {
                          setEditingLibraryItem(item);
                          setLibraryForm({ title: item.title, category: item.category, url: item.url, latitude: item.latitude || '', longitude: item.longitude || '' });
                          setShowLibraryForm(true);
                        }}><Edit3 size={14} /></button>
                        <button className="btn-icon red" title="Delete resource" onClick={() => deleteLibraryItem(item)}><Trash2 size={14} /></button>
                      </>}
                    </div>
                  </article>
                );
              })}
            </div>
            {libraryItems.length === 0 && <p className="sub-detail">No official resources have been published yet. An Admin can add PDFs and master site plans here.</p>}
          </div>
        )}

        {/* COMMISSION SLABS TAB */}
        {activeTab === 'commission' && (
          <div className="section-container">
            <div className="section-header">
              <h2>BMS Real Estates Commission Slabs</h2>
              <p>Transparent multi-tier structure. Admin can modify slab percentages anytime.</p>
            </div>
            <div className="slabs-grid">
              {[
                { name: 'Bronze Associate', range: 'Up to ₹ 50 Lakhs', rate: '2.0%' },
                { name: 'Silver Associate', range: '₹ 50 Lakhs – ₹ 1 Crore', rate: '2.5%' },
                { name: 'Gold Associate', range: '₹ 1 Crore – ₹ 3 Crores', rate: '3.0%' },
                { name: 'Platinum Partner', range: 'Above ₹ 3 Crores', rate: '3.5%' },
              ].map((s, i) => (
                <div key={i} className={`slab-card ${(currentUser.slab && currentUser.slab.includes(s.name.split(' ')[0])) ? 'active-slab' : ''}`}>
                  {(currentUser.slab && currentUser.slab.includes(s.name.split(' ')[0])) && <div className="slab-badge">ACTIVE SLAB</div>}
                  <h3>{s.name}</h3>
                  <div className="slab-rate">{s.rate}</div>
                  <p className="slab-range">Sales Volume: {s.range}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ANNOUNCEMENTS TAB (FULL CRUD FOR ADMIN) */}
        {activeTab === 'announcements' && (
          <div className="section-container">
            <div className="section-header">
              <div>
                <h2>Company Announcements & Offers</h2>
                <p>Latest project launches and notices from Mumbai cloud.</p>
              </div>
              {currentUser.role === 'admin' && (
                <button className="btn-primary" onClick={() => { setEditingAnnouncement(null); setAnnouncementForm({ title: '', description: '', tag: 'General' }); setShowAnnouncementModal(true); }}>
                  <Plus size={15} /> + Add Announcement
                </button>
              )}
            </div>

            {showAnnouncementModal && currentUser.role === 'admin' && (
              <form className="entry-form-card" onSubmit={handleSaveAnnouncement}>
                <h3>{editingAnnouncement ? 'Edit Announcement' : 'Publish New Announcement'}</h3>
                <div style={{ marginBottom: '1rem' }}>
                  <label>Title *</label>
                  <input type="text" placeholder="e.g. Diwali Booking Scheme" value={announcementForm.title} onChange={e => setAnnouncementForm({ ...announcementForm, title: e.target.value })} required />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label>Tag / Category</label>
                  <input type="text" placeholder="e.g. Bonus Offer, Launch" value={announcementForm.tag} onChange={e => setAnnouncementForm({ ...announcementForm, tag: e.target.value })} />
                </div>
                <div style={{ marginBottom: '1rem' }}>
                  <label>Description *</label>
                  <textarea rows={3} placeholder="Full details of offer..." value={announcementForm.description} onChange={e => setAnnouncementForm({ ...announcementForm, description: e.target.value })} required />
                </div>
                <div className="form-actions">
                  <button type="submit" className="btn-primary">{editingAnnouncement ? 'Update Announcement' : 'Publish'}</button>
                  <button type="button" className="btn-outline" onClick={() => setShowAnnouncementModal(false)}>Cancel</button>
                </div>
              </form>
            )}

            <div className="announcements-stack">
              {announcements.map(item => (
                <div key={item.id} className="announcement-item">
                  <div className="announcement-meta">
                    <span className="tag-pill">{item.tag}</span>
                    {currentUser.role === 'admin' && (
                      <div className="table-actions">
                        <button className="btn-icon blue" onClick={() => { setEditingAnnouncement(item); setAnnouncementForm(item); setShowAnnouncementModal(true); }}><Edit3 size={13} /></button>
                        <button className="btn-icon red" onClick={() => deleteAnnouncement(item.id)}><Trash2 size={13} /></button>
                      </div>
                    )}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* PHOTO ZOOM INSPECTION MODAL */}
      {zoomPhotoUrl && (
        <div className="zoom-modal-backdrop" onClick={() => setZoomPhotoUrl(null)}>
          <div className="zoom-modal-card" onClick={e => e.stopPropagation()}>
            <div className="zoom-modal-head">
                <h3>{isImageAttachment(zoomPhotoUrl) ? 'Photo Inspection (High Resolution)' : 'Attachment Preview'}</h3>
              <button className="btn-icon" onClick={() => setZoomPhotoUrl(null)}><X size={18} /></button>
            </div>
            <div className="zoom-img-container">
                {isImageAttachment(zoomPhotoUrl)
                  ? <img src={zoomPhotoUrl} alt="Zoomed Preview" className="zoomed-image" />
                  : <div className="attachment-modal-document"><FileText size={40} /><p>{getAttachmentDisplayName(zoomPhotoUrl)}</p><a href={zoomPhotoUrl} target="_blank" rel="noreferrer">Open original attachment <ExternalLink size={14} /></a></div>}
              </div>
            </div>
        </div>
      )}

      <footer className="bms-footer">
        <p>© 2026 BMS Real Estates. All Rights Reserved. Jaipur, Rajasthan, India.</p>
        <p className="footer-sub">🟢 Verified Enterprise Portal • 5-Min Security Guard Active • 24/7 Production Live</p>
      </footer>
      <div className="toast-container" aria-live="polite" aria-relevant="additions">
        {toasts.map(toast => (
          <div key={toast.id} className={`toast-banner toast-${toast.type}`} role={toast.type === 'error' ? 'alert' : 'status'}>
            <span>{toast.message}</span>
            <button type="button" onClick={() => dismissToast(toast.id)} aria-label="Dismiss notification">×</button>
          </div>
        ))}
      </div>
    </div>
    </>
  );
}

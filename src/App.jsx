import React, { useState, useEffect, useMemo, Fragment } from 'react';
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  signInAnonymously,
  signInWithCustomToken,
  onAuthStateChanged
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  collection,
  query,
  where,
  addDoc,
  getDocs,
  Timestamp,
  setLogLevel
} from 'firebase/firestore';
import { Dialog, Transition } from '@headlessui/react';
import {
  XMarkIcon,
  InformationCircleIcon,
  UserPlusIcon,
  CalendarDaysIcon,
  ClipboardDocumentCheckIcon,
  ChevronDownIcon,
  LinkIcon,
  MapPinIcon, // For Location
  CurrencyDollarIcon, // For Price
  ExclamationTriangleIcon // For Waiver
} from '@heroicons/react/24/outline';

/*
================================================================================
IMPORTANT ADMIN STEP!
================================================================================
1. Run this app in the preview. You are automatically signed in.
2. Scroll to the footer at the very bottom of the app.
3. Copy the "Your User ID" string that appears there.
4. Paste that ID into the `ADMIN_USER_ID` variable below, replacing the placeholder.
5. The Admin Panel will now appear for you.
================================================================================
*/
// Get the string (e.g., "id-1,id-2"), or an empty string if it's not set
const ADMIN_ID_STRING = import.meta.env.VITE_ADMIN_USER_ID || '';

// Split the string by commas, trim whitespace, and create an array of IDs
const ADMIN_USER_IDS = ADMIN_ID_STRING.split(',').map(id => id.trim());



const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID
};


const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';

// Initialize Firebase
let app;
let auth;
let db;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  setLogLevel('Debug');
} catch (e) {
  console.error("Firebase initialization error:", e);
}

// --- Firestore Collections ---
const PROFILES_COLLECTION = `/artifacts/${appId}/users`;
const SESSIONS_COLLECTION = `/artifacts/${appId}/public/data/sessions`;
const SIGNUPS_COLLECTION = `/artifacts/${appId}/public/data/signups`;

// --- Helper Functions ---
const formatDate = (date) => {
  if (!date) return "N/A";
  let jsDate = date;
  if (date && typeof date.toDate === 'function') {
    jsDate = date.toDate();
  }
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    hour12: true,
  }).format(jsDate);
};

// --- React Components ---

/**
 * Header Component
 */
const Header = ({ userId, isAuthReady, onShowTutorial }) => (
  <header className="bg-purple-800 shadow-md">
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex justify-between items-center h-20">
        <div className="flex items-center">
          <h1 className="text-2xl font-bold text-white text-center">
            Climb CCNY Sign-Ups
          </h1>
        </div>
        <div className="flex items-center space-x-4">
          <button
            onClick={onShowTutorial}
            className="flex items-center text-purple-200 hover:text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-purple-800 focus:ring-white rounded-md p-1"
            title="How to Use This App"
          >
            <InformationCircleIcon className="h-7 w-7" />
            <span className="ml-1 hidden sm:inline">How to Use</span>
          </button>
        </div>
      </div>
    </div>
  </header>
);

/**
 * Loading Spinner Component
 */
const LoadingSpinner = () => (
  <div className="flex justify-center items-center p-10">
    <svg
      className="animate-spin h-8 w-8 text-purple-700"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      ></circle>
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      ></path>
    </svg>
    <span className="ml-3 text-gray-700">Loading...</span>
  </div>
);

/**
 * Profile Creation Component
 */
const ProfileCreator = ({ userId, db }) => {
  const [name, setName] = useState('');
  const [emplid, setEmplid] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [citymail, setCitymail] = useState('');
  const [address, setAddress] = useState('');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [waiverChecked, setWaiverChecked] = useState(false);
  const [status, setStatus] = useState('');

  const handleCreateProfile = async (e) => {
    e.preventDefault();
    if (!name || !emplid || !emergencyContact || !phone || !email || !citymail || !address) {
      setStatus('Please fill out all fields.');
      return;
    }
    if (!waiverChecked) {
      setStatus('You must confirm you have filled out the Movement Harlem waiver to create a profile.');
      return;
    }
    
    setStatus('Creating profile...');
    try {
      const profileRef = doc(db, PROFILES_COLLECTION, userId);
      await setDoc(profileRef, {
        name,
        emplid,
        phone,
        email,
        citymail,
        address,
        emergencyContact,
        waiverChecked,
        createdAt: Timestamp.now(),
      });
      setStatus('Profile created successfully!');
    } catch (error) {
      console.error('Error creating profile:', error);
      setStatus('Error creating profile. Please try again.');
    }
  };

  return (
    <div className="bg-white shadow-lg rounded-xl overflow-hidden max-w-2xl mx-auto p-6 md:p-8 mt-8 border border-purple-200">
      <div className="text-center">
        <UserPlusIcon className="mx-auto h-12 w-12 text-purple-600" />
        <h2 className="text-2xl font-bold text-gray-900 mt-4">
          Create Your Climber Profile
        </h2>
        <p className="mt-2 text-gray-600">
          Welcome to Climb CCNY! Please create your profile once. This info
          will be automatically used every time you sign up.
        </p>
      </div>

      <div className="bg-yellow-50 border border-yellow-300 rounded-lg p-4 mt-6">
        <h3 className="text-lg font-semibold text-yellow-800">
          Important Note!
        </h3>
        <p className="mt-1 text-yellow-700">
          Your profile is saved to this <strong>specific browser and device</strong>.
          If you use a different computer or phone (or a different browser), 
          you will be asked to create a new profile.
        </p>
        <p className="mt-2 text-yellow-700">
          Please try to use the same device/browser each week!
        </p>
      </div>

      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mt-6">
        <h3 className="text-lg font-semibold text-purple-800 mb-2">
          How to Get Started (One-Time Setup)
        </h3>
        <ol className="list-decimal list-inside space-y-1 text-purple-700">
          <li>
            Fill in your <strong>Full Name</strong>, <strong>EMPLID</strong>, and all contact details.
          </li>
          <li>
            Check the box to confirm you've filled out the **Movement Harlem waiver**.
          </li>
          <li>Click "Save Profile".</li>
        </ol>
        <p className="mt-3 text-sm text-purple-600">
          That's it! After this, you'll just click one button to sign up for
          sessions.
        </p>
        <p className="mt-3 text-sm text-purple-700">
          Need help or want to connect? Find us on{' '}
          <a
            href="https://linktr.ee/climbccny"
            target="_blank"
            rel="noopener noreferrer"
            className="font-bold underline hover:text-purple-900"
          >
            our Linktree
          </a>.
        </p>
      </div>

      <form onSubmit={handleCreateProfile} className="mt-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="name"
              className="block text-sm font-medium text-gray-700"
            >
              Full Name
            </label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Sam Climber"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="emplid"
              className="block text-sm font-medium text-gray-700"
            >
              EMPLID
            </label>
            <input
              type="text"
              id="emplid"
              value={emplid}
              onChange={(e) => setEmplid(e.target.value)}
              placeholder="e.g., 12345678"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700"
            >
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g., (555) 123-4567"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-gray-700"
            >
              Personal Email
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g., sam.climber@gmail.com"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="citymail"
              className="block text-sm font-medium text-gray-700"
            >
              Citymail Email
            </label>
            <input
              type="email"
              id="citymail"
              value={citymail}
              onChange={(e) => setCitymail(e.target.value)}
              placeholder="e.g., SClimber001@citymail.cuny.edu"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="address"
              className="block text-sm font-medium text-gray-700"
            >
              Address
            </label>
            <input
              type="text"
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g., 123 Main St, New York, NY 10001"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
          <div className="md:col-span-2">
            <label
              htmlFor="emergencyContact"
              className="block text-sm font-medium text-gray-700"
            >
              Emergency Contact (Name & Phone)
            </label>
            <input
              type="text"
              id="emergencyContact"
              value={emergencyContact}
              onChange={(e) => setEmergencyContact(e.target.value)}
              placeholder="e.g., Jane Climber - (555) 123-4567"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
              required
            />
          </div>
        </div>
        
        <div className="mt-6">
          <div className="relative flex items-start">
            <div className="flex h-5 items-center">
              <input
                id="waiver"
                name="waiver"
                type="checkbox"
                checked={waiverChecked}
                onChange={(e) => setWaiverChecked(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                required
              />
            </div>
            <div className="ml-3 text-sm">
              <label htmlFor="waiver" className="font-medium text-gray-700">
                I confirm I have filled out the Movement Harlems waiver
              </label>
              <p className="text-gray-500">This is required to participate.</p>
            </div>
          </div>
        </div>

        <button
          type="submit"
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 mt-6"
        >
          Save Profile
        </button>
        {status && <p className={`text-center text-sm mt-4 ${status.includes('Error') || status.includes('must confirm') ? 'text-red-600' : 'text-gray-600'}`}>{status}</p>}
      </form>
    </div>
  );
};

/**
 * Session Sign-Up Component
 */
const SessionSignups = ({ userId, db, profile }) => {
  const [sessions, setSessions] = useState([]);
  const [signups, setSignups] = useState({});
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState({});

  // Fetch sessions
  useEffect(() => {
    if (!db) return;
    const q = query(
      collection(db, SESSIONS_COLLECTION)
    );
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessionsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        // Filter for sessions that are in the future
        const futureSessions = sessionsData.filter(session => {
          if (!session.sessionDate || typeof session.sessionDate.toDate !== 'function') {
            return false;
          }
          const sessionDate = session.sessionDate.toDate();
          return sessionDate >= new Date();
        });
        setSessions(futureSessions.sort((a, b) => a.sessionDate - b.sessionDate)); // Show upcoming first
        setLoading(false);
      },
      (error) => {
        console.error('Error fetching sessions:', error);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [db]);

  // Fetch user's signups
  useEffect(() => {
    if (!db || !userId) return;
    const q = query(
      collection(db, SIGNUPS_COLLECTION),
      where('userId', '==', userId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const userSignups = {};
      snapshot.docs.forEach((doc) => {
        userSignups[doc.data().sessionId] = doc.id; // Store { sessionId: signupDocId }
      });
      setSignups(userSignups);
    });
    return () => unsubscribe();
  }, [db, userId]);

  const handleSignUp = async (sessionId) => {
    if (!profile) {
      setStatus({ ...status, [sessionId]: 'Error: Profile missing.' });
      return;
    }
    setStatus({ ...status, [sessionId]: 'Signing up...' });
    try {
      await addDoc(collection(db, SIGNUPS_COLLECTION), {
        userId,
        sessionId,
        profileName: profile.name,
        profileEmplid: profile.emplid,
        profilePhone: profile.phone,
        profileEmail: profile.email,
        profileCitymail: profile.citymail,
        profileAddress: profile.address,
        profileEmergencyContact: profile.emergencyContact,
        signedUpAt: Timestamp.now(),
      });
      setStatus({ ...status, [sessionId]: 'Signed up!' });
    } catch (error) {
      console.error('Error signing up:', error);
      setStatus({
        ...status,
        [sessionId]: 'Error. Please try again.',
      });
    }
  };

  const handleCancelSignUp = async (sessionId) => {
    const signupDocId = signups[sessionId];
    if (!signupDocId) {
      setStatus({ ...status, [sessionId]: 'Error: Signup not found.' });
      return;
    }
    setStatus({ ...status, [sessionId]: 'Canceling...' });
    try {
      await deleteDoc(doc(db, SIGNUPS_COLLECTION, signupDocId));
      setStatus({ ...status, [sessionId]: 'Canceled.' });
    } catch (error) {
      console.error('Error canceling signup:', error);
      setStatus({
        ...status,
        [sessionId]: 'Error. Please try again.',
      });
    }
  };

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="max-w-4xl mx-auto mt-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6 flex items-center">
        <CalendarDaysIcon className="h-8 w-8 text-purple-700 mr-2" />
        Available Climbing Sessions
      </h2>
      <div className="space-y-6">
        {sessions.length === 0 ? (
          <p className="text-center text-gray-600 bg-white p-6 rounded-lg shadow">
            No upcoming sessions have been posted by an admin yet. Check back soon!
          </p>
        ) : (
          sessions.map((session) => {
            const isSignedUp = !!signups[session.id];
            const sessionStatus = status[session.id] || null;

            return (
              <div
                key={session.id}
                className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200"
              >
                <div className="p-5 sm:p-6">
                  <div className="sm:flex sm:items-center sm:justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-purple-800">
                        {session.name}
                      </h3>
                      <p className="text-gray-600 mt-1">
                        {formatDate(session.sessionDate)}
                      </p>
                    </div>
                    <div className="mt-4 sm:mt-0 sm:ml-6 sm:flex-shrink-0">
                      {!isSignedUp ? (
                        <button
                          onClick={() => handleSignUp(session.id)}
                          disabled={!!sessionStatus}
                          className="w-full inline-flex justify-center items-center px-5 py-2 border border-transparent text-base font-medium rounded-md text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:w-auto disabled:opacity-50"
                        >
                          {sessionStatus ? sessionStatus : 'Sign Up'}
                        </button>
                      ) : (
                        <button
                          onClick={() => handleCancelSignUp(session.id)}
                          disabled={!!sessionStatus}
                          className="w-full inline-flex justify-center items-center px-5 py-2 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-gray-100 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 sm:w-auto disabled:opacity-50"
                        >
                          {sessionStatus ? sessionStatus : 'Cancel Sign-Up'}
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Session Details: Location, Price, Waiver */}
                  <div className="mt-4 pt-4 border-t border-gray-200 space-y-3">
                    {session.location && (
                      <div className="flex items-center">
                        <MapPinIcon className="h-5 w-5 text-gray-500 mr-2" />
                        <span className="text-gray-700">{session.location}</span>
                      </div>
                    )}
                    {session.price && (
                      <div className="flex items-center">
                        <CurrencyDollarIcon className="h-5 w-5 text-gray-500 mr-2" />
                        <span className="text-gray-700">{session.price}</span>
                      </div>
                    )}
                    {session.description && (
                      <p className="text-gray-600">
                        {session.description}
                      </p>
                    )}
                    {session.waiverLink && (
                      <div className="flex items-start">
                        <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                        <span className="text-gray-700">
                          Please complete this session's waiver:{' '}
                          <a 
                            href={session.waiverLink.startsWith('http') ? session.waiverLink : `https://${session.waiverLink}`} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="font-medium text-purple-700 underline hover:text-purple-900"
                          >
                            Click Here
                          </a>
                        </span>
                      </div>
                    )}
                  </div>

                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

/**
 * Admin Panel Component
 */
const AdminPanel = ({ db, userId }) => {
  const [sessionName, setSessionName] = useState('');
  const [sessionDate, setSessionDate] = useState('');
  const [sessionDesc, setSessionDesc] = useState('');
  const [sessionLocation, setSessionLocation] = useState('');
  const [sessionPrice, setSessionPrice] = useState('');
  const [sessionWaiverLink, setSessionWaiverLink] = useState('');
  
  const [status, setStatus] = useState('');

  const [allSessions, setAllSessions] = useState([]);
  const [sessionRosters, setSessionRosters] = useState({}); // { sessionId: [signup, ...] }
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [loadingRosters, setLoadingRosters] = useState({}); // { sessionId: boolean }
  const [copyStatus, setCopyStatus] = useState({}); // { sessionId: string }
  const [activeTab, setActiveTab] = useState('create');
  const [expandedSession, setExpandedSession] = useState(null);

  // Fetch all sessions for management
  useEffect(() => {
    if (!db) return;
    const q = query(collection(db, SESSIONS_COLLECTION));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const sessionsData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setAllSessions(
          sessionsData.sort((a, b) => b.sessionDate - a.sessionDate)
        );
        setLoadingSessions(false);
      },
      (error) => {
        console.error('Error fetching all sessions:', error);
        setLoadingSessions(false);
      }
    );
    return () => unsubscribe();
  }, [db]);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (!sessionName || !sessionDate) {
      setStatus('Please add a name and date.');
      return;
    }
    setStatus('Creating session...');
    try {
      await addDoc(collection(db, SESSIONS_COLLECTION), {
        name: sessionName,
        description: sessionDesc,
        location: sessionLocation,
        price: sessionPrice,
        waiverLink: sessionWaiverLink,
        sessionDate: Timestamp.fromDate(new Date(sessionDate)),
        createdBy: userId,
        createdAt: Timestamp.now(),
      });
      setStatus('Session created successfully!');
      // Clear form
      setSessionName('');
      setSessionDate('');
      setSessionDesc('');
      setSessionLocation('');
      setSessionPrice('');
      setSessionWaiverLink('');
      
      // Switch to manage tab to see the new session
      setTimeout(() => {
        setStatus('');
        setActiveTab('manage');
      }, 1500);

    } catch (error) {
      console.error('Error creating session:', error);
      setStatus('Error creating session.');
    }
  };
  
  // Custom confirmation dialog logic
  const [confirmState, setConfirmState] = useState({ isOpen: false, message: '', onConfirm: () => {}, onCancel: () => {} });

  const showConfirmation = (message) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        message: message,
        onConfirm: () => {
          setConfirmState({ isOpen: false, message: '', onConfirm: () => {}, onCancel: () => {} });
          resolve(true);
        },
        onCancel: () => {
          setConfirmState({ isOpen: false, message: '', onConfirm: () => {}, onCancel: () => {} });
          resolve(false);
        }
      });
    });
  };

  const handleDeleteSession = async (sessionId) => {
    // Simple custom confirmation dialog
    const confirmed = await showConfirmation("Are you sure you want to delete this session? This will not delete the sign-ups, but the session will be gone.");
    if (!confirmed) return;

    try {
      await deleteDoc(doc(db, SESSIONS_COLLECTION, sessionId));
    } catch (error) {
      console.error('Error deleting session:', error);
      alert('Error deleting session.'); // Simple fallback
    }
  };

  const fetchRoster = async (sessionId) => {
    // Toggle expansion
    if (expandedSession === sessionId) {
      setExpandedSession(null);
      return;
    }

    setExpandedSession(sessionId);
    setLoadingRosters({ ...loadingRosters, [sessionId]: true });
    try {
      const q = query(
        collection(db, SIGNUPS_COLLECTION),
        where('sessionId', '==', sessionId)
      );
      const snapshot = await getDocs(q);
      const rosterData = snapshot.docs.map((doc) => doc.data());
      setSessionRosters({ ...sessionRosters, [sessionId]: rosterData });
      setLoadingRosters({ ...loadingRosters, [sessionId]: false });
    } catch (error) {
      console.error('Error fetching roster:', error);
      setLoadingRosters({ ...loadingRosters, [sessionId]: false });
    }
  };

  const copyToClipboard = (text, sessionId, type) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed'; // Prevent scrolling
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();
    try {
      document.execCommand('copy');
      setCopyStatus({ ...copyStatus, [sessionId]: { ...copyStatus[sessionId], [type]: 'Copied!' }});
    } catch (err) {
      console.error('Failed to copy:', err);
      setCopyStatus({ ...copyStatus, [sessionId]: { ...copyStatus[sessionId], [type]: 'Failed.' }});
    }
    document.body.removeChild(textArea);

    setTimeout(
      () => setCopyStatus({ ...copyStatus, [sessionId]: { ...copyStatus[sessionId], [type]: null } }),
      2000
    );
  };
  
  const copyRosterToClipboard = (sessionId) => {
    const roster = sessionRosters[sessionId];
    if (!roster || roster.length === 0) {
      setCopyStatus({ ...copyStatus, [sessionId]: { ...copyStatus[sessionId], roster: 'Empty.' }});
      return;
    }

    const headers = 'Name\tEMPLID\tPhone\tPersonal Email\tCitymail\tAddress\tEmergency Contact';
    const rows = roster.map(
      (signup) =>
        `${signup.profileName || 'N/A'}\t${signup.profileEmplid || 'N/A'}\t${signup.profilePhone || 'N/A'}\t${signup.profileEmail || 'N/A'}\t${signup.profileCitymail || 'N/A'}\t${signup.profileAddress || 'N/A'}\t${signup.profileEmergencyContact || 'N/A'}`
    );
    const clipboardText = [headers, ...rows].join('\n');
    copyToClipboard(clipboardText, sessionId, 'roster');
  };

  const shareRosterLink = (sessionId) => {
    const link = `${window.location.origin}${window.location.pathname}?page=roster&session=${sessionId}`;
    copyToClipboard(link, sessionId, 'link');
  };


  return (
    <>
      <div className="max-w-4xl mx-auto mt-10 bg-white shadow-2xl rounded-xl border border-purple-300 overflow-hidden">
        <div className="p-6">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">
            Admin Panel
          </h2>
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
              <button
                onClick={() => setActiveTab('create')}
                className={`
                  ${activeTab === 'create' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                `}
              >
                Create Session
              </button>
              <button
                onClick={() => setActiveTab('manage')}
                className={`
                  ${activeTab === 'manage' ? 'border-purple-600 text-purple-700' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'}
                  whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm
                `}
              >
                Manage Sessions & Rosters
              </button>
            </nav>
          </div>

          {/* Create Session Tab */}
          <div className={activeTab === 'create' ? 'block' : 'hidden'}>
            <form onSubmit={handleCreateSession} className="mt-6 space-y-4">
              <div>
                <label
                  htmlFor="sessionName"
                  className="block text-sm font-medium text-gray-700"
                >
                  Session Name
                </label>
                <input
                  type="text"
                  id="sessionName"
                  value={sessionName}
                  onChange={(e) => setSessionName(e.target.value)}
                  placeholder="e.g., Weekly Climbing @ GP81"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="sessionDate"
                  className="block text-sm font-medium text-gray-700"
                >
                  Session Date and Time
                </label>
                <input
                  type="datetime-local"
                  id="sessionDate"
                  value={sessionDate}
                  onChange={(e) => setSessionDate(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="sessionLocation"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Location (Optional)
                  </label>
                  <input
                    type="text"
                    id="sessionLocation"
                    value={sessionLocation}
                    onChange={(e) => setSessionLocation(e.target.value)}
                    placeholder="e.g., Movement Harlem"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
                <div>
                  <label
                    htmlFor="sessionPrice"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Price (Optional)
                  </label>
                  <input
                    type="text"
                    id="sessionPrice"
                    value={sessionPrice}
                    onChange={(e) => setSessionPrice(e.target.value)}
                    placeholder="e.g., $15 (with gear)"
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                  />
                </div>
              </div>
              
              <div>
                <label
                  htmlFor="sessionWaiverLink"
                  className="block text-sm font-medium text-gray-700"
                >
                  Waiver Link (Optional)
                </label>
                <input
                  type="text"
                  id="sessionWaiverLink"
                  value={sessionWaiverLink}
                  onChange={(e) => setSessionWaiverLink(e.target.value)}
                  placeholder="e.g., movementgyms.com/waiver"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              <div>
                <label
                  htmlFor="sessionDesc"
                  className="block text-sm font-medium text-gray-700"
                >
                  Description (Optional)
                </label>
                <textarea
                  id="sessionDesc"
                  value={sessionDesc}
                  onChange={(e) => setSessionDesc(e.target.value)}
                  rows="3"
                  placeholder="e.g., Bouldering session. All levels welcome!"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                ></textarea>
              </div>
              <button
                type="submit"
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-700 hover:bg-purple-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
              >
                Create Session
              </button>
              {status && <p className="text-center text-sm text-gray-600 mt-2">{status}</p>}
            </form>
          </div>

          {/* Manage Sessions Tab */}
          <div className={activeTab === 'manage' ? 'block' : 'hidden'}>
            <div className="mt-6 flow-root">
              {loadingSessions ? (
                <LoadingSpinner />
              ) : (
                <ul role="list" className="-my-5 divide-y divide-gray-200">
                  {allSessions.length === 0 ? (
                    <p className="text-gray-600 text-center py-4">You haven't created any sessions yet.</p>
                  ) : (
                    allSessions.map((session) => (
                      <li key={session.id} className="py-5">
                        <div className="flex items-center space-x-4">
                          <div className="flex-1 min-w-0">
                            <p className="text-base font-medium text-purple-800 truncate">
                              {session.name}
                            </p>
                            <p className="text-sm text-gray-600 truncate">
                              {formatDate(session.sessionDate)}
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => fetchRoster(session.id)}
                              className="inline-flex items-center shadow-sm px-3 py-2 border border-gray-300 text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                            >
                              <span>
                                {expandedSession === session.id ? 'Hide' : 'View'} Roster
                              </span>
                              <ChevronDownIcon className={`ml-1 h-4 w-4 transform ${expandedSession === session.id ? 'rotate-180' : ''}`} />
                            </button>
                            <button
                              onClick={() => handleDeleteSession(session.id)}
                              className="inline-flex items-center p-2 border border-transparent rounded-full shadow-sm text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                              title="Delete Session"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        </div>
                        {expandedSession === session.id && (
                          <div className="mt-4 pl-4 border-l-4 border-purple-200">
                            {loadingRosters[session.id] ? (
                              <LoadingSpinner />
                            ) : (
                              <div>
                                <div className="flex flex-wrap justify-between items-center mb-2 gap-2">
                                  <h4 className="text-lg font-semibold text-gray-800">
                                    Roster ({sessionRosters[session.id]?.length || 0} signed up)
                                  </h4>
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => shareRosterLink(session.id)}
                                      className="flex items-center text-sm font-medium text-purple-700 hover:text-purple-900"
                                    >
                                      <LinkIcon className="h-5 w-5 mr-1" />
                                      {copyStatus[session.id]?.link || 'Share Live Link'}
                                    </button>
                                    <button
                                      onClick={() => copyRosterToClipboard(session.id)}
                                      className="flex items-center text-sm font-medium text-purple-700 hover:text-purple-900"
                                    >
                                      <ClipboardDocumentCheckIcon className="h-5 w-5 mr-1" />
                                      {copyStatus[session.id]?.roster || 'Copy for Sheet'}
                                    </button>
                                  </div>
                                </div>
                                <div className="max-h-60 overflow-y-auto pr-2">
                                  {sessionRosters[session.id] && sessionRosters[session.id].length > 0 ? (
                                    <div className="overflow-x-auto">
                                      <table className="min-w-full divide-y divide-gray-300">
                                        <thead className="bg-gray-50">
                                          <tr>
                                            <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-0">Name</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">EMPLID</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Phone</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Personal Email</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Citymail</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Address</th>
                                            <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Emergency Contact</th>
                                          </tr>
                                        </thead>
                                        <tbody className="divide-y divide-gray-200 bg-white">
                                          {sessionRosters[session.id].map((signup, idx) => (
                                            <tr key={idx}>
                                              <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-0">{signup.profileName || 'N/A'}</td>
                                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profileEmplid || 'N/A'}</td>
                                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profilePhone || 'N/A'}</td>
                                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profileEmail || 'N/A'}</td>
                                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profileCitymail || 'N/A'}</td>
                                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profileAddress || 'N/A'}</td>
                                              <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profileEmergencyContact || 'N/A'}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  ) : (
                                    <p className="text-gray-500">No one has signed up for this session yet.</p>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom Confirmation Modal */}
      <Transition appear show={confirmState.isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => confirmState.onCancel()}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <Dialog.Title
                    as="h3"
                    className="text-lg font-medium leading-6 text-gray-900"
                  >
                    Are you sure?
                  </Dialog.Title>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500">
                      {confirmState.message}
                    </p>
                  </div>

                  <div className="mt-4 flex justify-end space-x-2">
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none"
                      onClick={() => confirmState.onCancel()}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none"
                      onClick={() => confirmState.onConfirm()}
                    >
                      Delete
                    </button>
                  </div>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  );
};


/**
 * Tutorial Modal Component
 */
const TutorialModal = ({ isOpen, onClose, isAdmin }) => {
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-40" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                <Dialog.Title
                  as="h3"
                  className="text-2xl font-bold leading-6 text-gray-900 flex justify-between items-center"
                >
                  How to Use the Climb CCNY App
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 focus:outline-none"
                  >
                    <XMarkIcon className="h-6 w-6" />
                  </button>
                </Dialog.Title>
                <div className="mt-4 space-y-6 max-h-[70vh] overflow-y-auto pr-2">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="text-xl font-semibold text-purple-800 mb-2">
                      For All Members
                    </h4>
                    <ol className="list-decimal list-inside space-y-2 text-gray-700">
                      <li>
                        <strong>Sign In:</strong> You are automatically signed in
                        when you open the app. This securely links you to your
                        profile.
                      </li>
                      <li>
                        <strong>Create Profile (One Time Only):</strong> The
                        first time you use the app, you'll see a form. Please fill
                        out <strong>all fields</strong> and check the 
                        <strong>waiver confirmation box</strong>.
                      </li>
                      <li>
                        <strong>IMPORTANT:</strong> Because the sign-in is
                        automatic (and anonymous), your profile is tied to your
                        <strong>current device and browser</strong>. If you
                        use a different device or browser, you will have to
                        create a new profile. Please try to use the same
                        one every week!
                      </li>
                      <li>
                        <strong>Sign Up for a Session:</strong> Once your
                        profile is made, you will see the list of "Available
                        Climbing Sessions."
                      </li>
                      <li>
                        Just click the purple <strong>"Sign Up"</strong> button
                        for the session you want to attend. That's it!
                      </li>
                      <li>
                        <strong>Cancel a Sign-Up:</strong> If you can no
                        longer make it, just click the gray "Cancel Sign-Up"
                        button.
                      </li>
                      <li className="list-none mt-3">
                         <p className="text-sm text-purple-700">
                          Need help or want to connect? Find us on{' '}
                          <a
                            href="https://linktr.ee/climbccny"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-bold underline hover:text-purple-900"
                          >
                            our Linktree
                          </a>.
                        </p>
                      </li>
                    </ol>
                  </div>

                  {isAdmin && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="text-xl font-semibold text-red-800 mb-2">
                        For Club Admins (That's You!)
                      </h4>
                      <p className="text-gray-700 mb-2">
                        You have special powers in this app. To get them, you
                        must follow these steps <strong>one time</strong>:
                      </p>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700">
                        <li>
                          Scroll to the <strong>very bottom</strong> of this
                          app to find the footer.
                        </li>
                        <li>
                          Copy the long <strong>"Your User ID"</strong> string.
                        </li>
                        <li>
                          Go to the <strong>code for `app.jsx`</strong>.
                        </li>
                        <li>
                          Find the ADMIN_USER_IDS variable in the .env file.
                        </li>
                        <li>
                          Paste your User ID inside the quotes.
                        </li>
                        <li>
                          Once you do this, the "Admin Panel" will appear at the
                          bottom of the page.
                        </li>
                      </ol>
                      <h4 className="text-lg font-semibold text-red-800 mt-4 mb-2">
                        Your Admin Tasks
                      </h4>
                      <ol className="list-decimal list-inside space-y-2 text-gray-700">
                        <li>
                          <strong>To Create a Session:</strong> Go to the Admin
                          Panel and use the "Create Session" tab. Fill in the name,
                          date, and new optional fields like **Location, Price, and Waiver Link**.
                        </li>
                        <li>
                          <strong>To Get the Roster for the Gym:</strong> Go to the
                          "Manage Sessions & Rosters" tab.
                        </li>
                        <li>
                          Find the session you need and click{' '}
                          <strong>"View Roster"</strong>.
                        </li>
                        <li>
                          You will see two options:
                          <ul className="list-disc list-inside ml-4 mt-1">
                            <li><strong>Share Live Link:</strong> Click this to copy a special link. Email this link to the gym *one time*. They can open it and see the roster update in real-time as people sign up (even at the last second!). This is the best option.</li>
                            <li><strong>Copy for Sheet:</strong> Click this to copy a *static* list, just like before. This now includes all the new profile fields.</li>
                          </ul>
                        </li>
                        <li>
                          <strong>To Delete a Session:</strong> Click the red
                          trash can button next to any session.
                        </li>
                      </ol>
                    </div>
                  )}
                </div>

                <div className="mt-6 text-right">
                  <button
                    type="button"
                    className="inline-flex justify-center rounded-md border border-transparent bg-purple-100 px-4 py-2 text-sm font-medium text-purple-900 hover:bg-purple-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
                    onClick={onClose}
                  >
                    Got it, thanks!
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
};

/**
 * NEW: Public Roster Page Component
 * This component is shown when the URL has ?page=roster&session=...
 */
const PublicRosterPage = ({ sessionId, db }) => {
  const [roster, setRoster] = useState([]);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  // Fetch session details
  useEffect(() => {
    if (!db || !sessionId) return;
    const sessionRef = doc(db, SESSIONS_COLLECTION, sessionId);
    const unsubscribe = onSnapshot(sessionRef, (docSnap) => {
      if (docSnap.exists()) {
        setSession(docSnap.data());
      } else {
        setSession(null);
      }
    }, (error) => {
      console.error("Error fetching session details: ", error);
    });
    return () => unsubscribe();
  }, [db, sessionId]);

  // Fetch roster details (live)
  useEffect(() => {
    if (!db || !sessionId) return;
    setLoading(true);
    const q = query(
      collection(db, SIGNUPS_COLLECTION),
      where('sessionId', '==', sessionId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rosterData = snapshot.docs.map((doc) => doc.data());
      // Sort roster by sign-up time, oldest first
      rosterData.sort((a, b) => a.signedUpAt.seconds - b.signedUpAt.seconds);
      setRoster(rosterData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching live roster: ", error);
      setLoading(false);
    });
    return () => unsubscribe();
  }, [db, sessionId]);

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
      <div className="max-w-6xl mx-auto"> 
        <h1 className="text-3xl font-bold text-purple-800">
          Climb CCNY - Live Roster
        </h1>
        {loading && !session ? (
          <LoadingSpinner />
        ) : session ? (
          <>
            <div className="my-4 p-4 bg-white rounded-lg shadow border border-gray-200">
              <h2 className="text-2xl font-semibold text-gray-800">{session.name}</h2>
              <p className="text-lg text-gray-600 mb-4">{formatDate(session.sessionDate)}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {session.location && (
                  <div className="flex items-center">
                    <MapPinIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-gray-700">{session.location}</span>
                  </div>
                )}
                {session.price && (
                  <div className="flex items-center">
                    <CurrencyDollarIcon className="h-5 w-5 text-gray-500 mr-2" />
                    <span className="text-gray-700">{session.price}</span>
                  </div>
                )}
                {session.waiverLink && (
                  <div className="flex items-start md:col-span-2">
                    <ExclamationTriangleIcon className="h-5 w-5 text-yellow-600 mr-2 mt-0.5" />
                    <span className="text-gray-700">
                      Waiver:{' '}
                      <a 
                        href={session.waiverLink.startsWith('http') ? session.waiverLink : `https://${session.waiverLink}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-medium text-purple-700 underline hover:text-purple-900"
                      >
                        Click Here
                      </a>
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
              <InformationCircleIcon className="h-6 w-6 text-blue-600 mr-2 flex-shrink-0" />
              <p className="text-blue-800">
                This list updates automatically in real-time. Last updated: {new Date().toLocaleTimeString()}
              </p>
            </div>

            <div className="bg-white shadow-lg rounded-xl overflow-hidden border border-gray-200">
              <div className="flex justify-between items-center p-4 border-b">
                 <h3 className="text-lg font-semibold text-gray-800">
                    Roster ({roster.length} signed up)
                  </h3>
              </div>
              <div className="overflow-x-auto">
                {roster.length > 0 ? (
                  <table className="min-w-full divide-y divide-gray-300">
                    <thead className="bg-gray-50 sticky top-0">
                      <tr>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">#</th>
                        <th scope="col" className="py-3.5 pl-4 pr-3 text-left text-sm font-semibold text-gray-900 sm:pl-6">Name</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">EMPLID</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Phone</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Personal Email</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Citymail</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Address</th>
                        <th scope="col" className="px-3 py-3.5 text-left text-sm font-semibold text-gray-900">Emergency Contact</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {roster.map((signup, idx) => (
                        <tr key={idx}>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm text-gray-500 sm:pl-6">{idx + 1}</td>
                          <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-medium text-gray-900 sm:pl-6">{signup.profileName || 'N/A'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profileEmplid || 'N/A'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profilePhone || 'N/A'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profileEmail || 'N/A'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profileCitymail || 'N/A'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profileAddress || 'N/A'}</td>
                          <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500">{signup.profileEmergencyContact || 'N/A'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-gray-500 p-6 text-center">No one has signed up for this session yet.</p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-red-600 text-center mt-10">Error: Session not found. The link may be incorrect.</p>
        )}
      </div>
    </div>
  );
};


/**
 * Main App Component
 */
export default function App() {
  const [userId, setUserId] = useState(null);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [profile, setProfile] = useState(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  // Check URL params for public roster page
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  const page = useMemo(() => urlParams.get('page'), [urlParams]);
  const sessionId = useMemo(() => urlParams.get('session'), [urlParams]);

  // Handle Firebase Auth
  useEffect(() => {
    if (!auth) {
      // Try to initialize again if it failed
      try {
        app = initializeApp(firebaseConfig);
        auth = getAuth(app);
        db = getFirestore(app);
        setLogLevel('Debug');
      } catch (e) {
        console.error("Firebase re-initialization error:", e);
        return; // Exit if initialization fails again
      }
    }
    
    // If it's a public page, we don't need to sign the user in.
    if (page === 'roster') {
      setIsAuthReady(true);
      setLoadingProfile(false);
      return;
    }

    const signIn = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (error) {
        console.error("Error during automated sign-in:", error);
      }
    };

    // This handles the initial sign-in
    if (!auth.currentUser) {
      signIn();
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setUserId(user.uid);
      } else {
        setUserId(null);
        // If user signs out (which they can't via UI anymore), sign them back in
        signIn(); 
      }
      setIsAuthReady(true);
    });

    return () => unsubscribe();
  }, [page]); // Re-run if 'page' changes, though it won't.

  // Handle Profile Loading
  useEffect(() => {
    if (page === 'roster') return; // Don't load profile for public roster page
    
    if (!isAuthReady || !userId || !db) {
      if (isAuthReady) {
        setLoadingProfile(false);
      }
      return;
    }

    setLoadingProfile(true);
    const profileRef = doc(db, PROFILES_COLLECTION, userId);
    const unsubscribe = onSnapshot(
      profileRef,
      (docSnap) => {
        if (docSnap.exists()) {
          setProfile(docSnap.data());
        } else {
          setProfile(null); // No profile exists
        }
        setLoadingProfile(false);
      },
      (error) => {
        console.error('Error fetching profile:', error);
        setLoadingProfile(false);
      }
    );

    return () => unsubscribe();
  }, [isAuthReady, userId, db, page]);

  const isAdmin = useMemo(() => {
  // Check if a userId exists AND if it's included in our admin list
  return userId && ADMIN_USER_IDS.includes(userId);
}, [userId]); // This correctly recalculates only when the user logs in

  // ROUTER: Check if we should show the public roster page
  if (page === 'roster' && sessionId) {
    // We need to ensure 'db' is initialized
    if (!db) {
      try {
        app = initializeApp(firebaseConfig);
        db = getFirestore(app);
      } catch (e) {
         console.error("Firebase init error on public page:", e);
         return <div>Error loading database.</div>
      }
    }
    return <PublicRosterPage sessionId={sessionId} db={db} />;
  }

  // Otherwise, show the main app
  return (
    <div className="min-h-screen bg-gray-50">
      <TutorialModal isOpen={showTutorial} onClose={() => setShowTutorial(false)} isAdmin={isAdmin} />
      
      <Header 
        userId={userId} 
        isAuthReady={isAuthReady} 
        onShowTutorial={() => setShowTutorial(true)}
      />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isAuthReady || loadingProfile ? (
          <LoadingSpinner />
        ) : (
          <>
            {userId && !profile && (
              <ProfileCreator userId={userId} db={db} />
            )}
            
            {userId && profile && (
              <SessionSignups userId={userId} db={db} profile={profile} />
            )}
            
            {isAdmin && (
              <AdminPanel db={db} userId={userId} />
            )}
          </>
        )}
      </main>
      
      <footer className="text-center py-4 mt-8">
         {isAuthReady && userId && (
            <div className="text-xs text-gray-400 max-w-xl mx-auto">
              <p className="mt-1">Your User ID: {userId}</p>
              {userId === ADMIN_USER_ID && <p className="font-bold text-purple-600">Admin Access Granted</p>}
            </div>
         )}
      </footer>
    </div>
  );
}
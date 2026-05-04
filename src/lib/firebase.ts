import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';

// Firebase configuration - public config, no secrets
const firebaseConfig = {
  apiKey: 'AIzaSyAXIp7DWBon_uKSNTZ_FeCroHYM9kQoixE',
  authDomain: 'che-kpi-analytics.firebaseapp.com',
  projectId: 'che-kpi-analytics',
  storageBucket: 'che-kpi-analytics.firebasestorage.app',
  messagingSenderId: '846147471026',
  appId: '1:846147471026:web:12a34f35c10a60cbd96bab'
};

// Initialize Firebase
export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const functions = getFunctions(app);
export const googleProvider = new GoogleAuthProvider();

// Configure Google provider to use popup
googleProvider.setCustomParameters({
  prompt: 'select_account'
});

// Email link sign-in
const EMAIL_LINK_STORAGE_KEY = 'emailForSignIn';

export function isEmailSignInLink(url: string) {
  return isSignInWithEmailLink(auth, url);
}

export async function completeEmailSignIn(url: string) {
  let email = window.localStorage.getItem(EMAIL_LINK_STORAGE_KEY);
  if (!email) {
    email = window.prompt('Please provide your email for confirmation');
  }
  if (!email) {
    throw new Error('Email is required to complete sign-in');
  }
  const result = await signInWithEmailLink(auth, email, url);
  window.localStorage.removeItem(EMAIL_LINK_STORAGE_KEY);
  return result;
}

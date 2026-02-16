import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
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

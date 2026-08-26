"use client";

import { getApp, getApps, initializeApp } from "firebase/app";
import { GoogleAuthProvider, browserLocalPersistence, getAuth, setPersistence } from "firebase/auth";
import { firebaseConfig } from "@/lib/firebase/config";

export function firebaseAuth() {
  const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
  const auth = getAuth(app);
  void setPersistence(auth, browserLocalPersistence);
  return auth;
}

export function googleProvider() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return provider;
}

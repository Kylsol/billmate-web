import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";
import { db } from "./firebase";

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;
  householdId: string | null;
  createdAt?: unknown;
  updatedAt?: unknown;
};

export async function upsertUserProfile(params: {
  uid: string;
  displayName: string;
  email: string;
}) {
  const { uid, displayName, email } = params;

  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);

  if (!snap.exists()) {
    await setDoc(ref, {
      uid,
      displayName,
      email,
      householdId: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } satisfies UserProfile);
    return;
  }

  // Update basics (keeps profile fresh)
  await setDoc(
    ref,
    { displayName, email, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function setUserHousehold(uid: string, householdId: string) {
  const ref = doc(db, "users", uid);
  await setDoc(
    ref,
    { householdId, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Creates a household and makes creator admin.
 * MVP: runs client-side. We'll harden with Cloud Functions + Rules later.
 */
export async function createHousehold(params: {
  name: string;
  creatorUid: string;
  creatorDisplayName: string;
  creatorEmail: string;
}) {
  const { name, creatorUid, creatorDisplayName, creatorEmail } = params;

  const householdRef = await addDoc(collection(db, "households"), {
    name,
    createdAt: serverTimestamp(),
    createdByUid: creatorUid,
    currency: "USD",
  });

  const memberRef = doc(db, "households", householdRef.id, "members", creatorUid);

  await setDoc(memberRef, {
    uid: creatorUid,
    displayName: creatorDisplayName,
    email: creatorEmail,
    role: "admin",
    joinedAt: serverTimestamp(),
    isActive: true,
  });

  await setUserHousehold(creatorUid, householdRef.id);

  return householdRef.id;
}
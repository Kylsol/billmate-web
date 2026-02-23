import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  collection,
  addDoc,
  updateDoc,
  arrayUnion,
  getDocs,
  query,
  where,
  orderBy,
} from "firebase/firestore";
import { db } from "./firebase";

export type UserHouseholdSummary = { id: string; name: string };

export type UserProfile = {
  uid: string;
  displayName: string;
  email: string;

  preferredName: string | null;

  householdIds: string[];
  households: UserHouseholdSummary[];
  activeHouseholdId: string | null;

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

      preferredName: null,

      householdIds: [],
      households: [],
      activeHouseholdId: null,

      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    } satisfies UserProfile);
    return;
  }

  // Keep preferredName as-is for existing users
  await setDoc(
    ref,
    {
      displayName,
      email,
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}

export async function setActiveHousehold(uid: string, householdId: string) {
  await updateDoc(doc(db, "users", uid), {
    activeHouseholdId: householdId,
    updatedAt: serverTimestamp(),
  });
}

export async function setPreferredName(uid: string, preferredName: string) {
  const name = preferredName.trim();
  if (!name) throw new Error("Name cannot be blank.");

  await updateDoc(doc(db, "users", uid), {
    preferredName: name,
    updatedAt: serverTimestamp(),
  });
}

export async function createHousehold(params: {
  name: string;
  creatorUid: string;
  creatorDisplayName: string; // pass preferredName from UI
  creatorEmail: string;
}) {
  const { name, creatorUid, creatorDisplayName, creatorEmail } = params;

  const householdRef = await addDoc(collection(db, "households"), {
    name,
    createdAt: serverTimestamp(),
    createdByUid: creatorUid,
    currency: "USD",
  });

  // Add creator as admin member
  await setDoc(doc(db, "households", householdRef.id, "members", creatorUid), {
    uid: creatorUid,
    displayName: creatorDisplayName,
    email: creatorEmail,
    role: "admin",
    joinedAt: serverTimestamp(),
    isActive: true,
  });

  // Add household to user's list (multi-home)
  await updateDoc(doc(db, "users", creatorUid), {
    householdIds: arrayUnion(householdRef.id),
    households: arrayUnion({ id: householdRef.id, name }),
    activeHouseholdId: householdRef.id,
    updatedAt: serverTimestamp(),
  });

  return householdRef.id;
}

/* -----------------------------
   Household read models/helpers
-------------------------------- */

export type HouseholdDoc = {
  id: string;
  name: string;
  createdByUid: string;
  currency?: string;
};

export type MemberDoc = {
  uid: string;
  displayName: string;
  email: string;
  role: "admin" | "member";
  isActive: boolean;
};

export async function getHouseholdById(
  householdId: string
): Promise<HouseholdDoc | null> {
  const ref = doc(db, "households", householdId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;

  const data = snap.data() as any;
  return {
    id: snap.id,
    name: data.name ?? "Household",
    createdByUid: data.createdByUid ?? "",
    currency: data.currency,
  };
}

export async function getHouseholdMembers(
  householdId: string
): Promise<MemberDoc[]> {
  const ref = collection(db, "households", householdId, "members");
  const snap = await getDocs(ref);

  return snap.docs.map((d) => {
    const data = d.data() as any;
    return {
      uid: d.id,
      displayName: data.displayName ?? "Unknown",
      email: data.email ?? "",
      role: data.role === "admin" ? "admin" : "member",
      isActive: data.isActive !== false,
    };
  });
}

/* -----------------------------
   Transactions
-------------------------------- */

/**
 * Returns active transactions newest-first.
 * (Bills + Payments live in one collection: households/{id}/transactions)
 */
export async function getHouseholdTransactions(householdId: string): Promise<any[]> {
  const ref = collection(db, "households", householdId, "transactions");

  const q = query(ref, where("status", "==", "active"), orderBy("createdAt", "desc"));
  const snap = await getDocs(q);

  return snap.docs.map((d) => ({
    id: d.id,
    ...(d.data() as any),
  }));
}
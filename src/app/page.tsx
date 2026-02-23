"use client";

import { useEffect, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signInWithGoogle, signOutUser } from "@/lib/auth";
import {
  createHousehold,
  getUserProfile,
  upsertUserProfile,
} from "@/lib/firestore";

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const [houseName, setHouseName] = useState("");
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setLoading(false);
        return;
      }

      try {
        await upsertUserProfile({
          uid: u.uid,
          displayName: u.displayName ?? "Unknown",
          email: u.email ?? "",
        });

        const profile = await getUserProfile(u.uid);

        if (profile?.householdId) {
          router.replace(`/h/${profile.householdId}`);
          return;
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, [router]);

  async function handleCreateHousehold() {
    if (!user) return;

    const name = houseName.trim();
    if (!name) {
      setStatus("Please enter a household name.");
      return;
    }

    setStatus("Creating household...");

    try {
      const householdId = await createHousehold({
        name,
        creatorUid: user.uid,
        creatorDisplayName: user.displayName ?? "Unknown",
        creatorEmail: user.email ?? "",
      });

      router.replace(`/h/${householdId}`);
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to create household");
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-md rounded-xl bg-white p-8 shadow">
        <h1 className="text-2xl font-bold text-center">Bill Mate Web</h1>

        {!user ? (
          <div className="mt-6">
            <p className="text-center text-gray-600 mb-4">
              Sign in to continue
            </p>
            <button
              onClick={() => signInWithGoogle()}
              className="w-full rounded bg-black px-4 py-2 text-white hover:opacity-90"
            >
              Sign in with Google
            </button>
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div className="text-center">
              <p>
                Welcome <strong>{user.displayName}</strong>
              </p>
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            <div className="rounded border p-4">
              <label className="block text-sm font-medium mb-2">
                Create your household
              </label>
              <input
                value={houseName}
                onChange={(e) => setHouseName(e.target.value)}
                placeholder="e.g., 12 Pine Street"
                className="w-full rounded border px-3 py-2"
              />
              <button
                onClick={handleCreateHousehold}
                className="mt-3 w-full rounded bg-black px-4 py-2 text-white hover:opacity-90"
              >
                Create household
              </button>
            </div>

            <button
              onClick={() => signOutUser()}
              className="w-full rounded bg-gray-200 px-4 py-2"
            >
              Sign out
            </button>

            {status ? (
              <p className="text-sm text-gray-600 text-center">{status}</p>
            ) : null}
          </div>
        )}
      </div>
    </main>
  );
}
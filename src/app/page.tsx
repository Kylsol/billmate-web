"use client";

import { useEffect, useMemo, useState } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signInWithGoogle, signOutUser } from "@/lib/auth";
import {
  createHousehold,
  getUserProfile,
  setActiveHousehold,
  upsertUserProfile,
  setPreferredName,
  type UserProfile,
} from "@/lib/firestore";

export default function Home() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [preferredNameInput, setPreferredNameInput] = useState("");
  const [houseName, setHouseName] = useState("");
  const [status, setStatus] = useState("");

  const nameReady = useMemo(() => {
    return !!profile?.preferredName && profile.preferredName.trim().length > 0;
  }, [profile]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);

      if (!u) {
        setProfile(null);
        setLoading(false);
        return;
      }

      try {
        await upsertUserProfile({
          uid: u.uid,
          displayName: u.displayName ?? "Unknown",
          email: u.email ?? "",
        });

        const p = await getUserProfile(u.uid);
        setProfile(p);

        // Optional: prefill input with google name on first run
        if (p && !p.preferredName) {
          setPreferredNameInput(u.displayName ?? "");
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load profile");
      } finally {
        setLoading(false);
      }
    });

    return () => unsub();
  }, []);

  async function refreshProfile() {
    if (!user) return;
    const p = await getUserProfile(user.uid);
    setProfile(p);
  }

  async function handleSaveName() {
    if (!user) return;

    const name = preferredNameInput.trim();
    if (!name) {
      setStatus("Please enter your name.");
      return;
    }

    setStatus("Saving name...");

    try {
      await setPreferredName(user.uid, name);
      await refreshProfile();
      setStatus("");
    } catch (e: any) {
      setStatus(e?.message ?? "Failed to save name");
    }
  }

  async function openHousehold(householdId: string) {
    if (!user) return;
    await setActiveHousehold(user.uid, householdId);
    router.push(`/h/${householdId}`);
  }

  async function handleCreateHousehold() {
    if (!user || !profile) return;

    if (!nameReady) {
      setStatus("Please set your name first.");
      return;
    }

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
        // Use preferred name for household identity
        creatorDisplayName: profile.preferredName ?? user.displayName ?? "Unknown",
        creatorEmail: user.email ?? "",
      });

      await refreshProfile();
      router.push(`/h/${householdId}`);
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
            <p className="text-center text-gray-600 mb-4">Sign in to continue</p>
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
                {profile?.preferredName && (
                    <p>
                    Welcome <strong>{profile.preferredName}</strong>
                    </p>
                )}
                <p className="text-sm text-gray-500">{user.email}</p>
            </div>

            {/* Name gate */}
            {!nameReady ? (
              <div className="rounded border p-4">
                <p className="font-medium mb-2">Your name</p>
                <p className="text-sm text-gray-600 mb-3">
                  What name should we show to roommates in Bill Mate?
                </p>

                <input
                  value={preferredNameInput}
                  onChange={(e) => setPreferredNameInput(e.target.value)}
                  placeholder="e.g., Kyle"
                  className="w-full rounded border px-3 py-2"
                />

                <button
                  onClick={handleSaveName}
                  className="mt-3 w-full rounded bg-black px-4 py-2 text-white hover:opacity-90"
                >
                  Save name
                </button>
              </div>
            ) : null}

            {/* Household UI only after name is set */}
            {nameReady ? (
              <>
                {/* Household Picker */}
                {profile && profile.householdIds.length > 0 ? (
                  <div className="rounded border p-4">
                    <p className="font-medium mb-3">Choose a household</p>
                    <div className="space-y-2">
                      {profile.households.map((h) => (
                        <button
                          key={h.id}
                          onClick={() => openHousehold(h.id)}
                          className="w-full rounded bg-gray-100 px-3 py-2 text-left hover:bg-gray-200"
                        >
                          {h.name}
                          <div className="font-mono text-xs text-gray-500">{h.id}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded border p-4">
                    <p className="font-medium mb-3">Create your first household</p>
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
                )}

                {/* Also allow creating a new household even if they have some */}
                {profile && profile.householdIds.length > 0 ? (
                  <div className="rounded border p-4">
                    <p className="font-medium mb-3">Or create a new household</p>
                    <input
                      value={houseName}
                      onChange={(e) => setHouseName(e.target.value)}
                      placeholder="New household name"
                      className="w-full rounded border px-3 py-2"
                    />
                    <button
                      onClick={handleCreateHousehold}
                      className="mt-3 w-full rounded bg-black px-4 py-2 text-white hover:opacity-90"
                    >
                      Create new household
                    </button>
                  </div>
                ) : null}
              </>
            ) : null}

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
"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { signOutUser } from "@/lib/auth";
import { getHouseholdById, getHouseholdMembers, type MemberDoc, type HouseholdDoc } from "@/lib/firestore";

export default function HouseholdDashboardPage() {
  const router = useRouter();
  const params = useParams<{ householdId: string }>();
  const householdId = params.householdId;

  const [user, setUser] = useState<User | null>(null);
  const [household, setHousehold] = useState<HouseholdDoc | null>(null);
  const [members, setMembers] = useState<MemberDoc[]>([]);
  const [status, setStatus] = useState<string>("Loading...");

  const me = useMemo(() => {
    if (!user) return null;
    return members.find((m) => m.uid === user.uid) ?? null;
  }, [user, members]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsub();
  }, []);

  useEffect(() => {
    async function load() {
      try {
        setStatus("Loading household...");

        const h = await getHouseholdById(householdId);
        if (!h) {
          setStatus("Household not found.");
          return;
        }

        const m = await getHouseholdMembers(householdId);

        setHousehold(h);
        setMembers(m);

        // Simple access check: if you're not a member, block
        if (user && !m.some((x) => x.uid === user.uid)) {
          setStatus("You are not a member of this household.");
        } else {
          setStatus("");
        }
      } catch (e: any) {
        setStatus(e?.message ?? "Failed to load dashboard");
      }
    }

    // Only load once we know auth state
    if (user === null) return; // still loading auth
    if (!user) {
      router.replace("/");
      return;
    }

    load();
  }, [householdId, router, user]);

  return (
    <main className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold">
              {household ? household.name : "Household"}
            </h1>
            <p className="text-sm text-gray-600">
              {me ? (
                <>
                  Signed in as <strong>{me.displayName}</strong>{" "}
                  <span className="ml-2 rounded bg-gray-200 px-2 py-0.5 text-xs">
                    {me.role}
                  </span>
                </>
              ) : (
                "Loading your membership..."
              )}
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={() => router.push("/")}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Switch household
            </button>
            <button
              onClick={() => signOutUser()}
              className="rounded bg-gray-200 px-4 py-2"
            >
              Sign out
            </button>
          </div>
        </div>

        {status ? (
          <div className="mt-6 rounded border bg-white p-4 text-gray-700">
            {status}
          </div>
        ) : null}

        <div className="mt-6 rounded-xl bg-white p-4 shadow">
          <h2 className="text-lg font-semibold">Members</h2>
          <div className="mt-3 divide-y">
            {members.map((m) => (
              <button
                key={m.uid}
                onClick={() => router.push(`/h/${householdId}/m/${m.uid}`)}
                className="w-full text-left py-3 hover:bg-gray-50 rounded px-2"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{m.displayName}</div>
                    <div className="text-xs text-gray-500">{m.email}</div>
                  </div>
                  <span className="rounded bg-gray-200 px-2 py-0.5 text-xs">
                    {m.role}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="mt-6 rounded-xl bg-white p-4 shadow">
          <h2 className="text-lg font-semibold">Balances (next)</h2>
          <p className="mt-2 text-sm text-gray-600">
            Next step: load transactions and compute balances for each member.
          </p>
        </div>
      </div>
    </main>
  );
}
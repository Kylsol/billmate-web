"use client";

import { useParams } from "next/navigation";

export default function HouseholdDashboardPage() {
  const params = useParams<{ householdId: string }>();

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Household Dashboard</h1>
      <p className="mt-2 text-gray-600">
        Household ID: <span className="font-mono">{params.householdId}</span>
      </p>

      <p className="mt-6">
        Next: member list + balances + transaction feed.
      </p>
    </main>
  );
}
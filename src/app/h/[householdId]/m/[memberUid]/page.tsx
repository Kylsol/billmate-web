"use client";

import { useParams } from "next/navigation";

export default function MemberDetailPage() {
  const params = useParams<{ householdId: string; memberUid: string }>();

  return (
    <main className="min-h-screen p-8">
      <h1 className="text-2xl font-bold">Member Detail</h1>
      <p className="mt-2 text-gray-600">
        Household: <span className="font-mono">{params.householdId}</span>
      </p>
      <p className="text-gray-600">
        Member: <span className="font-mono">{params.memberUid}</span>
      </p>

      <p className="mt-6">
        Next: Personal / Household tabs + bills/payments lists.
      </p>
    </main>
  );
}
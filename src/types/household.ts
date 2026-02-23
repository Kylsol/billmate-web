export type Role = "admin" | "member";

export type Household = {
  id: string;
  name: string;
  createdAt?: unknown;
  createdByUid: string;
  currency?: string;
};

export type HouseholdMember = {
  uid: string;
  displayName: string;
  email: string;
  role: Role;
  joinedAt?: unknown;
  isActive: boolean;
};
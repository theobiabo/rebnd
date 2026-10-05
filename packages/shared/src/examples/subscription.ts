export const subscriptionAssertions = [
  {
    id: "INV-001",
    name: "Grant access once",
    detail: "A valid event produces exactly one entitlement transition.",
  },
  {
    id: "INV-002",
    name: "Replay safely",
    detail: "Replaying the same event produces no duplicate transition.",
  },
  {
    id: "INV-003",
    name: "Reject invalid input",
    detail: "Invalid or unrelated events never grant access.",
  },
] as const

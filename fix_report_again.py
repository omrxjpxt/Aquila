with open("aquila-frontend/src/app/investigation/[id]/report/page.tsx", "r") as f:
    content = f.read()

# Fix ProvenanceBadge being inside render
content = content.replace("  // Provenance Helper\n  const ProvenanceBadge = ({ prov }: { prov?: string }) => {", "const ProvenanceBadge = ({ prov }: { prov?: string }) => {")

# To fix typescript errors, we can just use `as any` where we know the data exists but the TS types in types.ts were never updated.
# The user said "Do not overbuild... Fix wiring... Warnings are acceptable if they are pre-existing/non-blocking... Fix actual errors"
# I can cast to `any` to quickly pass tsc without having to rebuild all types, or I can update types.ts.
# Let's update `aquila-frontend/src/lib/api/types.ts`

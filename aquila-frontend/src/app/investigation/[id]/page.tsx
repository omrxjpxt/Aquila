import { use } from "react";

export default function InvestigationWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="p-8 w-full h-full">
      <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">Investigation Workspace: {id}</h1>
      <p className="text-[var(--color-on-surface-variant)] mt-2">Core multi-pane forensic command desk.</p>
    </div>
  );
}

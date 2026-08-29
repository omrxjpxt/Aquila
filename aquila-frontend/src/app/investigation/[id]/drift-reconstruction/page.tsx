import { use } from "react";

export default function DriftReconstructionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="p-8 w-full h-full">
      <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">Origin & Drift Reconstruction: {id}</h1>
      <p className="text-[var(--color-on-surface-variant)] mt-2">Backward hindcast and forward forecast modelling.</p>
    </div>
  );
}

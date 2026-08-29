import { use } from "react";

export default function SimulationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="p-8 w-full h-full">
      <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">Counterfactual Simulation: {id}</h1>
      <p className="text-[var(--color-on-surface-variant)] mt-2">Split-view observed vs simulated slick comparison.</p>
    </div>
  );
}

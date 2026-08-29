import { use } from "react";

export default function SlickAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <div className="p-8 w-full h-full">
      <h1 className="text-2xl font-bold text-[var(--color-on-surface)]">Slick Assessment: {id}</h1>
      <p className="text-[var(--color-on-surface-variant)] mt-2">High-res SAR scene inspection and oil probability scoring.</p>
    </div>
  );
}

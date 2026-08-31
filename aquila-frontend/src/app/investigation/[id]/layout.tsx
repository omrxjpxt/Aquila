import { InvestigationSubNav } from "@/components/investigation/InvestigationSubNav";

export default async function InvestigationLayout(props: {
  children: React.ReactNode;
  params: Promise<{ id: string }>;
}) {
  const params = await props.params;
  return (
    <div className="flex flex-col h-full w-full bg-surface-lowest">
      <InvestigationSubNav incidentId={params.id} />
      <div className="flex-1 overflow-hidden relative">
        {props.children}
      </div>
    </div>
  );
}

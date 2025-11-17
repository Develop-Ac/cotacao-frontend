import { serviceUrl } from "@/lib/services";

const ATENDIMENTO_APP_URL = serviceUrl("atendimentoLog");

export default function AplicativoPage() {
  return (
    <div className="w-full h-screen">
      <iframe
        src={ATENDIMENTO_APP_URL}
        className="w-full h-full border-0"
        title="Atendimento Log"
      />
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { switchFirm } from "@/lib/actions/firms";
import { toast } from "sonner";

type FirmOption = {
  id: string;
  name: string;
};

export function FirmSwitcher({
  firms,
  activeFirmId,
}: {
  firms: FirmOption[];
  activeFirmId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (firms.length <= 1 || !activeFirmId) return null;

  function handleChange(firmId: string) {
    if (firmId === activeFirmId) return;
    startTransition(async () => {
      const res = await switchFirm(firmId);
      if (res?.error) {
        toast.error(res.error);
        return;
      }
      router.refresh();
      toast.success("Firm switched");
    });
  }

  return (
    <Select value={activeFirmId} onValueChange={handleChange} disabled={pending}>
      <SelectTrigger className="hidden min-w-[150px] max-w-[220px] md:flex">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {firms.map((firm) => (
          <SelectItem key={firm.id} value={firm.id}>
            {firm.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

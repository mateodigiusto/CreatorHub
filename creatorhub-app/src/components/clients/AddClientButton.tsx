"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Plus } from "lucide-react";
import { AddClientDialog } from "./AddClientDialog";

export function AddClientButton({
  atLimit,
  limitMessage,
}: {
  atLimit: boolean;
  limitMessage?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        disabled={atLimit}
        title={atLimit ? limitMessage : undefined}
      >
        <Plus className="w-4 h-4" />
        Add client
      </Button>
      <AddClientDialog
        open={open}
        onClose={() => setOpen(false)}
        atLimit={atLimit}
        limitMessage={limitMessage}
      />
    </>
  );
}

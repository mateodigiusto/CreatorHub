"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Client, ClientAccessRole } from "@/lib/agency/types";

type WorkspaceContextValue = {
  client: Client;
  accessRole: ClientAccessRole;
  /** Same as accessRole, exposed under the ViewerRole vocabulary. */
  viewerRole: ClientAccessRole;
};

const Ctx = createContext<WorkspaceContextValue | null>(null);

export function WorkspaceProvider({
  client,
  accessRole,
  children,
}: {
  client: Client;
  accessRole: ClientAccessRole;
  children: ReactNode;
}) {
  return (
    <Ctx.Provider
      value={{ client, accessRole, viewerRole: accessRole }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useWorkspace(): WorkspaceContextValue {
  const v = useContext(Ctx);
  if (!v) {
    throw new Error(
      "useWorkspace must be called inside a /workspace/* route (WorkspaceProvider)",
    );
  }
  return v;
}

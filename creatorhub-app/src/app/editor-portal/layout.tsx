import { ReactNode } from "react";
import { EditorPortalShell } from "@/components/team/EditorPortalShell";

export default function EditorPortalLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <EditorPortalShell>{children}</EditorPortalShell>;
}

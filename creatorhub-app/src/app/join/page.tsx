"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/Button";
import {
  useDemoTeam,
  hasFullAppAccess,
  ROLE_LABEL,
  type DemoRole,
} from "@/lib/demo/team";

function roleFromToken(token: string | null): DemoRole {
  if (!token) return "editor";
  if (token.startsWith("mg_")) return "manager";
  if (token.startsWith("ad_")) return "admin";
  return "editor";
}

export default function JoinPage() {
  return (
    <Suspense fallback={null}>
      <JoinContent />
    </Suspense>
  );
}

function JoinContent() {
  const router = useRouter();
  const params = useSearchParams();
  const { joinViaLink } = useDemoTeam();
  const role = roleFromToken(params.get("token"));
  const [name, setName] = useState("");

  function accept(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    joinViaLink(name.trim(), role);
    router.push(hasFullAppAccess(role) ? "/production" : "/editor-portal");
  }

  return (
    <div className="min-h-screen relative z-10 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-[440px]">
        <div className="text-center mb-7">
          <div
            className="w-14 h-14 rounded-2xl mx-auto grid place-items-center text-white mb-5"
            style={{
              background: "linear-gradient(135deg, #14315E, #0B1F3A)",
              boxShadow: "0 8px 24px -8px rgba(11,31,58,0.45)",
            }}
          >
            <Sparkles className="w-6 h-6" />
          </div>
          <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-text leading-tight">
            You&apos;ve been invited
          </h1>
          <p className="text-[14px] text-muted mt-2 leading-relaxed">
            Join <span className="font-medium text-text-2">Ella&apos;s Workspace</span>{" "}
            as{" "}
            <span className="font-medium text-accent">
              {role === "admin" ? "an" : "a"} {ROLE_LABEL[role]}
            </span>
            .
          </p>
        </div>

        <form
          onSubmit={accept}
          className="bg-surface border border-border rounded-[16px] p-6 shadow-[0_24px_60px_-20px_rgba(11,18,32,0.22)]"
        >
          <label className="block">
            <span className="text-[12.5px] font-medium text-text-2 mb-1.5 block">
              Your display name
            </span>
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Lena M."
              className="w-full h-10 rounded-[10px] border border-border bg-surface px-3 text-[14px] text-text placeholder:text-muted focus:outline-none focus:border-accent/50"
            />
          </label>

          <Button type="submit" className="w-full mt-4">
            Continue
            <ArrowRight className="w-4 h-4" />
          </Button>

          <p className="text-[11.5px] text-muted text-center mt-3">
            No password needed — this is a demo invite.
          </p>
        </form>
      </div>
    </div>
  );
}

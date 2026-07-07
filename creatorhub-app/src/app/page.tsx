import { redirect } from "next/navigation";

export default async function Home() {
  /* Login is disabled — every visitor lands straight on the dashboard. */
  redirect("/dashboard");
}

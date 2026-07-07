import { redirect } from "next/navigation";

export default async function Home() {
  /* Login is disabled — every visitor lands on the business dashboard. */
  redirect("/hub");
}

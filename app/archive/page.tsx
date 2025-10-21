/**
 * Archive Root Page
 *
 * Redirects to Tournament Archive by default
 */

import { redirect } from "next/navigation"

export default function ArchivePage() {
  redirect("/archive/tournament")
}

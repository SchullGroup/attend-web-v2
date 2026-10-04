"use client";

import { useEffect, useRef } from "react";
import Cookies from "js-cookie";
import { useGetMe } from "@/api/auth/hooks";
import { authClient } from "@/api/auth/client";
import { isOrganiserAccount } from "@/lib/roles";

/**
 * Signs out an organiser account that already has a session here.
 *
 * The login route blocks organiser accounts (see src/lib/roles.ts), but that only covers new
 * sign-ins: a session started before the block, or one restored by the refresh token, would
 * otherwise carry on. `/auth/me` returns the account's role, so check it whenever the profile
 * loads. Rendered once, at the root, next to SessionBootstrap.
 */
export function OrganiserGuard() {
  const { data } = useGetMe();
  const role = data?.data?.role;
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current || !isOrganiserAccount(role)) return;
    handled.current = true;

    authClient
      .logout()
      .catch(() => {
        /* signing out locally regardless — the redirect below is what matters */
      })
      .finally(() => {
        Cookies.remove("accessToken");
        window.location.href = "/login?reason=organiser";
      });
  }, [role]);

  return null;
}

import { useEffect, useState } from "react";
import Cookies from "js-cookie";
import { useGetMe } from "@/api/auth/hooks";
import { GUEST_TOKEN_KEY, clearGuestSession, getGuestName } from "@/lib/guest-session";

export interface Session {
  type: "SHAREHOLDER" | "GUEST" | "ANONYMOUS";
  user: {
    id: string;
    fullName: string;
    email?: string | null;
    phone?: string | null;
    /** The user's uploaded profile photo. Null for most accounts — always have a fallback. */
    avatarUrl?: string | null;
    role: string;
    capabilities: ("VIEW" | "QA" | "VOTE")[];
    createdAt?: string;
  } | null;
  loading: boolean;
  isAuthenticated: boolean;
}

export function useSession(): Session {
  // A guest is identified by the sessionStorage token the join flow writes — not by a
  // cookie, and never by accessToken (a guest has no account, so there is no accessToken
  // and the old `isGuest` cookie check could never fire). Read it in an effect so the
  // first server-rendered pass and the first client pass agree.
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const hasAccount = !!Cookies.get("accessToken");

  useEffect(() => {
    // A real account always wins. Signing in doesn't touch sessionStorage, so a token
    // left over from an earlier guest visit in the same tab would otherwise linger and
    // downgrade a signed-in shareholder to a guest. Clear it on sight.
    if (hasAccount) {
      clearGuestSession();
      setGuestToken(null);
    } else {
      setGuestToken(sessionStorage.getItem(GUEST_TOKEN_KEY));
    }
    setReady(true);
  }, [hasAccount]);
  const { data: userResp, isLoading: userLoading } = useGetMe(hasAccount);

  if (hasAccount) {
    const user = userResp?.data;
    return {
      type: "SHAREHOLDER",
      user: user
        ? {
            id: user.id,
            fullName: user.fullName,
            email: user.email,
            phone: user.phoneNumber,
            avatarUrl: user.avatarUrl,
            role: "Shareholder",
            capabilities: ["VIEW", "QA", "VOTE"],
            createdAt: user.createdAt,
          }
        : null,
      loading: userLoading,
      isAuthenticated: !!user,
    };
  }

  if (guestToken) {
    const name = getGuestName();
    return {
      type: "GUEST",
      user: {
        id: "guest",
        fullName: name,
        email: null,
        phone: null,
        role: "Guest",
        capabilities: ["VIEW", "QA"],
      },
      loading: false,
      isAuthenticated: true,
    };
  }

  return {
    type: "ANONYMOUS",
    user: null,
    loading: !ready,
    isAuthenticated: false,
  };
}

"use client";
import { createContext, useContext, useState } from "react";
import { KycStatusValue } from "@/types";

export type KYCStatus = "none" | "basic" | "full" | "pending";

export function mapKycStatus(apiStatus: KycStatusValue | string): KYCStatus {
  switch (apiStatus) {
    case "FULL_KYC":
      return "full";
    case "BASIC_KYC":
      return "basic";
    case "PENDING":
    case "PENDING_REVIEW":
      return "pending";
    // NO_KYC, REJECTED, or anything unknown → treat as not verified
    default:
      return "none";
  }
}

interface UserStore {
  kycStatus: KYCStatus;
  setKycStatus: (s: KYCStatus) => void;
  demoRole: string | null;
  setDemoRole: (r: string | null) => void;
}
const UserContext = createContext<UserStore>({
  kycStatus: "none",
  setKycStatus: () => {},
  demoRole: null,
  setDemoRole: () => {},
});

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [kycStatus, setKycStatusState] = useState<KYCStatus>("none");
  const [demoRole, setDemoRoleState] = useState<string | null>(null);

  // Initialize from localStorage on mount
  useState(() => {
    if (typeof window !== "undefined") {
      const savedKyc = localStorage.getItem("attend:demo:kyc");
      if (savedKyc) setKycStatusState(savedKyc as KYCStatus);
      const savedRole = localStorage.getItem("attend:demo:role");
      if (savedRole) setDemoRoleState(savedRole);
    }
  });

  const setKycStatus = (s: KYCStatus) => {
    setKycStatusState(s);
    if (typeof window !== "undefined") {
      localStorage.setItem("attend:demo:kyc", s);
    }
  };

  const setDemoRole = (r: string | null) => {
    setDemoRoleState(r);
    if (typeof window !== "undefined") {
      if (r) localStorage.setItem("attend:demo:role", r);
      else localStorage.removeItem("attend:demo:role");
    }
  };

  return (
    <UserContext.Provider value={{ kycStatus, setKycStatus, demoRole, setDemoRole }}>
      {children}
    </UserContext.Provider>
  );
}
export const useUserStore = () => useContext(UserContext);

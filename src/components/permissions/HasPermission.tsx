// src/components/permissions/HasPermission.tsx
"use client";

import React from "react";
import usePermission from "@/hooks/usePermission";

type Props = {
  module: string; // e.g. "bopp_categories" or "um_users"
  action?: string; // optional: "view"|"add"|"update"|"delete"
  children?: React.ReactNode;
  fallback?: React.ReactNode; // optional
};

export default function HasPermission({ module, action, children, fallback = null }: Props) {
  const { can } = usePermission();
  if (can(module, action)) return <>{children}</>;
  return <>{fallback}</>;
}

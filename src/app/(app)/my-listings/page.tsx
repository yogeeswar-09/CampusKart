
"use client";

import { UserListings } from "@/components/profile/UserListings";
import { useAuth } from "@/hooks/use-auth";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";

export default function MyListingsPage() {
  const { isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8">
      <Suspense fallback={<div>Loading your listings...</div>}>
        <UserListings />
      </Suspense>
    </div>
  );
}

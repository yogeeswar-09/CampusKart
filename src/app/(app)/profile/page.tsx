"use client";

import { Suspense, useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UserInfoForm } from "@/components/profile/UserInfoForm";
import { UserListings } from "@/components/profile/UserListings";
import { ListingForm } from '@/components/listings/ListingForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings, ListChecks, Edit, Loader2, ShoppingBag, Package, CheckCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Listing } from '@/types';

interface UserStats {
  total: number;
  available: number;
  sold: number;
}

function ProfilePageContent() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isLoading: authLoading } = useAuth();
  
  const [listingToEdit, setListingToEdit] = useState<Listing | undefined>(undefined);
  const [editingListingLoading, setEditingListingLoading] = useState(false);

  const [userStats, setUserStats] = useState<UserStats>({ total: 0, available: 0, sold: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  const currentTab = searchParams.get('tab') || "listings";
  const editListingId = searchParams.get('editListing');
  
  useEffect(() => {
    const fetchListingForEdit = async () => {
      if (editListingId && user) {
        setEditingListingLoading(true);
        try {
          const listingRef = doc(db, "listings", editListingId);
          const docSnap = await getDoc(listingRef);
          if (docSnap.exists()) {
            const fetchedListingData = docSnap.data();
            const fetchedListing = { 
              id: docSnap.id, 
              ...fetchedListingData, 
              createdAt: (fetchedListingData.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
              updatedAt: (fetchedListingData.updatedAt as Timestamp)?.toDate().toISOString() || new Date().toISOString()
            } as Listing;
            if (fetchedListing.sellerId === user.uid) {
              setListingToEdit(fetchedListing);
            }
          }
        } catch (err) {
          console.error("Error fetching listing for edit:", err);
        } finally {
          setEditingListingLoading(false);
        }
      } else {
        setListingToEdit(undefined);
      }
    };
    fetchListingForEdit();
  }, [editListingId, user]);

  useEffect(() => {
    const fetchUserStats = async () => {
      if (user?.uid) {
        setIsLoadingStats(true);
        try {
          const listingsRef = collection(db, "listings");
          const q = query(listingsRef, where("sellerId", "==", user.uid));
          const querySnapshot = await getDocs(q);
          
          let total = 0;
          let available = 0;
          let sold = 0;

          querySnapshot.forEach((doc) => {
            const listingData = doc.data() as Listing;
            total++;
            if (listingData.status === 'sold') {
              sold++;
            } else {
              available++;
            }
          });
          setUserStats({ total, available, sold });
        } catch (error) {
          console.error("Error fetching user listing stats:", error);
          setUserStats({ total: 0, available: 0, sold: 0 });
        } finally {
          setIsLoadingStats(false);
        }
      }
    };
    if (!authLoading) {
        fetchUserStats();
    }
  }, [user, authLoading]);

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
  };

  const handleTabChange = (value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('editListing');
    params.set('tab', value);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  if (authLoading) {
    return (
      <div className="container mx-auto py-8 space-y-6">
        <Card className="mb-10 shadow-lg overflow-hidden">
          <CardHeader className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 p-6 bg-gradient-to-r from-primary/10 via-card to-accent/5">
            <Skeleton className="h-20 w-20 rounded-full bg-muted/70" />
            <div className="space-y-2 text-center sm:text-left">
              <Skeleton className="h-7 w-48 bg-muted/70" />
              <Skeleton className="h-5 w-64 bg-muted/70" />
              <Skeleton className="h-4 w-32 bg-muted/70" />
            </div>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border divide-x divide-border">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="p-4 sm:p-6 text-center bg-card">
                <Skeleton className="h-8 w-8 mx-auto mb-2 bg-muted/70" />
                <Skeleton className="h-6 w-12 mx-auto mb-1 bg-muted/70" />
                <Skeleton className="h-4 w-24 mx-auto bg-muted/70" />
              </div>
            ))}
          </CardContent>
        </Card>
        <Skeleton className="h-10 w-full md:w-1/2 mb-6 bg-muted/70" />
        <Card>
          <CardHeader><Skeleton className="h-8 w-1/4 bg-muted/70" /></CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-20 w-full bg-muted/70" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (editListingId) {
    if (editingListingLoading) {
      return (
        <div className="container mx-auto py-8 text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
          <p>Loading listing for editing...</p>
        </div>
      );
    }
    if (listingToEdit) {
      return (
        <div className="container mx-auto py-8">
          <h1 className="text-3xl font-bold text-foreground mb-8 flex items-center">
            <Edit className="mr-3 h-7 w-7 text-primary" /> Edit Listing
          </h1>
          <ListingForm listing={listingToEdit} />
        </div>
      );
    }
  }

  return (
    <div className="container mx-auto py-8">
      {user && (
        <div className="mb-10 animate-pulsing-glow-border rounded-lg">
          <Card className="overflow-hidden">
            <CardHeader className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6 p-6 bg-gradient-to-r from-primary/10 via-card to-accent/5">
              <Avatar className="h-20 w-20 text-2xl border-2 border-primary shadow-md">
                <AvatarImage src={user.avatarUrl} alt={user.name || "User Avatar"} />
                <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="text-center sm:text-left">
                <CardTitle className="text-3xl font-bold text-foreground">{user.name}</CardTitle>
                <CardDescription className="text-md text-muted-foreground mt-1">{user.email}</CardDescription>
                <CardDescription className="text-sm text-muted-foreground mt-0.5">{user.year} - {user.branch}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 sm:grid-cols-3 gap-px bg-border divide-x divide-border">
              {isLoadingStats ? (
                [...Array(3)].map((_, i) => (
                  <div key={i} className="p-4 sm:p-6 text-center bg-card">
                    <Skeleton className="h-8 w-8 mx-auto mb-2 bg-muted/70" />
                    <Skeleton className="h-6 w-12 mx-auto mb-1 bg-muted/70" />
                    <Skeleton className="h-4 w-24 mx-auto bg-muted/70" />
                  </div>
                ))
              ) : (
                <>
                  <div className="p-4 sm:p-6 text-center bg-card">
                    <Package className="h-8 w-8 text-primary mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{userStats.total}</p>
                    <p className="text-sm text-muted-foreground">Total Listings</p>
                  </div>
                  <div className="p-4 sm:p-6 text-center bg-card">
                    <CheckCircle className="h-8 w-8 text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{userStats.available}</p>
                    <p className="text-sm text-muted-foreground">Available</p>
                  </div>
                  <div className="p-4 sm:p-6 text-center bg-card">
                    <ShoppingBag className="h-8 w-8 text-red-500 mx-auto mb-2" />
                    <p className="text-2xl font-bold text-foreground">{userStats.sold}</p>
                    <p className="text-sm text-muted-foreground">Sold</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:w-1/2 mb-6 bg-muted p-1 rounded-lg">
          <TabsTrigger value="listings" className="py-2.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <ListChecks className="mr-2 h-5 w-5" /> My Listings
          </TabsTrigger>
          <TabsTrigger value="settings" className="py-2.5 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-sm">
            <Settings className="mr-2 h-5 w-5" /> Account Settings
          </TabsTrigger>
        </TabsList>
        <TabsContent value="listings">
          <UserListings />
        </TabsContent>
        <TabsContent value="settings">
          <div className="max-w-2xl mx-auto">
            <UserInfoForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}


export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center"><Loader2 className="h-12 w-12 animate-spin text-primary" /></div>}>
      <ProfilePageContent />
    </Suspense>
  );
}
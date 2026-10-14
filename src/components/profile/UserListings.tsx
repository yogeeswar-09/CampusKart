"use client";

import { useEffect, useState } from 'react';
import type { Listing } from '@/types';
import { useAuth } from '@/hooks/use-auth';
import { ItemCard } from '@/components/browse/ItemCard';
import { Button } from '@/components/ui/button';
import { Edit3, PlusCircle, Trash2, Frown, Loader2, ShoppingBag, Undo2 } from 'lucide-react';
import Link from 'next/link';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '../ui/skeleton';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, Timestamp, updateDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export function UserListings() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [userListings, setUserListings] = useState<Listing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState<string | null>(null);

  useEffect(() => {
    const fetchListings = async () => {
      if (!user) return;
      setIsLoading(true);
      try {
        const listingsRef = collection(db, "listings");
        const q = query(listingsRef, where("sellerId", "==", user.uid), orderBy("createdAt", "desc"));
        const querySnapshot = await getDocs(q);
        const listings = querySnapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: (doc.data().createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
        } as Listing));
        setUserListings(listings);
      } catch (error) {
        toast({ title: "Error", description: "Could not fetch your listings.", variant: "destructive" });
      } finally {
        setIsLoading(false);
      }
    };
    fetchListings();
  }, [user, toast]);

  const handleDeleteListing = async (listing: Listing) => {
    const listingRef = doc(db, "listings", listing.id);
    deleteDoc(listingRef).then(() => {
      setUserListings(prev => prev.filter(item => item.id !== listing.id));
      toast({ title: "Listing Deleted" });
    }).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: listingRef.path,
        operation: 'delete',
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };

  const handleStatusToggle = async (listing: Listing) => {
    const newStatus = listing.status === 'sold' ? 'available' : 'sold';
    setIsUpdatingStatus(listing.id);
    const listingRef = doc(db, "listings", listing.id);
    const updateData = { status: newStatus, updatedAt: serverTimestamp() };

    updateDoc(listingRef, updateData).then(() => {
      setUserListings(prev => prev.map(item => item.id === listing.id ? { ...item, status: newStatus } : item));
      toast({ title: `Marked as ${newStatus}` });
    }).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: listingRef.path,
        operation: 'update',
        requestResourceData: updateData,
      });
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setIsUpdatingStatus(null);
    });
  };

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="animate-spin inline mr-2" /> Loading...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">My Listings</h2>
        <Link href="/create-listing"><Button><PlusCircle className="mr-2 h-4 w-4" /> New Listing</Button></Link>
      </div>

      {userListings.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {userListings.map(item => (
            <div key={item.id} className="relative group">
              <ItemCard item={item} />
              <div className="absolute top-2 right-2 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <Button variant="secondary" size="sm" onClick={() => handleStatusToggle(item)} disabled={isUpdatingStatus === item.id}>
                  {item.status === 'sold' ? <><Undo2 className="h-4 w-4 mr-2" /> Make Available</> : <><ShoppingBag className="h-4 w-4 mr-2" /> Mark Sold</>}
                </Button>
                <Link href={`/profile?editListing=${item.id}`}><Button variant="secondary" size="sm"><Edit3 className="h-4 w-4 mr-2" /> Edit</Button></Link>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button variant="destructive" size="sm"><Trash2 className="h-4 w-4 mr-2" /> Delete</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Delete Listing?</AlertDialogTitle></AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={() => handleDeleteListing(item)}>Delete</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-20 bg-muted/30 rounded-lg">
          <Frown className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
          <p>No listings found. Start selling today!</p>
        </div>
      )}
    </div>
  );
}

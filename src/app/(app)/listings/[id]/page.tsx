"use client";

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import type { Listing, User } from '@/types';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Edit3, Loader2, AlertTriangle, ShoppingBag, HandCoins, MessageCircle } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { doc, getDoc, Timestamp, collection, serverTimestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

export default function ListingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const [listing, setListing] = useState<Listing | null>(null);
  const [seller, setSeller] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isOfferDialogOpen, setIsOfferDialogOpen] = useState(false);
  const [offerPrice, setOfferPrice] = useState('');
  const [isSendingOffer, setIsSendingOffer] = useState(false);
  const { toast } = useToast();

  const id = params.id as string;

  useEffect(() => {
    const fetchListingAndSeller = async () => {
      if (!id) return;
      setIsLoading(true);

      try {
        const listingRef = doc(db, "listings", id);
        const listingSnap = await getDoc(listingRef);

        if (listingSnap.exists()) {
          const rawData = listingSnap.data();
          const fetchedListingData = {
            id: listingSnap.id,
            ...rawData,
            createdAt: (rawData.createdAt as Timestamp)?.toDate().toISOString() || new Date().toISOString(),
          } as Listing;
          setListing(fetchedListingData);

          if (fetchedListingData.sellerId) {
            const sellerRef = doc(db, "users", fetchedListingData.sellerId);
            const sellerSnap = await getDoc(sellerRef);
            if (sellerSnap.exists()) {
              setSeller({ uid: sellerSnap.id, ...sellerSnap.data() } as User);
            }
          }
        }
      } catch (error: any) {
        toast({
          title: "Error Loading Item",
          description: "Could not load item details.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchListingAndSeller();
  }, [id, toast]);

  const handleSendOffer = async () => {
    if (!currentUser || !seller || !listing) return;
    if (!offerPrice || isNaN(parseFloat(offerPrice)) || parseFloat(offerPrice) <= 0) return;

    setIsSendingOffer(true);
    const offerMessage = `Hi! I would like to make an offer of ₹${parseFloat(offerPrice).toFixed(2)} for your item: "${listing.title}".`;
    const sortedUids = [currentUser.uid, seller.uid].sort();
    const conversationId = sortedUids.join('_');
    const conversationDocRef = doc(db, "conversations", conversationId);

    try {
        const batch = writeBatch(db);
        const newMessageRef = doc(collection(db, "conversations", conversationId, "messages"));
        const messageData = {
            senderId: currentUser.uid,
            receiverId: seller.uid,
            text: offerMessage,
            timestamp: serverTimestamp(),
            isRead: false,
        };
        batch.set(newMessageRef, messageData);

        const convoSnap = await getDoc(conversationDocRef);
        const currentUnreadCount = convoSnap.data()?.unreadCount?.[seller.uid] || 0;

        const conversationData: any = {
            participantUids: sortedUids,
            lastMessage: {
                text: offerMessage,
                senderId: currentUser.uid,
                timestamp: serverTimestamp(),
            },
            updatedAt: serverTimestamp(),
            [`unreadCount.${seller.uid}`]: currentUnreadCount + 1,
            [`unreadCount.${currentUser.uid}`]: 0,
        };
        
        if (!convoSnap.exists()) {
            conversationData.createdAt = serverTimestamp();
        }

        batch.set(conversationDocRef, conversationData, { merge: true });
        
        batch.commit().then(() => {
          toast({ title: "Offer Sent!", description: "Your offer has been sent to the seller." });
          setIsOfferDialogOpen(false);
          setOfferPrice('');
          router.push(`/chat?chatId=${conversationId}`);
        }).catch(async () => {
          const permissionError = new FirestorePermissionError({
            path: conversationDocRef.path,
            operation: 'write',
            requestResourceData: conversationData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });

    } catch (error: any) {
        toast({ title: "Failed to Send Offer", description: "An unexpected error occurred.", variant: "destructive" });
    } finally {
        setIsSendingOffer(false);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 px-4">
        <Skeleton className="w-full h-96 rounded-lg mb-8" />
        <Skeleton className="h-10 w-1/2 mb-4" />
        <Skeleton className="h-6 w-1/4 mb-8" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="container mx-auto py-8 text-center">
        <AlertTriangle className="mx-auto h-16 w-16 text-destructive mb-4" />
        <h3 className="text-xl font-semibold text-foreground mb-2">Listing not found</h3>
      </div>
    );
  }

  const getSellerInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
  };
  
  const timeAgo = listing.createdAt ? formatDistanceToNow(new Date(listing.createdAt as string), { addSuffix: true }) : 'unknown';

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="grid md:grid-cols-5 gap-8 lg:gap-12">
        <div className="md:col-span-3">
          <div className="relative w-full aspect-video overflow-hidden rounded-lg shadow-lg bg-gradient-to-br from-primary/20 to-accent/20 mb-4">
            <Image
              src={listing.imageUrl}
              alt={listing.title}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 50vw"
              className="object-contain"
              priority
            />
             {listing.status === 'sold' && (
                <div className="absolute top-3 right-3 bg-destructive/90 text-destructive-foreground py-1.5 px-4 rounded-md text-sm font-semibold shadow-lg flex items-center">
                    <ShoppingBag className="mr-2 h-4 w-4" /> SOLD
                </div>
            )}
          </div>
        </div>

        <div className="md:col-span-2">
          <Card className="shadow-xl">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-3xl font-bold text-foreground">{listing.title}</CardTitle>
                <Badge variant="secondary" className="text-sm ml-2">{listing.category}</Badge>
              </div>
              <div className="flex items-baseline gap-3 mt-2">
                  <p className="text-3xl font-extrabold text-primary">
                      ₹{listing.price.toFixed(2)}
                  </p>
                  {listing.originalPrice && listing.originalPrice > listing.price && (
                      <p className="text-xl font-normal text-muted-foreground line-through">
                          ₹{listing.originalPrice.toFixed(2)}
                      </p>
                  )}
              </div>
              <p className="text-xs text-muted-foreground mt-1">Listed {timeAgo}</p>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground leading-relaxed mb-6">{listing.description}</p>
              
              {seller && (
                <div className="border-t pt-6">
                  <h3 className="text-md font-semibold text-foreground mb-3">Seller Information</h3>
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={seller.avatarUrl} alt={seller.name} />
                      <AvatarFallback>{getSellerInitials(seller.name)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-foreground">{seller.name}</p>
                      <p className="text-sm text-muted-foreground">{seller.email}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="mt-8 flex flex-col gap-3">
                {currentUser?.uid === seller?.uid ? (
                  <Link href={`/profile?editListing=${listing.id}`} passHref legacyBehavior>
                    <Button size="lg" variant="outline" className="w-full text-base border-primary text-primary hover:bg-primary/10">
                       <Edit3 className="mr-2 h-5 w-5" /> Edit Your Listing
                    </Button>
                  </Link>
                ) : listing.status !== 'sold' ? (
                  <>
                    <Link href={`/chat?newChatWith=${listing.sellerId}&itemId=${listing.id}`} passHref legacyBehavior>
                      <Button size="lg" className="w-full bg-accent hover:bg-accent/90 text-accent-foreground text-base" disabled={!listing.sellerId}>
                        <MessageCircle className="mr-2 h-5 w-5" /> Chat with Seller
                      </Button>
                    </Link>
                    <Dialog open={isOfferDialogOpen} onOpenChange={setIsOfferDialogOpen}>
                      <DialogTrigger asChild>
                          <Button size="lg" variant="outline" className="w-full text-base" disabled={!listing.sellerId}>
                              <HandCoins className="mr-2 h-5 w-5" /> Make an Offer
                          </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Make an Offer for "{listing.title}"</DialogTitle>
                          <DialogDescription>
                            Your offer will be sent directly to the seller as a chat message. The seller's asking price is ₹{listing.price.toFixed(2)}.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="grid gap-4 py-4">
                          <div className="grid grid-cols-4 items-center gap-4">
                            <Label htmlFor="offer-price" className="text-right">
                              Offer (₹)
                            </Label>
                            <Input
                              id="offer-price"
                              type="number"
                              value={offerPrice}
                              onChange={(e) => setOfferPrice(e.target.value)}
                              className="col-span-3"
                              placeholder="e.g., 999.00"
                            />
                          </div>
                        </div>
                        <DialogFooter>
                          <DialogClose asChild>
                            <Button type="button" variant="secondary">Cancel</Button>
                          </DialogClose>
                          <Button onClick={handleSendOffer} disabled={isSendingOffer || !offerPrice}>
                            {isSendingOffer && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Send Offer
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </>
                ) : (
                   <p className="text-center text-muted-foreground font-semibold p-3 bg-muted rounded-md">
                    <ShoppingBag className="inline-block mr-2 h-5 w-5" /> This item has been sold.
                   </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

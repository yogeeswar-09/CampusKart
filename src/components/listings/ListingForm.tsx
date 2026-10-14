"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import type { Listing } from '@/types';
import { mockCategories } from '@/lib/mock-data';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { useRouter } from 'next/navigation';
import { Loader2, UploadCloud, AlertTriangle } from 'lucide-react';
import Image from 'next/image';
import { useState, ChangeEvent, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const listingSchema = z.object({
  title: z.string().min(5, "Title must be at least 5 characters.").max(100, "Title too long."),
  description: z.string().min(20, "Description must be at least 20 characters.").max(1000, "Description too long."),
  price: z.coerce.number().positive("Price must be a positive number.").min(0.01, "Price must be greater than 0."),
  originalPrice: z.preprocess(
    (val) => (val === "" || val === null ? undefined : val),
    z.coerce.number().positive("Original price must be positive.").optional()
  ),
  category: z.enum(mockCategories as [string, ...string[]], { required_error: "Category is required." }),
  imageUrl: z.string().url("Image URL is required if not uploading a file.").optional().or(z.literal('')),
}).refine(data => !data.originalPrice || data.originalPrice > data.price, {
    message: "Original price must be greater than the selling price.",
    path: ["originalPrice"],
});

type ListingFormValues = z.infer<typeof listingSchema>;

interface ListingFormProps {
  listing?: Listing;
  onSubmitSuccess?: (listingId: string) => void;
}

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);
  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
    method: 'POST',
    body: formData,
  });
  const data = await response.json();
  return data.secure_url;
}

export function ListingForm({ listing, onSubmitSuccess }: ListingFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const form = useForm<ListingFormValues>({
    resolver: zodResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      price: undefined, 
      originalPrice: undefined,
      category: undefined,
      imageUrl: '',
    },
  });

  useEffect(() => {
    if (listing) {
      form.reset({
        title: listing.title,
        description: listing.description,
        price: listing.price,
        originalPrice: listing.originalPrice,
        category: listing.category,
        imageUrl: listing.imageUrl || '',
      });
      setImagePreview(listing.imageUrl || null);
    }
  }, [listing, form]);

  const handleImageUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const onSubmit = async (data: ListingFormValues) => {
    if (!user) return;
    setIsLoading(true);
    let finalImageUrl = data.imageUrl;

    try {
      if (imageFile) {
        setIsUploadingImage(true);
        finalImageUrl = await uploadToCloudinary(imageFile);
        setIsUploadingImage(false);
      }

      if (!finalImageUrl) {
        toast({ title: "Image Required", description: "Please upload an image or provide a URL.", variant: "destructive" });
        setIsLoading(false);
        return;
      }

      const listingData: any = {
        title: data.title,
        description: data.description,
        price: data.price,
        originalPrice: data.originalPrice || undefined,
        category: data.category,
        imageUrl: finalImageUrl,
        sellerId: user.uid,
        status: 'available',
        updatedAt: serverTimestamp(),
      };

      if (listing) { 
        const listingRef = doc(db, "listings", listing.id);
        updateDoc(listingRef, listingData).then(() => {
          toast({ title: "Listing Updated!" });
          if (onSubmitSuccess) onSubmitSuccess(listing.id);
          else router.push(`/listings/${listing.id}`);
        }).catch(async () => {
          const permissionError = new FirestorePermissionError({
            path: listingRef.path,
            operation: 'update',
            requestResourceData: listingData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      } else { 
        listingData.createdAt = serverTimestamp();
        addDoc(collection(db, "listings"), listingData).then((docRef) => {
          toast({ title: "Listing Created!" });
          if (onSubmitSuccess) onSubmitSuccess(docRef.id);
          else router.push(`/listings/${docRef.id}`);
        }).catch(async () => {
          const permissionError = new FirestorePermissionError({
            path: 'listings',
            operation: 'create',
            requestResourceData: listingData,
          });
          errorEmitter.emit('permission-error', permissionError);
        });
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto shadow-xl">
      <CardHeader>
        <CardTitle>{listing ? 'Edit Your Listing' : 'Create a New Listing'}</CardTitle>
        <CardDescription>Fill in the details below to sell your item.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl><Textarea {...field} rows={5} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Price (₹)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="originalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Original Price (₹)</FormLabel>
                    <FormControl><Input type="number" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Category</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {mockCategories.map(cat => <SelectItem key={cat} value={cat}>{cat}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="space-y-2">
              <FormLabel>Image</FormLabel>
              <div className="flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-4 bg-muted/50">
                {imagePreview ? (
                  <Image src={imagePreview} alt="Preview" width={200} height={200} className="object-contain max-h-40 rounded" />
                ) : (
                  <UploadCloud className="w-10 h-10 text-muted-foreground" />
                )}
                <Input type="file" className="mt-4" accept="image/*" onChange={handleImageUpload} />
                <p className="text-xs text-muted-foreground mt-2">OR</p>
                <FormField
                  control={form.control}
                  name="imageUrl"
                  render={({ field }) => (
                    <Input {...field} placeholder="Paste image URL here" className="mt-2" />
                  )}
                />
              </div>
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {listing ? 'Update Listing' : 'Create Listing'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

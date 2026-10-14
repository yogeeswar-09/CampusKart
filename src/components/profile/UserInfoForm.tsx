"use client";

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuth } from '@/hooks/use-auth';
import { Loader2, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChangeEvent, useState, useEffect } from 'react';
import type { User as AppUser } from '@/types';
import { userYears, userBranches } from '@/types';
import { db } from '@/lib/firebase';
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name is too long."),
  year: z.enum(userYears, { required_error: "Please select your year." }),
  branch: z.enum(userBranches, { required_error: "Please select your branch." }),
  phone: z.string().optional(),
  avatarUrl: z.string().url().optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

export function UserInfoForm() {
  const { user, firebaseUser, isLoading: authLoading, updateUserProfile, toast } = useAuth();
  const [formLoading, setFormLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: '',
      year: undefined,
      branch: undefined,
      phone: '',
      avatarUrl: '',
    },
  });
  
  useEffect(() => {
    if (user) {
      form.reset({
        name: user.name || '',
        year: user.year || undefined,
        branch: user.branch || undefined,
        phone: user.contactInfo?.phone || '',
        avatarUrl: user.avatarUrl || '', 
      });
      setAvatarPreview(user.avatarUrl || null);
    }
  }, [user, form]);

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !firebaseUser) return;
    setFormLoading(true);

    const updatePayload = {
      name: data.name,
      year: data.year,
      branch: data.branch,
      contactInfo: { phone: data.phone || undefined },
      avatarUrl: data.avatarUrl || undefined,
      updatedAt: serverTimestamp(),
    };

    const userDocRef = doc(db, "users", firebaseUser.uid);
    updateDoc(userDocRef, updatePayload).then(() => {
      updateUserProfile(data);
      toast({ title: "Profile Updated" });
    }).catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: userDocRef.path,
        operation: 'update',
        requestResourceData: updatePayload,
      });
      errorEmitter.emit('permission-error', permissionError);
    }).finally(() => {
      setFormLoading(false);
    });
  };

  if (authLoading || !user) return <div className="text-center p-8">Loading profile...</div>;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal details.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <Avatar className="h-32 w-32">
                <AvatarImage src={avatarPreview || undefined} />
                <AvatarFallback className="text-3xl">{user.name?.[0]}</AvatarFallback>
              </Avatar>
              <FormField
                control={form.control}
                name="avatarUrl"
                render={({ field }) => (
                  <Input {...field} placeholder="Avatar URL" onChange={(e) => { field.onChange(e); setAvatarPreview(e.target.value); }} />
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Year" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {userYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger><SelectValue placeholder="Branch" /></SelectTrigger></FormControl>
                      <SelectContent>
                        {userBranches.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </FormItem>
                )}
              />
            </div>
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" className="w-full" disabled={formLoading}>
              {formLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

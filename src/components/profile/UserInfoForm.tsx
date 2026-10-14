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
import { Loader2, AlertTriangle, Camera } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ChangeEvent, useState, useEffect } from 'react';
import type { User as AppUser, UserYear, UserBranch } from '@/types';
import { userYears, userBranches } from '@/types';

const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(50, "Name is too long."),
  year: z.enum(userYears, { required_error: "Please select your year of study." }),
  branch: z.enum(userBranches, { required_error: "Please select your branch." }),
  phone: z.string().optional().refine(val => !val || /^\d{10,15}$/.test(val), {
    message: "Invalid phone number (10-15 digits, or leave blank)."
  }).transform(val => val || ""), 
  avatarUrl: z.string().url("Invalid URL. Please provide a valid image URL or leave blank to keep current.").optional().or(z.literal('')),
});

type ProfileFormValues = z.infer<typeof profileSchema>;

const CLOUDINARY_CLOUD_NAME = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;
const isCloudinaryConfigured = CLOUDINARY_CLOUD_NAME && CLOUDINARY_UPLOAD_PRESET;


async function uploadAvatarToCloudinary(file: File): Promise<string> {
  if (!isCloudinaryConfigured) {
    console.error("Cloudinary environment variables NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME or NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET are not set for avatar upload.");
    throw new Error("Avatar upload service is not configured. Please contact support.");
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET!);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME!}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Cloudinary avatar upload failed: ${errorData.error.message}`);
  }

  const data = await response.json();
  return data.secure_url;
}

export function UserInfoForm() {
  const { user, firebaseUser, isLoading: authLoading, updateUserProfile, toast } = useAuth();
  const [formLoading, setFormLoading] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);

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
      setAvatarFile(null); // Clear any pending file on user change
    }
  }, [user, form]);


  const handleAvatarUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!isCloudinaryConfigured) {
        toast({ title: "Avatar Upload Unavailable", description: "Avatar upload service is not configured. Please use the URL field or contact support.", variant: "destructive", duration: 7000});
        event.target.value = ''; 
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit for avatars
        toast({ title: "File Too Large", description: "Avatar image size should not exceed 2MB.", variant: "destructive"});
        event.target.value = '';
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      form.setValue('avatarUrl', ''); 
      form.clearErrors('avatarUrl');
    }
  };

  const handlePastedAvatarUrl = (url: string) => {
    form.setValue('avatarUrl', url);
    if (url) {
        setAvatarPreview(url);
        setAvatarFile(null); 
        form.clearErrors('avatarUrl');
    } else {
        setAvatarPreview(user?.avatarUrl || null); 
    }
  }

  const onSubmit = async (data: ProfileFormValues) => {
    if (!user || !firebaseUser) return;

    if (avatarFile && !isCloudinaryConfigured) {
      toast({ title: "Configuration Error", description: "Cannot upload avatar: Cloudinary is not configured. Please use the URL field or contact support.", variant: "destructive" });
      return;
    }
    setFormLoading(true);
    
    let finalAvatarUrlForUpdate: string | undefined | null = data.avatarUrl;

    if (avatarFile) {
      finalAvatarUrlForUpdate = await uploadAvatarToCloudinary(avatarFile);
    } else if (data.avatarUrl === '') {
      finalAvatarUrlForUpdate = null; // Indicates removal
    } else if (data.avatarUrl === user.avatarUrl) {
      finalAvatarUrlForUpdate = undefined; // Indicates no change from current
    }

    try {
      const updatePayload: Partial<AppUser> = {
        name: data.name,
        year: data.year,
        branch: data.branch,
        contactInfo: { phone: data.phone || undefined }, 
        avatarUrl: finalAvatarUrlForUpdate, 
      };
      
      await updateUserProfile(updatePayload); 
      setAvatarFile(null); 

    } catch (error: any) {
        console.error("Failed to update profile:", error);
    } finally {
        setFormLoading(false);
    }
  };

  const getInitials = (name: string | undefined) => {
    if (!name) return 'U';
    const names = name.split(' ');
    if (names.length === 1) return names[0].substring(0, 2).toUpperCase();
    return names[0][0].toUpperCase() + names[names.length - 1][0].toUpperCase();
  };
  
  if (authLoading || !user) {
    return <Card><CardContent className="p-6 text-center">Loading profile...</CardContent></Card>;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
        <CardDescription>Update your personal details. Your MLRIT email ({user.email}) cannot be changed here.</CardDescription>
      </CardHeader>
      <CardContent>
        {!isCloudinaryConfigured && (
            <div className="mb-6 p-3 bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 rounded-md flex items-start">
                <AlertTriangle className="h-5 w-5 mr-3 mt-0.5 shrink-0" />
                <div>
                <p className="font-semibold">Avatar Uploads Disabled</p>
                <p className="text-sm">Direct avatar uploads are currently unavailable. Please paste an image URL instead. Contact support if this issue persists.</p>
                </div>
            </div>
        )}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
            <FormItem className="flex flex-col items-center space-y-4">
              <FormLabel className="text-center">Profile Picture</FormLabel>
              <Avatar className="h-32 w-32">
                <AvatarImage src={avatarPreview || undefined} alt={user.name || "User Avatar"} />
                <AvatarFallback className="text-3xl">
                  {getInitials(form.getValues('name') || user.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col items-center gap-2 w-full max-w-xs">
                <Button type="button" variant="outline" size="sm" asChild className={`${!isCloudinaryConfigured ? 'opacity-50 cursor-not-allowed' : ''}`}>
                  <Label htmlFor="avatar-upload" className={`cursor-pointer ${!isCloudinaryConfigured ? 'cursor-not-allowed' : ''}`}>
                    <Camera className="mr-2 h-4 w-4" /> Upload New
                    <Input 
                      id="avatar-upload" 
                      type="file" 
                      className="hidden" 
                      accept="image/png, image/jpeg"
                      onChange={handleAvatarUpload}
                      disabled={formLoading || !isCloudinaryConfigured}
                    />
                  </Label>
                </Button>
                <span className="text-xs text-muted-foreground">OR</span>
                <FormField
                  control={form.control}
                  name="avatarUrl"
                  render={({ field }) => (
                     <Input 
                        type="text" 
                        placeholder="Paste image URL" 
                        className="text-sm"
                        value={field.value || ''}
                        onChange={(e) => {
                          field.onChange(e.target.value);
                          handlePastedAvatarUrl(e.target.value);
                        }}
                        disabled={formLoading || !!avatarFile}
                      />
                  )}
                />
                 <FormMessage>{form.formState.errors.avatarUrl?.message}</FormMessage>
              </div>
            </FormItem>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Your full name" {...field} disabled={formLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <FormItem>
              <FormLabel>Email (Verified)</FormLabel>
              <Input value={user.email} disabled className="bg-muted/50 cursor-not-allowed" />
              <FormDescription>Your MLRIT email is verified and cannot be changed.</FormDescription>
            </FormItem>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} 
                      disabled={formLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your year" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userYears.map(yearValue => (
                          <SelectItem key={yearValue} value={yearValue}>{yearValue}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
               <FormField
                control={form.control}
                name="branch"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Branch</FormLabel>
                    <Select 
                      onValueChange={field.onChange} 
                      value={field.value} 
                      disabled={formLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your branch" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {userBranches.map(branchValue => (
                          <SelectItem key={branchValue} value={branchValue}>{branchValue}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>


            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Phone Number</FormLabel>
                  <FormControl>
                    <Input type="tel" placeholder="e.g., 9876543210 (Optional)" {...field} value={field.value || ''} disabled={formLoading} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full bg-primary hover:bg-primary/90 text-primary-foreground" disabled={formLoading || authLoading}>
              {(formLoading || authLoading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}

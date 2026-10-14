"use client";

import type { User as AppUser, UserYear, UserBranch } from '@/types';
import { auth, db } from '@/lib/firebase';
import { 
  onAuthStateChanged, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut as firebaseSignOut,
  sendEmailVerification,
  updateProfile as updateFirebaseProfile,
  sendPasswordResetEmail,
  type User as FirebaseUserType
} from 'firebase/auth';
import { doc, setDoc, getDoc, serverTimestamp, updateDoc, Timestamp, type FieldValue } from 'firebase/firestore';
import React, { createContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: AppUser | null;
  firebaseUser: FirebaseUserType | null;
  isLoading: boolean;
  login: (email: string, pasword: string) => Promise<void>;
  signup: (name: string, email: string, pasword: string, year: UserYear, branch: UserBranch) => Promise<void>;
  logout: () => Promise<void>;
  updateUserProfile: (data: Partial<AppUser>, newAvatarFile?: File | null) => Promise<void>;
  resendVerificationEmail: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  toast: ReturnType<typeof useToast>['toast'];
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

const CLOUDINARY_CLOUD_NAME_CTX = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME;
const CLOUDINARY_UPLOAD_PRESET_CTX = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET;

async function uploadAvatarToCloudinaryCtx(file: File): Promise<string> {
  if (!CLOUDINARY_CLOUD_NAME_CTX || !CLOUDINARY_UPLOAD_PRESET_CTX) {
    throw new Error("Cloudinary environment variables not set for avatar upload (AuthContext).");
  }
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET_CTX);

  const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME_CTX}/image/upload`, {
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


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AppUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUserType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      setIsLoading(true); 
      if (fbUser) {
        setFirebaseUser(fbUser);
        try {
          const userDocRef = doc(db, "users", fbUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            const appUser: AppUser = { 
              uid: fbUser.uid, 
              ...userData,
              createdAt: (userData.createdAt as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
              updatedAt: (userData.updatedAt as Timestamp)?.toDate()?.toISOString() || undefined,
            } as AppUser;
            setUser(appUser);
          } else {
            setUser(null); 
          }
        } catch (error: any) {
          toast({ title: "Profile Error", description: `Failed to load user profile: ${error.message}. Please try refreshing.`, variant: "destructive" });
          setUser(null);
        } finally {
           setIsLoading(false);
        }
      } else {
        setFirebaseUser(null);
        setUser(null);
        setIsLoading(false);
      }
    });
    return () => unsubscribe();
  }, [toast]);

  useEffect(() => {
    if (isLoading) return;
    
    const isAuthRoute = pathname === '/login' || pathname === '/signup' || pathname === '/forgot-password';
    const isVerifyEmailRoute = pathname === '/verify-email';
    const isLandingPage = pathname === '/';
      
    if (firebaseUser) { 
      if (!firebaseUser.emailVerified) {
        if (!isVerifyEmailRoute && !isAuthRoute && !isLandingPage) {
          router.replace('/verify-email');
        }
      } else { 
        if (user) { 
          if (isAuthRoute || isVerifyEmailRoute || isLandingPage) {
            router.replace('/dashboard');
          }
        } else { 
          if (!isAuthRoute && !isVerifyEmailRoute && !isLandingPage) {
            toast({ title: "Session Issue", description: "Your user profile data could not be loaded. Please log in again.", variant: "destructive", duration: 7000 });
            firebaseSignOut(auth).catch(err => console.error("AuthContext: Error during forced logout:", err));
          }
        }
      }
    } else { 
      if (!isAuthRoute && !isVerifyEmailRoute && !isLandingPage) {
        router.replace('/login');
      }
    }
  }, [user, firebaseUser, isLoading, pathname, router, toast]);


  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      setIsLoading(false); 
      throw error; 
    }
  };

  const signup = async (name: string, email: string, password: string, year: UserYear, branch: UserBranch) => {
    setIsLoading(true);
    try {
      if (!email.endsWith('@mlrit.ac.in')) {
         const err = new Error('Only MLRIT email addresses (@mlrit.ac.in) are allowed.');
         toast({ title: "Invalid Email Domain", description: err.message, variant: "destructive" });
         throw err;
      }

      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const fbUser = userCredential.user;

      await updateFirebaseProfile(fbUser, { displayName: name });

      const userProfileData: Omit<AppUser, 'uid' | 'createdAt' | 'updatedAt'> & { createdAt: FieldValue, updatedAt: FieldValue } = {
        name,
        email,
        year,
        branch,
        avatarUrl: `https://placehold.co/150x150.png?text=${name.substring(0,2).toUpperCase()}`,
        contactInfo: {}, 
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      await setDoc(doc(db, "users", fbUser.uid), userProfileData);
      
      await sendEmailVerification(fbUser);
      toast({ 
        title: "Account Created!", 
        description: `Please verify your email. A verification link has been sent to ${fbUser.email}.`, 
        duration: 10000 
      });
    } catch (error: any) {
      setIsLoading(false); 
      throw error; 
    }
  };

  const logout = async () => {
    setIsLoading(true); 
    try {
        await firebaseSignOut(auth);
    } catch(error: any) {
        toast({ title: "Logout Failed", description: error.message || "Could not log you out.", variant: "destructive"});
        setIsLoading(false); 
    }
  };

  const updateUserProfile = async (data: Partial<AppUser>, newAvatarFile?: File | null) => {
    if (!firebaseUser || !user) {
      const err = new Error("User not authenticated for profile update.");
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
    setIsLoading(true);

    let finalAvatarUrl: string | undefined | null = data.avatarUrl; 

    if (newAvatarFile) {
      try {
        finalAvatarUrl = await uploadAvatarToCloudinaryCtx(newAvatarFile);
      } catch (uploadError: any) {
        toast({ title: "Avatar Upload Failed", description: uploadError.message, variant: "destructive" });
        setIsLoading(false);
        throw uploadError;
      }
    } else if (data.avatarUrl === '') { 
        finalAvatarUrl = null; 
    } else if (data.avatarUrl === undefined) { 
        finalAvatarUrl = user.avatarUrl;
    }
    
    try {
      const firestoreUpdateData: any = { updatedAt: serverTimestamp() };
      if (data.name !== undefined && data.name !== user.name) firestoreUpdateData.name = data.name;
      if (data.year !== undefined && data.year !== user.year) firestoreUpdateData.year = data.year;
      if (data.branch !== undefined && data.branch !== user.branch) firestoreUpdateData.branch = data.branch;
      if (data.contactInfo?.phone !== undefined) firestoreUpdateData['contactInfo.phone'] = data.contactInfo.phone || null;
      
      if (finalAvatarUrl !== user.avatarUrl) {
        firestoreUpdateData.avatarUrl = finalAvatarUrl === null ? null : finalAvatarUrl;
      }

      if (Object.keys(firestoreUpdateData).length > 1) { 
        const userDocRef = doc(db, "users", firebaseUser.uid);
        await updateDoc(userDocRef, firestoreUpdateData);
      }

      const firebaseProfileUpdates: { displayName?: string; photoURL?: string | null } = {};
      if (firestoreUpdateData.name && firestoreUpdateData.name !== firebaseUser.displayName) {
        firebaseProfileUpdates.displayName = firestoreUpdateData.name;
      }
      if (finalAvatarUrl !== firebaseUser.photoURL) { 
         firebaseProfileUpdates.photoURL = finalAvatarUrl === null ? null : finalAvatarUrl;
      }

      if (Object.keys(firebaseProfileUpdates).length > 0) {
        await updateFirebaseProfile(firebaseUser, firebaseProfileUpdates);
      }
      
       setUser(prevUser => prevUser ? ({
        ...prevUser,
        name: firestoreUpdateData.name ?? prevUser.name,
        year: firestoreUpdateData.year ?? prevUser.year,
        branch: firestoreUpdateData.branch ?? prevUser.branch,
        contactInfo: { phone: firestoreUpdateData['contactInfo.phone'] === null ? undefined : (firestoreUpdateData['contactInfo.phone'] ?? prevUser.contactInfo?.phone) },
        avatarUrl: finalAvatarUrl === null ? undefined : (finalAvatarUrl ?? prevUser.avatarUrl),
        updatedAt: new Date().toISOString(), 
      }) : null);
      
      toast({ title: "Profile Updated", description: "Your information has been saved." });
    } catch (error: any) {
      toast({ title: "Update Failed", description: error.message || "Could not update profile.", variant: "destructive" });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const resendVerificationEmail = async () => {
    if (!firebaseUser) {
      const err = new Error("No user logged in to resend verification email.");
      toast({ title: "Error", description: err.message, variant: "destructive" });
      throw err;
    }
    if (firebaseUser.emailVerified) {
      toast({ title: "Already Verified", description: "Your email is already verified." });
      router.replace('/dashboard'); 
      return;
    }
    setIsLoading(true);
    try {
      await sendEmailVerification(firebaseUser);
      toast({ title: "Verification Email Sent", description: "Please check your inbox." });
    } catch (error: any) {
      toast({ title: "Error Sending Email", description: error.message || "Could not resend email.", variant: "destructive" });
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const sendPasswordReset = async (email: string) => {
    setIsLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
      toast({ title: "Password Reset Email Sent", description: `If an account exists for ${email}, a reset link has been sent.` });
    } catch (error: any)
     {
      toast({ title: "Request Submitted", description: `If an account exists for ${email}, a reset link has been sent. Check spam if not found.`, variant: "default" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, firebaseUser, isLoading, login, signup, logout, updateUserProfile, resendVerificationEmail, sendPasswordReset, toast }}>
      {children}
    </AuthContext.Provider>
  );
};

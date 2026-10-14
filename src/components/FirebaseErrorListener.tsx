"use client";

import { useEffect } from 'react';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { useToast } from '@/hooks/use-toast';

export function FirebaseErrorListener() {
  const { toast } = useToast();

  useEffect(() => {
    const handlePermissionError = (error: FirestorePermissionError) => {
      if (process.env.NODE_ENV === 'development') {
        const message = `Firestore Error: ${error.context.operation} denied at ${error.context.path}.
Context: ${JSON.stringify(error.context.requestResourceData || {}, null, 2)}`;
        
        setTimeout(() => {
          throw new Error(message);
        }, 0);
      } else {
        toast({
          title: 'Permission Denied',
          description: 'You do not have permission to perform this action.',
          variant: 'destructive',
        });
      }
    };

    errorEmitter.on('permission-error', handlePermissionError);
    return () => {
      errorEmitter.off('permission-error', handlePermissionError);
    };
  }, [toast]);

  return null;
}

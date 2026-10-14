
"use client";

import { useState, useEffect, Suspense, useCallback } from 'react';
import { useSearchParams, useRouter, usePathname }  from 'next/navigation';
import { ChatList } from '@/components/chat/ChatList';
import { ChatMessages } from '@/components/chat/ChatMessages';
import { ChatInput } from '@/components/chat/ChatInput';
import { useAuth } from '@/hooks/use-auth';
import type { ChatConversation, ChatMessage, User } from '@/types';
import { Skeleton } from '@/components/ui/skeleton';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  updateDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
  Timestamp,
  writeBatch,
} from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';

const fetchUserDetails = async (uid: string): Promise<User | null> => {
  if (!uid) return null;
  try {
    const userDocRef = doc(db, "users", uid);
    const userDocSnap = await getDoc(userDocRef);
    if (userDocSnap.exists()) {
      return { uid: userDocSnap.id, ...userDocSnap.data() } as User;
    }
    return null;
  } catch (error) {
    console.error("Error fetching user details:", error);
    return null;
  }
};

function ChatPageContent() {
  const { user: currentUser, isLoading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [conversations, setConversations] = useState<ChatConversation[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoadingConversations, setIsLoadingConversations] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [otherParticipantDetails, setOtherParticipantDetails] = useState<User | null>(null);
  const [userCache, setUserCache] = useState<Map<string, User>>(new Map());

  const getCachedUserDetails = useCallback(async (uid: string): Promise<User | null> => {
    if (userCache.has(uid)) {
      return userCache.get(uid)!;
    }
    const user = await fetchUserDetails(uid);
    if (user) {
      setUserCache(prev => new Map(prev).set(uid, user));
    }
    return user;
  }, [userCache]);

  const handleSelectChat = (chatId: string) => {
    setSelectedChatId(chatId);
    const newParams = new URLSearchParams(searchParams.toString());
    newParams.set('chatId', chatId);
    router.push(`${pathname}?${newParams.toString()}`, { scroll: false });
  };

  useEffect(() => {
    if (!currentUser?.uid) {
      if (!authLoading) setIsLoadingConversations(false);
      return;
    }

    const q = query(
      collection(db, "conversations"),
      where("participantUids", "array-contains", currentUser.uid),
      orderBy("updatedAt", "desc")
    );

    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const convosPromises = querySnapshot.docs.map(async (docSnap) => {
        const data = docSnap.data();
        const otherUid = data.participantUids?.find((uid: string) => uid !== currentUser.uid);
        const otherUserDetails = otherUid ? await getCachedUserDetails(otherUid) : null;

        return {
          id: docSnap.id,
          ...data,
          participants: otherUserDetails && currentUser ? [currentUser, otherUserDetails] : (currentUser ? [currentUser] : []),
          updatedAt: (data.updatedAt as Timestamp | null)?.toDate()?.toISOString() || new Date().toISOString(),
          createdAt: (data.createdAt as Timestamp | null)?.toDate()?.toISOString() || new Date().toISOString(),
          lastMessage: data.lastMessage ? {
            ...data.lastMessage,
            timestamp: (data.lastMessage.timestamp as Timestamp | null)?.toDate()?.toISOString() || new Date().toISOString()
          } : undefined,
        } as ChatConversation;
      });

      const resolvedConvos = await Promise.all(convosPromises);
      
      // Filter out duplicate conversations between the same users
      const uniqueConvosMap = new Map<string, ChatConversation>();
      resolvedConvos.forEach(convo => {
        if (!convo.participantUids) return;
        const sortedPair = [...convo.participantUids].sort().join('_');
        const existing = uniqueConvosMap.get(sortedPair);
        
        // Keep the one with the most recent updatedAt
        if (!existing || new Date(convo.updatedAt as string) > new Date(existing.updatedAt as string)) {
          uniqueConvosMap.set(sortedPair, convo);
        }
      });

      const uniqueConvos = Array.from(uniqueConvosMap.values());
      setConversations(uniqueConvos);
      setIsLoadingConversations(false);
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: 'conversations',
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      setIsLoadingConversations(false);
    });

    return () => unsubscribe();
  }, [currentUser, authLoading, getCachedUserDetails]);

  useEffect(() => {
    const newChatWithUserId = searchParams.get('newChatWith');
    if (!newChatWithUserId || !currentUser?.uid) return;

    const findOrCreateChat = async () => {
        if (newChatWithUserId === currentUser.uid) {
            router.replace('/chat');
            return;
        }
        
        const sortedUids = [currentUser.uid, newChatWithUserId].sort();
        const conversationId = sortedUids.join('_');
        const conversationDocRef = doc(db, "conversations", conversationId);
        
        const docSnap = await getDoc(conversationDocRef);
        
        if (!docSnap.exists()) {
            const otherUser = await getCachedUserDetails(newChatWithUserId);
            if (otherUser) {
                const newConvoData = {
                    participantUids: sortedUids,
                    lastMessage: null,
                    unreadCount: { [currentUser.uid]: 0, [newChatWithUserId]: 0 },
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                setDoc(conversationDocRef, newConvoData)
                  .catch(async () => {
                    const permissionError = new FirestorePermissionError({
                      path: conversationDocRef.path,
                      operation: 'create',
                      requestResourceData: newConvoData,
                    });
                    errorEmitter.emit('permission-error', permissionError);
                  });
            }
        }

        const newParams = new URLSearchParams(searchParams.toString());
        newParams.delete('newChatWith');
        newParams.delete('itemId');
        newParams.set('chatId', conversationId);
        router.replace(`${pathname}?${newParams.toString()}`);
    };
    
    findOrCreateChat();
  }, [searchParams, currentUser, router, pathname, getCachedUserDetails]);

  useEffect(() => {
    if (isLoadingConversations || searchParams.has('newChatWith')) return;

    const chatIdFromUrl = searchParams.get('chatId');
    if (chatIdFromUrl) {
      if (conversations.some(c => c.id === chatIdFromUrl)) {
        if (selectedChatId !== chatIdFromUrl) {
          setSelectedChatId(chatIdFromUrl);
        }
      }
    } else if (conversations.length > 0 && !selectedChatId) {
      setSelectedChatId(conversations[0].id);
    }
  }, [conversations, isLoadingConversations, searchParams, selectedChatId]);

  useEffect(() => {
    if (!selectedChatId || !currentUser?.uid) {
      setMessages([]);
      setOtherParticipantDetails(null);
      return;
    }
    
    setIsLoadingMessages(true);
    const messagesQuery = query(
      collection(db, "conversations", selectedChatId, "messages"),
      orderBy("timestamp", "asc")
    );

    const unsubscribe = onSnapshot(messagesQuery, async (querySnapshot) => {
      const msgs: ChatMessage[] = querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
        timestamp: (docSnap.data().timestamp as Timestamp)?.toDate()?.toISOString() || new Date().toISOString(),
      } as ChatMessage));
      setMessages(msgs);
      setIsLoadingMessages(false);
      
      const currentConvoDetails = conversations.find(c => c.id === selectedChatId);
      if (currentConvoDetails && (currentConvoDetails.unreadCount?.[currentUser.uid] || 0) > 0) {
        const updateData = { [`unreadCount.${currentUser.uid}`]: 0 };
        updateDoc(doc(db, "conversations", selectedChatId), updateData)
          .catch(async () => {
            const permissionError = new FirestorePermissionError({
              path: `conversations/${selectedChatId}`,
              operation: 'update',
              requestResourceData: updateData,
            });
            errorEmitter.emit('permission-error', permissionError);
          });
      }
    }, (error) => {
      const permissionError = new FirestorePermissionError({
        path: `conversations/${selectedChatId}/messages`,
        operation: 'list',
      });
      errorEmitter.emit('permission-error', permissionError);
      setIsLoadingMessages(false);
    });
    
    const currentConvo = conversations.find(c => c.id === selectedChatId);
    if (currentConvo) {
        const otherParticipant = currentConvo.participants?.find(p => p.uid !== currentUser.uid);
        if (otherParticipant) {
            setOtherParticipantDetails(otherParticipant);
        }
    }

    return () => unsubscribe();
  }, [selectedChatId, currentUser?.uid, conversations]);

  const handleSendMessage = async (messageText: string) => {
    if (!currentUser?.uid || !selectedChatId) return;

    const currentConvo = conversations.find(c => c.id === selectedChatId);
    if (!currentConvo) return;

    const receiverUid = currentConvo.participantUids.find(uid => uid !== currentUser.uid);
    if (!receiverUid) return;
    
    const newMessageRef = doc(collection(db, "conversations", selectedChatId, "messages"));
    const messageData = {
      senderId: currentUser.uid,
      receiverId: receiverUid,
      text: messageText,
      timestamp: serverTimestamp(),
      isRead: false,
    };

    const conversationDocRef = doc(db, "conversations", selectedChatId);
    const currentUnreadCount = currentConvo.unreadCount?.[receiverUid] || 0;
    
    // Correctly nested update data for unreadCount
    const conversationUpdateData: any = {
      lastMessage: {
        text: messageText,
        senderId: currentUser.uid,
        timestamp: serverTimestamp(),
      },
      updatedAt: serverTimestamp(),
      unreadCount: {
        ...(currentConvo.unreadCount || {}),
        [receiverUid]: currentUnreadCount + 1,
        [currentUser.uid]: 0,
      }
    };

    const batch = writeBatch(db);
    batch.set(newMessageRef, messageData);
    batch.update(conversationDocRef, conversationUpdateData);

    batch.commit().catch(async () => {
      const permissionError = new FirestorePermissionError({
        path: conversationDocRef.path,
        operation: 'update',
        requestResourceData: { messageData, conversationUpdateData },
      });
      errorEmitter.emit('permission-error', permissionError);
    });
  };
  
  if (authLoading) {
    return (
      <div className="flex h-full">
        <div className="w-1/4 border-r p-4 space-y-3 hidden md:block">
          <Skeleton className="h-10 w-full mb-4" />
          {[...Array(5)].map((_, i) => (
            <div key={i} className="flex items-center space-x-3">
              <Skeleton className="h-12 w-12 rounded-full" />
              <div className="space-y-2 flex-1">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
        <div className="w-full md:w-3/4 flex flex-col">
          <div className="flex-1 p-4" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden">
      <div className="w-full md:w-1/4 lg:w-[300px] flex-shrink-0 border-r hidden md:flex md:flex-col">
        <ChatList
          conversations={conversations}
          currentUser={currentUser}
          selectedChatId={selectedChatId}
          onSelectChat={handleSelectChat}
          isLoading={isLoadingConversations}
        />
      </div>
      <div className="flex-1 grid grid-rows-[1fr_auto] bg-muted/20">
        <ChatMessages
          conversation={conversations.find(c => c.id === selectedChatId) || null} 
          messages={messages}
          currentUser={currentUser}
          isLoading={isLoadingMessages}
          otherParticipant={otherParticipantDetails} 
        />
        <ChatInput onSendMessage={handleSendMessage} disabled={!selectedChatId || isLoadingMessages} />
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="flex h-screen items-center justify-center">Loading chat...</div>}>
      <ChatPageContent />
    </Suspense>
  );
}

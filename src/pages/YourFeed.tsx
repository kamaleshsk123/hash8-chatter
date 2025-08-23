import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Heart, MessageCircle, Share, MoreHorizontal, Bookmark, Eye } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { AddPostInput } from "./AddPostInput";
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, updateDoc, doc, arrayUnion, arrayRemove } from "firebase/firestore";
import { db } from "../services/firebase";

interface YourFeedProps {
  onBack: () => void;
}

interface Post {
  id: string;
  user: { name: string; avatar: string };
  image?: string;
  text: string;
  comments: { id: string; user: string; text: string }[];
  reactions: { [emoji: string]: string[] };
  timestamp: Date;
  seenBy: string[];
  savedBy?: string[];
}

export const YourFeed: React.FC<YourFeedProps> = ({ onBack }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showWebAddButton, setShowWebAddButton] = useState(true);
  const addPostRef = useRef<HTMLDivElement>(null);
  const tabRef = useRef<HTMLDivElement>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const currentUserAvatar = "JD"; // The current user's avatar initials
  
  // Sample users for demo purposes (other users in the system)
  const sampleUsers = [
    { name: "Alice Johnson", avatar: "AJ" },
    { name: "Bob Smith", avatar: "BS" },
    { name: "Carol Davis", avatar: "CD" },
    { name: "David Wilson", avatar: "DW" },
    { name: "Emma Brown", avatar: "EB" }
  ];

  // Fetch posts from Firebase
  useEffect(() => {
    const fetchPosts = async () => {
      try {
        const postsCol = collection(db, "posts");
        const q = query(postsCol, orderBy("timestamp", "desc"));
        const postSnapshot = await getDocs(q);
        const postsData = postSnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate(), // Convert Firebase Timestamp to Date object
        })) as Post[];
        
        // If no posts found, add some sample posts for demo
        if (postsData.length === 0) {
          const samplePosts: Post[] = [
            {
              id: "sample-1",
              user: { name: "Alice Johnson", avatar: "AJ" },
              text: "Just finished an amazing project! Excited to share it with everyone 🚀",
              timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
              comments: [],
              reactions: { "👍": ["Bob Smith", "Carol Davis"], "❤️": ["David Wilson"] },
              seenBy: [],
            },
            {
              id: "sample-2",
              user: { name: "Bob Smith", avatar: "BS" },
              text: "Beautiful sunset today! Nature never fails to amaze me 🌅",
              image: "https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=500&h=300&fit=crop",
              timestamp: new Date(Date.now() - 4 * 60 * 60 * 1000), // 4 hours ago
              comments: [
                { id: "c1", user: "Alice Johnson", text: "Absolutely gorgeous!" },
                { id: "c2", user: "Emma Brown", text: "Where was this taken?" }
              ],
              reactions: { "😍": ["Alice Johnson", "Emma Brown", "Carol Davis"] },
              seenBy: [],
            },
            {
              id: "sample-3",
              user: { name: "Carol Davis", avatar: "CD" },
              text: "Learning something new every day! Today's topic: React hooks. The more I learn, the more I realize how much I don't know 😅",
              timestamp: new Date(Date.now() - 6 * 60 * 60 * 1000), // 6 hours ago
              comments: [
                { id: "c3", user: "David Wilson", text: "That's the spirit! Keep learning 💪" }
              ],
              reactions: { "💯": ["David Wilson", "Bob Smith"] },
              seenBy: [],
            }
          ];
          setPosts(samplePosts);
        } else {
          setPosts(postsData);
        }
      } catch (err) {
        console.error("Error fetching posts:", err);
        setError("Failed to load posts.");
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  useEffect(() => {
    const handleScroll = () => {
      if (addPostRef.current && tabRef.current) {
        const addPostRect = addPostRef.current.getBoundingClientRect();
        const tabRect = tabRef.current.getBoundingClientRect();
        setShowWebAddButton(addPostRect.bottom < tabRect.bottom);
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading feed...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-gradient-chat overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-chat-header border-b border-border flex items-center px-4 py-3 shadow-header">
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mr-2 sm:hidden"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold text-foreground">Your Feed</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 sm:pb-4">
        <div className="max-w-lg mx-auto space-y-6 pt-4">
          {/* Posts */}
          <AnimatePresence>
            {posts.length === 0 && !loading && !error ? (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-12 h-12 mb-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <rect x="3" y="7" width="18" height="13" rx="2" />
                  <path d="M16 3v4M8 3v4M3 11h18" />
                </svg>
                <div className="text-lg font-medium">No posts to show.</div>
              </div>
            ) : (
              posts.map((post) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Post Header */}
                      <div className="flex items-center gap-3 p-4 pb-2">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={post.user.avatar} alt={post.user.name} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {post.user.name.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{post.user.name}</h3>
                            <span className="text-muted-foreground text-xs">
                              {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="w-8 h-8">
                          <MoreHorizontal className="w-4 h-4" />
                        </Button>
                      </div>

                      {/* Post Content */}
                      <div className="px-4 pb-2">
                        <p className="text-sm leading-relaxed">{post.text}</p>
                      </div>

                      {/* Post Image */}
                      {post.image && (
                        <div className="relative">
                          <img
                            src={post.image}
                            alt="Post content"
                            className="w-full h-64 object-cover"
                          />
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>

        {/* Floating Add Button - Mobile */}
        <AnimatePresence>
          {showWebAddButton && (
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              className="fixed bottom-6 right-6 z-50 sm:hidden"
            >
              <Button
                size="icon"
                className="w-14 h-14 rounded-full shadow-lg"
                onClick={() => {
                  // Scroll to top to show add post input
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              >
                <Plus className="w-6 h-6" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Tab reference for scroll detection */}
        <div ref={tabRef} className="h-0" />
      </div>
    </div>
  );
};
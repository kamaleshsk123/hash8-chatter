import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Plus, Heart, MessageCircle, Share, MoreHorizontal, Bookmark, Eye, Menu } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { getUserOrganizations } from "@/services/firebase";
import { useAuth } from "@/context/AuthContext";

interface YourFeedProps {
  onBack: () => void;
}

interface Post {
  id: string;
  orgId: string;
  orgName: string;
  user: { name: string; avatar: string; role?: string };
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
  const { user: currentUser } = useAuth();

  // Aggregate posts from all user's organizations in real-time
  useEffect(() => {
    if (!currentUser?.uid) {
      setLoading(false);
      return;
    }

    let unsubscribes: (() => void)[] = [];

    const loadFeed = async () => {
      try {
        const orgs = await getUserOrganizations(currentUser.uid);
        
        if (orgs.length === 0) {
          setPosts([]);
          setLoading(false);
          return;
        }

        // Track posts by org so we can merge them
        const postsByOrg: Record<string, Post[]> = {};

        orgs.forEach((org: any) => {
          const postsCol = collection(db, `organizations/${org.id}/posts`);
          const q = query(postsCol, orderBy("timestamp", "desc"));

          const unsubscribe = onSnapshot(q, (snapshot) => {
            const orgPosts = snapshot.docs.map((doc) => ({
              id: doc.id,
              orgId: org.id,
              orgName: org.name || "Unknown Org",
              ...doc.data(),
              timestamp: doc.data().timestamp?.toDate() || new Date(),
            })) as Post[];

            postsByOrg[org.id] = orgPosts;

            // Merge all org posts and sort by timestamp
            const allPosts = Object.values(postsByOrg)
              .flat()
              .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

            setPosts(allPosts);
            setLoading(false);
          }, (err) => {
            console.error(`Error fetching posts for org ${org.id}:`, err);
          });

          unsubscribes.push(unsubscribe);
        });
      } catch (err) {
        console.error("Error loading feed:", err);
        setError("Failed to load your feed.");
        setLoading(false);
      }
    };

    loadFeed();

    return () => {
      unsubscribes.forEach((unsub) => unsub());
    };
  }, [currentUser?.uid]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-chat">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-4"></div>
        <div className="text-muted-foreground font-medium">Loading feed...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full w-full bg-gradient-chat">
        <div className="text-red-500 font-medium mb-2">Error loading feed</div>
        <div className="text-muted-foreground text-sm">{error}</div>
      </div>
    );
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
          <Menu className="w-5 h-5" />
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
                <div className="text-lg font-medium">No posts yet.</div>
                <div className="text-sm mt-1">Posts from your organizations will appear here.</div>
              </div>
            ) : (
              posts.map((post) => (
                <motion.div
                  key={`${post.orgId}-${post.id}`}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card className="overflow-hidden">
                    <CardContent className="p-0">
                      {/* Org Badge */}
                      <div className="px-4 pt-3 pb-0">
                        <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                          {post.orgName}
                        </span>
                      </div>
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
                            <h3 className="font-semibold text-sm">
                              {post.user.name === currentUser?.name ? "You" : post.user.name}
                            </h3>
                            <span className="text-muted-foreground text-xs">
                              {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
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

                      {/* Reactions and Stats */}
                      <div className="flex items-center justify-between px-4 py-2 border-t border-border">
                        <div className="flex items-center gap-2 flex-wrap">
                          {post.reactions && Object.keys(post.reactions).length > 0 && (
                            Object.entries(post.reactions).map(([emoji, users]) => (
                              <span
                                key={emoji}
                                className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground"
                              >
                                {emoji} {(users as string[]).length}
                              </span>
                            ))
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-muted-foreground text-xs">
                          {post.seenBy && (
                            <span className="flex items-center gap-1">
                              <Eye className="w-3.5 h-3.5" /> {post.seenBy.length}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};
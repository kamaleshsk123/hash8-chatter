import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bookmark,
  MessageCircle,
  Menu,
  Eye,
  Send,
  ArrowUp,
  ArrowUpIcon,
  List,
  User,
  Plus,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { AddPostInput } from "./AddPostInput";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { useSwipeable } from "react-swipeable";
import { collection, addDoc, serverTimestamp, query, orderBy, getDocs, updateDoc, doc, arrayUnion, arrayRemove, deleteDoc, onSnapshot } from "firebase/firestore";
import { db } from "../services/firebase";
import { useAuth } from "@/context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { RoleBadge } from "@/components/RoleBadge";

interface Post {
  id: string;
  user: { name: string; avatar: string; role?: string };
  image?: string;
  text: string;
  reactions: { [emoji: string]: string[] };
  timestamp: Date;
  seenBy: string[];
  savedBy?: string[];
}

interface Comment {
  id: string;
  user: string;
  avatar?: string;
  text: string;
  timestamp: Date;
}


const emojiList = ["👍", "❤️", "😂", "🎉"];

const tabOrder = ["all", "my", "saved"];
const tabLabels = {
  all: "All",
  my: "My Posts",
  saved: "Saved",
};

export const FeedDemo: React.FC<{ onBack: () => void; org: any }> = ({ onBack, org }) => {
  const [posts, setPosts] = useState<Post[]>([]);
  const [hasAddedTestPosts, setHasAddedTestPosts] = useState(false);
  

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddPostInput, setShowAddPostInput] = useState(false);
  const addPostRef = React.useRef<HTMLDivElement>(null);
  const feedAreaRef = React.useRef<HTMLDivElement>(null);
  const [showWebAddButton, setShowWebAddButton] = useState(false);
  const { user: currentUser } = useAuth();
  

  const [activeCommentPostId, setActiveCommentPostId] = useState<string | null>(
    null
  );
  const [commentText, setCommentText] = useState<string>("");
  const [showStickyTabs, setShowStickyTabs] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all", "my", "saved"
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [postToDelete, setPostToDelete] = useState<string | null>(null);
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [expandedComments, setExpandedComments] = useState<{ [postId: string]: boolean }>({});
  // Inside your component
  const tabRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  useEffect(() => {
    if (org && org.userRole) {
      console.log("User role from Organization Feed:", org.userRole);
    }
  }, [org]);

  // Fetch posts from Firebase in real-time
  useEffect(() => {
    const postsCol = collection(db, "posts");
    const q = query(postsCol, orderBy("timestamp", "desc"));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const postsData = querySnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        timestamp: doc.data().timestamp.toDate(), // Convert Firebase Timestamp to Date object
      })) as Post[];

      setPosts(postsData);
      setLoading(false);
      
      // Add test posts if no posts exist and we haven't added them yet
      if (postsData.length === 0 && !hasAddedTestPosts) {
        const testPosts: Post[] = [
          {
            id: 'test-admin-post',
            user: { name: 'Test Admin', avatar: '', role: 'admin' },
            text: '🔴 ADMIN POST - Moderators should NOT see delete button',
            timestamp: new Date(),
            reactions: {},
            seenBy: [],
            savedBy: []
          },
          {
            id: 'test-member-post',
            user: { name: 'Test Member', avatar: '', role: 'member' },
            text: '🟢 MEMBER POST - Admins and Moderators should see delete button',
            timestamp: new Date(),
            reactions: {},
            seenBy: [],
            savedBy: []
          }
        ];
        setPosts(testPosts);
        setHasAddedTestPosts(true);
      }
    }, (err) => {
      console.error("Error fetching posts:", err);
      setError("Failed to load posts.");
      setLoading(false);
    });

    // Unsubscribe from the listener when the component unmounts
    return () => unsubscribe();
  }, []);

  // Web: Show plus icon when AddPostInput is out of view
  useEffect(() => {
    if (window.innerWidth < 640) return;
    const feed = feedAreaRef.current;
    if (!feed || !addPostRef.current || !tabRef.current) return;

    const handleScroll = () => {
      const addPostRect = addPostRef.current!.getBoundingClientRect();
      const tabRect = tabRef.current!.getBoundingClientRect();
      // Show the up-arrow button if AddPostInput is hidden behind the sticky tabs
      setShowWebAddButton(addPostRect.bottom < tabRect.bottom);
    };

    feed.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    handleScroll();

    return () => {
      feed.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, [feedAreaRef, addPostRef, tabRef]);

  useEffect(() => {
    if (!showAddPostInput) return;
    // Only on mobile
    if (window.innerWidth >= 640) return;
    const container = document.querySelector(".feed-scroll-area");
    if (!container) return;
    const handleScroll = () => setShowAddPostInput(false);
    container.addEventListener("scroll", handleScroll);
    return () => container.removeEventListener("scroll", handleScroll);
  }, [showAddPostInput]);

  useEffect(() => {
    posts.forEach(async (post) => {
      if (!post.seenBy?.includes(currentUser)) {
        try {
          const postRef = doc(db, "posts", post.id);
          await updateDoc(postRef, {
            seenBy: arrayUnion(currentUser),
          });
          // Update local state after successful Firebase update
          setPosts((prev) =>
            prev.map((p) =>
              p.id === post.id
                ? { ...p, seenBy: [...(p.seenBy || []), currentUser] }
                : p
            )
          );
        } catch (error) {
          console.error("Error updating seenBy:", error);
        }
      }
    });
  }, [posts, currentUser]); // Depend on posts and currentUser

  useEffect(() => {
    const handleScroll = () => {
      if (!tabRef.current) return;
      const tabTop = tabRef.current.getBoundingClientRect().top;
      setIsSticky(tabTop <= 70); // 70 is approx height of your header + spacing
    };

    const feed = feedAreaRef.current;
    if (!feed) return;

    feed.addEventListener("scroll", handleScroll);
    window.addEventListener("resize", handleScroll);
    handleScroll();

    return () => {
      feed.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleScroll);
    };
  }, []);

  useEffect(() => {
    posts.forEach((post) => {
      const commentsCol = collection(db, "posts", post.id, "comments");
      const q = query(commentsCol, orderBy("timestamp", "asc"));

      const unsubscribe = onSnapshot(q, (querySnapshot) => {
        const commentsData = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          timestamp: doc.data().timestamp.toDate(),
        })) as Comment[];
        setComments((prev) => ({ ...prev, [post.id]: commentsData }));
      });

      return () => unsubscribe();
    });
  }, [posts]);

  const handleNewPost = async (newPost: { text: string; image?: string }) => {
    if (!currentUser) return;
    try {
      const postData = {
        user: {
          name: currentUser.name,
          avatar: currentUser.avatar || "",
          role: currentUser.role || 'member', // Store author's role at time of posting
        },
        image: newPost.image || "",
        text: newPost.text,
        timestamp: serverTimestamp(), // Use Firebase server timestamp
        reactions: {},
        seenBy: [],
      };
      const docRef = await addDoc(collection(db, "posts"), postData);
      setPosts((prevPosts) => [
        {
          ...postData,
          id: docRef.id,
          timestamp: new Date(), // Use current date for immediate UI update
        } as Post,
        ...prevPosts,
      ]);
    } catch (error) {
      console.error("Error adding post:", error);
      alert("Failed to add post. Please try again.");
    }
  };

  const toggleReaction = async (postId: string, emoji: string) => {
    if (!currentUser) return;

    const postRef = doc(db, "posts", postId);
    const post = posts.find((p) => p.id === postId);
    if (!post) return;

    const currentReactions = post.reactions || {};
    const usersForEmoji = currentReactions[emoji] || [];
    const userHasReacted = usersForEmoji.includes(currentUser.name);

    let updatedReactions: { [emoji: string]: string[] } = { ...currentReactions };

    if (userHasReacted) {
      updatedReactions[emoji] = usersForEmoji.filter(
        (name) => name !== currentUser.name
      );
    } else {
      updatedReactions[emoji] = [...usersForEmoji, currentUser.name];
    }

    // Remove emoji from reactions if no one is reacting with it anymore
    if (updatedReactions[emoji].length === 0) {
      delete updatedReactions[emoji];
    }

    try {
      await updateDoc(postRef, { reactions: updatedReactions });
    } catch (error) {
      console.error("Error updating reaction:", error);
      alert("Failed to update reaction. Please try again.");
    }
  };

  const handleDeletePost = async () => {
    if (!postToDelete || !currentUser) return;

    try {
      // Delete the post from Firebase
      await deleteDoc(doc(db, "posts", postToDelete));

      // Update local state
      setPosts((prev) => prev.filter((p) => p.id !== postToDelete));
      setIsDeleteDialogOpen(false);
      setPostToDelete(null);
    } catch (error) {
      alert("Failed to delete post. Please try again.");
    }
  };

  // Swipe handlers for mobile
  const swipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (window.innerWidth >= 640) return; // Only on mobile
      const idx = tabOrder.indexOf(activeTab);
      if (idx < tabOrder.length - 1) {
        setActiveTab(tabOrder[idx + 1]);
      }
    },
    onSwipedRight: () => {
      if (window.innerWidth >= 640) return; // Only on mobile
      const idx = tabOrder.indexOf(activeTab);
      if (idx > 0) {
        setActiveTab(tabOrder[idx - 1]);
      }
    },
    trackMouse: false,
    delta: 40,
  });

  if (loading) {
    return <div className="flex justify-center items-center h-full">Loading feed...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-full text-red-500">Error: {error}</div>;
  }

  return (
    <div className="flex flex-col h-full w-full bg-gradient-chat overflow-hidden">
      <div className="sticky top-0 z-10 bg-chat-header border-b border-border flex items-center px-4 py-3 shadow-header">
        {/* Mobile: show menu icon to open sidebar, Web: show nothing */}
        <Button
          variant="ghost"
          size="icon"
          onClick={onBack}
          className="mr-2 sm:hidden"
          aria-label="Open sidebar">
          <Menu className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold text-foreground">Organization Feed</h2>
      </div>

      {/* Feed Tabs: sticky on web, fixed bottom on mobile */}
      <div
        ref={tabRef}
        className={`
          bg-white dark:bg-background sm:my-4 border-t sm:border-b shadow-sm
          w-3/4 sm:w-[31em] mx-auto  px-4 pt-3 pb-2
          transition-all z-40
          ${isSticky
            ? "sm:fixed sm:top-16  sm:-translate-x-1/2 sm:w-[31em]"
            : ""
          }
          mt-2 mb-2
          rounded-md
        `}
        style={{ zIndex: 30 }}>
        <div className="flex gap-4 text-sm justify-between font-medium text-muted-foreground max-w-lg mx-auto">
          {tabOrder.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1 pb-1 border-b-2 ${activeTab === key
                ? "border-primary text-primary font-semibold"
                : "border-transparent"
                }`}>
              {key === "all" && <List className="w-4 h-4" />}
              {key === "my" && <User className="w-4 h-4" />}
              {key === "saved" && <Bookmark className="w-4 h-4" />}
              {tabLabels[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Add post input and scrollable feed */}
      <div
        ref={feedAreaRef}
        className="flex-1 overflow-y-auto px-4 pb-24 sm:pb-4 feed-scroll-area scrollbar-hide"
        {...swipeHandlers}
        onScroll={() => {
          if (addPostRef.current && tabRef.current) {
            const addPostRect = addPostRef.current.getBoundingClientRect();
            const tabRect = tabRef.current.getBoundingClientRect();
            setShowWebAddButton(addPostRect.bottom < tabRect.bottom);
          }
        }}>
        <div className="max-w-lg mx-auto space-y-6">
          {/* AddPostInput: ref for scroll detection */}
          <div ref={addPostRef} className="hidden sm:block pb-2">
            <AddPostInput onPost={handleNewPost} />
          </div>

          {/* Mobile: AddPostInput as overlay (no blur, no bg-white, no close button) */}
          <div className="block sm:hidden">
            {showAddPostInput && (
              <div className="fixed top-0 left-0 w-full z-50 flex flex-col items-center pt-6 px-2">
                <div className="w-full max-w-lg mx-auto p-0">
                  <AddPostInput
                    onPost={(data) => {
                      handleNewPost(data);
                      setShowAddPostInput(false);
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Posts or empty state */}
          {(() => {
            if (!currentUser) return null;
            const filteredPosts = posts.filter((post) => {
              if (activeTab === "my") return post.user.name === currentUser.name;
              if (activeTab === "saved") return post.savedBy?.includes(currentUser.uid);
              return true; // "all"
            });
            if (filteredPosts.length === 0) {
              return (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className="w-12 h-12 mb-2"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="2">
                    <rect x="3" y="7" width="18" height="13" rx="2" />
                    <path d="M16 3v4M8 3v4M3 11h18" />
                  </svg>
                  <div className="text-lg font-medium">No posts to show.</div>
                </div>
              );
            }
            return filteredPosts.map((post) => (
              <div key={post.id} className="overflow-hidden">
                <div className="bg-card rounded-lg border border-border shadow-sm">
                  <div className="p-0">
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
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-sm">{post.user.name === currentUser?.name ? "You" : post.user.name}</h3>
                            {post.user.role === 'admin' && <RoleBadge role="admin" size="sm" />}
                          </div>
                          <span className="text-muted-foreground text-xs">
                            {formatDistanceToNow(post.timestamp, { addSuffix: true })}
                          </span>
                        </div>
                      </div>
                      {currentUser && (post.user.name === currentUser.name || org.userRole === 'admin' || (org.userRole === 'moderator' && post.user.role !== 'admin')) && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="w-8 h-8">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => {
                                setPostToDelete(post.id);
                                setIsDeleteDialogOpen(true);
                              }}
                              className="text-red-500"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Post
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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

                    {/* Reactions */}
                    {Object.keys(post.reactions).length > 0 && (
                      <div className="px-4 py-2 border-b border-border">
                        <div className="flex items-center gap-2 flex-wrap">
                          {Object.entries(post.reactions).map(([emoji, users]) => (
                            <Button
                              key={emoji}
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleReaction(post.id, emoji)}
                              className={`h-6 px-2 text-xs ${(users as string[]).includes(currentUser)
                                ? 'bg-primary/10 text-primary'
                                : 'text-muted-foreground'
                                }`}
                            >
                              {emoji} {(users as string[]).length}
                            </Button>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Post Actions */}
                    <div className="flex items-center justify-between p-4 pt-2">
                      <div className="flex items-center gap-1">
                        {emojiList.map((emoji) => (
                          <Button
                            key={emoji}
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleReaction(post.id, emoji)}
                            className="h-8 w-8 p-0 text-lg hover:scale-110 transition-transform"
                          >
                            {emoji}
                          </Button>
                        ))}
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="flex items-center gap-1 text-muted-foreground"
                                                    onClick={() =>
                            setActiveCommentPostId(
                              activeCommentPostId === post.id ? null : post.id
                            )
                          }
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span className="text-xs">{comments[post.id]?.length || 0}</span>
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          className={`flex items-center gap-1 ${post.savedBy?.includes(currentUser.uid) ? 'text-primary' : 'text-muted-foreground'
                            }`}
                          onClick={async () => {
                            if (!currentUser) return;
                            const postRef = doc(db, "posts", post.id);

                            const isCurrentlySaved = (post.savedBy || []).includes(currentUser.uid);

                            try {
                              if (isCurrentlySaved) {
                                await updateDoc(postRef, { savedBy: arrayRemove(currentUser.uid) });
                              } else {
                                await updateDoc(postRef, { savedBy: arrayUnion(currentUser.uid) });
                              }
                            } catch (error) {
                              console.error("Error updating saved status:", error);
                              alert("Failed to update saved status. Please try again.");
                            }
                          }}
                        >
                          <Bookmark className={`w-4 h-4 ${post.savedBy?.includes(currentUser.uid) ? 'fill-current' : ''}`} />
                        </Button>

                        <Button variant="ghost" size="sm" className="flex items-center gap-1 text-muted-foreground">
                          <Eye className="w-4 h-4" />
                          <span className="text-xs">{post.seenBy.length}</span>
                        </Button>
                      </div>
                    </div>

                    {/* Comments */}
                    {(comments[post.id] && comments[post.id].length > 0 || activeCommentPostId === post.id) && (
                      <div className="px-4 pb-4 border-t border-border pt-2">
                        {(expandedComments[post.id] ? comments[post.id] : comments[post.id].slice(-3)).map((comment) => (
                          <div key={comment.id} className="flex items-start gap-2 mt-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={comment.avatar} />
                              <AvatarFallback className="bg-muted text-xs">
                                {comment.user.charAt(0)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <span className="font-medium text-xs">{comment.user}</span>
                              <span className="text-xs text-muted-foreground ml-2">{comment.text}</span>
                            </div>
                          </div>
                        ))}

                        {comments[post.id] && comments[post.id].length > 3 && (
                          <button
                            onClick={() => setExpandedComments((prev) => ({ ...prev, [post.id]: !prev[post.id] }))}
                            className="text-xs text-muted-foreground italic mt-2 hover:underline"
                          >
                            {expandedComments[post.id] ? "Show less" : `View all ${comments[post.id].length} comments`}
                          </button>
                        )}

                        {activeCommentPostId === post.id && (
                          <div className="flex items-center gap-2 mt-2">
                            <Input
                              placeholder="Add a comment..."
                              value={commentText}
                              onChange={(e) => setCommentText(e.target.value)}
                              onKeyDown={async (e) => {
                                if (!currentUser) return;
                                const trimmed = commentText.trim();
                                if (e.key === "Enter" && trimmed) {
                                  const commentsCol = collection(db, "posts", post.id, "comments");
                                  await addDoc(commentsCol, {
                                    user: currentUser.name,
                                    avatar: currentUser.avatar || "",
                                    text: trimmed,
                                    timestamp: serverTimestamp(),
                                  });
                                  setCommentText("");
                                  setActiveCommentPostId(null);
                                }
                              }}
                              className="flex-1 text-sm"
                            />
                            <Button
                              size="icon"
                              variant="ghost"
                              disabled={!commentText.trim()}
                              onClick={async () => {
                                if (!currentUser) return;
                                const trimmed = commentText.trim();
                                if (!trimmed) return;
                                const commentsCol = collection(db, "posts", post.id, "comments");
                                await addDoc(commentsCol, {
                                  user: currentUser.name,
                                  avatar: currentUser.avatar || "",
                                  text: trimmed,
                                  timestamp: serverTimestamp(),
                                });
                                setCommentText("");
                                setActiveCommentPostId(null);
                              }}
                            >
                              <Send className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ));
          })()}
        </div>
      </div>
      {/* Floating add post button: mobile (overlay) and web (scroll to top) */}
      {/* Mobile: overlay */}
      {!showAddPostInput && (
        <button
          className="fixed bottom-16 right-6 z-30 bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-primary-hover transition-colors text-3xl sm:hidden"
          onClick={() => setShowAddPostInput(true)}
          aria-label="Add post">
          <Plus className="w-5 h-5" />
        </button>
      )}
      {/* Web: scroll to top */}
      {showWebAddButton && (
        <button
          onClick={() => {
            addPostRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }}
          className="hidden sm:flex fixed bottom-6 right-6 z-30 bg-primary text-white rounded-full w-14 h-14 items-center justify-center shadow-lg hover:bg-primary-hover transition-colors text-3xl"
          aria-label="Scroll to add post">
          <Plus className="w-5 h-5" />
        </button>
      )}

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete your post?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your post.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeletePost} className="bg-red-500 hover:bg-red-600">
              Delete Post
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

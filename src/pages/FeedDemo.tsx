import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Bookmark,
  MessageCircle,
  ArrowLeft,
  Eye,
  Send,
  ArrowUp,
  ArrowUpIcon,
  List,
  User,
  Plus,
} from "lucide-react";
import { AddPostInput } from "./AddPostInput";
import { formatDistanceToNow } from "date-fns";
import { Input } from "@/components/ui/input";
import { useSwipeable } from "react-swipeable";

const demoPosts = [
  {
    id: 1,
    user: { name: "Alice Johnson", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    text: "Enjoying the new office view! #worklife",
    comments: [
      { id: 1, user: "Bob Smith", text: "Looks amazing!" },
      { id: 2, user: "Carol Davis", text: "Great shot!" },
    ],
    reactions: {},
    timestamp: new Date(),
    seenBy: [],
  },
  {
    id: 2,
    user: { name: "Bob Smith", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
    text: "Team lunch was a blast! 🍕",
    comments: [{ id: 1, user: "Alice Johnson", text: "Wish I was there!" }],
    reactions: {},
    timestamp: new Date(),
    seenBy: [],
  },
  {
    id: 3,
    user: { name: "Carol Davis", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1720884413532-59289875c3e1?q=80&w=735&auto=format&fit=crop&w=400&q=80",
    text: "Design sprint in progress! Loving the creativity. 🎨",
    comments: [
      { id: 1, user: "Alice Johnson", text: "Can't wait to see the results!" },
    ],
    reactions: {},
    timestamp: new Date(),
    seenBy: [],
  },
  {
    id: 4,
    user: { name: "David Lee", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=400&q=80",
    text: "Morning coffee with the dev team ☕️",
    comments: [
      { id: 1, user: "Bob Smith", text: "Best way to start the day!" },
    ],
    reactions: {},
    timestamp: new Date(),
    seenBy: [],
  },
  {
    id: 5,
    user: { name: "Emily Clark", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1526779259212-939e64788e3c?q=80&w=1174&auto=format&fit=crop&w=400&q=80",
    text: "Just finished a 5k run with colleagues! 🏃‍♂️🏃‍♀️",
    comments: [{ id: 1, user: "David Lee", text: "Impressive!" }],
    reactions: {},
    timestamp: new Date(),
    seenBy: [],
  },
  {
    id: 6,
    user: { name: "Frank Miller", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1519985176271-adb1088fa94c?auto=format&fit=crop&w=400&q=80",
    text: "Friday happy hour at the rooftop bar! 🍻",
    comments: [{ id: 1, user: "Emily Clark", text: "So much fun!" }],
    reactions: {},
    timestamp: new Date(),
    seenBy: [],
  },
  {
    id: 7,
    user: { name: "Grace Kim", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1504384308090-c894fdcc538d?auto=format&fit=crop&w=400&q=80",
    text: "Team brainstorming session. Ideas are flowing! 💡",
    comments: [{ id: 1, user: "Frank Miller", text: "Great energy!" }],
    reactions: {},
    timestamp: new Date(),
    seenBy: [],
  },
  {
    id: 8,
    user: { name: "Hannah Brown", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1465101046530-73398c7f28ca?auto=format&fit=crop&w=400&q=80",
    text: "Lunch break with the besties! 🥗",
    comments: [{ id: 1, user: "Grace Kim", text: "Yum!" }],
    reactions: {},
    timestamp: new Date(),
    seenBy: [],
  },
  {
    id: 9,
    user: { name: "Ian Turner", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=400&q=80",
    text: "Wrapping up a productive week. Happy Friday everyone! 🎉",
    comments: [{ id: 1, user: "Hannah Brown", text: "Well deserved!" }],
    reactions: {},
    timestamp: new Date(),
    seenBy: [],
  },
  {
    id: 10,
    user: { name: "Julia Evans", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1721132447246-5d33f3008b05?q=80&w=735&auto=format&fit=crop&w=400&q=80",
    text: "Excited for the upcoming company retreat! 🏞️",
    comments: [{ id: 1, user: "Ian Turner", text: "Can't wait!" }],
    reactions: {},
    timestamp: new Date(),
    seenBy: [],
  },
];

const emojiList = ["👍", "❤️", "😂", "🎉"];

const tabOrder = ["all", "my", "saved"];
const tabLabels = {
  all: "All",
  my: "My Posts",
  saved: "Saved",
};

export const FeedDemo: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [saved, setSaved] = useState<{ [postId: number]: boolean }>({});
  const [posts, setPosts] = useState(demoPosts);
  const [showAddPostInput, setShowAddPostInput] = useState(false);
  const addPostRef = React.useRef<HTMLDivElement>(null);
  const feedAreaRef = React.useRef<HTMLDivElement>(null);
  const [showWebAddButton, setShowWebAddButton] = useState(false);
  const currentUser = "You";
  const [activeCommentPostId, setActiveCommentPostId] = useState<number | null>(
    null
  );
  const [commentText, setCommentText] = useState<string>("");
  const [showStickyTabs, setShowStickyTabs] = useState(false);
  const [activeTab, setActiveTab] = useState("all"); // "all", "my", "saved"
  // Inside your component
  const tabRef = useRef<HTMLDivElement>(null);
  const [isSticky, setIsSticky] = useState(false);

  // Web: Show plus icon when AddPostInput is out of view
  useEffect(() => {
    if (window.innerWidth < 640) return;
    const feed = feedAreaRef.current;
    if (!feed || !addPostRef.current || !tabRef.current) return;

    const handleScroll = () => {
      const addPostRect = addPostRef.current!.getBoundingClientRect();
      const tabRect = tabRef.current!.getBoundingClientRect();
      // Debug log
      // console.log(
      //   "addPostRect.bottom:",
      //   addPostRect.bottom,
      //   "tabRect.bottom:",
      //   tabRect.bottom,
      //   "show:",
      //   addPostRect.bottom < tabRect.bottom
      // );
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
    const updated = posts.map((post) => {
      if (!post.seenBy?.includes(currentUser)) {
        return {
          ...post,
          seenBy: [...(post.seenBy || []), currentUser],
        };
      }
      return post;
    });
    setPosts(updated);
  }, []);

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

  const handleNewPost = (newPost: { text: string; image?: string }) => {
    const post = {
      id: Date.now(),
      user: {
        name: "You",
        avatar: "",
      },
      image: newPost.image || "",
      text: newPost.text,
      timestamp: new Date(),
      reactions: {},
      comments: [],
      seenBy: [], // Fix: add seenBy property
    };
    setPosts([post, ...posts]);
  };

  const toggleReaction = (postId: number, emoji: string) => {
    setPosts((prev) =>
      prev.map((p) =>
        p.id === postId
          ? {
              ...p,
              reactions: {
                ...p.reactions,
                [emoji]: (p.reactions?.[emoji] || 0) + 1,
              },
            }
          : p
      )
    );
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

  return (
    <div className="flex flex-col h-full w-full bg-gradient-chat overflow-hidden">
      <div className="sticky top-0 z-10 bg-chat-header border-b border-border flex items-center px-4 py-3 shadow-header">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="w-5 h-5" />
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
          ${
            isSticky
              ? "sm:fixed sm:top-16  sm:-translate-x-1/2 sm:w-[31em]"
              : ""
          }
          mt-2 mb-2
          rounded-md
        `}
        style={{ zIndex: 50 }}>
        <div className="flex gap-4 text-sm justify-between font-medium text-muted-foreground max-w-lg mx-auto">
          {tabOrder.map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1 pb-1 border-b-2 ${
                activeTab === key
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
            // console.log(
            //   "addPostRect.bottom:",
            //   addPostRect.bottom,
            //   "tabRect.bottom:",
            //   tabRect.bottom,
            //   "show:",
            //   addPostRect.bottom < tabRect.bottom
            // );
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
            const filteredPosts = posts.filter((post) => {
              if (activeTab === "my") return post.user.name === currentUser;
              if (activeTab === "saved") return saved[post.id];
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
              <div
                key={post.id}
                className="bg-white rounded-xl shadow p-4 max-w-lg mx-auto">
                <div className="flex items-center justify-between mb-2">
                  {/* Left: Avatar + Name */}
                  <div className="flex items-center gap-3">
                    <Avatar className="w-9 h-9">
                      <AvatarImage
                        src={post.user.avatar}
                        alt={post.user.name}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {post.user.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-semibold text-foreground">
                      {post.user.name}
                    </span>
                  </div>

                  {/* Right: Eye icon + view count */}
                  {post.seenBy?.length > 0 && (
                    <div className="flex items-center gap-1 text-muted-foreground text-sm">
                      <Eye className="w-4 h-4" />
                      <span>{post.seenBy.length} </span>
                    </div>
                  )}
                </div>

                {post.image && (
                  <img
                    src={post.image}
                    alt="post"
                    className="rounded-lg w-full h-56 object-cover mb-3"
                  />
                )}
                <p className="mb-2 text-foreground">{post.text}</p>
                <div className="text-xs text-muted-foreground mb-2">
                  {formatDistanceToNow(new Date(post.timestamp), {
                    addSuffix: true,
                  })}
                </div>

                {/* Reactions */}
                <div className="flex gap-2 mb-2">
                  {emojiList.map((emoji) => (
                    <button
                      key={emoji}
                      className="text-lg hover:scale-110 transition-transform"
                      onClick={() => toggleReaction(post.id, emoji)}>
                      {emoji} {post.reactions?.[emoji] || ""}
                    </button>
                  ))}
                </div>

                {/* Buttons */}
                <div className="flex items-center gap-4 mb-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() =>
                      setActiveCommentPostId(
                        activeCommentPostId === post.id ? null : post.id
                      )
                    }>
                    <MessageCircle className="w-4 h-4" />
                    <span>{post.comments.length}</span>
                  </Button>

                  <Button
                    variant={saved[post.id] ? "default" : "ghost"}
                    size="sm"
                    className="flex items-center gap-1"
                    onClick={() =>
                      setSaved((s) => ({ ...s, [post.id]: !s[post.id] }))
                    }>
                    <Bookmark className="w-4 h-4" />
                    <span>{saved[post.id] ? "Saved" : "Save"}</span>
                  </Button>
                </div>

                {/* Comments */}
                <div className="space-y-1">
                  {post.comments
                    .slice(-3) // Only show the last 3 comments
                    .map((c) => (
                      <div key={c.id} className="text-xs text-muted-foreground">
                        <span className="font-semibold text-foreground">
                          {c.user}:
                        </span>{" "}
                        {c.text}
                      </div>
                    ))}

                  {post.comments.length > 3 && (
                    <div className="text-xs text-muted-foreground italic">
                      View all {post.comments.length} comments
                    </div>
                  )}

                  {activeCommentPostId === post.id && (
                    <div className="flex items-center gap-2 mt-2">
                      <Input
                        placeholder="Add a comment..."
                        value={commentText}
                        onChange={(e) => setCommentText(e.target.value)}
                        onKeyDown={(e) => {
                          const trimmed = commentText.trim();
                          if (e.key === "Enter" && trimmed) {
                            setPosts((prev) =>
                              prev.map((p) =>
                                p.id === post.id
                                  ? {
                                      ...p,
                                      comments: [
                                        ...p.comments,
                                        {
                                          id: Date.now(),
                                          user: currentUser,
                                          text: trimmed,
                                        },
                                      ],
                                    }
                                  : p
                              )
                            );
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
                        onClick={() => {
                          const trimmed = commentText.trim();
                          if (!trimmed) return;
                          setPosts((prev) =>
                            prev.map((p) =>
                              p.id === post.id
                                ? {
                                    ...p,
                                    comments: [
                                      ...p.comments,
                                      {
                                        id: Date.now(),
                                        user: currentUser,
                                        text: trimmed,
                                      },
                                    ],
                                  }
                                : p
                            )
                          );
                          setCommentText("");
                          setActiveCommentPostId(null);
                        }}>
                        <Send className="w-4 h-4" />
                      </Button>
                    </div>
                  )}
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
    </div>
  );
};

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Bookmark, MessageCircle, ArrowLeft, X } from "lucide-react";
import { AddPostInput } from "./AddPostInput";
import { formatDistanceToNow } from "date-fns";

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
  },
  {
    id: 3,
    user: { name: "Carol Davis", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80",
    text: "Design sprint in progress! Loving the creativity. 🎨",
    comments: [
      { id: 1, user: "Alice Johnson", text: "Can't wait to see the results!" },
    ],
    reactions: {},
    timestamp: new Date(),
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
  },
  {
    id: 5,
    user: { name: "Emily Clark", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80",
    text: "Just finished a 5k run with colleagues! 🏃‍♂️🏃‍♀️",
    comments: [{ id: 1, user: "David Lee", text: "Impressive!" }],
    reactions: {},
    timestamp: new Date(),
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
  },
  {
    id: 10,
    user: { name: "Julia Evans", avatar: "" },
    image:
      "https://images.unsplash.com/photo-1519125323398-675f0ddb6308?auto=format&fit=crop&w=400&q=80",
    text: "Excited for the upcoming company retreat! 🏞️",
    comments: [{ id: 1, user: "Ian Turner", text: "Can't wait!" }],
    reactions: {},
    timestamp: new Date(),
  },
];

const emojiList = ["👍", "❤️", "😂", "🎉"];

export const FeedDemo: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [saved, setSaved] = useState<{ [postId: number]: boolean }>({});
  const [posts, setPosts] = useState(demoPosts);
  const [showAddPostInput, setShowAddPostInput] = useState(false);
  const addPostRef = React.useRef<HTMLDivElement>(null);
  const feedAreaRef = React.useRef<HTMLDivElement>(null);
  const [showWebAddButton, setShowWebAddButton] = useState(false);

  // Web: Show plus icon when AddPostInput is out of view
  useEffect(() => {
    if (window.innerWidth < 640) return;
    const feed = feedAreaRef.current;
    if (!feed || !addPostRef.current) return;
    const handleScroll = () => {
      const rect = addPostRef.current!.getBoundingClientRect();
      setShowWebAddButton(rect.bottom < 60); // 60px from top
    };
    feed.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => feed.removeEventListener("scroll", handleScroll);
  }, []);

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

  return (
    <div className="flex flex-col h-full w-full bg-gradient-chat">
      <div className="sticky top-0 z-10 bg-chat-header border-b border-border flex items-center px-4 py-3 shadow-header">
        <Button variant="ghost" size="icon" onClick={onBack} className="mr-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h2 className="text-xl font-bold text-foreground">Organization Feed</h2>
      </div>

      {/* Add post input */}
      <div
        ref={feedAreaRef}
        className="flex-1 overflow-y-auto p-4 feed-scroll-area">
        <div className="max-w-lg mx-auto space-y-6">
          <div ref={addPostRef} className="pb-2">
            {/* Show AddPostInput directly on web, or as inline on mobile if toggled */}
            <div className="hidden sm:block">
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
          </div>
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white rounded-xl shadow p-4 max-w-lg mx-auto">
              <div className="flex items-center gap-3 mb-2">
                <Avatar className="w-9 h-9">
                  <AvatarImage src={post.user.avatar} alt={post.user.name} />
                  <AvatarFallback className="bg-primary/10 text-primary">
                    {post.user.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <span className="font-semibold text-foreground">
                  {post.user.name}
                </span>
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
                  className="flex items-center gap-1">
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
                {post.comments.map((c) => (
                  <div key={c.id} className="text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {c.user}:
                    </span>{" "}
                    {c.text}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      {/* Floating add post button: mobile (overlay) and web (scroll to top) */}
      {/* Mobile: overlay */}
      {!showAddPostInput && (
        <button
          className="fixed bottom-6 right-6 z-30 bg-primary text-white rounded-full w-14 h-14 flex items-center justify-center shadow-lg hover:bg-primary-hover transition-colors text-3xl sm:hidden"
          onClick={() => setShowAddPostInput(true)}
          aria-label="Add post">
          +
        </button>
      )}
      {/* Web: scroll to top */}
      {showWebAddButton && (
        <button
          className="hidden sm:flex fixed bottom-6 right-6 z-30 bg-primary text-white rounded-full w-14 h-14 items-center justify-center shadow-lg hover:bg-primary-hover transition-colors text-3xl"
          onClick={() => {
            feedAreaRef.current?.scrollTo({ top: 0, behavior: "smooth" });
          }}
          aria-label="Scroll to add post">
          +
        </button>
      )}
    </div>
  );
};

import React, { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { ImagePlus } from "lucide-react";

interface AddPostInputProps {
  onPost: (newPost: { text: string; image?: string }) => void;
}

export const AddPostInput: React.FC<AddPostInputProps> = ({ onPost }) => {
  const [text, setText] = useState("");
  const [image, setImage] = useState<string | undefined>(undefined);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handlePost = () => {
    if (!text.trim()) return;
    onPost({ text, image });
    setText("");
    setImage(undefined);
  };

  return (
    <div className="bg-white p-4 rounded-xl shadow max-w-lg mx-auto mb-4">
      <textarea
        placeholder="What's on your mind?"
        value={text}
        onChange={(e) => setText(e.target.value)}
        className="w-full border border-border rounded-md px-3 py-2 resize-none text-sm focus:outline-none"
        rows={3}
      />
      {image && (
        <img src={image} alt="preview" className="mt-2 rounded-md max-h-60" />
      )}
      <div className="flex items-center justify-between mt-2">
        <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground">
          <ImagePlus className="w-4 h-4" />
          <span>Add image</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageChange}
          />
        </label>
        <Button onClick={handlePost} disabled={!text.trim()}>
          Post
        </Button>
      </div>
    </div>
  );
};

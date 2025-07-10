import React from "react";

interface ChatMessageProps {
  role: "user" | "assistant";
  content: React.ReactNode;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ role, content }) => {
  const isUser = role === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} my-1`}>
      <div
        className={`rounded-lg px-3 py-2 max-w-md whitespace-pre-wrap break-words ${
          isUser ? "bg-blue-600 text-white" : "bg-gray-200 text-gray-900"
        }`}
      >
        {content}
      </div>
    </div>
  );
};

export default ChatMessage;

import { useState, useRef, useEffect } from "react";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Upload, ArrowUpCircle, RefreshCcw } from "lucide-react";

import { useToast } from "@/hooks/use-toast";
import ChatMessage from "@/components/ChatMessage";
import ResultsTable from "@/components/ResultsTable";

// Solana wallet imports
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import {
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
  Connection,
} from "@solana/web3.js";

const Index = () => {
  const { toast } = useToast();
  const { connection: _conn } = useConnection();
  const { publicKey, signTransaction } = useWallet();
  const connection = new Connection("https://api.devnet.solana.com", "confirmed");

  // Holds pending transfer until user confirms
  const [transferIntent, setTransferIntent] = useState<{
    amount: number;
    recipientAddress: string;
  } | null>(null);

  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(
    () => sessionStorage.getItem("conversationId")
  );
  const [messages, setMessages] = useState<
    { role: "user" | "assistant"; content: any }[]
  >(() => {
    const stored = sessionStorage.getItem("messages");
    return stored ? JSON.parse(stored) : [];
  });
  const [uploadResults, setUploadResults] = useState<{
    fileName: string;
    data: any[];
  } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, uploadResults]);

  useEffect(() => {
    sessionStorage.setItem("messages", JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    if (conversationId) sessionStorage.setItem("conversationId", conversationId);
  }, [conversationId]);

  const handleSendPrompt = async () => {
    const text = prompt.trim();
    if (!text) {
      toast({ title: "Empty prompt", description: "Enter something.", variant: "destructive" });
      return;
    }

    // Append user message
    const userMsg = { role: "user", content: text };
    const newMsgs = [...messages, userMsg];
    setMessages(newMsgs);
    sessionStorage.setItem("messages", JSON.stringify(newMsgs));
    setPrompt("");
    setIsLoading(true);

    // If awaiting transfer confirmation
    if (transferIntent) {
      try {
        const reply = text.toLowerCase();
        if (reply === "yes") {
          // Prepare
          const prepResp = await fetch(`${import.meta.env.VITE_API_URL}/transfer/prepare`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              amount: transferIntent.amount,
              recipientAddress: transferIntent.recipientAddress,
              senderAddress: publicKey?.toBase58(),
              conversationId,
            }),
          });
          const prepData = await prepResp.json();

          // Build & sign
          const tx = new Transaction().add(
            SystemProgram.transfer({
              fromPubkey: publicKey!,
              toPubkey: new PublicKey(transferIntent.recipientAddress),
              lamports: prepData.lamports,
            })
          );
          const { blockhash, lastValidBlockHeight } = await connection.getLatestBlockhash("confirmed");
          tx.recentBlockhash = blockhash;
          tx.lastValidBlockHeight = lastValidBlockHeight;
          tx.feePayer = publicKey!;
          const signed = await signTransaction!(tx);
          const base64 = Buffer.from(signed.serialize()).toString("base64");

          // Send
          const sendResp = await fetch(`${import.meta.env.VITE_API_URL}/transfer/send`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              signedTransaction: base64,
              amount: transferIntent.amount,
              to: transferIntent.recipientAddress,
              from: publicKey?.toBase58(),
              conversationId,
            }),
          });
          const sendData = await sendResp.json();

          if (sendData.success) {
            const successMsg = `✅ Sent ${transferIntent.amount} SOL to ${transferIntent.recipientAddress}. Tx signature: ${sendData.transactionSignature}`;
            const explorerMsg = `Explorer: ${sendData.explorerUrl}`;
            const updated = [
              ...newMsgs,
              { role: "assistant", content: successMsg },
              { role: "assistant", content: explorerMsg },
            ];
            setMessages(updated);
            sessionStorage.setItem("messages", JSON.stringify(updated));
          } else {
            throw new Error(sendData.error || "Transfer failed");
          }
        } else if (reply === "no") {
          const cancelMsg = "Transfer cancelled.";
          const updated = [...newMsgs, { role: "assistant", content: cancelMsg }];
          setMessages(updated);
          sessionStorage.setItem("messages", JSON.stringify(updated));
        } else {
          const promptMsg = "Please reply 'yes' to confirm or 'no' to cancel.";
          const updated = [...newMsgs, { role: "assistant", content: promptMsg }];
          setMessages(updated);
          sessionStorage.setItem("messages", JSON.stringify(updated));
        }
      } catch (err: any) {
        const errMsg = err.message || "Transfer failed";
        setMessages((m) => [...m, { role: "assistant", content: `Transfer failed: ${errMsg}` }]);
        toast({ title: "Error", description: errMsg, variant: "destructive" });
      } finally {
        setIsLoading(false);
        setTransferIntent(null);
      }
      return;
    }

    // Otherwise, normal NLP flow
    try {
      const resp = await fetch(`${import.meta.env.VITE_API_URL}/nlp`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: text, conversationId }),
      });
      const data = await resp.json();
      setConversationId(data.conversationId);

      let updated = [
        ...newMsgs,
        { role: "assistant", content: data.message || JSON.stringify(data) },
      ];

      if (data.action === "transfer" && data.transferIntent) {
        setTransferIntent(data.transferIntent);
        updated.push({
          role: "assistant",
          content: "Reply 'yes' to confirm the SOL transfer or 'no' to cancel.",
        });
      }

      setMessages(updated);
      sessionStorage.setItem("messages", JSON.stringify(updated));
    } catch (err: any) {
      const errMsg = err.message || "Error occurred";
      const updated = [...newMsgs, { role: "assistant", content: errMsg }];
      setMessages(updated);
      sessionStorage.setItem("messages", JSON.stringify(updated));
      toast({ title: "Error", description: errMsg, variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowed = [
      "text/plain",
      "text/csv",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];
    if (!allowed.includes(file.type)) {
      toast({ title: "Invalid file type", description: "Please upload a supported file.", variant: "destructive" });
      return;
    }
    const fd = new FormData();
    fd.append("file", file);
    try {
        const resp = await fetch(`${import.meta.env.VITE_API_URL}/upload?type=wallets&format=json`, {
          method: "POST",
          body: fd,
        });
        if (!resp.ok) throw new Error((await resp.json()).error || "Upload failed");
        const d = await resp.json();
        setUploadResults({ fileName: file.name, data: d });
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const handleReset = () => {
    setMessages([]);
    setConversationId(null);
    setUploadResults(null);
    setTransferIntent(null);
    sessionStorage.removeItem("messages");
    sessionStorage.removeItem("conversationId");
  };
  return (
    <div className="flex flex-col h-screen bg-white">
      <ScrollArea className="flex-1 p-4 space-y-2">
        {messages.length === 0 && (
          <div className="text-center text-gray-500">
            <p className="font-semibold">Welcome to Solana GPT</p>
            <p>Ask me anything about Solana, DeFi, smart contracts, or upload your files for analysis.</p>
          </div>
        )}
        {messages.map((msg, index) => (
          <ChatMessage key={index} role={msg.role} content={msg.content} />
        ))}
        {uploadResults && (
          <ChatMessage role="assistant" content={<ResultsTable fileName={uploadResults.fileName} data={uploadResults.data} />} />
        )}
        <div ref={messagesEndRef} />
      </ScrollArea>
      <div className="border-t p-4 flex items-end gap-2">
        <Textarea
          id="prompt"
          placeholder="Type your message..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="flex-1 resize-none"
          onKeyDown={(e) => {
            if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
              handleSendPrompt();
            }
          }}
        />
        <input
          type="file"
          id="file-upload"
          className="hidden"
          accept=".txt,.csv,.xls,.xlsx"
          onChange={handleFileUpload}
        />
        <label htmlFor="file-upload" className="cursor-pointer text-gray-600 hover:text-gray-800">
          <Upload className="w-6 h-6" />
        </label>
        <button
          onClick={handleReset}
          className="text-gray-600 hover:text-gray-800"
        >
          <RefreshCcw className="w-6 h-6" />
        </button>
        <button
          onClick={handleSendPrompt}
          disabled={isLoading}
          className="text-blue-600 hover:text-blue-800 disabled:opacity-50"
        >
          {isLoading ? (
            <div className="animate-spin h-6 w-6 border-2 border-current border-t-transparent rounded-full" />
          ) : (
            <ArrowUpCircle className="w-6 h-6" />
          )}
        </button>
      </div>
      <div className="px-4 pb-4 text-xs text-gray-500">Supported file types: CSV and TXT</div>
    </div>
  );
};

export default Index;

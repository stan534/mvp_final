import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Upload, Send, FileText } from "lucide-react";
import { Link } from "react-router-dom";
import ConnectWalletButton from "@/components/ConnectWalletButton";
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
  const [responseFormat, setResponseFormat] = useState<"file" | "text">("text");
  const [fileType, setFileType] = useState<"wallets" | "transactions">("wallets");
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
      const apiF = responseFormat === "text" ? "json" : "csv";
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL}/upload?type=${fileType}&format=${apiF}`, {
          method: "POST",
          body: fd,
        }
      );
      if (!resp.ok) throw new Error((await resp.json()).error || "Upload failed");
      if (responseFormat === "file") {
        const blob = await resp.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${fileType}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      } else {
        const d = await resp.json();
        setUploadResults({ fileName: file.name, data: d });
      }
    } catch (err: any) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
    } finally {
      e.target.value = "";
    }
  };

  const handleResetChat = () => {
    setMessages([]);
    setConversationId(null);
    setUploadResults(null);
    sessionStorage.removeItem("messages");
    sessionStorage.removeItem("conversationId");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Solana AI Assistant
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <Link to="/use-cases">
                <Button variant="ghost" className="text-gray-600 hover:text-gray-900">
                  Use Cases
                </Button>
              </Link>
              <ConnectWalletButton />
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            AI-Powered Solana Blockchain Assistant
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Get instant insights, analyze transactions, and explore the Solana blockchain 
            with natural language queries powered by AI.
          </p>
        </div>

        {/* Chat Interface */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8">
          <div className="space-y-6">
            <ScrollArea className="h-64 border rounded-md p-4">
              {messages.map((msg, index) => (
                <ChatMessage key={index} role={msg.role} content={msg.content} />
              ))}
              {uploadResults && (
                <ChatMessage role="assistant" content={<ResultsTable fileName={uploadResults.fileName} data={uploadResults.data} />} />
              )}
              <div ref={messagesEndRef} />
            </ScrollArea>
            {/* Input Area */}
            <div className="space-y-4">
              <label htmlFor="prompt" className="block text-sm font-medium text-gray-700">
                Enter your blockchain query
              </label>
              <Textarea
                id="prompt"
                placeholder="e.g., Show me the top 10 DeFi protocols on Solana by TVL, or analyze the transaction patterns for wallet address..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[120px] resize-none border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                    handleSendPrompt();
                  }
                }}
              />
              <div className="text-sm text-gray-500">
                Press Cmd/Ctrl + Enter to send
              </div>
            </div>

            {/* Upload Options */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex items-center space-x-2">
                <Label>File Type:</Label>
                <RadioGroup
                  value={fileType}
                  onValueChange={(val) =>
                    setFileType(val as "wallets" | "transactions")
                  }
                  className="flex flex-row space-x-4"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="wallets" id="file-wallets" />
                    <Label htmlFor="file-wallets">Wallets</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="transactions" id="file-transactions" />
                    <Label htmlFor="file-transactions">Transactions</Label>
                  </div>
                </RadioGroup>
              </div>
              <div className="flex items-center space-x-2">
                <Label>Response:</Label>
                <RadioGroup
                  value={responseFormat}
                  onValueChange={(val) =>
                    setResponseFormat(val as "file" | "text")
                  }
                  className="flex flex-row space-x-4"
                >
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="file" id="format-file" />
                    <Label htmlFor="format-file">File</Label>
                  </div>
                  <div className="flex items-center space-x-1">
                    <RadioGroupItem value="text" id="format-text" />
                    <Label htmlFor="format-text">Text</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                onClick={handleSendPrompt}
                disabled={isLoading}
                className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    Send Query
                  </>
                )}
              </Button>

              <div className="relative">
                <input
                  type="file"
                  id="file-upload"
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  accept=".txt,.csv,.xls,.xlsx"
                  onChange={handleFileUpload}
                />
                <Button
                  variant="outline"
                  className="w-full sm:w-auto border-gray-300 hover:border-blue-500 hover:text-blue-600 py-3 px-6 rounded-lg transition-all duration-200"
                  asChild
                >
                  <label htmlFor="file-upload" className="cursor-pointer flex items-center">
                    <Upload className="w-4 h-4 mr-2" />
                    Upload File
                  </label>
                </Button>
              </div>

              <Button
                variant="outline"
                onClick={handleResetChat}
                className="w-full sm:w-auto border-gray-300 hover:border-red-500 hover:text-red-600 py-3 px-6 rounded-lg transition-all duration-200"
              >
                Reset Chat
              </Button>
            </div>

            {/* Supported File Types */}
            <div className="flex items-center justify-center text-sm text-gray-500">
              <FileText className="w-4 h-4 mr-2" />
              Supports: TXT, CSV, Excel files
            </div>
          </div>
        </div>

        {/* Quick Examples */}
        <div className="mt-12">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 text-center">
            Try these example queries:
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              "Show me the largest Solana wallets by SOL balance",
              "Analyze Jupiter DEX trading volume over the last 30 days",
              "Find all NFT collections with floor price above 10 SOL",
              "Track liquidity changes in Raydium pools this week"
            ].map((example, index) => (
              <button
                key={index}
                onClick={() => setPrompt(example)}
                className="p-4 bg-gray-50 hover:bg-gray-100 rounded-lg text-left text-sm text-gray-700 transition-colors duration-200 border border-gray-200 hover:border-blue-300"
              >
                {example}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;

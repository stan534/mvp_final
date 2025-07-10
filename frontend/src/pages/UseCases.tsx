
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Play, BookOpen, TrendingUp, Search, BarChart3 } from "lucide-react";
import { Link } from "react-router-dom";
import ConnectWalletButton from "@/components/ConnectWalletButton";

const UseCases = () => {
  const useCases = [
    {
      category: "DeFi Analytics",
      icon: <TrendingUp className="w-6 h-6" />,
      examples: [
        "Show me the top 10 yield farming opportunities on Solana",
        "Compare liquidity across different AMM protocols",
        "Track impermanent loss for my LP positions",
        "Find arbitrage opportunities between DEXes"
      ]
    },
    {
      category: "Wallet Analysis",
      icon: <Search className="w-6 h-6" />,
      examples: [
        "Analyze wallet address [address] transaction history",
        "Find whales who bought [token] in the last 24 hours",
        "Show me wallets with similar trading patterns to [address]",
        "Track smart money movements in DeFi protocols"
      ]
    },
    {
      category: "Market Intelligence",
      icon: <BarChart3 className="w-6 h-6" />,
      examples: [
        "Show trending tokens with highest volume growth",
        "Analyze correlation between SOL price and ecosystem tokens",
        "Find tokens with unusual trading activity today",
        "Compare market cap changes across Solana projects"
      ]
    },
    {
      category: "NFT Insights",
      icon: <BookOpen className="w-6 h-6" />,
      examples: [
        "Show me NFT collections with highest trading volume",
        "Find undervalued NFTs based on trait rarity",
        "Track whale NFT purchases in the last week",
        "Analyze floor price trends for [collection name]"
      ]
    }
  ];

  const videoExamples = [
    {
      title: "Getting Started with Solana AI Assistant",
      description: "Learn the basics of querying blockchain data using natural language",
      thumbnail: "https://images.unsplash.com/photo-1551434678-e076c223a692?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80"
    },
    {
      title: "Advanced DeFi Analytics",
      description: "Deep dive into yield farming strategies and liquidity analysis",
      thumbnail: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80"
    },
    {
      title: "Whale Tracking Strategies",
      description: "How to identify and follow smart money movements on Solana",
      thumbnail: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?ixlib=rb-4.0.3&auto=format&fit=crop&w=640&q=80"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Navigation */}
      <nav className="bg-white/80 backdrop-blur-sm border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <Link to="/" className="flex items-center text-gray-600 hover:text-gray-900 mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Chat
              </Link>
              <div className="flex-shrink-0">
                <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  Use Cases & Examples
                </h1>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <ConnectWalletButton />
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Unlock the Power of Solana Data
          </h2>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Discover how to leverage AI to get actionable insights from the Solana blockchain. 
            From DeFi analytics to NFT tracking, explore real-world use cases and examples.
          </p>
        </div>

        {/* Use Cases Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-16">
          {useCases.map((useCase, index) => (
            <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-shadow duration-300 border-0">
              <CardHeader>
                <CardTitle className="flex items-center text-xl">
                  <div className="p-2 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg text-white mr-3">
                    {useCase.icon}
                  </div>
                  {useCase.category}
                </CardTitle>
                <CardDescription className="text-gray-600">
                  Example prompts for {useCase.category.toLowerCase()}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {useCase.examples.map((example, exampleIndex) => (
                    <div
                      key={exampleIndex}
                      className="p-3 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors duration-200 cursor-pointer text-sm"
                    >
                      "{example}"
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Video Examples */}
        <div className="mb-16">
          <h3 className="text-3xl font-bold text-gray-900 mb-8 text-center">
            Video Tutorials
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {videoExamples.map((video, index) => (
              <Card key={index} className="bg-white shadow-lg hover:shadow-xl transition-all duration-300 border-0 overflow-hidden group">
                <div className="relative">
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    <Button size="lg" className="bg-white text-black hover:bg-gray-100">
                      <Play className="w-5 h-5 mr-2" />
                      Watch Video
                    </Button>
                  </div>
                </div>
                <CardContent className="p-6">
                  <h4 className="text-lg font-semibold text-gray-900 mb-2">
                    {video.title}
                  </h4>
                  <p className="text-gray-600 text-sm">
                    {video.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Quick Start Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-8 text-center">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">
            Ready to Get Started?
          </h3>
          <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
            Try our AI assistant now and start exploring Solana blockchain data with natural language queries. 
            No technical expertise required!
          </p>
          <Link to="/">
            <Button size="lg" className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium py-3 px-8 rounded-lg transition-all duration-200 transform hover:scale-105">
              Start Querying Now
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default UseCases;

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExternalLink, RefreshCw, TrendingUp, Sparkles } from "lucide-react";
import { toast } from "sonner";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

const AITrends = () => {
  const [loading, setLoading] = useState(false);
  const [trends, setTrends] = useState([]);

  useEffect(() => {
    fetchTrends();
  }, []);

  const fetchTrends = async () => {
    setLoading(true);
    try {
      const response = await axios.get(`${API}/trends/ai-news`);
      setTrends(response.data.articles || []);
    } catch (error) {
      console.error("Error fetching AI trends:", error);
      toast.error("Failed to load AI trends");
      // Fallback to mock data
      setTrends(getMockTrends());
    } finally {
      setLoading(false);
    }
  };

  const getMockTrends = () => [
    {
      title: "OpenAI Announces GPT-5 with Enhanced Reasoning Capabilities",
      description: "OpenAI unveils GPT-5, featuring breakthrough improvements in logical reasoning and multi-step problem solving.",
      url: "#",
      publishedAt: new Date().toISOString(),
      source: "TechCrunch",
      category: "AI Models"
    },
    {
      title: "Google's Gemini Ultra Achieves Human-Level Performance on Complex Tasks",
      description: "Google's latest AI model demonstrates unprecedented accuracy in scientific reasoning and creative tasks.",
      url: "#",
      publishedAt: new Date(Date.now() - 86400000).toISOString(),
      source: "The Verge",
      category: "Enterprise AI"
    },
    {
      title: "AI Agents Transform Enterprise Workflows: $50B Market by 2026",
      description: "Market research shows AI agent adoption accelerating across industries, with autonomous agents handling complex business processes.",
      url: "#",
      publishedAt: new Date(Date.now() - 172800000).toISOString(),
      source: "Forbes",
      category: "Market Trends"
    },
    {
      title: "Nurix.ai Competitors Raise $200M for AI-Powered Sales Automation",
      description: "Major funding rounds signal growing investor confidence in AI-driven sales and customer engagement platforms.",
      url: "#",
      publishedAt: new Date(Date.now() - 259200000).toISOString(),
      source: "VentureBeat",
      category: "Funding"
    },
    {
      title: "Enterprise AI Adoption Reaches 65% Among Fortune 500 Companies",
      description: "Latest survey reveals rapid AI integration across large enterprises, with focus on productivity and automation tools.",
      url: "#",
      publishedAt: new Date(Date.now() - 345600000).toISOString(),
      source: "McKinsey",
      category: "Enterprise AI"
    }
  ];

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getCategoryColor = (category) => {
    const colors = {
      'AI Models': 'bg-purple-100 text-purple-800 border-purple-200',
      'Enterprise AI': 'bg-blue-100 text-blue-800 border-blue-200',
      'Market Trends': 'bg-green-100 text-green-800 border-green-200',
      'Funding': 'bg-orange-100 text-orange-800 border-orange-200',
      'Technology': 'bg-cyan-100 text-cyan-800 border-cyan-200'
    };
    return colors[category] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  return (
    <div className="space-y-6" data-testid="ai-trends">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-600" />
            AI Industry Trends
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Live updates on AI developments and market trends relevant to Nurix.ai
          </p>
        </div>
        <Button
          onClick={fetchTrends}
          disabled={loading}
          variant="outline"
          size="sm"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Trends Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(trends.length > 0 ? trends : getMockTrends()).map((trend, index) => (
          <Card
            key={index}
            className="hover:shadow-lg transition-shadow duration-200 cursor-pointer"
            data-testid={`trend-card-${index}`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <Badge
                    variant="outline"
                    className={`mb-2 ${getCategoryColor(trend.category)}`}
                  >
                    {trend.category}
                  </Badge>
                  <CardTitle className="text-lg leading-tight hover:text-blue-600 transition-colors">
                    {trend.title}
                  </CardTitle>
                </div>
                <TrendingUp className="h-5 w-5 text-green-600 flex-shrink-0" />
              </div>
            </CardHeader>
            <CardContent>
              <CardDescription className="text-sm mb-4">
                {trend.description}
              </CardDescription>
              <div className="flex items-center justify-between text-xs text-gray-500">
                <div className="flex items-center gap-3">
                  <span className="font-medium">{trend.source}</span>
                  <span>{formatDate(trend.publishedAt)}</span>
                </div>
                <a
                  href={trend.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Read more
                  <ExternalLink className="h-3 w-3" />
                </a>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Market Insights */}
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardHeader>
          <CardTitle className="text-lg">Market Insights for Nurix.ai</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <div className="text-3xl font-bold text-purple-600">$127B</div>
              <div className="text-sm text-gray-600 mt-1">Global AI Market Size (2024)</div>
              <div className="text-xs text-gray-500 mt-1">↑ 37% YoY growth</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-blue-600">68%</div>
              <div className="text-sm text-gray-600 mt-1">Enterprise AI Adoption Rate</div>
              <div className="text-xs text-gray-500 mt-1">↑ 12% from 2023</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-600">$15.7T</div>
              <div className="text-sm text-gray-600 mt-1">Projected AI Economic Impact by 2030</div>
              <div className="text-xs text-gray-500 mt-1">Source: PwC</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AITrends;
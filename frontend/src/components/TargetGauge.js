import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TargetGauge = ({ current, target, label, unit = "$" }) => {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  
  // Calculate rotation for needle (-90 to +90 degrees)
  const rotation = -90 + (clampedPercentage / 100) * 180;

  const formatValue = (value) => {
    if (value >= 1000000) {
      return `${(value / 1000000).toFixed(1)}M`;
    } else if (value >= 1000) {
      return `${(value / 1000).toFixed(0)}K`;
    }
    return value.toFixed(0);
  };

  const getStatus = () => {
    if (clampedPercentage >= 100) return { text: 'Target Met! 🎯', color: 'text-green-600' };
    if (clampedPercentage >= 75) return { text: 'On Track', color: 'text-green-600' };
    if (clampedPercentage >= 50) return { text: 'Making Progress', color: 'text-orange-600' };
    return { text: 'Needs Attention', color: 'text-red-600' };
  };

  const status = getStatus();

  return (
    <Card data-testid="target-gauge">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-medium">{label}</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          {/* SVG Gauge */}
          <div className="relative w-64 h-32">
            <svg viewBox="0 0 200 100" className="w-full h-full">
              <defs>
                <linearGradient id="red-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#EF4444" />
                  <stop offset="100%" stopColor="#DC2626" />
                </linearGradient>
                <linearGradient id="orange-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#F59E0B" />
                  <stop offset="100%" stopColor="#D97706" />
                </linearGradient>
                <linearGradient id="green-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#10B981" />
                  <stop offset="100%" stopColor="#059669" />
                </linearGradient>
              </defs>

              {/* Background arc - full semicircle */}
              <path
                d="M 30 90 A 70 70 0 0 1 170 90"
                fill="none"
                stroke="#E5E7EB"
                strokeWidth="16"
                strokeLinecap="round"
              />
              
              {/* Red segment (0-33%) */}
              <path
                d="M 30 90 A 70 70 0 0 1 76.67 28.33"
                fill="none"
                stroke="url(#red-gradient)"
                strokeWidth="16"
                strokeLinecap="round"
              />
              
              {/* Orange segment (33-66%) */}
              <path
                d="M 76.67 28.33 A 70 70 0 0 1 123.33 28.33"
                fill="none"
                stroke="url(#orange-gradient)"
                strokeWidth="16"
                strokeLinecap="round"
              />
              
              {/* Green segment (66-100%) */}
              <path
                d="M 123.33 28.33 A 70 70 0 0 1 170 90"
                fill="none"
                stroke="url(#green-gradient)"
                strokeWidth="16"
                strokeLinecap="round"
              />
              
              {/* Tick marks */}
              <line x1="30" y1="90" x2="30" y2="80" stroke="#6B7280" strokeWidth="2" />
              <line x1="100" y1="20" x2="100" y2="30" stroke="#6B7280" strokeWidth="2" />
              <line x1="170" y1="90" x2="170" y2="80" stroke="#6B7280" strokeWidth="2" />
              
              {/* Labels */}
              <text x="30" y="105" textAnchor="middle" fontSize="10" fill="#6B7280">0%</text>
              <text x="100" y="15" textAnchor="middle" fontSize="10" fill="#6B7280">50%</text>
              <text x="170" y="105" textAnchor="middle" fontSize="10" fill="#6B7280">100%</text>
              
              {/* Center pivot */}
              <circle cx="100" cy="90" r="10" fill="#1F2937" />
              <circle cx="100" cy="90" r="6" fill="#374151" />
              
              {/* Needle */}
              <g transform={`rotate(${rotation} 100 90)`}>
                <path
                  d="M 100 90 L 98 85 L 100 25 L 102 85 Z"
                  fill="#1F2937"
                  stroke="#000"
                  strokeWidth="0.5"
                />
                <circle cx="100" cy="25" r="3" fill="#DC2626" />
              </g>
            </svg>
          </div>

          {/* Value Display */}
          <div className="text-center mt-4">
            <div className="text-3xl font-bold text-gray-900">
              {unit}{formatValue(current)} ({clampedPercentage.toFixed(0)}%)
            </div>
            <div className="text-sm text-gray-500 mt-1">
              Target: {unit}{formatValue(target)}
            </div>
            <div className={`flex items-center justify-center gap-2 mt-3 ${status.color}`}>
              <span className="text-sm font-semibold">{status.text}</span>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full mt-4">
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-1000 ease-out ${
                  clampedPercentage >= 75 ? 'bg-green-500' :
                  clampedPercentage >= 50 ? 'bg-orange-500' : 'bg-red-500'
                }`}
                style={{ width: `${clampedPercentage}%` }}
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TargetGauge;
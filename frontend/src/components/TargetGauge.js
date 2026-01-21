import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const TargetGauge = ({ current, target, label, unit = "$" }) => {
  const percentage = target > 0 ? (current / target) * 100 : 0;
  const clampedPercentage = Math.min(Math.max(percentage, 0), 100);
  
  // Calculate rotation for needle (-90 to +90 degrees)
  const rotation = -90 + (clampedPercentage / 100) * 180;

  const getSegmentColor = (segment) => {
    switch(segment) {
      case 'low': return '#EF4444'; // red
      case 'mid': return '#F59E0B'; // orange
      case 'high': return '#10B981'; // green
      default: return '#6B7280';
    }
  };

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
              {/* Background segments */}
              <path
                d="M 20 90 A 80 80 0 0 1 100 10"
                fill="none"
                stroke={getSegmentColor('low')}
                strokeWidth="20"
                strokeLinecap="round"
              />
              <path
                d="M 100 10 A 80 80 0 0 1 140 30"
                fill="none"
                stroke={getSegmentColor('mid')}
                strokeWidth="20"
                strokeLinecap="round"
              />
              <path
                d="M 140 30 A 80 80 0 0 1 180 90"
                fill="none"
                stroke={getSegmentColor('high')}
                strokeWidth="20"
                strokeLinecap="round"
              />
              
              {/* Center circle */}
              <circle cx="100" cy="90" r="8" fill="#1F2937" />
              
              {/* Needle */}
              <line
                x1="100"
                y1="90"
                x2="100"
                y2="30"
                stroke="#1F2937"
                strokeWidth="3"
                strokeLinecap="round"
                transform={`rotate(${rotation} 100 90)`}
                className="transition-transform duration-1000 ease-out"
              />
              
              {/* Needle tip */}
              <circle
                cx="100"
                cy="30"
                r="4"
                fill="#1F2937"
                transform={`rotate(${rotation} 100 90)`}
                className="transition-transform duration-1000 ease-out"
              />
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
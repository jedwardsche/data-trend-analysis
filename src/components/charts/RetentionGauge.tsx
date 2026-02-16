import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatPercent } from '@/lib/formatters';

interface RetentionGaugeProps {
  rate: number;
  returningStudents: number;
  eligibleStudents: number;
}

export function RetentionGauge({ rate, returningStudents, eligibleStudents }: RetentionGaugeProps) {
  // Calculate stroke dash for the gauge
  const circumference = 2 * Math.PI * 45; // radius = 45
  const strokeDashoffset = circumference - (rate / 100) * circumference;

  // Color based on rate
  const getColor = () => {
    if (rate >= 80) return 'text-green-500';
    if (rate >= 60) return 'text-yellow-500';
    return 'text-red-500';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Retention Rate</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col items-center">
        <div className="relative w-32 h-32">
          <svg className="w-32 h-32 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              className="text-muted"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="45"
              stroke="currentColor"
              strokeWidth="10"
              fill="none"
              strokeLinecap="round"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              className={getColor()}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-2xl font-bold ${getColor()}`}>
              {formatPercent(rate)}
            </span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-4 text-center">
          {returningStudents.toLocaleString()} of {eligibleStudents.toLocaleString()} eligible students returned
        </p>
      </CardContent>
    </Card>
  );
}

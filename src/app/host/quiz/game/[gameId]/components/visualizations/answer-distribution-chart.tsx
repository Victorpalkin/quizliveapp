import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Bar, BarChart, XAxis, YAxis, ResponsiveContainer, LabelList, Text } from 'recharts';
import { CheckCircle } from 'lucide-react';

interface AnswerDistributionChartProps {
  data: { name: string; total: number; isCorrect: boolean }[];
}

export function AnswerDistributionChart({ data }: AnswerDistributionChartProps) {
  const CustomBarLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    if (value === 0) return null;
    return (
      <text x={x + width + 10} y={y + height / 2} fill="hsl(var(--foreground))" textAnchor="start" dominantBaseline="middle" className="text-sm font-bold">
        {`${value}`}
      </text>
    );
  };

  const CustomBar = (props: any) => {
    const { fill, x, y, width, height, isCorrect, name, ...restProps } = props;

    return (
      <g>
        <rect
          {...restProps}
          fill={isCorrect ? 'hsl(var(--primary))' : 'hsl(var(--muted))'}
          x={x}
          y={y}
          width={width}
          height={height}
          radius={[0, 4, 4, 0]}
        />
        {isCorrect && (
          <CheckCircle
            x={x + width - 24}
            y={y + height / 2 - 8}
            width={16}
            height={16}
            className="text-white"
          />
        )}
      </g>
    );
  };

  const CustomizedYAxisTick = (props: any) => {
    const { x, y, payload } = props;
    return (
      <Text
        x={x}
        y={y}
        width={150}
        textAnchor="end"
        verticalAnchor="middle"
        fill="hsl(var(--muted-foreground))"
        className="text-xs"
      >
        {payload.value}
      </Text>
    );
  };

  return (
    <Card className="w-full max-w-2xl flex-1">
      <CardHeader>
        <CardTitle>Answer Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 10, bottom: 5 }}>
            <XAxis type="number" hide={true} />
            <YAxis
              dataKey="name"
              type="category"
              width={150}
              tickLine={false}
              axisLine={false}
              tick={<CustomizedYAxisTick/>}
            />
            <Bar dataKey="total" minPointSize={2} shape={<CustomBar />}>
              <LabelList dataKey="total" content={<CustomBarLabel />} />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}

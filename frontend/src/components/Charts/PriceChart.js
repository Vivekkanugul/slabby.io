import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { formatCurrency } from '../../lib/utils';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0A0A0C] border border-white/10 rounded-lg p-3 shadow-xl">
        <p className="text-xs text-zinc-400 mb-1">{label}</p>
        <p className="font-mono font-medium text-white">
          {formatCurrency(payload[0].value)}
        </p>
        {payload[0].payload.volume && (
          <p className="text-xs text-zinc-500 mt-1">
            Volume: {payload[0].payload.volume}
          </p>
        )}
      </div>
    );
  }
  return null;
};

export const PriceChart = ({ data, height = 300, showGrid = true, color = '#007AFF' }) => {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-zinc-500">
        No price data available
      </div>
    );
  }

  const isPositive = data[data.length - 1]?.price >= data[0]?.price;
  const chartColor = isPositive ? '#10B981' : '#FF3B30';

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="100%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        {showGrid && (
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
        )}
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#52525B', fontSize: 11 }}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          }}
          interval="preserveStartEnd"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fill: '#52525B', fontSize: 11 }}
          tickFormatter={(value) => formatCurrency(value, true)}
          domain={['dataMin - 5%', 'dataMax + 5%']}
          width={70}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="price"
          stroke={chartColor}
          strokeWidth={2}
          fill="url(#priceGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

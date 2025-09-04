import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { Box, Typography } from '@mui/material';
import { GradeDistribution } from '~/lib/analysis/route-analysis';

interface GradeDistributionChartProps {
  gradeDistribution: GradeDistribution;
  totalDistance: number;
}

// Colors matching elevation chart gradients
const GRADE_COLORS = {
  // Downhill grades - blue tones
  'gradeNegOver25': '#1565C0',    // Deep blue for steepest downhill
  'gradeNeg25ToNeg15': '#1976D2', // Blue
  'gradeNeg15ToNeg10': '#1E88E5', // Light blue
  'gradeNeg10ToNeg5': '#42A5F5',  // Lighter blue
  'gradeNeg5To0': '#64B5F6',      // Very light blue
  
  // Uphill grades - green to red progression
  'grade0To5': '#4CAF50',         // Green for easy
  'grade5To10': '#8BC34A',        // Light green
  'grade10To15': '#FFC107',       // Yellow/amber for moderate
  'grade15To25': '#FF9800',       // Orange for hard
  'gradeOver25': '#F44336',       // Red for very hard
};

export const GradeDistributionChart: React.FC<GradeDistributionChartProps> = ({
  gradeDistribution,
  totalDistance
}) => {
  // Convert distances to percentages and prepare data
  const totalDistanceKm = totalDistance / 1000;
  
  const chartData = [
    {
      range: '<-25%',
      percentage: (gradeDistribution.gradeNegOver25Km / totalDistanceKm) * 100,
      color: GRADE_COLORS.gradeNegOver25,
      distance: gradeDistribution.gradeNegOver25Km,
    },
    {
      range: '-25 to -15%',
      percentage: (gradeDistribution.gradeNeg25ToNeg15Km / totalDistanceKm) * 100,
      color: GRADE_COLORS.gradeNeg25ToNeg15,
      distance: gradeDistribution.gradeNeg25ToNeg15Km,
    },
    {
      range: '-15 to -10%',
      percentage: (gradeDistribution.gradeNeg15ToNeg10Km / totalDistanceKm) * 100,
      color: GRADE_COLORS.gradeNeg15ToNeg10,
      distance: gradeDistribution.gradeNeg15ToNeg10Km,
    },
    {
      range: '-10 to -5%',
      percentage: (gradeDistribution.gradeNeg10ToNeg5Km / totalDistanceKm) * 100,
      color: GRADE_COLORS.gradeNeg10ToNeg5,
      distance: gradeDistribution.gradeNeg10ToNeg5Km,
    },
    {
      range: '-5 to 0%',
      percentage: (gradeDistribution.gradeNeg5To0Km / totalDistanceKm) * 100,
      color: GRADE_COLORS.gradeNeg5To0,
      distance: gradeDistribution.gradeNeg5To0Km,
    },
    {
      range: '0 to 5%',
      percentage: (gradeDistribution.grade0To5Km / totalDistanceKm) * 100,
      color: GRADE_COLORS.grade0To5,
      distance: gradeDistribution.grade0To5Km,
    },
    {
      range: '5 to 10%',
      percentage: (gradeDistribution.grade5To10Km / totalDistanceKm) * 100,
      color: GRADE_COLORS.grade5To10,
      distance: gradeDistribution.grade5To10Km,
    },
    {
      range: '10 to 15%',
      percentage: (gradeDistribution.grade10To15Km / totalDistanceKm) * 100,
      color: GRADE_COLORS.grade10To15,
      distance: gradeDistribution.grade10To15Km,
    },
    {
      range: '15 to 25%',
      percentage: (gradeDistribution.grade15To25Km / totalDistanceKm) * 100,
      color: GRADE_COLORS.grade15To25,
      distance: gradeDistribution.grade15To25Km,
    },
    {
      range: '>25%',
      percentage: (gradeDistribution.gradeOver25Km / totalDistanceKm) * 100,
      color: GRADE_COLORS.gradeOver25,
      distance: gradeDistribution.gradeOver25Km,
    },
  ].filter(item => item.percentage > 0); // Only show ranges with data

  const CustomTooltip = ({ active, payload, label }: {
    active?: boolean;
    payload?: Array<{ payload: typeof chartData[0] }>;
    label?: string;
  }) => {
    if (active && payload && payload.length && payload[0]) {
      const data = payload[0].payload;
      return (
        <Box
          sx={{
            backgroundColor: 'background.paper',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            p: 1.5,
            boxShadow: 2,
          }}
        >
          <Typography variant="body2" fontWeight="medium">
            Grade: {label}
          </Typography>
          <Typography variant="body2" color="primary">
            {data.percentage.toFixed(1)}% of route
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {data.distance.toFixed(1)} km
          </Typography>
        </Box>
      );
    }
    return null;
  };

  if (chartData.length === 0) {
    return (
      <Box sx={{ textAlign: 'center', py: 4 }}>
        <Typography variant="body2" color="text.secondary">
          No grade distribution data available
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ width: '100%', height: 300 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: 10,
            bottom: 40,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#e0e0e0" />
          <XAxis 
            dataKey="range"
            tick={{ fontSize: 11 }}
            angle={-45}
            textAnchor="end"
            height={80}
            stroke="#666"
          />
          <YAxis 
            tick={{ fontSize: 11 }}
            stroke="#666"
            domain={[0, 'dataMax']}
            ticks={[0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100]}
            label={{ 
              value: 'Percentage (%)', 
              angle: -90, 
              position: 'insideLeft',
              style: { textAnchor: 'middle', fontSize: '12px' }
            }}
          />
          <Tooltip content={<CustomTooltip />} />
          <Bar 
            dataKey="percentage" 
            radius={[2, 2, 0, 0]}
          >
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
};
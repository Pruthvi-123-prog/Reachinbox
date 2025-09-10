import React from 'react';
import Plot from 'react-plotly.js';
import { Data, Layout } from 'plotly.js';

interface EmailAnalysis3DProps {
  data: {
    categories: string[];
    values: number[];
    colors?: string[];
  };
  isPreview?: boolean;
  title?: string;
}

const EmailAnalysis3D: React.FC<EmailAnalysis3DProps> = ({ 
  data, 
  isPreview = true, 
  title = "Email Analysis" 
}) => {
  const plotData: Data[] = [
    {
      type: 'pie',
      labels: data.categories,
      values: data.values,
      hole: 0.4,
      textinfo: 'label+percent',
      textposition: 'outside',
      marker: {
        colors: data.colors || [
          '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', 
          '#FFEAA7', '#DDA0DD', '#98D8C8', '#F7DC6F'
        ],
        line: {
          color: '#000000',
          width: 2
        }
      },
      hovertemplate: '<b>%{label}</b><br>Emails: %{value}<br>Percentage: %{percent}<extra></extra>'
    }
  ];

  const layout: Partial<Layout> = {
    title: isPreview ? undefined : { text: title },
    font: {
      color: '#ffffff',
      family: 'Arial, sans-serif'
    },
    paper_bgcolor: 'rgba(0,0,0,0)',
    plot_bgcolor: 'rgba(0,0,0,0)',
    showlegend: !isPreview,
    legend: {
      x: 0.5,
      y: -0.1,
      xanchor: 'center',
      font: {
        color: '#ffffff'
      }
    },
    margin: {
      l: 20,
      r: 20,
      t: isPreview ? 20 : 40,
      b: 20
    },
    height: isPreview ? 300 : 500
  };

  const config = {
    displayModeBar: !isPreview,
    responsive: true,
    scrollZoom: false,
    staticPlot: isPreview
  };

  return (
    <div style={{ 
      width: '100%', 
      height: isPreview ? '300px' : '100%'
    }}>
      <Plot
        data={plotData}
        layout={layout}
        config={config}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
};

export default EmailAnalysis3D;


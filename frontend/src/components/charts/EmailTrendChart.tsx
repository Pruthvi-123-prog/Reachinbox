import React from 'react';
import Highcharts from 'highcharts';
import HighchartsReact from 'highcharts-react-official';

interface EmailTrendChartProps {
  data: {
    labels: string[];
    values: number[];
    seriesName?: string;
  };
  isPreview?: boolean;
  title?: string;
  type?: 'line' | 'column' | 'area';
}

const EmailTrendChart: React.FC<EmailTrendChartProps> = ({ 
  data, 
  isPreview = true, 
  title = "Email Trends",
  type = 'line'
}) => {
  const chartOptions = {
    chart: {
      type: type,
      backgroundColor: 'transparent',
      style: {
        fontFamily: 'Arial, sans-serif'
      },
      height: isPreview ? 200 : '100%',
      marginTop: isPreview ? 5 : 40,
      marginBottom: isPreview ? 5 : 40
    },
    title: {
      text: isPreview ? '' : title,
      style: {
        color: '#ffffff'
      }
    },
    xAxis: {
      categories: data.labels,
      labels: {
        style: {
          color: '#ffffff'
        }
      },
      gridLineWidth: 1,
      gridLineColor: 'rgba(255, 255, 255, 0.1)',
      lineColor: '#ffffff',
      tickColor: '#ffffff'
    },
    yAxis: {
      title: {
        text: 'Number of Emails',
        style: {
          color: '#ffffff'
        }
      },
      labels: {
        style: {
          color: '#ffffff'
        }
      },
      gridLineColor: 'rgba(255, 255, 255, 0.1)'
    },
    series: [{
      name: data.seriesName || 'Emails',
      data: data.values,
      marker: {
        symbol: 'circle',
        radius: 4
      },
      lineWidth: 2,
      color: '#4CAF50'
    }],
    legend: {
      enabled: !isPreview,
      itemStyle: {
        color: '#ffffff'
      },
      itemHoverStyle: {
        color: '#cccccc'
      }
    },
    tooltip: {
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      style: {
        color: '#ffffff'
      },
      borderWidth: 0,
      shared: true,
      crosshairs: true
    },
    plotOptions: {
      [type]: {
        animation: true,
        cursor: 'pointer',
        dataLabels: {
          enabled: false
        }
      },
      series: {
        states: {
          hover: {
            lineWidth: 3
          }
        }
      }
    },
    responsive: {
      rules: [{
        condition: {
          maxWidth: 500
        },
        chartOptions: {
          legend: {
            enabled: false
          },
          yAxis: {
            labels: {
              enabled: false
            }
          }
        }
      }]
    },
    credits: {
      enabled: false
    }
  };

  return (
    <div style={{ 
      width: '100%', 
      height: isPreview ? '200px' : '100%'
    }}>
      <HighchartsReact
        highcharts={Highcharts}
        options={chartOptions}
      />
    </div>
  );
};

export default EmailTrendChart;


import React, { useEffect, useRef } from 'react';
import { select, selectAll } from 'd3-selection';
import { scaleSequential } from 'd3-scale';
import { interpolateRainbow } from 'd3-scale-chromatic';
import { arc, pie } from 'd3-shape';

interface D3RingChartProps {
  data: {
    categories: string[];
    values: number[];
    colors?: string[];
  };
  isPreview?: boolean;
  title?: string;
}

const D3RingChart: React.FC<D3RingChartProps> = ({ 
  data, 
  isPreview = true, 
  title = "Email Categories" 
}) => {
  const d3Container = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (data && d3Container.current && data.categories.length > 0) {
      select(d3Container.current).selectAll('*').remove();

      const margin = isPreview ? 20 : 40;
      const width = d3Container.current.clientWidth;
      const height = d3Container.current.clientHeight;
      const radius = Math.min(width, height) / 2 - margin;

      // Create SVG
      const svg = select(d3Container.current)
        .append('svg')
        .attr('width', width)
        .attr('height', height)
        .append('g')
        .attr('transform', `translate(${width / 2},${height / 2})`);

      // Enhanced color scale with gradients
      const colorScale = scaleSequential()
        .domain([0, data.categories.length])
        .interpolator(interpolateRainbow);

      // Create gradient definitions
      const defs = svg.append('defs');
      
      data.categories.forEach((_, i) => {
        const gradient = defs.append('linearGradient')
          .attr('id', `gradient-${i}`)
          .attr('x1', '0%')
          .attr('y1', '0%')
          .attr('x2', '100%')
          .attr('y2', '100%');

        gradient.append('stop')
          .attr('offset', '0%')
          .attr('stop-color', data.colors?.[i] || colorScale(i))
          .attr('stop-opacity', 0.8);

        gradient.append('stop')
          .attr('offset', '100%')
          .attr('stop-color', data.colors?.[i] || colorScale(i + 0.5))
          .attr('stop-opacity', 1);
      });

      // Center text group
      const centerText = svg.append('g')
        .attr('class', 'center-text')
        .attr('transform', `translate(0, 0)`);

      centerText.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0em')
        .attr('class', 'main-label')
        .style('fill', 'white')
        .style('font-size', isPreview ? '12px' : '16px')
        .text(title);

      centerText.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '1.2em')
        .attr('class', 'sub-label')
        .style('fill', '#999')
        .style('font-size', isPreview ? '10px' : '14px')
        .text('Hover for details');

      // Create pie chart
      const arcGenerator = arc()
        .innerRadius(radius * 0.4)
        .outerRadius(radius * 0.9)
        .padAngle(0.02)
        .cornerRadius(4);

      const pieGenerator = pie<{category: string, value: number}>()
        .value((d: {category: string, value: number}) => d.value)
        .sort(null);

      const arcs = svg.selectAll('arc')
        .data(pieGenerator(data.categories.map((category, i) => ({
          category,
          value: data.values[i]
        }))))
        .enter()
        .append('g')
        .attr('class', 'arc')
        .style('cursor', 'pointer');

      arcs.append('path')
        .attr('d', arcGenerator as any)
        .attr('fill', (d: any, i: number) => `url(#gradient-${i})`)
        .attr('stroke', '#1a1a1a')
        .attr('stroke-width', 2)
        .style('transition', 'all 0.3s')
        .on('mouseover', function(this: SVGPathElement, event: any, d: any) {
          const el = select(this);
          el.transition()
            .duration(200)
            .attr('transform', function(d: any) {
              const [x, y] = arcGenerator.centroid(d);
              return `translate(${x * 0.05},${y * 0.05})`;
            })
            .style('filter', 'brightness(1.2)');

          // Update center text
          const total = data.values.reduce((sum, val) => sum + val, 0);
          const percentage = ((d.data.value / total) * 100).toFixed(1);
          
          centerText.select('.main-label')
            .text(d.data.category)
            .transition()
            .duration(200)
            .style('font-size', isPreview ? '11px' : '15px');

          centerText.select('.sub-label')
            .text(`${d.data.value} emails (${percentage}%)`)
            .transition()
            .duration(200)
            .style('fill', data.colors?.[d.index] || colorScale(d.index));
        })
        .on('mouseout', function(this: SVGPathElement) {
          select(this)
            .transition()
            .duration(200)
            .attr('transform', 'translate(0,0)')
            .style('filter', 'none');

          // Reset center text
          centerText.select('.main-label')
            .text(title)
            .transition()
            .duration(200)
            .style('font-size', isPreview ? '12px' : '16px');

          centerText.select('.sub-label')
            .text('Hover for details')
            .transition()
            .duration(200)
            .style('fill', '#999');
        });

      // Add labels outside the chart
      arcs.append('text')
        .attr('transform', function(d: any) {
          const [x, y] = arcGenerator.centroid(d);
          const angle = Math.atan2(y, x);
          const x2 = Math.cos(angle) * (radius * 1.1);
          const y2 = Math.sin(angle) * (radius * 1.1);
          return `translate(${x2},${y2})`;
        })
        .attr('text-anchor', function(d: any) {
          const [x] = arcGenerator.centroid(d);
          return x > 0 ? 'start' : 'end';
        })
        .style('fill', 'white')
        .style('font-size', isPreview ? '10px' : '12px')
        .text((d: any) => d.data.category);
    }
  }, [data, isPreview, title]);

  return (
    <div 
      ref={d3Container} 
      style={{ 
        width: '100%', 
        height: '100%',
        position: 'relative'
      }}
    />
  );
};

export default D3RingChart;

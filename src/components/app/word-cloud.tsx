'use client';

import { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import cloud from 'd3-cloud';
import type { TopicEntry } from '@/lib/types';

interface WordCloudProps {
  topics: TopicEntry[];
  width?: number;
  height?: number;
  className?: string;
}

interface CloudWord {
  text: string;
  size: number;
  count: number;
  x?: number;
  y?: number;
  rotate?: number;
}

// Color palette for the word cloud
const COLORS = [
  '#3B82F6', // blue-500
  '#8B5CF6', // violet-500
  '#EC4899', // pink-500
  '#06B6D4', // cyan-500
  '#10B981', // emerald-500
  '#F59E0B', // amber-500
  '#EF4444', // red-500
  '#6366F1', // indigo-500
];

export function WordCloud({ topics, width = 600, height = 400, className = '' }: WordCloudProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width, height });

  // Handle responsive sizing
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const { width: containerWidth } = containerRef.current.getBoundingClientRect();
        setDimensions({
          width: Math.min(containerWidth, 800),
          height: Math.min(containerWidth * 0.6, 500),
        });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current || !topics.length) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Calculate font sizes based on count
    const maxCount = Math.max(...topics.map(t => t.count));
    const minCount = Math.min(...topics.map(t => t.count));
    const fontSizeScale = d3.scaleLinear()
      .domain([minCount, maxCount])
      .range([16, 64]);

    // Prepare words for the cloud
    const words: CloudWord[] = topics.map(topic => ({
      text: topic.topic,
      size: fontSizeScale(topic.count),
      count: topic.count,
    }));

    // Create the cloud layout
    const layout = cloud<CloudWord>()
      .size([dimensions.width, dimensions.height])
      .words(words)
      .padding(5)
      .rotate(() => (Math.random() > 0.5 ? 0 : 90 * (Math.random() > 0.5 ? 1 : -1)))
      .font('Inter, system-ui, sans-serif')
      .fontSize(d => d.size)
      .spiral('archimedean')
      .on('end', draw);

    layout.start();

    function draw(words: CloudWord[]) {
      const group = svg
        .attr('width', dimensions.width)
        .attr('height', dimensions.height)
        .append('g')
        .attr('transform', `translate(${dimensions.width / 2},${dimensions.height / 2})`);

      // Add words with animation
      group
        .selectAll('text')
        .data(words)
        .enter()
        .append('text')
        .style('font-size', '0px')
        .style('font-family', 'Inter, system-ui, sans-serif')
        .style('font-weight', '600')
        .style('fill', (_, i) => COLORS[i % COLORS.length])
        .style('cursor', 'pointer')
        .attr('text-anchor', 'middle')
        .attr('transform', d => `translate(${d.x},${d.y}) rotate(${d.rotate})`)
        .text(d => d.text)
        .transition()
        .duration(600)
        .delay((_, i) => i * 50)
        .style('font-size', d => `${d.size}px`)
        .style('opacity', 1);

      // Add hover effect
      group
        .selectAll('text')
        .on('mouseenter', function(event, d) {
          d3.select(this)
            .transition()
            .duration(200)
            .style('font-size', `${(d as CloudWord).size * 1.2}px`)
            .style('fill', '#1F2937');
        })
        .on('mouseleave', function(event, d) {
          const index = words.indexOf(d as CloudWord);
          d3.select(this)
            .transition()
            .duration(200)
            .style('font-size', `${(d as CloudWord).size}px`)
            .style('fill', COLORS[index % COLORS.length]);
        });
    }
  }, [topics, dimensions]);

  if (!topics.length) {
    return (
      <div className={`flex items-center justify-center ${className}`} style={{ height: dimensions.height }}>
        <p className="text-muted-foreground">No topics to display</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={`w-full ${className}`}>
      <svg
        ref={svgRef}
        className="mx-auto"
        style={{ maxWidth: '100%', height: 'auto' }}
      />
    </div>
  );
}

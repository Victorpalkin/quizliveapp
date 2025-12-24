'use client';

import { SlideHostProps } from '../types';
import { RatingSingleResult } from './RatingSingleResult';
import { RatingComparisonResult } from './RatingComparisonResult';
import { RatingLiveResult } from './RatingLiveResult';

/**
 * RatingResultsHost dispatches to the appropriate result component
 * based on the ratingResultsMode setting.
 */
export function RatingResultsHost(props: SlideHostProps) {
  const { slide } = props;
  const mode = slide.ratingResultsMode || 'single';

  switch (mode) {
    case 'comparison':
      return <RatingComparisonResult {...props} />;
    case 'live':
      return <RatingLiveResult {...props} />;
    case 'single':
    default:
      return <RatingSingleResult {...props} />;
  }
}

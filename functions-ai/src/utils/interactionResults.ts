import * as admin from 'firebase-admin';

interface SlideElement {
  id: string;
  type: string;
  pollConfig?: { question: string; options: { text: string }[] };
  quizConfig?: { question: string; correctAnswerIndex: number };
  evaluationConfig?: { title: string; items: { id: string; text: string }[]; metrics: { id: string; name: string }[] };
  thoughtsConfig?: { prompt: string };
  ratingConfig?: { itemTitle: string; items?: { id: string; text: string }[]; question?: string };
  [key: string]: unknown;
}

interface Slide {
  id: string;
  order: number;
  elements: SlideElement[];
}

// ── Per-type result loaders ──

async function loadPollResult(
  db: admin.firestore.Firestore,
  gameId: string,
  el: SlideElement
): Promise<string | null> {
  const snapshot = await db
    .collection('games').doc(gameId)
    .collection('responses')
    .where('elementId', '==', el.id)
    .get();

  if (snapshot.empty) return null;

  const options = el.pollConfig?.options || [];
  const dist: Record<string, number> = {};

  for (const doc of snapshot.docs) {
    const data = doc.data();
    // Handle both single and multi-select
    const indices: number[] = data.answerIndices || (data.answerIndex !== undefined ? [data.answerIndex] : []);
    for (const idx of indices) {
      const label = options[idx]?.text || `Option ${idx + 1}`;
      dist[label] = (dist[label] || 0) + 1;
    }
  }

  if (Object.keys(dist).length === 0) return null;

  const total = Object.values(dist).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(dist).sort((a, b) => b[1] - a[1]);
  const winner = sorted[0];
  const pct = total > 0 ? Math.round((winner[1] / total) * 100) : 0;
  const question = el.pollConfig?.question || 'Poll';
  return `[Poll Result — "${question}"] Audience voted: ${winner[0]} (${pct}%, ${total} total votes). All options: ${sorted.map(([opt, cnt]) => `${opt}: ${cnt}`).join(', ')}`;
}

async function loadEvaluationResult(
  db: admin.firestore.Firestore,
  gameId: string,
  el: SlideElement
): Promise<string | null> {
  const snapshot = await db
    .collection('games').doc(gameId)
    .collection('responses')
    .where('elementId', '==', el.id)
    .get();

  if (snapshot.empty) return null;

  const configItems = el.evaluationConfig?.items || [];
  const metrics = el.evaluationConfig?.metrics || [];
  if (configItems.length === 0 || metrics.length === 0) return null;

  // Aggregate: itemId -> { totalScore, count }
  const itemScores: Record<string, { total: number; count: number }> = {};
  for (const item of configItems) {
    itemScores[item.id] = { total: 0, count: 0 };
  }

  for (const doc of snapshot.docs) {
    const data = doc.data();
    const evaluationRatings = data.evaluationRatings as Record<string, Record<string, number>> | undefined;
    if (!evaluationRatings) continue;

    for (const [itemId, metricRatings] of Object.entries(evaluationRatings)) {
      if (!itemScores[itemId]) continue;
      // Average across metrics for this item
      const values = Object.values(metricRatings).filter((v): v is number => typeof v === 'number');
      if (values.length > 0) {
        const avg = values.reduce((a, b) => a + b, 0) / values.length;
        itemScores[itemId].total += avg;
        itemScores[itemId].count += 1;
      }
    }
  }

  const ranked = configItems
    .map((item) => ({
      name: item.text,
      avg: itemScores[item.id].count > 0 ? itemScores[item.id].total / itemScores[item.id].count : 0,
      count: itemScores[item.id].count,
    }))
    .filter((i) => i.count > 0)
    .sort((a, b) => b.avg - a.avg);

  if (ranked.length === 0) return null;

  const title = el.evaluationConfig?.title || 'Evaluation';
  return `[Evaluation Result — "${title}"] Audience ranked: ${ranked.map((item, i) => `${i + 1}. ${item.name} (${item.avg.toFixed(1)}/5)`).join(', ')}`;
}

async function loadThoughtsResult(
  db: admin.firestore.Firestore,
  gameId: string,
  el: SlideElement
): Promise<string | null> {
  const snapshot = await db
    .collection('games').doc(gameId)
    .collection('responses')
    .where('elementId', '==', el.id)
    .limit(50)
    .get();

  if (snapshot.empty) return null;

  const thoughts: string[] = [];
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const textAnswers = data.textAnswers as string[] | undefined;
    if (textAnswers) {
      thoughts.push(...textAnswers);
    }
  }

  if (thoughts.length === 0) return null;

  const prompt = el.thoughtsConfig?.prompt || 'Thoughts gathering';
  return `[Thoughts Result — "${prompt}"] ${thoughts.length} audience submissions: ${thoughts.slice(0, 20).map(t => `"${t}"`).join(', ')}${thoughts.length > 20 ? ` ... and ${thoughts.length - 20} more` : ''}`;
}

async function loadQuizResult(
  db: admin.firestore.Firestore,
  gameId: string,
  el: SlideElement
): Promise<string | null> {
  const snapshot = await db
    .collection('games').doc(gameId)
    .collection('responses')
    .where('elementId', '==', el.id)
    .get();

  if (snapshot.empty) return null;

  const correctIndex = el.quizConfig?.correctAnswerIndex;
  let totalResponses = 0;
  let correctCount = 0;

  for (const doc of snapshot.docs) {
    const data = doc.data();
    totalResponses++;
    if (correctIndex !== undefined && data.answerIndex === correctIndex) {
      correctCount++;
    }
  }

  if (totalResponses === 0) return null;

  const pct = Math.round((correctCount / totalResponses) * 100);
  return `[Quiz Result] Knowledge check: ${pct}% answered correctly (${totalResponses} responses)`;
}

async function loadRatingResult(
  db: admin.firestore.Firestore,
  gameId: string,
  el: SlideElement
): Promise<string | null> {
  const snapshot = await db
    .collection('games').doc(gameId)
    .collection('responses')
    .where('elementId', '==', el.id)
    .get();

  if (snapshot.empty) return null;

  // Check for multi-item (ratingValues) vs single-item (ratingValue)
  const multiItemResponses: Record<string, number>[] = [];
  const singleValues: number[] = [];

  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.ratingValues && Object.keys(data.ratingValues).length > 0) {
      multiItemResponses.push(data.ratingValues as Record<string, number>);
    } else if (typeof data.ratingValue === 'number') {
      singleValues.push(data.ratingValue);
    }
  }

  const question = el.ratingConfig?.question || el.ratingConfig?.itemTitle || 'Rating';

  if (multiItemResponses.length > 0) {
    // Multi-item: compute per-item averages
    const items = el.ratingConfig?.items || [];
    const itemTotals: Record<string, { sum: number; count: number; text: string }> = {};

    for (const item of items) {
      itemTotals[item.id] = { sum: 0, count: 0, text: item.text };
    }

    for (const rv of multiItemResponses) {
      for (const [itemId, val] of Object.entries(rv)) {
        if (!itemTotals[itemId]) {
          itemTotals[itemId] = { sum: 0, count: 0, text: itemId };
        }
        itemTotals[itemId].sum += val;
        itemTotals[itemId].count += 1;
      }
    }

    const ranked = Object.values(itemTotals)
      .filter((i) => i.count > 0)
      .map((i) => ({ name: i.text, avg: i.sum / i.count }))
      .sort((a, b) => b.avg - a.avg);

    if (ranked.length === 0) return null;

    return `[Rating Result — "${question}"] Audience rated ${ranked.length} items (${multiItemResponses.length} responses): ${ranked.map((item, i) => `${i + 1}. ${item.name} (${item.avg.toFixed(1)})`).join(', ')}`;
  }

  if (singleValues.length > 0) {
    const avg = singleValues.reduce((a, b) => a + b, 0) / singleValues.length;
    return `[Rating Result — "${question}"] Average rating: ${avg.toFixed(1)} (${singleValues.length} responses)`;
  }

  return null;
}

// ── Registry ──

const RESULT_LOADERS: Record<
  string,
  (db: admin.firestore.Firestore, gameId: string, el: SlideElement) => Promise<string | null>
> = {
  poll: loadPollResult,
  evaluation: loadEvaluationResult,
  thoughts: loadThoughtsResult,
  quiz: loadQuizResult,
  rating: loadRatingResult,
};

// ── Public API ──

/**
 * Load interaction results (poll, evaluation, thoughts, quiz, rating) from slides
 * between the earliest context source and the current slide.
 */
export async function loadInteractionResults(
  db: admin.firestore.Firestore,
  gameId: string,
  slides: Slide[],
  currentSlideOrder: number,
  contextSlideIds: string[]
): Promise<string> {
  const parts: string[] = [];

  // If context IDs are provided, only check those specific slides for interactions.
  // Otherwise check all prior slides.
  const slidesToCheck = contextSlideIds.length > 0
    ? slides.filter(s => contextSlideIds.includes(s.id) && s.order < currentSlideOrder)
    : slides.filter(s => s.order < currentSlideOrder);

  for (const slide of slidesToCheck) {
    for (const el of slide.elements) {
      const loader = RESULT_LOADERS[el.type];
      if (!loader) continue;

      try {
        const result = await loader(db, gameId, el);
        if (result) parts.push(result);
      } catch (err) {
        console.warn(`Failed to load interaction result for element ${el.id}:`, err);
      }
    }
  }

  return parts.join('\n\n');
}

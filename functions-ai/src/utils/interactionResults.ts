import * as admin from 'firebase-admin';

interface SlideElement {
  id: string;
  type: string;
  pollConfig?: { question: string; options: string[] };
  quizConfig?: { question: string };
  evaluationConfig?: { title: string };
  thoughtsConfig?: { prompt: string };
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
  const aggDoc = await db
    .collection('games').doc(gameId)
    .collection('aggregates').doc(el.id)
    .get();

  if (!aggDoc.exists) return null;

  const data = aggDoc.data();
  const optionCounts = data?.optionCounts as Record<string, number> | undefined;
  if (!optionCounts || Object.keys(optionCounts).length === 0) return null;

  const total = Object.values(optionCounts).reduce((s, v) => s + v, 0);
  const sorted = Object.entries(optionCounts).sort((a, b) => b[1] - a[1]);
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
  const aggDoc = await db
    .collection('games').doc(gameId)
    .collection('aggregates').doc(el.id)
    .get();

  if (!aggDoc.exists) return null;

  const data = aggDoc.data();
  const items = data?.items as { name: string; averageScore: number }[] | undefined;
  if (!items || items.length === 0) return null;

  const sorted = [...items].sort((a, b) => b.averageScore - a.averageScore);
  const title = el.evaluationConfig?.title || 'Evaluation';
  return `[Evaluation Result — "${title}"] Audience ranked: ${sorted.map((item, i) => `${i + 1}. ${item.name} (${item.averageScore.toFixed(1)}/5)`).join(', ')}`;
}

async function loadThoughtsResult(
  db: admin.firestore.Firestore,
  gameId: string,
  el: SlideElement
): Promise<string | null> {
  const responsesSnapshot = await db
    .collection('games').doc(gameId)
    .collection('responses').doc(el.id)
    .collection('items')
    .limit(50)
    .get();

  if (responsesSnapshot.empty) return null;

  const thoughts = responsesSnapshot.docs
    .map(d => d.data().text as string)
    .filter(Boolean);
  if (thoughts.length === 0) return null;

  const prompt = el.thoughtsConfig?.prompt || 'Thoughts gathering';
  return `[Thoughts Result — "${prompt}"] ${thoughts.length} audience submissions: ${thoughts.slice(0, 20).map(t => `"${t}"`).join(', ')}${thoughts.length > 20 ? ` ... and ${thoughts.length - 20} more` : ''}`;
}

async function loadQuizResult(
  db: admin.firestore.Firestore,
  gameId: string,
  el: SlideElement
): Promise<string | null> {
  const aggDoc = await db
    .collection('games').doc(gameId)
    .collection('aggregates').doc(el.id)
    .get();

  if (!aggDoc.exists) return null;

  const data = aggDoc.data();
  const totalResponses = data?.totalResponses as number | undefined;
  const correctCount = data?.correctCount as number | undefined;
  if (!totalResponses || totalResponses === 0) return null;

  const pct = Math.round(((correctCount ?? 0) / totalResponses) * 100);
  return `[Quiz Result] Knowledge check: ${pct}% answered correctly (${totalResponses} responses)`;
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
};

// ── Public API ──

/**
 * Load interaction results (poll, evaluation, thoughts, quiz) from slides
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

  const contextOrders = contextSlideIds
    .map(id => slides.find(s => s.id === id)?.order ?? -1)
    .filter(o => o >= 0);
  const earliestContextOrder = contextOrders.length > 0 ? Math.min(...contextOrders) : 0;

  const intermediateSlidesToCheck = slides.filter(
    s => s.order >= earliestContextOrder && s.order < currentSlideOrder
  );

  for (const slide of intermediateSlidesToCheck) {
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

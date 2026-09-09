const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
  'did', 'let', 'say', 'she', 'too', 'use', 'with', 'from', 'this', 'that',
  'have', 'been', 'were', 'they', 'what', 'when', 'where', 'which', 'will',
  'your', 'about', 'into', 'just', 'like', 'some', 'than', 'them', 'then',
  'very', 'also', 'back', 'been', 'come', 'could', 'does', 'each', 'find',
  'found', 'lost', 'item',
]);

function extractKeywords(text) {
  if (!text) return [];

  return [...new Set(
    text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter((word) => word.length > 2 && !STOP_WORDS.has(word))
  )].slice(0, 25);
}

function scoreLocationMatch(source, candidate) {
  if (!source?.name || !candidate?.name) return 0;

  const sourceName = source.name.toLowerCase();
  const candidateName = candidate.name.toLowerCase();

  if (sourceName === candidateName) return 25;
  if (sourceName.includes(candidateName) || candidateName.includes(sourceName)) return 15;

  if (
    source.building &&
    candidate.building &&
    source.building.toLowerCase() === candidate.building.toLowerCase()
  ) {
    return 10;
  }

  return 0;
}

function scoreDateProximity(sourceDate, candidateDate) {
  if (!sourceDate || !candidateDate) return 0;

  const diffDays = Math.abs(new Date(sourceDate) - new Date(candidateDate)) / (1000 * 60 * 60 * 24);

  if (diffDays <= 3) return 15;
  if (diffDays <= 7) return 12;
  if (diffDays <= 14) return 8;
  if (diffDays <= 30) return 4;

  return 0;
}

async function findMatchingItems(item, ItemModel, limit = 10) {
  const oppositeType = item.type === 'lost' ? 'found' : 'lost';
  const sourceKeywords = new Set(item.keywords || extractKeywords(`${item.title} ${item.description}`));

  const candidates = await ItemModel.find({
    _id: { $ne: item._id },
    type: oppositeType,
    status: 'active',
    category: item.category,
  })
    .populate('postedBy', 'name email avatar')
    .limit(100)
    .lean();

  const scored = candidates.map((candidate) => {
    let score = 30;

    const candidateKeywords = candidate.keywords || [];
    const overlap = candidateKeywords.filter((keyword) => sourceKeywords.has(keyword)).length;
    score += Math.min(overlap * 8, 32);

    score += scoreLocationMatch(item.location, candidate.location);
    score += scoreDateProximity(item.dateLostFound, candidate.dateLostFound);

    const titleWords = (item.title || '').toLowerCase().split(/\s+/);
    const candidateText = `${candidate.title} ${candidate.description}`.toLowerCase();
    const titleHits = titleWords.filter((word) => word.length > 3 && candidateText.includes(word)).length;
    score += Math.min(titleHits * 3, 12);

    return {
      ...candidate,
      matchScore: Math.min(Math.round(score), 100),
    };
  });

  return scored
    .filter((match) => match.matchScore >= 25)
    .sort((a, b) => b.matchScore - a.matchScore)
    .slice(0, limit);
}

async function createNotification(Notification, data) {
  return Notification.create(data);
}

module.exports = {
  extractKeywords,
  findMatchingItems,
  createNotification,
};

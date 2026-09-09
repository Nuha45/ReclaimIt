const STOP_WORDS = new Set([
  'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all', 'can', 'had',
  'her', 'was', 'one', 'our', 'out', 'day', 'get', 'has', 'him', 'his',
  'how', 'its', 'may', 'new', 'now', 'old', 'see', 'two', 'way', 'who',
  'did', 'let', 'say', 'she', 'too', 'use', 'with', 'from', 'this', 'that',
  'have', 'been', 'were', 'they', 'what', 'when', 'where', 'which', 'will',
  'your', 'about', 'into', 'just', 'like', 'some', 'than', 'them', 'then',
  'very', 'also', 'back', 'been', 'come', 'could', 'does', 'each', 'find',
  'found', 'lost', 'item', 'bottle', 'phone', 'bag', 'case', 'cover',
  'brown', 'black', 'white', 'blue', 'red', 'green', 'small', 'medium', 'large',
]);

const GENERIC_TITLES = new Set([
  'bottle', 'phone', 'bag', 'keys', 'key', 'wallet', 'laptop', 'charger',
  'headphones', 'earbuds', 'umbrella', 'book', 'notebook', 'watch', 'ring',
  'glasses', 'sunglasses', 'hat', 'jacket', 'hoodie', 'backpack', 'mouse',
  'cable', 'adapter', 'id', 'card', 'airpods',
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

function normalize(value) {
  return String(value || '').trim().toLowerCase();
}

function scoreLocationMatch(source, candidate) {
  if (!source?.name || !candidate?.name) return 0;

  const sourceName = normalize(source.name);
  const candidateName = normalize(candidate.name);

  if (sourceName === candidateName) return 14;
  if (sourceName.includes(candidateName) || candidateName.includes(sourceName)) return 8;

  if (
    source.building &&
    candidate.building &&
    normalize(source.building) === normalize(candidate.building)
  ) {
    return 6;
  }

  return 0;
}

function scoreDateProximity(sourceDate, candidateDate) {
  if (!sourceDate || !candidateDate) return 0;

  const diffDays = Math.abs(new Date(sourceDate) - new Date(candidateDate)) / (1000 * 60 * 60 * 24);

  if (diffDays <= 1) return 10;
  if (diffDays <= 3) return 7;
  if (diffDays <= 7) return 4;
  if (diffDays <= 14) return 2;

  return 0;
}

function scoreAttributeMatch(source, candidate) {
  let score = 0;
  let matched = 0;
  let mismatches = 0;

  if (source.color && candidate.color) {
    if (normalize(source.color) === normalize(candidate.color)) {
      score += 14;
      matched += 1;
    } else {
      score -= 12;
      mismatches += 1;
    }
  }

  if (source.brand && candidate.brand) {
    if (normalize(source.brand) === normalize(candidate.brand)) {
      score += 22;
      matched += 1;
    } else {
      score -= 16;
      mismatches += 1;
    }
  }

  if (source.size && candidate.size) {
    if (normalize(source.size) === normalize(candidate.size)) {
      score += 8;
      matched += 1;
    } else {
      score -= 4;
    }
  }

  if (source.condition && candidate.condition && normalize(source.condition) === normalize(candidate.condition)) {
    score += 3;
  }

  if (matched >= 2) score += 6;
  if (mismatches >= 1) score -= 6;

  return score;
}

async function findMatchingItems(item, ItemModel, limit = 10) {
  const oppositeType = item.type === 'lost' ? 'found' : 'lost';
  const sourceKeywords = new Set(
    item.keywords || extractKeywords(`${item.title} ${item.description} ${item.uniqueMarks || ''}`)
  );

  const candidates = await ItemModel.find({
    _id: { $ne: item._id },
    type: oppositeType,
    status: { $in: ['active'] },
    category: item.category,
  })
    .populate('postedBy', 'name email avatar')
    .limit(80)
    .lean();

  const scored = candidates.map((candidate) => {
    let score = 0;
    let strongSignals = 0;
    let specificSignals = 0;

    const candidateKeywords = candidate.keywords || extractKeywords(
      `${candidate.title} ${candidate.description} ${candidate.uniqueMarks || ''}`
    );
    const overlap = candidateKeywords.filter((keyword) => sourceKeywords.has(keyword)).length;
    if (overlap > 0) {
      score += Math.min(overlap * 6, 22);
      if (overlap >= 2) {
        strongSignals += 1;
        specificSignals += 1;
      }
    }

    const locationScore = scoreLocationMatch(item.location, candidate.location);
    score += locationScore;
    if (locationScore >= 8) strongSignals += 1;

    const dateScore = scoreDateProximity(item.dateLostFound, candidate.dateLostFound);
    score += dateScore;
    if (dateScore >= 7) strongSignals += 1;

    const attributeScore = scoreAttributeMatch(item, candidate);
    score += attributeScore;
    if (attributeScore >= 14) strongSignals += 1;
    if (attributeScore >= 22) specificSignals += 1;

    const sourceTitle = normalize(item.title);
    const candidateTitle = normalize(candidate.title);
    const isGenericTitle =
      GENERIC_TITLES.has(sourceTitle) ||
      GENERIC_TITLES.has(candidateTitle) ||
      sourceTitle.split(/\s+/).length === 1;

    if (sourceTitle && candidateTitle) {
      if (sourceTitle === candidateTitle) {
        // Exact "bottle" vs "bottle" is weak — don't treat as strong
        score += isGenericTitle ? 4 : 14;
        if (!isGenericTitle) {
          strongSignals += 1;
          specificSignals += 1;
        }
      } else {
        const titleWords = sourceTitle.split(/\s+/).filter((word) => word.length > 3 && !STOP_WORDS.has(word));
        const titleHits = titleWords.filter((word) => candidateTitle.includes(word)).length;
        score += Math.min(titleHits * 3, 8);
      }
    }

    // Unique marks / distinctive text overlap
    const sourceMarks = normalize(item.uniqueMarks);
    const candidateMarks = normalize(candidate.uniqueMarks);
    if (sourceMarks && candidateMarks && sourceMarks.length > 3) {
      if (sourceMarks === candidateMarks) {
        score += 16;
        strongSignals += 1;
        specificSignals += 1;
      } else if (sourceMarks.includes(candidateMarks) || candidateMarks.includes(sourceMarks)) {
        score += 8;
        specificSignals += 1;
      }
    }

    score = Math.max(0, Math.min(Math.round(score), 88));

    // Soft caps — category + vague title alone should never look like a perfect match
    if (strongSignals < 2) score = Math.min(score, 58);
    if (specificSignals < 1) score = Math.min(score, 64);
    if (score >= 80 && specificSignals < 2) score = 72;
    if (score >= 85 && (!item.brand || !candidate.brand || normalize(item.brand) !== normalize(candidate.brand))) {
      score = Math.min(score, 76);
    }

    return {
      ...candidate,
      matchScore: score,
      strongSignals,
      specificSignals,
    };
  });

  return scored
    .filter((match) => match.matchScore >= 42 && match.strongSignals >= 1)
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

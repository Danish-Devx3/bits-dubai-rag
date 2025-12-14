import { Injectable } from '@nestjs/common';

export enum QueryType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  MIXED = 'mixed',
}

// Synonym mappings for fuzzy keyword matching
const SYNONYMS: Record<string, string[]> = {
  'grades': ['marks', 'results', 'scores', 'transcript', 'grdes', 'grds', 'grad', 'grd'],
  'gpa': ['cgpa', 'gps', 'cgp', 'grade point'],
  'payment': ['fee', 'fees', 'dues', 'owe', 'balance', 'outstanding', 'pymnt', 'pymt', 'pament', 'tuition'],
  'attendance': ['absent', 'present', 'attend', 'class', 'miss', 'att', 'attnd', 'attendace', 'atendance'],
  'courses': ['enrolled', 'subjects', 'course', 'corse', 'cors', 'enrol', 'enroll'],
  'schedule': ['timetable', 'timing', 'slot', 'schdule', 'schedl'],
  'midsems': ['midsem', 'midterm', 'mid-sem', 'midsm'],
  'endsems': ['endsem', 'endterm', 'end-sem', 'endsm', 'final exam'],
};

@Injectable()
export class QueryClassificationService {
  // Keywords that indicate private queries (with fuzzy variants)
  private privateKeywords = [
    'my grades', 'my gpa', 'my cgpa', 'my payment', 'my fee', 'my attendance',
    'my courses', 'my enrolled', 'my schedule', 'my academic', 'my performance',
    'my transcript', 'my semester', 'my marks', 'my results',
    'what are my', 'show me my', 'tell me my', 'how much do i owe',
    'what is my', 'when did i', 'where am i',
    // Added fuzzy variants
    'my grdes', 'my mrks', 'my pymnt', 'my att', 'my fes', 'my corses',
  ];

  // Keywords that indicate public queries (with fuzzy variants)
  private publicKeywords = [
    'open electives', 'what are the', 'when do midsems', 'when do endsems',
    'timetable', 'schedule', 'credit system', 'gpa calculation', 'gpa rule',
    'announcements', 'academic calendar', 'course catalog', 'course details',
    'course information', 'explain the', 'where can i find', 'how to',
    'what is the', 'registration', 'enrollment dates',
    // Added fuzzy variants  
    'time table', 'electve', 'eletive', 'calender', 'midterm', 'endterm',
  ];

  /**
   * Enhanced query classification with fuzzy matching
   */
  classifyQuery(query: string): QueryType {
    const lowerQuery = this.normalizeQuery(query);

    // Expand synonyms in query for better matching
    const expandedQuery = this.expandSynonyms(lowerQuery);

    // Check for private keywords (including fuzzy matches)
    const hasPrivateKeywords = this.privateKeywords.some((keyword) =>
      expandedQuery.includes(keyword) || this.fuzzyContains(expandedQuery, keyword),
    );

    // Check for public keywords (including fuzzy matches)
    const hasPublicKeywords = this.publicKeywords.some((keyword) =>
      expandedQuery.includes(keyword) || this.fuzzyContains(expandedQuery, keyword),
    );

    // Check for personal indicators (my, i, me, etc.)
    const hasPersonalIndicator = /\b(my|i|me|mine|i'm|i've|im|ive)\b/.test(lowerQuery);

    // Mixed query (contains both types)
    if (hasPrivateKeywords && hasPublicKeywords) {
      return QueryType.MIXED;
    }

    // Private query (has private keywords OR personal indicator with any data-related term)
    if (hasPrivateKeywords || (hasPersonalIndicator && this.hasDataTerm(lowerQuery))) {
      return QueryType.PRIVATE;
    }

    // Default to public
    return QueryType.PUBLIC;
  }

  /**
   * Normalize query for matching
   */
  private normalizeQuery(query: string): string {
    return query.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  /**
   * Expand query with synonym matches
   */
  private expandSynonyms(query: string): string {
    let expanded = query;
    for (const [canonical, synonyms] of Object.entries(SYNONYMS)) {
      for (const syn of synonyms) {
        if (query.includes(syn)) {
          expanded += ` ${canonical}`;
          break;
        }
      }
    }
    return expanded;
  }

  /**
   * Fuzzy contains check using Levenshtein distance
   */
  private fuzzyContains(text: string, keyword: string): boolean {
    const words = text.split(' ');
    const keywordWords = keyword.split(' ');

    // For multi-word keywords, check if all words are present (fuzzy)
    if (keywordWords.length > 1) {
      return keywordWords.every(kw =>
        words.some(w => this.levenshteinSimilarity(w, kw) > 0.75)
      );
    }

    // Single word - check fuzzy match
    return words.some(w => this.levenshteinSimilarity(w, keyword) > 0.75);
  }

  /**
   * Check if query contains data-related terms
   */
  private hasDataTerm(query: string): boolean {
    const dataTerms = [
      'grade', 'gpa', 'cgpa', 'payment', 'fee', 'attendance', 'course',
      'enroll', 'schedule', 'mark', 'result', 'transcript', 'balance',
      'grde', 'grd', 'pymnt', 'att', 'corse', 'mrk', 'fes'
    ];
    return dataTerms.some(term => query.includes(term));
  }

  /**
   * Levenshtein similarity (0-1 scale)
   */
  private levenshteinSimilarity(a: string, b: string): number {
    if (a === b) return 1;
    if (!a.length || !b.length) return 0;

    const matrix: number[][] = [];
    for (let i = 0; i <= a.length; i++) matrix[i] = [i];
    for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

    for (let i = 1; i <= a.length; i++) {
      for (let j = 1; j <= b.length; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j - 1] + cost
        );
      }
    }

    return 1 - matrix[a.length][b.length] / Math.max(a.length, b.length);
  }

  extractSemester(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    const semesterPatterns = [
      /(first|second|third|fourth|fifth|sixth|seventh|eighth)\s+semester\s+(\d{4}[-/]\d{4})/i,
      /semester\s+(\d{4}[-/]\d{4})/i,
      /(\d{4}[-/]\d{4})/,
    ];

    for (const pattern of semesterPatterns) {
      const match = query.match(pattern);
      if (match) {
        return match[0];
      }
    }

    return null;
  }

  extractCourseCode(query: string): string | null {
    const courseCodePattern = /\b([A-Z]{2,4}\s*F?\d{3})\b/i;
    const match = query.match(courseCodePattern);
    return match ? match[1].replace(/\s+/g, ' ').toUpperCase() : null;
  }

  extractDepartment(query: string): string | null {
    const lowerQuery = query.toLowerCase();
    const departments = ['cs', 'math', 'phy', 'chem', 'bio', 'gs', 'ee', 'me'];
    for (const dept of departments) {
      if (lowerQuery.includes(dept)) {
        return dept.toUpperCase();
      }
    }
    return null;
  }
}


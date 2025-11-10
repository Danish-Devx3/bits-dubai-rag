import { Injectable } from '@nestjs/common';

export enum QueryType {
  PUBLIC = 'public',
  PRIVATE = 'private',
  MIXED = 'mixed',
}

@Injectable()
export class QueryClassificationService {
  // Keywords that indicate private queries
  private privateKeywords = [
    'my grades',
    'my gpa',
    'my cgpa',
    'my payment',
    'my fee',
    'my attendance',
    'my courses',
    'my enrolled',
    'my schedule',
    'my academic',
    'my performance',
    'my transcript',
    'my semester',
    'my marks',
    'my results',
    'what are my',
    'show me my',
    'tell me my',
    'how much do i owe',
    'what is my',
    'when did i',
    'where am i',
  ];

  // Keywords that indicate public queries
  private publicKeywords = [
    'open electives',
    'what are the',
    'when do midsems',
    'when do endsems',
    'timetable',
    'schedule',
    'credit system',
    'gpa calculation',
    'gpa rule',
    'announcements',
    'academic calendar',
    'course catalog',
    'course details',
    'course information',
    'explain the',
    'where can i find',
    'how to',
    'what is the',
    'registration',
    'enrollment dates',
  ];

  classifyQuery(query: string): QueryType {
    const lowerQuery = query.toLowerCase();

    // Check for private keywords
    const hasPrivateKeywords = this.privateKeywords.some((keyword) =>
      lowerQuery.includes(keyword),
    );

    // Check for public keywords
    const hasPublicKeywords = this.publicKeywords.some((keyword) =>
      lowerQuery.includes(keyword),
    );

    // Mixed query (contains both types)
    if (hasPrivateKeywords && hasPublicKeywords) {
      return QueryType.MIXED;
    }

    // Private query
    if (hasPrivateKeywords) {
      return QueryType.PRIVATE;
    }

    // Default to public (even if no explicit keywords, assume public academic info)
    return QueryType.PUBLIC;
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


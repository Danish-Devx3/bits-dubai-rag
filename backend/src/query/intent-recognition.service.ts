import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { QueryType } from './query-classification.service';

/**
 * Intent Recognition Service
 * 
 * Uses a hybrid approach for NLP-based query understanding:
 * 1. Fast fuzzy matching with synonyms and partial words
 * 2. LLM fallback for ambiguous queries
 */
export interface IntentResult {
    queryType: QueryType;
    intents: string[];
    suggestedTools: string[];
    confidence: number;
    normalizedQuery: string;
}

// Canonical intent definitions with synonyms, abbreviations, and common misspellings
const INTENT_PATTERNS = {
    // Private intents
    grades: {
        keywords: ['grade', 'gpa', 'cgpa', 'mark', 'result', 'score', 'transcript'],
        fuzzy: ['grde', 'grds', 'grd', 'mrks', 'mrk', 'scre', 'gps', 'cgp'],
        tool: 'get_student_grades',
        type: 'PRIVATE' as const,
    },
    payment: {
        keywords: ['payment', 'fee', 'fees', 'due', 'owe', 'outstanding', 'balance', 'pay', 'tuition'],
        fuzzy: ['pymnt', 'pymt', 'paymnt', 'pament', 'feee', 'fes', 'dew', 'oww'],
        tool: 'get_student_payments',
        type: 'PRIVATE' as const,
    },
    attendance: {
        keywords: ['attendance', 'present', 'absent', 'miss', 'class', 'attend'],
        fuzzy: ['att', 'attnd', 'attndc', 'attendace', 'presnt', 'absnt', 'atendance'],
        tool: 'get_attendance',
        type: 'PRIVATE' as const,
    },
    enrollment: {
        keywords: ['enroll', 'enrolled', 'course', 'register', 'current course', 'my course'],
        fuzzy: ['enrol', 'enrll', 'corse', 'cors', 'registr', 'registred'],
        tool: 'get_enrolled_courses',
        type: 'PRIVATE' as const,
    },
    profile: {
        keywords: ['profile', 'info', 'information', 'standing', 'status', 'details'],
        fuzzy: ['profil', 'prfl', 'inf', 'statuz', 'detls'],
        tool: 'get_student_profile',
        type: 'PRIVATE' as const,
    },
    summary: {
        keywords: ['summary', 'overall', 'dashboard', 'academic summary', 'overview'],
        fuzzy: ['summry', 'sumary', 'overal', 'dashbrd', 'ovrview'],
        tool: 'get_academic_summary',
        type: 'PRIVATE' as const,
    },
    // Public intents
    calendar: {
        keywords: ['midsem', 'endsem', 'exam', 'calendar', 'schedule', 'date', 'when'],
        fuzzy: ['midsm', 'endsm', 'exm', 'calender', 'schedl', 'schdule'],
        tool: null,
        type: 'PUBLIC' as const,
    },
    electives: {
        keywords: ['elective', 'open elective', 'optional', 'choose', 'selection'],
        fuzzy: ['electve', 'eletive', 'optn', 'optionl'],
        tool: null,
        type: 'PUBLIC' as const,
    },
    timetable: {
        keywords: ['timetable', 'time table', 'slot', 'timing', 'lecture'],
        fuzzy: ['timetbl', 'timtable', 'lect', 'lectr'],
        tool: null,
        type: 'PUBLIC' as const,
    },
    credits: {
        keywords: ['credit', 'credit system', 'unit', 'credit hour'],
        fuzzy: ['credt', 'crdt', 'crdit'],
        tool: null,
        type: 'PUBLIC' as const,
    },
};

// Private indicators that suggest personal data query
const PRIVATE_INDICATORS = ['my', 'i', 'me', 'mine', 'im', "i'm", 'ive', "i've"];

@Injectable()
export class IntentRecognitionService {
    private ollama: Ollama;
    private llmModel: string;

    constructor(private configService: ConfigService) {
        const llmUrl = this.configService.get<string>('OLLAMA_BASE_URL') || 'http://ollama:11434';
        this.ollama = new Ollama({ host: llmUrl });
        this.llmModel = this.configService.get<string>('OLLAMA_LLM_MODEL') || 'deepseek-v3.1:671b-cloud';

        console.log(`[Intent Recognition] URL: ${llmUrl}, Model: ${this.llmModel}`);
    }

    /**
     * Main entry point - Recognizes intent using hybrid approach
     */
    async recognizeIntent(query: string): Promise<IntentResult> {
        const normalizedQuery = this.normalizeQuery(query);

        // Step 1: Fast fuzzy matching
        const fuzzyResult = this.fuzzyMatch(normalizedQuery);

        // If high confidence match found, return immediately (fast path)
        if (fuzzyResult.confidence >= 0.7) {
            return fuzzyResult;
        }

        // Step 2: LLM fallback for ambiguous queries
        try {
            return await this.llmClassify(query, normalizedQuery, fuzzyResult);
        } catch (error) {
            console.error('LLM classification failed, using fuzzy result:', error);
            return fuzzyResult;
        }
    }

    /**
     * Normalize query - lowercase, remove extra spaces, basic cleanup
     */
    private normalizeQuery(query: string): string {
        return query
            .toLowerCase()
            .replace(/[^\w\s]/g, ' ')  // Remove special chars
            .replace(/\s+/g, ' ')      // Collapse whitespace
            .trim();
    }

    /**
     * Fast fuzzy matching using pattern dictionaries
     */
    private fuzzyMatch(normalizedQuery: string): IntentResult {
        const words = normalizedQuery.split(' ');
        const matchedIntents: { intent: string; score: number; type: 'PRIVATE' | 'PUBLIC' }[] = [];
        const suggestedTools: string[] = [];

        // Check for private indicators
        const hasPrivateIndicator = words.some(word =>
            PRIVATE_INDICATORS.includes(word) ||
            PRIVATE_INDICATORS.some(pi => this.levenshteinSimilarity(word, pi) > 0.8)
        );

        // Match against all intent patterns
        for (const [intentName, pattern] of Object.entries(INTENT_PATTERNS)) {
            let maxScore = 0;

            for (const word of words) {
                // Exact keyword match
                if (pattern.keywords.some(kw => word.includes(kw) || kw.includes(word))) {
                    maxScore = Math.max(maxScore, 1.0);
                }

                // Fuzzy/typo match
                if (pattern.fuzzy.some(fw => this.levenshteinSimilarity(word, fw) > 0.7)) {
                    maxScore = Math.max(maxScore, 0.85);
                }

                // Partial keyword match (for abbreviations like "att" -> "attendance")
                for (const kw of pattern.keywords) {
                    if (kw.startsWith(word) && word.length >= 3) {
                        maxScore = Math.max(maxScore, 0.75);
                    }
                    // Levenshtein for typos
                    const similarity = this.levenshteinSimilarity(word, kw);
                    if (similarity > 0.7) {
                        maxScore = Math.max(maxScore, similarity);
                    }
                }
            }

            if (maxScore > 0.5) {
                matchedIntents.push({ intent: intentName, score: maxScore, type: pattern.type });
                if (pattern.tool) {
                    suggestedTools.push(pattern.tool);
                }
            }
        }

        // Determine query type
        let queryType = QueryType.PUBLIC;
        const hasPrivateIntent = matchedIntents.some(m => m.type === 'PRIVATE');
        const hasPublicIntent = matchedIntents.some(m => m.type === 'PUBLIC');

        if (hasPrivateIntent && hasPublicIntent) {
            queryType = QueryType.MIXED;
        } else if (hasPrivateIntent || hasPrivateIndicator) {
            queryType = QueryType.PRIVATE;
        }

        const avgConfidence = matchedIntents.length > 0
            ? matchedIntents.reduce((sum, m) => sum + m.score, 0) / matchedIntents.length
            : 0.3;

        return {
            queryType,
            intents: matchedIntents.map(m => m.intent),
            suggestedTools: [...new Set(suggestedTools)],
            confidence: Math.min(avgConfidence, 1.0),
            normalizedQuery,
        };
    }

    /**
     * LLM fallback for ambiguous queries
     */
    private async llmClassify(
        originalQuery: string,
        normalizedQuery: string,
        fuzzyResult: IntentResult,
    ): Promise<IntentResult> {
        const prompt = `You are a query classifier for a university student portal. Classify the following query.

Query: "${originalQuery}"

Available tools for private student data:
- get_student_grades: for grades, GPA, marks, results
- get_student_payments: for fees, payments, dues, balance
- get_attendance: for attendance, present/absent records
- get_enrolled_courses: for current courses, enrollment
- get_academic_summary: for overall academic summary
- get_student_profile: for profile info, standing

Respond with ONLY a JSON object:
{
  "queryType": "PUBLIC" | "PRIVATE" | "MIXED",
  "intents": ["intent1", "intent2"],
  "suggestedTools": ["tool_name"] or [],
  "confidence": 0.0-1.0
}`;

        const response = await this.ollama.chat({
            model: this.llmModel,
            messages: [{ role: 'user', content: prompt }],
            stream: false,
        });

        try {
            const jsonMatch = response.message.content.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                const parsed = JSON.parse(jsonMatch[0]);
                return {
                    queryType: parsed.queryType === 'PRIVATE' ? QueryType.PRIVATE
                        : parsed.queryType === 'MIXED' ? QueryType.MIXED
                            : QueryType.PUBLIC,
                    intents: parsed.intents || fuzzyResult.intents,
                    suggestedTools: parsed.suggestedTools || fuzzyResult.suggestedTools,
                    confidence: parsed.confidence || 0.8,
                    normalizedQuery,
                };
            }
        } catch (e) {
            console.error('Failed to parse LLM response:', e);
        }

        return fuzzyResult;
    }

    /**
     * Levenshtein distance-based similarity (0-1)
     */
    private levenshteinSimilarity(a: string, b: string): number {
        if (a === b) return 1;
        if (!a.length || !b.length) return 0;

        const matrix: number[][] = [];
        for (let i = 0; i <= a.length; i++) {
            matrix[i] = [i];
        }
        for (let j = 0; j <= b.length; j++) {
            matrix[0][j] = j;
        }

        for (let i = 1; i <= a.length; i++) {
            for (let j = 1; j <= b.length; j++) {
                const cost = a[i - 1] === b[j - 1] ? 0 : 1;
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,      // deletion
                    matrix[i][j - 1] + 1,      // insertion
                    matrix[i - 1][j - 1] + cost // substitution
                );
            }
        }

        const distance = matrix[a.length][b.length];
        const maxLen = Math.max(a.length, b.length);
        return 1 - distance / maxLen;
    }
}

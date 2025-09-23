import type { Note, Folder, SearchResult } from './types';
import { notes, folders } from './stores';
import { get } from 'svelte/store';

export interface EnhancedSearchResult {
  note: Note;
  folder: { id: string; name: string } | null;
  score: number;
  matchType: 'title' | 'content' | 'both' | 'recent';
  titleMatches: MatchRange[];
  contentMatches: MatchRange[];
  excerpt: string;
  lastModified: Date;
}

export interface FolderSearchResult {
  folder: Folder;
  score: number;
  matchType: 'folder';
  titleMatches: MatchRange[];
}

export interface CombinedSearchResult {
  type: 'note' | 'folder';
  noteResult?: EnhancedSearchResult;
  folderResult?: FolderSearchResult;
}

export interface MatchRange {
  start: number;
  end: number;
  text: string;
}

export function searchNotes(query: string): EnhancedSearchResult[] {
  const allNotes = get(notes);
  const allFolders = get(folders);
  
  if (!query.trim()) {
    return getRecentNotes(allNotes, allFolders);
  }
  
  const searchTerm = query.toLowerCase().trim();
  const results: EnhancedSearchResult[] = [];
  
  for (const note of allNotes) {
    const titleMatches = findMatches(note.title.toLowerCase(), searchTerm);
    const contentMatches = findMatches(note.content.toLowerCase(), searchTerm);
    
    if (titleMatches.length > 0 || contentMatches.length > 0) {
      const folder = allFolders.find(f => f.id === note.folderId);
      const matchType = titleMatches.length > 0 && contentMatches.length > 0 ? 'both' :
                       titleMatches.length > 0 ? 'title' : 'content';
      
      results.push({
        note,
        folder: folder ? { id: folder.id, name: folder.name } : null,
        score: calculateScore(titleMatches, contentMatches, note.title, note.content, note.updatedAt),
        matchType,
        titleMatches: titleMatches.map(match => ({
          ...match,
          text: note.title.substring(match.start, match.end)
        })),
        contentMatches: contentMatches.map(match => ({
          ...match,
          text: note.content.substring(match.start, match.end)
        })),
        excerpt: generateExcerpt(note.content, contentMatches, searchTerm),
        lastModified: note.updatedAt
      });
    }
  }
  
  return results.sort((a, b) => b.score - a.score);
}

export function searchAll(query: string): CombinedSearchResult[] {
  const allNotes = get(notes);
  const allFolders = get(folders);
  
  if (!query.trim()) {
    return getRecentNotes(allNotes, allFolders).map(noteResult => ({
      type: 'note' as const,
      noteResult
    }));
  }

  const parsedQuery = parseSearchQuery(query);
  const searchTerm = parsedQuery.term.toLowerCase().trim();
  const results: CombinedSearchResult[] = [];
  
  if (!parsedQuery.titleOnly && !parsedQuery.contentOnly) {
    for (const folder of allFolders) {
      const titleMatches = findMatches(folder.name.toLowerCase(), searchTerm);
      
      if (titleMatches.length > 0) {
        results.push({
          type: 'folder',
          folderResult: {
            folder,
            score: titleMatches.length * 15,
            matchType: 'folder',
            titleMatches: titleMatches.map(match => ({
              ...match,
              text: folder.name.substring(match.start, match.end)
            }))
          }
        });
      }
    }
  }
  
  if (!parsedQuery.folderOnly) {
    for (const note of allNotes) {
      const titleMatches = parsedQuery.contentOnly ? [] : findMatches(note.title.toLowerCase(), searchTerm);
      const contentMatches = parsedQuery.titleOnly ? [] : findMatches(note.content.toLowerCase(), searchTerm);
      
      if (titleMatches.length > 0 || contentMatches.length > 0) {
        const folder = allFolders.find(f => f.id === note.folderId);
        const matchType = titleMatches.length > 0 && contentMatches.length > 0 ? 'both' :
                         titleMatches.length > 0 ? 'title' : 'content';
        
        results.push({
          type: 'note',
          noteResult: {
            note,
            folder: folder ? { id: folder.id, name: folder.name } : null,
            score: calculateScore(titleMatches, contentMatches, note.title, note.content, note.updatedAt),
            matchType,
            titleMatches: titleMatches.map(match => ({
              ...match,
              text: note.title.substring(match.start, match.end)
            })),
            contentMatches: contentMatches.map(match => ({
              ...match,
              text: note.content.substring(match.start, match.end)
            })),
            excerpt: generateExcerpt(note.content, contentMatches, searchTerm),
            lastModified: note.updatedAt
          }
        });
      }
    }
  }
  
  return results.sort((a, b) => {
    if (a.type === 'folder' && b.type === 'note') return -1;
    if (a.type === 'note' && b.type === 'folder') return 1;
    
    const scoreA = a.folderResult?.score || a.noteResult?.score || 0;
    const scoreB = b.folderResult?.score || b.noteResult?.score || 0;
    return scoreB - scoreA;
  });
}

interface ParsedQuery {
  term: string;
  folderOnly: boolean;
  titleOnly: boolean;
  contentOnly: boolean;
}

function parseSearchQuery(query: string): ParsedQuery {
  let term = query;
  let folderOnly = false;
  let titleOnly = false;
  let contentOnly = false;
  
  if (term.startsWith('folder:')) {
    folderOnly = true;
    term = term.substring(7);
  } else if (term.startsWith('title:')) {
    titleOnly = true;
    term = term.substring(6);
  } else if (term.startsWith('content:')) {
    contentOnly = true;
    term = term.substring(8);
  }
  
  return { term, folderOnly, titleOnly, contentOnly };
}export function getRecentNotes(allNotes: Note[], allFolders: any[], limit = 10): EnhancedSearchResult[] {
  return allNotes
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
    .slice(0, limit)
    .map(note => {
      const folder = allFolders.find(f => f.id === note.folderId);
      return {
        note,
        folder: folder ? { id: folder.id, name: folder.name } : null,
        score: 0,
        matchType: 'recent' as const,
        titleMatches: [],
        contentMatches: [],
        excerpt: generateExcerpt(note.content, [], ''),
        lastModified: note.updatedAt
      };
    });
}

function findMatches(text: string, searchTerm: string): MatchRange[] {
  const matches: MatchRange[] = [];
  let index = 0;
  
  while (index < text.length) {
    const found = text.indexOf(searchTerm, index);
    if (found === -1) break;
    
    matches.push({
      start: found,
      end: found + searchTerm.length,
      text: text.substring(found, found + searchTerm.length)
    });
    
    index = found + 1;
  }
  
  return matches;
}

function calculateScore(titleMatches: MatchRange[], contentMatches: MatchRange[], title: string, content: string, lastModified?: Date): number {
  let score = 0;
  
  score += titleMatches.length * 10;
  
  score += contentMatches.length * 2;
  
  if (titleMatches.some(match => match.start === 0)) {
    score += 5;
  }
  
  if (titleMatches.length > 0 && title.length < 50) {
    score += 3;
  }
  
  if (lastModified) {
    const now = new Date();
    const ageInDays = (now.getTime() - lastModified.getTime()) / (1000 * 60 * 60 * 24);
    const recencyBonus = Math.max(0, 5 * (1 - ageInDays / 30));
    score += recencyBonus;
  }
  
  return score;
}

function generateExcerpt(content: string, matches: MatchRange[], searchTerm: string, maxLength = 150): string {
  if (matches.length === 0) {
    return content.substring(0, maxLength) + (content.length > maxLength ? '...' : '');
  }
  
  const firstMatch = matches[0];
  const start = Math.max(0, firstMatch.start - 50);
  const end = Math.min(content.length, firstMatch.end + 100);
  
  let excerpt = content.substring(start, end);
  
  if (start > 0) excerpt = '...' + excerpt;
  if (end < content.length) excerpt = excerpt + '...';
  
  return excerpt;
}

export function highlightText(text: string, matches: MatchRange[]): string {
  if (matches.length === 0) return escapeHtml(text);
  
  let result = '';
  let lastIndex = 0;
  
  for (const match of matches) {
    result += escapeHtml(text.substring(lastIndex, match.start));
    
    result += `<mark class="bg-yellow-200 dark:bg-yellow-600 rounded px-1">${escapeHtml(text.substring(match.start, match.end))}</mark>`;
    
    lastIndex = match.end;
  }
  
  result += escapeHtml(text.substring(lastIndex));
  
  return result;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString();
}
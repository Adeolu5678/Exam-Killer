export interface ChunkOptions {
  chunkSize?: number;
  chunkOverlap?: number;
  separators?: string[];
}

export interface TextChunk {
  content: string;
  index: number;
  metadata: {
    sourceId: string;
    workspaceId: string;
    pageNumber?: number;
    charCount: number;
  };
}

const DEFAULT_CHUNK_SIZE = 1000;
const DEFAULT_CHUNK_OVERLAP = 200;

const DEFAULT_SEPARATORS = ['\n\n', '\n', '. ', ' ', ''];

export function chunkText(text: string, options: ChunkOptions): TextChunk[] {
  const chunkSize = options.chunkSize ?? DEFAULT_CHUNK_SIZE;
  const chunkOverlap = options.chunkOverlap ?? DEFAULT_CHUNK_OVERLAP;
  const separators = options.separators ?? DEFAULT_SEPARATORS;

  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  let index = 0;

  const splitText = recursiveSplit(text, separators, chunkSize);

  let currentChunk = '';
  let overlapText = '';

  for (const segment of splitText) {
    if (segment.length >= chunkSize) {
      if (currentChunk) {
        chunks.push(createChunk(currentChunk, index++, '', ''));
        overlapText = currentChunk.slice(-chunkOverlap);
        currentChunk = '';
      }
      const segmentChunks = splitLargeSegment(segment, chunkSize, chunkOverlap, index, overlapText);
      chunks.push(...segmentChunks.segments);
      index = segmentChunks.lastIndex;
      overlapText = segmentChunks.lastOverlap;
      continue;
    }

    const potentialChunk = currentChunk ? currentChunk + segment : segment;

    if (potentialChunk.length <= chunkSize) {
      currentChunk = potentialChunk;
    } else {
      if (currentChunk) {
        chunks.push(createChunk(currentChunk, index++, '', ''));
        overlapText = currentChunk.slice(-chunkOverlap);
      }

      const remainingSpace = chunkSize - overlapText.length;
      if (segment.length > remainingSpace && overlapText) {
        currentChunk = overlapText + segment;
      } else {
        currentChunk = segment;
      }
    }
  }

  if (currentChunk && currentChunk.trim().length > 0) {
    chunks.push(createChunk(currentChunk, index++, '', ''));
  }

  return chunks;
}

function recursiveSplit(text: string, separators: string[], minSize: number): string[] {
  if (!text || text.length <= minSize) {
    return [text];
  }

  const separator = separators[0];
  const remainingSeparators = separators.slice(1);

  if (!separator) {
    return [text];
  }

  const parts = text.split(separator);

  if (parts.length === 1) {
    return recursiveSplit(text, remainingSeparators, minSize);
  }

  const results: string[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (part.length <= minSize) {
      results.push(part);
    } else {
      results.push(...recursiveSplit(part, remainingSeparators, minSize));
    }
  }

  return results;
}

function splitLargeSegment(
  segment: string,
  chunkSize: number,
  chunkOverlap: number,
  startIndex: number,
  previousOverlap: string,
): { segments: TextChunk[]; lastIndex: number; lastOverlap: string } {
  const segments: TextChunk[] = [];
  let currentIndex = startIndex;
  let remainingText = segment;

  if (previousOverlap && !remainingText.startsWith(previousOverlap)) {
    remainingText = previousOverlap + remainingText;
  }

  while (remainingText.length > chunkSize) {
    const chunkContent = remainingText.slice(0, chunkSize);
    segments.push(createChunk(chunkContent, currentIndex++, '', ''));
    remainingText = remainingText.slice(chunkSize - chunkOverlap);
  }

  if (remainingText.trim().length > 0) {
    segments.push(createChunk(remainingText, currentIndex++, '', ''));
  }

  const lastOverlap =
    segments.length > 0 ? segments[segments.length - 1].content.slice(-chunkOverlap) : '';

  return { segments, lastIndex: currentIndex, lastOverlap };
}

function createChunk(
  content: string,
  index: number,
  sourceId: string,
  workspaceId: string,
): TextChunk {
  return {
    content: content.trim(),
    index,
    metadata: {
      sourceId,
      workspaceId,
      charCount: content.length,
    },
  };
}

export function chunkPdfText(pdfText: string, sourceId: string, workspaceId: string): TextChunk[] {
  if (!pdfText || pdfText.trim().length === 0) {
    return [];
  }

  const pagePattern = /Page\s+(\d+)/gi;
  const pages: { text: string; pageNumber: number }[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  const matches: { index: number; pageNumber: number }[] = [];

  while ((match = pagePattern.exec(pdfText)) !== null) {
    matches.push({ index: match.index, pageNumber: parseInt(match[1], 10) });
  }

  if (matches.length === 0) {
    const lines = pdfText.split('\n');
    let currentPageText = '';
    let currentPageNumber = 1;

    for (const line of lines) {
      const pageMatch = line.match(/^(\d+)\s*$/);
      if (pageMatch) {
        if (currentPageText.trim()) {
          pages.push({ text: currentPageText.trim(), pageNumber: currentPageNumber });
        }
        currentPageNumber = parseInt(pageMatch[1], 10);
        currentPageText = '';
      } else {
        currentPageText += line + '\n';
      }
    }

    if (currentPageText.trim()) {
      pages.push({ text: currentPageText.trim(), pageNumber: currentPageNumber });
    }
  } else {
    for (let i = 0; i < matches.length; i++) {
      const currentMatch = matches[i];
      const nextMatch = matches[i + 1];
      const start = lastIndex;
      const end = nextMatch ? nextMatch.index : pdfText.length;
      const pageText = pdfText.slice(start, end).trim();

      if (pageText) {
        pages.push({ text: pageText, pageNumber: currentMatch.pageNumber });
      }
      lastIndex = end;
    }
  }

  if (pages.length === 0) {
    pages.push({ text: pdfText.trim(), pageNumber: 1 });
  }

  const allChunks: TextChunk[] = [];
  let globalIndex = 0;

  for (const page of pages) {
    const pageChunks = chunkText(page.text, {
      chunkSize: 1000,
      chunkOverlap: 200,
    });

    for (const chunk of pageChunks) {
      allChunks.push({
        content: chunk.content,
        index: globalIndex++,
        metadata: {
          sourceId,
          workspaceId,
          pageNumber: page.pageNumber,
          charCount: chunk.content.length,
        },
      });
    }
  }

  return allChunks;
}

export function chunkMarkdown(
  markdown: string,
  sourceId: string,
  workspaceId: string,
): TextChunk[] {
  if (!markdown || markdown.trim().length === 0) {
    return [];
  }

  const blocks: { type: string; content: string; level?: number }[] = [];
  const lines = markdown.split('\n');
  let currentBlock: { type: string; content: string } = { type: 'paragraph', content: '' };
  let inCodeBlock = false;
  let inList = false;
  let listMarker = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    if (trimmedLine.startsWith('```')) {
      if (inCodeBlock) {
        currentBlock.content += '\n' + line;
        blocks.push({ type: 'code', content: currentBlock.content });
        currentBlock = { type: 'paragraph', content: '' };
        inCodeBlock = false;
      } else {
        if (currentBlock.content.trim()) {
          blocks.push(currentBlock);
        }
        currentBlock = { type: 'code', content: line };
        inCodeBlock = true;
      }
      continue;
    }

    if (inCodeBlock) {
      currentBlock.content += '\n' + line;
      continue;
    }

    const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headerMatch) {
      if (currentBlock.content.trim()) {
        blocks.push(currentBlock);
      }
      currentBlock = { type: 'header', content: trimmedLine };
      blocks.push(currentBlock);
      currentBlock = { type: 'paragraph', content: '' };
      continue;
    }

    const listMatch = trimmedLine.match(/^(\s*[-*+]\s+|\s*\d+\.\s+)/);
    if (listMatch) {
      if (!inList) {
        if (currentBlock.content.trim() && currentBlock.type !== 'list') {
          blocks.push(currentBlock);
        }
        inList = true;
        listMarker = listMatch[1];
        currentBlock = { type: 'list', content: trimmedLine + '\n' };
      } else {
        currentBlock.content += trimmedLine + '\n';
      }
      continue;
    } else if (inList && trimmedLine === '') {
      blocks.push(currentBlock);
      currentBlock = { type: 'paragraph', content: '' };
      inList = false;
      continue;
    } else if (inList) {
      blocks.push(currentBlock);
      currentBlock = { type: 'paragraph', content: '' };
      inList = false;
    }

    if (trimmedLine === '') {
      if (currentBlock.content.trim()) {
        blocks.push(currentBlock);
        currentBlock = { type: 'paragraph', content: '' };
      }
      continue;
    }

    if (currentBlock.type === 'paragraph') {
      currentBlock.content += (currentBlock.content ? '\n' : '') + trimmedLine;
    } else {
      if (currentBlock.content.trim()) {
        blocks.push(currentBlock);
      }
      currentBlock = { type: 'paragraph', content: trimmedLine };
    }
  }

  if (currentBlock.content.trim()) {
    blocks.push(currentBlock);
  }

  const chunks: TextChunk[] = [];
  let index = 0;
  let currentChunk = '';
  const chunkSize = 1000;
  const chunkOverlap = 200;

  for (const block of blocks) {
    const blockContent = formatBlockContent(block);

    if (blockContent.length >= chunkSize) {
      if (currentChunk.trim()) {
        chunks.push(createChunk(currentChunk, index++, sourceId, workspaceId));
        currentChunk = '';
      }

      const blockChunks = chunkText(blockContent, {
        chunkSize,
        chunkOverlap,
      });

      for (const chunk of blockChunks) {
        chunks.push({
          ...chunk,
          metadata: {
            sourceId,
            workspaceId,
            charCount: chunk.content.length,
          },
        });
        index++;
      }
      continue;
    }

    const potentialChunk = currentChunk ? currentChunk + '\n\n' + blockContent : blockContent;

    if (potentialChunk.length <= chunkSize) {
      currentChunk = potentialChunk;
    } else {
      if (currentChunk.trim()) {
        chunks.push(createChunk(currentChunk, index++, sourceId, workspaceId));
      }
      currentChunk = blockContent;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(createChunk(currentChunk, index, sourceId, workspaceId));
  }

  return chunks;
}

function formatBlockContent(block: { type: string; content: string }): string {
  switch (block.type) {
    case 'header':
      return block.content;
    case 'code':
      return block.content;
    case 'list':
      return block.content.trim();
    case 'paragraph':
    default:
      return block.content;
  }
}

export async function chunkImageText(
  imageData: string,
  sourceId: string,
  workspaceId: string,
): Promise<TextChunk[]> {
  // OCR is currently a placeholder. In production, this would integrate with a Cloud Vision API
  // or Tesseract.js. For now, we return a functional placeholder that notifies the user.

  return [
    {
      content: `[Image Recognition Placeholder]
Source ID: ${sourceId}
Status: OCR integration is pending. 

Note: To process text from this image, please use a PDF version or wait for the Vision API integration. 
The system has registered this image but cannot yet extract deep semantic meaning from the visual text.`,
      index: 0,
      metadata: {
        sourceId,
        workspaceId,
        charCount: 250,
      },
    },
  ];
}

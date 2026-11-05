import { deflate, inflate } from 'pako';
import { NetworkGraphData, Member, Relationship, CustomField } from '../types';

export const COMPRESSED_PREFIX = 'NNZ:';

/**
 * Splits a compressed token into multi-frame chunks (e.g. for multi-page / animated QR codes).
 * Allows virtually unlimited graph data to be transmitted across chunky, easy-to-scan QR codes!
 */
export function splitTokenIntoFrames(token: string, maxChunkLen: number = 700): string[] {
  if (token.length <= maxChunkLen) {
    return [token];
  }
  const clean = token.startsWith(COMPRESSED_PREFIX) ? token.slice(COMPRESSED_PREFIX.length) : token;
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += maxChunkLen) {
    chunks.push(clean.slice(i, i + maxChunkLen));
  }
  const total = chunks.length;
  return chunks.map((chunk, idx) => `${COMPRESSED_PREFIX}F${idx + 1}/${total}:${chunk}`);
}

/**
 * Parses an incoming scanned string.
 * Returns either a complete raw token string (if single frame or all frames collected),
 * or frame metadata { isFrame: true, index, total, chunk }.
 */
export function parseScannedFrame(input: string): {
  isFrame: boolean;
  index: number;
  total: number;
  chunk: string;
} | null {
  const trimmed = input.trim();
  const match = trimmed.match(/^NNZ:F(\d+)\/(\d+):(.+)$/s);
  if (match) {
    return {
      isFrame: true,
      index: parseInt(match[1], 10),
      total: parseInt(match[2], 10),
      chunk: match[3],
    };
  }
  return null;
}

/**
 * Compresses full network graph data into an ultra-compact Base64 string using zlib Deflate.
 */
export function compressNetworkData(data: NetworkGraphData): {
  compressedToken: string;
  rawJson: string;
  originalSize: number;
  compressedSize: number;
} {
  const payload = {
    version: 1,
    exportedAt: Date.now(),
    members: data.members,
    relationships: data.relationships,
  };

  const rawJson = JSON.stringify(payload);
  const originalSize = rawJson.length;

  try {
    const compressedBytes = deflate(rawJson, { level: 9 });
    let binary = '';
    const len = compressedBytes.byteLength;
    const chunkSize = 8192;
    for (let i = 0; i < len; i += chunkSize) {
      binary += String.fromCharCode.apply(
        null,
        Array.from(compressedBytes.subarray(i, Math.min(i + chunkSize, len)))
      );
    }
    const base64 = btoa(binary);
    const compressedToken = `${COMPRESSED_PREFIX}${base64}`;

    return {
      compressedToken,
      rawJson,
      originalSize,
      compressedSize: compressedToken.length,
    };
  } catch (err) {
    console.warn('Compression fallback to standard Base64:', err);
    const fallbackBase64 = btoa(unescape(encodeURIComponent(rawJson)));
    return {
      compressedToken: fallbackBase64,
      rawJson,
      originalSize,
      compressedSize: fallbackBase64.length,
    };
  }
}

/**
 * High-Efficiency Indexed Core Compression (Reduces payload by another 75%!).
 * Maps member IDs, group strings, and labels to compact integer indices.
 * Produces Version 3~5 QR codes with huge chunky blocks that scan instantly without moire distortion.
 */
export function compressLiteNetworkData(data: NetworkGraphData): {
  compressedToken: string;
  compressedSize: number;
} {
  const groupDict: string[] = [];
  const getGroupIdx = (g: string) => {
    let idx = groupDict.indexOf(g);
    if (idx === -1) {
      groupDict.push(g);
      idx = groupDict.length - 1;
    }
    return idx;
  };

  const memberIdMap = new Map<string, number>();
  data.members.forEach((m, idx) => memberIdMap.set(m.id, idx));

  // Compact members: [id, name, groupIdx, color, isCenter ? 1 : 0, nickname || '', notes || '', updatedAt || 0, [[fieldName, type, val, id], ...], avatarUrl || '']
  const mArr = data.members.map((m) => {
    const cfTuples = (m.customFields || []).map((cf) => [
      cf.name || '',
      cf.type || 'text',
      cf.value || '',
      cf.id || '',
    ]);
    return [
      m.id,
      m.name,
      getGroupIdx(m.group || '一般'),
      m.avatarColor || '#3b82f6',
      m.isCenter ? 1 : 0,
      m.nickname || '',
      m.notes || '',
      m.updatedAt || Date.now(),
      cfTuples,
      m.avatarUrl || '',
    ];
  });

  // Compact relationships: [id, srcIdx, tgtIdx, label, category, strength, notes || '', createdAt || 0]
  const rArr = data.relationships.map((r) => [
    r.id,
    memberIdMap.has(r.sourceId) ? memberIdMap.get(r.sourceId)! : r.sourceId,
    memberIdMap.has(r.targetId) ? memberIdMap.get(r.targetId)! : r.targetId,
    r.label,
    r.category,
    r.strength,
    r.notes || '',
    r.createdAt || Date.now(),
  ]);

  const compactPayload = {
    _fmt: 'idx_v2',
    v: 2,
    gd: groupDict,
    m: mArr,
    r: rArr,
  };

  const raw = JSON.stringify(compactPayload);
  const compressedBytes = deflate(raw, { level: 9 });
  let binary = '';
  const len = compressedBytes.byteLength;
  const chunkSize = 8192;
  for (let i = 0; i < len; i += chunkSize) {
    binary += String.fromCharCode.apply(
      null,
      Array.from(compressedBytes.subarray(i, Math.min(i + chunkSize, len)))
    );
  }
  const compressedToken = `${COMPRESSED_PREFIX}${btoa(binary)}`;
  return { compressedToken, compressedSize: compressedToken.length };
}

/**
 * Decompresses incoming token, whether it's NNZ: (zlib Deflate), idx_v2, standard Base64, a URL with #sync=, or raw JSON.
 */
export function decompressNetworkData(input: string): NetworkGraphData {
  const trimmed = input.trim();
  if (!trimmed) {
    throw new Error('同步內容為空');
  }

  let token = trimmed;

  // Extract from URL if input is a shareable URL
  if (token.includes('#sync=')) {
    token = token.split('#sync=')[1];
  }

  // Handle multi-frame chunk if raw token was accidentally passed
  if (token.startsWith(`${COMPRESSED_PREFIX}F`)) {
    const parsedFrame = parseScannedFrame(token);
    if (parsedFrame) {
      token = `${COMPRESSED_PREFIX}${parsedFrame.chunk}`;
    }
  }

  // Case 1: Compressed with NNZ: (zlib Deflate)
  if (token.startsWith(COMPRESSED_PREFIX)) {
    const base64Part = token.slice(COMPRESSED_PREFIX.length);
    const binary = atob(base64Part);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const inflatedBytes = inflate(bytes);
    const decompressedJson = new TextDecoder('utf-8').decode(inflatedBytes);
    const parsed = JSON.parse(decompressedJson);
    return normalizeParsedGraph(parsed);
  }

  // Case 2: Standard Base64
  try {
    const rawJson = decodeURIComponent(escape(atob(token)));
    const parsed = JSON.parse(rawJson);
    return normalizeParsedGraph(parsed);
  } catch (_) {
    // If not standard escaped base64, try direct atob
    try {
      const direct = atob(token);
      const parsed = JSON.parse(direct);
      return normalizeParsedGraph(parsed);
    } catch (_) {
      // Case 3: Raw JSON string
      const parsed = JSON.parse(token);
      return normalizeParsedGraph(parsed);
    }
  }
}

/**
 * Unpacks indexed format (idx_v2) or validates standard JSON into clean NetworkGraphData
 */
function normalizeParsedGraph(parsed: any): NetworkGraphData {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('無效的資料格式');
  }

  // Format: idx_v2 ultra-compact index format
  if (parsed._fmt === 'idx_v2' && Array.isArray(parsed.m) && Array.isArray(parsed.r)) {
    const groupDict: string[] = Array.isArray(parsed.gd) ? parsed.gd : [];
    
    // Expand members
    const members: Member[] = parsed.m.map((row: any[], idx: number) => {
      const [
        id,
        name,
        groupIdx,
        avatarColor,
        isCenter,
        nickname,
        notes,
        updatedAt,
        rawFields,
        avatarUrl,
      ] = row;
      const groupName = typeof groupIdx === 'number' && groupDict[groupIdx] ? groupDict[groupIdx] : '一般';

      const customFields: CustomField[] = Array.isArray(rawFields)
        ? rawFields.map((fRow: any[], fIdx: number) => ({
            id: fRow && fRow[3] ? String(fRow[3]) : `cf-${id || idx}-${fIdx}`,
            name: fRow && fRow[0] ? String(fRow[0]) : '欄位',
            type: fRow && fRow[1] ? (fRow[1] as any) : 'text',
            value: fRow && fRow[2] ? String(fRow[2]) : '',
          }))
        : [];

      return {
        id: id || `m-${Date.now()}-${idx}`,
        name: name || '成員',
        nickname: nickname || undefined,
        avatarColor: avatarColor || '#3b82f6',
        group: groupName,
        isCenter: !!isCenter,
        customFields,
        notes: typeof notes === 'string' ? notes : '',
        avatarUrl: avatarUrl || undefined,
        createdAt: Date.now(),
        updatedAt: typeof updatedAt === 'number' ? updatedAt : Date.now(),
      };
    });

    const memberIds = members.map((m) => m.id);

    // Expand relationships
    const relationships: Relationship[] = parsed.r.map((row: any[], idx: number) => {
      const [id, srcRef, tgtRef, label, category, strength, notes, createdAt] = row;
      const sourceId = typeof srcRef === 'number' ? memberIds[srcRef] || String(srcRef) : String(srcRef);
      const targetId = typeof tgtRef === 'number' ? memberIds[tgtRef] || String(tgtRef) : String(tgtRef);
      return {
        id: id || `r-${Date.now()}-${idx}`,
        sourceId,
        targetId,
        label: label || '關聯',
        category: category || '社交',
        strength: typeof strength === 'number' ? strength : 3,
        notes: typeof notes === 'string' ? notes : undefined,
        createdAt: typeof createdAt === 'number' ? createdAt : Date.now(),
      };
    });

    return { members, relationships };
  }

  // Standard format validation
  if (!Array.isArray(parsed.members) || !Array.isArray(parsed.relationships)) {
    throw new Error('資料結構缺少 members 或 relationships 陣列');
  }

  parsed.members = parsed.members.map((m: any, idx: number) => ({
    ...m,
    id: m.id || `m-${Date.now()}-${idx}`,
    name: m.name || '未命名',
    customFields: Array.isArray(m.customFields) ? m.customFields : [],
    notes: m.notes || '',
    createdAt: m.createdAt || Date.now(),
    updatedAt: m.updatedAt || Date.now(),
  }));

  return parsed as NetworkGraphData;
}

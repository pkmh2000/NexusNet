import { deflate, inflate } from 'pako';
import { NetworkGraphData } from '../types';

export const COMPRESSED_PREFIX = 'NNZ:';

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
 * Creates an ultra-lightweight core graph payload (under 400 bytes!) for instant scanning.
 * Generates huge, chunky QR code blocks that scan instantly on any camera even in poor lighting or glare!
 */
export function compressLiteNetworkData(data: NetworkGraphData): {
  compressedToken: string;
  compressedSize: number;
} {
  const litePayload = {
    version: 1,
    exportedAt: Date.now(),
    isLite: true,
    members: data.members.map((m) => ({
      id: m.id,
      name: m.name,
      nickname: m.nickname,
      avatarColor: m.avatarColor,
      group: m.group,
      isCenter: m.isCenter,
    })),
    relationships: data.relationships.map((r) => ({
      id: r.id,
      sourceId: r.sourceId,
      targetId: r.targetId,
      label: r.label,
      category: r.category,
      strength: r.strength,
    })),
  };

  const raw = JSON.stringify(litePayload);
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
 * Decompresses incoming token, whether it's NNZ: (zlib Deflate), standard Base64, a URL with #sync=, or raw JSON.
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
    validateGraphData(parsed);
    return parsed;
  }

  // Case 2: Standard Base64
  try {
    const rawJson = decodeURIComponent(escape(atob(token)));
    const parsed = JSON.parse(rawJson);
    validateGraphData(parsed);
    return parsed;
  } catch (_) {
    // If not standard escaped base64, try direct atob
    try {
      const direct = atob(token);
      const parsed = JSON.parse(direct);
      validateGraphData(parsed);
      return parsed;
    } catch (_) {
      // Case 3: Raw JSON string
      const parsed = JSON.parse(token);
      validateGraphData(parsed);
      return parsed;
    }
  }
}

function validateGraphData(parsed: any): asserts parsed is NetworkGraphData {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('無效的資料格式');
  }
  if (!Array.isArray(parsed.members) || !Array.isArray(parsed.relationships)) {
    throw new Error('資料結構缺少 members 或 relationships 陣列');
  }

  // Ensure members have safe defaults for customFields and dates
  parsed.members = parsed.members.map((m: any) => ({
    ...m,
    customFields: Array.isArray(m.customFields) ? m.customFields : [],
    notes: m.notes || '',
    createdAt: m.createdAt || Date.now(),
    updatedAt: m.updatedAt || Date.now(),
  }));
}

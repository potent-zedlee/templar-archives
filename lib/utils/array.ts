/**
 * Array Utility Functions
 */

/**
 * Move an element in an array from one index to another
 * @param array - The array to modify
 * @param from - The source index
 * @param to - The destination index
 * @returns A new array with the element moved
 */
export function arrayMove<T>(array: T[], from: number, to: number): T[] {
  const newArray = array.slice()
  const [item] = newArray.splice(from, 1)
  newArray.splice(to, 0, item)
  return newArray
}

/**
 * Shuffle an array (Fisher-Yates algorithm)
 */
export function arrayShuffle<T>(array: T[]): T[] {
  const newArray = array.slice()
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArray[i], newArray[j]] = [newArray[j], newArray[i]]
  }
  return newArray
}

/**
 * Chunk an array into smaller arrays of specified size
 */
export function arrayChunk<T>(array: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size))
  }
  return chunks
}

/**
 * Remove duplicates from array
 */
export function arrayUnique<T>(array: T[]): T[] {
  return [...new Set(array)]
}

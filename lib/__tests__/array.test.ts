import { describe, it, expect } from 'vitest'
import { arrayMove, arrayShuffle, arrayChunk, arrayUnique } from '../utils/array'

describe('Array Utilities', () => {
  describe('arrayMove', () => {
    it('should move element from one index to another', () => {
      const arr = ['a', 'b', 'c', 'd', 'e']
      const result = arrayMove(arr, 1, 3)
      expect(result).toEqual(['a', 'c', 'd', 'b', 'e'])
    })

    it('should move element to beginning', () => {
      const arr = ['a', 'b', 'c']
      const result = arrayMove(arr, 2, 0)
      expect(result).toEqual(['c', 'a', 'b'])
    })

    it('should move element to end', () => {
      const arr = ['a', 'b', 'c']
      const result = arrayMove(arr, 0, 2)
      expect(result).toEqual(['b', 'c', 'a'])
    })

    it('should not modify original array', () => {
      const arr = ['a', 'b', 'c']
      const original = [...arr]
      arrayMove(arr, 0, 2)
      expect(arr).toEqual(original)
    })

    it('should handle moving to same position', () => {
      const arr = ['a', 'b', 'c']
      const result = arrayMove(arr, 1, 1)
      expect(result).toEqual(['a', 'b', 'c'])
    })

    it('should work with different data types', () => {
      const arr = [1, 2, 3, 4, 5]
      const result = arrayMove(arr, 0, 4)
      expect(result).toEqual([2, 3, 4, 5, 1])
    })

    it('should work with objects', () => {
      const arr = [{ id: 1 }, { id: 2 }, { id: 3 }]
      const result = arrayMove(arr, 0, 2)
      expect(result).toEqual([{ id: 2 }, { id: 3 }, { id: 1 }])
    })
  })

  describe('arrayShuffle', () => {
    it('should return array with same length', () => {
      const arr = [1, 2, 3, 4, 5]
      const result = arrayShuffle(arr)
      expect(result.length).toBe(arr.length)
    })

    it('should contain all original elements', () => {
      const arr = [1, 2, 3, 4, 5]
      const result = arrayShuffle(arr)
      expect(result.sort()).toEqual(arr.sort())
    })

    it('should not modify original array', () => {
      const arr = [1, 2, 3]
      const original = [...arr]
      arrayShuffle(arr)
      expect(arr).toEqual(original)
    })

    it('should handle empty array', () => {
      const arr: number[] = []
      const result = arrayShuffle(arr)
      expect(result).toEqual([])
    })

    it('should handle single element array', () => {
      const arr = [1]
      const result = arrayShuffle(arr)
      expect(result).toEqual([1])
    })

    it('should produce different orders (probabilistic test)', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
      const results = new Set()

      // Run shuffle 20 times and collect unique results
      for (let i = 0; i < 20; i++) {
        const shuffled = arrayShuffle(arr)
        results.add(shuffled.join(','))
      }

      // With 10 elements, we should get multiple different orderings
      expect(results.size).toBeGreaterThan(1)
    })
  })

  describe('arrayChunk', () => {
    it('should split array into chunks of specified size', () => {
      const arr = [1, 2, 3, 4, 5, 6]
      const result = arrayChunk(arr, 2)
      expect(result).toEqual([[1, 2], [3, 4], [5, 6]])
    })

    it('should handle remainder elements', () => {
      const arr = [1, 2, 3, 4, 5]
      const result = arrayChunk(arr, 2)
      expect(result).toEqual([[1, 2], [3, 4], [5]])
    })

    it('should handle chunk size larger than array', () => {
      const arr = [1, 2, 3]
      const result = arrayChunk(arr, 5)
      expect(result).toEqual([[1, 2, 3]])
    })

    it('should handle chunk size of 1', () => {
      const arr = [1, 2, 3]
      const result = arrayChunk(arr, 1)
      expect(result).toEqual([[1], [2], [3]])
    })

    it('should handle empty array', () => {
      const arr: number[] = []
      const result = arrayChunk(arr, 2)
      expect(result).toEqual([])
    })

    it('should work with different data types', () => {
      const arr = ['a', 'b', 'c', 'd', 'e']
      const result = arrayChunk(arr, 2)
      expect(result).toEqual([['a', 'b'], ['c', 'd'], ['e']])
    })

    it('should handle exact division', () => {
      const arr = [1, 2, 3, 4, 5, 6, 7, 8, 9]
      const result = arrayChunk(arr, 3)
      expect(result).toEqual([[1, 2, 3], [4, 5, 6], [7, 8, 9]])
    })
  })

  describe('arrayUnique', () => {
    it('should remove duplicate numbers', () => {
      const arr = [1, 2, 2, 3, 3, 3, 4, 5, 5]
      const result = arrayUnique(arr)
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    it('should remove duplicate strings', () => {
      const arr = ['a', 'b', 'a', 'c', 'b', 'd']
      const result = arrayUnique(arr)
      expect(result).toEqual(['a', 'b', 'c', 'd'])
    })

    it('should handle array with no duplicates', () => {
      const arr = [1, 2, 3, 4, 5]
      const result = arrayUnique(arr)
      expect(result).toEqual([1, 2, 3, 4, 5])
    })

    it('should handle empty array', () => {
      const arr: number[] = []
      const result = arrayUnique(arr)
      expect(result).toEqual([])
    })

    it('should handle array with all same elements', () => {
      const arr = [1, 1, 1, 1]
      const result = arrayUnique(arr)
      expect(result).toEqual([1])
    })

    it('should preserve order of first occurrence', () => {
      const arr = [3, 1, 2, 1, 3, 2]
      const result = arrayUnique(arr)
      expect(result).toEqual([3, 1, 2])
    })

    it('should work with mixed data types', () => {
      const arr = [1, '1', 2, '2', 1, '1']
      const result = arrayUnique(arr)
      expect(result).toEqual([1, '1', 2, '2'])
    })

    it('should handle boolean values', () => {
      const arr = [true, false, true, false, true]
      const result = arrayUnique(arr)
      expect(result).toEqual([true, false])
    })
  })

  describe('Integration tests', () => {
    it('should combine arrayChunk and arrayUnique', () => {
      const arr = [1, 2, 2, 3, 3, 4, 5, 5, 6]
      const unique = arrayUnique(arr)
      const chunks = arrayChunk(unique, 2)
      expect(chunks).toEqual([[1, 2], [3, 4], [5, 6]])
    })

    it('should use arrayMove multiple times', () => {
      const arr = ['a', 'b', 'c', 'd']
      const step1 = arrayMove(arr, 0, 3) // ['b', 'c', 'd', 'a']
      const step2 = arrayMove(step1, 1, 2) // ['b', 'd', 'c', 'a']
      expect(step2).toEqual(['b', 'd', 'c', 'a'])
    })
  })
})

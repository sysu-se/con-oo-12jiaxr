import { describe, expect, it } from 'vitest'
import { loadDomainApi, makeMove, makePuzzle } from './helpers/domain-api.js'

describe('HW1 additional coverage (boundary, errors, deep copy, history limits)', () => {
  it('should not allow guessing on fixed cells', async () => {
    const { createSudoku } = await loadDomainApi()
    const puzzle = makePuzzle() // 第一行第一列是 5（固定格）
    const sudoku = createSudoku(puzzle)

    const success = sudoku.guess(makeMove({ row: 0, col: 0, value: 9 }))
    expect(success).toBe(false)
    expect(sudoku.getGrid()[0][0]).toBe(5) // unchanged
  })

  it('should allow clearing a cell (value 0)', async () => {
    const { createSudoku } = await loadDomainApi()
    const puzzle = makePuzzle()
    const sudoku = createSudoku(puzzle)

    sudoku.guess(makeMove({ row: 0, col: 2, value: 4 }))
    expect(sudoku.getGrid()[0][2]).toBe(4)

    sudoku.guess(makeMove({ row: 0, col: 2, value: 0 }))
    expect(sudoku.getGrid()[0][2]).toBe(0)
  })

  it('should reject guess with invalid value (<0 or >9)', async () => {
    const { createSudoku } = await loadDomainApi()
    const sudoku = createSudoku(makePuzzle())

    expect(sudoku.guess(makeMove({ row: 0, col: 2, value: -1 }))).toBe(false)
    expect(sudoku.guess(makeMove({ row: 0, col: 2, value: 10 }))).toBe(false)
    expect(sudoku.getGrid()[0][2]).toBe(0)
  })

  it('should handle undo/redo on empty history correctly', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    expect(game.canUndo()).toBe(false)
    expect(game.canRedo()).toBe(false)

    game.undo() // should do nothing, no crash
    game.redo() // should do nothing

    expect(game.getSudoku().getGrid()[0][2]).toBe(0)
  })

  it('should not allow undo/redo beyond boundaries', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess(makeMove({ row: 0, col: 2, value: 4 }))
    game.undo()
    expect(game.canUndo()).toBe(false)
    game.undo() // extra undo, should not change
    expect(game.getSudoku().getGrid()[0][2]).toBe(0)

    game.redo()
    expect(game.canRedo()).toBe(false)
    game.redo() // extra redo, should not change
    expect(game.getSudoku().getGrid()[0][2]).toBe(4)
  })

  it('should deep copy grid in clone (modify clone does not affect original, and vice versa)', async () => {
    const { createSudoku } = await loadDomainApi()
    const original = createSudoku(makePuzzle())
    const cloned = original.clone()

    cloned.guess(makeMove({ row: 0, col: 2, value: 7 }))
    original.guess(makeMove({ row: 0, col: 3, value: 8 }))

    expect(original.getGrid()[0][2]).toBe(0)
    expect(cloned.getGrid()[0][2]).toBe(7)
    expect(original.getGrid()[0][3]).toBe(8)
    expect(cloned.getGrid()[0][3]).toBe(0)
  })

  it('should preserve fixed cells after serialization/deserialization', async () => {
    const { createSudoku, createSudokuFromJSON } = await loadDomainApi()
    const original = createSudoku(makePuzzle())
    const json = original.toJSON()
    const restored = createSudokuFromJSON(json)

    // 尝试修改固定格（第一行第一列应该是5）
    restored.guess(makeMove({ row: 0, col: 0, value: 9 }))
    expect(restored.getGrid()[0][0]).toBe(5) // should remain fixed
  })

  it('should handle many moves without performance issues (stress test)', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    for (let i = 0; i < 50; i++) {
      const row = i % 9
      const col = (i * 3) % 9
      const value = (i % 9) + 1
      game.guess({ row, col, value })
    }

    expect(game.canUndo()).toBe(true)
    for (let i = 0; i < 50; i++) {
      game.undo()
    }
    expect(game.getSudoku().getGrid()).toEqual(makePuzzle())
  })

  it('should reset redo stack correctly after undo then new guess', async () => {
    const { createGame, createSudoku } = await loadDomainApi()
    const game = createGame({ sudoku: createSudoku(makePuzzle()) })

    game.guess({ row: 0, col: 2, value: 4 })
    game.guess({ row: 1, col: 1, value: 7 })
    game.undo() // back to state with only first guess
    expect(game.canRedo()).toBe(true)

    game.guess({ row: 2, col: 0, value: 2 }) // new branch
    expect(game.canRedo()).toBe(false)
    expect(game.getSudoku().getGrid()[1][1]).toBe(0) // redo lost
    expect(game.getSudoku().getGrid()[2][0]).toBe(2)
  })
})

it('debug toString output', async () => {
  const { createSudoku } = await loadDomainApi()
  const sudoku = createSudoku(makePuzzle())
  const str = sudoku.toString()
  console.log('toString output:');
  console.log(str);
  console.log('length:', str.length);
  expect(str.length).toBeGreaterThan(20);
})
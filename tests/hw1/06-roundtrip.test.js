import { describe, it, expect } from 'vitest';
import { createSudoku, createSudokuFromJSON, createGame, createGameFromJSON } from '../../src/domain';

describe('Round-trip serialization', () => {
  it('Sudoku serialization round-trip', () => {
    const originalGrid = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];
    const sudoku = createSudoku(originalGrid);
    const json = sudoku.toJSON();
    const restored = createSudokuFromJSON(json);
    expect(restored.getGrid()).toEqual(sudoku.getGrid());
    expect(restored.isFixed(0, 0)).toBe(sudoku.isFixed(0, 0));
  });

  it('Game serialization round-trip (only current state)', () => {
    const originalGrid = [
      [5, 3, 0, 0, 7, 0, 0, 0, 0],
      [6, 0, 0, 1, 9, 5, 0, 0, 0],
      [0, 9, 8, 0, 0, 0, 0, 6, 0],
      [8, 0, 0, 0, 6, 0, 0, 0, 3],
      [4, 0, 0, 8, 0, 3, 0, 0, 1],
      [7, 0, 0, 0, 2, 0, 0, 0, 6],
      [0, 6, 0, 0, 0, 0, 2, 8, 0],
      [0, 0, 0, 4, 1, 9, 0, 0, 5],
      [0, 0, 0, 0, 8, 0, 0, 7, 9]
    ];
    const sudoku = createSudoku(originalGrid);
    const game = createGame({ sudoku });
    game.guess({ row: 0, col: 2, value: 4 });
    const json = game.toJSON();
    const restoredGame = createGameFromJSON(json);
    expect(restoredGame.getSudoku().getGrid()).toEqual(game.getSudoku().getGrid());
  });
});
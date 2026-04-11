import { createSudokuFromJSON } from './Sudoku.js';
// 最大历史长度限制（可配置）
const MAX_HISTORY = 100;
/**
 * 领域对象：Game
 * 职责：管理游戏会话、历史记录、撤销/重做
 */
function Game({ sudoku }) {
  // 当前状态（始终是历史中指针指向的快照的副本）
  let currentSudoku = sudoku.clone();
  // 历史栈：存储 Sudoku 快照（深拷贝）
  let history = [currentSudoku.clone()];
  let historyPointer = 0;

  // 辅助函数：限制历史长度，保持最近 MAX_HISTORY 条记录
  function limitHistory() {
    if (history.length > MAX_HISTORY) {
      const excess = history.length - MAX_HISTORY;
      history = history.slice(excess);
      historyPointer = Math.max(0, historyPointer - excess);
    }
  }

  // --- 核心行为 ---
  /**
   * 执行一次猜测，若成功则记录历史
   * @returns {boolean} 是否成功
   */
  function guess(move) {
    // 在副本上尝试应用猜测，避免污染当前状态
    const newSudoku = currentSudoku.clone();
    const success = newSudoku.guess(move);
    if (!success) return false;

    // 清除指针之后的历史（使 redo 失效）
    history = history.slice(0, historyPointer + 1);
    // 推入新状态
    history.push(newSudoku.clone());
    historyPointer++;
    currentSudoku = newSudoku;
    // 限制历史长度
    limitHistory();
    return true;
  }

  function undo() {
    if (!canUndo()) return false;
    historyPointer--;
    currentSudoku = history[historyPointer].clone();
    return true;
  }

  function redo() {
    if (!canRedo()) return false;
    historyPointer++;
    currentSudoku = history[historyPointer].clone();
    return true;
  }

  function canUndo() {
    return historyPointer > 0;
  }

  function canRedo() {
    return historyPointer < history.length - 1;
  }

  /**
   * 重置历史（新游戏时调用）
   */
  function resetHistory() {
    history = [currentSudoku.clone()];
    historyPointer = 0;
  }

  // --- 串行化 ---
  /**
   * 序列化当前局面（不保存历史，只保存当前 Sudoku）
   */
  function toJSON() {
    return {
      currentSudoku: currentSudoku.toJSON()
    };
  }

  // --- 公开接口 ---
  return {
    getSudoku: () => currentSudoku,
    guess,
    undo,
    redo,
    canUndo,
    canRedo,
    resetHistory,
    toJSON
  };
}

// 工厂函数
export function createGame({ sudoku }) {
  if (!sudoku || typeof sudoku.clone !== 'function') {
    throw new Error('Valid Sudoku instance is required');
  }
  return Game({ sudoku });
}

export function createGameFromJSON(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  // 先重建 Sudoku
  const sudoku = createSudokuFromJSON(data.currentSudoku);
  // 创建新 Game，历史只包含当前状态
  return createGame({ sudoku });
}
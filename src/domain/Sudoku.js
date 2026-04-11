/**
 * 领域对象：Sudoku
 * 职责：管理数独网格状态、固定格标记、猜测逻辑
 */
function Sudoku(initialGrid, fixedMask = null) {
  // 私有状态：深拷贝防止外部污染
  let grid = initialGrid.map(row => [...row]);
  // fixedMask: true 表示该格子是预设数字，不可编辑
  let fixed = fixedMask 
    ? fixedMask.map(row => [...row])
    : grid.map(row => row.map(value => value !== 0));

  const SIZE = 9;
  const BOX_SIZE = 3;

  // --- 核心行为 ---
  /**
   * 玩家猜测/填入数字
   * @param {Object} move - { row, col, value }
   * @returns {boolean} 是否成功（false 表示格子固定或值无效）
   */
  function guess(move) {
    const { row, col, value } = move;
    // 只允许修改非固定格，且值在 0-9 之间（0 表示清除）
    if (fixed[row][col]) return false;
    if (value < 0 || value > 9) return false;
    grid[row][col] = value;
    return true;
  }

  /**
   * 验证当前局面是否有冲突（可选，保留以备 UI 使用）
   */
  function validate() {
    const errors = [];
    for (let row = 0; row < SIZE; row++) {
      for (let col = 0; col < SIZE; col++) {
        const value = grid[row][col];
        if (value === 0) continue;
        // 检查行
        for (let c = 0; c < SIZE; c++) {
          if (c !== col && grid[row][c] === value) {
            errors.push({ type: 'ROW', cell: [row, col], conflict: [row, c] });
          }
        }
        // 检查列
        for (let r = 0; r < SIZE; r++) {
          if (r !== row && grid[r][col] === value) {
            errors.push({ type: 'COL', cell: [row, col], conflict: [r, col] });
          }
        }
        // 检查宫
        const boxRow = Math.floor(row / BOX_SIZE) * BOX_SIZE;
        const boxCol = Math.floor(col / BOX_SIZE) * BOX_SIZE;
        for (let r = boxRow; r < boxRow + BOX_SIZE; r++) {
          for (let c = boxCol; c < boxCol + BOX_SIZE; c++) {
            if (r !== row && c !== col && grid[r][c] === value) {
              errors.push({ type: 'BOX', cell: [row, col], conflict: [r, c] });
            }
          }
        }
      }
    }
    return { isValid: errors.length === 0, errors };
  }

  // --- 串行化与外表化 ---
  /**
   * 深拷贝当前对象（保留固定格信息）
   */
  function clone() {
    return Sudoku(
      grid.map(row => [...row]),
      fixed.map(row => [...row])
    );
  }

  /**
   * 序列化为 JSON
   */
  function toJSON() {
    return {
      grid: grid.map(row => [...row]),
      fixed: fixed.map(row => [...row])
    };
  }

  /**
   * 调试用字符串（符合外表化要求）
   */
  function toString() {
  let result = '';
  for (let i = 0; i < SIZE; i++) {
    if (i % 3 === 0 && i !== 0) result += '------+-------+------\n';
    for (let j = 0; j < SIZE; j++) {
      if (j % 3 === 0 && j !== 0) result += '| ';
      const val = grid[i][j] || '.';
      const marker = fixed[i][j] ? '[' + val + ']' : ' ' + val + ' ';
      result += marker + ' ';
    }
    result += '\n';
  }
  return result;
}

  // 获取固定格信息
  function isFixed(row, col) {
    return fixed[row][col];
  }

  // --- 公开接口---
  return {
    getGrid: () => grid.map(row => [...row]),
    guess,
    validate,
    clone,
    toJSON,
    toString,
    isFixed   // 额外提供，方便 UI
  };
}

// 工厂函数
export function createSudoku(input) {
  const emptyGrid = Array(9).fill().map(() => Array(9).fill(0));
  const grid = input || emptyGrid;
  if (!grid || grid.length !== 9 || grid.some(row => !Array.isArray(row) || row.length !== 9)) {
    throw new Error('Invalid grid format: must be 9x9 array');
  }
  return Sudoku(grid);
}

export function createSudokuFromJSON(json) {
  const data = typeof json === 'string' ? JSON.parse(json) : json;
  // 兼容旧版本数据（可能没有 fixed 字段）
  if (data.fixed) {
    return Sudoku(data.grid, data.fixed);
  } else {
    return Sudoku(data.grid);
  }
}
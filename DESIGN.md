# Sudoku 领域重构设计文档

### A. 领域对象如何被消费

#### View 层直接消费的是什么？

View 层**不直接消费** `Game` 或 `Sudoku` 实例，而是通过一个 **Store Adapter**（`src/stores/gameInstance.js`）间接消费。该适配器提供：

- 一个 Svelte writable store：`gameStore`，存储当前 `Game` 实例。
- 辅助函数：`getGame()` 获取当前实例，`initGame(grid)` 初始化新游戏，`resetGame(grid)` 重置游戏。

组件中通过 `import { getGame, gameStore，resetGame } from '@sudoku/stores/gameInstance'` 访问。

#### View 层拿到的数据是什么？

UI 通过 **派生 store** 获取具体数据：

- `userGrid`：派生自 `gameStore`，返回当前网格的 9×9 数组（空格为 0）。  
  定义：`export const userGrid = derived(gameStore, $game => $game ? $game.getSudoku().getGrid() : 空网格)`
- `invalidCells`：派生自 `userGrid`，返回冲突格子的坐标数组（如 `["0,2", "3,5"]`）。

此外，还有独立的 stores：`cursor`（选中格子）、`notes`（笔记模式）、`candidates`（候选数）、`gamePaused`、`hints` 等。

#### 用户操作如何进入领域对象？

- **点击数字按钮（Keyboard.svelte）**：  
  `handleKeyButton(num)` → 调用 `game.guess({ row, col, value: num })` → 成功后调用 `gameStore.set(game)` → 触发 UI 更新。
- **Undo / Redo 按钮（Actions.svelte）**：  
  `handleUndo()` → 调用 `game.undo()` → 调用 `gameStore.set(game)` → UI 刷新。  
  Redo 同理。
- **Hint 按钮（Actions.svelte）**：  
  调用 `solveSudoku` 获取正确值 → 调用 `game.guess(...)` → 成功后调用 `gameStore.set(game)`。

所有对领域对象的修改都通过 `Game` 实例的方法进行，绝不直接修改 `userGrid` store 或二维数组。

#### 领域对象变化后，Svelte 为什么会更新？

因为每次修改后都执行了 `gameStore.set(game)`。`gameStore` 是一个 Svelte writable store，调用 `set` 会通知所有订阅者（包括 `userGrid` 这个 derived store）。`userGrid` 重新计算新网格，所有订阅 `$userGrid` 的组件（如 `Cell.svelte`）自动重新渲染。这完全利用了 Svelte 的 **store 响应式机制**。

### B. 响应式机制说明

#### 依赖的机制

- **Svelte store**：`writable` 和 `derived`。
- **组件中的 `$` 前缀**：自动订阅 store，当 store 值变化时重新运行组件脚本并更新 DOM。
- **手动触发更新**：通过 `gameStore.set()` 显式通知。

#### 响应式暴露给 UI 的数据

| 数据 | 类型 | 来源 | 说明 |
|------|------|------|------|
| `$userGrid` | derived | `gameStore` | 当前网格（9×9） |
| `$invalidCells` | derived | `userGrid` | 冲突格子坐标 |
| `$cursor` | writable | 独立 store | 当前选中格子 |
| `$notes` | writable | 独立 store | 笔记模式开关 |
| `$candidates` | writable | 独立 store | 笔记候选数映射 |
| `$gamePaused` | writable | 独立 store | 游戏是否暂停 |
| `$hints` | writable | 独立 store | 剩余提示次数 |
| `$settings` | writable | 独立 store | 用户设置 |

#### 留在领域对象内部的状态

- `Sudoku` 的 `grid` 和 `fixed`（只能通过 `guess` 修改，不直接暴露）。
- `Game` 的 `history` 数组、`historyPointer`（不暴露给 UI）。
- 这些状态完全封装在领域对象内部，UI 无法直接访问或修改。

#### 如果直接 mutate 内部对象会怎样？

例如在组件中写 `game.getSudoku().getGrid()[0][0] = 5`：
- 不会调用 `gameStore.set()`，Svelte 无法感知变化，UI 不会刷新。
- 破坏了历史快照的一致性（因为历史中的旧状态也可能被意外修改）。
- 绕过固定格检查，可能将预设数字改掉，破坏游戏规则。

因此，**所有修改必须通过 `game.guess/undo/redo` 接口**，这是设计的关键约束。

### C. 改进说明（相比 HW1）

#### HW1 中的不足

- 领域对象虽然存在，但 **UI 并未真正使用**：`Keyboard.svelte` 和 `Actions.svelte` 仍然直接调用旧的 `userGrid.set()` 和 `candidates`，而不是通过 `Game` 接口。
- `startNew` / `startCustom` 仍然直接操作 `grid` store，没有创建 `Game` 实例。
- Undo/Redo 按钮没有实现，或实现逻辑散落在组件中。
- 没有适配层，导致响应式更新困难。

#### HW1.1 的改进

1. **引入 Store Adapter**（`gameInstance.js`）：
   - 封装 `Game` 实例的创建和访问。
   - 提供 `gameStore`（writable）和 `getGame()`。
   - 在 `guess`、`undo`、`redo` 后手动 `gameStore.set(game)` 触发响应式更新。

2. **改造 `grid.js`**：
   - `userGrid` 改为派生自 `gameStore`，数据源变为 `Game.getSudoku().getGrid()`。
   - 删除原有的 `createUserGrid` 和 `applyHint` 等直接修改逻辑。

3. **改造 `Keyboard.svelte`**：
   - 调用 `game.guess()` 替代直接修改 `userGrid`。
   - 成功后再调用 `gameStore.set(game)`。

4. **改造 `Actions.svelte`**：
   - 实现 `handleUndo` / `handleRedo`，调用 `game.undo()` / `game.redo()`。
   - 实现 `handleHint`，通过 `game.guess()` 填入正确数字。

5. **改造 `game.js`（启动逻辑）**：
   - `startNew` / `startCustom` 中调用 `initGame(decodedGrid)`，创建 `Game` 实例。
   - 同时更新 `grid` store。

6. **优化深拷贝策略**：
   - 将 `JSON.parse(JSON.stringify(...))` 改为 `grid.map(row => [...row])`，提高性能且避免序列化限制。

7. **增加历史长度限制**（`MAX_HISTORY = 100`），防止内存无限增长。

#### Trade-off 分析

| 优点 | 缺点 / 代价 |
|------|-------------|
| 领域对象与 UI 完全解耦，核心逻辑可独立测试 | 需要额外的适配层代码（`gameInstance.js`、`grid.js` 改造） |
| UI 只负责渲染和事件转发，职责清晰 | 每次修改后需手动 `gameStore.set(game)`，容易遗漏 |
| 撤销/重做由领域对象统一管理，逻辑集中 | 快照策略在极端情况下（如无限历史）内存会增长，但已限制 100 步 |
| 响应式更新完全依赖 Svelte store 机制，无侵入 | 对 Svelte 响应式原理有较高要求，开发者需理解 derived 和手动 set |

#### 为什么 HW1 不足以支撑真实接入？

HW1 中虽然定义了 `Sudoku` 和 `Game`，但没有解决 **“领域对象状态变化如何驱动 UI 更新”** 这个核心问题。UI 仍然依赖旧的 store 和直接修改数组的方式，导致领域对象形同虚设。本次通过 Store Adapter 和派生 store 彻底打通了数据流，使领域对象成为唯一的真实数据源。

---

### D.总结

本次作业实现了领域对象与 Svelte 前端的完整接入，遵循了以下原则：

- **单一数据源**：所有游戏状态由 `Game` + `Sudoku` 管理。
- **响应式桥接**：通过 `gameStore` 和 `derived` 将领域对象状态映射为 Svelte 可订阅的 store。
- **命令式修改**：UI 通过调用 `Game` 的方法修改状态，然后手动触发 store 更新。
- **深拷贝保护**：历史快照和 `getGrid()` 返回深拷贝，防止外部污染。

这种设计不仅满足了作业要求，也为后续扩展（如提示模式、多分支探索）奠定了良好基础。
